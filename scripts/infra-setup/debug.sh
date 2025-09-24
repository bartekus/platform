#!/usr/bin/env bash
set -euo pipefail
source ./scripts/infra-setup/env.sh

echo "🔍 Checking DigitalOcean authentication..."
doctl account get || (echo "❌ DOCTL auth failed. Run: doctl auth init" && exit 1)

echo "🔍 Active DO context:"
doctl auth list

echo "🔍 Checking GitHub CLI authentication..."
gh auth status || (echo "❌ GitHub CLI auth failed. Run: gh auth login" && exit 1)

echo "🔍 Verifying DO Project presence..."
if ! doctl projects get "$DOCTL_PROJECT_ID" >/dev/null 2>&1; then
  echo "⚠️  Project '$DOCTL_PROJECT_ID' not found (will be created in 00_project_setup.sh)."
else
  echo "✅ Project '$DOCTL_PROJECT_ID' exists."
fi

echo "✅ All authentication checks passed."