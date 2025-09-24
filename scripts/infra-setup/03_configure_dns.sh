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

# Helpers
upsert_a_record() {
  local name="$1" ip="$2" ttl="${3:-60}"
  local id
  id=$(doctl compute domain records list "$DOMAIN" --format ID,Type,Name,Data --no-header \
    | awk -v n="$name" '$2=="A" && $3==n {print $1}' | head -n1)

  if [[ -n "$id" ]]; then
    # Update only if data changed
    local cur
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

upsert_cname_record() {
  local name="$1" target="$2" ttl="${3:-60}"
  # DO wants target as fqdn without scheme; trailing dot optional
  local id
  id=$(doctl compute domain records list "$DOMAIN" --format ID,Type,Name,Data --no-header \
    | awk -v n="$name" '$2=="CNAME" && $3==n {print $1}' | head -n1)

  if [[ -n "$id" ]]; then
    local cur
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

# Apex A (@) => DROPLET_IP
upsert_a_record "@" "$DROPLET_IP"

# Figure out labels for each service
apex="$DOMAIN"
apex_label="@"

to_label() {
  local fqdn="$1"
  if [[ "$fqdn" == "$apex" ]]; then
    echo "@"
  else
    # strip trailing .domain
    echo "${fqdn%.$DOMAIN}"
  fi
}

# Collect desired hostnames (skip empty)
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
    # Ensure apex already covered; optionally ensure WEB_DOMAIN=A if you prefer direct A
    upsert_a_record "@" "$DROPLET_IP"
  else
    # Prefer CNAME to apex to ease IP rotation
    upsert_cname_record "$label" "$apex"
  fi
done

echo "✅ DNS configuration complete for ${DOMAIN}."
