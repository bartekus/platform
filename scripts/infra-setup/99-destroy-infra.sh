#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────────
# Destroys DigitalOcean resources, GitHub repo variables/secrets, and local
# SSH artifacts created by the companion infra-setup scripts.
#
# Defaults: conservative.
#   - DRY_RUN=1          : show what would be done (default)
#   - DELETE_DOMAIN=0    : remove only the records we created; do not delete domain
#   - DELETE_PROJECT=0   : do not delete the DO project
#   - FORCE=0            : require interactive confirmation if DRY_RUN=0
#
# Requires: doctl, gh, jq, dig (bind-tools), bash.
# Reads:    env.sh -> .env.digitalocean (+ optional .env.prod)
#
# Usage examples:
#   DRY_RUN=1 bash scripts/infra-setup/99-destroy-infra.sh
#   DRY_RUN=0 FORCE=1 bash scripts/infra-setup/99-destroy-infra.sh
#   DRY_RUN=0 FORCE=1 DELETE_DOMAIN=0 DELETE_PROJECT=1 bash scripts/infra-setup/99-destroy-infra.sh # <- Reverses all infra-setup work
#   DRY_RUN=0 FORCE=1 DELETE_DOMAIN=1 DELETE_PROJECT=1 bash scripts/infra-setup/99-destroy-infra.sh
# ──────────────────────────────────────────────────────────────────────────────

# --- Config flags (env-overridable) ---
DRY_RUN="${DRY_RUN:-1}"
DELETE_DOMAIN="${DELETE_DOMAIN:-0}"
DELETE_PROJECT="${DELETE_PROJECT:-0}"
FORCE="${FORCE:-0}"

# --- Load config (same as setup path) ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT_DIR"

# Reuse the same env loader to ensure we read identical inputs
# Will exit if .env.digitalocean is missing
# shellcheck disable=SC1091
source ./scripts/infra-setup/env.sh

# Optionally load caches if present
[[ -f ./scripts/infra-setup/.cache_droplet_ip ]] && source ./scripts/infra-setup/.cache_droplet_ip || true
[[ -f ./scripts/infra-setup/.cache_ssh_key_id ]] && source ./scripts/infra-setup/.cache_ssh_key_id || true
[[ -f ./scripts/infra-setup/.cache_project_id ]] && source ./scripts/infra-setup/.cache_project_id || true

# --- Helpers ---
say() { printf "%s\n" "$*"; }
doit() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "DRY-RUN: $*"
  else
    eval "$@"
  fi
}

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "❌ Missing required tool: $1"; exit 1; }
}

confirm() {
  [[ "$FORCE" -eq 1 || "$DRY_RUN" -eq 1 ]] && return 0
  read -r -p "Proceed with irreversible destroy? [y/N] " ans
  [[ "${ans:-}" =~ ^[Yy]$ ]]
}

need doctl
need gh
need jq

say "🧹 Destroying infra for repo=${GITHUB_REPO}, droplet=${DROPLET_NAME}, project=${DO_PROJECT_NAME}, domain=${DOMAIN:-<none>}"
[[ "$DRY_RUN" -eq 1 ]] && say "🔎 Running in DRY-RUN mode"
confirm || { echo "Cancelled."; exit 1; }

# ------------------------------------------------------------------------------
# 1) DigitalOcean droplet (and optional IPv6 cache clean)
# ------------------------------------------------------------------------------
say "💥 Deleting DigitalOcean droplet (by name): ${DROPLET_NAME}"
DROPLET_ID="$(doctl compute droplet list --format ID,Name --no-header | awk -v n="$DROPLET_NAME" '$2==n{print $1}' | head -n1 || true)"
if [[ -n "${DROPLET_ID:-}" ]]; then
  doit "doctl compute droplet delete ${DROPLET_ID} --force >/dev/null"
  say "✅ Droplet delete issued (ID=${DROPLET_ID})"
else
  say "ℹ️ Droplet not found; skipping."
fi

