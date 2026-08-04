import { readFileSync } from "node:fs";
import { normalizePhone } from "../src/lib/phone";

const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const URL_BASE = "https://bovsdzvkhtcilsvkayec.supabase.co";
const KEY = (env.match(/^SUPABASE_SERVICE_ROLE_KEY="?([^\n]+)/m) || [])[1];

const headers = { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json" };

async function main() {
  const rows = await (
    await fetch(URL_BASE + "/rest/v1/User?select=id,badgeCode,phone&phone=not.is.null", { headers })
  ).json();

  let changed = 0;
  for (const u of rows) {
    const norm = normalizePhone(u.phone);
    if (norm && norm !== u.phone) {
      const r = await fetch(URL_BASE + "/rest/v1/User?id=eq." + u.id, {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({ phone: norm }),
      });
      console.log("FIXED", u.badgeCode, "->", norm, r.status);
      changed++;
    } else {
      console.log("OK   ", u.badgeCode, norm ? "already E.164" : "UNCHANGED (invalid, skipped)");
    }
  }
  console.log(changed === 0 ? "BACKFILL: nothing to fix" : "BACKFILL: " + changed + " updated");
}

main().catch((e) => { console.error(e); process.exit(1); });
