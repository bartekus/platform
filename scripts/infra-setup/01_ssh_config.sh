#!/usr/bin/env bash
set -euo pipefail
source ./scripts/infra-setup/env.sh

KEY_PATH="$HOME/.ssh/${KEY_NAME}"

if [[ ! -f "${KEY_PATH}" ]]; then
  echo "🔐 Generating SSH key at ${KEY_PATH}..."
  ssh-keygen -t ed25519 -C "${SERVER_USER}@${DROPLET_NAME}" -f "${KEY_PATH}" -N ""
  chmod 600 "${KEY_PATH}"
else
  echo "✅ SSH key exists at ${KEY_PATH}, reusing."
fi

echo "🔑 Ensuring SSH key is registered with DigitalOcean..."
SSH_FINGERPRINT=$(ssh-keygen -lf "${KEY_PATH}.pub" | awk '{print $2}')
EXISTING_ID=$(doctl compute ssh-key list --format ID,Fingerprint --no-header \
  | awk -v fp="$SSH_FINGERPRINT" '$2 == fp { print $1 }')

if [[ -z "${EXISTING_ID:-}" ]]; then
  echo "⬆️ Uploading key to DigitalOcean..."
  KEY_CONTENT=$(<"${KEY_PATH}.pub")
  SSH_KEY_ID=$(doctl compute ssh-key create \
    "${KEY_NAME}" \
    --public-key "$KEY_CONTENT" \
    --format ID \
    --no-header)
else
  SSH_KEY_ID="$EXISTING_ID"
  echo "🔁 Key already exists on DO with ID $SSH_KEY_ID"
fi

echo "export SSH_KEY_ID=$SSH_KEY_ID" > ./scripts/infra-setup/.cache_ssh_key_id