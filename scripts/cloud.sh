#!/usr/bin/env bash
# Uses the AWS profile from your shell (AWS_PROFILE); nothing here selects one for you.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
STACK_NAME="biz-prod"

usage() {
	cat <<'EOF'
Usage: npm run cloud -- <command> [arguments]

Commands:
  diff                 Show pending infrastructure changes
  deploy               Build images, push them, and deploy the stack
  redeploy             Re-run the deploy script on the host (reloads secrets)
  sh                   Open a shell on the host (SSM)
  exec <api|web|mysql> [cmd]
                       Run a command in a container (default: sh)
  logs [api|web|mysql|caddy]
                       Tail container logs (default: all)
  db:tunnel [port]     Forward localhost:<port> (default 13306) to MySQL on the host
  db:backup            Back up the database to S3 now (also runs nightly)
  db:backups           List backups in S3
  db:restore [key]     Replace the database with a backup (default: latest)
  secret:set <KEY>     Set an app secret (prompts), then redeploy
EOF
}

if [[ "$#" -eq 0 || "$1" == "-h" || "$1" == "--help" ]]; then
	usage
	[[ "$#" -gt 0 ]] && exit 0
	exit 2
fi

command_name="$1"
shift

output() {
	aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
		--query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}

run_on_host() {
	local instance_id command_id
	instance_id="$(output InstanceId)"
	command_id="$(aws ssm send-command --instance-ids "$instance_id" --document-name AWS-RunShellScript \
		--comment "biz: $1" --parameters "$(jq -cn --arg command "$1" '{commands: [$command]}')" \
		--query Command.CommandId --output text)"
	aws ssm wait command-executed --command-id "$command_id" --instance-id "$instance_id" || true
	aws ssm get-command-invocation --command-id "$command_id" --instance-id "$instance_id" \
		--query '[Status,StandardOutputContent,StandardErrorContent]' --output text
}

case "$command_name" in
	diff)
		exec npm --prefix "$REPO_ROOT/cdk" run diff -- "$@"
		;;
	deploy)
		exec npm --prefix "$REPO_ROOT/cdk" run deploy -- "$@"
		;;
	redeploy)
		run_on_host /opt/biz/update.sh
		;;
	sh)
		exec aws ssm start-session --target "$(output InstanceId)"
		;;
	exec)
		service_name="${1:-api}"
		shift || true
		container_command="${*:-sh}"
		exec aws ssm start-session --target "$(output InstanceId)" \
			--document-name AWS-StartInteractiveCommand \
			--parameters "command=sudo docker exec -it biz-${service_name} ${container_command}"
		;;
	logs)
		log_group="$(output LogGroupName)"
		if [[ -n "${1:-}" ]]; then
			exec aws logs tail "$log_group" --follow --log-stream-names "biz-$1"
		fi
		exec aws logs tail "$log_group" --follow
		;;
	db:tunnel)
		local_port="${1:-13306}"
		printf 'User biz / database biz_production. Password: aws ssm get-parameter --with-decryption --name %s --query Parameter.Value --output text | jq -r .MYSQL_PASSWORD\n' "$(output SecretsParameterName)"
		exec aws ssm start-session --target "$(output InstanceId)" \
			--document-name AWS-StartPortForwardingSession \
			--parameters "portNumber=3306,localPortNumber=${local_port}"
		;;
	db:backup)
		run_on_host /opt/biz/host/backup.sh
		;;
	db:backups)
		exec aws s3 ls "s3://$(output BackupBucketName)/mysql/"
		;;
	db:restore)
		backup_key="${1:-latest}"
		if [[ ! "$backup_key" =~ ^(latest|mysql/[A-Za-z0-9._:-]+\.sql\.gz)$ ]]; then
			printf 'Expected "latest" or a key like mysql/biz-2026-09-30T080000Z.sql.gz\n' >&2
			exit 2
		fi
		read -rp "Replace the production database with ${backup_key}? Type 'restore' to continue: " confirmation
		[[ "$confirmation" == "restore" ]] || exit 1
		run_on_host "/opt/biz/host/restore.sh ${backup_key}"
		;;
	secret:set)
		key="${1:?Usage: npm run cloud -- secret:set <KEY>}"
		parameter_name="$(output SecretsParameterName)"
		read -rsp "Value for ${key}: " value
		printf '\n'
		current="$(aws ssm get-parameter --name "$parameter_name" --with-decryption --query Parameter.Value --output text)"
		value_file="$(mktemp)"
		trap 'rm -f "$value_file"' EXIT
		jq -c --arg key "$key" --arg value "$value" '.[$key] = $value' <<<"$current" >"$value_file"
		aws ssm put-parameter --name "$parameter_name" --type SecureString --overwrite --value "file://$value_file" >/dev/null
		printf 'Updated %s. Run `npm run cloud -- redeploy` to apply.\n' "$key"
		;;
	*)
		printf 'Unknown cloud command: %s\n\n' "$command_name" >&2
		usage >&2
		exit 2
		;;
esac
