import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAvailability, useToggleAvailability } from "@/hooks/use-schedule";
import { useState, useMemo, useCallback } from "react";

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d);
  mon.setDate(diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

function getWeekStartStr(): string {
  return getMonday(new Date()).toISOString().split("T")[0];
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export interface WeeklyFriend {
  id: string;
  displayName: string;
  avatarInitial: string;
  avatarUrl: string | null;
  lastSeenDaysAgo: number | null; // null = never hung out
}

export function useWeeklyFlow() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const weekStart = getWeekStartStr();
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon...

  // Read profile for weekly_flow_completed_at
  const { data: profile } = useQuery({
    queryKey: ["profile-weekly-flow", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("weekly_flow_completed_at, onboarding_step, is_team_account")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  // Count non-team circle members
  const { data: nonTeamCount = 0 } = useQuery({
    queryKey: ["non-team-circle-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: myCircle } = await supabase
        .from("circles")
        .select("id")
        .eq("owner_id", user!.id)
        .maybeSingle();

      if (!myCircle) return 0;

      const { data: members } = await supabase
        .from("circle_members")
        .select("user_id")
        .eq("circle_id", myCircle.id);

      if (!members || members.length === 0) return 0;

      const { data: nonTeam } = await supabase
        .from("profiles")
        .select("user_id")
        .in("user_id", members.map(m => m.user_id))
        .eq("is_team_account", false);

      return nonTeam?.length || 0;
    },
  });

  // Determine if flow should show
  const shouldShowFlow = useMemo(() => {
    if (!user) return false;
    // Only Mon-Thu (1-4)
    if (dayOfWeek < 1 || dayOfWeek > 4) return false;
    if (!profile) return false;
    // Gate: must be activated or complete
    const step = profile.onboarding_step;
    if (step !== "activated" && step !== "complete") return false;
    // Must have at least 2 non-team circle members
    if (nonTeamCount < 2) return false;
    const completedAt = profile.weekly_flow_completed_at;
    if (!completedAt) return true;
    const monday = getMonday(new Date());
    return new Date(completedAt) < monday;
  }, [user, profile, dayOfWeek, nonTeamCount]);

  // Days to show
  const daysToShow = useMemo(() => {
    const monday = getMonday(new Date());
    const startOffset = dayOfWeek <= 2 ? 0 : dayOfWeek - 1; // Mon/Tue = full week, Wed=2, Thu=3
    const days: Date[] = [];
    for (let i = startOffset; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [dayOfWeek]);

  const isShortWeek = dayOfWeek >= 3 && dayOfWeek <= 4;

  // Existing availability (reuse hook)
  const { data: myAvailability = [] } = useAvailability();
  const toggleAvailability = useToggleAvailability();

  // Current week availability as a Set
  const availabilitySet = useMemo(() => {
    return new Set(myAvailability.map(a => `${a.date}|${a.time_slot}`));
  }, [myAvailability]);

  // Circle friends with lastSeen
  const { data: friends = [] } = useQuery<WeeklyFriend[]>({
    queryKey: ["weekly-flow-friends", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Get all friends (same pattern as useCircleFriends in ScheduleScreen)
      const { data: myCircle } = await supabase
        .from("circles")
        .select("id")
        .eq("owner_id", user!.id)
        .maybeSingle();

      const friendIds: string[] = [];
      if (myCircle) {
        const { data: members } = await supabase
          .from("circle_members")
          .select("user_id")
          .eq("circle_id", myCircle.id);
        (members || []).forEach(m => friendIds.push(m.user_id));
      }

      const { data: memberOf } = await supabase
        .from("circle_members")
        .select("circle_id")
        .eq("user_id", user!.id);

      if (memberOf && memberOf.length > 0) {
        const { data: owners } = await supabase
          .from("circles")
          .select("owner_id")
          .in("id", memberOf.map(m => m.circle_id));
        (owners || []).forEach(o => {
          if (!friendIds.includes(o.owner_id)) friendIds.push(o.owner_id);
        });
      }

      if (friendIds.length === 0) return [];

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", friendIds);

      // Get most recent hangout for each friend
      const { data: hangouts } = await supabase
        .from("confirmed_hangouts")
        .select("user_a_id, user_b_id, hangout_date")
        .or(`user_a_id.eq.${user!.id},user_b_id.eq.${user!.id}`)
        .order("hangout_date", { ascending: false });

      const lastSeenMap = new Map<string, string>();
      (hangouts || []).forEach((h: any) => {
        const friendId = h.user_a_id === user!.id ? h.user_b_id : h.user_a_id;
        if (!lastSeenMap.has(friendId)) {
          lastSeenMap.set(friendId, h.hangout_date);
        }
      });

      const now = new Date();
      return (profiles || []).map(p => {
        const lastDate = lastSeenMap.get(p.user_id);
        let lastSeenDaysAgo: number | null = null;
        if (lastDate) {
          lastSeenDaysAgo = Math.floor((now.getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
        }
        return {
          id: p.user_id,
          displayName: p.display_name || "friend",
          avatarInitial: (p.display_name || "?").charAt(0).toUpperCase(),
          avatarUrl: p.avatar_url || null,
          lastSeenDaysAgo,
        };
      }).sort((a, b) => {
        // null (never seen) first, then highest daysAgo first
        if (a.lastSeenDaysAgo === null && b.lastSeenDaysAgo === null) return 0;
        if (a.lastSeenDaysAgo === null) return -1;
        if (b.lastSeenDaysAgo === null) return -1;
        return b.lastSeenDaysAgo - a.lastSeenDaysAgo;
      });
    },
  });

  // Selected friends state
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());

  const toggleFriend = useCallback((friendId: string) => {
    setSelectedFriendIds(prev => {
      const next = new Set(prev);
      if (next.has(friendId)) {
        next.delete(friendId);
      } else if (next.size < 3) {
        next.add(friendId);
      }
      return next;
    });
  }, []);

  const selectTopThree = useCallback(() => {
    const top = friends.slice(0, 3).map(f => f.id);
    setSelectedFriendIds(new Set(top));
  }, [friends]);

  // Complete flow mutation
  const completeFlow = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      // Save friend priorities: delete existing, insert new
      await supabase
        .from("weekly_friend_priorities" as any)
        .delete()
        .eq("user_id", user.id)
        .eq("week_start", weekStart);

      if (selectedFriendIds.size > 0) {
        const rows = Array.from(selectedFriendIds).map(fid => ({
          user_id: user.id,
          friend_id: fid,
          week_start: weekStart,
        }));
        await supabase.from("weekly_friend_priorities" as any).insert(rows);
      }

      // Update profile timestamp + set onboarding to complete if first time
      await supabase
        .from("profiles")
        .update({ weekly_flow_completed_at: new Date().toISOString(), onboarding_step: "complete" } as any)
        .eq("user_id", user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-weekly-flow"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  return {
    shouldShowFlow,
    daysToShow,
    isShortWeek,
    friends,
    selectedFriendIds,
    toggleFriend,
    selectTopThree,
    availabilitySet,
    toggleAvailability,
    completeFlow,
  };
}
