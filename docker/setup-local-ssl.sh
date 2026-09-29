#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$REPO_ROOT"

DOMAIN="${APP_DOMAIN:-biz.loc}"
API_DOMAIN="${API_DOMAIN:-api.${DOMAIN}}"
HOSTS_IP="${HOSTS_IP:-127.0.0.1}"
CERT_DIR="docker/certs"
CERT_FILE="${CERT_DIR}/${DOMAIN}.pem"
KEY_FILE="${CERT_DIR}/${DOMAIN}-key.pem"

if ! command -v mkcert >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    echo "mkcert not found. Installing via Homebrew..."
    brew install mkcert nss
  else
    echo "Error: mkcert is not installed and Homebrew is unavailable."
    echo "Install mkcert first, then rerun: npm run local -- setup"
    exit 1
  fi
fi

echo "Installing local CA (mkcert -install)..."
mkcert -install

mkdir -p "${CERT_DIR}"

# One certificate covers the app and API hostnames so nginx loads a single pair.
if [[ -f "${CERT_FILE}" && -f "${KEY_FILE}" ]] \
  && openssl x509 -in "${CERT_FILE}" -noout -text | grep -q "DNS:${API_DOMAIN}"; then
  echo "Certificate already covers ${DOMAIN} and ${API_DOMAIN}."
else
  echo "Generating certificate for ${DOMAIN}, ${API_DOMAIN}, *.${DOMAIN}..."
  mkcert -cert-file "${CERT_FILE}" -key-file "${KEY_FILE}" "${DOMAIN}" "${API_DOMAIN}" "*.${DOMAIN}"
fi

add_hosts_entry() {
  local domain="$1"
  local hosts_line="${HOSTS_IP} ${domain}"

  if grep -Eq "^[[:space:]]*${HOSTS_IP}[[:space:]]+${domain}([[:space:]]|$)" /etc/hosts; then
    echo "${domain} is already mapped to ${HOSTS_IP} in /etc/hosts."
    return
  fi

  if grep -Eq "(^|[[:space:]])${domain}([[:space:]]|$)" /etc/hosts; then
    echo "Updating ${domain} mapping to ${HOSTS_IP} in /etc/hosts (sudo required)..."
    local tmp_hosts_file
    tmp_hosts_file="$(mktemp)"
    awk -v domain="${domain}" -v hosts_line="${hosts_line}" '
      BEGIN { updated = 0 }
      {
        if ($0 ~ "(^|[[:space:]])" domain "([[:space:]]|$)") {
          if (!updated) {
            print hosts_line
            updated = 1
          }
          next
        }
        print
      }
      END {
        if (!updated) {
          print hosts_line
        }
      }
    ' /etc/hosts > "${tmp_hosts_file}"
    sudo cp "${tmp_hosts_file}" /etc/hosts
    rm -f "${tmp_hosts_file}"
    return
  fi

  echo "Adding ${domain} to /etc/hosts (sudo required)..."
  # Ensure the file ends with a newline first, otherwise the appended line gets
  # glued onto the last existing line and silently comments it out.
  if [[ -s /etc/hosts && "$(tail -c1 /etc/hosts)" != "" ]]; then
    echo | sudo tee -a /etc/hosts >/dev/null
  fi
  echo "${hosts_line}" | sudo tee -a /etc/hosts >/dev/null
}

# The API subdomain is handled first: the bare-domain awk rewrite would
# otherwise match and replace the "api.biz.loc" line too.
add_hosts_entry "${API_DOMAIN}"
add_hosts_entry "${DOMAIN}"

echo "Local SSL setup complete."
echo "App: https://${DOMAIN}:${HTTPS_PORT:-9443}"
echo "API: https://${API_DOMAIN}:${HTTPS_PORT:-9443}"
