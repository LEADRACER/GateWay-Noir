/**
 * Setup script: Promote a DET/AGT badge to BUREAU.
 * Usage: npx tsx scripts/setup-bureau.ts <badge-code>
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 * (or NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY as fallback).
 */

import { createScriptSupabaseClient } from "./lib";
import { reprefixBadgeCode } from "../src/lib/badge";

async function promoteToBureau(badgeCode: string) {
  const supabase = createScriptSupabaseClient();
  const code = badgeCode.toUpperCase().trim();

  const { data: user } = await supabase
    .from('User')
    .select("*")
    .eq("badgeCode", code)
    .single();

  if (!user) {
    console.error(`* No user found with badge code: ${code}`);
    return false;
  }

  if (user.role === "BUREAU") {
    console.log(`* Already BUREAU: ${user.badgeCode} (${user.displayName})`);
    return true;
  }

  const newBadgeCode = reprefixBadgeCode(code, "BUREAU");

  const { data: existing } = await supabase
    .from('User')
    .select("id")
    .eq("badgeCode", newBadgeCode)
    .maybeSingle();

  if (existing && existing.id !== user.id) {
    console.error(`* Badge code collision: ${newBadgeCode} already taken`);
    return false;
  }

  await supabase
    .from('User')
    .update({ role: "BUREAU", badgeCode: newBadgeCode, isAdmin: true })
    .eq("id", user.id);

  console.log(`* Promoted to BUREAU:`);
  console.log(`  Old: ${user.badgeCode} (${user.displayName})`);
  console.log(`  New: ${newBadgeCode}`);
  console.log(`\nClaim this badge code at the site to access /admin.`);
  return true;
}

async function listUsers() {
  const supabase = createScriptSupabaseClient();

  const { data: users } = await supabase
    .from('User')
    .select("badgeCode, displayName, role, isAdmin")
    .order("createdAt", { ascending: false });

  console.log("Users:");
  for (const u of users || []) {
    const admin = u.isAdmin ? " [ADMIN]" : "";
    console.log(`  ${u.badgeCode.padEnd(12)} ${u.role.padEnd(10)} ${u.displayName}${admin}`);
  }
}

async function main() {
  const badgeCode = process.argv[2];
  if (!badgeCode) {
    console.error("Usage: npx tsx scripts/setup-bureau.ts <badge-code>");
    console.error("       npx tsx scripts/setup-bureau.ts list    # list all users");
    process.exit(1);
  }

  if (badgeCode === "list") {
    await listUsers();
    return;
  }

  await promoteToBureau(badgeCode);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
