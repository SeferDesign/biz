#!/usr/bin/env bash
# Invoked by /opt/biz/update.sh with BIZ_CONFIG (the stack's deploy parameter). Safe to rerun.
set -euo pipefail

exec 9>/var/lock/biz-deploy.lock
flock 9

host_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cfg() { jq -r ".$1" <<<"$BIZ_CONFIG"; }

region="$AWS_REGION"
api_image="$(cfg api)"
web_image="$(cfg web)"
app_domain="$(cfg appDomain)"
api_domain="$(cfg apiDomain)"
log_group="$(cfg logGroup)"
secrets_parameter="$(cfg secretsParameter)"
timezone="$(cfg timezone)"
mysql_image="mysql:$(cfg mysqlVersion)"

cd /opt/biz
timedatectl set-timezone "$timezone"
umask 077
mkdir -p /opt/biz/backup-status
chmod 755 /opt/biz/backup-status
mkdir -p /opt/biz/backup-trigger
chown 1000:1000 /opt/biz/backup-trigger
chmod 700 /opt/biz/backup-trigger
if [[ ! -f /opt/biz/backup-status/status.json ]]; then
	printf '%s\n' '{"state":"never","last_attempt_at":null,"last_successful_at":null,"last_successful_key":null,"last_error":null}' > /opt/biz/backup-status/status.json
fi
chmod 644 /opt/biz/backup-status/status.json

cat >/opt/biz/host.env <<EOF
AWS_REGION=${region}
AWS_DEFAULT_REGION=${region}
BACKUP_BUCKET=$(cfg backupBucket)
EOF

# Secrets live in a free SecureString parameter; generated values are created once and never rotated here.
error_file="$(mktemp)"
if ! secrets="$(aws ssm get-parameter --name "$secrets_parameter" --with-decryption --query Parameter.Value --output text 2>"$error_file")"; then
	if ! grep -q ParameterNotFound "$error_file"; then
		cat "$error_file" >&2
		exit 1
	fi
	secrets='{}'
fi
rm -f "$error_file"

# SES SMTP password = base64(0x04 || HMAC chain of the IAM secret), per the SES SMTP credentials docs.
ses_smtp_password() {
	local key message
	key="$(printf 'AWS4%s' "$1" | od -An -v -tx1 | tr -d ' \n')"
	for message in 11111111 "$region" ses aws4_request; do
		key="$(printf '%s' "$message" | openssl dgst -sha256 -mac HMAC -macopt "hexkey:$key" -binary | od -An -v -tx1 | tr -d ' \n')"
	done
	{ printf '\004'; printf 'SendRawEmail' | openssl dgst -sha256 -mac HMAC -macopt "hexkey:$key" -binary; } | base64 | tr -d '\n'
}

smtp_username=""
smtp_password=""
if [[ -z "$(jq -r '.AWS_SES_SMTP_USERNAME // ""' <<<"$secrets")" ]]; then
	access_key="$(aws iam create-access-key --user-name "$(cfg sesSmtpUser)" --query AccessKey --output json)"
	smtp_username="$(jq -r .AccessKeyId <<<"$access_key")"
	smtp_password="$(ses_smtp_password "$(jq -r .SecretAccessKey <<<"$access_key")")"
	unset access_key
fi

