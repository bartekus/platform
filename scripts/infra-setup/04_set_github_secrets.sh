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
  "scripts/db/pg-init.sh"
  "scripts/logto/config.js"
  "scripts/logto/entrypoint.sh"
  "scripts/logto/index.js"
  "scripts/logto/setup.js"
)
for f in "${req_files[@]}"; do
  [[ -f "$f" ]] || { echo "❌ Missing required file: $f"; exit 1; }
done

#echo "🔑 Setting GitHub repo VARIABLES (non-secrets)..."
gh variable set HOST --repo "$GH_REPO" --body "$DROPLET_IP"
gh variable set USER --repo "$GH_REPO" --body "$SERVER_USER"

if [[ -n "${DOMAIN:-}" ]]; then
  echo "🧭 Publishing domain config to GitHub VARIABLES..."
  gh variable set DOMAIN --repo "$GH_REPO" --body "$DOMAIN"
  [[ -n "${WEB_DOMAIN:-}" ]] && gh variable set WEB_DOMAIN --repo "$GH_REPO" --body "$WEB_DOMAIN"
  [[ -n "${API_DOMAIN:-}" ]] && gh variable set API_DOMAIN --repo "$GH_REPO" --body "$API_DOMAIN"
  [[ -n "${TRAEFIK_DASHBOARD_DOMAIN:-}" ]] && gh variable set TRAEFIK_DASHBOARD_DOMAIN --repo "$GH_REPO" --body "$TRAEFIK_DASHBOARD_DOMAIN"
  [[ -n "${DOZZLE_DOMAIN:-}" ]] && gh variable set DOZZLE_DOMAIN --repo "$GH_REPO" --body "$DOZZLE_DOMAIN"
  [[ -n "${LOGTO_DOMAIN:-}" ]] && gh variable set LOGTO_DOMAIN --repo "$GH_REPO" --body "$LOGTO_DOMAIN"
  [[ -n "${LOGTO_ADMIN_DOMAIN:-}" ]] && gh variable set LOGTO_ADMIN_DOMAIN --repo "$GH_REPO" --body "$LOGTO_ADMIN_DOMAIN"
fi

echo "🕵️  Setting GitHub repo SECRETS..."
gh secret set SSH_KEY --repo "$GH_REPO" --body "$(<"${KEY_PATH}")"
gh secret set ENV_FILE --repo "$GH_REPO" --body "$(<.env.prod)"
gh secret set PG_INIT_SCRIPT --repo "$GH_REPO" --body "$(<scripts/de/pg-init.sh)"
gh secret set LOGTO_CONFIG --repo "$GH_REPO" --body "$(<scripts/logto/config.js)"
gh secret set LOGTO_ENTRYPOINT --repo "$GH_REPO" --body "$(<scripts/logto/entrypoint.sh)"
gh secret set LOGTO_INDEX --repo "$GH_REPO" --body "$(<scripts/logto/index.js)"
gh secret set LOGTO_SETUP --repo "$GH_REPO" --body "$(<scripts/logto/setup.js)"



