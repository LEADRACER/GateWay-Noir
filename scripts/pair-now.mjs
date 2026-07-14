import makeWASocket, { DisconnectReason, useMultiFileAuthState } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { existsSync, rmSync, mkdirSync } from "fs";
import { resolve } from "path";

const AUTH = resolve("whatsapp-auth");
const PHONE = "919452056191";

if (existsSync(AUTH)) rmSync(AUTH, { recursive: true, force: true });
mkdirSync(AUTH, { recursive: true });

const { state, saveCreds } = await useMultiFileAuthState(AUTH);
let pairingSent = false;
let done = false;

function start() {
  const sock = makeWASocket({
    auth: state,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    browser: ["Noir:GateWay", "Chrome", "1.0.0"],
    connectTimeoutMs: 60000,
    generateHighQualityLinkPreview: false,
  });
  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (u) => {
    const { connection, lastDisconnect, qr } = u;

    if (qr && !state.creds.registered && !pairingSent) {
      pairingSent = true;
      try {
        const code = await sock.requestPairingCode(PHONE);
        console.log(code);
      } catch (e) {
        console.error("PAIRING_FAILED:", e.message);
      }
    }

    if (connection === "open" && state.creds.registered) {
      console.log("LINKED");
      done = true;
    }

    if (connection === "close" && !done) {
      const isLoggedOut = lastDisconnect?.error instanceof Boom
        && lastDisconnect.error.output.statusCode === DisconnectReason.loggedOut;
      if (isLoggedOut) {
        console.log("LOGGED_OUT");
        done = true;
      } else {
        setTimeout(start, 2000);
      }
    }
  });
}

start();
await new Promise(r => setTimeout(r, 130_000));
if (!done) console.log("TIMEOUT");
process.exit(done ? 0 : 1);
