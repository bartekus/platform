#!/usr/bin/env bash
set -euo pipefail

./scripts/infra-setup/debug.sh
./scripts/infra-setup/00_project_setup.sh
./scripts/infra-setup/01_ssh_config.sh
./scripts/infra-setup/02_create_droplet.sh
./scripts/infra-setup/05_configure_dns.sh     # 👈 new
./scripts/infra-setup/03_set_github_secrets.sh
./scripts/infra-setup/04_trigger_vm_init.sh

echo "✅ All done. Droplet, DNS, and GitHub wiring are ready."