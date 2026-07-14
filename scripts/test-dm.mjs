import "dotenv/config";
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";

const AUTH_DIR = new URL("../whatsapp-auth/", import.meta.url).pathname;
const MY_NUMBER = "919452056191";
const TEST_MSG = "Noir:GateWay DM test — this is a test direct message from the bot.";

async function main() {
  console.log("[TEST] Starting DM test...");

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const sock = makeWASocket({
    auth: state,
    browser: ["Noir:GateWay", "Chrome", "1.0.0"],
    printQRInTerminal: false,
  });

  sock.ev.on("creds.update", saveCreds);

  // Wait for connection
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Connection timeout")), 20000);
    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === "open") {
        clearTimeout(timeout);
        resolve();
      }
      if (connection === "close") {
        clearTimeout(timeout);
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        if (statusCode !== DisconnectReason.loggedOut) {
          reject(new Error(`Closed: ${statusCode}`));
        }
      }
    });
  });

  console.log("[TEST] Connected! Sending DM to self...");

  const jid = `${MY_NUMBER}@s.whatsapp.net`;
  const result = await sock.sendMessage(jid, { 
    text: TEST_MSG,
  });
  console.log("[TEST] DM sent! Message key:", JSON.stringify(result?.key));
  
  await new Promise(r => setTimeout(r, 2000));
  await sock.ws?.close();
  sock.end(undefined);
  console.log("[TEST] Done.");
}

main().catch(e => {
  console.error("[TEST] FAILED:", e.message);
  process.exit(1);
});
