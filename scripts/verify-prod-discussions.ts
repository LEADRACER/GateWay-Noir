import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";

const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const get = (k: string) => (env.match(new RegExp(`^${k}=(.+)$`, "m")) || [])[1]?.trim();

async function main() {
  const badgeCode = process.argv[2] || "BRU-DTWZ";
  const secret = get("SESSION_SECRET") || get("NEXTAUTH_SECRET");
  if (!secret) throw new Error("missing SESSION_SECRET in .env");
  // Exact replica of createSessionToken()
  const payload = JSON.stringify({ b: badgeCode, e: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 });
  const body = Buffer.from(payload).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  const cookie = `noirgateway_session=${body}.${sig}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax; Secure; HttpOnly`;

  const base = "https://gate-way-noir.vercel.app";
  const r1 = await fetch(base + "/api/agent/discussions", { headers: { Cookie: cookie } });
  const j1 = await r1.json();
  console.log("LIST status:", r1.status);
  if (r1.status === 200 && Array.isArray(j1.discussions)) {
    console.log("discussions:", j1.discussions.length);
    for (const d of j1.discussions) {
      console.log("  -", d.title, "| isOpen:", d.isOpen, "| createdBy:", JSON.stringify(d.createdBy), "| _count:", JSON.stringify(d._count), "| has User key:", "User" in d);
      const r2 = await fetch(base + `/api/agent/discussions/${d.id}/messages`, { headers: { Cookie: cookie } });
      const j2 = await r2.json();
      console.log("  MESSAGES status:", r2.status, "| count:", Array.isArray(j2.messages) ? j2.messages.length : JSON.stringify(j2));
    }
  } else {
    console.log("body:", JSON.stringify(j1).slice(0, 200));
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
