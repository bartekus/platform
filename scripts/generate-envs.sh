#!/usr/bin/env bash
set -euo pipefail

# Requirements: bash, openssl, envsubst (your local-setup provides them)
# Usage:
#   scripts/generate-envs.sh
# Inputs:
#   ./.env.sample
# Outputs:
#   ./.env.local
#   ./.env.prod

SAMPLE_FILE="${SAMPLE_FILE:-.env.sample}"
OUT_LOCAL="${OUT_LOCAL:-.env.local}"
OUT_PROD="${OUT_PROD:-.env.prod}"

# --- generators --------------------------------------------------------------

gen_base64url_43() {
  # 32 random bytes -> base64 (44 chars incl '=' padding) -> strip '=' -> URL-safe
  local s
  s="$(openssl rand -base64 32 | tr -d '\n=' | tr '+/' '-_')"
  # sanity: 43 chars, allowed alphabet only
  if [[ ${#s} -ne 43 ]] || [[ ! "$s" =~ ^[A-Za-z0-9_-]{43}$ ]]; then
    echo "generator produced invalid base64url secret" >&2
    exit 1
  fi
  printf '%s\n' "$s"
}

gen_id_20() {
  LC_ALL=C tr -dc 'a-z0-9' < /dev/urandom | head -c 20
  printf '\n'
}

gen_secret_32() {
  LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 32
  printf '\n'
}

# --- helpers ----------------------------------------------------------------

# Trim leading/trailing spaces
trim() { awk '{$1=$1; print}' <<<"$*"; }

# Extract KEY and VALUE from a line like KEY=VALUE (keeps VALUE as-is, quotes if present)
parse_kv() {
  local line="$1"
  # ignore comments/blank
  [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && return 1
  # must contain '=' and KEY starts with [A-Z_]
  if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
    printf '%s\034%s\n' "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}"
    return 0
  fi
  return 1
}

# Replace placeholders on a single line; prints the new line and (if a KV) exports KEY into env
process_line() {
  local line="$1"
  # passthrough comments / blanks
  if [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]]; then
    printf '%s\n' "$line"
    return 0
  fi

  if kv="$(parse_kv "$line")"; then
    local key="${kv%%$'\034'*}"
    local raw="${kv#*$'\034'}"
    local val="$(trim "$raw")"

    # Only replace when RHS is exactly a placeholder token
    case "$val" in
      '<generate-base64url-password>'|\"\<generate-base64url-password\>\")
        val="$(gen_base64url_43)";;
      '<generate-id>'|\"\<generate-id\>\")
        val="$(gen_id_20)";;
      '<generate-secret>'|\"\<generate-secret\>\")
        val="$(gen_secret_32)";;
      *)
        # keep as-is
        ;;
    esac

    # Recompose without adding quotes (preserve sample’s original quoting style)
    # Also export into current shell for envsubst later (strip surrounding quotes if present)
    local export_val="$val"
    if [[ "$export_val" =~ ^\".*\"$ ]]; then
      export_val="${export_val:1:${#export_val}-2}"
    fi
    # Export into environment for later envsubst
    export "$key=$export_val" || true

    printf '%s=%s\n' "$key" "$val"
  else
    # Not a simple KEY=VALUE line; passthrough
    printf '%s\n' "$line"
  fi
}

# Expand ${VARS} found in content using current environment via envsubst
expand_with_envsubst() {
  local infile="$1" outfile="$2"
  # Build the variable allowlist from the file content
  local varlist
  # shellcheck disable=SC2002
#  varlist="$(cat "$infile" | grep -o '\${[A-Za-z0-9_]\+}' | tr -d '${}' | sort -u | sed 's/^/\$/')" || true
  varlist="$(
    cat "$infile" \
    | grep -o '\${[A-Za-z0-9_]\+}' \
    | tr -d '${}' \
    | sort -u \
    | sed 's/^/\$/' \
    | grep -v '^\$DOMAIN$' \
    | grep -v '^\$POSTGRES_LOGTO_USER$' \
    | grep -v '^\$POSTGRES_LOGTO_PASSWORD$' \
    | grep -v '^\$POSTGRES_LOGTO_DB$' \
    | grep -v '^\$POSTGRES_API_USER$' \
    | grep -v '^\$POSTGRES_API_PASSWORD$' \
    | grep -v '^\$POSTGRES_API_DB$' \
    || true
  )"
  if [[ -z "$varlist" ]]; then
    # No vars to expand; just copy
    cp "$infile" "$outfile"
  else
    # Use envsubst with allowlist to avoid accidental $2y in bcrypt etc.
    envsubst "$varlist" < "$infile" > "$outfile"
  fi
}

# Apply production overrides (in-place on a temp file)
apply_prod_overrides() {
  local infile="$1"
  local tmp="$infile.tmp.$$"
  awk '
    BEGIN {
      OFS="";
    }
    function set(k,v) {
      print k"="v
    }
    # simple kv detection
    /^[[:space:]]*#/ { print; next }
    /^[[:space:]]*$/ { print; next }
    /^[A-Za-z_][A-Za-z0-9_]*=/ {
      split($0,a,"=")
      k=a[1]
      v=substr($0, length(k)+2)
      if (k=="ENVIRONMENT") { print "ENVIRONMENT=production"; next }
      if (k=="USE_SSL")     { print "USE_SSL=true"; next }
      if (k=="DOMAIN")      { print "DOMAIN=deployd.xyz"; next }
    }
    { print }
  ' "$infile" > "$tmp"
  mv "$tmp" "$infile"
  # set these into env for envsubst stage
  export ENVIRONMENT="production"
  export USE_SSL="true"
  export DOMAIN="deployd.xyz"
}

# --- main -------------------------------------------------------------------

[[ -f "$SAMPLE_FILE" ]] || { echo "Missing $SAMPLE_FILE" >&2; exit 1; }

# Stage LOCAL: replace placeholders and capture exports
stage_local="$(mktemp -t env.local.stage.XXXXXX)"
trap 'rm -f "$stage_local" "$stage_prod" "$out_tmp_local" "$out_tmp_prod"' EXIT

# Read sample line-by-line to preserve formatting
while IFS= read -r line || [[ -n "$line" ]]; do
  process_line "$line"
done < "$SAMPLE_FILE" > "$stage_local"

# Copy stage for PROD and apply overrides
stage_prod="$(mktemp -t env.prod.stage.XXXXXX)"
cp "$stage_local" "$stage_prod"
apply_prod_overrides "$stage_prod"

# Expand ${VAR} references via envsubst into final files
out_tmp_local="$(mktemp -t env.local.out.XXXXXX)"
out_tmp_prod="$(mktemp -t env.prod.out.XXXXXX)"

expand_with_envsubst "$stage_local" "$out_tmp_local"
expand_with_envsubst "$stage_prod"  "$out_tmp_prod"

# Atomic write + secure perms
mv "$out_tmp_local" "$OUT_LOCAL"
mv "$out_tmp_prod"  "$OUT_PROD"
chmod 600 "$OUT_LOCAL" "$OUT_PROD"

# Summary (non-secret)
echo "Generated: $OUT_LOCAL, $OUT_PROD"
echo "  - Placeholders filled: <generate-base64url-password>, <generate-id>, <generate-secret>"
echo "  - Production overrides: ENVIRONMENT=production, USE_SSL=true, DOMAIN=deployd.xyz"
echo "  - Base64URL policy: 43 chars, unpadded, alphabet [A-Za-z0-9_-]"
