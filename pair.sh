#!/usr/bin/env bash
set -e

# ├── Noir:GateWay — WhatsApp Pairing Helper ──┤
# Run this, then immediately enter the code on your phone:
#   WhatsApp → Settings → Linked Devices → Link a Device
#
# The pairing code appears in the first ~5 seconds after connecting.

cd "$(dirname "$0")"

echo "⟳ Connecting to WhatsApp and requesting pairing code..."
echo "  OPEN YOUR PHONE: WhatsApp → Settings → Linked Devices → Link a Device"
echo "  Enter the 8-character code below when it appears."
echo ""

# Remove stale creds so we get a fresh pairing code
rm -rf whatsapp-auth

timeout 35 node scripts/pair-now.mjs || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f whatsapp-auth/creds.json ]; then
  echo "✅ WhatsApp paired successfully!"
  echo "  Credentials saved to: whatsapp-auth/"
  echo ""
  echo "Next: set WHATSAPP_GROUP_JID in .env.local"
  echo "  Join a WhatsApp group, then run:"
  echo "  \$ node -e \"require('baileys').getGroupJID('your-group-invite-link')\""
else
  echo "✗ No credentials found — the code may have expired."
  echo "  Run ./pair.sh again when you're ready."
fi
