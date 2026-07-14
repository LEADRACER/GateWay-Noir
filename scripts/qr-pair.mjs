#!/usr/bin/env node
/**
 * Noir:GateWay — WhatsApp QR Pairing Server
 *
 * Starts a local HTTP server that shows a QR code in the browser.
 * Scan it with WhatsApp → Link a Device to pair.
 * 
 * Usage: node scripts/qr-pair.mjs
 *        # or from project root: bash qr-pair.sh
 */

import { makeWASocket, DisconnectReason, useMultiFileAuthState } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.resolve(__dirname, "..", "whatsapp-auth");
const PORT = 31415;

// ── Global state ──
let qrString = null;
let connectionState = "connecting";
let errorMessage = "";
let html = "";
let htmlGenerated = false;

// ── Generate the HTML page with the QR embedded ──
async function generateHtml() {
  if (connectionState === "connected") {
    html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Noir:GateWay — WhatsApp Paired</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      background: #060608; color: #e4e4e7;
      font-family: system-ui, -apple-system, sans-serif;
      display: flex; justify-content: center; align-items: center;
      min-height: 100vh;
    }
    .card {
      background: #0c0c10; border: 2px solid #1a1a20;
      padding: 3rem; text-align: center; max-width: 480px;
    }
    .check { font-size: 3rem; margin-bottom: 1rem; }
    h1 { color: #22c55e; font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #71717a; font-size: 0.9rem; }
  </style>
</head>
<body>
  <div class="card">
    <div class="check">✅</div>
    <h1>WhatsApp Connected</h1>
    <p>Noir:GateWay is paired and ready to send notifications.</p>
    <p style="margin-top:1rem;color:#52525b;font-size:0.8rem;">You can close this window.</p>
  </div>
</body>
</html>`;
  } else if (connectionState === "error") {
    html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Noir:GateWay — Error</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      background: #060608; color: #e4e4e7;
      font-family: system-ui, -apple-system, sans-serif;
      display: flex; justify-content: center; align-items: center;
      min-height: 100vh;
    }
    .card { background: #0c0c10; border: 2px solid #1a1a20; padding: 3rem; text-align: center; max-width: 480px; }
    .x { font-size: 3rem; margin-bottom: 1rem; }
    h1 { color: #ef4444; font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #71717a; font-size: 0.9rem; white-space: pre-wrap; }
  </style>
</head>
<body>
  <div class="card">
    <div class="x">❌</div>
    <h1>Connection Failed</h1>
    <p>${errorMessage}</p>
  </div>
</body>
</html>`;
  } else if (qrString) {
    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(qrString, {
      width: 400,
      margin: 2,
      color: { dark: "#e4e4e7", light: "#0c0c10" },
    });
    html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Noir:GateWay — WhatsApp Pair</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      background: #060608; color: #e4e4e7;
      font-family: system-ui, -apple-system, sans-serif;
      display: flex; justify-content: center; align-items: center;
      min-height: 100vh;
    }
    .card {
      background: #0c0c10; border: 2px solid #1a1a20;
      padding: 2.5rem; text-align: center; max-width: 520px;
    }
    h1 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.25rem; }
    .sub {
      color: #71717a; font-size: 0.85rem; margin-bottom: 1.5rem;
    }
    .qr-wrap {
      background: #0c0c10; border: 2px solid #1a1a20; padding: 1rem;
      display: inline-block;
    }
    .qr-wrap img { display: block; width: 320px; height: 320px; image-rendering: pixelated; }
    .phone { color: #a1a1aa; font-family: monospace; font-size: 0.9rem; margin-top: 1rem; }
    .steps {
      text-align: left; margin-top: 1.5rem; padding: 1rem;
      background: #0d0d12; border: 1px solid #1a1a20;
      font-size: 0.8rem; line-height: 1.6;
    }
    .steps span { color: #d97706; }
    .refresh-msg { color: #52525b; font-size: 0.75rem; margin-top: 1rem; }
  </style>
  <meta http-equiv="refresh" content="5">
</head>
<body>
  <div class="card">
    <h1>🔗 Link WhatsApp</h1>
    <p class="sub">Scan this QR code with your phone</p>
    <div class="qr-wrap">
      <img src="${qrDataUrl}" alt="WhatsApp QR Code" />
    </div>
    <div class="phone">Bot: +91 ******6191</div>
    <div class="steps">
      <strong>Steps:</strong><br>
      1. Open <span>WhatsApp</span> on your phone<br>
      2. Tap <span>⋯</span> (Android) or <span>Settings</span> (iOS)<br>
      3. Go to <span>Linked Devices</span> → <span>Link a Device</span><br>
      4. <span>Scan this QR code</span> with your phone
    </div>
    <div class="refresh-msg">Page refreshes every 5s until connected</div>
  </div>
</body>
</html>`;
  } else {
    // Connecting — show loader
    html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta http-equiv="refresh" content="3">
<title>Connecting...</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    background:#060608; color:#e4e4e7; font-family:system-ui,sans-serif;
    display:flex; justify-content:center; align-items:center; min-height:100vh;
  }
  .card { background:#0c0c10; border:2px solid #1a1a20; padding:3rem; text-align:center; }
  .spinner { width:36px; height:36px; border:3px solid #1a1a20; border-top-color:#d97706; border-radius:50%; animation:spin .8s linear infinite; margin:0 auto 1rem; }
  @keyframes spin { to { transform:rotate(360deg); } }
  p { color:#71717a; }
</style></head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <p>Connecting to WhatsApp...</p>
  </div>
</body>
</html>`;
  }
  htmlGenerated = true;
}

// ── Start Baileys ──
async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // we handle it via event
    browser: ["Noir:GateWay", "Chrome", "1.0.0"],
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrString = qr;
      connectionState = "qr_ready";
      htmlGenerated = false;
      console.log("[QR] New QR code generated — scan it in the browser!");
    }

    if (connection === "open") {
      connectionState = "connected";
      htmlGenerated = false;
      console.log("[WA] ✅ WhatsApp connected and paired!");
      console.log(`[WA]   Credentials saved to: whatsapp-auth/`);
      // Show a hint about group JID
      console.log("[WA]   Next: create a WhatsApp group, add this bot,");
      console.log("[WA]   then get the group JID and set WHATSAPP_GROUP_JID");
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error instanceof Boom
        ? lastDisconnect.error.output.statusCode
        : 0;

      if (statusCode === DisconnectReason.loggedOut) {
        connectionState = "error";
        errorMessage = "Phone number was logged out remotely.\nDelete whatsapp-auth/ and re-pair.";
        htmlGenerated = false;
        console.log("[WA] ❌ Logged out. Delete whatsapp-auth/ to re-pair.");
        sock.end();
        return;
      }

      console.log("[WA] Connection closed, reconnecting...");
      connectionState = "connecting";
      htmlGenerated = false;
      // Reconnect
      startSock();
    }

    await saveCreds();
  });

  sock.ev.on("creds.update", saveCreds);
}

// ── HTTP Server ──
const server = http.createServer(async (req, res) => {
  // Generate HTML fresh if needed
  if (!htmlGenerated) await generateHtml();

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(html);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║  Noir:GateWay — WhatsApp QR Pairing         ║
  ╠══════════════════════════════════════════════╣
  ║                                              ║
  ║  Open in browser:                            ║
  ║    http://localhost:${PORT}                      ║
  ║                                              ║
  ║  Or on another machine:                      ║
  ║    http://<your-ip>:${PORT}                    ║
  ║                                              ║
  ║  Then scan the QR with your phone:           ║
  ║    WhatsApp → Linked Devices → Link Device   ║
  ║                                              ║
  ║  Press Ctrl+C to stop the server             ║
  ╚══════════════════════════════════════════════╝`);
});

// Cleanup
process.on("SIGINT", () => {
  console.log("\nShutting down...");
  server.close();
  process.exit(0);
});

startSock();
