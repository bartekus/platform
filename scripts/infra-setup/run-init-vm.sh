#!/usr/bin/env bash
set -euo pipefail

# Infra Init
./scripts/infra-setup/debug.sh
./scripts/infra-setup/00_project_setup.sh
./scripts/infra-setup/01_ssh_config.sh
./scripts/infra-setup/02_create_droplet.sh
./scripts/infra-setup/03_configure_dns.sh
./scripts/infra-setup/04_set_github_secrets.sh
# VM init
./scripts/infra-setup/05_trigger_vm_init.sh

echo "✅ VM setup complete."
