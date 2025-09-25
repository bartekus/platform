#!/usr/bin/env bash
set -euo pipefail

# Runs once on first init. Requires POSTGRES_PASSWORD for the bootstrap superuser.
# Expects triplets in:
#   POSTGRES_MULTIPLE_DATABASES="user:password:db,user2:password2:db2"
# Optional operator (pgweb) account:
#   DB_ADMIN_USER=...
#   DB_ADMIN_PASSWORD=...
#   DB_ADMIN_ACCESS="db1,db2"
# Required: specifies Logto DB name which is attached to triggers CREATEROLE for its logto-admin user
if [[ -z "${LOGTO_DB_NAME:-}" ]]; then
  echo "ERROR: LOGTO_DB_NAME must be set." >&2
  exit 1
fi

if [[ -z "${POSTGRES_PASSWORD:-}" ]]; then
  echo "ERROR: POSTGRES_PASSWORD must be set." >&2
  exit 1
fi

PSQL_USER="${POSTGRES_USER:-postgres}"
psql_base=( psql -v ON_ERROR_STOP=1 -U "$PSQL_USER" -d postgres )

esc_sql_lit() { printf "%s" "$1" | sed "s/'/''/g"; }

ensure_role_with_password() {
  local role="$1" pw="$2"
  local role_lit pw_lit
  role_lit="$(esc_sql_lit "$role")"
  pw_lit="$(esc_sql_lit "$pw")"
  "${psql_base[@]}" <<EOSQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$role_lit') THEN
    EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', '$role_lit', '$pw_lit');
  ELSE
    EXECUTE format('ALTER ROLE %I PASSWORD %L', '$role_lit', '$pw_lit');
  END IF;
END
\$\$;
EOSQL
}

ensure_database_owned_by_role() {
  local db="$1" owner="$2"
  local db_lit owner_lit
  db_lit="$(esc_sql_lit "$db")"
  owner_lit="$(esc_sql_lit "$owner")"
  if ! "${psql_base[@]}" -tA -c "SELECT 1 FROM pg_database WHERE datname = '$db_lit'" | grep -q '^1$'; then
    "${psql_base[@]}" -c "CREATE DATABASE \"${db}\" OWNER \"${owner}\";"
  else
    "${psql_base[@]}" -c "ALTER DATABASE \"${db}\" OWNER TO \"${owner}\";"
  fi
}

grant_db_connect_to_role() {
  local db="$1" role="$2"
  "${psql_base[@]}" -c "GRANT CONNECT ON DATABASE \"${db}\" TO \"${role}\";"
}

grant_read_all_data_to_role() {
  local role="$1"
  "${psql_base[@]}" -c "GRANT pg_read_all_data TO \"${role}\";" || true
}

# --- Triplets (user:password:db) ---
if [[ -z "${POSTGRES_MULTIPLE_DATABASES:-}" ]]; then
  echo "No additional databases requested."
else
  echo "Multiple database creation requested (triplets)."
  IFS=',' read -ra ENTRIES <<< "${POSTGRES_MULTIPLE_DATABASES}"
  for entry in "${ENTRIES[@]}"; do
    entry="$(echo "$entry" | xargs)"
    [[ -n "$entry" ]] || continue

    IFS=':' read -r usr pw db <<< "$entry" || true
    if [[ -z "${usr:-}" || -z "${pw:-}" || -z "${db:-}" ]]; then
      echo "ERROR: Malformed entry (need user:password:db): '$entry'" >&2
      exit 1
    fi

    ensure_role_with_password "$usr" "$pw"
    ensure_database_owned_by_role "$db" "$usr"

    # NEW: if this triplet's DB matches LOGTO_DB_NAME (default "logto"),
    # grant CREATEROLE to its user (e.g., "logto-admin").
    if [[ "$db" == "$LOGTO_DB_NAME" ]]; then
      "${psql_base[@]}" -c "ALTER ROLE \"${usr}\" CREATEROLE;"
      echo "  Granted CREATEROLE to '${usr}' (db='${db}')"
    fi

    echo "  Ensured role '${usr}' and database '${db}' (password set; not logged)"
  done
  echo "Multiple databases ensured."
fi

# --- Operator (pgweb) account (optional) ---
if [[ -n "${DB_ADMIN_USER:-}" && -n "${DB_ADMIN_PASSWORD:-}" ]]; then
  ensure_role_with_password "$DB_ADMIN_USER" "$DB_ADMIN_PASSWORD"
  grant_read_all_data_to_role "$DB_ADMIN_USER" || true
  if [[ -n "${DB_ADMIN_ACCESS:-}" ]]; then
    IFS=',' read -ra ADMIN_DBS <<< "${DB_ADMIN_ACCESS}"
    for adb in "${ADMIN_DBS[@]}"; do
      adb="$(echo "$adb" | xargs)"; [[ -n "$adb" ]] || continue
      grant_db_connect_to_role "$adb" "$DB_ADMIN_USER"
    done
  fi
  echo "Operator role '${DB_ADMIN_USER}' ensured (password set; not logged)."
else
  echo "No operator (pgweb) account requested."
fi
