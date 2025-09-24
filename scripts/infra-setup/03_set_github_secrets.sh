#!/usr/bin/env bash
set +H  # Disable history expansion (!)
set -euo pipefail
source ./scripts/infra-setup/env.sh
source ./scripts/infra-setup/.cache_droplet_ip

KEY_PATH="$HOME/.ssh/${KEY_NAME}"
GH_REPO="$GITHUB_REPO"

# Validate files exist (adjust paths if you actually use custom-setup/)
req_files=(
  ".env.prod"
  "scripts/pg-init.sh"
  "scripts/logto/config.js"
  "scripts/logto/entrypoint.sh"
  "scripts/logto/index.js"
  "scripts/logto/setup.js"
)
for f in "${req_files[@]}"; do
  [[ -f "$f" ]] || { echo "❌ Missing required file: $f"; exit 1; }
done

#echo "🔑 Setting GitHub repo VARIABLES (non-secrets)..."
#gh variable set HOST --repo "$GH_REPO" --body "$DROPLET_IP"
#gh variable set USER --repo "$GH_REPO" --body "$SERVER_USER"

echo "🕵️  Setting GitHub repo SECRETS..."
gh secret set HOST --repo "$GH_REPO" --body "$DROPLET_IP"
gh secret set USER --repo "$GH_REPO" --body "$SERVER_USER"
gh secret set SSH_KEY --repo "$GH_REPO" --body "$(<"${KEY_PATH}")"
gh secret set ENV_FILE --repo "$GH_REPO" --body "$(<.env.prod)"
gh secret set PG_INIT_SCRIPT --repo "$GH_REPO" --body "$(<scripts/pg-init.sh)"
gh secret set LOGTO_CONFIG --repo "$GH_REPO" --body "$(<scripts/logto/config.js)"
gh secret set LOGTO_ENTRYPOINT --repo "$GH_REPO" --body "$(<scripts/logto/entrypoint.sh)"
gh secret set LOGTO_INDEX --repo "$GH_REPO" --body "$(<scripts/logto/index.js)"
gh secret set LOGTO_SETUP --repo "$GH_REPO" --body "$(<scripts/logto/setup.js)"



