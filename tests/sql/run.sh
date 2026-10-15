#!/usr/bin/env bash
# Database-tests: lege Postgres → nagebootste Supabase → echte SQL-bestanden → tests.
# Gebruik: PGHOST=... PGPORT=... PGUSER=postgres bash tests/sql/run.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=ff_test_$$
psql -q -v ON_ERROR_STOP=1 -d postgres -c "create database $DB" >/dev/null
trap 'psql -q -d postgres -c "drop database if exists $DB" >/dev/null' EXIT
for f in tests/sql/supabase-nep.sql supabase/schema.sql supabase/somtoday.sql supabase/beveiliging.sql supabase/beveiliging.sql tests/sql/rechten-toekennen.sql tests/sql/rechten.sql; do
  if ! out=$(psql -q -t -v ON_ERROR_STOP=1 -d "$DB" -f "$f" 2>&1); then
    echo "$out" | tail -5
    echo "MISLUKT in $f"
    exit 1
  fi
  echo "$out" | grep -oE "ok  .*|ALLE .*" || true
done
