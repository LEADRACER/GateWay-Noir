/**
 * WhatsApp QR + save as PNG so you can open on phone.
 */
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { existsSync, rmSync, mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import qrcode from "qrcode-terminal";
import QR from "qrcode";

const AUTH_DIR = resolve(process.cwd(), "whatsapp-auth");
const PUBLIC_DIR = resolve(process.cwd(), "public");

async function main() {
  if (existsSync(AUTH_DIR)) rmSync(AUTH_DIR, { recursive: true, force: true });
  mkdirSync(AUTH_DIR, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  async function connect() {
    const sock = makeWASocket({
      auth: state,
      syncFullHistory: false,
      markOnlineOnConnect: false,
      browser: ["Noir:GateWay", "Chrome", "1.0.0"],
      connectTimeoutMs: 60000,
      generateHighQualityLinkPreview: false,
    });
    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.clear();
        console.log("\n==============================================");
        console.log("  SCAN THIS QR CODE WITH YOUR PHONE");
        console.log("==============================================");
        qrcode.generate(qr, { small: true });
        console.log("\nWhatsApp → Linked Devices → Link a Device → SCAN");
        
        // Also save as PNG
        try {
          mkdirSync(PUBLIC_DIR, { recursive: true });
          const png = await QR.toBuffer(qr, { type: "png", width: 600, margin: 2 });
          writeFileSync(resolve(PUBLIC_DIR, "whatsapp-qr.png"), png);
          console.log("\n📱 Saved as: public/whatsapp-qr.png");
          console.log("   Open on phone: https://noirgateway.vercel.app/whatsapp-qr.png");
        } catch(e) { /* ignore png errors */ }
      }

      if (connection === "open") {
        console.log(`\n✓ LINKED!`);
        sock.ws?.close();
        sock.end(undefined);
        process.exit(0);
      }

      if (connection === "close") {
        const isLoggedOut = lastDisconnect?.error instanceof Boom
          && lastDisconnect.error.output.statusCode === DisconnectReason.loggedOut;
        if (isLoggedOut) { console.log("Logged out."); process.exit(1); }
        setTimeout(connect, 3000);
      }
    });

    return sock;
  }

  await connect();
  console.log("\nWaiting 120s...");
  await new Promise(r => setTimeout(r, 120_000));
  console.log("Timed out.");
  process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
