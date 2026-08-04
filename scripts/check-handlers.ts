import { readFileSync } from "node:fs";

const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const URL_BASE = "https://bovsdzvkhtcilsvkayec.supabase.co";
const KEY = (env.match(/^SUPABASE_SERVICE_ROLE_KEY="?([^\n]+)/m) || [])[1];
const headers = { apikey: KEY, Authorization: "Bearer " + KEY };

async function main() {
  const r = await fetch(
    URL_BASE + "/rest/v1/User?select=id,badgeCode,role,handler,phone&order=createdAt.asc",
    { headers }
  );
  const rows = await r.json();
  for (const u of rows) {
    if (u.role !== "AGENT" && u.role !== "BUREAU") continue;
    console.log(
      u.badgeCode.padEnd(10),
      u.role.padEnd(7),
      "id=" + String(u.id).slice(0, 8),
      "handler=" + String(u.handler || "").slice(0, 8),
      "phone=" + (u.phone || "-")
    );
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
