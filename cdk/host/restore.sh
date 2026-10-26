#!/usr/bin/env bash
# Replaces the biz database with a backup: restore.sh [latest|<s3 key>]
set -euo pipefail

set -a
# shellcheck disable=SC1091
source /opt/biz/host.env
set +a

key="${1:-latest}"
if [[ "$key" == "latest" ]]; then
	key="$(aws s3api list-objects-v2 --bucket "$BACKUP_BUCKET" --prefix mysql/ \
		--query 'sort_by(Contents, &LastModified)[-1].Key' --output text)"
fi
if [[ -z "$key" || "$key" == "None" ]]; then
	echo "No backup found in s3://${BACKUP_BUCKET}/mysql/" >&2
	exit 1
fi

aws s3 cp "s3://${BACKUP_BUCKET}/${key}" - --only-show-errors |
	gunzip |
	docker exec -i biz-mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -uroot'
docker restart biz-api >/dev/null
echo "Restored s3://${BACKUP_BUCKET}/${key}"
