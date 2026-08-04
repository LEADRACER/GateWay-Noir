import { readFileSync } from "node:fs";

const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const URL_BASE = "https://bovsdzvkhtcilsvkayec.supabase.co";
const KEY = (env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m) || [])[1]?.trim();
if (!KEY) throw new Error("missing key");
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function main() {
  const disc = await (
    await fetch(
      URL_BASE + "/rest/v1/AgentDiscussion?select=id,title,isOpen,createdById,createdAt&order=createdAt.desc&limit=20",
      { headers }
    )
  ).json();
  console.log("Discussion rows:", Array.isArray(disc) ? disc.length : JSON.stringify(disc));
  for (const d of (Array.isArray(disc) ? disc : []).slice(0, 10)) {
    console.log(
      (d.isOpen ? "OPEN " : "CLOSED"),
      String(d.title || "-").slice(0, 40),
      "by=" + String(d.createdById || "").slice(0, 8),
      String(d.createdAt || "").slice(0, 16)
    );
  }
  const msgs = await (
    await fetch(
      URL_BASE + "/rest/v1/AgentDiscussionMessage?select=id,discussionId,authorId,createdAt&order=createdAt.desc&limit=5",
      { headers }
    )
  ).json();
  console.log("DiscussionMessage rows:", Array.isArray(msgs) ? msgs.length : JSON.stringify(msgs));
  const topic = await (
    await fetch(
      URL_BASE + "/rest/v1/Topic?select=id,title,status&limit=5",
      { headers }
    )
  ).json();
  console.log("Topic rows (sample):", Array.isArray(topic) ? topic.length : JSON.stringify(topic));
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
