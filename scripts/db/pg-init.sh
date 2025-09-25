#!/usr/bin/env bash
set -euo pipefail

# Runs once on first init. Requires POSTGRES_PASSWORD.
# Optional: POSTGRES_MULTIPLE_DATABASES="logto,app"

if [[ -z "${POSTGRES_PASSWORD:-}" ]]; then
  echo "ERROR: POSTGRES_PASSWORD must be set." >&2
  exit 1
fi

if [[ -z "${POSTGRES_MULTIPLE_DATABASES:-}" ]]; then
  echo "No additional databases requested."
  exit 0
fi

echo "Multiple database creation requested: ${POSTGRES_MULTIPLE_DATABASES}"

PSQL_USER="${POSTGRES_USER:-postgres}"
psql_base=( psql -v ON_ERROR_STOP=1 -U "$PSQL_USER" -d postgres )

ensure_role() {
  local role_raw="$1"
  local role_lit pw_lit
  role_lit="$(printf "%s" "$role_raw" | sed "s/'/''/g")"
  pw_lit="$(printf "%s" "$POSTGRES_PASSWORD" | sed "s/'/''/g")"

  # OK inside DO (transactional)
  "${psql_base[@]}" <<EOSQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$role_lit') THEN
    EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', '$role_lit', '$pw_lit');
    -- Grant only what you need (drop if unnecessary):
    EXECUTE format('ALTER ROLE %I CREATEDB CREATEROLE', '$role_lit');
  END IF;
END
\$\$;
EOSQL
}

ensure_database() {
  local db_raw="$1"
  local db_lit
  db_lit="$(printf "%s" "$db_raw" | sed "s/'/''/g")"

  # Must run OUTSIDE a txn. Two safe patterns:

  # A) Shell check + plain CREATE (simple & clear)
  if ! "${psql_base[@]}" -tA -c "SELECT 1 FROM pg_database WHERE datname = '$db_lit'" | grep -q '^1$'; then
    "${psql_base[@]}" -c "CREATE DATABASE \"${db_raw}\" OWNER \"${db_raw}\";"
  else
    "${psql_base[@]}" -c "ALTER DATABASE \"${db_raw}\" OWNER TO \"${db_raw}\";"
  fi

  # B) Alternatively (single call) using \gexec:
  # "${psql_base[@]}" <<EOSQL
  # SELECT format('CREATE DATABASE %I OWNER %I', '$db_lit', '$db_lit')
  # WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '$db_lit')\gexec
  # EOSQL
}

IFS=',' read -ra DBS <<< "${POSTGRES_MULTIPLE_DATABASES}"
for db in "${DBS[@]}"; do
  db="$(echo "$db" | xargs)"   # trim
  [[ -n "$db" ]] || continue

  ensure_role "$db"
  ensure_database "$db"
  echo "  Ensured user+database '$db' exist"
done

echo "Multiple databases ensured."