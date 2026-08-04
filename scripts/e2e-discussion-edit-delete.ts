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

  // 2) EDIT as creator (BUREAU)
  const edit = await fetch(BASE + `/api/agent/discussions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: bru },
    body: JSON.stringify({ title: "E2E EDITED", description: "" }),
  });
  const edited = await edit.json();
  check("PATCH edit (BRU)", edit.status === 200 && edited.discussion?.title === "E2E EDITED", `-> ${edit.status} title="${edited.discussion?.title}"`);

  // 3) EDIT with empty title -> 400
  const bad = await fetch(BASE + `/api/agent/discussions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: bru },
    body: JSON.stringify({ title: "   " }),
  });
  check("PATCH empty title -> 400", bad.status === 400, `-> ${bad.status}`);

  // 4) DELETE as non-creator AGENT -> 403
  const forbidden = await fetch(BASE + `/api/agent/discussions/${id}`, {
    method: "DELETE",
    headers: { Cookie: agt },
  });
  check("DELETE as other AGENT -> 403", forbidden.status === 403, `-> ${forbidden.status}`);

  // 5) DISCUSSION still exists after 403
  const after403 = await fetch(BASE + "/api/agent/discussions", { headers: { Cookie: bru } });
  const list1 = await after403.json();
  check("row survived 403", Array.isArray(list1.discussions) && list1.discussions.some((d: any) => d.id === id));

  // 6) DELETE as creator (BUREAU)
  const del = await fetch(BASE + `/api/agent/discussions/${id}`, { method: "DELETE", headers: { Cookie: bru } });
  check("DELETE as creator (BRU)", del.status === 200, `-> ${del.status}`);

  // 7) gone from list, original untouched
  const afterDel = await fetch(BASE + "/api/agent/discussions", { headers: { Cookie: bru } });
  const list2 = await afterDel.json();
  check("row removed", Array.isArray(list2.discussions) && !list2.discussions.some((d: any) => d.id === id));
  check("original 'Test Discussion' intact", list2.discussions?.some((d: any) => d.title === "Test Discussion"));

  // 8) DELETE again -> 404
  const again = await fetch(BASE + `/api/agent/discussions/${id}`, { method: "DELETE", headers: { Cookie: bru } });
  check("DELETE missing -> 404", again.status === 404, `-> ${again.status}`);

  console.log(`\n${pass} passed / ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
