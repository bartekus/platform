#!/usr/bin/env bash
set -euo pipefail
source ./scripts/infra-setup/env.sh
source ./scripts/infra-setup/.cache_droplet_ip

if [[ -z "${DOMAIN:-}" ]]; then
  echo "ℹ️  DOMAIN not set; skipping DNS configuration."
  exit 0
fi

if [[ -z "${DROPLET_IP:-}" ]]; then
  echo "❌ DROPLET_IP not found. Run droplet creation first."
  exit 1
fi

echo "🌐 Ensuring DigitalOcean domain '${DOMAIN}' exists..."
if ! doctl compute domain get "$DOMAIN" >/dev/null 2>&1; then
  doctl compute domain create "$DOMAIN"
  echo "✅ Created domain ${DOMAIN}"
else
  echo "✅ Domain ${DOMAIN} already exists."
fi

# ── Helpers ───────────────────────────────────────────────────────────────────
upsert_a_record() {
  local name="$1" ip="$2" ttl="${3:-60}"
  local id cur
  id=$(doctl compute domain records list "$DOMAIN" --format ID,Type,Name,Data --no-header \
    | awk -v n="$name" '$2=="A" && $3==n {print $1}' | head -n1)
  if [[ -n "$id" ]]; then
    cur=$(doctl compute domain records get "$DOMAIN" "$id" --format Data --no-header | tr -d ' ')
    if [[ "$cur" != "$ip" ]]; then
      doctl compute domain records update "$DOMAIN" "$id" --record-data "$ip" --record-ttl "$ttl" >/dev/null
      echo "🔁 Updated A ${name} → ${ip}"
    else
      echo "✅ A ${name} already points to ${ip}"
    fi
  else
    doctl compute domain records create "$DOMAIN" --record-type A --record-name "$name" --record-data "$ip" --record-ttl "$ttl" >/dev/null
    echo "➕ Created A ${name} → ${ip}"
  fi
}

upsert_aaaa_record() {
  local name="$1" ip6="$2" ttl="${3:-60}"
  local id cur
  id=$(doctl compute domain records list "$DOMAIN" --format ID,Type,Name,Data --no-header \
    | awk -v n="$name" '$2=="AAAA" && $3==n {print $1}' | head -n1)
  if [[ -n "$id" ]]; then
    cur=$(doctl compute domain records get "$DOMAIN" "$id" --format Data --no-header | tr -d ' ')
    if [[ "$cur" != "$ip6" ]]; then
      doctl compute domain records update "$DOMAIN" "$id" --record-data "$ip6" --record-ttl "$ttl" >/dev/null
      echo "🔁 Updated AAAA ${name} → ${ip6}"
    else
      echo "✅ AAAA ${name} already points to ${ip6}"
    fi
  else
    doctl compute domain records create "$DOMAIN" --record-type AAAA --record-name "$name" --record-data "$ip6" --record-ttl "$ttl" >/dev/null
    echo "➕ Created AAAA ${name} → ${ip6}"
  fi
}

upsert_cname_record() {
  local name="$1" target="$2" ttl="${3:-60}"
  local id cur
  id=$(doctl compute domain records list "$DOMAIN" --format ID,Type,Name,Data --no-header \
    | awk -v n="$name" '$2=="CNAME" && $3==n {print $1}' | head -n1)
  if [[ -n "$id" ]]; then
    cur=$(doctl compute domain records get "$DOMAIN" "$id" --format Data --no-header | tr -d ' ')
    if [[ "$cur" != "$target" ]]; then
      doctl compute domain records update "$DOMAIN" "$id" --record-data "$target" --record-ttl "$ttl" >/dev/null
      echo "🔁 Updated CNAME ${name} → ${target}"
    else
      echo "✅ CNAME ${name} already points to ${target}"
    fi
  else
    doctl compute domain records create "$DOMAIN" --record-type CNAME --record-name "$name" --record-data "$target" --record-ttl "$ttl" >/dev/null
    echo "➕ Created CNAME ${name} → ${target}"
  fi
}

# ── Records ───────────────────────────────────────────────────────────────────
# Apex A/AAAA → server IPs
upsert_a_record "@" "$DROPLET_IP"
[[ -n "${DROPLET_IPV6:-}" && "$DROPLET_IPV6" != "::" ]] && upsert_aaaa_record "@" "$DROPLET_IPV6"

apex="$DOMAIN"
to_label() {
  local fqdn="$1"
  [[ "$fqdn" == "$apex" ]] && echo "@" || echo "${fqdn%.$DOMAIN}"
}

hosts=()
[[ -n "${WEB_DOMAIN:-}" ]] && hosts+=("$WEB_DOMAIN")
[[ -n "${API_DOMAIN:-}" ]] && hosts+=("$API_DOMAIN")
[[ -n "${TRAEFIK_DASHBOARD_DOMAIN:-}" ]] && hosts+=("$TRAEFIK_DASHBOARD_DOMAIN")
[[ -n "${DOZZLE_DOMAIN:-}" ]] && hosts+=("$DOZZLE_DOMAIN")
[[ -n "${LOGTO_DOMAIN:-}" ]] && hosts+=("$LOGTO_DOMAIN")
[[ -n "${LOGTO_ADMIN_DOMAIN:-}" ]] && hosts+=("$LOGTO_ADMIN_DOMAIN")

for h in "${hosts[@]}"; do
  label="$(to_label "$h")"
  if [[ "$label" == "@" ]]; then
    # already handled above
    continue
  fi

  # Default: CNAME sub → apex (inherits A/AAAA)
  upsert_cname_record "$label" "$apex"

  # OPTIONAL: direct A/AAAA for specific subs (uncomment if desired)
  # if [[ "$label" == "backend" || "$label" == "api" ]]; then
  #   upsert_a_record "$label" "$DROPLET_IP"
  #   [[ -n "${DROPLET_IPV6:-}" && "$DROPLET_IPV6" != "::" ]] && upsert_aaaa_record "$label" "$DROPLET_IPV6"
  # fi
done

echo "✅ DNS configuration complete for ${DOMAIN} (A and AAAA at apex)."