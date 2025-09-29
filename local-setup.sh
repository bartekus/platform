#!/usr/bin/env bash
set -euo pipefail

echo "Installing/Updating brew dependencies"
# we are installing gettext to easily get envsubst which is what we are actually dependent on
brew install encoredev/tap/encore mkcert nss stripe/stripe-cli/stripe gettext openssl bash
brew link --force gettext

echo "Setting up mkcert local CA (idempotent)"
mkcert -install

# Paths
ENV_EXAMPLE_FILE="${PWD}/.env.sample"
ENV_FILE="${PWD}/.env.local"
INFRA_DIR="${PWD}/.local-infra"
CERT_DIR="${INFRA_DIR}/certs"
TRAEFIK_DIR="${INFRA_DIR}/traefik/dynamic"

# Ensure .env.local exists (from sample if needed)
if [[ ! -f "$ENV_FILE" ]]; then
  if [[ ! -f "$ENV_EXAMPLE_FILE" ]]; then
    echo "ERROR: $ENV_EXAMPLE_FILE not found. Cannot create $ENV_FILE." >&2
    exit 1
  fi
  cp "$ENV_EXAMPLE_FILE" "$ENV_FILE"
  echo ".env.local created from .env.sample"
else
  echo ".env.local already exists"
fi

# Load environment variables
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# Required domain vars
required_vars=(DOMAIN API_DOMAIN WEB_DOMAIN DOZZLE_DOMAIN LOGTO_DOMAIN LOGTO_ADMIN_DOMAIN TRAEFIK_DOMAIN PGWEB_DOMAIN)

missing=()
for v in "${required_vars[@]}"; do
  # ${!v} is indirect expansion -> value of variable named by $v
  if [[ -z "${!v:-}" ]]; then
    missing+=("$v")
  fi
done

if (( ${#missing[@]} > 0 )); then
  echo "ERROR: Missing required domain variables in .env.local: ${missing[*]}" >&2
  exit 1
fi

# Create certs directory if needed
mkdir -p "$CERT_DIR" "$TRAEFIK_DIR"

#echo "Copying rootCA to cert folder"
CAROOT="$(mkcert -CAROOT)"
cp -f "$CAROOT/rootCA.pem" "${CERT_DIR}/mkcert-rootCA.pem"

echo "Generating mkcert certificate for local HTTPS domains"
mkcert -cert-file "${CERT_DIR}/${DOMAIN}.pem" -key-file "${CERT_DIR}/${DOMAIN}-key.pem" \
  "${API_DOMAIN}" "${WEB_DOMAIN}" "${DOZZLE_DOMAIN}" "${LOGTO_DOMAIN}" "${LOGTO_ADMIN_DOMAIN}" "${TRAEFIK_DOMAIN}" "${PGWEB_DOMAIN}"

echo "Generating tls.yml local Traefik config"

# Write a template with literal ${VARS} (no expansion here)
cat > "${TRAEFIK_DIR}/tls.tmpl.yml" <<'YAML'
tls:
  certificates:
    - certFile: /certs/${DOMAIN}.pem
      keyFile: /certs/${DOMAIN}-key.pem

http:
  services:
    encore:
      loadBalancer:
        servers:
          - url: http://host.docker.internal:4000
    vite:
      loadBalancer:
        servers:
          - url: http://host.docker.internal:5173

  routers:
    # API
    encore:
      rule: Host(`${API_DOMAIN}`)
      entryPoints: [websecure]
      tls: true
      service: encore

    # Client
    vite:
      rule: Host(`${WEB_DOMAIN}`)
      entryPoints: [websecure]
      tls: true
      service: vite
YAML

# Expand only the vars we need and then write the real file
export DOMAIN API_DOMAIN WEB_DOMAIN
envsubst '${DOMAIN} ${API_DOMAIN} ${WEB_DOMAIN}' \
  < "${TRAEFIK_DIR}/tls.tmpl.yml" \
  > "${TRAEFIK_DIR}/tls.yml"
# lastly remove the tmpl file
rm -f "${TRAEFIK_DIR}/tls.tmpl.yml"

# Ensure hosts helper exists and is executable
HOSTS_SCRIPT="./scripts/create-etc-hosts-entry.sh"
if [[ ! -x "$HOSTS_SCRIPT" ]]; then
  if [[ -f "$HOSTS_SCRIPT" ]]; then
    chmod +x "$HOSTS_SCRIPT"
  else
    echo "ERROR: $HOSTS_SCRIPT not found. Cannot add /etc/hosts entries." >&2
    exit 1
  fi
fi

echo "Adding /etc/hosts entries (may prompt for sudo)"
for domain in "${API_DOMAIN}" "${WEB_DOMAIN}" "${DOZZLE_DOMAIN}" "${LOGTO_DOMAIN}" "${LOGTO_ADMIN_DOMAIN}" "${TRAEFIK_DOMAIN}" "${PGWEB_DOMAIN}"; do
  "$HOSTS_SCRIPT" "$domain"
done

echo "✅ Local setup complete."