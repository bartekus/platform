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
if doctl projects list --format Name --no-header | grep -qx "$DO_PROJECT_NAME"; then
  echo "✅ Project '$DO_PROJECT_NAME' exists."
else
  echo "⚠️  Project '$DO_PROJECT_NAME' not found (will be created in 00_project_setup.sh)."
fi

echo "✅ All authentication checks passed."