"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { createComment } from "@/lib/actions";

interface CommentFormProps {
  topicId: string;
  anonymousId: string | null;
  displayName: string;
  onCommentAdded: () => void;
}

export function CommentForm({ topicId, anonymousId, displayName, onCommentAdded }: CommentFormProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !anonymousId) return;

    setIsSubmitting(true);
    setError("");

    const formData = new FormData();
    formData.set("topicId", topicId);
    formData.set("content", content);
    formData.set("anonymousId", anonymousId);
    formData.set("displayName", displayName);

    try {
      const result = await createComment(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setContent("");
        onCommentAdded();
      }
    } catch {
      setError("Failed to submit comment. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="mb-8"
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
          style={{ backgroundColor: `hsl(${hashCode(displayName) % 360}, 65%, 55%)` }}
        >
          {displayName.charAt(displayName.length - 2)}{displayName.charAt(displayName.length - 1)}
        </div>
        <span className="text-xs text-zinc-400 font-medium">{displayName}</span>
        <span className="text-[10px] text-zinc-700">•</span>
        <span className="text-[10px] text-zinc-600">Anonymous</span>
      </div>

      <div className="relative">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your thoughts, evidence, or opinion..."
          className="min-h-[80px] pr-12"
          maxLength={2000}
        />
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <span className="text-[10px] text-zinc-600">{content.length}/2000</span>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex items-center justify-between mt-3">
        <p className="text-[10px] text-zinc-600">Your identity is protected. No login needed.</p>
        <Button type="submit" size="sm" isLoading={isSubmitting} disabled={!content.trim() || !anonymousId}>
          <Send className="w-3.5 h-3.5" />
          Post
        </Button>
      </div>
    </motion.form>
  );
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}
