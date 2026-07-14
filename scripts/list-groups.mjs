/**
 * List all WhatsApp groups the bot is a member of
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

  console.log("[CONNECTED] Fetching groups...\n");

  // Get all groups
  const groups = await sock.groupFetchAllParticipating();
  const groupList = Object.values(groups);

  if (groupList.length === 0) {
    console.log("❌ Bot is not in any WhatsApp groups.");
    console.log("   Create a group and add 919452056191 to it.");
    process.exit(0);
  }

  console.log(`Found ${groupList.length} group(s):\n`);
  console.log("─── GROUPS ───\n");

  for (const g of groupList) {
    const gid = g.id || "?";
    const name = g.subject || "(no name)";
    const memberCount = g.size || g.participants?.length || "?";
    const desc = g.desc || "(no description)";
    const owner = g.owner || "?";
    const created = g.creation ? new Date(g.creation * 1000).toLocaleDateString() : "?";

    console.log(`  Group:     ${name}`);
    console.log(`  JID:       ${gid}`);
    console.log(`  Members:   ${memberCount}`);
    console.log(`  Created:   ${created}`);
    console.log(`  Owner:     ${owner}`);
    console.log(`  Desc:      ${desc.substring(0, 100)}`);
    console.log("");
  }

  console.log("─── END ───\n");
  console.log("To send to all members of a group, use: sock.sendMessage(groupJid, { text: msg })");

  // Clean close
  await new Promise(r => setTimeout(r, 2000));
  sock.ws?.close();
  sock.end(undefined);
  process.exit(0);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
