#!/usr/bin/env bash
set -euo pipefail

# Optional dependency gate so the app does not crash-loop while dependencies
# are starting. Set WAIT_FOR to a space-separated host:port list.
wait_for_targets="${WAIT_FOR:-}"
wait_timeout="${WAIT_FOR_TIMEOUT:-60}"

for target in $wait_for_targets; do
	host="${target%%:*}"
	port="${target##*:}"
	elapsed=0
	until (exec 3<>"/dev/tcp/${host}/${port}") 2>/dev/null; do
		if (( elapsed >= wait_timeout )); then
			echo "Timed out waiting for ${target}" >&2
			exit 1
		fi
		sleep 1
		elapsed=$(( elapsed + 1 ))
	done
	exec 3<&- 2>/dev/null || true
	echo "Dependency ready: ${target}"
done

exec "$@"
