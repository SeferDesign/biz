#!/usr/bin/env bash
# Streams a gzipped mysqldump of the biz database to the backup bucket.
set -euo pipefail

set -a
# shellcheck disable=SC1091
source /opt/biz/host.env
set +a

status_file="${BACKUP_STATUS_FILE:-/opt/biz/backup-status/status.json}"
attempt_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
last_successful_at="$(jq -r '.last_successful_at // empty' "$status_file" 2>/dev/null || true)"
last_successful_key="$(jq -r '.last_successful_key // empty' "$status_file" 2>/dev/null || true)"

write_status() {
	local state="$1" attempt="$2" success="$3" key="$4" error="$5" temporary_file
	temporary_file="$(mktemp "${status_file}.XXXXXX")"
	jq -n \
		--arg state "$state" \
		--arg attempt "$attempt" \
		--arg success "$success" \
		--arg key "$key" \
		--arg error "$error" \
		'{state: $state, last_attempt_at: (if $attempt == "" then null else $attempt end), last_successful_at: (if $success == "" then null else $success end), last_successful_key: (if $key == "" then null else $key end), last_error: (if $error == "" then null else $error end)}' \
		>"$temporary_file"
	chmod 644 "$temporary_file"
	mv -f "$temporary_file" "$status_file"
}

record_failure() {
	local exit_code="$1"
	trap - ERR
	write_status failed "$attempt_at" "$last_successful_at" "$last_successful_key" "Backup command failed (exit status ${exit_code})"
	echo "Backup failed with exit status ${exit_code}" >&2
	exit "$exit_code"
}

trap 'record_failure "$?"' ERR
key="mysql/biz-$(date -u +%Y-%m-%dT%H%M%SZ).sql.gz"
docker exec biz-mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump -uroot --single-transaction --routines --triggers --set-gtid-purged=OFF --databases "$MYSQL_DATABASE"' |
	gzip -9 |
	aws s3 cp - "s3://${BACKUP_BUCKET}/${key}" --only-show-errors
write_status success "$attempt_at" "$attempt_at" "$key" ''
trap - ERR
echo "Backed up to s3://${BACKUP_BUCKET}/${key}"
