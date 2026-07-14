/**
 * Send test message to GLA census (root) group
 */
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";
import { existsSync, mkdirSync } from "fs";
import { resolve } from "path";

const AUTH_DIR = resolve(process.cwd(), "whatsapp-auth");
const GROUP_JID = "120363426099852261@g.us";

async function main() {
  if (!existsSync(AUTH_DIR)) mkdirSync(AUTH_DIR, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    browser: ["Noir:GateWay", "Chrome", "3.0.0"],
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

  console.log("[CONNECTED] Sending test message to GLA census (root)...");

  const msg = [
    `━━━ NOIR BUREAU ━━━`,
    ``,
    `Test message from Noir:GateWay bot.`,
    `Group delivery channel is operational.`,
    ``,
    `— Noir:GateWay Bureau`,
  ].join("\n");

  try {
    const result = await sock.sendMessage(GROUP_JID, { text: msg });
    console.log("✅ Message sent! Key:", result?.key?.id || "success");
  } catch (err) {
    console.log("❌ Failed:", err.message);
  }

  await new Promise(r => setTimeout(r, 2000));
  sock.ws?.close();
  sock.end(undefined);
  process.exit(0);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
