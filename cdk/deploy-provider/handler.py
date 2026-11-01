TERMINAL_FAILURES = {
    'Cancelled',
    'Cancelling',
    'DeliveryTimedOut',
    'ExecutionTimedOut',
    'Failed',
    'Terminated',
    'TimedOut',
    'Undeliverable',
}


def _ssm():
    import boto3

    return boto3.client('ssm')


def _error_code(error):
    response = getattr(error, 'response', {}) or {}
    return response.get('Error', {}).get('Code')


def on_event(event, context):
    request_type = event['RequestType']
    physical_id = event.get('PhysicalResourceId') or event['LogicalResourceId']
    if request_type == 'Delete':
        return {'PhysicalResourceId': physical_id, 'Data': {'Skipped': 'Delete'}}

    properties = event['ResourceProperties']
    try:
        command = _ssm().send_command(
            InstanceIds=[properties['instanceId']],
            DocumentName='AWS-RunShellScript',
            Comment='Deploy biz application containers',
            Parameters={
                'commands': ['/opt/biz/update.sh'],
                'executionTimeout': ['1800'],
            },
            TimeoutSeconds=1800,
            CloudWatchOutputConfig={
                'CloudWatchOutputEnabled': True,
                'CloudWatchLogGroupName': properties['logGroup'],
            },
        )
    except Exception as error:
        if request_type == 'Create' and _error_code(error) == 'InvalidInstanceId':
            return {'PhysicalResourceId': physical_id, 'Data': {'Skipped': 'InstanceNotRegistered'}}
        raise

    return {
        'PhysicalResourceId': physical_id,
        'Data': {
            'CommandId': command['Command']['CommandId'],
            'InstanceId': properties['instanceId'],
        },
    }


def is_complete(event, context):
    if event['RequestType'] == 'Delete':
        return {'IsComplete': True}

    data = event.get('Data') or {}
    if data.get('Skipped'):
        return {'IsComplete': True}

    try:
        invocation = _ssm().get_command_invocation(
            CommandId=data['CommandId'],
            InstanceId=data['InstanceId'],
        )
    except Exception as error:
        if _error_code(error) == 'InvocationDoesNotExist':
            return {'IsComplete': False}
        raise

    status = invocation['Status']
    if status == 'Success':
        return {'IsComplete': True}
    if status in TERMINAL_FAILURES:
        output = '\n'.join(filter(None, [
            (invocation.get('StandardOutputContent') or '')[-4000:],
            (invocation.get('StandardErrorContent') or '')[-4000:],
        ]))
        raise RuntimeError(f'SSM deployment failed with status {status}.\n{output}')
    return {'IsComplete': False}