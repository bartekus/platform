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
# Common: list records as table (works across doctl versions)
list_records() {
  doctl compute domain records list "$DOMAIN" 2>/dev/null | tail -n +2
}

# Internal: create record with optional TTL (retry without TTL if unsupported)
create_record() {
  local type="$1" name="$2" data="$3" ttl="${4:-$DNS_DEFAULT_TTL}"
  if ! doctl compute domain records create "$DOMAIN" --record-type "$type" --record-name "$name" --record-data "$data" --record-ttl "$ttl" >/dev/null 2>&1; then
    doctl compute domain records create "$DOMAIN" --record-type "$type" --record-name "$name" --record-data "$data" >/dev/null
  fi
}

# A record
upsert_a_record() {
  local name="$1" ip="$2" ttl="${3:-$DNS_DEFAULT_TTL}"
  local line id cur
  line="$(list_records | awk -v n="$name" '$2=="A" && $3==n {print; exit}')"
  if [[ -n "$line" ]]; then
    id="$(awk '{print $1}' <<<"$line")"
    cur="$(awk '{print $4}' <<<"$line" | tr -d ' ')"
    if [[ "$cur" != "$ip" ]]; then
      if [[ "${DNS_SAFE_REPLACE}" -eq 1 ]]; then
        doctl compute domain records delete "$DOMAIN" "$id" --force >/dev/null
        create_record "A" "$name" "$ip" "$ttl"
        echo "🔁 Replaced A ${name} → ${ip}"
      else
        doctl compute domain records update "$DOMAIN" "$id" --record-data "$ip" --record-ttl "$ttl" >/dev/null
        echo "🔁 Updated A ${name} → ${ip}"
      fi
    else
      echo "✅ A ${name} already points to ${ip}"
    fi
  else
    create_record "A" "$name" "$ip" "$ttl"
    echo "➕ Created A ${name} → ${ip}"
  fi
}

# AAAA record
upsert_aaaa_record() {
  local name="$1" ip6="$2" ttl="${3:-$DNS_DEFAULT_TTL}"
  local line id cur
  line="$(list_records | awk -v n="$name" '$2=="AAAA" && $3==n {print; exit}')"
  if [[ -n "$line" ]]; then
    id="$(awk '{print $1}' <<<"$line")"
    cur="$(awk '{print $4}' <<<"$line" | tr -d ' ')"
    if [[ "$cur" != "$ip6" ]]; then
      if [[ "${DNS_SAFE_REPLACE}" -eq 1 ]]; then
        doctl compute domain records delete "$DOMAIN" "$id" --force >/dev/null
        create_record "AAAA" "$name" "$ip6" "$ttl"
        echo "🔁 Replaced AAAA ${name} → ${ip6}"
      else
        doctl compute domain records update "$DOMAIN" "$id" --record-data "$ip6" --record-ttl "$ttl" >/dev/null
        echo "🔁 Updated AAAA ${name} → ${ip6}"
      fi
    else
      echo "✅ AAAA ${name} already points to ${ip6}"
    fi
  else
    create_record "AAAA" "$name" "$ip6" "$ttl"
    echo "➕ Created AAAA ${name} → ${ip6}"
  fi
}

# CNAME record (target must be FQDN with trailing dot)
upsert_cname_record() {
  local name="$1" target="$2" ttl="${3:-$DNS_DEFAULT_TTL}"

  [[ "$target" == *"." ]] || target="${target}."
  local target_nodot="${target%.}"

  local line id cur
  line="$(list_records | awk -v n="$name" '$2=="CNAME" && $3==n {print; exit}')"
  if [[ -n "$line" ]]; then
    id="$(awk '{print $1}' <<<"$line")"
    cur="$(awk '{print $4}' <<<"$line" | tr -d ' ')"
    cur="${cur%.}"
    if [[ "$cur" != "$target_nodot" ]]; then
      if [[ "${DNS_SAFE_REPLACE}" -eq 1 ]]; then
        doctl compute domain records delete "$DOMAIN" "$id" --force >/dev/null
        create_record "CNAME" "$name" "$target" "$ttl"
        echo "🔁 Replaced CNAME ${name} → ${target}"
      else
        doctl compute domain records update "$DOMAIN" "$id" --record-data "$target" --record-ttl "$ttl" >/dev/null
        echo "🔁 Updated CNAME ${name} → ${target}"
      fi
    else
      echo "✅ CNAME ${name} already points to ${target}"
    fi
  else
    create_record "CNAME" "$name" "$target" "$ttl"
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

doctl compute domain records list "$DOMAIN"
dig +short A "$WEB_DOMAIN"
dig +short AAAA "$WEB_DOMAIN"
dig +short CNAME "$TRAEFIK_DASHBOARD_DOMAIN"

echo "✅ DNS configuration complete for ${DOMAIN} (A and AAAA at apex)."