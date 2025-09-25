#!/usr/bin/env bash
set -euo pipefail

# Runs only on first init of the data dir.
# Requires POSTGRES_PASSWORD (and optionally POSTGRES_USER/DB).
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

psql_base=( psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER:-postgres}" -d postgres )

create_user_and_database() {
  local db="$1"
  # Pass values as psql variables; psql expands :'var' before sending SQL
  "${psql_base[@]}" -v db="$db" -v pw="$POSTGRES_PASSWORD" <<'EOSQL'
DO $$
DECLARE
  dbname  text := :'db';
  passwd  text := :'pw';
BEGIN
  -- role
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = dbname) THEN
    EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', dbname, passwd);
    -- grant minimal extras as needed (avoid SUPERUSER by default)
    EXECUTE format('ALTER ROLE %I CREATEDB CREATEROLE', dbname);
  END IF;

  -- database
  IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = dbname) THEN
    EXECUTE format('CREATE DATABASE %I OWNER %I', dbname, dbname);
  ELSE
    EXECUTE format('ALTER DATABASE %I OWNER TO %I', dbname, dbname);
  END IF;
END
$$;
EOSQL
  echo "  Ensured user+database '${db}' exist"
}

IFS=',' read -ra DBS <<< "${POSTGRES_MULTIPLE_DATABASES}"
for db in "${DBS[@]}"; do
  db="$(echo "$db" | xargs)"   # trim
  [[ -n "$db" ]] || continue
  create_user_and_database "$db"
done

echo "Multiple databases ensured."

# Split on commas
IFS=',' read -ra DBS <<< "${POSTGRES_MULTIPLE_DATABASES}"
for db in "${DBS[@]}"; do
  db="$(echo "$db" | xargs)"   # trim
  [[ -n "$db" ]] || continue
  create_user_and_database "$db"
done

echo "Multiple databases ensured."