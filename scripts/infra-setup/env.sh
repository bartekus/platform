#!/usr/bin/env bash
set -euo pipefail

INFRA_ENV_FILE=".env.digitalocean"
[[ -f ".env.digitalocean" ]] && INFRA_ENV_FILE=".env.digitalocean"

set -a
source "$INFRA_ENV_FILE"
set +a

REQUIRED_VARS=(GITHUB_REPO DOCTL_PROJECT_ID REGION SIZE IMAGE BRANCH DROPLET_NAME SERVER_USER KEY_NAME)
for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo >&2 "Missing required env var: $var"
    exit 1
  fi
done