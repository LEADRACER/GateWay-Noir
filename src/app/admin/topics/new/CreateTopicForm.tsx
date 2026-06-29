"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Scale, Sparkles, Eye, Timer, ShieldCheck, LogOut, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { createTopic } from "@/lib/actions";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  slug: string;
}

export function CreateTopicForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"ACTIVE" | "UPCOMING">("UPCOMING");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Check admin status on mount
  useEffect(() => {
    fetch("/api/admin/check")
      .then((r) => r.json())
      .then((data) => {
        if (data.admin) {
          setIsAdmin(true);
          setStatus("ACTIVE");
        }
      })
      .catch(() => {});
  }, []);

  async function handleAdminLogin() {
    if (!adminPassword.trim()) return;
    setIsLoggingIn(true);
    try {
      const res = await fetch("/api/admin/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword }),
      });
      const data = await res.json();
      if (data.admin) {
        setIsAdmin(true);
        setStatus("ACTIVE");
        setShowAdminLogin(false);
        setAdminPassword("");
        toast.success("Bureau access granted");
      } else {
        toast.error(data.error || "Invalid code");
      }
    } catch {
      toast.error("Connection failed");
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function handleAdminLogout() {
    try {
      await fetch("/api/admin/check", { method: "DELETE" });
      setIsAdmin(false);
      setStatus("UPCOMING");
      toast.success("Bureau access revoked");
    } catch {
      toast.error("Failed to logout");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const adminId = crypto.randomUUID();
    formData.set("adminId", adminId);
    formData.set("status", status);

    try {
      const result = await createTopic(formData);
      if (result.error) {
        setErrors({ general: result.error });
        toast.error(result.error);
      } else {
        toast.success(status === "UPCOMING" ? "Case added to pending review!" : "Case file created successfully!");
        router.push(status === "UPCOMING" ? "/" : `/topic/${result.slug}`);
        router.refresh();
      }
    } catch {
      setErrors({ general: "Failed to create topic" });
      toast.error("Failed to create topic");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {errors.general && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {errors.general}
        </div>
      )}

      {/* Admin Login Bar */}
      <div className="flex items-center justify-between p-2 bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)]">
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] text-emerald-400 typewriter-label">BUREAU ACCESS — VERIFIED</span>
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5 text-zinc-600" />
              <span className="text-[10px] text-zinc-600 typewriter-label">STANDARD USER — UPCOMING ONLY</span>
            </>
          )}
        </div>
        {isAdmin ? (
          <button
            type="button"
            onClick={handleAdminLogout}
            className="inline-flex items-center gap-1 px-2 py-1 text-[9px] text-zinc-500 hover:text-zinc-300 typewriter-label transition-colors"
          >
            <LogOut className="w-2.5 h-2.5" />
            LOCK
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowAdminLogin(!showAdminLogin)}
            className="inline-flex items-center gap-1 px-2 py-1 text-[9px] text-zinc-600 hover:text-amber-400 typewriter-label transition-colors"
          >
            <Eye className="w-2.5 h-2.5" />
            BUREAU ACCESS
          </button>
        )}
      </div>

      {/* Admin Login Form */}
      {showAdminLogin && !isAdmin && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex items-center gap-2 p-2 bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)]"
        >
          <input
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
            placeholder="Enter bureau code..."
            className="flex-1 px-2 py-1 text-[10px] bg-[#08080a] border border-[rgba(168,144,112,0.08)] text-zinc-400 placeholder-zinc-700 focus:outline-none focus:border-amber-700/30 font-mono"
            autoFocus
          />
          <button
            type="button"
            onClick={handleAdminLogin}
            disabled={isLoggingIn || !adminPassword.trim()}
            className="px-2 py-1 text-[9px] bg-[#d97706] text-black font-semibold typewriter-label hover:bg-[#b86a04] transition-colors disabled:opacity-50"
          >
            {isLoggingIn ? "..." : "UNLOCK"}
          </button>
        </motion.div>
      )}

      {/* Status Toggle — only shown for admin */}
      {isAdmin && (
        <div className="flex items-center gap-3 p-3 bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)]">
          <span className="text-sm text-zinc-400 font-medium">Publish as:</span>
          <button
            type="button"
            onClick={() => setStatus("ACTIVE")}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              status === "ACTIVE"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                : "bg-[#0d0d18] text-zinc-600 border border-[rgba(212,184,150,0.08)] hover:border-amber-700/20"
            )}
          >
            <Timer className="w-4 h-4" />
            Active Investigation
          </button>
          <button
            type="button"
            onClick={() => setStatus("UPCOMING")}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              status === "UPCOMING"
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                : "bg-[#0d0d18] text-zinc-600 border border-[rgba(212,184,150,0.08)] hover:border-amber-700/20"
            )}
          >
            <Sparkles className="w-4 h-4" />
            Upcoming (Vote to Launch)
          </button>
        </div>
      )}

      {/* Non-admin notice */}
      {!isAdmin && (
        <div className="p-3 bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)]">
          <p className="text-[10px] text-zinc-600 typewriter-label leading-relaxed">
            All cases submitted as a standard user enter PENDING INTAKE. They will be reviewed and promoted to active investigation once they receive enough tips from the community.
            <br />
            <span className="text-zinc-700">To publish directly as an active investigation, use Bureau Access above.</span>
          </p>
        </div>
      )}

      <Input
        label="Title"
        name="title"
        placeholder="e.g., Did humans really land on the Moon?"
        required
        maxLength={200}
        error={errors.title}
      />

      <Select
        label="Category"
        name="categoryId"
        placeholder="Select a category"
        options={categories.map((c) => ({ value: c.id, label: c.name }))}
        required
      />

      <Textarea
        label="Description"
        name="description"
        placeholder="Describe the case in detail. What do people claim? Why is it controversial?"
        required
        maxLength={5000}
        error={errors.description}
      />

      <Textarea
        label="Evidence & Background"
        name="evidence"
        placeholder="Optional: Provide evidence, sources, links, or arguments for both sides..."
        maxLength={10000}
        className="min-h-[150px]"
      />

      <Input
        label="Image URL"
        name="imageUrl"
        placeholder="Optional: URL to an image representing this case"
        type="url"
      />

      {status === "ACTIVE" && (
        <Input
          label="Investigation Duration (days)"
          name="durationDays"
          type="number"
          defaultValue={7}
          min={1}
          max={30}
          required
        />
      )}

      <div className="flex items-center gap-3 pt-4">
        <Button type="submit" size="lg" isLoading={isSubmitting}>
          {status === "UPCOMING" ? (
            <><Sparkles className="w-4 h-4" /> Add to Upcoming</>
          ) : (
            <><Scale className="w-4 h-4" /> Open Investigation</>
          )}
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </motion.form>
  );
}
