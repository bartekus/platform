#!/usr/bin/env bash
set -euo pipefail
source ./scripts/infra-setup/env.sh
source ./scripts/infra-setup/.cache_droplet_ip || true

# Collect hostnames
hosts=()
[[ -n "${WEB_DOMAIN:-}" ]] && hosts+=("$WEB_DOMAIN")
[[ -n "${API_DOMAIN:-}" ]] && hosts+=("$API_DOMAIN")
[[ -n "${TRAEFIK_DASHBOARD_DOMAIN:-}" ]] && hosts+=("$TRAEFIK_DASHBOARD_DOMAIN")
[[ -n "${DOZZLE_DOMAIN:-}" ]] && hosts+=("$DOZZLE_DOMAIN")
[[ -n "${LOGTO_DOMAIN:-}" ]] && hosts+=("$LOGTO_DOMAIN")
[[ -n "${LOGTO_ADMIN_DOMAIN:-}" ]] && hosts+=("$LOGTO_ADMIN_DOMAIN")

if [[ ${#hosts[@]} -eq 0 ]]; then
  echo "ℹ️  No hostnames configured; skipping healthcheck."
  exit 0
fi

# requires: dig (bind tools) and curl
command -v dig >/dev/null || { echo "❌ 'dig' not found. Install bind utils."; exit 1; }
command -v curl >/dev/null || { echo "❌ 'curl' not found."; exit 1; }

resolve_dns() {
  local name="$1"
  echo "🔎 DNS for ${name}:"
  local a_records aaaa_records
  a_records=$(dig +short A "$name" || true)
  aaaa_records=$(dig +short AAAA "$name" || true)
  [[ -n "$a_records" ]] && echo "  A:    $a_records" || echo "  A:    (none)"
  [[ -n "$aaaa_records" ]] && echo "  AAAA: $aaaa_records" || echo "  AAAA: (none)"
}

wait_https() {
  local url="$1"
  local family_flag="${2:-}"   # "" (auto), "-4", or "-6"
  local max_attempts=30
  local delay=3

  for ((i=1; i<=max_attempts; i++)); do
    if curl -sS -I $family_flag --max-time 10 --fail "$url" >/dev/null 2>&1; then
      echo "✅ OK: $url ($family_flag)"
      return 0
    fi
    echo "⏳ ($i/$max_attempts) waiting for $url ..."
    sleep "$delay"
  done
  echo "❌ Timeout waiting for $url"
  return 1
}

overall=0
for host in "${hosts[@]}"; do
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔧 Health check: https://${host}"
  resolve_dns "$host"

  # Try HTTPS over either, then specifically v4 and v6 where available
  wait_https "https://${host}" || overall=1

  # If you want explicit tests:
  # IPv4 only
  if dig +short A "$host" >/dev/null | grep -qE '^[0-9]+\.'; then
    wait_https "https://${host}" -4 || overall=1
  fi
  # IPv6 only
  if dig +short AAAA "$host" >/dev/null | grep -q ':'; then
    wait_https "https://${host}" -6 || overall=1
  fi
done

if [[ $overall -eq 0 ]]; then
  echo ""
  echo "🎉 All health checks passed."
else
  echo ""
  echo "⚠️  One or more health checks failed."
fi

exit $overall