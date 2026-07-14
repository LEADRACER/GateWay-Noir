/**
 * Quick DM test — sends a message to BRU-DTWZ (Akhil)
 * Usage: node scripts/send-dm.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { existsSync, mkdirSync } from "fs";
import { resolve } from "path";

const env = readFileSync('/root/Builds/Noir:GateWay/.env.prod', 'utf-8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL="([^"]+)"/)[1];
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY="([^"]+)"/)[1];
const supabase = createClient(url, key);
const AUTH_DIR = resolve(process.cwd(), "whatsapp-auth");

function log(tag, msg) {
  const ts = new Date().toISOString().replace("T", " ").substring(0, 19);
  console.log(`[${ts}] [WA/${tag}] ${msg}`);
}

async function main() {
  // Get BRU-DTWZ's phone
  const { data: user } = await supabase.from('User').select('badgeCode, phone').eq('badgeCode', 'BRU-DTWZ').single();
  if (!user?.phone) { console.error("No phone for BRU-DTWZ"); process.exit(1); }
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
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 30000,
    emitOwnEvents: false,
    generateHighQualityLinkPreview: false,
  });

  sock.ev.on("creds.update", saveCreds);

  // Wait for connection or timeout
  let ready = false;
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) console.log("QR code needed — scan with WhatsApp");
    if (connection === "open") { ready = true; log("CONNECTED", "Ready to send"); }
    if (connection === "close") {
      const isLoggedOut = lastDisconnect?.error instanceof Boom
        && lastDisconnect.error.output.statusCode === DisconnectReason.loggedOut;
      if (isLoggedOut) console.log("LOGGED OUT — re-auth needed");
      ready = false;
    }
  });

  // Wait max 30s for connection
  await new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(), 30000);
    const check = setInterval(() => {
      if (ready) { clearInterval(check); clearTimeout(timeout); resolve(); }
    }, 200);
  });

  if (!ready) {
    log("FAIL", "Could not connect to WhatsApp within 30s");
    process.exit(1);
  }

  // Send DM with timeout protection
  const jid = user.phone.includes("@") ? user.phone : `${user.phone}@s.whatsapp.net`;
  const msg = [
    `━━━ NOIR BUREAU ━━━`,
    ``,
    `Test DM from Noir:GateWay announcer.`,
    ``,
    `This confirms WhatsApp DMs are operational.`,
    ``,
    `— Noir:GateWay Bureau`,
  ].join("\n");

  try {
    await Promise.race([
      sock.sendMessage(jid, { text: msg }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timed out")), 15000)),
    ]);
    log("SENT", `Message delivered to ${jid}`);
  } catch (e) {
    log("DM_FAIL", `to ${jid}: ${e.message}`);

    // Fallback: send to group instead
    const groupJid = "120363426099852261@g.us";
    log("FALLBACK", `Sending to group ${groupJid} instead...`);
    const fallbackMsg = [
      `━━━ NOIR BUREAU ━━━`,
      ``,
      `📬 Message for BRU-DTWZ:`,
      ``,
      `Test DM could not be delivered directly.`,
      `(WhatsApp privacy settings blocking)`,
      ``,
      `— Noir:GateWay Bureau`,
    ].join("\n");
    await sock.sendMessage(groupJid, { text: fallbackMsg });
    log("FALLBACK", `Group message sent`);
  }

  // Clean close
  sock.ws?.close();
  sock.end(undefined);
  log("CLOSED", "Connection closed cleanly");
  process.exit(0);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
