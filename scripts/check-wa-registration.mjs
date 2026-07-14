/**
 * Check if a number is registered on WhatsApp using Baileys
 */
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from '@supabase/supabase-js';

const AUTH_DIR = resolve(process.cwd(), "whatsapp-auth");
const env = readFileSync('/root/Builds/Noir:GateWay/.env.prod', 'utf-8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL="([^"]+)"/)[1];
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY="([^"]+)"/)[1];
const supabase = createClient(url, key);

async function main() {
  // Get BRU-DTWZ's phone
  const { data: user } = await supabase.from('User').select('badgeCode, phone').eq('badgeCode', 'BRU-DTWZ').single();
  if (!user?.phone) { console.log("No phone for BRU-DTWZ"); process.exit(1); }
  console.log(`Target: ${user.badgeCode} → ${user.phone}`);

  // Init Baileys
  if (!existsSync(AUTH_DIR)) mkdirSync(AUTH_DIR, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    browser: ["Noir:GateWay", "Firefox", "1.0.0"],
    connectTimeoutMs: 30000,
    keepAliveIntervalMs: 30000,
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

  console.log("\n[CHECK] Connected! Checking WhatsApp registration...\n");

  // Check if the number is on WhatsApp
  const cleanPhone = user.phone.replace(/[+\s\-]/g, '');
  try {
    const result = await sock.onWhatsApp(cleanPhone);
    console.log("onWhatsApp result:", JSON.stringify(result, null, 2));
    if (result && result.length > 0 && result[0].exists) {
      console.log(`\n✅ ${user.phone} IS registered on WhatsApp as JID: ${result[0].jid}`);
    } else {
      console.log(`\n❌ ${user.phone} is NOT registered on WhatsApp`);
    }
  } catch (err) {
    console.log("onWhatsApp check failed:", err.message);
  }

  // Also check the bot's own number for comparison
  try {
    const selfCheck = await sock.onWhatsApp("919452056191");
    console.log("\nSelf-check (919452056191):", JSON.stringify(selfCheck, null, 2));
  } catch (err) {
    console.log("Self-check failed:", err.message);
  }

  // Try sending to BRU-DTWZ with short timeout
  console.log("\n[Trying DM to BRU-DTWZ with 15s timeout...]");
  const jid = user.phone.includes("@") ? user.phone : `${user.phone}@s.whatsapp.net`;
  try {
    const sendPromise = sock.sendMessage(jid, { text: "Noir:GateWay DM test from bot." });
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("sendMessage timed out after 15s")), 15000));
    const result = await Promise.race([sendPromise, timeoutPromise]);
    console.log("✅ DM sent! Key:", JSON.stringify(result?.key));
  } catch (err) {
    console.log("❌ DM failed:", err.message);
  }

  // Clean close
  await new Promise(r => setTimeout(r, 1000));
  sock.ws?.close();
  sock.end(undefined);
  process.exit(0);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
