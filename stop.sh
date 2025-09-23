#!/bin/bash
set -euo pipefail

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

docker compose \
--env-file "$ENV_FILE" \
-f "./docker-compose.yml" \
down --volumes --remove-orphans -t 1 \
|| exit

echo "Done"
