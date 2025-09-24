#!/usr/bin/env bash
set -euo pipefail

./scripts/infra-setup/debug.sh
./scripts/infra-setup/00_project_setup.sh
./scripts/infra-setup/01_ssh_config.sh
./scripts/infra-setup/02_create_droplet.sh
./scripts/infra-setup/03_configure_dns.sh
./scripts/infra-setup/04_set_github_secrets.sh

# VM init (optional)
if [[ "${TRIGGER_VM_INIT:-1}" -eq 1 ]]; then
  ./scripts/infra-setup/05_trigger_vm_init.sh
else
  echo "⏭️  Skipping VM init trigger (TRIGGER_VM_INIT=0)."
fi

# Deploy (optional)
if [[ "${TRIGGER_DEPLOY:-1}" -eq 1 ]]; then
  ./scripts/infra-setup/06_trigger_deploy.sh
else
  echo "⏭️  Skipping deploy trigger (TRIGGER_DEPLOY=0)."
fi

# You can keep the healthcheck here or in the deploy workflow
./scripts/infra-setup/07_healthcheck.sh || true

echo "✅ Infra setup complete."
