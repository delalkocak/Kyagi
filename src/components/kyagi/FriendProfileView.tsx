import React, { useState } from "react";
import { colors } from "./data";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFriendArchive } from "@/hooks/use-archive";
import { ArchivePostCard } from "./ArchivePostCard";
import { toast } from "sonner";

const AVATAR_COLORS = ["#8B1A2B", "#2B5BA8", "#1A7A6D", "#C48A1A", "#1E4D8C", "#A5212A", "#3A6DB5"];
function avatarColor(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatDay(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const CATEGORY_EMOJIS: Record<string, string> = {
  health: "🏃",
  learning: "📚",
  creative: "🎨",
};

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split("T")[0];
}

function useFriendProfile(userId: string) {
  return useQuery({
    queryKey: ["friend-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, bio")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function useFriendPriorities(userId: string) {
  const weekStart = getWeekStart();
  return useQuery({
    queryKey: ["friend-priorities", userId, weekStart],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_priorities")
        .select("*")
        .eq("user_id", userId)
        .eq("week_start", weekStart)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });
}

function usePriorityInterests(priorityIds: string[]) {
  return useQuery({
    queryKey: ["priority-interests", priorityIds],
    enabled: priorityIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("priority_interests" as any)
        .select("*")
        .in("priority_id", priorityIds);
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

function useToggleInterest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ priorityId, ownerUserId, activity }: { priorityId: string; ownerUserId: string; activity: string }) => {
      if (!user) throw new Error("Not authenticated");

      // Check if already interested
      const { data: existing } = await supabase
        .from("priority_interests" as any)
        .select("id")
        .eq("priority_id", priorityId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        await supabase.from("priority_interests" as any).delete().eq("id", (existing as any).id);
      } else {
        await supabase.from("priority_interests" as any).insert({
          priority_id: priorityId,
          user_id: user.id,
        });

        // Notify the priority owner
        const { data: myProfile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", user.id)
          .single();

        const myName = myProfile?.display_name || "a friend";
        await supabase.from("notifications").insert({
          user_id: ownerUserId,
          type: "priority_interest",
          title: `${myName} wants to join you for "${activity}"`,
          reference_id: priorityId,
        } as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["priority-interests"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

interface FriendProfileViewProps {
  userId: string;
  onBack: () => void;
}

export function FriendProfileView({ userId, onBack }: FriendProfileViewProps) {
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useFriendProfile(userId);
  const { data: archive, isLoading: archiveLoading } = useFriendArchive(userId);
  const { data: priorities = [] } = useFriendPriorities(userId);
  const priorityIds = priorities.map((p: any) => p.id);
  const { data: interests = [] } = usePriorityInterests(priorityIds);
  const toggleInterest = useToggleInterest();

  const color = avatarColor(userId);
  const displayName = profile?.display_name || "friend";
  const initial = displayName.charAt(0).toUpperCase();
  const posts = archive?.posts || [];

  const isInterested = (priorityId: string) =>
    interests.some((i: any) => i.priority_id === priorityId && i.user_id === user?.id);

  const interestCount = (priorityId: string) =>
    interests.filter((i: any) => i.priority_id === priorityId).length;

  // Group by day
  const dayGroups: { day: string; posts: typeof posts }[] = [];
  const grouped = new Map<string, typeof posts>();
  for (const p of posts) {
    const day = formatDay(p.created_at);
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day)!.push(p);
  }
  for (const [day, dayPosts] of grouped) {
    dayGroups.push({ day, posts: dayPosts });
  }

  return (
    <div>
      <button onClick={onBack}
        className="bg-transparent border-0 cursor-pointer font-sans text-xs mb-4 p-0"
        style={{ color: colors.accent }}>
        ← back to village
      </button>

      {/* Profile header */}
      {!profileLoading && (
        <div className="flex items-start gap-4 mb-5">
          {/* Avatar on the left */}
          <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
               style={{ background: color }}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-sans text-xl font-bold">{initial}</span>
            )}
          </div>
          {/* Name + handle + bio on the right */}
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="font-sans text-lg font-bold leading-tight" style={{ color: colors.text }}>
              {displayName}
            </div>
            <div className="font-sans text-[11px] mt-0.5" style={{ color: colors.textMuted }}>
              @{displayName.toLowerCase().replace(/\s+/g, "")}
            </div>
            <div className="mt-2 rounded-lg p-2.5 min-h-[44px]"
                 style={{ background: colors.warmGray, border: `1px solid ${colors.border}` }}>
              <div className="font-sans text-[11px] leading-relaxed" style={{ color: profile?.bio ? colors.text : colors.textMuted }}>
                {profile?.bio || "no bio yet"}
              </div>
            </div>
            <div className="font-sans text-[10px] mt-1.5 inline-block px-2.5 py-0.5 rounded-full"
                 style={{ background: `${colors.periwinkle}20`, color: colors.periwinkle }}>
              in my village
            </div>
          </div>
        </div>
      )}

      {/* Weekly priorities */}
      {priorities.length > 0 && (
        <div className="mb-5">
          <div className="font-sans text-[10px] font-bold uppercase tracking-wider mb-2.5" style={{ color: colors.textMuted }}>
            {displayName}'s priorities this week
          </div>
          <div className="space-y-1.5">
            {priorities.map((p: any) => {
              const emoji = CATEGORY_EMOJIS[p.category] || "✨";
              const interested = isInterested(p.id);
              const count = interestCount(p.id);
              return (
                <div key={p.id} className="rounded-xl border p-3 animate-fade-slide-in"
                     style={{ background: colors.card, borderColor: interested ? colors.cobalt : colors.border }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{emoji}</span>
                      <span className="font-sans text-[12px] font-medium" style={{ color: colors.text }}>
                        {p.activity}
                      </span>
                      {p.completed && (
                        <span className="font-sans text-[9px] px-1.5 py-0.5 rounded-full"
                              style={{ background: `${colors.cobalt}15`, color: colors.cobalt }}>done ✓</span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        toggleInterest.mutate(
                          { priorityId: p.id, ownerUserId: userId, activity: p.activity },
                          {
                            onSuccess: () => {
                              if (!interested) toast("they'll know you're interested! 🙌");
                            },
                          }
                        );
                      }}
                      className="flex items-center gap-1 py-1.5 px-3 rounded-full border-0 cursor-pointer font-sans text-[10px] font-semibold transition-all"
                      style={{
                        background: interested ? colors.cobalt : `${colors.cobalt}15`,
                        color: interested ? "#fff" : colors.cobalt,
                      }}
                    >
                      {interested ? "interested ✓" : "i'm down"}
                      {count > 0 && !interested && (
                        <span className="ml-0.5 font-bold">{count}</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      {!archiveLoading && (
        <div className="flex gap-2 mb-5">
          <div className="flex-1 rounded-xl p-2.5 text-center" style={{ background: colors.card, border: `1px solid ${colors.border}` }}>
            <div className="font-sans text-lg font-bold" style={{ color: colors.accent }}>{archive?.totalCount || 0}</div>
            <div className="font-sans text-[9px]" style={{ color: colors.textMuted }}>moments shared</div>
          </div>
          <div className="flex-1 rounded-xl p-2.5 text-center" style={{ background: colors.card, border: `1px solid ${colors.border}` }}>
            <div className="font-sans text-lg font-bold" style={{ color: colors.cobalt }}>{dayGroups.length}</div>
            <div className="font-sans text-[9px]" style={{ color: colors.textMuted }}>days recorded</div>
          </div>
        </div>
      )}

      {/* Archive */}
      <div className="mb-4">
        <div className="font-sans text-[10px] font-bold uppercase tracking-wider mb-2.5" style={{ color: colors.textMuted }}>
          {displayName}'s archive
        </div>

        {archiveLoading && (
          <div className="text-center py-8">
            <div className="w-5 h-5 rounded-full border-2 animate-spin-loader mx-auto mb-3"
                 style={{ borderColor: colors.border, borderTopColor: colors.accent }} />
          </div>
        )}

        {!archiveLoading && posts.length === 0 && (
          <div className="text-center py-6">
            <div className="text-2xl mb-2">📓</div>
            <div className="font-serif text-sm italic" style={{ color: colors.text }}>no entries yet</div>
          </div>
        )}

        {dayGroups.map((group, i) => (
          <div key={group.day} className="rounded-xl p-3.5 mb-2 border animate-fade-slide-in"
               style={{ background: colors.card, borderColor: colors.border, animationDelay: `${i * 0.08}s` }}>
            <div className="font-sans text-[11px] font-semibold mb-2" style={{ color: colors.accent }}>{group.day}</div>
            {group.posts.map((post, j) => (
              <div key={post.id} className={j > 0 ? "pt-2 mt-2 border-t" : ""} style={{ borderColor: colors.border }}>
                <ArchivePostCard post={post} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
