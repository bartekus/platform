#!/usr/bin/env bash
set -euo pipefail
source ./scripts/infra-setup/env.sh

# Resolve a project ID by Name
resolve_project_id_by_name() {
  local name="$1"
  doctl projects list --format ID,Name --no-header \
    | awk -v n="$name" '$2==n {print $1}' | head -n1
}

PROJECT_NAME="$DO_PROJECT_NAME"

echo "📁 Ensuring DO Project '${PROJECT_NAME}' exists..."
PROJECT_ID="$(resolve_project_id_by_name "$PROJECT_NAME" || true)"

if [[ -z "${PROJECT_ID:-}" ]]; then
  echo "📁 Creating DO Project '${PROJECT_NAME}' (purpose='${DO_PROJECT_PURPOSE}', env='${DO_PROJECT_ENVIRONMENT}')..."
  # purpose is REQUIRED by the API; environment helps classification
  # Valid environments per DO: Development, Staging, Production
  doctl projects create \
    --name "$PROJECT_NAME" \
    --purpose "$DO_PROJECT_PURPOSE" \
    --environment "$DO_PROJECT_ENVIRONMENT" \
    --description "$DO_PROJECT_DESC" >/dev/null

  # Re-resolve to get its ID
  PROJECT_ID="$(resolve_project_id_by_name "$PROJECT_NAME")"
  if [[ -z "${PROJECT_ID:-}" ]]; then
    echo "❌ Failed to create/resolve project '${PROJECT_NAME}'."
    exit 1
  fi
  echo "✅ Created project '${PROJECT_NAME}' with ID: ${PROJECT_ID}"
else
  echo "✅ Project '${PROJECT_NAME}' exists with ID: ${PROJECT_ID}"
fi

# Cache the resolved ID for later scripts
echo "export DO_PROJECT_ID_RESOLVED=$PROJECT_ID" > ./scripts/infra-setup/.cache_project_id