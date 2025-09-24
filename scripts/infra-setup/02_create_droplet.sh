#!/usr/bin/env bash
set -euo pipefail
source ./scripts/infra-setup/env.sh
source ./scripts/infra-setup/.cache_ssh_key_id

EXISTING_ID=$(doctl compute droplet list --format ID,Name --no-header | awk -v name="$DROPLET_NAME" '$2 == name { print $1 }')

if [[ -n "$EXISTING_ID" ]]; then
  DROPLET_ID=$EXISTING_ID
  echo "💻 Droplet already exists with ID ${DROPLET_ID}"
else
  echo "💻 Creating new droplet..."
  doctl compute droplet create "$DROPLET_NAME" \
    --project-id "$DOCTL_PROJECT_ID" \
    --region "$REGION" \
    --size "$SIZE" \
    --image "$IMAGE" \
    --enable-monitoring \
    --ssh-keys "$SSH_KEY_ID" \
    --format ID,Name,PublicIPv4,Status \
    --wait >/dev/null 2>&1 || true

  echo "💻 Droplet created."
fi

echo "🌐 Waiting for droplet to bootup."
sleep 10

DROPLET_IP=$(doctl compute droplet get glyphos-platform-server --format PublicIPv4 --no-header | tr -d ' ')

echo "✅ Droplet is up at IP: ${DROPLET_IP}"
echo "export DROPLET_IP=$DROPLET_IP" > ./scripts/infra-setup/.cache_droplet_ip
