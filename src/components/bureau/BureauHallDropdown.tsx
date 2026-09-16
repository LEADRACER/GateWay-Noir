"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldCheck, Users, UserCheck } from "lucide-react";

interface BureauUser {
  id: string;
  badgeCode: string;
  displayName: string;
  avatarUrl: string | null;
}

interface AgentUser {
  id: string;
  badgeCode: string;
  displayName: string;
  avatarUrl: string | null;
}

interface BureauHall {
  bureau: BureauUser | null;
  agents: AgentUser[];
}

interface BureauHallDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

export function BureauHallDropdown({ isOpen, onClose, triggerRef }: BureauHallDropdownProps) {
  const [halls, setHalls] = useState<BureauHall[]>([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchHalls = useCallback(async () => {
    try {
      const res = await fetch("/api/bureau/halls");
      if (res.ok) {
        const data = await res.json();
        setHalls(data.halls || []);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        fetchHalls();
      }, 0);
    }
  }, [isOpen, fetchHalls]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={dropdownRef}
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-full max-w-6xl px-4 sm:px-6 lg:px-8"
      >
        <div className="bg-[#0a0a0c] border-2 border-[rgba(217,119,6,0.3)] rounded-xl overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.8)]">
          <div className="flex items-center justify-between p-4 border-b border-[rgba(217,119,6,0.2)] bg-[#111113]">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 bg-[#d97706] rounded">
                <ShieldCheck className="w-4 h-4 text-black" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-200 typewriter-label">BUREAU HALLS</h2>
                <p className="text-[9px] text-zinc-500 typewriter-label">
                  {halls.filter((h) => h.bureau).length} HALL{ halls.filter((h) => h.bureau).length !== 1 ? "S" : "" } · {halls.reduce((sum, h) => sum + h.agents.length, 0)} AGENT{ halls.reduce((sum, h) => sum + h.agents.length, 0) !== 1 ? "S" : "" }
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors rounded hover:bg-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-[#d97706] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : halls.length === 0 ? (
            <div className="p-8 text-center">
              <ShieldCheck className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
              <p className="text-zinc-500 text-sm">NO BUREAU HALLS FOUND</p>
              <p className="text-zinc-700 text-[10px] mt-1">Bureau officers will appear here when registered</p>
            </div>
          ) : (
            <div className="p-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {halls.map((hall, hallIndex) => (
                  <motion.div
                    key={hall.bureau?.id ?? `unassigned-${hallIndex}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: hallIndex * 0.05 }}
                    className="relative bg-[#111113] border border-[rgba(168,144,112,0.1)] rounded-lg overflow-hidden"
                  >
                    <div className="relative">
                      <div className="bg-gradient-to-r from-[#d97706]/20 to-[#d97706]/5 border-b border-[rgba(217,119,6,0.2)] p-3">
                        {hall.bureau ? (
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <div className="w-7 h-7 bg-[#d97706] rounded-full flex items-center justify-center">
                                <ShieldCheck className="w-3.5 h-3.5 text-black" />
                              </div>
                              <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[#0a0a0c] border-2 border-[#d97706] rounded-full flex items-center justify-center">
                                <span className="text-[9px] font-bold text-[#d97706]">BRU</span>
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-zinc-200 truncate typewriter-label">{hall.bureau.displayName}</p>
                              <p className="text-[8px] font-mono text-[#d97706]/80">{hall.bureau.badgeCode}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-zinc-500">
                            <Users className="w-4 h-4" />
                            <span className="text-xs font-medium typewriter-label">UNASSIGNED AGENTS</span>
                          </div>
                        )}
                      </div>

                      <div className="divide-y divide-[rgba(168,144,112,0.06)] max-h-64 overflow-y-auto">
                        {hall.bureau && hall.agents.length === 0 && (
                          <div className="p-4 text-center text-zinc-600 text-[10px] typewriter-label">
                            No agents assigned to this bureau
                          </div>
                        )}

                        {hall.agents.slice(0, 10).map((agent, agentIndex) => (
                          <div
                            key={agent.id}
                            className={`flex items-center gap-2 px-3 py-2.5 hover:bg-[#0a0a0c] transition-colors ${
                              agentIndex < 3 ? "bg-amber-500/5" : ""
                            }`}
                          >
                            <div className="relative flex-shrink-0">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                agentIndex < 3 ? "bg-[#d97706]/20 border border-[#d97706]/30" : "bg-zinc-800 border border-zinc-700"
                              }`}>
                                {agent.avatarUrl ? (
                                  <img src={agent.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                                ) : (
                                  <UserCheck className={`w-3.5 h-3.5 ${agentIndex < 3 ? "text-[#d97706]" : "text-zinc-600"}`} />
                                )}
                              </div>
                              {agentIndex < 3 && (
                                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#d97706] text-black text-[7px] font-bold rounded-full flex items-center justify-center">
                                  {agentIndex + 1}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-zinc-300 truncate">{agent.displayName}</p>
                              <p className="text-[8px] font-mono text-zinc-500">{agent.badgeCode}</p>
                            </div>
                            <span className={`text-[7px] px-1.5 py-[1px] rounded typewriter-label ${
                              agentIndex < 3
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            }`}>
                              {agentIndex < 3 ? "BRU" : "AGT"}
                            </span>
                          </div>
                        ))}

                        {hall.agents.length > 10 && (
                          <div className="px-3 py-2 text-center border-t border-[rgba(168,144,112,0.1)]">
                            <span className="text-[9px] text-zinc-500 typewriter-label">
                              +{hall.agents.length - 10} more agent{hall.agents.length - 10 !== 1 ? "s" : ""}
                            </span>
                          </div>
                        )}

                        {hall.agents.length === 0 && !hall.bureau && (
                          <div className="p-4 text-center text-zinc-600 text-[10px] typewriter-label">
                            No unassigned agents
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}