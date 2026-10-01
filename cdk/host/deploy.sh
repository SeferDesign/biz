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
mysql_image="mysql:$(cfg mysqlVersion)"

cd /opt/biz
umask 077

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

completed="$(jq -c \
	--arg token "$(openssl rand -hex 32)" \
	--arg otp "$(openssl rand -hex 32)" \
	--arg mysql "$(openssl rand -hex 24)" \
	--arg root "$(openssl rand -hex 24)" '
	.API_ACCESS_TOKEN //= $token
	| .OTP_SECRET_ENCRYPTION_KEY //= $otp
	| .MYSQL_PASSWORD //= $mysql
	| .MYSQL_ROOT_PASSWORD //= $root
	| .STRIPE_SECRET_KEY //= ""
	| .STRIPE_WEBHOOK_SECRET //= ""
	| .AWS_SES_SMTP_USERNAME //= ""
	| .AWS_SES_SMTP_PASSWORD //= ""' <<<"$secrets")"
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
	--arg api_url "https://$api_domain" '
	{
		NODE_ENV: "production",
		BUILD_ENV: "prod",
		PORT: "3000",
		WAIT_FOR: "biz-mysql:3306",
		WAIT_FOR_TIMEOUT: "180",
		DATABASE_URL: "mysql://biz:\(.MYSQL_PASSWORD | @uri)@biz-mysql:3306/biz_production",
		API_ACCESS_TOKEN: .API_ACCESS_TOKEN,
		OTP_SECRET_ENCRYPTION_KEY: .OTP_SECRET_ENCRYPTION_KEY,
		PUBLIC_APP_URL: $app_url,
		PUBLIC_API_URL: $api_url,
		CORS_ALLOWED_ORIGINS: $app_url,
		SMTP_FROM: (.SMTP_FROM // "Sefer Design Co. <info@seferdesign.com>"),
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
PORT=3000
API_INTERNAL_URL=http://biz-api:3000
NEXT_PUBLIC_API_URL=https://${api_domain}
PUBLIC_APP_URL=https://${app_domain}
NEXT_TELEMETRY_DISABLED=1
EOF

sed -e "s|__APP_DOMAIN__|${app_domain}|g" \
	-e "s|__API_DOMAIN__|${api_domain}|g" \
	-e "s|__ACME_EMAIL__|$(cfg acmeEmail)|g" \
	"$host_dir/Caddyfile.template" >Caddyfile
chmod 644 Caddyfile

aws ecr get-login-password | docker login --username AWS --password-stdin "${api_image%%/*}" >/dev/null
for image in "$api_image" "$web_image" "$mysql_image" caddy:2-alpine; do
	docker pull --quiet "$image" >/dev/null
done

docker network inspect biz >/dev/null 2>&1 || docker network create biz >/dev/null

# Recreates a container only when its image, arguments, or referenced files change.
ensure_container() {
	local name="$1" image="$2" fingerprint_file="$3"
	shift 3
	local spec
	spec="$({ printf '%s\n' "$@"; docker image inspect --format '{{.Id}}' "$image"; cat "$fingerprint_file"; } | sha256sum | cut -c1-16)"
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

ensure_container biz-mysql "$mysql_image" /opt/biz/mysql.env \
	--env-file mysql.env -v biz_mysql:/var/lib/mysql -p 127.0.0.1:3306:3306 \
	"$mysql_image" \
	--character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci \
	--innodb-buffer-pool-size=64M --performance-schema=OFF --max-connections=30 --skip-name-resolve
ensure_container biz-api "$api_image" /opt/biz/api.env --env-file api.env "$api_image"
ensure_container biz-web "$web_image" /opt/biz/web.env --env-file web.env --init "$web_image"
ensure_container biz-caddy caddy:2-alpine /opt/biz/Caddyfile \
	-p 80:80 -p 443:443 -p 443:443/udp \
	-v /opt/biz/Caddyfile:/etc/caddy/Caddyfile:ro -v caddy_data:/data -v caddy_config:/config \
	caddy:2-alpine

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
systemctl daemon-reload
systemctl enable --now biz-backup.timer >/dev/null

docker image prune -af >/dev/null
echo "Deployed ${api_image##*/} and ${web_image##*/}"
