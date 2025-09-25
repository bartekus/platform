#!/usr/bin/env bash
set -euo pipefail

# This script is executed by the official postgres image during first init *only*,
# with $POSTGRES_USER and $POSTGRES_PASSWORD available.

# Expect POSTGRES_MULTIPLE_DATABASES as a comma-separated list, e.g.:
#   POSTGRES_MULTIPLE_DATABASES="app,analytics,logs"

if [[ -z "${POSTGRES_PASSWORD:-}" ]]; then
  echo "ERROR: POSTGRES_PASSWORD must be set for initial database setup." >&2
  exit 1
fi

if [[ -z "${POSTGRES_MULTIPLE_DATABASES:-}" ]]; then
  echo "No additional databases requested."
  exit 0
fi

echo "Multiple database creation requested: ${POSTGRES_MULTIPLE_DATABASES}"

# Connect as the bootstrap superuser to the default db (postgres)
psql_base=( psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER}" -d postgres )

create_user_and_database() {
  local db="$1"
  # Normalize an identifier: wrap in double-quotes to avoid issues if it contains uppercase chars etc.
  # Also use dollar-quoted strings for password.
  "${psql_base[@]}" <<-EOSQL
    DO \$\$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = ${db:+"'$db'"} ) THEN
        PERFORM 1;
        EXECUTE 'CREATE DATABASE ' || quote_ident(${db:+"$db"}) || ';';
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ${db:+"'$db'"} ) THEN
        EXECUTE 'CREATE ROLE ' || quote_ident(${db:+"$db"}) || ' LOGIN PASSWORD ' || quote_literal('${POSTGRES_PASSWORD}') || ';';
        -- Grant elevated privileges *only if you really need them*:
        EXECUTE 'ALTER ROLE ' || quote_ident(${db:+"$db"}) || ' CREATEDB CREATEROLE;';
      END IF;

      -- Ensure owner and grant privileges
      EXECUTE 'ALTER DATABASE ' || quote_ident(${db:+"$db"}) || ' OWNER TO ' || quote_ident(${db:+"$db"}) || ';';
      -- For completeness: connect to the DB and grant default privileges could be added if needed
    END
    \$\$;
EOSQL
  echo "  Ensured user+database '${db}' exist"
}

# Split on commas
IFS=',' read -ra DBS <<< "${POSTGRES_MULTIPLE_DATABASES}"
for db in "${DBS[@]}"; do
  db="$(echo "$db" | xargs)"   # trim
  [[ -n "$db" ]] || continue
  create_user_and_database "$db"
done

echo "Multiple databases ensured."