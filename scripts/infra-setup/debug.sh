#!/usr/bin/env bash
set -euo pipefail
source ./scripts/infra-setup/env.sh

echo "🔍 Checking DigitalOcean authentication..."
doctl account get || (echo "❌ DOCTL auth failed. Run: doctl auth init" && exit 1)

echo "🔍 Active DO context:"
doctl auth list

echo "🔍 Checking GitHub CLI authentication..."
gh auth status || (echo "❌ GitHub CLI auth failed. Run: gh auth login" && exit 1)

echo "🔍 Verifying DO Project presence..."
if doctl projects list --format Name --no-header | grep -qx "$DO_PROJECT_NAME"; then
  echo "✅ Project '$DO_PROJECT_NAME' exists."
else
  echo "⚠️  Project '$DO_PROJECT_NAME' not found (will be created in 00_project_setup.sh)."
fi

echo "🔍 Verifying DO Image slug '${IMAGE}'..."
if ! doctl compute image list-distribution --format Slug --no-header | awk '{print $1}' | grep -qx "$IMAGE"; then
  echo "⚠️  Image slug '$IMAGE' not found among public distribution images."
  echo "   Here are a few common Ubuntu LTS slugs you can use:"
  doctl compute image list-distribution --format Slug,Name --no-header | grep -E '^ubuntu-(20|22|24)-04-x64' | sort -r
  echo "   Set IMAGE=ubuntu-24-04-x64 in .env.digitalocean (recommended)."
fi

command -v jq >/dev/null || { echo "❌ 'jq' not found. Install jq."; exit 1; }
command -v dig >/dev/null || echo "ℹ️ 'dig' not found; healthcheck will skip DNS."

