#!/bin/bash
# WhatsApp Announcer — Noir:GateWay
# Wrapper for Hermes cron (no_agent mode — stdout delivered verbatim)
# On first run, a QR code is printed for WhatsApp authentication.
# On subsequent runs, it processes pending notifications silently.
# If no auth exists, exits with a message so the user knows to auth manually.

set -e

PROJECT_DIR="/root/Builds/Noir:GateWay"
cd "$PROJECT_DIR"

# Load env vars
export $(grep -v '^#' .env.prod | xargs) 2>/dev/null || true
export $(grep -v '^#' .env.local 2>/dev/null | xargs) 2>/dev/null || true

# Check if WhatsApp auth exists
AUTH_DIR="$PROJECT_DIR/whatsapp-auth"
if [ ! -f "$AUTH_DIR/creds.json" ]; then
  echo "━━━ WhatsApp Not Authenticated ━━━"
  echo ""
  echo "Run this command interactively to scan the QR code:"
  echo "  cd $PROJECT_DIR && node scripts/whatsapp-announcer.mjs"
  echo ""
  echo "The announcer will start processing once authenticated."
  exit 0
fi

# Run the announcer
node scripts/whatsapp-announcer.mjs 2>&1
