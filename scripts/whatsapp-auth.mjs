#!/usr/bin/env node
/**
 * WhatsApp QR Auth v3 — UTF-8 block chars for clean QR
 */
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import QRCode from "qrcode";
import { existsSync, mkdirSync } from "fs";
import { resolve } from "path";

const AUTH_DIR = resolve(process.cwd(), "whatsapp-auth");
if (!existsSync(AUTH_DIR)) mkdirSync(AUTH_DIR, { recursive: true });

let resolved = false;

const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
const sock = makeWASocket({
  auth: state,
  printQRInTerminal: false,
  syncFullHistory: false,
  markOnlineOnConnect: false,
  browser: ["Noir:GateWay", "Chrome", "1.0.0"],
});

sock.ev.on("creds.update", saveCreds);

let qrCount = 0;
sock.ev.on("connection.update", async (update) => {
  const { connection, lastDisconnect, qr } = update;
  if (qr && !resolved) {
    qrCount++;
    console.log("\n  ╔══════════════════════════════════════════╗");
    console.log("  ║  SCAN THIS QR CODE WITH WHATSAPP        ║");
    console.log("  ╚══════════════════════════════════════════╝\n");
    try {
      // UTF-8 block chars — clean, no ANSI codes
      const ascii = await QRCode.toString(qr, { type: "utf8", small: true });
      console.log(ascii);
    } catch {
      console.log("QR DATA (copy into a QR generator):");
      console.log(qr);
    }
    console.log("  📱 WhatsApp → Menu → Linked Devices → Link a Device");
    console.log(`  🔄 QR #${qrCount} — about 60s, refreshes automatically\n`);
  }
  if (connection === "open") {
    resolved = true;
    console.log("\n✅ WhatsApp authenticated! Auth saved to whatsapp-auth/");
    console.log("   The cron job will now process notifications.\n");
    process.exit(0);
  }
  if (connection === "close") {
    if (resolved) return;
    const shouldReconnect =
      lastDisconnect?.error instanceof Boom
        ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
        : true;
    if (!shouldReconnect) {
      console.log("\n❌ Logged out / invalidated. Delete whatsapp-auth/, re-run.");
      process.exit(1);
    }
  }
});

process.on("SIGINT", () => { console.log("\n"); sock?.end(undefined); process.exit(0); });
