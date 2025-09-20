#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${PWD}/.env.local"
SSL_CERT="${PWD}/certs/localhost.pem"
SSL_KEY="${PWD}/certs/localhost-key.pem"
HOSTS_SCRIPT="./scripts/remove-etc-hosts-entry.sh"
DEEP_UNINSTALL_CA="${1:-}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: .env.local doesn't exist" >&2
  exit 1
fi

# Load env
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# Required domain vars
required_vars=(API_DOMAIN WEB_DOMAIN DOZZLE_DOMAIN LOGTO_DOMAIN LOGTO_ADMIN_DOMAIN)
missing=()
for v in "${required_vars[@]}"; do
  if [[ -z "${!v:-}" ]]; then
    missing+=("$v")
  fi
done
if (( ${#missing[@]} > 0 )); then
  echo "ERROR: Missing required domain variables in .env.local: ${missing[*]}" >&2
  exit 1
fi

# Remove cert files (if present)
if [[ -f "$SSL_CERT" ]]; then
  rm -f -- "$SSL_CERT"
  echo "Removed $(basename "$SSL_CERT")"
fi
if [[ -f "$SSL_KEY" ]]; then
  rm -f -- "$SSL_KEY"
  echo "Removed $(basename "$SSL_KEY")"
fi

# Remove empty certs dir if applicable
if [[ -d "${PWD}/certs" ]] && [[ -z "$(ls -A "${PWD}/certs")" ]]; then
  rmdir -- "${PWD}/certs" || true
  echo "Removed empty certs/ directory"
fi

# Ensure hosts helper exists and is executable
if [[ ! -x "$HOSTS_SCRIPT" ]]; then
  if [[ -f "$HOSTS_SCRIPT" ]]; then
    chmod +x "$HOSTS_SCRIPT"
  else
    echo "ERROR: $HOSTS_SCRIPT not found. Cannot remove /etc/hosts entries." >&2
    exit 1
  fi
fi

echo "Removing /etc/hosts entries (may prompt for sudo)"
for domain in "${API_DOMAIN}" "${WEB_DOMAIN}" "${DOZZLE_DOMAIN}" "${LOGTO_DOMAIN}" "${LOGTO_ADMIN_DOMAIN}"; do
  "$HOSTS_SCRIPT" "$domain"
done

# Optional: remove mkcert local CA from system trust if user requests it
if [[ "$DEEP_UNINSTALL_CA" == "--deep" ]]; then
  if command -v mkcert >/dev/null 2>&1; then
    echo "Removing mkcert local CA from system trust (requires password)"
    mkcert -uninstall
  else
    echo "mkcert not found; skipping CA uninstall"
  fi
fi

echo "✅ Local cleanup complete."
