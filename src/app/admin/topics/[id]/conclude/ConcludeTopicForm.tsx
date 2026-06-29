"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { Scale, Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { concludeTopic } from "@/lib/actions";
import toast from "react-hot-toast";

interface Topic {
  id: string;
  title: string;
}

export function ConcludeTopicForm({ topic }: { topic: Topic }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    formData.set("id", topic.id);

    try {
      const result = await concludeTopic(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Verdict delivered!");
        router.push(`/topic/${(result as any).slug || ""}`);
        router.refresh();
      }
    } catch {
      toast.error("Failed to conclude topic");
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
      <div className="bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)] p-4">
        <p className="case-number text-zinc-600 mb-0.5">CASE FILE</p>
        <p className="text-sm font-medium text-zinc-300">{topic.title}</p>
      </div>

      <Select
        label="Verdict"
        name="verdict"
        placeholder="Select verdict..."
        options={[
          { value: "SOLVED", label: "🚫 SOLVED — Evidence disproves the allegation" },
          { value: "CONFIRMED", label: "✅ CONFIRMED — Evidence supports the allegation" },
          { value: "UNSOLVED", label: "❓ UNSOLVED — Insufficient evidence" },
        ]}
        required
      />

      <Textarea
        label="Summary"
        name="summary"
        placeholder="Write the final summary. Highlight key evidence, community arguments, and the reasoning behind the verdict..."
        required
        maxLength={5000}
        className="min-h-[150px]"
      />

      <div className="flex items-center gap-3 pt-4">
        <Button type="submit" size="lg" isLoading={isSubmitting}>
          <Shield className="w-4 h-4" />
          Deliver Verdict
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </motion.form>
  );
}
