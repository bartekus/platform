#!/bin/bash
set -euo pipefail

COMPOSE_NAME="platform"
ENV_FILE="${PWD}/.env.local"

# Ensure .env file exists
if [[ ! -f "$ENV_FILE" ]]; then
    echo "Error: .env file not found at $ENV_FILE"
    exit 1
fi

# Load environment variables from .env
set -a # automatically export all variables
source $ENV_FILE
set +a

# Export additional Docker Compose variables
export COMPOSE_PROJECT_NAME=${COMPOSE_NAME}

# Function to check if project is already running
check_containers_running() {
    # Get the output first
    local running_containers=$(docker compose ls --filter name="${COMPOSE_NAME}" --format json)

    # Check if the output is non-empty and contains actual project data
    if [ -n "$running_containers" ] && [ "$running_containers" != "[]" ]; then
        echo "Containers are running"
        return 0  # Found running containers (true)
    else
        echo "Containers are not running"
        return 1  # No running containers (false)
    fi
}

# Only proceed with Docker setup if containers aren't running
if ! check_containers_running; then
    echo "Docker containers are not running. Initiating Docker setup..."

  # Start the main compose services
  docker compose \
  --env-file "$ENV_FILE" \
  --project-name "${COMPOSE_NAME}" \
  -f "./docker-compose.yml" \
  up -d --build --force-recreate --renew-anon-volumes \
  || exit
else
    echo "Docker containers are already running. Skipping Docker setup..."
fi

# Function to set encore-dev local a secret if the environment variable exists
set_secret() {
    local secret_name=$1
    local env_value=${!secret_name}

    if [ -n "$env_value" ]; then
        echo "Setting secret: $secret_name"
        encore secret set --type dev,preview,local "$secret_name" <<< "$env_value"
    else
        echo "Warning: $secret_name not found in .env"
    fi
}

# List of secrets to set
secrets=(
    "DOMAIN"
    "API_DOMAIN"
    "LOGTO_DOMAIN"
    "WEB_DOMAIN"
    "LOGTO_APP_ID"
    "LOGTO_APP_SECRET"
    "LOGTO_MANAGEMENT_API_APPLICATION_ID"
    "LOGTO_MANAGEMENT_API_APPLICATION_SECRET"
    "LOGTO_APP_API_EVENT_WEBHOOK_SIGNING_KEY"
    "STRIPE_API_KEY"
    "STRIPE_WEBHOOK_SECRET"
    "STRIPE_SERVICE_API_KEY"
    "STRIPE_API_VERSION"
)

# Set each secret
for secret in "${secrets[@]}"; do
    set_secret "$secret"
done

export DISABLE_ENCORE_TELEMETRY=1
export NODE_EXTRA_CA_CERTS="./.local-infra/certs/mkcert-rootCA.pem"
exec encore run --debug --verbose --watch --listen 0.0.0.0:4000
