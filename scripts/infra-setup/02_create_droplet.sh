#!/usr/bin/env bash
set -euo pipefail
source ./scripts/infra-setup/env.sh
source ./scripts/infra-setup/.cache_ssh_key_id
source ./scripts/infra-setup/.cache_project_id || true

EXISTING_ID=$(doctl compute droplet list --format ID,Name --no-header | awk -v name="$DROPLET_NAME" '$2 == name { print $1 }')

# Validate/normalize IMAGE slug (common Ubuntu shorthand corrections)
if ! doctl compute image list-distribution --format Slug --no-header | awk '{print $1}' | grep -qx "$IMAGE"; then
  case "$IMAGE" in
    ubuntu-24-10-x64|ubuntu-24-10) IMAGE="ubuntu-24-04-x64" ;;
    ubuntu-22-10-x64|ubuntu-22-10) IMAGE="ubuntu-22-04-x64" ;;
    ubuntu-20-10-x64|ubuntu-20-10) IMAGE="ubuntu-20-04-x64" ;;
  esac
  # If still not valid, fail with a helpful message
  if ! doctl compute image list-distribution --format Slug --no-header | awk '{print $1}' | grep -qx "$IMAGE"; then
    echo "❌ IMAGE slug is invalid: '${IMAGE}'. Try one of:"
    doctl compute image list-distribution --format Slug,Name --no-header | grep -E '^ubuntu-(20|22|24)-04-x64' | sort -r
    exit 1
  else
    echo "ℹ️  Normalized IMAGE slug to '${IMAGE}'."
  fi
fi

if [[ -n "${EXISTING_ID:-}" ]]; then
  DROPLET_ID="$EXISTING_ID"
  echo "💻 Droplet already exists with ID ${DROPLET_ID}"
else
  echo "💻 Creating new droplet (IPv6 enabled)..."
  DROPLET_ID=$(doctl compute droplet create "$DROPLET_NAME" \
    --region "$REGION" \
    --size "$SIZE" \
    --image "$IMAGE" \
    --enable-monitoring \
    --enable-ipv6 \
    --ssh-keys "$SSH_KEY_ID" \
    --format ID --no-header \
    --wait)
  echo "✅ Droplet created with ID ${DROPLET_ID}"
fi

# Assign to project if available
if [[ -n "${DO_PROJECT_ID_RESOLVED:-}" ]]; then
  echo "📎 Assigning droplet to project ${DO_PROJECT_ID_RESOLVED}..."
  doctl projects resources assign "$DO_PROJECT_ID_RESOLVED" "do:droplet:${DROPLET_ID}" >/dev/null
fi

echo "🌐 Waiting for droplet IPs..."
for i in {1..60}; do
  DROPLET_IP=$(doctl compute droplet get "$DROPLET_NAME" --format PublicIPv4 --no-header | tr -d ' ')
  DROPLET_IPV6=$(doctl compute droplet get "$DROPLET_NAME" --format PublicIPv6 --no-header | tr -d ' ')
  if [[ -n "$DROPLET_IP" && "$DROPLET_IP" != "0.0.0.0" ]]; then
    break
  fi
  sleep 2
done

if [[ -z "${DROPLET_IP:-}" ]]; then
  echo "❌ Could not obtain droplet IPv4."
  exit 1
fi

echo "⏳ Waiting for SSH (IPv4) to become available at ${DROPLET_IP}..."
for i in {1..90}; do
  if timeout 3 bash -c ">/dev/tcp/${DROPLET_IP}/22" 2>/dev/null; then
    break
  fi
  sleep 2
done

echo "✅ Droplet IPv4: ${DROPLET_IP}"
[[ -n "${DROPLET_IPV6:-}" && "$DROPLET_IPV6" != "::" ]] && echo "✅ Droplet IPv6: ${DROPLET_IPV6}"

# Cache both
{
  echo "export DROPLET_IP=$DROPLET_IP"
  [[ -n "${DROPLET_IPV6:-}" && "$DROPLET_IPV6" != "::" ]] && echo "export DROPLET_IPV6=$DROPLET_IPV6"
} > ./scripts/infra-setup/.cache_droplet_ip