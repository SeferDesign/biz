#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

usage() {
	cat <<'EOF'
Usage: npm run local -- <command> [arguments]

Commands:
  setup                Install the mkcert CA, generate certs, add the /etc/hosts entry
  start                Start the local stack
  restart              Rebuild images and restart the local stack
  stop                 Stop the local stack (keeps volumes)
  build                Build local images without starting
  pull                 Pull the third-party images
  ps                   Show container status
  logs [service]       Tail logs (all services by default)
  test                 Run the API test suite inside the container
	db:setup             Create the local MySQL tables
	seed                 Load the legacy sample records into MySQL
  sh <service> [cmd]   Open a shell (or run a command) in a service container
	mysql [arguments]    Open the MySQL client against the local database
  reset                Recreate the stack and wipe volumes
  clean                Remove local and cloud compose resources including images
EOF
}

if [[ "$#" -eq 0 || "$1" == "-h" || "$1" == "--help" ]]; then
	usage
	[[ "$#" -gt 0 ]] && exit 0
	exit 2
fi

command_name="$1"
shift

load_local_env() {
	if [[ -f "$REPO_ROOT/.env" ]]; then
		set -a
		# shellcheck disable=SC1091
		source "$REPO_ROOT/.env"
		set +a
	fi
}

compose_local() {
	docker compose --env-file "$REPO_ROOT/build.env" -f "$REPO_ROOT/docker-compose.local.yml" "$@"
}

case "$command_name" in
	setup)
		exec bash "$REPO_ROOT/docker/setup-local-ssl.sh" "$@"
		;;
	start)
		load_local_env
		compose_local up -d --pull missing
		;;
	restart)
		load_local_env
		compose_local up -d --build --remove-orphans
		compose_local restart nginx
		;;
	stop)
		load_local_env
		compose_local down --remove-orphans
		;;
	build)
		load_local_env
		compose_local build "$@"
		;;
	pull)
		compose_local pull
		;;
	ps)
		compose_local ps
		;;
	logs)
		compose_local logs -f "$@"
		;;
	test)
		load_local_env
		compose_local exec api npm test
		;;
	db:setup)
		load_local_env
		compose_local exec api npm run db:setup --workspace @seferbiz/api
		;;
	seed)
		load_local_env
		compose_local exec api npm run db:seed --workspace @seferbiz/api
		;;
	sh)
		load_local_env
		service_name="${1:-api}"
		shift || true
		if [[ "$#" -eq 0 ]]; then
			compose_local exec "$service_name" bash
		else
			compose_local exec "$service_name" "$@"
		fi
		;;
	mysql)
		load_local_env
		compose_local exec db mysql -ubiz -pbiz biz_db_development "$@"
		;;
	reset)
		load_local_env
		compose_local down -v --remove-orphans
		compose_local up -d --build --pull missing
		;;
	clean)
		docker compose --env-file "$REPO_ROOT/build.env" -f "$REPO_ROOT/docker-compose.local.yml" down --rmi all -v --remove-orphans
		docker compose --env-file "$REPO_ROOT/build.env" -f "$REPO_ROOT/docker-compose.cloud.yml" down --rmi all -v --remove-orphans
		;;
	*)
		printf 'Unknown local command: %s\n\n' "$command_name" >&2
		usage >&2
		exit 2
		;;
esac
