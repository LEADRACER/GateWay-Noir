/**
 * Show members of each WhatsApp group
 */
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";
import { existsSync, mkdirSync } from "fs";
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

  console.log("[CONNECTED] Fetching groups & members...\n");

  const groups = await sock.groupFetchAllParticipating();

  for (const [gid, g] of Object.entries(groups)) {
    console.log(`━━━ ${g.subject || "(no name)"} ━━━`);
    console.log(`  JID:   ${gid}`);
    console.log(`  Total: ${g.size || g.participants?.length || "?"}\n`);

    const members = g.participants || [];
    for (const m of members) {
      const phone = m.id.split("@")[0];
      const admin = m.admin ? `⭐ ${m.admin}` : "";
      console.log(`  ${phone.padEnd(20)} ${admin}`);
    }
    console.log("");
  }

  await new Promise(r => setTimeout(r, 2000));
  sock.ws?.close();
  sock.end(undefined);
  process.exit(0);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
