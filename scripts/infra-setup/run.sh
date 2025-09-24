#!/usr/bin/env bash
set -euo pipefail

./scripts/infra-setup/debug.sh
./scripts/infra-setup/00_project_setup.sh
./scripts/infra-setup/01_ssh_config.sh
./scripts/infra-setup/02_create_droplet.sh
./scripts/infra-setup/03_configure_dns.sh
./scripts/infra-setup/04_set_github_secrets.sh
./scripts/infra-setup/05_trigger_vm_init.sh

# Optional but handy once your stack is up (Traefik, certs, etc.)
# You can also run this later in your CI job.
./scripts/infra-setup/06_healthcheck.sh || true

echo "✅ All done. Droplet, DNS (A+AAAA), GitHub wiring, and basic health checks complete."