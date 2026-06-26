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
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <p className="text-sm text-zinc-400 mb-1">Topic</p>
        <p className="text-base font-medium text-white">{topic.title}</p>
      </div>

      <Select
        label="Verdict"
        name="verdict"
        placeholder="Select verdict..."
        options={[
          { value: "BUSTED", label: "🚫 BUSTED — Myth is false" },
          { value: "TRUE", label: "✅ TRUE — Myth is confirmed" },
          { value: "INCONCLUSIVE", label: "❓ INCONCLUSIVE — Not enough evidence" },
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
