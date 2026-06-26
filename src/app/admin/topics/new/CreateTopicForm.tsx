"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { Scale, Sparkles, Eye, Timer } from "lucide-react";
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
  const [status, setStatus] = useState<"ACTIVE" | "UPCOMING">("ACTIVE");

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
        toast.success(status === "UPCOMING" ? "Topic added to upcoming!" : "Myth created successfully!");
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

      {/* Status Toggle */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
        <span className="text-sm text-zinc-400 font-medium">Publish as:</span>
        <button
          type="button"
          onClick={() => setStatus("ACTIVE")}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            status === "ACTIVE"
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              : "bg-zinc-800 text-zinc-500 border border-zinc-700 hover:border-zinc-600"
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
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              : "bg-zinc-800 text-zinc-500 border border-zinc-700 hover:border-zinc-600"
          )}
        >
          <Sparkles className="w-4 h-4" />
          Upcoming (Vote to Launch)
        </button>
      </div>

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
        placeholder="Describe the myth or conspiracy in detail. What do people claim? Why is it controversial?"
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
        placeholder="Optional: URL to an image representing this myth"
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
            <><Scale className="w-4 h-4" /> Create Myth</>
          )}
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </motion.form>
  );
}
