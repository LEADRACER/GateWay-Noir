#!/bin/bash
# ============================================================================
# Noir:GateWay — Migration Script
# ============================================================================
# Applies migration.sql to the Supabase PostgreSQL database.
#
# PREREQUISITES:
#   1. Your machine's IP must be allowlisted in the Supabase project:
#      https://supabase.com/dashboard/project/bovsdzvkhtcilsvkayec/database/settings
#
#   2. PostgreSQL client (psql) installed, or Docker running for supabase CLI.
#
#   3. The database password (stored in .env as DATABASE_PASSWORD).
#
# USAGE:
#   bash scripts/run-migration.sh
#
# ALTERNATIVES:
#   A — Supabase Dashboard SQL Editor (no IP restriction):
#     1. Go to https://supabase.com/dashboard/project/bovsdzvkhtcilsvkayec
#     2. Click "SQL Editor" → "New Query"
#     3. Paste the contents of scripts/migration.sql
#     4. Click "Run"
#
#   B — psql from allowlisted machine:
#     PGPASSWORD='<password>' psql \
#       -h db.bovsdzvkhtcilsvkayec.supabase.co \
#       -p 5432 -U postgres -d postgres \
#       -f scripts/migration.sql
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATION_FILE="${SCRIPT_DIR}/scripts/migration.sql"

# Source .env for the password
if [ -f "${SCRIPT_DIR}/.env" ]; then
  export $(grep -v '^#' "${SCRIPT_DIR}/.env" | xargs)
fi

# Use the database password from user input or env
DB_PASSWORD="${DATABASE_PASSWORD:-${1:-}}"

if [ -z "$DB_PASSWORD" ]; then
  echo "ERROR: Database password not provided."
  echo "Set DATABASE_PASSWORD env var or pass as argument: $0 <password>"
  exit 1
fi

echo "Applying migration to Noir:GateWay database..."
echo "Project: bovsdzvkhtcilsvkayec"
echo "File: ${MIGRATION_FILE}"
echo ""

# Try psql direct connection (port 5432)
export PGPASSWORD="$DB_PASSWORD"
if psql -h db.bovsdzvkhtcilsvkayec.supabase.co -p 5432 \
       -U postgres -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
  echo "✓ Connected via direct (port 5432)"
  psql -h db.bovsdzvkhtcilsvkayec.supabase.co -p 5432 \
       -U postgres -d postgres -f "$MIGRATION_FILE"
  echo "✓ Migration complete!"
elif psql -h db.bovsdzvkhtcilsvkayec.supabase.co -p 6543 \
         -U postgres -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
  echo "✓ Connected via pooler (port 6543)"
  psql -h db.bovsdzvkhtcilsvkayec.supabase.co -p 6543 \
       -U postgres -d postgres -f "$MIGRATION_FILE"
  echo "✓ Migration complete!"
else
  echo ""
  echo "✗ Cannot connect to the database from this machine."
  echo ""
  echo "  Connection refused at both ports 5432 and 6543."
  echo "  This is likely due to the Supabase project's Network Restrictions"
  echo "  blocking your IP address (IPv6: 2401:4900:d810:6525:...)."
  echo ""
  echo "  TO FIX:"
  echo "  1. Go to https://supabase.com/dashboard/project/bovsdzvkhtcilsvkayec/database/settings"
  echo "  2. Under 'Network Restrictions', add your current IPv6 address to the allowlist"
  echo "  3. Re-run this script"
  echo ""
  echo "  ALTERNATIVE: Use the Supabase Dashboard SQL Editor:"
  echo "  1. Go to https://supabase.com/dashboard/project/bovsdzvkhtcilsvkayec/sql/new"
  echo "  2. Paste the contents of ${MIGRATION_FILE}"
  echo "  3. Click 'Run'"
  exit 1
fi
