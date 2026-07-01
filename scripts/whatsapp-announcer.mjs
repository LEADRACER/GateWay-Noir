#!/usr/bin/env node
/**
 * WhatsApp Announcer — Noir:GateWay Notification Cron
 *
 * Standalone ESM script — runs every 2 minutes via Hermes cron.
 * Handles all WhatsApp outbound notifications:
 *
 * 1. Elevation approved/rejected → notify the requesting user
 * 2. Task assigned → notify the agent
 * 3. Task completed → notify the admin who assigned it
 * 4. Topic concluded → broadcast to the bureau WhatsApp group
 *
 * First run prints a QR code — scan with WhatsApp to authenticate.
 * Auth state is persisted in whatsapp-auth/ for subsequent runs.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { existsSync, mkdirSync } from "fs";
import { resolve } from "path";

// ─── Load .env ───
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.prod") });

// ─── Env ───
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const AUTH_DIR = resolve(process.cwd(), "whatsapp-auth");

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Logger ───
function log(tag, msg) {
  const ts = new Date().toISOString().replace("T", " ").substring(0, 19);
  console.log(`[${ts}] [WA/${tag}] ${msg}`);
}

// ─── Message Formatting ───
function fmtElevationApproved(badgeCode) {
  return [
    "━━━ NOIR BUREAU ━━━", "",
    "Your badge has been elevated.", "",
    `AGT-CODE: ${badgeCode}`,
    "STATUS:   FIELD AGENT", "",
    "You are now a Field Agent of the Gateway:Noir Bureau of Investigation.",
    "Access your profile and tasks at:",
    "https://noirgateway.app/agent/tasks", "",
    "— Gateway Noir Bureau",
  ].join("\n");
}

function fmtElevationRejected() {
  return [
    "━━━ NOIR BUREAU ━━━", "",
    "Your elevation request has been reviewed.", "",
    "STATUS: NOT APPROVED", "",
    "You may submit a new request after 30 days.", "",
    "— Gateway Noir Bureau",
  ].join("\n");
}

function fmtTaskAssigned(title, admin) {
  return [
    "━━━ NOIR BUREAU ━━━", "",
    `New task assigned by ${admin}:`, "",
    `"${title}"`, "",
    "View & respond:",
    "https://noirgateway.app/agent/tasks", "",
    "— Gateway Noir Bureau",
  ].join("\n");
}

function fmtTaskCompleted(agent, title) {
  return [
    "━━━ NOIR BUREAU ━━━", "",
    `Agent ${agent} completed a task:`, "",
    `"${title}"`, "",
    "— Gateway Noir Bureau",
  ].join("\n");
}

function fmtTopicConcluded(title, verdict, slug) {
  return [
    "━━━ CASE CLOSED ━━━", "",
    `"${title}"`, "",
    `VERDICT: ${verdict}`, "",
    "Read the full case:",
    `https://noirgateway.app/topic/${slug}`, "",
    "— Gateway Noir Bureau",
  ].join("\n");
}

// ─── WhatsApp Client ───
let sock = null;
let ready = false;

async function initClient() {
  if (sock && ready) return sock;

  if (!existsSync(AUTH_DIR)) mkdirSync(AUTH_DIR, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    browser: ["Noir:GateWay", "Chrome", "1.0.0"],
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      // Print QR to stdout (Baileys printQRInTerminal writes to stderr — invisible)
      try {
        const { default: qrTerm } = await import("qrcode-terminal");
        qrTerm.generate(qr, { small: true });
      } catch {
        console.log(`\n  QR CODE (scan with WhatsApp):\n  ${qr}\n`);
      }
      log("QR_CODE", "Scan with WhatsApp to authenticate");
    }
    if (connection === "open") { ready = true; log("CONNECTED", "WhatsApp connected"); }
    if (connection === "close") {
      ready = false;
      const shouldReconnect =
        lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
          : true;
      log("DISCONNECTED", `Reconnect: ${shouldReconnect}`);
      if (shouldReconnect) {
        setTimeout(() => {
          sock = null; ready = false;
          initClient().catch(e => log("ERROR", `Reconnect: ${e.message}`));
        }, 3000);
      } else {
        sock = null;
        log("LOGGED_OUT", "Delete whatsapp-auth/ to re-authenticate");
      }
    }
  });

  // Wait up to 25s for connection
  await new Promise((resolve) => {
    const maxWait = setTimeout(() => resolve(), 25000);
    const check = setInterval(() => {
      if (ready) { clearInterval(check); clearTimeout(maxWait); resolve(); }
    }, 500);
  });

  return sock;
}

async function sendText(to, text) {
  if (!sock) return false;
  try {
    const jid = to.includes("@") ? to : `${to}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text });
    return true;
  } catch (e) {
    log("SEND_FAIL", `to ${to}: ${e.message}`);
    return false;
  }
}

function isReady() { return ready && sock !== null; }

async function closeClient() {
  if (sock) { try { sock.ws?.close(); sock.end(undefined); } catch {} }
  sock = null; ready = false;
}

// ─── Notification Processors ───

async function processElevations() {
  const { data, error } = await supabase
    .from("ElevationRequest")
    .select(`*, "User"!userId(id, phone, badgeCode)`)
    .in("status", ["APPROVED", "REJECTED"])
    .eq("notified", false)
    .limit(10);
  if (error) { log("ERR", `elevations: ${error.message}`); return 0; }
  if (!data?.length) return 0;

  let sent = 0;
  for (const r of data) {
    const user = r.User;
    if (!user?.phone) {
      await supabase.from("ElevationRequest").update({ notified: true, updatedAt: new Date().toISOString() }).eq("id", r.id);
      continue;
    }
    const msg = r.status === "APPROVED" ? fmtElevationApproved(user.badgeCode || "AGT-????") : fmtElevationRejected();
    const ok = await sendText(user.phone, msg);
    await supabase.from("ElevationRequest").update({ notified: true, updatedAt: new Date().toISOString() }).eq("id", r.id);
    if (ok) sent++;
  }
  return sent;
}

async function processTaskAssignments() {
  const { data, error } = await supabase
    .from("AgentTask")
    .select(`*, "AgentUser":User!agentId(badgeCode, phone), "AdminUser":User!adminId(badgeCode, displayName)`)
    .eq("status", "PENDING")
    .eq("notified", false)
    .limit(10);
  if (error) { log("ERR", `tasks: ${error.message}`); return 0; }
  if (!data?.length) return 0;

  let sent = 0;
  for (const t of data) {
    const agent = t.AgentUser;
    const admin = t.AdminUser;
    if (!agent?.phone) {
      await supabase.from("AgentTask").update({ notified: true }).eq("id", t.id);
      continue;
    }
    const adminLabel = admin?.badgeCode || admin?.displayName || "BRU-????";
    const msg = fmtTaskAssigned(t.title, adminLabel);
    const ok = await sendText(agent.phone, msg);
    await supabase.from("AgentTask").update({ notified: true }).eq("id", t.id);
    if (ok) sent++;
  }
  return sent;
}

async function processTaskCompletions() {
  const { data, error } = await supabase
    .from("AgentTask")
    .select(`*, "AgentUser":User!agentId(badgeCode), "User"!adminId(id, phone)`)
    .eq("status", "COMPLETED")
    .eq("notified", false)
    .limit(10);
  if (error) { log("ERR", `completions: ${error.message}`); return 0; }
  if (!data?.length) return 0;

  let sent = 0;
  for (const t of data) {
    const agent = t.AgentUser;
    const admin = t.User;
    if (!admin?.phone) {
      await supabase.from("AgentTask").update({ notified: true }).eq("id", t.id);
      continue;
    }
    const msg = fmtTaskCompleted(agent?.badgeCode || "AGT-????", t.title);
    const ok = await sendText(admin.phone, msg);
    await supabase.from("AgentTask").update({ notified: true }).eq("id", t.id);
    if (ok) sent++;
  }
  return sent;
}

async function processTopics() {
  const groupJid = process.env.WHATSAPP_GROUP_JID;
  if (!groupJid) return 0;

  const { data, error } = await supabase
    .from("Topic")
    .select("id, title, slug, verdict")
    .eq("status", "CONCLUDED")
    .eq("announced", false)
    .limit(10);
  if (error) { log("ERR", `topics: ${error.message}`); return 0; }
  if (!data?.length) return 0;

  let sent = 0;
  for (const t of data) {
    const msg = fmtTopicConcluded(t.title, t.verdict || "UNSOLVED", t.slug);
    const ok = await sendText(groupJid, msg);
    await supabase.from("Topic").update({ announced: true }).eq("id", t.id);
    if (ok) sent++;
  }
  return sent;
}

// ─── Main ───
async function main() {
  log("START", "WhatsApp announcer starting...");

  try { await initClient(); }
  catch (e) { log("FATAL", `Init: ${e.message}`); process.exit(1); }

  if (!isReady()) log("WARN", "Not connected — queuing for next run");
  else log("READY", "WhatsApp connected — processing");

  const r = {
    e: await processElevations(),
    ta: await processTaskAssignments(),
    tc: await processTaskCompletions(),
    tp: await processTopics(),
  };

  log("DONE", `Processed ${Object.values(r).reduce((a, b) => a + b, 0)} notifications`);
  log("DONE", `  Elevations:        ${r.e}`);
  log("DONE", `  Task assignments:  ${r.ta}`);
  log("DONE", `  Task completions:  ${r.tc}`);
  log("DONE", `  Topic announcemts: ${r.tp}`);

  await closeClient();
  log("END", "Announcer finished");
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
