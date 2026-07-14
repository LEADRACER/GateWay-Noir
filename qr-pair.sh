#!/usr/bin/env bash
# Noir:GateWay — QR Pairing Launcher
# Starts the QR server and opens the browser.

cd "$(dirname "$0")"
rm -rf whatsapp-auth 2>/dev/null

echo "⟳ Starting WhatsApp QR pairing server..."
node scripts/qr-pair.mjs &
PID=$!

# Wait for server to start
sleep 2

# Detect browser and open
if command -v xdg-open &>/dev/null; then
  xdg-open "http://localhost:31415" 2>/dev/null || true
elif command -v sensible-browser &>/dev/null; then
  sensible-browser "http://localhost:31415" 2>/dev/null || true
elif command -v firefox &>/dev/null; then
  firefox "http://localhost:31415" 2>/dev/null || true
elif command -v chromium &>/dev/null; then
  chromium "http://localhost:31415" 2>/dev/null || true
fi

echo "  Browser should open automatically."
echo "  If not, open http://localhost:31415 manually."
echo "  Press Ctrl+C to stop."

wait $PID
