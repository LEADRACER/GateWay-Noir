#!/usr/bin/env node
/**
 * WhatsApp Announcer — Noir:GateWay Notification Cron
 *
 * Standalone ESM script — runs every 2 minutes via Hermes cron.
 *
 * Improvements over v1:
 * - 15s timeout on DMs (no more 90s hangs)
 * - DM failure → automatic group fallback
 * - Group JID from env (now set to GLA census group)
 * - Bot shows "Noir:GateWay Bureau" profile
 *
 * Auth state persisted in whatsapp-auth/.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";
import Pino from "pino";

// ─── Auto-Invite ───
import { processGroupInvites } from "./auto-invite.mjs";

// ─── Load .env ───
config({ path: resolve(process.cwd(), ".env"), override: false });
config({ path: resolve(process.cwd(), ".env.prod"), override: true });

// ─── Env ───
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const GROUP_JID = process.env.WHATSAPP_GROUP_JID || "";
const AUTH_DIR = resolve(process.cwd(), "whatsapp-auth");
const DM_TIMEOUT = 15000; // 15s max per DM

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
    "https://gate-way-noir.vercel.app/agent/tasks", "",
    "— Noir:GateWay Bureau",
  ].join("\n");
}

function fmtElevationRejected() {
  return [
    "━━━ NOIR BUREAU ━━━", "",
    "Your elevation request has been reviewed.", "",
    "STATUS: NOT APPROVED", "",
    "You may submit a new request after 30 days.", "",
    "— Noir:GateWay Bureau",
  ].join("\n");
}

function fmtTaskAssigned(title, admin) {
  return [
    "━━━ NOIR BUREAU ━━━", "",
    `New task assigned by ${admin}:`, "",
    `"${title}"`, "",
    "View & respond:",
    "https://gate-way-noir.vercel.app/agent/tasks", "",
    "— Noir:GateWay Bureau",
  ].join("\n");
}

function fmtTaskCompleted(agent, title) {
  return [
    "━━━ NOIR BUREAU ━━━", "",
    `Agent ${agent} completed a task:`, "",
    `"${title}"`, "",
    "— Noir:GateWay Bureau",
  ].join("\n");
}

function fmtTopicConcluded(title, verdict, slug) {
  return [
    "━━━ CASE CLOSED ━━━", "",
    `"${title}"`, "",
    `VERDICT: ${verdict}`, "",
    "Read the full case:",
    `https://gate-way-noir.vercel.app/topic/${slug}`, "",
    "— Noir:GateWay Bureau",
  ].join("\n");
}

function fmtGroupFallback(targetName, detail) {
  return [
    "━━━ NOIR BUREAU ━━━", "",
    `📬 Message for ${targetName}:`, "",
    detail, "",
    "(DM delivery failed — please contact bureau via portal)",
    "— Noir:GateWay Bureau",
  ].join("\n");
}

// ─── WhatsApp Client ───
let sock = null;
let ready = false;
let intentionalClose = false;

async function initClient() {
  if (sock && ready) return sock;

  if (!existsSync(AUTH_DIR)) mkdirSync(AUTH_DIR, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    browser: ["Noir:GateWay", "Chrome", "2.0.0"],
    connectTimeoutMs: 30000,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
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
      if (intentionalClose) return;
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

/**
 * Send text with a timeout.
 * Returns { sent: true } on success, { sent: false, reason } on failure.
 */
