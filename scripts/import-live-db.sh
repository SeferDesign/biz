#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
DUMP_PATH="${1:-}"
PG_CONTAINER="biz-import-pg-$(date +%s)"
PG_HOST_PORT="${IMPORT_PG_PORT:-9543}"

usage() {
  cat <<'EOF'
Usage: npm run local -- import-live /absolute/path/to/dump.sql.gz

Imports a PostgreSQL Rails dump into local MySQL by:
1) Loading the dump into a temporary PostgreSQL container
2) Running reconciliation import into local MySQL
EOF
}

if [[ -z "$DUMP_PATH" || "$DUMP_PATH" == "-h" || "$DUMP_PATH" == "--help" ]]; then
  usage
  exit 2
fi

if [[ "$DUMP_PATH" != /* ]]; then
  DUMP_PATH="$PWD/$DUMP_PATH"
fi

if [[ ! -f "$DUMP_PATH" ]]; then
  printf 'Dump file not found: %s\n' "$DUMP_PATH" >&2
  exit 1
fi

if [[ ! "$DUMP_PATH" =~ \.sql\.gz$ ]]; then
  printf 'Expected a .sql.gz dump file, got: %s\n' "$DUMP_PATH" >&2
  exit 1
fi

if [[ -f "$REPO_ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env"
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  printf 'DATABASE_URL must be set (for local this is usually loaded from .env).\n' >&2
  exit 1
fi

compose_local() {
  docker compose --env-file "$REPO_ROOT/build.env" -f "$REPO_ROOT/docker-compose.local.yml" "$@"
}

printf 'Ensuring local db/api containers are running...\n'
compose_local up -d db api >/dev/null

db_container_id="$(compose_local ps -q db)"
if [[ -z "$db_container_id" ]]; then
  printf 'Unable to find local db container id.\n' >&2
  exit 1
fi

network_name="$(docker inspect -f '{{range $name, $_ := .NetworkSettings.Networks}}{{printf "%s\n" $name}}{{end}}' "$db_container_id" | head -n 1)"
if [[ -z "$network_name" ]]; then
  printf 'Unable to determine Docker network for local stack.\n' >&2
  exit 1
fi

cleanup() {
  docker rm -f "$PG_CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

printf 'Starting temporary PostgreSQL container %s...\n' "$PG_CONTAINER"
docker run -d --rm --name "$PG_CONTAINER" --network "$network_name" \
  -p "127.0.0.1:${PG_HOST_PORT}:5432" \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=legacy_import \
  postgres:16-alpine >/dev/null

printf 'Waiting for PostgreSQL readiness...\n'
for _ in $(seq 1 60); do
  if docker exec "$PG_CONTAINER" pg_isready -U postgres -d legacy_import >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
if ! docker exec "$PG_CONTAINER" pg_isready -U postgres -d legacy_import >/dev/null 2>&1; then
  printf 'Temporary PostgreSQL did not become ready in time.\n' >&2
  exit 1
fi

docker exec "$PG_CONTAINER" psql -U postgres -d legacy_import -v ON_ERROR_STOP=1 \
  -c "CREATE ROLE deploy LOGIN;" >/dev/null 2>&1 || true

printf 'Loading dump into temporary PostgreSQL...\n'
gzip -cd "$DUMP_PATH" | docker exec -i "$PG_CONTAINER" psql -v ON_ERROR_STOP=1 -U postgres -d legacy_import >/dev/null

printf 'Reconciling data into local MySQL...\n'
LEGACY_DATABASE_URL="postgres://postgres:postgres@127.0.0.1:${PG_HOST_PORT}/legacy_import" \
  npm run db:import-live --workspace @seferbiz/api

printf 'Import complete.\n'
printf 'If users have OTP enabled, ensure OTP_SECRET_ENCRYPTION_KEY matches production before sign-in tests.\n'
