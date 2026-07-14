/**
 * Set official profile picture for WhatsApp bot
 * WAMediaUpload accepts Buffer directly
 */
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { resolve } from "path";

const AUTH_DIR = resolve(process.cwd(), "whatsapp-auth");

async function main() {
  if (!existsSync(AUTH_DIR)) mkdirSync(AUTH_DIR, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    browser: ["Noir:GateWay", "Chrome", "2.0.0"],
    connectTimeoutMs: 30000,
  });

  sock.ev.on("creds.update", saveCreds);

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Connection timeout")), 25000);
    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === "open") { clearTimeout(timeout); resolve(); }
      if (connection === "close") {
        clearTimeout(timeout);
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        if (statusCode !== DisconnectReason.loggedOut) reject(new Error("Connection closed"));
      }
    });
  });

  console.log("[CONNECTED] Setting profile picture...");

  const picPath = resolve(process.cwd(), "public", "bot-profile.png");
  if (!existsSync(picPath)) {
    console.log("[PICTURE] ❌ No bot-profile.png found");
    process.exit(1);
  }

  try {
    const imgBuffer = readFileSync(picPath);
    // WAMediaUpload accepts Buffer directly
    await sock.updateProfilePicture(
      sock.user?.id || "919452056191@s.whatsapp.net",
      imgBuffer
    );
    console.log("[PICTURE] ✅ Profile picture set successfully");
  } catch (err) {
    console.log("[PICTURE] ❌ Failed:", err.message);
  }

  await new Promise(r => setTimeout(r, 2000));
  sock.ws?.close();
  sock.end(undefined);
  console.log("[CLOSED] Done");
  process.exit(0);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
