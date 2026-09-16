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
  bureaus: BureauUser[];
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
        className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-full max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <div className="bg-[#0a0a0c] border-2 border-[#d97706] rounded-none overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.8)]">
          <div className="flex items-center justify-between px-4 py-3 border-b-2 border-[#d97706] bg-[#111113]">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 bg-[#d97706] rounded-none">
                <ShieldCheck className="w-4 h-4 text-black" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-200 typewriter-label tracking-wider">BUREAU HALLS</h2>
                <p className="text-[9px] text-zinc-500 typewriter-label">
                  {halls.length} HALL{ halls.length !== 1 ? "S" : "" } · {halls.reduce((sum, h) => sum + h.agents.length, 0)} AGENT{ halls.reduce((sum, h) => sum + h.agents.length, 0) !== 1 ? "S" : "" }
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors rounded-none hover:bg-zinc-800"
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
            <div className="p-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {halls.map((hall, hallIndex) => (
                  <motion.div
                    key={`hall-${hallIndex}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: hallIndex * 0.05 }}
                    className="bg-[#111113] border-2 border-[#d97706] rounded-none overflow-hidden flex flex-col"
                  >
                    <div className="bg-[#d97706] border-b-2 border-[#d97706] p-3">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {hall.bureaus.length > 0 ? (
                          hall.bureaus.map((bureau) => (
                            <div
                              key={bureau.id}
                              className="flex flex-col items-center gap-1 px-2 py-1.5 min-w-[80px]"
                            >
                              <div className="relative w-8 h-8 bg-[#0a0a0c] border-2 border-[#d97706] rounded-none flex items-center justify-center">
                                <ShieldCheck className="w-4 h-4 text-[#d97706]" />
                              </div>
                              <span className="text-[9px] font-mono text-[#d97706] truncate max-w-[70px] text-center">
                                {bureau.badgeCode}
                              </span>
                              <span className="text-[8px] font-bold text-[#0a0a0c] truncate max-w-[70px] text-center">
                                {bureau.displayName}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-center gap-2 text-zinc-500 px-4 py-2">
                            <Users className="w-4 h-4" />
                            <span className="text-xs font-medium typewriter-label text-zinc-400">UNASSIGNED</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border-b-2 border-[#d97706]" />

                    <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[400px] divide-y divide-[#d97706]/30">
                      {hall.agents.length === 0 ? (
                        <div className="p-6 text-center text-zinc-600 text-[10px] typewriter-label">
                          {hall.bureaus.length > 0 ? "NO AGENTS ASSIGNED" : "NO UNASSIGNED AGENTS"}
                        </div>
                      ) : (
                        hall.agents.map((agent) => (
                          <div
                            key={agent.id}
                            className="flex items-center gap-2 px-3 py-2.5 bg-[#0a0a0c] border-b border-[#d97706]/20 last:border-b-0 hover:bg-[#111113] transition-colors"
                          >
                            <div className="relative flex-shrink-0 w-7 h-7">
                              <div className="w-7 h-7 rounded-none flex items-center justify-center bg-zinc-800 border-2 border-[#d97706]/50">
                                {agent.avatarUrl ? (
                                  <img src={agent.avatarUrl} alt="" className="w-7 h-7 rounded-none" />
                                ) : (
                                  <UserCheck className="w-4 h-4 text-zinc-500" />
                                )}
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-zinc-200 truncate">{agent.displayName}</p>
                              <p className="text-[8px] font-mono text-zinc-500">{agent.badgeCode}</p>
                            </div>
                            <span className="text-[7px] px-1.5 py-[1px] rounded-none typewriter-label bg-[#d97706]/20 text-[#d97706] border border-[#d97706]/50">
                              AGT
                            </span>
                          </div>
                        ))
                      )}
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