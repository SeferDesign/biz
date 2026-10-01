#!/usr/bin/env bash
# Streams a gzipped mysqldump of the biz database to the backup bucket.
set -euo pipefail

set -a
# shellcheck disable=SC1091
source /opt/biz/host.env
set +a

key="mysql/biz-$(date -u +%Y-%m-%dT%H%M%SZ).sql.gz"
docker exec biz-mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump -uroot --single-transaction --routines --triggers --set-gtid-purged=OFF --databases "$MYSQL_DATABASE"' |
	gzip -9 |
	aws s3 cp - "s3://${BACKUP_BUCKET}/${key}" --only-show-errors
echo "Backed up to s3://${BACKUP_BUCKET}/${key}"
