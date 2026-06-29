/**
 * Setup script: Promote a DET/AGT badge to BUREAU.
 * Usage: npx tsx scripts/setup-bureau.ts <badge-code>
 * 
 * This is a one-time setup to bootstrap the first admin.
 * After running, the badge owner can access /admin as BRU.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BADGE_PREFIXES: Record<string, string> = {
  DETECTIVE: "DET",
  AGENT: "AGT",
  BUREAU: "BRU",
};

function getBadgePrefix(role: string): string {
  return BADGE_PREFIXES[role] ?? "DET";
}

async function promoteToBureau(badgeCode: string) {
  const code = badgeCode.toUpperCase().trim();

  const user = await prisma.user.findUnique({ where: { badgeCode: code } });
  if (!user) {
    console.error(`* No user found with badge code: ${code}`);
    return false;
  }

  if (user.role === "BUREAU") {
    console.log(`* Already BUREAU: ${user.badgeCode} (${user.displayName})`);
    return true;
  }

  const prefix = getBadgePrefix("BUREAU");
  const suffix = user.badgeCode.split("-")[1] || user.badgeCode.slice(-4);
  const newBadgeCode = `${prefix}-${suffix}`;

  const existing = await prisma.user.findUnique({ where: { badgeCode: newBadgeCode } });
  if (existing && existing.id !== user.id) {
    console.error(`* Badge code collision: ${newBadgeCode} already taken`);
    return false;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      role: "BUREAU",
      badgeCode: newBadgeCode,
      isAdmin: true,
    },
  });

  console.log(`* Promoted to BUREAU:`);
  console.log(`  Old: ${user.badgeCode} (${user.displayName})`);
  console.log(`  New: ${newBadgeCode}`);
  console.log(`\nClaim this badge code at the site to access /admin.`);
  return true;
}

async function main() {
  const badgeCode = process.argv[2];
  if (!badgeCode) {
    console.error("Usage: npx tsx scripts/setup-bureau.ts <badge-code>");
    console.error("       npx tsx scripts/setup-bureau.ts list    # list all users");
    process.exit(1);
  }

  if (badgeCode === "list") {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { badgeCode: true, displayName: true, role: true, isAdmin: true },
    });
    console.log("Users:");
    for (const u of users) {
      const admin = u.isAdmin ? " [ADMIN]" : "";
      console.log(`  ${u.badgeCode.padEnd(12)} ${u.role.padEnd(10)} ${u.displayName}${admin}`);
    }
    return;
  }

  await promoteToBureau(badgeCode);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
