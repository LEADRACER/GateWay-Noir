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

  // 1) CREATE as BUREAU
  const create = await fetch(BASE + "/api/agent/discussions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: bru },
    body: JSON.stringify({ title: "E2E TEMP", description: "delete me after test" }),
  });
  const created = await create.json();
  check("POST create (BRU)", create.status === 201 && created.discussion?.id, `-> ${create.status}`);
  const id = created.discussion?.id;
  if (!id) { console.log("  aborting — no id"); process.exit(1); }

  // 2) EDIT name + description as creator (BUREAU)
  const edit = await fetch(BASE + `/api/agent/discussions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: bru },
    body: JSON.stringify({ title: "E2E EDITED", description: "edited desc" }),
  });
  const edited = await edit.json();
  check("PATCH edit (BRU)", edit.status === 200 && edited.discussion?.title === "E2E EDITED" && edited.discussion?.description === "edited desc", `-> ${edit.status} title="${edited.discussion?.title}" desc="${edited.discussion?.description}"`);

  // 3) EDIT empty title -> 400
  const bad = await fetch(BASE + `/api/agent/discussions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: bru },
    body: JSON.stringify({ title: "   " }),
  });
  check("PATCH empty title -> 400", bad.status === 400, `-> ${bad.status}`);

  // 4) EDIT as non-creator AGENT -> 403
  const forbidden = await fetch(BASE + `/api/agent/discussions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: agt },
    body: JSON.stringify({ title: "hijack" }),
  });
  check("PATCH as other AGENT -> 403", forbidden.status === 403, `-> ${forbidden.status}`);

  // 5) title unchanged after 403
  const after403 = await fetch(BASE + "/api/agent/discussions", { headers: { Cookie: bru } });
  const list1 = await after403.json();
  const row = list1.discussions?.find((d: any) => d.id === id);
  check("row survived 403, title intact", row?.title === "E2E EDITED", `-> "${row?.title}"`);

  // 6) EDIT description only (title untouched)
  const descOnly = await fetch(BASE + `/api/agent/discussions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: bru },
    body: JSON.stringify({ description: "" }),
  });
  const descResult = await descOnly.json();
  check("PATCH description-only (clear)", descOnly.status === 200 && descResult.discussion?.title === "E2E EDITED" && descResult.discussion?.description === null, `-> ${descOnly.status}`);

  // 7) cleanup temp row — no app DELETE endpoint by design, remove via service-role
  const supabaseUrl = get("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRole = get("SUPABASE_SERVICE_ROLE_KEY");
  const cleanup = await fetch(`${supabaseUrl}/rest/v1/AgentDiscussion?id=eq.${id}`, {
    method: "DELETE",
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      Prefer: "return=minimal",
    },
  });
  check("cleanup temp row (service-role)", cleanup.status === 204, `-> ${cleanup.status}`);

  // 8) confirm gone
  const afterClean = await fetch(BASE + "/api/agent/discussions", { headers: { Cookie: bru } });
  const list2 = await afterClean.json();
  check("temp row removed", !list2.discussions?.some((d: any) => d.id === id));

  console.log(`\n${pass} passed / ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
