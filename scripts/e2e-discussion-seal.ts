import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";

const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const get = (k: string) => (env.match(new RegExp(`^${k}=(.+)$`, "m")) || [])[1]?.trim();

const secret = get("SESSION_SECRET") || get("NEXTAUTH_SECRET");
if (!secret) throw new Error("missing SESSION_SECRET");

function cookie(badgeCode: string): string {
  const payload = JSON.stringify({ b: badgeCode, e: Math.floor(Date.now() / 1000) + 3600 });
  const body = Buffer.from(payload).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `noirgateway_session=${body}.${sig}`;
}

const BASE = "http://localhost:3000";
let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, extra = "") {
  if (ok) { pass++; console.log(`  ✅ ${name} ${extra}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
}

async function main() {
  const bru = cookie("BRU-DTWZ");
  const agt = cookie("AGT-HGCR");

  // 1) CREATE a throwaway discussion as BUREAU
  const created = await (
    await fetch(BASE + "/api/agent/discussions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: bru },
      body: JSON.stringify({ title: `SEAL TEST ${Date.now()}`, description: "seal e2e" }),
    })
  ).json();
  const id = created.discussion?.id;
  check("create discussion", !!id);

  // 2) Two agents comment (while OPEN)
  const c1 = await (
    await fetch(`${BASE}/api/agent/discussions/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: agt },
      body: JSON.stringify({ content: "Lead sighted near the docks at midnight." }),
    })
  ).json();
  const c2 = await (
    await fetch(`${BASE}/api/agent/discussions/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: bru },
      body: JSON.stringify({ content: "Confirmed. Keeping the warehouse under watch. Second line for the summary." }),
    })
  ).json();
  check("comment by AGENT", !!c1.message);
  check("comment by BUREAU", !!c2.message);

  // 3) CLOSE it
  const closed = await (
    await fetch(`${BASE}/api/agent/discussions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: bru },
      body: JSON.stringify({ isOpen: false }),
    })
  ).json();
  check("close", closed.discussion?.isOpen === false);

  // 4) REOPEN → comments must be wiped into a summary
  const reopened = await (
    await fetch(`${BASE}/api/agent/discussions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: bru },
      body: JSON.stringify({ isOpen: true }),
    })
  ).json();
  const d = reopened.discussion;
  check("reopen", d?.isOpen === true);
  check("summary set", !!d?.summary, d?.summary ?? "");
  check(
    "summary format",
    /^\d+ comments? · .+ · last \d{4}-\d{2}-\d{2} — /.test(d?.summary ?? ""),
    d?.summary ?? ""
  );

  // 5) Messages gone
  const getMsgs = await (
    await fetch(`${BASE}/api/agent/discussions/${id}/messages`, { headers: { Cookie: bru } })
  ).json();
  check(
    "messages wiped",
    Array.isArray(getMsgs.messages) && getMsgs.messages.length === 0,
    `got ${getMsgs.messages?.length}`
  );

  // 6) Re-patching isOpen:true on an already-open discussion must NOT re-seal
  const again = await (
    await fetch(`${BASE}/api/agent/discussions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: bru },
      body: JSON.stringify({ isOpen: true }),
    })
  ).json();
  check("idempotent reopen — summary preserved", again.discussion?.summary === d?.summary);

  console.log(`\n${pass} passed, ${fail} failed`);
  console.log(`SEAL_TEST_ID=${id}`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
