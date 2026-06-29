"use client";

import { useState } from "react";
import { ShieldAlert, ShieldCheck, UserCog, Loader2 } from "lucide-react";
import { PasswordDialog } from "@/components/ui/PasswordDialog";

interface AgentUser {
  id: string;
  badgeCode: string;
  displayName: string;
  bio: string | null;
  phone: string | null;
  handler: string | null;
  createdAt: string;
}

interface PromoteSectionProps {
  agents: AgentUser[];
  adminId: string;
  adminBadgeCode: string;
}

export function PromoteSection({
  agents,
  adminId,
  adminBadgeCode,
}: PromoteSectionProps) {
  const [promoting, setPromoting] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [agentList, setAgentList] = useState(agents);
  const [showPasswordFor, setShowPasswordFor] = useState<string | null>(null);

  const handlePromoteClick = (agentId: string) => {
    setShowPasswordFor(agentId);
  };

  const executePromotion = async (verifiedAdminId: string) => {
    const agentId = showPasswordFor;
    if (!agentId) return;
    setShowPasswordFor(null);

    const agent = agentList.find((a) => a.id === agentId);
    if (!agent) return;

    setPromoting(agentId);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          badgeCode: agent.badgeCode,
          adminId: verifiedAdminId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({
          type: "success",
          text: `${agent.displayName} (${agent.badgeCode}) promoted → ${data.badgeCode}`,
        });
        setAgentList((prev) => prev.filter((a) => a.id !== agentId));
      } else {
        setMessage({
          type: "error",
          text: data.error || "Failed to promote",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setPromoting(null);
    }
  };

  if (agentList.length === 0) {
    return null;
  }

  return (
    <>
      <div className="bg-[#111113] border border-[rgba(168,144,112,0.08)] rounded p-4">
        <div className="flex items-center gap-2 mb-3">
          <UserCog className="w-3.5 h-3.5 text-amber-400/60" />
          <h3 className="text-xs font-semibold text-zinc-300 typewriter-label">
            FIELD AGENTS
          </h3>
        </div>

        {message && (
          <div
            className={`mb-3 px-3 py-2 rounded text-[11px] ${
              message.type === "success"
                ? "bg-emerald-900/30 text-emerald-400 border border-emerald-800/30"
                : "bg-red-900/30 text-red-400 border border-red-800/30"
            }`}
          >
            {message.type === "success" ? (
              <ShieldCheck className="w-3 h-3 inline mr-1.5 -mt-0.5" />
            ) : (
              <ShieldAlert className="w-3 h-3 inline mr-1.5 -mt-0.5" />
            )}
            {message.text}
          </div>
        )}

        <div className="space-y-1.5">
          {agentList.map((agent) => (
            <div
              key={agent.id}
              className="flex items-center gap-3 px-2.5 py-2 bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)] rounded group hover:border-[rgba(168,144,112,0.14)] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-200 truncate">
                    {agent.displayName}
                  </span>
                  <span className="text-[10px] text-amber-400/60 font-mono">
                    {agent.badgeCode}
                  </span>
                </div>
                {agent.bio && (
                  <p className="text-[10px] text-zinc-600 truncate mt-0.5">
                    {agent.bio}
                  </p>
                )}
              </div>
              <button
                onClick={() => handlePromoteClick(agent.id)}
                disabled={promoting === agent.id}
                className="px-2.5 py-1 text-[10px] font-medium text-amber-400/80 border border-amber-600/30 rounded hover:bg-amber-900/30 hover:text-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors typewriter-label shrink-0"
              >
                {promoting === agent.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  "PROMOTE → BRU"
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      <PasswordDialog
        adminBadgeCode={adminBadgeCode}
        actionLabel="PROMOTE TO BRU"
        onVerified={executePromotion}
        onCancel={() => setShowPasswordFor(null)}
        isOpen={showPasswordFor !== null}
      />
    </>
  );
}
