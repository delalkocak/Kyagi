import React, { useState, useRef } from "react";
import { colors, PROMPTS } from "./data";
import { promptIcons } from "./icons";
import { PhotoMedia } from "./MediaBlock";
import { CameraIcon, XIcon } from "./icons";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/use-posts";
import { useArchiveMonths, useArchivePostsByMonth } from "@/hooks/use-archive";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { usePushPermission } from "@/hooks/use-push-permission";

function formatDay(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function computeStreak(postDates: string[]): number {
  if (postDates.length === 0) return 0;
  const uniqueDays = new Set(
    postDates.map(d => {
      const dt = new Date(d);
      return `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
    })
  );
  let streak = 0;
  const now = new Date();
  for (let i = 0; i < 365; i++) {
    const check = new Date(now);
    check.setDate(check.getDate() - i);
    const key = `${check.getFullYear()}-${check.getMonth()}-${check.getDate()}`;
    if (uniqueDays.has(key)) {
      streak++;
    } else if (i === 0) {
      continue;
    } else {
      break;
    }
  }
  return streak;
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
      const size = 256;
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
        0.85
      );
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

function DiscoverabilityToggle() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [toggling, setToggling] = useState(false);
  const discoverable = (profile as any)?.discoverable ?? true;

  const handleToggle = async () => {
    if (!user) return;
    setToggling(true);
    await supabase
      .from("profiles")
      .update({ discoverable: !discoverable } as any)
      .eq("user_id", user.id);
    qc.invalidateQueries({ queryKey: ["profile"] });
    setToggling(false);
  };

  return (
    <div className="rounded-xl border p-4 mb-3 flex items-center justify-between" style={{ background: colors.card, borderColor: colors.border }}>
      <div>
        <div className="font-sans text-xs font-semibold" style={{ color: colors.text }}>let friends find me by phone number</div>
        <div className="font-sans text-[10px] mt-0.5" style={{ color: colors.textMuted }}>
          when on, friends who have your number can find you on kyagi.
        </div>
      </div>
      <button
        onClick={handleToggle}
        disabled={toggling}
        className="px-3 py-1.5 rounded-lg border-0 font-sans text-[11px] font-semibold cursor-pointer"
        style={{
          background: discoverable ? colors.accent : colors.warmGray,
          color: discoverable ? "#fff" : colors.textMuted,
          opacity: toggling ? 0.5 : 1,
        }}
      >
        {discoverable ? "on" : "off"}
      </button>
    </div>
  );
}

type Tab = "profile" | "archive";

export function MeScreen() {
  const { user, signOut } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const queryClient = useQueryClient();
  const push = usePushPermission();
  const [tab, setTab] = useState<Tab>("profile");

  // Profile state
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Archive state – auto-open latest month
  const { data: archiveData, isLoading: archiveLoading } = useArchiveMonths();
  const latestMonth = archiveData?.months?.[0]?.key ?? null;
  const [selectedMonth, setSelectedMonth] = useState<string | null>("__auto__");
  const effectiveMonth = selectedMonth === "__auto__" ? latestMonth : selectedMonth;
  const showingMonthList = effectiveMonth === null;
  const { data: monthPosts, isLoading: postsLoading } = useArchivePostsByMonth(effectiveMonth);

  const months = archiveData?.months || [];
  const totalCount = archiveData?.totalCount || 0;
  const mediaCount = archiveData?.mediaCount || 0;
  const allDates = archiveData?.allDates || [];
  const daysRecorded = computeDaysRecorded(allDates);
  const streak = computeStreak(allDates);

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

  const startEdit = () => {
    setDisplayName(profile?.display_name || "");
    setUsername((profile as any)?.username || "");
    setBio(profile?.bio || "");
    setEditing(true);
    setError("");
    setSuccess("");
  };

  const handleSave = async () => {
    if (!user || !displayName.trim()) return;
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (cleanUsername && (cleanUsername.length < 3 || cleanUsername.length > 30)) {
      setError("username must be 3-30 characters (letters, numbers, underscores)");
      return;
    }
    setSaving(true);
    setError("");
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        bio: bio.trim() || null,
        username: cleanUsername || null,
      } as any)
      .eq("user_id", user.id);
    setSaving(false);
    if (updateError) {
      if (updateError.message?.includes("unique") || updateError.code === "23505") {
        setError("that username is already taken");
      } else {
        setError("failed to save. try again.");
      }
    } else {
      setSuccess("saved!");
      setEditing(false);
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

  const avatarInitial = (profile?.display_name || "?").charAt(0).toUpperCase();

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

      {/* Avatar + name header */}
      {!profileLoading && (
        <div className="flex flex-col items-center mb-4">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="relative w-16 h-16 rounded-full border-0 cursor-pointer overflow-hidden flex items-center justify-center"
            style={{ background: colors.cobalt }}
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-sans text-xl font-bold">{avatarInitial}</span>
            )}
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <CameraIcon size={16} color="#fff" />
            </div>
          </button>
          <div className="font-sans text-sm font-semibold mt-2" style={{ color: colors.text }}>
            {profile?.display_name || "friend"}
          </div>
          {(profile as any)?.username && (
            <div className="font-sans text-[11px] mt-0.5" style={{ color: colors.textMuted }}>
              @{(profile as any).username}
            </div>
          )}
          {profile?.bio && (
            <div className="font-sans text-[11px] mt-0.5 text-center max-w-[200px]" style={{ color: colors.textMuted }}>
              {profile.bio}
            </div>
          )}
          <div className="font-sans text-[9px] mt-1" style={{ color: colors.textMuted }}>
            {uploading ? "uploading..." : "tap photo to change"}
          </div>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 bg-opacity-50 rounded-xl p-0.5 mb-4" style={{ background: colors.warmGray }}>
        {[
          { id: "profile" as Tab, label: "profile" },
          { id: "archive" as Tab, label: "archive" },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setSelectedMonth(null); }}
            className="flex-1 py-2 rounded-lg border-0 font-sans text-[11px] font-semibold cursor-pointer transition-all"
            style={{
              background: tab === t.id ? colors.card : "transparent",
              color: tab === t.id ? colors.text : colors.textMuted,
              boxShadow: tab === t.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Stats row (always visible) */}
      {!archiveLoading && (
        <div className="flex gap-2 mb-4">
          <div className="flex-1 rounded-xl p-2.5 text-center" style={{ background: colors.card, border: `1px solid ${colors.border}` }}>
            <div className="font-sans text-lg font-bold" style={{ color: colors.accent }}>{totalCount}</div>
            <div className="font-sans text-[9px]" style={{ color: colors.textMuted }}>{totalCount === 1 ? "moment captured" : "moments captured"}</div>
          </div>
          <div className="flex-1 rounded-xl p-2.5 text-center" style={{ background: colors.card, border: `1px solid ${colors.border}` }}>
            <div className="font-sans text-lg font-bold" style={{ color: colors.cobalt }}>{daysRecorded}</div>
            <div className="font-sans text-[9px]" style={{ color: colors.textMuted }}>{daysRecorded === 1 ? "day recorded" : "days recorded"}</div>
          </div>
          <div className="flex-1 rounded-xl p-2.5 text-center" style={{ background: colors.card, border: `1px solid ${colors.border}` }}>
            <div className="font-sans text-lg font-bold flex items-center justify-center gap-0.5" style={{ color: colors.amber }}>
              🔥 {streak}
            </div>
            <div className="font-sans text-[9px]" style={{ color: colors.textMuted }}>streak</div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg p-2 mb-3 font-sans text-[11px]" style={{ background: "#A5212A15", color: "#A5212A" }}>{error}</div>
      )}
      {success && (
        <div className="rounded-lg p-2 mb-3 font-sans text-[11px]" style={{ background: "#3B5EBF15", color: "#3B5EBF" }}>{success}</div>
      )}

      {/* PROFILE TAB */}
      {tab === "profile" && (
        <>
          {!editing ? (
            <div className="rounded-xl border p-4 mb-4" style={{ background: colors.card, borderColor: colors.border }}>
              <div className="font-sans text-[10px] mb-3" style={{ color: colors.textMuted }}>{user?.email}</div>
              <button onClick={startEdit}
                className="w-full py-2.5 rounded-xl border font-sans text-xs font-semibold cursor-pointer"
                style={{ background: "transparent", borderColor: colors.border, color: colors.text }}>
                edit profile
              </button>
            </div>
          ) : (
            <div className="rounded-xl border p-4 mb-4 animate-fade-slide-in" style={{ background: colors.card, borderColor: colors.border }}>
              <div className="mb-3">
                <label className="font-sans text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: colors.textMuted }}>display name</label>
                <input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={50}
                  className="w-full py-2.5 px-3 rounded-lg border font-sans text-[13px] outline-none box-border"
                  style={{ borderColor: colors.border, background: colors.warmGray, color: colors.text }} />
              </div>
              <div className="mb-3">
                <label className="font-sans text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: colors.textMuted }}>username</label>
                <div className="flex items-center rounded-lg border overflow-hidden" style={{ borderColor: colors.border, background: colors.warmGray }}>
                  <span className="font-sans text-[13px] pl-3" style={{ color: colors.textMuted }}>@</span>
                  <input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} maxLength={30}
                    placeholder="choose a username"
                    className="flex-1 py-2.5 px-1 pr-3 border-0 font-sans text-[13px] outline-none bg-transparent box-border"
                    style={{ color: colors.text }} />
                </div>
                <div className="font-sans text-[9px] mt-0.5" style={{ color: colors.textMuted }}>letters, numbers, underscores only</div>
              </div>
              <div className="mb-3">
                <label className="font-sans text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: colors.textMuted }}>bio</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={160} rows={3}
                  placeholder="tell your friends about yourself..."
                  className="w-full py-2.5 px-3 rounded-lg border font-sans text-[13px] outline-none resize-none box-border"
                  style={{ borderColor: colors.border, background: colors.warmGray, color: colors.text }} />
                <div className="text-right font-sans text-[9px] mt-0.5" style={{ color: colors.textMuted }}>{bio.length}/160</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)}
                  className="flex-1 py-2.5 rounded-xl border font-sans text-xs cursor-pointer"
                  style={{ background: "transparent", borderColor: colors.border, color: colors.textMuted }}>cancel</button>
                <button onClick={handleSave} disabled={saving || !displayName.trim()}
                  className="flex-1 py-2.5 rounded-xl border-0 font-sans text-xs font-semibold cursor-pointer"
                  style={{ background: colors.accent, color: "#fff", opacity: saving ? 0.7 : 1 }}>{saving ? "saving..." : "save"}</button>
              </div>
            </div>
          )}

          {/* Push notifications toggle */}
          {push.isSupported && (
            <div className="rounded-xl border p-4 mb-3 flex items-center justify-between" style={{ background: colors.card, borderColor: colors.border }}>
              <div>
                <div className="font-sans text-xs font-semibold" style={{ color: colors.text }}>push notifications</div>
                <div className="font-sans text-[10px] mt-0.5" style={{ color: colors.textMuted }}>
                  {push.isDenied
                    ? "blocked in browser settings"
                    : push.isSubscribed
                    ? "you'll get notified about friends & activities"
                    : "get notified when friends post or invite you"}
                </div>
              </div>
              <button
                onClick={() => push.isSubscribed ? push.unsubscribe() : push.subscribe()}
                disabled={push.loading || push.isDenied}
                className="px-3 py-1.5 rounded-lg border-0 font-sans text-[11px] font-semibold cursor-pointer"
                style={{
                  background: push.isSubscribed ? colors.warmGray : colors.accent,
                  color: push.isSubscribed ? colors.textMuted : "#fff",
                  opacity: push.loading || push.isDenied ? 0.5 : 1,
                }}
              >
                {push.loading ? "..." : push.isSubscribed ? "disable" : "enable"}
              </button>
            </div>
          )}

          {/* Discoverability toggle */}
          <DiscoverabilityToggle />

          <button onClick={signOut}
            className="w-full py-3 rounded-xl border font-sans text-xs cursor-pointer mt-3"
            style={{ background: "transparent", borderColor: `${colors.crimson}40`, color: colors.crimson }}>
            sign out
          </button>
        </>
      )}

      {/* ARCHIVE TAB */}
      {tab === "archive" && (
        <>
          {showingMonthList ? (
            <>
              {archiveLoading && (
                <div className="text-center py-8">
                  <div className="font-sans text-xs" style={{ color: colors.textMuted }}>loading archive...</div>
                </div>
              )}
              {!archiveLoading && months.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-3xl mb-3">📓</div>
                  <div className="font-serif text-base italic mb-1.5" style={{ color: colors.text }}>nothing here yet</div>
                  <div className="font-sans text-xs" style={{ color: colors.textMuted }}>your entries will appear here as you share</div>
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
                  {group.posts!.map((post, j) => {
                    const prompt = PROMPTS.find(p => p.id === post.prompt_type) || PROMPTS[0];
                    return (
                      <div key={post.id} className={j > 0 ? "pt-2 mt-2 border-t" : ""} style={{ borderColor: colors.border }}>
                        <div className="inline-flex items-center gap-1 rounded-2xl py-0.5 pl-1.5 pr-2 mb-1"
                             style={{ background: `${prompt.color}12` }}>
                          {promptIcons[prompt.icon](prompt.color)}
                          <span className="font-sans text-[9px] font-semibold" style={{ color: prompt.color }}>{prompt.label}</span>
                        </div>
                        <p className="font-serif text-[13px] leading-relaxed m-0" style={{ color: colors.text }}>{post.content}</p>
                        {post.media.map((m, k) => (
                          <PhotoMedia key={k} url={m.url} />
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
