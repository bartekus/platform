#!/usr/bin/env bash
set -euo pipefail

# Allow override via ENV_FILE path; default to .env.digitalocean
INFRA_ENV_FILE="${INFRA_ENV_FILE:-.env.digitalocean}"

if [[ ! -f "$INFRA_ENV_FILE" ]]; then
  echo >&2 "❌ Missing env file: $INFRA_ENV_FILE (set INFRA_ENV_FILE to override)"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$INFRA_ENV_FILE"
set +a

# Reasonable defaults (can be overridden in .env)
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
