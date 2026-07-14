/**
 * Re-link WhatsApp using a pairing code (no QR needed).
 * Deletes old auth state → generates pairing code → 
 * user enters it on phone (WhatsApp > Linked Devices > Link a Device)
 */
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { existsSync, rmSync, mkdirSync } from "fs";
import { resolve } from "path";

const AUTH_DIR = resolve(process.cwd(), "whatsapp-auth");
const PHONE_NUMBER = "919452056191";  // The number Baileys will use

async function main() {
  // 1. Wipe old auth state
  if (existsSync(AUTH_DIR)) {
    console.log("Removing old auth state...");
    rmSync(AUTH_DIR, { recursive: true, force: true });
  }
  mkdirSync(AUTH_DIR, { recursive: true });

  // 2. Fresh auth state
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  const sock = makeWASocket({
    auth: state,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    browser: ["Noir:GateWay", "Chrome", "1.0.0"],
    printQRInTerminal: false,
    connectTimeoutMs: 60000,
    generateHighQualityLinkPreview: false,
  });

  sock.ev.on("creds.update", saveCreds);

  // 3. Request pairing code when QR would normally appear
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // When QR appears, that means the socket wants a QR scan
    // Instead, request a pairing code
    if (qr && !sock.authState.creds.registered) {
      console.log("Generating pairing code...");
      try {
        const code = await sock.requestPairingCode(PHONE_NUMBER);
        console.log("═══════════════════════════════════════════");
        console.log("  PAIRING CODE:", code.match(/.{1,4}/g).join("-"));
        console.log("═══════════════════════════════════════════");
        console.log("Open WhatsApp → Linked Devices → Link a Device");
        console.log("Enter the code above (no spaces/hyphens needed)");
        console.log("");
        console.log("Waiting for connection... (30s timeout)");
      } catch (e) {
        console.error("Pairing code failed:", e.message);
      }
    }

    if (connection === "open") {
      console.log("✓ WhatsApp CONNECTED successfully");
      console.log("  User:", sock.user?.id);
      console.log("  Name:", sock.user?.name);
      console.log("Auth state saved permanently — will auto-connect on next runs");
      // Clean exit
      setTimeout(() => {
        sock.ws?.close();
        sock.end(undefined);
        process.exit(0);
      }, 1000);
    }

    if (connection === "close") {
      const isLoggedOut = lastDisconnect?.error instanceof Boom
        && lastDisconnect.error.output.statusCode === DisconnectReason.loggedOut;
      if (isLoggedOut) {
        console.log("✗ Logged out — run this script again to re-link");
      }
    }
  });

  // Wait 45s for pairing
  await new Promise(r => setTimeout(r, 45000));
  console.log("Timed out waiting for pairing. Run the script again to retry.");
  sock.ws?.close();
  sock.end(undefined);
  process.exit(1);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
