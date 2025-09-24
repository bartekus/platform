#!/usr/bin/env bash
set -euo pipefail
source ./scripts/infra-setup/env.sh

echo "🔍 Checking DigitalOcean authentication..."
doctl account get || (echo "❌ DOCTL auth failed. Run: doctl auth init" && exit 1)

echo "🔍 Checking GitHub CLI authentication..."
gh auth status || (echo "❌ GitHub CLI auth failed. Run: gh auth login" && exit 1)

echo "✅ All authentication checks passed."