async function sendTextWithTimeout(to, text) {
  if (!sock) return { sent: false, reason: "not_connected" };
  try {
    const jid = to.includes("@") ? to : `${to}@s.whatsapp.net`;
    await Promise.race([
      sock.sendMessage(jid, { text }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timed out")), DM_TIMEOUT)),
    ]);
    return { sent: true };
  } catch (e) {
    const reason = e.message === "timed out" ? "timeout" : `error: ${e.message}`;
    log("SEND_FAIL", `to ${to}: ${reason}`);
    return { sent: false, reason };
  }
}

/**
 * Fire-and-forget DM attempt — never blocks the pipeline.
 * Logs result but doesn't return anything.
 */
function fireAndForgetDM(to, text) {
  if (!sock) return;
  const jid = to.includes("@") ? to : `${to}@s.whatsapp.net`;
  Promise.race([
    sock.sendMessage(jid, { text }),
    new Promise((_, reject) => setTimeout(() => reject(new Error("timed out")), DM_TIMEOUT)),
  ]).then(() => {
    log("DM_OK", `${jid}: delivered`);
  }).catch(e => {
    log("DM_SKIP", `${jid}: ${e.message} (group primary)`);
  });
}

/**
 * Send a text to the main group.
 */
async function sendGroupText(text) {
  if (!GROUP_JID) {
    log("GROUP_SKIP", "WHATSAPP_GROUP_JID not set");
    return false;
  }
  try {
    await Promise.race([
      sock.sendMessage(GROUP_JID, { text }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timed out")), DM_TIMEOUT)),
    ]);
    return true;
  } catch (e) {
    const reason = e.message === "timed out" ? "timeout" : `error: ${e.message}`;
    log("GROUP_FAIL", `${GROUP_JID}: ${reason}`);
    return false;
  }
}

function isReady() { return ready && sock !== null; }

async function closeClient() {
  intentionalClose = true;
  if (sock) { try { sock.ws?.close(); sock.end(undefined); } catch {} }
  sock = null; ready = false;
}

// ─── Notification Processors ───

async function processElevations() {
  const { data, error } = await supabase
    .from("ElevationRequest")
    .select(`*, "User"!userId(id, phone, badgeCode, displayName)`)
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
    const badge = user.badgeCode || user.displayName || `User#${user.id}`;
    const detail = r.status === "APPROVED"
      ? `${badge} → FIELD AGENT elevation approved. Access: https://gate-way-noir.vercel.app/agent/tasks`
      : `${badge} → elevation request rejected. May reapply after 30 days.`;

    // Group is primary channel — always send to group
    if (GROUP_JID) {
      await sendGroupText(fmtGroupFallback(badge, detail));
    }

    // Fire-and-forget DM as secondary channel
    const msg = r.status === "APPROVED" ? fmtElevationApproved(badge) : fmtElevationRejected();
    fireAndForgetDM(user.phone, msg);

    await supabase.from("ElevationRequest").update({ notified: true, updatedAt: new Date().toISOString() }).eq("id", r.id);
    sent++;
  }
  return sent;
}

async function processTaskAssignments() {
  const { data, error } = await supabase
    .from("AgentTask")
    .select(`*, "AgentUser":User!agentId(badgeCode, phone, displayName), "AdminUser":User!adminId(badgeCode, displayName)`)
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
    const agentLabel = agent.badgeCode || agent.displayName || `User#${agent.id}`;
    const adminLabel = admin?.badgeCode || admin?.displayName || "BRU-????";
    const detail = `🗂 New task for ${agentLabel}: "${t.title}" (assigned by ${adminLabel}). Check: https://gate-way-noir.vercel.app/agent/tasks`;

    // Group is primary channel
    if (GROUP_JID) {
      await sendGroupText(fmtGroupFallback(agentLabel, detail));
    }

    // Fire-and-forget DM
    const msg = fmtTaskAssigned(t.title, adminLabel);
    fireAndForgetDM(agent.phone, msg);

    await supabase.from("AgentTask").update({ notified: true }).eq("id", t.id);
    sent++;
  }
  return sent;
}

async function processTaskCompletions() {
  const { data, error } = await supabase
    .from("AgentTask")
    .select(`*, "AgentUser":User!agentId(badgeCode, displayName), "User"!adminId(id, phone, badgeCode, displayName)`)
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
    const agentLabel = agent?.badgeCode || agent?.displayName || "AGT-????";
    const adminLabel = admin.badgeCode || admin.displayName || `Admin#${admin.id}`;
    const detail = `✅ ${agentLabel} completed: "${t.title}".`;

    // Group is primary channel
    if (GROUP_JID) {
      await sendGroupText(fmtGroupFallback(adminLabel, detail));
    }

    // Fire-and-forget DM
    const msg = fmtTaskCompleted(agentLabel, t.title);
    fireAndForgetDM(admin.phone, msg);

    await supabase.from("AgentTask").update({ notified: true }).eq("id", t.id);
    sent++;
  }
  return sent;
}

async function processTopics() {
  if (!GROUP_JID) return 0;

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
    const ok = await sendGroupText(msg);
    await supabase.from("Topic").update({ announced: true }).eq("id", t.id);
    if (ok) sent++;
  }
  return sent;
}

// ─── Main ───
async function main() {
  log("START", "WhatsApp announcer v2 starting...");

  // Global timeout — abort after 60s total
  const globalTimeout = setTimeout(() => {
    log("TIMEOUT", "Global 60s timeout reached — exiting");
    closeClient().catch(() => {});
    process.exit(0);
  }, 60000);

  // Check auth exists
  if (!existsSync(resolve(AUTH_DIR, "creds.json"))) {
    log("NO_AUTH", "WhatsApp not authenticated. Run manually to scan QR.");
    log("NO_AUTH", `  cd ${process.cwd()} && node scripts/whatsapp-announcer.mjs`);
    clearTimeout(globalTimeout);
    process.exit(0);
  }

  try { await initClient(); }
  catch (e) { log("FATAL", `Init: ${e.message}`); clearTimeout(globalTimeout); process.exit(1); }

  if (!isReady()) {
    log("WARN", "Not connected — queuing for next run");
    clearTimeout(globalTimeout);
    process.exit(0);
  }

  log("READY", `WhatsApp connected — processing (DM timeout: ${DM_TIMEOUT/1000}s, group: ${GROUP_JID ? 'yes' : 'no'})`);

  const r = {
    i: await processGroupInvites(sock, supabase),
    e: await processElevations(),
    ta: await processTaskAssignments(),
    tc: await processTaskCompletions(),
    tp: await processTopics(),
  };

  const total = Object.values(r).reduce((a, b) => a + b, 0);
  log("DONE", `Processed ${total} notifications`);
  log("DONE", `  Group invites:     ${r.i}`);
  log("DONE", `  Elevations:        ${r.e}`);
  log("DONE", `  Task assignments:  ${r.ta}`);
  log("DONE", `  Task completions:  ${r.tc}`);
  log("DONE", `  Topic announce:    ${r.tp}`);

  clearTimeout(globalTimeout);
  await closeClient();
  log("END", "Announcer finished");
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
