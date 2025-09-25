#!/usr/bin/env bash
set -euo pipefail

# Runs once on first init. Requires POSTGRES_PASSWORD for the bootstrap superuser.
# Expects triplets in:
#   POSTGRES_MULTIPLE_DATABASES="user:password:db,user2:password2:db2"
# Optional operator (pgweb) account:
#   DB_ADMIN_USER=...
#   DB_ADMIN_PASSWORD=...         # 43-char base64url unpadded per your policy
#   DB_ADMIN_ACCESS="db1,db2"     # databases the operator should be able to access

if [[ -z "${POSTGRES_PASSWORD:-}" ]]; then
  echo "ERROR: POSTGRES_PASSWORD must be set." >&2
  exit 1
fi

PSQL_USER="${POSTGRES_USER:-postgres}"

psql_base=( psql -v ON_ERROR_STOP=1 -U "$PSQL_USER" -d postgres )

# --- helpers ----------------------------------------------------------------

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
    -- Ensure password is current (no-op if unchanged)
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
  # CREATE DATABASE must be outside a transaction.
  if ! "${psql_base[@]}" -tA -c "SELECT 1 FROM pg_database WHERE datname = '$db_lit'" | grep -q '^1$'; then
    "${psql_base[@]}" -c "CREATE DATABASE \"${db}\" OWNER \"${owner}\";"
  else
    "${psql_base[@]}" -c "ALTER DATABASE \"${db}\" OWNER TO \"${owner}\";"
  fi
}

grant_db_connect_to_role() {
  local db="$1" role="$2"
  local db_lit role_lit
  db_lit="$(esc_sql_lit "$db")"
  role_lit="$(esc_sql_lit "$role")"
  "${psql_base[@]}" -c "GRANT CONNECT ON DATABASE \"${db}\" TO \"${role}\";"
}

# Optional cluster-wide read access helper (Postgres 15+ has pg_read_all_data)
grant_read_all_data_to_role() {
  local role="$1"
  "${psql_base[@]}" -c "GRANT pg_read_all_data TO \"${role}\";" || true
}

# --- triplet processing -----------------------------------------------------

if [[ -z "${POSTGRES_MULTIPLE_DATABASES:-}" ]]; then
  echo "No additional databases requested."
else
  echo "Multiple database creation requested (triplets)."
  IFS=',' read -ra ENTRIES <<< "${POSTGRES_MULTIPLE_DATABASES}"
  for entry in "${ENTRIES[@]}"; do
    entry="$(echo "$entry" | xargs)"  # trim
    [[ -n "$entry" ]] || continue

    # Expect user:password:db
    IFS=':' read -r usr pw db <<< "$entry" || true
    if [[ -z "${usr:-}" || -z "${pw:-}" || -z "${db:-}" ]]; then
      echo "ERROR: Malformed entry in POSTGRES_MULTIPLE_DATABASES (need user:password:db): '$entry'" >&2
      exit 1
    fi

    # Create/ensure role and database
    ensure_role_with_password "$usr" "$pw"
    ensure_database_owned_by_role "$db" "$usr"
    echo "  Ensured role '$usr' and database '$db' (password set; not logged)."
  done
  echo "Multiple databases ensured."
fi

# --- operator (pgweb) account provisioning ---------------------------------

if [[ -n "${DB_ADMIN_USER:-}" && -n "${DB_ADMIN_PASSWORD:-}" ]]; then
  # Create operator role (no superuser)
  ensure_role_with_password "$DB_ADMIN_USER" "$DB_ADMIN_PASSWORD"

  # Optionally grant cluster-wide read access; comment out if you prefer per-DB grants only
  grant_read_all_data_to_role "$DB_ADMIN_USER" || true

  # Grant CONNECT on each db listed in DB_ADMIN_ACCESS (comma-separated)
  if [[ -n "${DB_ADMIN_ACCESS:-}" ]]; then
    IFS=',' read -ra ADMIN_DBS <<< "${DB_ADMIN_ACCESS}"
    for adb in "${ADMIN_DBS[@]}"; do
      adb="$(echo "$adb" | xargs)"
      [[ -n "$adb" ]] || continue
      grant_db_connect_to_role "$adb" "$DB_ADMIN_USER"
      # Optionally allow TEMP and CREATE (db-level)
      # "${psql_base[@]}" -c "GRANT TEMPORARY ON DATABASE \"${adb}\" TO \"${DB_ADMIN_USER}\";"
      # "${psql_base[@]}" -c "GRANT CREATE     ON DATABASE \"${adb}\" TO \"${DB_ADMIN_USER}\";"
    done
  fi

  echo "Operator role '${DB_ADMIN_USER}' ensured (password set; not logged)."
else
  echo "No operator (pgweb) account requested."
fi
