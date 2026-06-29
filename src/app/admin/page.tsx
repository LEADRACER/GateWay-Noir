import { getStats, getUpcomingTopics } from "@/lib/actions";
import { getPendingElevations, getApprovedElevations, getRejectedElevations } from "@/lib/elevation-actions";
import { getCurrentUser } from "@/lib/get-current-user";
import { FileText } from "lucide-react";
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
  const [stats, upcomingTopics, pendingElevations, approvedElevations, rejectedElevations] = await Promise.all([
    getStats(),
    getUpcomingTopics(),
    getPendingElevations(),
    getApprovedElevations(),
    getRejectedElevations(),
  ]);

  const serializedPending = pendingElevations.map((e: any) => ({
    ...e,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    user: { ...e.user, createdAt: e.user.createdAt.toISOString() },
  }));

  const serializedApproved = approvedElevations.map((e: any) => ({
    ...e,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    user: { ...e.user, createdAt: e.user.createdAt.toISOString() },
  }));

  const serializedRejected = rejectedElevations.map((e: any) => ({
    ...e,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    user: { ...e.user, createdAt: e.user.createdAt.toISOString() },
  }));

  const serializedUpcoming = upcomingTopics.map((t: any) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <BureauContent
      stats={stats}
      upcomingTopics={serializedUpcoming}
      pendingElevations={serializedPending}
      approvedElevations={serializedApproved}
      rejectedElevations={serializedRejected}
    />
  );
}
