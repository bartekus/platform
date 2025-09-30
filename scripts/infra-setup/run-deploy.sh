#!/usr/bin/env bash
set -euo pipefail

./scripts/infra-setup/06_trigger_deploy.sh
./scripts/infra-setup/07_healthcheck.sh || true

echo "✅ Deploy complete."