# ──────────────────────────────────────────────────────────────────────────────
# NS Delegation Gate (only when DOMAIN is set and we're using DO DNS)
# Registrar-first via WHOIS, with parent/TLD fallback. Recursive resolvers are FYI.
# ──────────────────────────────────────────────────────────────────────────────
if [[ -n "${DOMAIN:-}" && "${DNS_PROVIDER:-do}" == "do" && "${SKIP_NS_CHECK:-0}" -ne 1 ]]; then
  echo "🔍 Verifying registrar delegation for domain: ${DOMAIN} (expect DigitalOcean)"

  command -v whois >/dev/null || { echo "❌ 'whois' not found. Install it (macOS has it; Linux: apt/yum/apk) and rerun."; exit 1; }

  # Required DO NS (implicit)
  required_ns=(ns1.digitalocean.com ns2.digitalocean.com ns3.digitalocean.com)

  normalize_lines() {  # lower, strip CR & trailing dot/space, dedupe & sort
    tr -d '\r' \
    | sed 's/[[:space:]]\+$//' \
    | sed 's/\.$//' \
    | tr '[:upper:]' '[:lower:]' \
    | awk 'NF' \
    | sort -u
  }

  sets_equal() {
    # args: listA... ::SEP:: listB...
    local sep_seen=0; local -a A=(); local -a B=()
    while read -r line; do
      [[ "$line" == "::SEP::" ]] && { sep_seen=1; continue; }
      if [[ $sep_seen -eq 0 ]]; then A+=("$line"); else B+=("$line"); fi
    done < <(printf '%s\n' "$@")
    # compare lengths
    [[ ${#A[@]} -eq ${#B[@]} ]] || return 1
    # for each in A must be in B
    for a in "${A[@]}"; do printf '%s\n' "${B[@]}" | grep -qx "$a" || return 1; done
    return 0
  }

  # --- Step 1: WHOIS (registrar view = source of truth) ---
  whois_ns_raw="$(
    whois "$DOMAIN" 2>/dev/null \
      | awk 'BEGIN{IGNORECASE=1} /^Name Server[[:space:]]*:/ {print $0}' \
      | awk -F: '{gsub(/^[ \t]+|[ \t]+$/,"",$2); print $2}'
  )"
  whois_ns="$(printf '%s\n' "$whois_ns_raw" | normalize_lines)"
  mapfile -t observed_whois <<<"$whois_ns"

  if [[ ${#observed_whois[@]} -gt 0 ]]; then
    # Compare registrar set to required DO set
    if sets_equal "$(printf '%s\n' "${observed_whois[@]}")" "::SEP::" "$(printf '%s\n' "${required_ns[@]}")"; then
      echo "✅ Registrar delegation OK: ${DOMAIN} → ns1/ns2/ns3.digitalocean.com"
    else
      echo "❌ Nameserver delegation mismatch for ${DOMAIN}"
      echo "   Registrar reports (deduped):"
      printf '   - %s\n' "${observed_whois[@]}"
      echo "   Required (DigitalOcean):"
      printf '   - %s\n' "${required_ns[@]}"
      echo "👉 Update your registrar’s nameservers for ${DOMAIN} to the above, then rerun."
      echo "   (Override with SKIP_NS_CHECK=1 only if you truly know what you’re doing.)"
      exit 1
    fi
  else
    # --- Step 2: Parent/TLD fallback (handles whois gaps/rate limits) ---
    command -v dig >/dev/null || { echo "❌ WHOIS ambiguous and 'dig' not found for TLD fallback. Install bind-utils/dnsutils and rerun."; exit 1; }
    tld="${DOMAIN##*.}."
    tld_ns="$(dig +short NS "$tld" @a.root-servers.net 2>/dev/null | head -n1)"
    if [[ -z "$tld_ns" ]]; then
      echo "❌ Could not query TLD NS for .${tld%.}; please retry later."
      exit 1
    fi
    parent_ns_raw="$(dig +short NS "$DOMAIN" @"$tld_ns" 2>/dev/null)"
    parent_ns="$(printf '%s\n' "$parent_ns_raw" | normalize_lines)"
    mapfile -t observed_parent <<<"$parent_ns"

    if [[ ${#observed_parent[@]} -gt 0 ]] && \
       sets_equal "$(printf '%s\n' "${observed_parent[@]}")" "::SEP::" "$(printf '%s\n' "${required_ns[@]}")"
    then
      echo "ℹ️ WHOIS ambiguous/rate-limited; TLD confirms DO delegation."
      echo "✅ Delegation OK: ${DOMAIN} → ns1/ns2/ns3.digitalocean.com"
    else
      echo "❌ Could not confirm DO delegation for ${DOMAIN} from registrar/TLD."
      if [[ ${#observed_parent[@]} -gt 0 ]]; then
        echo "   Parent (TLD) reports:"
        printf '   - %s\n' "${observed_parent[@]}"
      else
        echo "   Parent (TLD) had no usable NS for the domain."
      fi
      echo "   Required (DigitalOcean):"
      printf '   - %s\n' "${required_ns[@]}"
      echo "👉 Set your registrar’s nameservers for ${DOMAIN} to the above, then rerun."
      exit 1
    fi
  fi

  # (Optional) FYI only: what public recursive resolvers currently see (do NOT block on this)
  if command -v dig >/dev/null; then
    rec_ns="$( (dig +short NS "$DOMAIN" @1.1.1.1; dig +short NS "$DOMAIN" @8.8.8.8) 2>/dev/null | normalize_lines )"
    if [[ -n "$rec_ns" ]]; then
      echo "ℹ️ Public resolvers currently see:"
      printf '   - %s\n' $rec_ns
    fi
  fi

else
  if [[ -z "${DOMAIN:-}" ]]; then
    echo "ℹ️ DOMAIN not set; skipping NS delegation verification."
  elif [[ "${SKIP_NS_CHECK:-0}" -eq 1 ]]; then
    echo "⚠️ SKIP_NS_CHECK=1 → skipping nameserver verification (not recommended)."
  else
    echo "ℹ️ DNS_PROVIDER=${DNS_PROVIDER:-do} → skipping provider-specific NS gate."
  fi
fi

echo "✅ All authentication checks passed."