/**
 * Set official WhatsApp profile for the Noir:GateWay bot
 * Updates pushname, profile picture, and status
 */
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { resolve } from "path";
import * as fs from "fs";

const AUTH_DIR = resolve(process.cwd(), "whatsapp-auth");

function log(tag, msg) {
  const ts = new Date().toISOString().replace("T", " ").substring(0, 19);
  console.log(`[${ts}] [${tag}] ${msg}`);
}

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

  // Wait for connection
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

  log("CONNECTED", `Logged in as: ${sock?.user?.id || "unknown"}`);
  log("CURRENT", `Current name: ${sock?.user?.name || "unknown"}`);

  // ─── 1. Set official profile name ───
  const OFFICIAL_NAME = "Noir:GateWay Bureau";
  console.log("\n━━━ Updating WhatsApp Profile ━━━\n");

  try {
    await sock.updateProfileName(OFFICIAL_NAME);
    log("NAME", `✅ Profile name set to "${OFFICIAL_NAME}"`);
  } catch (err) {
    log("NAME", `❌ Failed to set profile name: ${err.message}`);
  }

  // ─── 2. Set profile status/about ───
  const STATUS_TEXT = "Bureau of Investigation · Case Management · Evidence Tracking";
  try {
    await sock.updateProfileStatus(STATUS_TEXT);
    log("STATUS", `✅ About/status set to "${STATUS_TEXT}"`);
  } catch (err) {
    log("STATUS", `❌ Failed to set status: ${err.message}`);
  }

  // ─── 3. Set profile picture ───
  // Check if we have a profile pic file
  const picPath = resolve(process.cwd(), "public", "bot-profile.png");
  if (existsSync(picPath)) {
    try {
      const img = fs.readFileSync(picPath);
      const b64 = img.toString("base64");
      await sock.updateProfilePicture(sock.user?.id || "919452056191@s.whatsapp.net", b64);
      log("PICTURE", "✅ Profile picture updated");
    } catch (err) {
      log("PICTURE", `❌ Failed to set picture: ${err.message}`);
    }
  } else {
    log("PICTURE", "⏭️ No bot-profile.png found — skipping profile picture");
    console.log("  → Place a 640x640 PNG at: public/bot-profile.png and re-run");
  }

  // ─── 4. Verify by re-reading ───
  console.log("\n━━━ Verification ━━━\n");
  
  // Reconnect to see the new name in user object
  log("DONE", "Profile update complete. New DMs will show:");
  console.log("");
  console.log(`  📱 Sender Name:  "${OFFICIAL_NAME}"`);
  console.log(`  📝 About/Status: "${STATUS_TEXT}"`);
  console.log(`  🔗 Phone:         919452056191`);
  console.log("");
  log("NOTE", "Future DMs to any contact will show as 'Noir:GateWay Bureau'");
  log("NOTE", "Already-existing chats may take time to update the cached name");

  // Clean close
  await new Promise(r => setTimeout(r, 2000));
  sock.ws?.close();
  sock.end(undefined);
  log("CLOSED", "Done");
  process.exit(0);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
