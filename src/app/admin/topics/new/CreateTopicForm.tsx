"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { Scale, Sparkles, Timer, ShieldCheck } from "lucide-react";
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

interface CreateTopicFormProps {
  categories: Category[];
  canCreateActive: boolean;
}

export function CreateTopicForm({ categories, canCreateActive }: CreateTopicFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"ACTIVE" | "UPCOMING">("UPCOMING");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);
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

      <div className="flex items-center justify-between p-2 bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)]">
        <div className="flex items-center gap-2">
          {canCreateActive ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] text-emerald-400 typewriter-label">BUREAU ACCESS — ACTIVE OR UPCOMING</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[10px] text-amber-500 typewriter-label">FIELD AGENT — UPCOMING ONLY</span>
            </>
          )}
        </div>
      </div>

      {canCreateActive && (
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

      {!canCreateActive && (
        <div className="p-3 bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)]">
          <p className="text-[10px] text-zinc-600 typewriter-label leading-relaxed">
            Field agents can submit cases for upcoming review. Bureau members can publish an investigation directly after review.
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
