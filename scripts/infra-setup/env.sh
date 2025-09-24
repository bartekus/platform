#!/usr/bin/env bash
set -euo pipefail

# Allow overrides for env file paths
INFRA_ENV_FILE="${INFRA_ENV_FILE:-.env.digitalocean}"
APP_ENV_FILE="${APP_ENV_FILE:-.env.prod}"

# Load cloud/infra vars first
if [[ ! -f "$INFRA_ENV_FILE" ]]; then
  echo >&2 "❌ Missing infra env file: $INFRA_ENV_FILE (set INFRA_ENV_FILE to override)"
  exit 1
fi
set -a
# shellcheck disable=SC1090
source "$INFRA_ENV_FILE"
set +a

# Load app/product env (optional but recommended)
if [[ -f "$APP_ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$APP_ENV_FILE"
  set +a
else
  echo "ℹ️  App env file not found ($APP_ENV_FILE); continuing without it."
fi

# Defaults & validation
REGION="${REGION:-tor1}"
SIZE="${SIZE:-s-1vcpu-1gb}"
IMAGE="${IMAGE:-ubuntu-24-10-x64}"
BRANCH="${BRANCH:-main}"

REQUIRED_VARS=(GITHUB_REPO DOCTL_PROJECT_ID REGION SIZE IMAGE BRANCH DROPLET_NAME SERVER_USER KEY_NAME)
for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo >&2 "❌ Missing required env var: $var"
    exit 1
  fi
done

# ── Domain config (can come from .env.prod or be set here) ─────────────────────
# If DOMAIN is present (preferred from .env.prod), derive sensible defaults
if [[ -n "${DOMAIN:-}" ]]; then
  TRAEFIK_DASHBOARD_DOMAIN="${TRAEFIK_DASHBOARD_DOMAIN:-traefik.${DOMAIN}}"
  API_DOMAIN="${API_DOMAIN:-backend.${DOMAIN}}"
  WEB_DOMAIN="${WEB_DOMAIN:-${DOMAIN}}"
  DOZZLE_DOMAIN="${DOZZLE_DOMAIN:-dozzle.${DOMAIN}}"
  LOGTO_DOMAIN="${LOGTO_DOMAIN:-logto.${DOMAIN}}"
  LOGTO_ADMIN_DOMAIN="${LOGTO_ADMIN_DOMAIN:-logto-admin.${DOMAIN}}"
fi