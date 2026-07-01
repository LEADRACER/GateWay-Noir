"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { updateAgentProfile, getAgentProfile } from "@/lib/profile-actions";
import { useBadge } from "@/components/badge/BadgeProvider";
import { Smartphone } from "lucide-react";

interface ProfileData {
  id: string;
  badgeCode: string;
  displayName: string;
  role: string;
  bio: string | null;
  phone: string | null;
  handler: string | null;
  createdAt: Date;
  handlerInfo: { badgeCode: string; displayName: string } | null;
  voteCount: number;
  commentCount: number;
  taskCounts: Record<string, number>;
}

export function AgentProfileClient() {
  const { badge, updateBadge } = useBadge();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!badge) {
      setLoading(false);
      return;
    }
    getAgentProfile(badge.id).then((data) => {
      if (data) {
        setProfile(data as ProfileData);
        setDisplayName(data.displayName || "");
        setBio(data.bio || "");
        setPhone(data.phone || "");
      }
      setLoading(false);
    });
  }, [badge]);

  const handleSave = async () => {
    if (!profile) return;

    // Enforce phone/WhatsApp registration
    if (!phone.trim()) {
      toast.error("Phone number is required for WhatsApp notifications");
      return;
    }

    setSaving(true);
    try {
      const result = await updateAgentProfile(profile.id, {
        displayName,
        bio,
        phone,
      });
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Profile updated successfully");
        // Sync badge context so navbar updates immediately
        if (displayName !== badge?.displayName) {
          updateBadge({ displayName });
        }
        if (phone !== badge?.phone) {
          updateBadge({ phone });
        }
      }
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-zinc-500 text-sm">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-zinc-500 text-sm">No badge linked. Claim a badge first.</p>
      </div>
    );
  }

  const roleLabel = profile.role === "AGENT" ? "Agent" : profile.role === "BUREAU" ? "Bureau" : profile.role;
  const roleBadgeColor =
    profile.role === "BUREAU"
      ? "bg-amber/15 text-amber border-amber/30"
      : profile.role === "AGENT"
      ? "bg-green/15 text-green border-green/30"
      : "bg-zinc/15 text-zinc-400 border-zinc/30";

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* WhatsApp Required Banner */}
      {!profile.phone && (
        <div className="mb-6 p-3 bg-amber/10 border border-amber/30 flex items-start gap-2.5">
          <Smartphone className="w-4 h-4 text-amber shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-amber font-semibold uppercase tracking-wider">WhatsApp Number Required</p>
            <p className="text-[11px] text-amber/70 mt-0.5">
              You must register your phone number to receive WhatsApp notifications for tasks, elevations, and case updates.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Agent Profile</h1>
        <p className="text-xs text-zinc-500 mt-1">Manage your identity and track your activity</p>
      </div>

      {/* Identity Card */}
      <div className="bg-[#111113] border border-[rgba(168,144,112,0.12)] rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Badge Code</p>
            <p className="text-lg font-mono font-bold text-manila-light">{profile.badgeCode}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium border ${roleBadgeColor}`}>
            {roleLabel}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs text-zinc-500">
          <div>
            <span className="block text-zinc-600">Member Since</span>
            <span className="text-zinc-400">
              {new Date(profile.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          <div>
            <span className="block text-zinc-600">Role Level</span>
            <span className="text-zinc-400">{profile.role}</span>
          </div>
        </div>
      </div>

      {/* Editable Fields */}
      <div className="bg-[#111113] border border-[rgba(168,144,112,0.12)] rounded-lg p-6 mb-6">
        <h2 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wider">Details</h2>

        <div className="space-y-4">
          {/* Display Name */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-[#08080a] border border-[rgba(168,144,112,0.15)] rounded-md px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-manila/40 transition-colors"
              placeholder="Your display name"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">
              Bio
              <span className="float-right text-zinc-600">{bio.length}/500</span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 500))}
              rows={4}
              className="w-full bg-[#08080a] border border-[rgba(168,144,112,0.15)] rounded-md px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-manila/40 transition-colors resize-none"
              placeholder="Tell us about yourself..."
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">
              Phone (WhatsApp) <span className="text-red-400/80">*required</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`w-full bg-[#08080a] border ${
                !phone.trim() && profile.phone === null
                  ? 'border-amber/40'
                  : 'border-[rgba(168,144,112,0.15)]'
              } rounded-md px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-manila/40 transition-colors`}
              placeholder="+1 (555) 000-0000"
            />
            {!phone.trim() && !profile.phone && (
              <p className="text-[10px] text-amber/60 mt-1 flex items-center gap-1">
                <Smartphone className="w-3 h-3" />
                Required for WhatsApp notifications (elevations, tasks, case updates)
              </p>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-amber/15 text-amber border border-amber/30 rounded-md text-xs font-medium uppercase tracking-wider hover:bg-amber/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Handler Info */}
      {profile.handlerInfo && (
        <div className="bg-[#111113] border border-[rgba(168,144,112,0.12)] rounded-lg p-6 mb-6">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wider">Handler</h2>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber/10 border border-amber/20 flex items-center justify-center">
              <span className="text-amber text-xs font-bold">B</span>
            </div>
            <div>
              <p className="text-sm text-zinc-200 font-medium">{profile.handlerInfo.displayName}</p>
              <p className="text-xs text-zinc-500 font-mono">{profile.handlerInfo.badgeCode}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="bg-[#111113] border border-[rgba(168,144,112,0.12)] rounded-lg p-6">
        <h2 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wider">Statistics</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {/* Votes */}
          <div className="bg-[#08080a] border border-[rgba(168,144,112,0.08)] rounded-md p-4 text-center">
            <p className="text-2xl font-bold text-zinc-100">{profile.voteCount}</p>
            <p className="text-xs text-zinc-500 mt-1">Votes Cast</p>
          </div>

          {/* Comments */}
          <div className="bg-[#08080a] border border-[rgba(168,144,112,0.08)] rounded-md p-4 text-center">
            <p className="text-2xl font-bold text-zinc-100">{profile.commentCount}</p>
            <p className="text-xs text-zinc-500 mt-1">Comments</p>
          </div>

          {/* Pending Tasks */}
          <div className="bg-[#08080a] border border-[rgba(168,144,112,0.08)] rounded-md p-4 text-center">
            <p className="text-2xl font-bold text-blue">{profile.taskCounts["PENDING"] || 0}</p>
            <p className="text-xs text-zinc-500 mt-1">Pending Tasks</p>
          </div>

          {/* In Progress Tasks */}
          <div className="bg-[#08080a] border border-[rgba(168,144,112,0.08)] rounded-md p-4 text-center">
            <p className="text-2xl font-bold text-amber">{profile.taskCounts["IN_PROGRESS"] || 0}</p>
            <p className="text-xs text-zinc-500 mt-1">In Progress</p>
          </div>

          {/* Completed Tasks */}
          <div className="bg-[#08080a] border border-[rgba(168,144,112,0.08)] rounded-md p-4 text-center">
            <p className="text-2xl font-bold text-green">{profile.taskCounts["COMPLETED"] || 0}</p>
            <p className="text-xs text-zinc-500 mt-1">Completed</p>
          </div>

          {/* Total Tasks */}
          <div className="bg-[#08080a] border border-[rgba(168,144,112,0.08)] rounded-md p-4 text-center">
            <p className="text-2xl font-bold text-zinc-100">
              {Object.values(profile.taskCounts).reduce((a, b) => a + b, 0)}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Total Tasks</p>
          </div>
        </div>
      </div>
    </div>
  );
}
