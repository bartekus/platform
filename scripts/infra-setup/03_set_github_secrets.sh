#!/usr/bin/env bash
set +H  # Disable history expansion (!)

set -euo pipefail
source ./scripts/infra-setup/env.sh
source ./scripts/infra-setup/.cache_droplet_ip

KEY_PATH="$HOME/.ssh/${KEY_NAME}"
export GH_REPO="$GITHUB_REPO"

echo "🔑 Setting GitHub secrets..."
gh secret set SSH_KEY --repo "$GH_REPO" --body "$(<"${KEY_PATH}")"
gh secret set HOST --repo "$GH_REPO" --body "$DROPLET_IP"
gh secret set USER --repo "$GH_REPO" --body "$SERVER_USER"
gh secret set ENV_FILE --repo "$GH_REPO" --body "$(<.env.prod)"
gh secret set PG_INIT_SCRIPT --repo "$GH_REPO" --body "$(<scripts/pg-init.sh)"
gh secret set LOGTO_CONFIG --repo "$GH_REPO" --body "$(<scripts/logto/config.js)"
gh secret set LOGTO_ENTRYPOINT --repo "$GH_REPO" --body "$(<scripts/logto/entrypoint.sh)"
gh secret set LOGTO_INDEX --repo "$GH_REPO" --body "$(<scripts/logto/index.js)"
gh secret set LOGTO_SETUP --repo "$GH_REPO" --body "$(<scripts/logto/setup.js)"
