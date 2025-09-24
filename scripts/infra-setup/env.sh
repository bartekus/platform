#!/usr/bin/env bash
set -euo pipefail

# Allow overrides for env file paths
BRANCH="${BRANCH:-main}"
# Infra related
INFRA_ENV_FILE="${INFRA_ENV_FILE:-.env.digitalocean}"
DNS_SAFE_REPLACE="${DNS_SAFE_REPLACE:-1}"   # 1=delete+create on change, 0=use update
DNS_DEFAULT_TTL="${DNS_DEFAULT_TTL:-60}"

# Which workflows to trigger
WORKFLOW_FILE="${WORKFLOW_FILE:-.github/workflows/vm_init.yml}"
DEPLOY_WORKFLOW_FILE="${DEPLOY_WORKFLOW_FILE:-.github/workflows/deploy.yml}"

# Toggles (set to 0 to skip)
TRIGGER_VM_INIT="${TRIGGER_VM_INIT:-1}"
TRIGGER_DEPLOY="${TRIGGER_DEPLOY:-1}"

# Deployment specific
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

# Project metadata (used on create)
DO_PROJECT_NAME="${DO_PROJECT_NAME:-$DOCTL_PROJECT_ID}"   # keep backward compat with your var
DO_PROJECT_PURPOSE="${DO_PROJECT_PURPOSE:-Web Application}"
DO_PROJECT_ENVIRONMENT="${DO_PROJECT_ENVIRONMENT:-Production}"  # Production|Development|Staging|Sandbox|Testing
DO_PROJECT_DESC="${DO_PROJECT_DESC:-Platform stack}"

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