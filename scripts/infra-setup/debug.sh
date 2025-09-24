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

echo "🔍 Verifying DO Image slug '${IMAGE}'..."
if ! doctl compute image list-distribution --format Slug --no-header | awk '{print $1}' | grep -qx "$IMAGE"; then
  echo "⚠️  Image slug '$IMAGE' not found among public distribution images."
  echo "   Here are a few common Ubuntu LTS slugs you can use:"
  doctl compute image list-distribution --format Slug,Name --no-header | grep -E '^ubuntu-(20|22|24)-04-x64' | sort -r
  echo "   Set IMAGE=ubuntu-24-04-x64 in .env.digitalocean (recommended)."
fi

echo "✅ All authentication checks passed."