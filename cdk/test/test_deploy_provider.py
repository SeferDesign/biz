import importlib.util
import pathlib
import unittest
from unittest.mock import patch


handler_path = pathlib.Path(__file__).parents[1] / 'deploy-provider' / 'handler.py'
spec = importlib.util.spec_from_file_location('deploy_handler', handler_path)
handler = importlib.util.module_from_spec(spec)
spec.loader.exec_module(handler)


class FakeSsm:
    def __init__(self, status='InProgress'):
        self.status = status
        self.command = None

    def send_command(self, **kwargs):
        self.command = kwargs
        return {'Command': {'CommandId': 'command-123'}}

    def get_command_invocation(self, **kwargs):
        return {
            'Status': self.status,
            'StandardOutputContent': 'deployment output',
            'StandardErrorContent': '',
        }


class DeployProviderTest(unittest.TestCase):
    def test_on_event_starts_deploy_and_preserves_physical_id_on_update(self):
        ssm = FakeSsm()
        event = {
            'RequestType': 'Update',
            'LogicalResourceId': 'DeployCommand',
            'PhysicalResourceId': 'stable-deploy-resource',
            'ResourceProperties': {'instanceId': 'i-123', 'logGroup': '/biz-prod/containers'},
        }

        with patch.object(handler, '_ssm', return_value=ssm):
            result = handler.on_event(event, None)

        self.assertEqual(result['PhysicalResourceId'], 'stable-deploy-resource')
        self.assertEqual(result['Data'], {'CommandId': 'command-123', 'InstanceId': 'i-123'})
        self.assertEqual(ssm.command['Parameters']['commands'], ['/opt/biz/update.sh'])

    def test_is_complete_waits_until_command_succeeds(self):
        event = {
            'RequestType': 'Update',
            'Data': {'CommandId': 'command-123', 'InstanceId': 'i-123'},
        }
        ssm = FakeSsm()

        with patch.object(handler, '_ssm', return_value=ssm):
            self.assertEqual(handler.is_complete(event, None), {'IsComplete': False})
            ssm.status = 'Success'
            self.assertEqual(handler.is_complete(event, None), {'IsComplete': True})

    def test_is_complete_fails_with_ssm_output_on_command_failure(self):
        ssm = FakeSsm(status='Failed')
        event = {
            'RequestType': 'Update',
            'Data': {'CommandId': 'command-123', 'InstanceId': 'i-123'},
        }

        with patch.object(handler, '_ssm', return_value=ssm):
            with self.assertRaisesRegex(RuntimeError, 'deployment output'):
                handler.is_complete(event, None)

    def test_create_skips_command_when_instance_is_not_registered(self):
        class InvalidInstance(Exception):
            response = {'Error': {'Code': 'InvalidInstanceId'}}

        class OfflineSsm(FakeSsm):
            def send_command(self, **kwargs):
                raise InvalidInstance()

        event = {
            'RequestType': 'Create',
            'LogicalResourceId': 'DeployCommand',
            'ResourceProperties': {'instanceId': 'i-new', 'logGroup': '/biz-prod/containers'},
        }

        with patch.object(handler, '_ssm', return_value=OfflineSsm()):
            result = handler.on_event(event, None)

        self.assertEqual(result['Data'], {'Skipped': 'InstanceNotRegistered'})


if __name__ == '__main__':
    unittest.main()