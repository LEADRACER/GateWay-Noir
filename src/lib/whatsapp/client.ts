/**
 * WhatsApp Baileys Client — Session Manager
 *
 * Provides a singleton Baileys WhatsApp Web socket with:
 * - Multi-file auth state persistence
 * - Auto-reconnect on disconnect
 * - QR code logging for initial authentication
 * - sendText() for sending individual messages
 *
 * Designed for standalone script usage (cron jobs, announcer).
 * NOT suitable for Vercel serverless — use the notification queue
 * pattern for server actions.
 *
 * Auth state is stored in whatsapp-auth/ relative to process.cwd().
 */

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  type WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import * as fs from "fs";
import * as path from "path";
import { log } from "./logger";

const AUTH_DIR = path.resolve(process.cwd(), "whatsapp-auth");
const DM_TIMEOUT = 15000; // 15s max per DM attempt
let GROUP_JID = ""; // set via setGroupJid()

let sock: WASocket | null = null;
let connectionReady = false;

function ensureAuthDir() {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }
}

/**
 * Get the auth state directory path.
 */
export function getAuthDir(): string {
  return AUTH_DIR;
}

/**
 * Initialize the WhatsApp client (Baileys socket).
 * Returns the socket once the connection is ready.
 * On first run, logs a QR code that must be scanned with WhatsApp.
 */
export async function initializeClient(): Promise<WASocket> {
  if (sock && connectionReady) return sock;

  ensureAuthDir();

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    syncFullHistory: false,
    // Don't mark messages as read
    markOnlineOnConnect: false,
    // Browser info
    browser: ["Noir:GateWay", "Chrome", "1.0.0"],
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      log("QR_CODE", "Scan this QR code with WhatsApp to authenticate");
    }

    if (connection === "open") {
      connectionReady = true;
      log("CONNECTED", "WhatsApp client connected successfully");
      log("USER", `Logged in as: ${sock?.user?.id || "unknown"}`);
    }

    if (connection === "close") {
      connectionReady = false;
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut;

      log("DISCONNECTED", `WhatsApp disconnected. Reconnect: ${shouldReconnect}`);

      if (shouldReconnect) {
        // Auto-reconnect after 3 seconds
        setTimeout(() => {
          log("RECONNECT", "Attempting reconnect...");
          sock = null;
          connectionReady = false;
          initializeClient().catch((err) => {
            log("ERROR", `Reconnect failed: ${err.message}`);
          });
        }, 3000);
      } else {
        log("LOGGED_OUT", "WhatsApp logged out. Delete auth dir to re-authenticate.");
        sock = null;
      }
    }
  });

  // Wait for connection or timeout after 30s
  await waitForConnection(30000);

  return sock;
}

/**
 * Wait for the connection to be ready, or timeout.
 */
function waitForConnection(timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    if (connectionReady) {
      resolve();
      return;
    }

    const check = setInterval(() => {
      if (connectionReady) {
        clearInterval(check);
        clearTimeout(timer);
        resolve();
      }
    }, 500);

    const timer = setTimeout(() => {
      clearInterval(check);
      // Resolve anyway — the socket may be connecting in background
      resolve();
    }, timeoutMs);
  });
}

/**
 * Set the default group JID for fallback delivery.
 */
export function setGroupJid(jid: string): void {
  GROUP_JID = jid;
  log("CONFIG", `Group JID set to ${jid}`);
}

/**
 * Send a text message to a phone number or JID with timeout protection.
 * Returns `true` on delivery, `false` on failure/timeout.
 */
export async function sendText(to: string, text: string): Promise<boolean> {
  if (!sock) {
    log("ERROR", "WhatsApp client not initialized");
    return false;
  }

  try {
    const jid = to.includes("@") ? to : `${to}@s.whatsapp.net`;

    await Promise.race([
      sock.sendMessage(jid, { text }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timed out")), DM_TIMEOUT)),
    ]);
    log("SENT", `DM to ${jid}: ${text.substring(0, 50)}...`);
    return true;
  } catch (err: any) {
    log("DM_FAIL", `to ${to}: ${err.message}`);
    return false;
  }
}

/**
 * Send a text message to the default group (group JID must be set via setGroupJid).
 * Falls back to JID-based sendText if called with a group JID argument.
 */
export async function sendGroupText(text: string, groupJid?: string): Promise<boolean> {
  const jid = groupJid || GROUP_JID;
  if (!jid) {
    log("GROUP_FAIL", "No group JID configured — call setGroupJid() first");
    return false;
  }

  try {
    await Promise.race([
      sock!.sendMessage(jid, { text }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timed out")), DM_TIMEOUT)),
    ]);
    log("SENT", `Group ${jid}: ${text.substring(0, 50)}...`);
    return true;
  } catch (err: any) {
    log("GROUP_FAIL", `${jid}: ${err.message}`);
    return false;
  }
}

/**
 * Check if the client is ready.
 */
export function isReady(): boolean {
  return connectionReady && sock !== null;
}

/**
 * Close the WhatsApp client connection gracefully.
 */
export async function closeClient(): Promise<void> {
  if (sock) {
    try {
      sock.ws?.close();
      sock.end(undefined);
    } catch {
      // Ignore close errors
    }
    sock = null;
    connectionReady = false;
    log("CLOSED", "WhatsApp client closed");
  }
}