# ------------------------------------------------------------------------------
# 2) DigitalOcean DNS
#    - Default: remove only records this automation would have created:
#      apex A/AAAA -> DROPLET_IP/DROPLET_IPV6 (if matching), and subdomain CNAMEs to apex
#    - DELETE_DOMAIN=1: delete the whole zone (dangerous; only if this domain is dedicated)
# ------------------------------------------------------------------------------
if [[ -n "${DOMAIN:-}" ]] && doctl compute domain get "$DOMAIN" >/dev/null 2>&1; then
  if [[ "$DELETE_DOMAIN" -eq 1 ]]; then
    say "🌐 Deleting entire DNS zone: ${DOMAIN}"
    doit "doctl compute domain delete \"$DOMAIN\" --force >/dev/null"
    say "✅ Domain deleted."
  else
    say "🧽 Cleaning DNS records created by automation in zone: ${DOMAIN}"

    # Pull records once
    recs="$(doctl compute domain records list "$DOMAIN" --no-header 2>/dev/null || true)"

    # Helper to extract record id(s) by a small predicate
    del_ids() {
      awk -v name="$1" -v type="$2" -v data="$3" '
        $2==type && $3==name && (data=="" || $4==data) { print $1 }
      ' <<<"$recs"
    }

    # 2a) Apex A/AAAA pointing at our droplet IPs (only if they match the cached IPs)
    if [[ -n "${DROPLET_IP:-}" ]]; then
      ids="$(del_ids "@" "A" "$DROPLET_IP")"
      if [[ -n "$ids" ]]; then
        say " - Removing apex A @ -> ${DROPLET_IP}"
        for id in $ids; do doit "doctl compute domain records delete \"$DOMAIN\" \"$id\" --force >/dev/null"; done
      fi
    fi
    if [[ -n "${DROPLET_IPV6:-}" ]]; then
      ids="$(del_ids "@" "AAAA" "$DROPLET_IPV6")"
      if [[ -n "$ids" ]]; then
        say " - Removing apex AAAA @ -> ${DROPLET_IPV6}"
        for id in $ids; do doit "doctl compute domain records delete \"$DOMAIN\" \"$id\" --force >/dev/null"; done
      fi
    fi

    # 2b) Subdomain CNAMEs → apex for the known host set
    sub_hosts=()
    [[ -n "${WEB_DOMAIN:-}" ]] && sub_hosts+=("$WEB_DOMAIN")
    [[ -n "${API_DOMAIN:-}" ]] && sub_hosts+=("$API_DOMAIN")
    [[ -n "${TRAEFIK_DOMAIN:-}" ]] && sub_hosts+=("$TRAEFIK_DOMAIN")
    [[ -n "${DOZZLE_DOMAIN:-}" ]] && sub_hosts+=("$DOZZLE_DOMAIN")
    [[ -n "${LOGTO_DOMAIN:-}" ]] && sub_hosts+=("$LOGTO_DOMAIN")
    [[ -n "${LOGTO_ADMIN_DOMAIN:-}" ]] && sub_hosts+=("$LOGTO_ADMIN_DOMAIN")
    [[ -n "${PGWEB_DOMAIN:-}" ]] && sub_hosts+=("$PGWEB_DOMAIN")

    apex="$DOMAIN"
    to_label() { [[ "$1" == "$apex" ]] && echo "@" || echo "${1%.$apex}"; }

    for h in "${sub_hosts[@]}"; do
      lbl="$(to_label "$h")"
      # delete CNAME lbl -> apex
      # NB: doctl output shows target without trailing dot; we match on name+type only
      ids="$(awk -v l="$lbl" '$2=="CNAME" && $3==l {print $1}' <<<"$recs")"
      if [[ -n "$ids" ]]; then
        say " - Removing CNAME ${lbl} -> ${apex}"
        for id in $ids; do doit "doctl compute domain records delete \"$DOMAIN\" \"$id\" --force >/dev/null"; done
      fi
    done

    say "✅ DNS record cleanup complete."
  fi
else
  say "ℹ️ Domain not set or not present in DO; skipping DNS."
fi

# ------------------------------------------------------------------------------
# 3) DigitalOcean SSH key (the one we may have created)
# ------------------------------------------------------------------------------
if [[ -n "${SSH_KEY_ID:-}" ]]; then
  say "🔑 Deleting DO SSH key ID=${SSH_KEY_ID}"
  # Double-check it points to our KEY_NAME
  key_line="$(doctl compute ssh-key list --format ID,Name --no-header | awk -v id="$SSH_KEY_ID" '$1==id{print $0}')"
  if [[ -n "$key_line" ]]; then
    doit "doctl compute ssh-key delete \"$SSH_KEY_ID\" --force >/dev/null"
    say "✅ DO SSH key deleted."
  else
    say "ℹ️ DO SSH key ID not found; skipping."
  fi
else
  say "ℹ️ No cached SSH_KEY_ID; skipping DO SSH key delete."
fi

