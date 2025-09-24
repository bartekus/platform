#!/usr/bin/env bash
set -euo pipefail
source ./scripts/infra-setup/env.sh

KEY_PATH="$HOME/.ssh/${KEY_NAME}"

# 1) Ensure key exists locally
if [[ ! -f "${KEY_PATH}" ]]; then
  echo "🔐 Generating SSH key at ${KEY_PATH}..."
  ssh-keygen -t ed25519 -C "${SERVER_USER}@${DROPLET_NAME}" -f "${KEY_PATH}" -N ""
  chmod 600 "${KEY_PATH}"
else
  echo "✅ SSH key exists at ${KEY_PATH}, reusing."
fi

PUB_PATH="${KEY_PATH}.pub"
PUB_CONTENT="$(<"$PUB_PATH")"

# Extract parts: <type> <base64> [comment]
PUB_TYPE="$(awk '{print $1}' <<< "$PUB_CONTENT")"
PUB_B64="$(awk '{print $2}' <<< "$PUB_CONTENT")"

# Helpers
resolve_key_id_by_fingerprint() {
  local fp="$1"
  doctl compute ssh-key list --format ID,Fingerprint --no-header \
    | awk -v f="$fp" '$2==f {print $1}' | head -n1
}

resolve_key_id_by_public_key() {
  # Compare by the base64 middle part to avoid comment/name differences
  local b64="$1"
  # Some doctl versions support PublicKey column
  # Fallback: parse PublicKey to get the base64 part and compare
  doctl compute ssh-key list --format ID,PublicKey --no-header 2>/dev/null \
    | awk -v b="$b64" '{
        # Reconstruct base64 part from PublicKey column (which itself contains spaces)
        # Split line once: first token is ID, rest is the public key
        id=$1; $1=""; pk=substr($0,2);
        split(pk, a, " "); if (a[2]==b) { print id; exit }
      }' | head -n1
}

resolve_key_id_by_name() {
  local name="$1"
  doctl compute ssh-key list --format ID,Name --no-header \
    | awk -v n="$name" '$2==n {print $1}' | head -n1
}

# 2) Compute OpenSSH SHA256 fingerprint (same style doctl shows)
SSH_FINGERPRINT="$(ssh-keygen -lf "$PUB_PATH" | awk '{print $2}')"  # e.g., SHA256:xxxx

echo "🔑 Ensuring SSH key is registered with DigitalOcean..."
EXISTING_ID="$(resolve_key_id_by_fingerprint "$SSH_FINGERPRINT" || true)"

if [[ -z "${EXISTING_ID:-}" ]]; then
  # Try by public key material (covers renamed keys)
  EXISTING_ID="$(resolve_key_id_by_public_key "$PUB_B64" || true)"
fi

if [[ -z "${EXISTING_ID:-}" ]]; then
  # Try by name as a last resort
  EXISTING_ID="$(resolve_key_id_by_name "$KEY_NAME" || true)"
fi

if [[ -n "${EXISTING_ID:-}" ]]; then
  SSH_KEY_ID="$EXISTING_ID"
  echo "🔁 Key already exists on DO with ID $SSH_KEY_ID"
else
  echo "⬆️ Uploading key to DigitalOcean..."
  set +e
  CREATE_OUT="$(doctl compute ssh-key create "$KEY_NAME" --public-key "$PUB_CONTENT" --format ID --no-header 2>&1)"
  status=$?
  set -e

  if [[ $status -eq 0 ]]; then
    SSH_KEY_ID="$(printf '%s' "$CREATE_OUT" | tail -n1 | tr -d ' ')"
    echo "✅ Uploaded key. ID: $SSH_KEY_ID"
  else
    # If it's the "already in use" case, resolve by public key and reuse
    if grep -qi "already in use" <<< "$CREATE_OUT"; then
      SSH_KEY_ID="$(resolve_key_id_by_public_key "$PUB_B64" || true)"
      if [[ -z "${SSH_KEY_ID:-}" ]]; then
        # Fallback: try by fingerprint again
        SSH_KEY_ID="$(resolve_key_id_by_fingerprint "$SSH_FINGERPRINT" || true)"
      fi
      if [[ -n "${SSH_KEY_ID:-}" ]]; then
        echo "ℹ️ Key was already present. Reusing ID: $SSH_KEY_ID"
      else
        echo "❌ DO says key exists, but could not resolve its ID. Raw error:"
        echo "$CREATE_OUT"
        exit 1
      fi
    else
      echo "❌ Failed to create SSH key on DO:"
      echo "$CREATE_OUT"
      exit 1
    fi
  fi
fi

echo "export SSH_KEY_ID=$SSH_KEY_ID" > ./scripts/infra-setup/.cache_ssh_key_id