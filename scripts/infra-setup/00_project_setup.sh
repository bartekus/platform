#!/usr/bin/env bash
set -euo pipefail
source ./scripts/infra-setup/env.sh

PROJECT_ID=""
if doctl projects get "$DOCTL_PROJECT_ID" >/dev/null 2>&1; then
  echo "📁 DO Project '$DOCTL_PROJECT_ID' exists."
  PROJECT_ID="$DOCTL_PROJECT_ID"
else
  echo "📁 Creating DO Project '$DOCTL_PROJECT_ID'..."
  # You can extend with --description/--purpose/--environment
  PROJECT_ID=$(doctl projects create \
    --name "$DOCTL_PROJECT_ID" \
    --format ID --no-header)
  echo "✅ Created project with ID: $PROJECT_ID"
fi

# Cache (keeps parity with the rest of your scripts)
echo "export DO_PROJECT_ID_RESOLVED=$PROJECT_ID" > ./scripts/infra-setup/.cache_project_id
