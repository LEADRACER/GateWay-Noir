"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Fingerprint, CheckCircle2, XCircle, LayoutDashboard, ShieldCheck, ShieldX } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { PasswordDialog } from "@/components/ui/PasswordDialog";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

interface ElevationUser {
  badgeCode: string;
  displayName: string;
  createdAt: string;
}

interface ElevationRequest {
  id: string;
  userId: string;
  adminId: string | null;
  requestedRole: string;
  status: string;
  message: string | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  user: ElevationUser;
}

interface ElevationsPanelProps {
  pendingElevations: ElevationRequest[];
  approvedElevations: ElevationRequest[];
  rejectedElevations: ElevationRequest[];
  adminId?: string;
  adminBadgeCode: string;
}

export function ElevationsPanel({
  pendingElevations: initialPending,
  approvedElevations: initialApproved,
  rejectedElevations: initialRejected,
  adminId,
  adminBadgeCode,
}: ElevationsPanelProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "elevations">("dashboard");
  const [pending, setPending] = useState(initialPending);
  const [approved, setApproved] = useState(initialApproved);
  const [rejected, setRejected] = useState(initialRejected);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [passwordAction, setPasswordAction] = useState<{
    type: "approve" | "reject";
    requestId: string;
  } | null>(null);

  // Auto-activate elevations tab if navigated via #elevations hash
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#elevations") {
      setActiveTab("elevations");
    }
  }, []);

  const handleApprove = async (requestId: string) => {
    setPasswordAction({ type: "approve", requestId });
  };

  const handleReject = async (requestId: string) => {
    setPasswordAction({ type: "reject", requestId });
  };

  const executeAfterVerify = async (verifiedAdminId: string) => {
    if (!passwordAction) return;
    const { type, requestId } = passwordAction;
    setPasswordAction(null);
    setProcessingId(requestId);

    try {
      if (type === "approve") {
        const res = await fetch("/api/elevation/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId, adminId: verifiedAdminId }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success(`Elevation approved — new badge: ${data.newBadgeCode}`);
          const approvedReq = pending.find((e) => e.id === requestId);
          if (approvedReq) {
            setPending((prev) => prev.filter((e) => e.id !== requestId));
            setApproved((prev) => [{ ...approvedReq, status: "APPROVED" }, ...prev].slice(0, 10));
          }
        } else {
          toast.error(data.error || "Failed to approve");
        }
      } else {
        const res = await fetch("/api/elevation/reject", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success("Elevation rejected");
          const rejectedReq = pending.find((e) => e.id === requestId);
          if (rejectedReq) {
            setPending((prev) => prev.filter((e) => e.id !== requestId));
            setRejected((prev) => [{ ...rejectedReq, status: "REJECTED" }, ...prev].slice(0, 10));
          }
        } else {
          toast.error(data.error || "Failed to reject");
        }
      }
    } catch {
      toast.error("Network error — failed to process");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <>
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-[#111113] border border-[rgba(168,144,112,0.08)] p-1">
        <button
          onClick={() => { setActiveTab("dashboard"); window.location.hash = ""; }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium typewriter-label transition-colors ${
            activeTab === "dashboard"
              ? "bg-[#0d0d0f] text-zinc-200 border border-[rgba(168,144,112,0.12)]"
              : "text-zinc-600 hover:text-zinc-400 border border-transparent"
          }`}
        >
          <LayoutDashboard className="w-3 h-3" />
          DASHBOARD
        </button>
        <button
          onClick={() => { setActiveTab("elevations"); window.location.hash = "elevations"; }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium typewriter-label transition-colors ${
            activeTab === "elevations"
              ? "bg-[#0d0d0f] text-[#d97706] border border-[rgba(217,119,6,0.12)]"
              : "text-zinc-600 hover:text-zinc-400 border border-transparent"
          }`}
        >
          <Fingerprint className="w-3 h-3" />
          ELEVATIONS
          {pending.length > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 bg-[#d97706] text-black text-[8px] font-bold">
              {pending.length}
            </span>
          )}
        </button>
      </div>

      {/* Elevations Content */}
      {activeTab === "elevations" && (
        <motion.div
          id="elevations"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {/* Pending Requests */}
          <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)]">
            <div className="h-0.5 evidence-tape" />
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center justify-center w-7 h-7 bg-[rgba(217,119,6,0.08)] border border-[rgba(217,119,6,0.12)]">
                  <Fingerprint className="w-3.5 h-3.5 text-[#d97706] opacity-50" />
                </div>
                <div>
                  <h3 className="text-zinc-300 font-semibold typewriter-label text-xs">PENDING ELEVATION REQUESTS</h3>
                  <p className="text-[10px] text-zinc-600">
                    {pending.length} request{pending.length !== 1 ? "s" : ""} awaiting review
                  </p>
                </div>
              </div>

              {pending.length === 0 ? (
                <div className="text-center py-8">
                  <Fingerprint className="w-6 h-6 text-zinc-700 mx-auto mb-2 opacity-50" />
                  <p className="text-zinc-600 text-[10px] typewriter-label">NO PENDING REQUESTS</p>
                  <p className="text-zinc-700 text-[10px] mt-0.5">All elevation requests have been processed</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {pending.map((elevation) => (
                    <div
                      key={elevation.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)]"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Badge
                            className="text-[9px]"
                            style={{
                              backgroundColor: "#d9770612",
                              borderColor: "#d9770625",
                              color: "#d97706",
                            }}
                          >
                            {elevation.user.badgeCode}
                          </Badge>
                          <span className="case-number">
                            <span className="status-dot pending mr-1" />
                            {elevation.requestedRole}
                          </span>
                        </div>
                        <h4 className="text-xs font-medium text-zinc-400 truncate">
                          {elevation.user.displayName}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] text-zinc-600">{formatDate(elevation.createdAt)}</span>
                          {elevation.message && (
                            <span className="text-[9px] text-zinc-500 truncate">— &ldquo;{elevation.message}&rdquo;</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleReject(elevation.id)}
                          disabled={processingId === elevation.id}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-[#dc2626]/10 text-[#dc2626] border border-[#dc2626]/15 hover:bg-[#dc2626]/20 typewriter-label disabled:opacity-40"
                        >
                          {processingId === elevation.id ? "..." : <><XCircle className="w-3 h-3" /> REJECT</>}
                        </button>
                        <button
                          onClick={() => handleApprove(elevation.id)}
                          disabled={processingId === elevation.id}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-[#d97706] text-black typewriter-label disabled:opacity-40"
                        >
                          {processingId === elevation.id ? "..." : <><CheckCircle2 className="w-3 h-3" /> APPROVE</>}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recently Approved & Rejected — side by side on larger screens */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Recently Approved */}
            <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)]">
              <div className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-3 h-3 text-[#16a34a] opacity-60" />
                  <span className="text-zinc-400 font-semibold typewriter-label text-[10px]">RECENTLY APPROVED</span>
                </div>
                {approved.length === 0 ? (
                  <div className="text-center py-5">
                    <CheckCircle2 className="w-4 h-4 text-zinc-700 mx-auto mb-1.5 opacity-40" />
                    <p className="text-zinc-700 text-[9px] typewriter-label">NO APPROVED REQUESTS YET</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {approved.map((elevation) => (
                      <div
                        key={elevation.id}
                        className="flex items-center gap-2 p-2 bg-[#0a0a0c] border border-[rgba(22,163,74,0.06)]"
                      >
                        <span className="text-[9px] font-mono text-[#16a34a]/70">{elevation.user.badgeCode}</span>
                        <span className="text-[9px] text-zinc-500 truncate">{elevation.user.displayName}</span>
                        <span className="text-[8px] text-zinc-700 ml-auto">{formatDate(elevation.updatedAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recently Rejected */}
            <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)]">
              <div className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldX className="w-3 h-3 text-[#dc2626] opacity-60" />
                  <span className="text-zinc-400 font-semibold typewriter-label text-[10px]">RECENTLY REJECTED</span>
                </div>
                {rejected.length === 0 ? (
                  <div className="text-center py-5">
                    <XCircle className="w-4 h-4 text-zinc-700 mx-auto mb-1.5 opacity-40" />
                    <p className="text-zinc-700 text-[9px] typewriter-label">NO REJECTED REQUESTS YET</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {rejected.map((elevation) => (
                      <div
                        key={elevation.id}
                        className="flex items-center gap-2 p-2 bg-[#0a0a0c] border border-[rgba(220,38,38,0.06)]"
                      >
                        <span className="text-[9px] font-mono text-[#dc2626]/70">{elevation.user.badgeCode}</span>
                        <span className="text-[9px] text-zinc-500 truncate">{elevation.user.displayName}</span>
                        <span className="text-[8px] text-zinc-700 ml-auto">{formatDate(elevation.updatedAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <PasswordDialog
        adminBadgeCode={adminBadgeCode}
        actionLabel={passwordAction?.type === "approve" ? "APPROVE ELEVATION" : "REJECT ELEVATION"}
        onVerified={executeAfterVerify}
        onCancel={() => setPasswordAction(null)}
        isOpen={passwordAction !== null}
      />
    </>
  );
}
