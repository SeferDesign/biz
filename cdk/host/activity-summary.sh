#!/usr/bin/env bash
set -euo pipefail

period="${1:-}"
case "$period" in
        weekly|monthly) ;;
        *) echo "Usage: $0 <weekly|monthly>" >&2; exit 2 ;;
esac

docker exec biz-api node /app/api/src/jobs/activity-summary.js "$period"
