#!/usr/bin/env bash
set -euo pipefail

# Triplets:
#   POSTGRES_MULTIPLE_DATABASES="user:password:db,user2:password2:db2"
#
# Operator (optional):
#   DB_ADMIN_USER=...
#   DB_ADMIN_PASSWORD=...
#   DB_ADMIN_ACCESS="db1,db2"
#
# Privilege lists (CSV; Compose may expand ${VARS} before this runs; quotes OK):
#   SUPERUSER_PRIVILEGE_DB_NAMES="${POSTGRES_API_DB},${POSTGRES_LOGTO_DB}"
#   REPLICATION_PRIVILEGE_DB_NAMES="${POSTGRES_API_DB},${POSTGRES_LOGTO_DB}"

if [[ -z "${POSTGRES_PASSWORD:-}" ]]; then
  echo "ERROR: POSTGRES_PASSWORD must be set." >&2
  exit 1
fi

PSQL_USER="${POSTGRES_USER:-postgres}"
psql_base=( psql -v ON_ERROR_STOP=1 -U "$PSQL_USER" -d postgres )

# ---- Ensure logical replication server settings (persisted) ----
# Safe to run always; it's idempotent and writes to postgresql.auto.conf.
# Requires a restart, which the official entrypoint already performs after init.
ensure_logical_replication_settings() {
  "${psql_base[@]}" <<'EOSQL'
ALTER SYSTEM SET wal_level = 'logical';
ALTER SYSTEM SET max_wal_senders = '10';
ALTER SYSTEM SET max_replication_slots = '10';
-- Optional, but often useful diagnostics:
-- ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
EOSQL
  echo "Configured Postgres for logical replication (wal_level=logical, wal_senders=10, replication_slots=10)."
}
ensure_logical_replication_settings

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

# ---------- Privilege CSV handling ----------
trim_spaces() { echo "$1" | tr -d '[:space:]'; }
strip_outer_quotes() {
  local s="$1"
  if [[ "$s" =~ ^\".*\"$ ]]; then s="${s:1:${#s}-2}"; fi
  if [[ "$s" =~ ^\'.*\'$ ]]; then s="${s:1:${#s}-2}"; fi
  printf '%s' "$s"
}

normalize_csv_to_list() {
  local csv_raw="$1"
  local -n out_ref=$2
  out_ref=""
  csv_raw="$(strip_outer_quotes "$(trim_spaces "${csv_raw}")")"
  [[ -z "$csv_raw" ]] && return 0
  IFS=',' read -ra _RAW <<< "$csv_raw"
  declare -A _SEEN=()
  local out=""
  for _db in "${_RAW[@]}"; do
    _db="$(echo "$_db" | xargs)"         # trim inner spaces
    # remove accidental per-token quotes
    [[ "$_db" == \"*\" && "$_db" == *\" ]] && _db="${_db:1:${#_db}-2}"
    [[ "$_db" == \'*\' && "$_db" == *\' ]] && _db="${_db:1:${#_db}-2}"
    [[ -n "$_db" ]] || continue
    if [[ -z "${_SEEN[$_db]+x}" ]]; then
      _SEEN["$_db"]=1
      out+="${out:+,}${_db}"
    fi
  done
  out_ref="$out"
}

SUPER_LIST=""
REPL_LIST=""
normalize_csv_to_list "${SUPERUSER_PRIVILEGE_DB_NAMES:-}" SUPER_LIST
normalize_csv_to_list "${REPLICATION_PRIVILEGE_DB_NAMES:-}" REPL_LIST

wrap_csv() { [[ -n "$1" ]] && printf ",%s," "$1" || printf ""; }
SUPER_WRAP="$(wrap_csv "$SUPER_LIST")"
REPL_WRAP="$(wrap_csv "$REPL_LIST")"

db_in_super_list() { [[ -n "$SUPER_WRAP" ]] && [[ "$SUPER_WRAP" == *",$1,"* ]]; }
db_in_repl_list()  { [[ -n "$REPL_WRAP"  ]] && [[ "$REPL_WRAP"  == *",$1,"* ]]; }

[[ -n "$SUPER_LIST" ]] && echo "CREATEROLE will be granted for DBs: ${SUPER_LIST}" || echo "No DBs requested for CREATEROLE."
[[ -n "$REPL_LIST"  ]] && echo "REPLICATION will be granted for DBs: ${REPL_LIST}"  || true

# ---------- Triplets ----------
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

    if db_in_super_list "$db"; then
      "${psql_base[@]}" -c "ALTER ROLE \"${usr}\" CREATEROLE;"
      echo "  Granted CREATEROLE to '${usr}' (db='${db}')"
    fi

    if db_in_repl_list "$db"; then
      "${psql_base[@]}" -c "ALTER ROLE \"${usr}\" REPLICATION;"
      echo "  Granted REPLICATION to '${usr}' (db='${db}')"
    fi

    echo "  Ensured role '${usr}' and database '${db}' (password set; not logged)"
  done
  echo "Multiple databases ensured."
fi

# ---------- Operator (optional) ----------
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