completed="$(jq -c \
	--arg token "$(openssl rand -hex 32)" \
	--arg otp "$(openssl rand -hex 32)" \
	--arg mysql "$(openssl rand -hex 24)" \
	--arg root "$(openssl rand -hex 24)" \
	--arg smtp_username "$smtp_username" \
	--arg smtp_password "$smtp_password" '
	.API_ACCESS_TOKEN //= $token
	| .OTP_SECRET_ENCRYPTION_KEY //= $otp
	| .MYSQL_PASSWORD //= $mysql
	| .MYSQL_ROOT_PASSWORD //= $root
	| .STRIPE_SECRET_KEY //= ""
	| .STRIPE_WEBHOOK_SECRET //= ""
	| if (.AWS_SES_SMTP_USERNAME // "") == "" then
		.AWS_SES_SMTP_USERNAME = $smtp_username | .AWS_SES_SMTP_PASSWORD = $smtp_password
	else . end' <<<"$secrets")"
if [[ "$completed" != "$(jq -c . <<<"$secrets")" ]]; then
	value_file="$(mktemp)"
	printf '%s' "$completed" >"$value_file"
	aws ssm put-parameter --name "$secrets_parameter" --type SecureString --overwrite \
		--value "file://$value_file" >/dev/null
	rm -f "$value_file"
fi
secrets="$completed"

jq -r '
	{
		MYSQL_DATABASE: "biz_production",
		MYSQL_USER: "biz",
		MYSQL_PASSWORD: .MYSQL_PASSWORD,
		MYSQL_ROOT_PASSWORD: .MYSQL_ROOT_PASSWORD
	} | to_entries[] | "\(.key)=\(.value)"' <<<"$secrets" >mysql.env

jq -r \
	--arg region "$region" \
	--arg app_url "https://$app_domain" \
	--arg api_url "https://$api_domain" \
	--arg timezone "$timezone" '
	{
		NODE_ENV: "production",
		TZ: $timezone,
		BUILD_ENV: "prod",
		PORT: "3000",
		TRUST_PROXY: "1",
		BACKUP_STATUS_FILE: "/var/lib/biz-backup/status.json",
		BACKUP_TRIGGER_FILE: "/var/lib/biz-backup-trigger/request",
		WAIT_FOR: "biz-mysql:3306",
		WAIT_FOR_TIMEOUT: "180",
		DATABASE_URL: "mysql://biz:\(.MYSQL_PASSWORD | @uri)@biz-mysql:3306/biz_production",
		API_ACCESS_TOKEN: .API_ACCESS_TOKEN,
		OTP_SECRET_ENCRYPTION_KEY: .OTP_SECRET_ENCRYPTION_KEY,
		PUBLIC_APP_URL: $app_url,
		PUBLIC_API_URL: $api_url,
		CORS_ALLOWED_ORIGINS: $app_url,
		SMTP_FROM: (.SMTP_FROM // "Sefer Design Co. <info@seferdesign.com>"),
				ACTIVITY_SUMMARY_EMAIL: (.ACTIVITY_SUMMARY_EMAIL // "rob@seferdesign.com"),
		STRIPE_SECRET_KEY: .STRIPE_SECRET_KEY,
		STRIPE_WEBHOOK_SECRET: .STRIPE_WEBHOOK_SECRET,
		PAYMENT_NOTIFICATION_EMAIL: (.PAYMENT_NOTIFICATION_EMAIL // "info@seferdesign.com")
	}
	+ (if .AWS_SES_SMTP_USERNAME != "" then {
		SMTP_HOST: "email-smtp.\($region).amazonaws.com",
		SMTP_PORT: "587",
		SMTP_SECURE: "false",
		SMTP_USER: .AWS_SES_SMTP_USERNAME,
		SMTP_PASSWORD: .AWS_SES_SMTP_PASSWORD
	} else {} end)
	| to_entries[] | "\(.key)=\(.value)"' <<<"$secrets" >api.env

cat >web.env <<EOF
NODE_ENV=production
TZ=${timezone}
NEXT_PUBLIC_TIMEZONE=${timezone}
PORT=3000
API_INTERNAL_URL=http://biz-caddy:8080
NEXT_PUBLIC_API_URL=https://${api_domain}
PUBLIC_APP_URL=https://${app_domain}
NEXT_TELEMETRY_DISABLED=1
EOF

aws ecr get-login-password | docker login --username AWS --password-stdin "${api_image%%/*}" >/dev/null
for image in "$api_image" "$web_image" caddy:2-alpine; do
	docker pull --quiet "$image" >/dev/null
done
# Keep the running database image stable during app releases; bump MYSQL_VERSION for a deliberate DB upgrade.
if ! docker image inspect "$mysql_image" >/dev/null 2>&1; then
	docker pull --quiet "$mysql_image" >/dev/null
fi

docker network inspect biz >/dev/null 2>&1 || docker network create biz >/dev/null

# Recreates a container only when its image, arguments, or referenced files change.
ensure_container() {
	local name="$1" image="$2" fingerprint_file="$3"
	shift 3
	local spec
	spec="$(container_spec "$image" "$fingerprint_file" "$@")"
	if [[ "$(docker container inspect --format '{{index .Config.Labels "biz.spec"}}' "$name" 2>/dev/null)" == "$spec" ]]; then
		docker start "$name" >/dev/null
		return
	fi
	docker rm -f "$name" >/dev/null 2>&1 || true
	docker run -d --name "$name" --network biz --restart unless-stopped --label "biz.spec=$spec" \
		--log-driver awslogs \
		--log-opt awslogs-region="$region" \
		--log-opt awslogs-group="$log_group" \
		--log-opt awslogs-stream="$name" \
		"$@" >/dev/null
	echo "Started $name"
}

container_spec() {
	local image="$1" fingerprint_file="$2"
	shift 2
	{ printf '%s\n' "$@"; docker image inspect --format '{{.Id}}' "$image"; cat "$fingerprint_file"; } \
		| sha256sum | cut -c1-16
}

deploy_state_file=/opt/biz/deploy-state.json
active_api=""
active_web=""
retired_containers=()
if [[ -f "$deploy_state_file" ]]; then
	active_api="$(jq -r '.api // ""' "$deploy_state_file")"
	active_web="$(jq -r '.web // ""' "$deploy_state_file")"
fi
if [[ -n "$active_api" ]] && ! docker container inspect "$active_api" >/dev/null 2>&1; then active_api=""; fi
if [[ -n "$active_web" ]] && ! docker container inspect "$active_web" >/dev/null 2>&1; then active_web=""; fi
if [[ -z "$active_api" ]] && docker container inspect biz-api >/dev/null 2>&1; then active_api=biz-api; fi
if [[ -z "$active_web" ]] && docker container inspect biz-web >/dev/null 2>&1; then active_web=biz-web; fi

save_deploy_state() {
	local temporary_file
	temporary_file="$(mktemp /opt/biz/deploy-state.XXXXXX)"
	jq -n --arg api "$active_api" --arg web "$active_web" '{api: $api, web: $web}' >"$temporary_file"
	chmod 600 "$temporary_file"
	mv -f "$temporary_file" "$deploy_state_file"
}

write_caddyfile() {
	local api_upstream="${1:-biz-api-blue}" web_upstream="${2:-biz-web-blue}" temporary_file
	local api_probe_upstream="${3:-$api_upstream}" web_probe_upstream="${4:-$web_upstream}"
	temporary_file="$(mktemp /opt/biz/Caddyfile.XXXXXX)"
	sed -e "s|__APP_DOMAIN__|${app_domain}|g" \
		-e "s|__API_DOMAIN__|${api_domain}|g" \
		-e "s|__ACME_EMAIL__|$(cfg acmeEmail)|g" \
		-e "s|__API_UPSTREAM__|${api_upstream}|g" \
		-e "s|__WEB_UPSTREAM__|${web_upstream}|g" \
		-e "s|__API_PROBE_UPSTREAM__|${api_probe_upstream}|g" \
		-e "s|__WEB_PROBE_UPSTREAM__|${web_probe_upstream}|g" \
		"$host_dir/Caddyfile.template" >"$temporary_file"
	chmod 644 "$temporary_file"
	cat "$temporary_file" >Caddyfile
	rm -f "$temporary_file"
}

caddy_running() {
	[[ "$(docker container inspect --format '{{.State.Running}}' biz-caddy 2>/dev/null || true)" == true ]]
}

reload_caddy() {
	docker exec biz-caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
}

check_rollout_capacity() {
	local available_kb swap_free_kb
	available_kb="$(awk '$1 == "MemAvailable:" { print $2 }' /proc/meminfo)"
	swap_free_kb="$(awk '$1 == "SwapFree:" { print $2 }' /proc/meminfo)"
	if (( available_kb + swap_free_kb < 786432 )); then
		echo "Not enough available memory and swap for a safe blue-green rollout; active containers were left unchanged." >&2
		return 1
	fi
}

wait_for_health() {
	local container="$1" health_path="$2" attempt
	for ((attempt = 0; attempt < 60; attempt += 1)); do
		if docker exec "$container" node -e \
			'fetch(process.argv[1], { redirect: "manual" }).then((response) => process.exit(response.status === 200 ? 0 : 1)).catch(() => process.exit(1))' \
			"http://127.0.0.1:3000${health_path}" >/dev/null 2>&1; then
			return 0
		fi
		if [[ "$(docker container inspect --format '{{.State.Running}}' "$container" 2>/dev/null || true)" != true ]]; then
			break
		fi
		sleep 2
	done
	echo "Health check failed for $container at ${health_path}; the active container is unchanged." >&2
	return 1
}

wait_for_proxy_health() {
	local container="$1" proxy_port="$2" health_path="$3" attempt
	for ((attempt = 0; attempt < 30; attempt += 1)); do
		if docker exec "$container" node -e \
			'fetch(process.argv[1], { redirect: "manual" }).then((response) => process.exit(response.status === 200 ? 0 : 1)).catch(() => process.exit(1))' \
			"http://biz-caddy:${proxy_port}${health_path}" >/dev/null 2>&1; then
			return 0
		fi
		sleep 2
	done
	echo "Caddy route health check failed for $container at ${health_path}; retaining the previous upstream." >&2
	return 1
}

switch_upstreams() {
	local next_api="$1" next_web="$2" probe_container="$3" proxy_port="$4" health_path="$5"
	local previous_api="$active_api" previous_web="$active_web" candidate_proxy_port
	if [[ "$proxy_port" == 8080 ]]; then candidate_proxy_port=8082; else candidate_proxy_port=8083; fi
	write_caddyfile "$previous_api" "$previous_web" "$next_api" "$next_web"
	if caddy_running; then
		if ! reload_caddy || ! wait_for_proxy_health "$probe_container" "$candidate_proxy_port" "$health_path"; then
			write_caddyfile "$previous_api" "$previous_web"
			reload_caddy || true
			return 1
		fi
		write_caddyfile "$next_api" "$next_web"
		if ! reload_caddy || ! wait_for_proxy_health "$probe_container" "$proxy_port" "$health_path"; then
			write_caddyfile "$previous_api" "$previous_web"
			reload_caddy || true
			return 1
		fi
	fi
	active_api="$next_api"
	active_web="$next_web"
	if ! save_deploy_state; then
		active_api="$previous_api"
		active_web="$previous_web"
		if caddy_running; then
			write_caddyfile "$previous_api" "$previous_web"
			reload_caddy || true
		fi
		return 1
	fi
}

rollout_service() {
	local service="$1" image="$2" fingerprint_file="$3" health_path="$4" active="$5"
	shift 5
	local spec active_spec base candidate retired next_api next_web
	spec="$(container_spec "$image" "$fingerprint_file" --memory=384m --memory-swap=512m "$@")"
	active_spec="$(docker container inspect --format '{{index .Config.Labels "biz.spec"}}' "$active" 2>/dev/null || true)"
	if [[ -n "$active" && "$active_spec" == "$spec" ]]; then
		docker start "$active" >/dev/null
		if wait_for_health "$active" "$health_path"; then
			ROLLOUT_CONTAINER="$active"
			ROLLOUT_RETIRED=""
			return 0
		fi
	fi
	check_rollout_capacity
	base="biz-${service}"
	case "$active" in
		"${base}-blue") candidate="${base}-green" ;;
		*) candidate="${base}-blue" ;;
	esac
	retired="$active"
	docker rm -f "$candidate" >/dev/null 2>&1 || true
	docker run -d --name "$candidate" --network biz --restart unless-stopped \
		--label "biz.spec=$spec" --memory=384m --memory-swap=512m \
		--log-driver awslogs --log-opt awslogs-region="$region" \
		--log-opt awslogs-group="$log_group" --log-opt awslogs-stream="$candidate" \
		"$@" >/dev/null
	if ! wait_for_health "$candidate" "$health_path"; then
		docker rm -f "$candidate" >/dev/null 2>&1 || true
		return 1
	fi
	if [[ "$service" == api ]]; then
		next_api="$candidate"
		next_web="$active_web"
	else
		next_api="$active_api"
		next_web="$candidate"
	fi
	if [[ "$service" == api ]]; then proxy_port=8080; else proxy_port=8081; fi
	if ! switch_upstreams "$next_api" "$next_web" "$candidate" "$proxy_port" "$health_path"; then
		docker rm -f "$candidate" >/dev/null 2>&1 || true
		return 1
	fi
	if [[ -n "$retired" ]]; then
		if caddy_running; then
			docker rm -f "$retired" >/dev/null
		else
			retired_containers+=("$retired")
		fi
	fi
	ROLLOUT_CONTAINER="$candidate"
	ROLLOUT_RETIRED="$retired"
}

ensure_caddy() {
	if docker container inspect biz-caddy >/dev/null 2>&1; then
		docker start biz-caddy >/dev/null
		return
	fi
	docker run -d --name biz-caddy --network biz --restart unless-stopped \
		--log-driver awslogs --log-opt awslogs-region="$region" \
		--log-opt awslogs-group="$log_group" --log-opt awslogs-stream=biz-caddy \
		-p 80:80 -p 443:443 -p 443:443/udp \
		-v /opt/biz/Caddyfile:/etc/caddy/Caddyfile:ro -v caddy_data:/data -v caddy_config:/config \
		caddy:2-alpine >/dev/null
	echo "Started biz-caddy"
}

ensure_container biz-mysql "$mysql_image" /opt/biz/mysql.env \
	--env-file mysql.env -v biz_mysql:/var/lib/mysql -p 127.0.0.1:3306:3306 \
	"$mysql_image" \
	--character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci \
	--innodb-buffer-pool-size=64M --performance-schema=OFF --max-connections=30 --skip-name-resolve

if docker container inspect biz-caddy >/dev/null 2>&1; then docker start biz-caddy >/dev/null; fi
if [[ -n "$active_api" && -n "$active_web" ]] && caddy_running; then
	write_caddyfile "$active_api" "$active_web"
	reload_caddy
fi

api_args=(--env-file api.env \
	-v /opt/biz/backup-status:/var/lib/biz-backup:ro \
	-v /opt/biz/backup-trigger:/var/lib/biz-backup-trigger:rw "$api_image")
web_args=(--env-file web.env --init "$web_image")
legacy_web_api=false
web_migrated_first=false
if [[ -n "$active_web" ]] && ! docker container inspect \
	--format '{{range .Config.Env}}{{println .}}{{end}}' "$active_web" \
	| awk '$0 == "API_INTERNAL_URL=http://biz-caddy:8080" { found = 1 } END { exit !found }'; then
	legacy_web_api=true
fi

# Migrate web first only when moving it from direct API access to Caddy's stable internal route.
if [[ "$legacy_web_api" == true && -n "$active_api" ]]; then
	rollout_service web "$web_image" /opt/biz/web.env /healthz "$active_web" "${web_args[@]}"
	active_web="$ROLLOUT_CONTAINER"
	web_migrated_first=true
fi
rollout_service api "$api_image" /opt/biz/api.env /v1/health "$active_api" "${api_args[@]}"
active_api="$ROLLOUT_CONTAINER"
if [[ "$web_migrated_first" != true ]]; then
	rollout_service web "$web_image" /opt/biz/web.env /healthz "$active_web" "${web_args[@]}"
	active_web="$ROLLOUT_CONTAINER"
fi
save_deploy_state

if ! caddy_running; then
	write_caddyfile "$active_api" "$active_web"
fi
ensure_caddy
wait_for_proxy_health "$active_api" 8080 /v1/health
wait_for_proxy_health "$active_web" 8081 /healthz
for retired in "${retired_containers[@]}"; do
	docker rm -f "$retired" >/dev/null 2>&1 || true
done

cat >/etc/systemd/system/biz-backup.service <<EOF
[Unit]
Description=Back up the biz MySQL database to S3
After=docker.service

[Service]
Type=oneshot
ExecStart=${host_dir}/backup.sh
EOF
cat >/etc/systemd/system/biz-backup.timer <<'EOF'
[Unit]
Description=Nightly biz MySQL backup

[Timer]
OnCalendar=*-*-* 08:00:00 UTC
RandomizedDelaySec=15m
Persistent=true

[Install]
WantedBy=timers.target
EOF
cat >/etc/systemd/system/biz-backup-trigger.service <<'EOF'
[Unit]
Description=Run a requested biz MySQL backup
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
ExecStart=/usr/bin/systemctl start biz-backup.service
ExecStopPost=/usr/bin/rm -f /opt/biz/backup-trigger/request
EOF
cat >/etc/systemd/system/biz-backup-trigger.path <<'EOF'
[Unit]
Description=Watch for a manually requested biz backup

[Path]
PathExists=/opt/biz/backup-trigger/request
Unit=biz-backup-trigger.service

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now biz-backup.timer biz-backup-trigger.path >/dev/null

cat >/etc/systemd/system/biz-summary-weekly.service <<EOF
[Unit]
Description=Send the weekly biz activity summary
After=docker.service

[Service]
Type=oneshot
ExecStart=${host_dir}/activity-summary.sh weekly
EOF
cat >/etc/systemd/system/biz-summary-weekly.timer <<'EOF'
[Unit]
Description=Weekly biz activity summary

[Timer]
OnCalendar=Sun *-*-* 08:00:00 UTC
RandomizedDelaySec=15m
Persistent=true

[Install]
WantedBy=timers.target
EOF

cat >/etc/systemd/system/biz-summary-monthly.service <<EOF
[Unit]
Description=Send the monthly biz activity summary
After=docker.service

[Service]
Type=oneshot
ExecStart=${host_dir}/activity-summary.sh monthly
EOF
cat >/etc/systemd/system/biz-summary-monthly.timer <<'EOF'
[Unit]
Description=Monthly biz activity summary

[Timer]
OnCalendar=*-*-01 08:00:00 UTC
RandomizedDelaySec=15m
Persistent=true

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now biz-summary-weekly.timer biz-summary-monthly.timer >/dev/null

docker image prune -af >/dev/null
echo "Deployed ${api_image##*/} and ${web_image##*/}"
