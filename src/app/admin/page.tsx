import { getStats, getUpcomingTopics } from "@/lib/actions";
import { getPendingElevations, getApprovedElevations, getRejectedElevations } from "@/lib/elevation-actions";
import { getAllAgents } from "@/lib/admin-actions";
import { getCurrentUser } from "@/lib/get-current-user";
import { safeToISOString } from "@/lib/session-cookie";
import { ElevationsPanel } from "./ElevationsPanel";
import { BureauContent } from "./BureauContent";
import { DetHQ } from "@/components/hq/DetHQ";
import { AgentHQ } from "@/components/hq/AgentHQ";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <p className="text-zinc-500 text-sm">No badge detected. Claim a badge first.</p>
      </div>
    );
  }

  // DET view — elevation request + profile
  if (user.role === "DETECTIVE") {
    return <DetHQ />;
  }

  // AGT view — tasks + profile merged
  if (user.role === "AGENT") {
    return <AgentHQ />;
  }

  // BRU view — full admin HQ
  const [stats, upcomingTopics, pendingElevations, approvedElevations, rejectedElevations, agents] = await Promise.all([
    getStats(),
    getUpcomingTopics(),
    getPendingElevations(),
    getApprovedElevations(),
    getRejectedElevations(),
    getAllAgents(),
  ]);

  const serializedPending = pendingElevations.map((e: any) => ({
    ...e,
    createdAt: safeToISOString(e.createdAt),
    updatedAt: safeToISOString(e.updatedAt),
    user: { ...e.user, createdAt: safeToISOString(e.user?.createdAt) },
  }));

  const serializedApproved = approvedElevations.map((e: any) => ({
    ...e,
    createdAt: safeToISOString(e.createdAt),
    updatedAt: safeToISOString(e.updatedAt),
    user: { ...e.user, createdAt: safeToISOString(e.user?.createdAt) },
  }));

  const serializedRejected = rejectedElevations.map((e: any) => ({
    ...e,
    createdAt: safeToISOString(e.createdAt),
    updatedAt: safeToISOString(e.updatedAt),
    user: { ...e.user, createdAt: safeToISOString(e.user?.createdAt) },
  }));

  const serializedUpcoming = upcomingTopics.map((t: any) => ({
    ...t,
    createdAt: safeToISOString(t.createdAt),
  }));

  const serializedAgents = agents.map((a: any) => ({
    ...a,
    createdAt: safeToISOString(a.createdAt),
  }));

  return (
    <BureauContent
      stats={stats}
      upcomingTopics={serializedUpcoming}
      pendingElevations={serializedPending}
      approvedElevations={serializedApproved}
      rejectedElevations={serializedRejected}
      adminId={user.id}
      adminBadgeCode={user.badgeCode}
      agents={serializedAgents}
    />
  );
}