# ------------------------------------------------------------------------------
# 4) (Optional) DigitalOcean Project delete
# ------------------------------------------------------------------------------
if [[ "$DELETE_PROJECT" -eq 1 ]]; then
  say "📁 Attempting to delete DO project: ${DO_PROJECT_NAME}"
  PID="$(doctl projects list --format ID,Name --no-header | awk -v n="$DO_PROJECT_NAME" '$2==n{print $1}' | head -n1 || true)"
  if [[ -n "${PID:-}" ]]; then
    # Ensure no resources attached (DO requires this)
    res_ct="$(doctl projects resources list "$PID" --format URN --no-header 2>/dev/null | wc -l | tr -d ' ')"
    if [[ "$res_ct" -eq 0 ]]; then
      doit "doctl projects delete \"$PID\" --force >/dev/null"
      say "✅ Project deleted."
    else
      say "⚠️ Project still has $res_ct resources; not deleting."
    fi
  else
    say "ℹ️ Project not found; skipping."
  fi
else
  say "ℹ️ DELETE_PROJECT=0; skipping project deletion."
fi

# ------------------------------------------------------------------------------
# 5) GitHub repo variables & secrets we set
# ------------------------------------------------------------------------------
say "🗑️  Removing GitHub repo VARIABLES from ${GITHUB_REPO}"
# Variables
vars=( HOST USER DOMAIN WEB_DOMAIN API_DOMAIN TRAEFIK_DOMAIN DOZZLE_DOMAIN LOGTO_DOMAIN LOGTO_ADMIN_DOMAIN PGWEB_DOMAIN )
for v in "${vars[@]}"; do
  doit "gh variable delete \"$v\" --repo \"$GITHUB_REPO\" >/dev/null 2>&1 || true"
done
say "🗑️  Removing GitHub repo SECRETS from ${GITHUB_REPO}"
secrets=( SSH_KEY ENV_FILE PG_INIT_SCRIPT LOGTO_CONFIG LOGTO_ENTRYPOINT LOGTO_INDEX LOGTO_SETUP )
for s in "${secrets[@]}"; do
  doit "gh secret delete \"$s\" --repo \"$GITHUB_REPO\" >/dev/null 2>&1 || true"
done
say "✅ GitHub cleanup complete."

# ------------------------------------------------------------------------------
# 6) Local artifacts: SSH keys, caches, known_hosts
# ------------------------------------------------------------------------------
say "🧹 Cleaning local SSH keys & caches"
KEY_PATH="$HOME/.ssh/${KEY_NAME}"
if [[ -f "${KEY_PATH}" || -f "${KEY_PATH}.pub" ]]; then
  say " - Removing ${KEY_PATH}{,.pub}"
  doit "rm -f \"${KEY_PATH}\" \"${KEY_PATH}.pub\""
else
  say " - SSH keypair not found at ${KEY_PATH}{,.pub}; skipping."
fi

# Remove known_hosts entries for the droplet IP(s) and domains we touched
kn="$HOME/.ssh/known_hosts"
strip_host() {
  local host="$1"
  [[ -f "$kn" ]] || return 0
  # remove both hashed and plain matches
  doit "ssh-keygen -R \"$host\" >/dev/null 2>&1 || true"
}
[[ -n "${DROPLET_IP:-}"    ]] && strip_host "$DROPLET_IP"
[[ -n "${DROPLET_IPV6:-}"  ]] && strip_host "[$DROPLET_IPV6]"
for h in "${vars[@]}"; do :; done
# domains we might have SSH'd to (usually not, but safe)
hosts=()
[[ -n "${WEB_DOMAIN:-}" ]] && hosts+=("$WEB_DOMAIN")
[[ -n "${API_DOMAIN:-}" ]] && hosts+=("$API_DOMAIN")
[[ -n "${TRAEFIK_DOMAIN:-}" ]] && hosts+=("$TRAEFIK_DOMAIN")
[[ -n "${DOZZLE_DOMAIN:-}" ]] && hosts+=("$DOZZLE_DOMAIN")
[[ -n "${LOGTO_DOMAIN:-}" ]] && hosts+=("$LOGTO_DOMAIN")
[[ -n "${LOGTO_ADMIN_DOMAIN:-}" ]] && hosts+=("$LOGTO_ADMIN_DOMAIN")
[[ -n "${PGWEB_DOMAIN:-}" ]] && hosts+=("$PGWEB_DOMAIN")
for h in "${hosts[@]}"; do strip_host "$h"; done

# Remove caches
doit "rm -f ./scripts/infra-setup/.cache_droplet_ip ./scripts/infra-setup/.cache_ssh_key_id ./scripts/infra-setup/.cache_project_id"

say "✅ Destroy complete."