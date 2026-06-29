"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Paperclip, X, Image, Link, Upload } from "lucide-react";
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
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [gdriveLink, setGdriveLink] = useState("");
  const [showEvidenceInput, setShowEvidenceInput] = useState(false);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine role label
  const isAgent = displayName?.startsWith("AGT");
  const isBureau = displayName?.startsWith("BRU");
  const roleLabel = isBureau ? "BUREAU" : isAgent ? "FIELD AGENT" : "WITNESS";

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (evidenceUrls.length + files.length > 3) {
      setError("Max 3 evidence items per comment");
      return;
    }

    setIsUploadingEvidence(true);
    setError("");

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("evidence", file);
    });

    try {
      const res = await fetch("/api/upload/evidence", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.urls && data.urls.length > 0) {
        setEvidenceUrls([...evidenceUrls, ...data.urls]);
      }
      if (data.error) setError(data.error);
    } catch {
      setError("Failed to upload evidence. Try a Google Drive link instead.");
    } finally {
      setIsUploadingEvidence(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const addGdriveLink = () => {
    if (!gdriveLink.trim()) return;
    if (evidenceUrls.length >= 3) {
      setError("Max 3 evidence items per comment");
      return;
    }
    setEvidenceUrls([...evidenceUrls, gdriveLink.trim()]);
    setGdriveLink("");
  };

  const removeEvidence = (index: number) => {
    setEvidenceUrls(evidenceUrls.filter((_, i) => i !== index));
  };

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

    if (evidenceUrls.length > 0) {
      formData.set("evidenceUrls", JSON.stringify(evidenceUrls));
    }

    try {
      const result = await createComment(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setContent("");
        setEvidenceUrls([]);
        setGdriveLink("");
        setShowEvidenceInput(false);
        onCommentAdded();
      }
    } catch {
      setError("Failed to submit testimony.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="mb-4"
    >
      <div className="flex items-center gap-1.5 mb-2">
        <div
          className="w-5 h-5 flex items-center justify-center text-[8px] font-bold text-white opacity-40"
          style={{ backgroundColor: `hsl(${hashCode(displayName) % 360}, 40%, 40%)` }}
        >
          {displayName.charAt(displayName.length - 2)}{displayName.charAt(displayName.length - 1)}
        </div>
        <span className="text-[10px] font-mono font-bold text-[#d97706]">{displayName}</span>
        <span className="case-number">{roleLabel}</span>
      </div>

      <div className="relative">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Depose your testimony, evidence, or findings..."
          className="min-h-[60px] pr-10"
          maxLength={2000}
        />
        <div className="absolute bottom-2 right-2">
          <span className="case-number">{content.length}/2000</span>
        </div>
      </div>

      {/* Evidence section */}
      <AnimatePresence>
        {(evidenceUrls.length > 0 || showEvidenceInput) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-2 bg-[#0a0a0c] border border-[rgba(168,144,112,0.06)]">
              <div className="flex items-center gap-1.5 mb-2">
                <Paperclip className="w-3 h-3 text-[#d97706] opacity-50" />
                <span className="text-[9px] text-zinc-500 typewriter-label">EVIDENCE ATTACHED ({evidenceUrls.length}/3)</span>
              </div>

              {/* Evidence previews */}
              <div className="flex flex-wrap gap-2 mb-2">
                {evidenceUrls.map((url, i) => (
                  <div key={i} className="relative group">
                    {url.startsWith("http") ? (
                      <div className="w-16 h-16 flex items-center justify-center rounded border border-[rgba(168,144,112,0.08)] bg-[#111113]">
                        <span className="text-[7px] text-zinc-600 typewriter-label text-center px-0.5 break-all">
                          {url.includes("drive.google.com") ? "GDRIVE" : "LINK"}
                        </span>
                      </div>
                    ) : (
                      <img src={url} alt={`Evidence ${i + 1}`} className="w-16 h-16 object-cover rounded border border-[rgba(168,144,112,0.08)]" />
                    )}
                    <button
                      type="button"
                      onClick={() => removeEvidence(i)}
                      className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#dc2626] rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-2 h-2" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add evidence inputs */}
              {evidenceUrls.length < 3 && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex gap-1.5">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      id="evidence-upload"
                    />
                    <label
                      htmlFor="evidence-upload"
                      className="flex items-center gap-1 text-[9px] text-zinc-600 hover:text-zinc-400 cursor-pointer typewriter-label"
                    >
                      <Upload className="w-2.5 h-2.5" />
                      UPLOAD IMAGE
                    </label>
                    <span className="text-[9px] text-zinc-700">or</span>
                    <button
                      type="button"
                      onClick={() => setShowEvidenceInput(!showEvidenceInput)}
                      className="flex items-center gap-1 text-[9px] text-zinc-600 hover:text-zinc-400 typewriter-label"
                    >
                      <Link className="w-2.5 h-2.5" />
                      GDRIVE LINK
                    </button>
                  </div>

                  {showEvidenceInput && (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={gdriveLink}
                        onChange={(e) => setGdriveLink(e.target.value)}
                        placeholder="https://drive.google.com/open?id=..."
                        className="flex-1 text-[10px] bg-transparent border border-[rgba(168,144,112,0.1)] px-1.5 py-1 text-zinc-400 placeholder:text-zinc-700 font-mono"
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addGdriveLink())}
                      />
                      <button
                        type="button"
                        onClick={addGdriveLink}
                        className="text-[9px] text-[#d97706] hover:text-[#fbbf24] typewriter-label"
                      >
                        ADD
                      </button>
                    </div>
                  )}
                </div>
              )}

              {isUploadingEvidence && (
                <span className="text-[9px] text-zinc-600 typewriter-label mt-1">UPLOADING...</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p className="mt-2 text-[10px] text-[#dc2626] bg-[rgba(220,38,38,0.06)] border border-[rgba(220,38,38,0.12)] px-2 py-1">{error}</p>
      )}

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <p className="case-number text-zinc-700">Your badge protects your identity.</p>
          {evidenceUrls.length === 0 && (
            <button
              type="button"
              onClick={() => setShowEvidenceInput(!showEvidenceInput)}
              className="flex items-center gap-1 text-[9px] text-zinc-600 hover:text-[#d97706] typewriter-label"
            >
              <Paperclip className="w-2.5 h-2.5" />
              ADD EVIDENCE
            </button>
          )}
        </div>
        <Button type="submit" size="sm" isLoading={isSubmitting} disabled={!content.trim() || !anonymousId}>
          <Send className="w-3 h-3" />
          SUBMIT
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
