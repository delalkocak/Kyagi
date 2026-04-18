import React, { useState, useRef, useCallback, useEffect } from "react";
import { colors } from "./data";
import { CameraIcon, XIcon, PlusIcon, FlipIcon } from "./icons";
import { ArchivePostCard } from "./ArchivePostCard";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/use-posts";
import { useArchiveMonths, useArchivePostsByMonth } from "@/hooks/use-archive";
import { useMyCircle, useRemoveFromCircle, usePauseFriend, usePendingRequests, useSentRequests, useRespondToRequest, CircleMember, getNextShuffleDate } from "@/hooks/use-circle";
import { UserSearch } from "./UserSearch";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { FriendProfileView } from "./FriendProfileView";
import {
  useCurrentMonthlyEdition,
  useMonthlyRecPosts,
  useMarkEditionViewed,
  formatEditionMonth,
  MonthlyEdition,
} from "@/hooks/use-village-monthly";
import { VillageMonthlyView } from "./VillageMonthlyView";

const PASTEL_COLORS = ["#E8D5E0", "#D5E0E8", "#E0E8D5", "#E8E0D5", "#D5D8E8", "#E8D5D5"];

function formatDay(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function computeDaysRecorded(postDates: string[]): number {
  const uniqueDays = new Set(
    postDates.map(d => {
      const dt = new Date(d);
      return `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
    })
  );
  return uniqueDays.size;
}

async function compressAvatar(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const size = 512;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], "avatar.jpg", { type: "image/jpeg" }) : file),
        "image/jpeg",
        0.92
      );
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

const MAX_FRIENDS = 20;
const FOUNDER_USER_IDS = [
  "2ed094aa-92a7-4443-88d8-6bf77f03c52c", // Del
  "8eca5774-fd22-492f-98fb-35e6d137580a", // Sonal
];
const AVATAR_COLORS = ["#8B1A2B", "#2B5BA8", "#1A7A6D", "#C48A1A", "#1E4D8C", "#A5212A", "#3A6DB5"];
function avatarColor(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function generateCode(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function InvitePanel() {
  const { user } = useAuth();
  const [inviteLink, setInviteLink] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const generateInviteLink = async () => {
    if (!user) return;
    setGenerating(true);
    setError("");
    try {
      const code = generateCode();
      const { error: insertError } = await supabase
        .from("invite_codes")
        .insert({ code, inviter_id: user.id } as any);
      if (insertError) throw insertError;
      const baseUrl = window.location.origin;
      setInviteLink(`${baseUrl}/signup?invite=${code}`);
    } catch (e: any) {
      setError(e?.message || "failed to create invite link");
    }
    setGenerating(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = inviteLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "join me on kyagi",
          text: "i'd love for you to be in my village on kyagi — a little journaling app for close friends 💛",
          url: inviteLink,
        });
      } catch {}
    } else {
      copyLink();
    }
  };

  return (
    <div className="mt-3 rounded-xl p-4 border animate-fade-slide-in"
         style={{ background: colors.card, borderColor: colors.border }}>
      {error && (
        <div className="rounded-lg p-2 mb-2 font-sans text-[11px]" style={{ background: "#A5212A15", color: "#A5212A" }}>{error}</div>
      )}

      {!inviteLink ? (
        <div className="text-center">
          <div className="font-sans text-xs font-semibold mb-1.5" style={{ color: colors.text }}>
            share a personal invite link
          </div>
          <div className="font-sans text-[10px] mb-3" style={{ color: colors.textMuted }}>
            they'll join my village automatically when they sign up
          </div>
          <button
            onClick={generateInviteLink}
            disabled={generating}
            className="w-full py-2.5 rounded-xl border-0 font-sans text-xs font-semibold cursor-pointer"
            style={{ background: colors.cobalt, color: "#fff", opacity: generating ? 0.7 : 1 }}>
            {generating ? "creating link..." : "create invite link"}
          </button>
        </div>
      ) : (
        <div>
          <div className="font-sans text-xs font-semibold mb-2" style={{ color: colors.text }}>
            your invite link
          </div>
          <div className="rounded-lg p-2.5 mb-3 font-mono text-[10px] break-all select-all"
               style={{ background: colors.warmGray, color: colors.text, border: `1px solid ${colors.border}` }}>
            {inviteLink}
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyLink}
              className="flex-1 py-2.5 rounded-xl border font-sans text-[11px] font-semibold cursor-pointer flex items-center justify-center gap-1.5"
              style={{ background: "transparent", borderColor: colors.border, color: copied ? colors.cobalt : colors.text }}>
              {copied ? "✓ copied!" : "📋 copy link"}
            </button>
            <button
              onClick={shareLink}
              className="flex-1 py-2.5 rounded-xl border-0 font-sans text-[11px] font-semibold cursor-pointer flex items-center justify-center gap-1.5"
              style={{ background: colors.cobalt, color: "#fff" }}>
              📤 share
            </button>
          </div>
          <div className="font-sans text-[9px] mt-2 text-center" style={{ color: colors.textMuted }}>
            works with imessage, whatsapp, or any app
          </div>
        </div>
      )}
    </div>
  );
}

type SubTab = "me" | "village";

interface ProfileScreenProps {
  editingFromSettings?: boolean;
  onSettingsDone?: () => void;
  initialFriendId?: string | null;
  onFriendViewClosed?: () => void;
  initialTab?: "me" | "village";
  onOpenContactMatch?: () => void;
}


export function ProfileScreen({ editingFromSettings, onSettingsDone, initialFriendId, onFriendViewClosed, initialTab, onOpenContactMatch }: ProfileScreenProps) {
  const { user, signOut } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<SubTab>(initialTab || "me");
  const [viewingFriend, setViewingFriend] = useState<string | null>(initialFriendId || null);
  const [viewingEdition, setViewingEdition] = useState<MonthlyEdition | null>(null);

  // Village monthly
  const { current: currentEdition, past: pastEditions, isLoading: editionsLoading } = useCurrentMonthlyEdition();
  const { data: currentRecPosts = [] } = useMonthlyRecPosts(currentEdition?.edition_month || null);
  const markViewed = useMarkEditionViewed();

  // Auto-mark viewed when village tab is active and edition exists
  useEffect(() => {
    if (tab === "village" && currentEdition && !viewingEdition) {
      markViewed.mutate(currentEdition.id);
    }
  }, [tab, currentEdition?.id]);

  // Sync initialFriendId prop changes
  useEffect(() => {
    if (initialFriendId) setViewingFriend(initialFriendId);
  }, [initialFriendId]);

  // Profile edit state
  const [editing, setEditing] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [timezone, setTimezone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showAvatarExpanded, setShowAvatarExpanded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Archive state – auto-open latest month
  const { data: archiveData, isLoading: archiveLoading } = useArchiveMonths();
  const latestMonth = archiveData?.months?.[0]?.key ?? null;
  const [selectedMonth, setSelectedMonth] = useState<string | null>("__auto__");
  const effectiveMonth = selectedMonth === "__auto__" ? latestMonth : selectedMonth;
  const showingMonthList = effectiveMonth === null;
  const { data: monthPosts, isLoading: postsLoading } = useArchivePostsByMonth(effectiveMonth);

  // Village state
  const { data: circleData, isLoading: circleLoading } = useMyCircle();
  const { data: pendingRequests, isLoading: loadingRequests } = usePendingRequests();
  const { data: sentRequests } = useSentRequests();
  const removeMutation = useRemoveFromCircle();
  const pauseMutation = usePauseFriend();
  const respondMutation = useRespondToRequest();
  const [showSearch, setShowSearch] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [friendMenu, setFriendMenu] = useState<string | null>(null);
  const [showAllActive, setShowAllActive] = useState(false);
  const [showAllInactive, setShowAllInactive] = useState(false);

  const active = circleData?.active || [];
  const inactive = circleData?.inactive || [];
  const members = [...active, ...inactive];
  const requests = pendingRequests || [];
  const sent = sentRequests || [];
  const isFounder = user ? FOUNDER_USER_IDS.includes(user.id) : false;
  const isFull = !isFounder && members.length >= MAX_FRIENDS;
  const nextShuffle = getNextShuffleDate();
  const shuffleLabel = format(nextShuffle, "MMMM d").toLowerCase();

  const months = archiveData?.months || [];
  const totalCount = archiveData?.totalCount || 0;
  const allDates = archiveData?.allDates || [];
  const daysRecorded = computeDaysRecorded(allDates);

  const dayGroups: { day: string; posts: typeof monthPosts }[] = [];
  if (monthPosts) {
    const grouped = new Map<string, typeof monthPosts>();
    for (const p of monthPosts) {
      const day = formatDay(p.created_at);
      if (!grouped.has(day)) grouped.set(day, []);
      grouped.get(day)!.push(p);
    }
    for (const [day, posts] of grouped) {
      dayGroups.push({ day, posts });
    }
  }

  const startEdit = useCallback(() => {
    setDisplayName(profile?.display_name || "");
    setBio(profile?.bio || "");
    setTimezone(profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
    setEditing(true);
    setError("");
    setSuccess("");
  }, [profile]);

  // Trigger editing from settings icon
  useEffect(() => {
    if (editingFromSettings) {
      startEdit();
    }
  }, [editingFromSettings, startEdit]);

  const handleSave = async () => {
    if (!user || !displayName.trim()) return;
    setSaving(true);
    setError("");
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim(), bio: bio.trim() || null, timezone: timezone || null })
      .eq("user_id", user.id);
    setSaving(false);
    if (updateError) {
      setError("failed to save. try again.");
    } else {
      setSuccess("saved!");
      setEditing(false);
      onSettingsDone?.();
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setTimeout(() => setSuccess(""), 2000);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    setError("");
    try {
      const compressed = await compressAvatar(file);
      const path = `avatars/${user.id}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(path, compressed, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: `${publicUrl}?t=${Date.now()}` }).eq("user_id", user.id);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setSuccess("avatar updated!");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err: any) {
      setError(err?.message || "upload failed");
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleRemove = (member: CircleMember) => {
    if (confirmRemove === member.user_id) {
      removeMutation.mutate(member.user_id);
      setConfirmRemove(null);
    } else {
      setConfirmRemove(member.user_id);
      setTimeout(() => setConfirmRemove(null), 3000);
    }
  };

  const handleRespond = (requestId: string, senderId: string, accept: boolean) => {
    if (accept && isFull) return;
    respondMutation.mutate({ requestId, accept });
  };

  const avatarInitial = (profile?.display_name || "?").charAt(0).toUpperCase();

  // If viewing a friend's profile
  if (viewingFriend) {
    return <FriendProfileView userId={viewingFriend} onBack={() => { setViewingFriend(null); onFriendViewClosed?.(); }} />;
  }

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

      {/* Avatar + name header */}
      {!profileLoading && (
        <div className="flex items-start gap-4 mb-4">
          {/* Avatar on the left */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => {
                if (profile?.avatar_url) setShowAvatarExpanded(true);
                else fileRef.current?.click();
              }}
              disabled={uploading}
              className="relative w-20 h-20 rounded-full border-0 cursor-pointer overflow-hidden flex items-center justify-center"
              style={{ background: colors.cobalt }}
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <span className="text-white font-sans text-2xl font-bold">{avatarInitial}</span>
              )}
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer"
              style={{ background: colors.card, borderColor: colors.bg }}
            >
              <CameraIcon size={11} color={colors.textMuted} />
            </button>
          </div>
          {/* Name + handle + bio on the right */}
          <div className="flex-1 min-w-0 pt-1">
            <div className="font-sans text-lg font-bold leading-tight" style={{ color: colors.text }}>
              {profile?.display_name || "friend"}
            </div>
            <div className="font-sans text-[11px] mt-0.5" style={{ color: colors.textMuted }}>
              @{(profile?.display_name || "user").toLowerCase().replace(/\s+/g, "")}
            </div>
            <div
              className="mt-2 rounded-xl p-2.5 min-h-[40px] cursor-pointer"
              style={{ background: colors.warmGray, border: `1px solid ${colors.border}` }}
              onClick={() => {
                setBio(profile?.bio || "");
                setEditingBio(true);
              }}
            >
              {editingBio ? (
                <textarea
                  autoFocus
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  onBlur={async () => {
                    if (user) {
                      await supabase.from("profiles").update({ bio: bio.trim() || null }).eq("user_id", user.id);
                      queryClient.invalidateQueries({ queryKey: ["profile"] });
                    }
                    setEditingBio(false);
                  }}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); } }}
                  maxLength={160}
                  rows={2}
                  className="w-full border-0 outline-none resize-none font-sans text-[11px] leading-relaxed bg-transparent box-border"
                  style={{ color: colors.text }}
                  placeholder="write something about yourself..."
                />
              ) : (
                <div className="font-sans text-[11px] leading-relaxed" style={{ color: profile?.bio ? colors.text : colors.textMuted }}>
                  {profile?.bio || "add bio"}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expanded avatar overlay */}
      {showAvatarExpanded && profile?.avatar_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setShowAvatarExpanded(false)}
        >
          <div className="relative" onClick={e => e.stopPropagation()}>
            <img
              src={profile.avatar_url}
              alt=""
              className="w-64 h-64 rounded-2xl object-cover shadow-2xl"
              style={{ border: `3px solid ${colors.card}` }}
            />
            <button
              onClick={() => setShowAvatarExpanded(false)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center border-0 cursor-pointer"
              style={{ background: colors.card }}
            >
              <XIcon size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Sub-tab switcher */}
      <div className="flex mb-4" style={{ border: "1.5px solid #6C6AE8", borderRadius: 24, overflow: "hidden", background: "transparent" }}>
        {([
          { id: "me" as SubTab, label: "me" },
          { id: "village" as SubTab, label: "my village" },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSelectedMonth(null); }}
            className="flex-1 border-0 font-sans text-[11px] cursor-pointer relative"
            style={{
              background: tab === t.id ? "#6C6AE8" : "transparent",
              color: tab === t.id ? "#FFFFFF" : "#6C6AE8",
              fontWeight: 500,
              borderRadius: 24,
              padding: "10px 36px",
              transition: "background 180ms ease, color 180ms ease",
            }}
          >
            {t.label}
            {t.id === "village" && requests.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center font-sans text-[8px] font-bold"
                    style={{ background: colors.electricIndigo, color: "#fff" }}>
                {requests.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Stats row — only on "me" tab */}
      {tab === "me" && !archiveLoading && (
        <div className="flex gap-2 mb-4">
          <div className="flex-1 rounded-xl p-2.5 text-center" style={{ background: colors.card, border: `1px solid ${colors.border}` }}>
            <div className="font-sans text-lg font-bold" style={{ color: colors.accent }}>{totalCount}</div>
            <div className="font-sans text-[9px]" style={{ color: colors.textMuted }}>{totalCount === 1 ? "moment captured" : "moments captured"}</div>
          </div>
          <div className="flex-1 rounded-xl p-2.5 text-center" style={{ background: colors.card, border: `1px solid ${colors.border}` }}>
            <div className="font-sans text-lg font-bold" style={{ color: colors.cobalt }}>{daysRecorded}</div>
            <div className="font-sans text-[9px]" style={{ color: colors.textMuted }}>{daysRecorded === 1 ? "day recorded" : "days recorded"}</div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg p-2 mb-3 font-sans text-[11px]" style={{ background: "#A5212A15", color: "#A5212A" }}>{error}</div>
      )}
      {success && (
        <div className="rounded-lg p-2 mb-3 font-sans text-[11px]" style={{ background: "#3B5EBF15", color: "#3B5EBF" }}>{success}</div>
      )}

      {/* ===== ME TAB ===== */}
      {tab === "me" && (
        <>
          {!editing ? (
            <div className="mb-4" />
          ) : (
            <div className="rounded-xl border p-4 mb-4 animate-fade-slide-in" style={{ background: colors.card, borderColor: colors.border }}>
              <div className="mb-3">
                <label className="font-sans text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: colors.textMuted }}>display name</label>
                <input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={50}
                  className="w-full py-2.5 px-3 rounded-lg border font-sans text-[13px] outline-none box-border"
                  style={{ borderColor: colors.border, background: colors.warmGray, color: colors.text }} />
              </div>
              <div className="mb-3">
                <label className="font-sans text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: colors.textMuted }}>bio</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={160} rows={3}
                  placeholder="tell your friends about yourself..."
                  className="w-full py-2.5 px-3 rounded-lg border font-sans text-[13px] outline-none resize-none box-border"
                  style={{ borderColor: colors.border, background: colors.warmGray, color: colors.text }} />
                <div className="text-right font-sans text-[9px] mt-0.5" style={{ color: colors.textMuted }}>{bio.length}/160</div>
              </div>
              <div className="mb-3">
                <label className="font-sans text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: colors.textMuted }}>timezone</label>
                <div className="relative">
                  <select
                    value={timezone}
                    onChange={e => setTimezone(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-lg border font-sans text-[13px] outline-none box-border appearance-none cursor-pointer"
                    style={{ borderColor: colors.border, background: colors.warmGray, color: colors.text }}
                  >
                    {(() => {
                      try {
                        return (Intl as any).supportedValuesOf("timeZone").map((tz: string) => (
                          <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
                        ));
                      } catch {
                        const fallback = [
                          "America/New_York","America/Chicago","America/Denver","America/Los_Angeles",
                          "America/Anchorage","Pacific/Honolulu","Europe/London","Europe/Paris",
                          "Europe/Berlin","Asia/Tokyo","Asia/Shanghai","Asia/Kolkata",
                          "Australia/Sydney","Pacific/Auckland","America/Toronto","America/Vancouver",
                        ];
                        return fallback.map(tz => (
                          <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
                        ));
                      }
                    })()}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none font-sans text-[10px]" style={{ color: colors.textMuted }}>▼</div>
                </div>
                <div className="font-sans text-[9px] mt-1" style={{ color: colors.textMuted }}>
                  auto-detected: {Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, " ")}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditing(false); onSettingsDone?.(); }}
                  className="flex-1 py-2.5 rounded-xl border font-sans text-xs cursor-pointer"
                  style={{ background: "transparent", borderColor: colors.border, color: colors.textMuted }}>cancel</button>
                <button onClick={handleSave} disabled={saving || !displayName.trim()}
                  className="flex-1 py-2.5 rounded-xl border-0 font-sans text-xs font-semibold cursor-pointer"
                  style={{ background: colors.accent, color: "#fff", opacity: saving ? 0.7 : 1 }}>{saving ? "saving..." : "save"}</button>
              </div>
            </div>
          )}

          {editing && (
          <div className="rounded-xl border p-4 mb-4" style={{ background: colors.card, borderColor: colors.border }}>
            <div className="flex items-center justify-between">
              <div className="flex-1 mr-3">
                <div className="font-sans text-[13px] font-medium" style={{ color: colors.text }}>
                  let friends find me by phone number
                </div>
                <div className="font-sans text-[11px] mt-0.5" style={{ color: "#8090AC" }}>
                  when on, friends who have your number can find you on kyagi.
                </div>
              </div>
              <button
                onClick={async () => {
                  if (!user) return;
                  const newVal = !(profile?.discoverable ?? true);
                  await supabase.from("profiles").update({ discoverable: newVal }).eq("user_id", user.id);
                  queryClient.invalidateQueries({ queryKey: ["profile"] });
                }}
                className="w-11 h-6 rounded-full border-0 cursor-pointer flex-shrink-0 relative transition-colors"
                style={{ background: (profile?.discoverable ?? true) ? "#6C6AE8" : "#D4DAE8" }}
              >
                <div
                  className="w-5 h-5 rounded-full absolute top-0.5 transition-all"
                  style={{
                    background: "#fff",
                    left: (profile?.discoverable ?? true) ? 22 : 2,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }}
                />
              </button>
            </div>
          </div>
          )}

          {/* Archive section */}
          <div className="mb-4">
            <div className="font-sans text-[10px] font-bold uppercase tracking-wider mb-2.5" style={{ color: colors.textMuted }}>
              archive
            </div>

            {showingMonthList ? (
              <>
                {archiveLoading && (
                  <div className="text-center py-6">
                    <div className="font-sans text-xs" style={{ color: colors.textMuted }}>loading archive...</div>
                  </div>
                )}
                {!archiveLoading && months.length === 0 && (
                  <div className="text-center py-6">
                    <div className="text-2xl mb-2">📓</div>
                    <div className="font-serif text-sm italic" style={{ color: colors.text }}>nothing here yet</div>
                    <div className="font-sans text-[11px] mt-0.5" style={{ color: colors.textMuted }}>your entries will appear here as you share</div>
                  </div>
                )}
                {months.map((m, i) => (
                  <button key={m.key} onClick={() => setSelectedMonth(m.key)}
                    className="w-full text-left rounded-xl p-3.5 mb-2 border cursor-pointer flex items-center justify-between box-border animate-fade-slide-in"
                    style={{ background: colors.card, borderColor: colors.border, animationDelay: `${i * 0.07}s` }}>
                    <div className="font-sans text-sm font-semibold" style={{ color: colors.text }}>{m.label}</div>
                    <div className="rounded-full py-0.5 px-2.5 font-sans text-[11px]" style={{ background: colors.warmGray, color: colors.textMuted }}>
                      {m.count}
                    </div>
                  </button>
                ))}
              </>
            ) : (
              <div>
                <button onClick={() => setSelectedMonth(null)}
                  className="bg-transparent border-0 cursor-pointer font-sans text-xs mb-3 p-0"
                  style={{ color: colors.accent }}>
                  ← back to all months
                </button>
                {postsLoading && (
                  <div className="text-center py-8">
                    <div className="w-5 h-5 rounded-full border-2 animate-spin-loader mx-auto mb-3"
                         style={{ borderColor: colors.border, borderTopColor: colors.accent }} />
                  </div>
                )}
                {dayGroups.map((group, i) => (
                  <div key={group.day} className="rounded-xl p-3.5 mb-2 border animate-fade-slide-in"
                       style={{ background: colors.card, borderColor: colors.border, animationDelay: `${i * 0.08}s` }}>
                    <div className="font-sans text-[11px] font-semibold mb-2" style={{ color: colors.accent }}>{group.day}</div>
                    {group.posts!.map((post, j) => (
                      <div key={post.id} className={j > 0 ? "pt-2 mt-2 border-t" : ""} style={{ borderColor: colors.border }}>
                        <ArchivePostCard post={post} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={signOut}
            className="w-full py-3 rounded-xl border font-sans text-xs cursor-pointer"
            style={{ background: "transparent", borderColor: `${colors.crimson}40`, color: colors.crimson }}>
            sign out
          </button>
        </>
      )}

      {/* ===== VILLAGE TAB ===== */}
      {tab === "village" && (
        <>
          {/* Viewing a specific edition */}
          {viewingEdition ? (
            <VillageMonthlyView
              edition={viewingEdition}
              onBack={() => setViewingEdition(null)}
            />
          ) : (
          <>


          {/* Incoming requests - respond */}
          {requests.length > 0 && (
            <div className="mb-5">
              <div className="font-sans text-[10px] font-bold uppercase tracking-wider mb-2.5" style={{ color: colors.accent }}>
                respond to requests ({requests.length})
              </div>
              {requests.map((req) => {
                const initial = req.sender_display_name.charAt(0).toUpperCase();
                return (
                  <div key={req.id}
                    className="rounded-xl p-3.5 mb-2 flex items-center gap-3 border animate-fade-slide-in"
                    style={{ background: colors.card, borderColor: `${colors.accent}30` }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-sans text-[13px] font-medium shrink-0"
                      style={{ background: PASTEL_COLORS[req.sender_display_name.charCodeAt(0) % PASTEL_COLORS.length], color: colors.text }}>
                      {initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-sans text-[13px] font-medium truncate" style={{ color: colors.text }}>
                        {req.sender_display_name}
                      </div>
                      <div className="font-sans text-[10px]" style={{ color: colors.textMuted }}>
                        wants to join my village
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => handleRespond(req.id, req.sender_id, true)}
                        disabled={respondMutation.isPending}
                        className="rounded-lg py-1.5 px-3 border-0 font-sans text-[11px] font-semibold cursor-pointer transition-opacity"
                        style={{ background: colors.accent, color: "#fff", opacity: respondMutation.isPending ? 0.6 : 1 }}>
                        accept
                      </button>
                      <button
                        onClick={() => handleRespond(req.id, req.sender_id, false)}
                        disabled={respondMutation.isPending}
                        className="rounded-lg py-1.5 px-3 border font-sans text-[11px] font-semibold cursor-pointer transition-opacity"
                        style={{ background: "transparent", borderColor: colors.border, color: colors.textMuted, opacity: respondMutation.isPending ? 0.6 : 1 }}>
                        deny
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Loading */}
          {(circleLoading || loadingRequests) && !circleData && (
            <div className="text-center py-12">
              <div className="w-6 h-6 rounded-full border-2 animate-spin-loader mx-auto mb-3"
                style={{ borderColor: colors.border, borderTopColor: colors.accent }} />
              <div className="font-sans text-xs" style={{ color: colors.textMuted }}>loading my village...</div>
            </div>
          )}

          {/* Empty state */}
          {!circleLoading && active.length === 0 && inactive.length === 0 && requests.length === 0 && (
            <div className="text-center py-12 mb-12">
              <div className="text-3xl mb-3">👋</div>
              <div className="font-serif text-base italic mb-1.5 text-center" style={{ color: colors.text }}>my village is empty</div>
              <div className="font-sans text-xs text-center" style={{ color: colors.textMuted }}>share an invite link with your closest friends</div>
            </div>
          )}

          {/* Section A: Friends in your village */}
          {!circleLoading && active.length > 0 && (
            <div className="mb-5">
              <div className="font-sans text-[11px] font-medium uppercase tracking-[1.5px] mb-3" style={{ color: colors.accent }}>
                your villagers · {active.length}
              </div>
              {(showAllActive ? active : active.slice(0, 5)).map((m) => {
                const initial = m.display_name.charAt(0).toUpperCase();
                const menuOpen = friendMenu === m.user_id;
                return (
                  <div key={m.user_id}>
                    <div
                      className="flex items-center gap-3 py-2.5 px-1"
                      style={{ borderBottom: `0.5px solid ${colors.border}`, opacity: m.paused ? 0.45 : 1 }}>
                      <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => setViewingFriend(m.user_id)}>
                        {m.avatar_url ? (
                          <img src={m.avatar_url} alt={m.display_name} className="w-9 h-9 rounded-full object-cover shrink-0" style={m.paused ? { filter: "grayscale(0.6)" } : {}} />
                        ) : (
                          <div className="w-9 h-9 rounded-full flex items-center justify-center font-sans text-[13px] font-medium shrink-0"
                            style={{ background: PASTEL_COLORS[m.display_name.charCodeAt(0) % PASTEL_COLORS.length], color: colors.text }}>
                            {initial}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-sans text-[14px] font-medium truncate" style={{ color: colors.text }}>
                              {m.display_name}
                            </span>
                            {m.paused && (
                              <span className="font-sans text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: `${colors.textMuted}18`, color: colors.textMuted }}>
                                paused
                              </span>
                            )}
                          </div>
                          {m.username && (
                            <div className="font-sans text-[11px] truncate" style={{ color: colors.textMuted }}>
                              @{m.username}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setFriendMenu(menuOpen ? null : m.user_id); }}
                        className="bg-transparent border-0 cursor-pointer p-1.5 rounded-lg shrink-0"
                        style={{ color: colors.textMuted }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <circle cx="8" cy="3" r="1.5" />
                          <circle cx="8" cy="8" r="1.5" />
                          <circle cx="8" cy="13" r="1.5" />
                        </svg>
                      </button>
                    </div>

                    {/* Action menu */}
                    {menuOpen && (
                      <div className="flex gap-2 py-2 px-1 animate-fade-slide-in" style={{ borderBottom: `0.5px solid ${colors.border}` }}>
                        <button
                          onClick={() => {
                            pauseMutation.mutate({ memberUserId: m.user_id, paused: !m.paused });
                            setFriendMenu(null);
                          }}
                          className="flex-1 py-2 rounded-lg border font-sans text-[11px] font-semibold cursor-pointer"
                          style={{ background: m.paused ? `${colors.cobalt}10` : colors.warmGray, borderColor: colors.border, color: m.paused ? colors.cobalt : colors.text }}
                        >
                          {m.paused ? "▶ unpause" : "⏸ pause"}
                        </button>
                        <button
                          onClick={() => { setConfirmRemove(m.user_id); setFriendMenu(null); }}
                          className="flex-1 py-2 rounded-lg border font-sans text-[11px] font-semibold cursor-pointer"
                          style={{ background: "#A5212A10", borderColor: "#A5212A30", color: "#A5212A" }}
                        >
                          remove
                        </button>
                        <button
                          onClick={() => setFriendMenu(null)}
                          className="py-2 px-3 rounded-lg border font-sans text-[11px] cursor-pointer"
                          style={{ background: colors.warmGray, borderColor: colors.border, color: colors.textMuted }}
                        >
                          cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Confirm remove dialog */}
              {confirmRemove && (
                <div className="rounded-xl border p-4 my-2 animate-fade-slide-in" style={{ background: "#A5212A08", borderColor: "#A5212A25" }}>
                  <div className="font-sans text-[13px] font-medium mb-1" style={{ color: colors.text }}>
                    are you sure?
                  </div>
                  <div className="font-sans text-[11px] mb-3" style={{ color: colors.textMuted }}>
                    this will remove them from your village. you can always add them back later.
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { removeMutation.mutate(confirmRemove); setConfirmRemove(null); }}
                      className="flex-1 py-2 rounded-lg border-0 font-sans text-[11px] font-semibold cursor-pointer"
                      style={{ background: "#A5212A", color: "#fff" }}
                    >
                      yes, remove
                    </button>
                    <button
                      onClick={() => setConfirmRemove(null)}
                      className="flex-1 py-2 rounded-lg border font-sans text-[11px] cursor-pointer"
                      style={{ background: "transparent", borderColor: colors.border, color: colors.textMuted }}
                    >
                      cancel
                    </button>
                  </div>
                </div>
              )}

              {!showAllActive && active.length > 5 && (
                <button
                  onClick={() => setShowAllActive(true)}
                  className="w-full py-2 bg-transparent border-0 font-sans text-[12px] cursor-pointer"
                  style={{ color: colors.textTertiary }}>
                  +{active.length - 5} more
                </button>
              )}
            </div>
          )}

          {/* Section B: Not in rotation */}
          {!circleLoading && inactive.length > 0 && (
            <div className="mb-5">
              <div className="font-sans text-[11px] font-medium uppercase tracking-[1.5px] mb-1" style={{ color: colors.textMuted }}>
                not in rotation · {inactive.length}
              </div>
              <div className="font-sans text-[12px] italic mb-3" style={{ color: colors.textTertiary }}>
                may rotate in next shuffle
              </div>
              {(showAllInactive ? inactive : inactive.slice(0, 3)).map((m) => {
                const initial = m.display_name.charAt(0).toUpperCase();
                const menuOpen = friendMenu === m.user_id;
                return (
                  <div key={m.user_id}>
                    <div
                      className="flex items-center gap-3 py-2.5 px-1"
                      style={{ borderBottom: `0.5px solid ${colors.border}`, opacity: m.paused ? 0.35 : 0.55 }}>
                      <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => setViewingFriend(m.user_id)}>
                        {m.avatar_url ? (
                          <img src={m.avatar_url} alt={m.display_name} className="w-9 h-9 rounded-full object-cover shrink-0" style={{ filter: "grayscale(0.5)" }} />
                        ) : (
                          <div className="w-9 h-9 rounded-full flex items-center justify-center font-sans text-[13px] font-medium shrink-0"
                            style={{ background: "#DDD", color: "#888" }}>
                            {initial}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-sans text-[14px] font-medium truncate" style={{ color: "#888" }}>
                              {m.display_name}
                            </span>
                            {m.paused && (
                              <span className="font-sans text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: `${colors.textMuted}18`, color: colors.textMuted }}>
                                paused
                              </span>
                            )}
                          </div>
                          {m.username && (
                            <div className="font-sans text-[11px] truncate" style={{ color: colors.textMuted }}>
                              @{m.username}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setFriendMenu(menuOpen ? null : m.user_id); }}
                        className="bg-transparent border-0 cursor-pointer p-1.5 rounded-lg shrink-0"
                        style={{ color: colors.textMuted }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <circle cx="8" cy="3" r="1.5" />
                          <circle cx="8" cy="8" r="1.5" />
                          <circle cx="8" cy="13" r="1.5" />
                        </svg>
                      </button>
                    </div>
                    {menuOpen && (
                      <div className="flex gap-2 py-2 px-1 animate-fade-slide-in" style={{ borderBottom: `0.5px solid ${colors.border}` }}>
                        <button
                          onClick={() => { pauseMutation.mutate({ memberUserId: m.user_id, paused: !m.paused }); setFriendMenu(null); }}
                          className="flex-1 py-2 rounded-lg border font-sans text-[11px] font-semibold cursor-pointer"
                          style={{ background: m.paused ? `${colors.cobalt}10` : colors.warmGray, borderColor: colors.border, color: m.paused ? colors.cobalt : colors.text }}
                        >
                          {m.paused ? "▶ unpause" : "⏸ pause"}
                        </button>
                        <button
                          onClick={() => { setConfirmRemove(m.user_id); setFriendMenu(null); }}
                          className="flex-1 py-2 rounded-lg border font-sans text-[11px] font-semibold cursor-pointer"
                          style={{ background: "#A5212A10", borderColor: "#A5212A30", color: "#A5212A" }}
                        >
                          remove
                        </button>
                        <button
                          onClick={() => setFriendMenu(null)}
                          className="py-2 px-3 rounded-lg border font-sans text-[11px] cursor-pointer"
                          style={{ background: colors.warmGray, borderColor: colors.border, color: colors.textMuted }}
                        >
                          cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {!showAllInactive && inactive.length > 3 && (
                <button
                  onClick={() => setShowAllInactive(true)}
                  className="w-full py-2 bg-transparent border-0 font-sans text-[12px] cursor-pointer"
                  style={{ color: colors.textTertiary }}>
                  +{inactive.length - 3} more
                </button>
              )}
            </div>
          )}

          {/* Sent requests - waiting for response */}
          {sent.length > 0 && (
            <div className="mb-5">
              <div className="font-sans text-[10px] font-bold uppercase tracking-wider mb-2.5" style={{ color: colors.textMuted }}>
                waiting for response ({sent.length})
              </div>
              {sent.map((sr) => {
                const initial = sr.receiver_display_name.charAt(0).toUpperCase();
                return (
                  <div key={sr.id}
                    className="flex items-center gap-3 py-2.5 px-1"
                    style={{ borderBottom: `0.5px solid ${colors.border}`, opacity: 0.7 }}>
                    {sr.receiver_avatar_url ? (
                      <img src={sr.receiver_avatar_url} alt={sr.receiver_display_name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center font-sans text-[13px] font-medium shrink-0"
                        style={{ background: PASTEL_COLORS[sr.receiver_display_name.charCodeAt(0) % PASTEL_COLORS.length], color: colors.text }}>
                        {initial}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-sans text-[14px] font-medium truncate" style={{ color: colors.text }}>
                        {sr.receiver_display_name}
                      </div>
                      <div className="font-sans text-[10px]" style={{ color: colors.textMuted }}>
                        pending · sent {new Date(sr.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                    </div>
                    <div className="rounded-full py-0.5 px-2.5 font-sans text-[10px]" style={{ background: colors.warmGray, color: colors.textMuted }}>
                      pending
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-8" />
          {/* Find friends from contacts */}
          {onOpenContactMatch && (
            <button onClick={onOpenContactMatch}
              className="w-full py-3 rounded-xl border-0 font-sans text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-2 mb-2.5"
              style={{ background: colors.redOrange, color: "#fff" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              find friends from contacts
            </button>
          )}

          {/* Find friends button */}
          <button onClick={() => setShowSearch(!showSearch)}
            className="w-full py-3 rounded-xl border-0 font-sans text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-1.5"
            style={{ background: colors.accent, color: "#fff" }}>
            <PlusIcon size={14} color="#fff" /> find & add friends
          </button>

          {showSearch && (
            <div className="mt-3">
              <UserSearch onClose={() => setShowSearch(false)} />
              {/* Share invite link — only visible after opening search */}
              <div className="mt-3">
                <InvitePanel />
              </div>
            </div>
          )}
          </>
          )}
        </>
      )}
    </div>
  );
}
