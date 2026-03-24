import React, { useState, useMemo } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FriendFlareCards } from "./FlareDisplay";
import { colors } from "./data";
import { useAuth } from "@/contexts/AuthContext";
import {
  useAvailability,
  useFriendsAvailability,
  useToggleAvailability,
  useScheduleRequests,
  useSendScheduleRequest,
  useRespondToScheduleRequest,
  useConfirmedHangouts,
  TIME_BLOCKS,
  TimeBlockKey,
} from "@/hooks/use-schedule";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { XIcon } from "./icons";
import { toast } from "sonner";

const TIME_BLOCK_KEYS = Object.keys(TIME_BLOCKS) as TimeBlockKey[];
const SLOT_LABELS: Record<string, string> = { early_morning: "early", morning: "am", afternoon: "pm", evening: "eve" };
const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

const ACTIVITY_SUGGESTIONS = [
  "go for a walk together",
  "go to yoga together",
  "go grocery shopping together",
  "facetime while doing laundry",
  "co-work this weekend",
  "cook dinner together",
  "tea time",
  "reading party",
  "book swap",
  "go to pilates together",
  "hackathon together",
  "vibe code together",
];

const PRIORITY_CATEGORIES: { id: string; label: string; emoji: string; activities: string[] }[] = [
  {
    id: "health", label: "health", emoji: "🏃",
    activities: ["running", "long walk at sunset", "walk + talk on the phone", "yoga", "pilates", "hike", "swim", "stretch session", "bike ride", "dance class"],
  },
  {
    id: "learning", label: "learning", emoji: "📚",
    activities: ["read together", "book club chat", "learn a new recipe", "language practice", "podcast + discuss", "teach each other something", "museum visit"],
  },
  {
    id: "creative", label: "arts + crafts", emoji: "🎨",
    activities: ["watercolor together", "write a song", "jam session", "collage night", "pottery class", "sketch session", "creative writing", "photography walk", "knitting circle"],
  },
];

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getWeekStart(): string {
  const now = new Date();
  const dow = now.getDay();
  const diff = now.getDate() - dow + (dow === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  return formatLocalDate(monday);
}

function getLastWeekStart(): string {
  const now = new Date();
  const dow = now.getDay();
  const diff = now.getDate() - dow + (dow === 0 ? -6 : 1) - 7;
  const monday = new Date(now);
  monday.setDate(diff);
  return formatLocalDate(monday);
}

function useWeeklyPriorities() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const weekStart = getWeekStart();

  const query = useQuery({
    queryKey: ["weekly-priorities", user?.id, weekStart],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_priorities")
        .select("*")
        .eq("user_id", user!.id)
        .eq("week_start", weekStart)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const addPriority = useMutation({
    mutationFn: async ({ activity, category }: { activity: string; category: string }) => {
      const { error } = await supabase.from("weekly_priorities").insert({
        user_id: user!.id, activity, category, week_start: weekStart,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["weekly-priorities"] }),
  });

  const toggleCompleted = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from("weekly_priorities")
        .update({ completed } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["weekly-priorities"] }),
  });

  const removePriority = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("weekly_priorities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["weekly-priorities"] }),
  });

  return { ...query, addPriority, toggleCompleted, removePriority };
}

function useLastWeekPriorities() {
  const { user } = useAuth();
  const lastWeekStart = getLastWeekStart();

  return useQuery({
    queryKey: ["last-week-priorities", user?.id, lastWeekStart],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_priorities")
        .select("*")
        .eq("user_id", user!.id)
        .eq("week_start", lastWeekStart)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });
}

function useFriendsPriorities(friendIds: string[]) {
  const weekStart = getWeekStart();

  return useQuery({
    queryKey: ["friends-priorities", weekStart, friendIds],
    enabled: friendIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_priorities")
        .select("*")
        .in("user_id", friendIds)
        .eq("week_start", weekStart)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

function getNext14Days(): { date: string; label: string; dayName: string; monthLabel: string; isFirstOfMonth: boolean }[] {
  const days: { date: string; label: string; dayName: string; monthLabel: string; isFirstOfMonth: boolean }[] = [];
  const now = new Date();
  let lastMonth = -1;
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const month = d.getMonth();
    days.push({
      date: d.toISOString().split("T")[0],
      label: d.getDate().toString(),
      dayName: d.toLocaleDateString("en", { weekday: "short" }).toLowerCase(),
      monthLabel: d.toLocaleDateString("en", { month: "long" }).toLowerCase(),
      isFirstOfMonth: month !== lastMonth,
    });
    lastMonth = month;
  }
  return days;
}

function useCircleFriends() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["circle-friends-schedule"],
    enabled: !!user,
    queryFn: async () => {
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

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", friendIds);

      return profiles || [];
    },
  });
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" });
}

// ─── Decline Modal ───
function DeclineModal({ onDecline, onClose }: { onDecline: (note: string) => void; onClose: () => void }) {
  const [note, setNote] = useState("");
  const NOTE_LIMIT = 150;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }} onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div 
        className="relative w-full max-w-md rounded-t-2xl p-5 pb-10 animate-fade-slide-in"
        style={{ background: colors.card }}
        onClick={e => e.stopPropagation()}
      >
        <div className="font-sans text-sm font-semibold mb-3" style={{ color: colors.text }}>
          let them know why (optional)
        </div>
        <div className="relative mb-3">
          <input
            value={note}
            onChange={e => setNote(e.target.value.slice(0, NOTE_LIMIT))}
            placeholder="can't make it because..."
            autoFocus
            className="w-full py-2.5 px-3 pr-14 rounded-xl border font-sans text-[12px] outline-none box-border"
            style={{ borderColor: colors.border, background: colors.warmGray, color: colors.text }}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-sans text-[9px]"
                style={{ color: note.length > 120 ? colors.accent : colors.textMuted }}>
            {note.length}/{NOTE_LIMIT}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onDecline(note)}
            className="flex-1 py-2.5 rounded-xl border-0 font-sans text-xs font-semibold cursor-pointer"
            style={{ background: colors.accent, color: "#fff" }}
          >
            send
          </button>
          <button
            onClick={() => onDecline("")}
            className="font-sans text-[11px] bg-transparent border-0 cursor-pointer"
            style={{ color: colors.textMuted }}
          >
            skip
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Group Hang Inbox ───
function GroupHangInbox({ user, friends, getFriendName, getFriendAvatar }: {
  user: any; friends: any[]; getFriendName: (id: string) => string; getFriendAvatar: (id: string) => string;
}) {
  const queryClient = useQueryClient();

  const { data: incomingRequests = [] } = useQuery({
    queryKey: ["group-hang-requests", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_hang_requests" as any)
        .select("*")
        .eq("approver_id", user!.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const respond = async (requestId: string, status: "approved" | "denied") => {
    await supabase
      .from("group_hang_requests" as any)
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", requestId);

    if (status === "approved") {
      toast.success("group hang approved! 🎉");
    } else {
      toast("request declined");
    }

    const req = incomingRequests.find((r: any) => r.id === requestId);
    if (req) {
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user!.id)
        .single();

      const myName = myProfile?.display_name || "your friend";
      await supabase.from("notifications").insert({
        user_id: req.requester_id,
        type: status === "approved" ? "group_hang_approved" : "group_hang_denied",
        title: status === "approved"
          ? `${myName} approved adding friends to your hangout!`
          : `${myName} declined your group hang request`,
        reference_id: req.hangout_id,
      } as any);
    }

    queryClient.invalidateQueries({ queryKey: ["group-hang-requests"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  // Fetch approved group hang requests to determine current hangout sizes
  const { data: approvedGroupHangs = [] } = useQuery({
    queryKey: ["approved-group-hangs", user?.id],
    enabled: !!user && incomingRequests.length > 0,
    queryFn: async () => {
      const hangoutIds = [...new Set(incomingRequests.map((r: any) => r.hangout_id))];
      if (hangoutIds.length === 0) return [];
      const { data } = await supabase
        .from("group_hang_requests" as any)
        .select("hangout_id, suggested_people")
        .in("hangout_id", hangoutIds)
        .eq("status", "approved");
      return (data || []) as any[];
    },
  });

  const getHangoutCurrentSize = (hangoutId: string) => {
    // Base size is 2 (user_a + user_b)
    const approvedForHangout = approvedGroupHangs.filter((g: any) => g.hangout_id === hangoutId);
    const addedPeople = approvedForHangout.reduce((sum: number, g: any) => sum + ((g.suggested_people as any[]) || []).length, 0);
    return 2 + addedPeople;
  };

  if (incomingRequests.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="font-sans text-xs font-semibold mb-2" style={{ color: colors.text }}>group hang requests</div>
      {incomingRequests.map((req: any) => {
        const people = (req.suggested_people || []) as { user_id: string; name: string }[];
        const currentSize = getHangoutCurrentSize(req.hangout_id);
        const declineLabel = currentSize <= 2 ? "prefer 1-1 time" : "keep intimate";
        return (
          <div key={req.id} className="rounded-xl border p-3.5 mb-2 animate-fade-slide-in"
               style={{ background: colors.card, borderColor: colors.border }}>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                   style={{ background: colors.cobalt }}>
                <span className="text-white text-[11px] font-semibold">{getFriendAvatar(req.requester_id)}</span>
              </div>
              <div className="font-sans text-[12px] font-semibold" style={{ color: colors.text }}>
                {getFriendName(req.requester_id)}
              </div>
            </div>
            <div className="font-sans text-[11px] mb-2" style={{ color: colors.text }}>
              wants to add {people.map(p => p.name).join(", ")} to your hangout
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => respond(req.id, "approved")}
                className="flex-1 py-2 rounded-lg border-0 font-sans text-[11px] font-semibold cursor-pointer"
                style={{ background: colors.cobalt, color: "#fff" }}
              >
                accept
              </button>
              <button
                onClick={() => respond(req.id, "denied")}
                className="flex-1 py-2 rounded-lg border font-sans text-[11px] cursor-pointer"
                style={{ background: "transparent", borderColor: colors.border, color: colors.textMuted }}
              >
                {declineLabel}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface ScheduleScreenProps {
  highlightRequestId?: string | null;
  onHighlightDone?: () => void;
}

export function ScheduleScreen({ highlightRequestId, onHighlightDone }: ScheduleScreenProps) {
  const { user } = useAuth();
  
  const { data: myAvailability = [] } = useAvailability();
  const { data: friendsAvailability = [] } = useFriendsAvailability();
  const toggleAvailability = useToggleAvailability();
  const { data: requests = [] } = useScheduleRequests();
  const sendRequest = useSendScheduleRequest();
  const respondToRequest = useRespondToScheduleRequest();
  const { data: friends = [] } = useCircleFriends();
  const { data: confirmedHangouts = [] } = useConfirmedHangouts();
  const { data: priorities = [], addPriority, toggleCompleted, removePriority } = useWeeklyPriorities();
  const { data: lastWeekPriorities = [] } = useLastWeekPriorities();
  const friendIds = useMemo(() => friends.map((f: any) => f.user_id), [friends]);
  const { data: friendsPriorities = [] } = useFriendsPriorities(friendIds);
  const [showFriendsPriorities, setShowFriendsPriorities] = useState(false);
  const [showLastWeek, setShowLastWeek] = useState(true);
  const [calWeek, setCalWeek] = useState(0); // 0 = this week (7 days), 1 = next week

  const [selectedFriend, setSelectedFriend] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [activity, setActivity] = useState("");
  const [note, setNote] = useState("");
  const [showSend, setShowSend] = useState(false);
  const [sendError, setSendError] = useState("");
  const [showAddPriority, setShowAddPriority] = useState(false);
  const [priorityCategory, setPriorityCategory] = useState("");
  const [customPriority, setCustomPriority] = useState("");
  const [decliningRequestId, setDecliningRequestId] = useState<string | null>(null);
  // For "Try another time" pre-fill
  const [prefillFriend, setPrefillFriend] = useState("");
  const [prefillActivity, setPrefillActivity] = useState("");
  // Confirmed hangout edit modal
  const [editingHangout, setEditingHangout] = useState<any | null>(null);
  const [hangoutTapGuardUntil, setHangoutTapGuardUntil] = useState(0);
  // Group hang modal
  const [groupHangTarget, setGroupHangTarget] = useState<any | null>(null);
  const [suggestedPeople, setSuggestedPeople] = useState<string[]>([]);

  // Auto-scroll to highlighted request from notification
  const highlightRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (highlightRequestId && highlightRef.current) {
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
      const timer = setTimeout(() => onHighlightDone?.(), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightRequestId]);

  const NOTE_LIMIT = 200;

  const days = useMemo(() => getNext14Days(), []);

  const myAvailSet = useMemo(() => {
    return new Set(myAvailability.map(a => `${a.date}|${a.time_slot}`));
  }, [myAvailability]);

  const friendAvailMap = useMemo(() => {
    const map = new Map<string, string[]>();
    friendsAvailability.forEach(a => {
      const key = `${a.date}|${a.time_slot}`;
      const existing = map.get(key) || [];
      existing.push(a.user_id);
      map.set(key, existing);
    });
    return map;
  }, [friendsAvailability]);

  const handleToggle = (date: string, slot: string) => {
    toggleAvailability.mutate({ date, timeSlot: slot });
  };

  const handleSend = async () => {
    if (!selectedFriend || !selectedDate || !selectedSlot || !activity.trim()) return;
    setSendError("");
    try {
      await sendRequest.mutateAsync({
        recipientId: selectedFriend,
        date: selectedDate,
        timeSlot: selectedSlot,
        activity: activity.trim(),
        note: note.trim() || undefined,
      });
      const friendName = getFriendName(selectedFriend);
      toast.success(`invite sent to ${friendName}!`);
      setShowSend(false);
      setSelectedFriend("");
      setSelectedDate("");
      setSelectedSlot("");
      setActivity("");
      setNote("");
    } catch (err: any) {
      setSendError(err?.message || "something went wrong");
    }
  };

  const handleDecline = async (requestId: string, declineNote: string) => {
    setDecliningRequestId(null);
    try {
      await respondToRequest.mutateAsync({ requestId, status: "declined", declineNote: declineNote || undefined });
      toast("invite declined");
    } catch (err) {
      console.error(err);
    }
  };

  const handleAccept = async (requestId: string) => {
    try {
      await respondToRequest.mutateAsync({ requestId, status: "accepted" });
      toast.success("you're in! 🎉");
    } catch (err) {
      console.error(err);
    }
  };

  const sendFormRef = React.useRef<HTMLDivElement>(null);

  const handleTryAnotherTime = (req: any) => {
    const friendId = req.sender_id === user?.id ? req.recipient_id : req.sender_id;
    setPrefillFriend(friendId);
    setPrefillActivity(req.activity || "");
    setSelectedFriend(friendId);
    setActivity(req.activity || "");
    setSelectedDate("");
    setSelectedSlot("");
    setNote("");
    setShowSend(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        sendFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  };

  const pendingIncoming = requests.filter(r => r.recipient_id === user?.id && r.status === "pending");
  const myRequests = requests.filter(r => r.sender_id === user?.id);
  const confirmed = requests.filter(r => r.status === "accepted" && (r.sender_id === user?.id || r.recipient_id === user?.id));
  const today = new Date().toISOString().split("T")[0];
  const upcomingConfirmed = confirmed.filter(r => r.proposed_date >= today);
  const pastConfirmed = confirmed.filter(r => r.proposed_date < today);

  // Collect all user IDs from requests that might not be in circle friends
  const requestUserIds = useMemo(() => {
    const ids = new Set<string>();
    requests.forEach(r => {
      if (r.sender_id !== user?.id) ids.add(r.sender_id);
      if (r.recipient_id !== user?.id) ids.add(r.recipient_id);
    });
    return Array.from(ids);
  }, [requests, user?.id]);

  // Fetch profiles for any request participants not already in friends list
  const { data: extraProfiles = [] } = useQuery({
    queryKey: ["request-profiles", requestUserIds],
    enabled: requestUserIds.length > 0,
    queryFn: async () => {
      const missingIds = requestUserIds.filter(id => !friends.find(f => f.user_id === id));
      if (missingIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", missingIds);
      return data || [];
    },
  });

  const allProfiles = useMemo(() => [...friends, ...extraProfiles], [friends, extraProfiles]);

  const getFriendName = (id: string) => allProfiles.find(f => f.user_id === id)?.display_name || "friend";
  const getFriendAvatar = (id: string) => {
    const f = allProfiles.find(f => f.user_id === id);
    return f?.display_name?.[0]?.toUpperCase() || "?";
  };
  const getFriendAvatarUrl = (id: string) => {
    const f = allProfiles.find(f => f.user_id === id);
    return f?.avatar_url || null;
  };

  // Map confirmed hangouts to calendar slots
  const confirmedMap = useMemo(() => {
    const map = new Map<string, { activity: string; friendName: string }>();
    upcomingConfirmed.forEach(r => {
      const key = `${r.proposed_date}|${r.proposed_time_slot}`;
      const friendId = r.sender_id === user?.id ? r.recipient_id : r.sender_id;
      map.set(key, { activity: r.activity || "hangout", friendName: getFriendName(friendId) });
    });
    return map;
  }, [confirmed, user?.id, allProfiles]);

  return (
    <div>
      {/* Friend flares */}
      <FriendFlareCards />
      {/* Decline modal */}
      {decliningRequestId && (
        <DeclineModal
          onDecline={(declineNote) => handleDecline(decliningRequestId, declineNote)}
          onClose={() => setDecliningRequestId(null)}
        />
      )}

      {/* Last week recap — only visible on Sundays */}
      {showLastWeek && new Date().getDay() === 0 && lastWeekPriorities.length > 0 && priorities.length === 0 && (
        <div className="rounded-xl border p-4 mb-4 animate-fade-slide-in" style={{ background: `${colors.cobalt}08`, borderColor: `${colors.cobalt}25` }}>
          <div className="flex items-center justify-between mb-2">
            <div className="font-sans text-xs font-semibold" style={{ color: colors.cobalt }}>last week's recap</div>
            <button onClick={() => setShowLastWeek(false)}
              className="bg-transparent border-0 cursor-pointer p-0.5" style={{ opacity: 0.4 }}>
              <XIcon size={12} />
            </button>
          </div>
          <div className="font-sans text-[11px] mb-2" style={{ color: colors.textMuted }}>
            you completed {lastWeekPriorities.filter(p => p.completed).length}/{lastWeekPriorities.length} priorities
          </div>
          <div className="space-y-1">
            {lastWeekPriorities.map(p => (
              <div key={p.id} className="flex items-center gap-2 font-sans text-[11px]"
                   style={{ color: p.completed ? colors.cobalt : colors.textMuted }}>
                <span>{p.completed ? "✓" : "○"}</span>
                <span className={p.completed ? "line-through" : ""}>{p.activity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly priorities */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3 px-0">
          <div className="font-sans text-xs font-semibold" style={{ color: colors.text }}>
            this week's priorities
          </div>
          <button
            onClick={() => setShowAddPriority(!showAddPriority)}
            className="font-sans text-[11px] font-semibold bg-transparent border-0 cursor-pointer"
            style={{ color: colors.accent }}
          >
            {showAddPriority ? "done" : "+ add"}
          </button>
        </div>

        {showAddPriority && (
          <div className="rounded-xl border p-3 mb-3 animate-fade-slide-in" style={{ background: colors.card, borderColor: colors.border }}>
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {PRIORITY_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setPriorityCategory(priorityCategory === cat.id ? "" : cat.id); setCustomPriority(""); }}
                  className="flex-1 py-2 rounded-lg border font-sans text-[10px] font-semibold cursor-pointer transition-all min-w-0"
                  style={{
                    background: priorityCategory === cat.id ? colors.cobalt : colors.warmGray,
                    color: priorityCategory === cat.id ? "#fff" : colors.text,
                    borderColor: priorityCategory === cat.id ? colors.cobalt : colors.border,
                  }}
                >
                  {cat.emoji} {cat.label}
                </button>
              ))}
              <button
                onClick={() => { setPriorityCategory(priorityCategory === "custom" ? "" : "custom"); }}
                className="flex-1 py-2 rounded-lg border font-sans text-[10px] font-semibold cursor-pointer transition-all min-w-0"
                style={{
                  background: priorityCategory === "custom" ? colors.cobalt : colors.warmGray,
                  color: priorityCategory === "custom" ? "#fff" : colors.text,
                  borderColor: priorityCategory === "custom" ? colors.cobalt : colors.border,
                }}
              >
                ✏️ custom
              </button>
            </div>
            {priorityCategory === "custom" ? (
              <div className="flex items-center gap-1.5 animate-fade-slide-in">
                <input
                  value={customPriority}
                  onChange={e => setCustomPriority(e.target.value.slice(0, 60))}
                  placeholder="type your own priority..."
                  onKeyDown={e => {
                    if (e.key === "Enter" && customPriority.trim()) {
                      addPriority.mutate({ activity: customPriority.trim(), category: "custom" });
                      setCustomPriority("");
                    }
                  }}
                  autoFocus
                  className="flex-1 py-2 px-3 rounded-xl border font-sans text-[11px] outline-none box-border"
                  style={{ borderColor: colors.border, background: colors.warmGray, color: colors.text }}
                />
                <button
                  onClick={() => {
                    if (customPriority.trim()) {
                      addPriority.mutate({ activity: customPriority.trim(), category: "custom" });
                      setCustomPriority("");
                    }
                  }}
                  disabled={!customPriority.trim()}
                  className="rounded-full w-7 h-7 flex-shrink-0 flex items-center justify-center border-0 cursor-pointer"
                  style={{ background: customPriority.trim() ? colors.accent : colors.warmGray, color: customPriority.trim() ? "#fff" : colors.textMuted }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M6 10V2M2 6l4-4 4 4"/>
                  </svg>
                </button>
              </div>
            ) : priorityCategory ? (
              <div className="flex flex-wrap gap-1.5 animate-fade-slide-in">
                {PRIORITY_CATEGORIES.find(c => c.id === priorityCategory)?.activities.map(act => {
                  const alreadyAdded = priorities.some(p => p.activity === act && p.category === priorityCategory);
                  return (
                    <button
                      key={act}
                      onClick={() => { if (!alreadyAdded) addPriority.mutate({ activity: act, category: priorityCategory }); }}
                      disabled={alreadyAdded}
                      className="rounded-full py-1.5 px-3 font-sans text-[10px] border cursor-pointer transition-all"
                      style={{
                        background: alreadyAdded ? `${colors.cobalt}15` : colors.warmGray,
                        color: alreadyAdded ? colors.cobalt : colors.text,
                        borderColor: alreadyAdded ? `${colors.cobalt}40` : colors.border,
                        opacity: alreadyAdded ? 0.7 : 1,
                      }}
                    >
                      {alreadyAdded ? "✓ " : ""}{act}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        )}

        {priorities.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {priorities.map(p => {
              const cat = PRIORITY_CATEGORIES.find(c => c.id === p.category);
              return (
                <div key={p.id}
                  className="inline-flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 border cursor-pointer transition-all"
                  style={{
                    background: p.completed ? `${colors.cobalt}12` : colors.card,
                    borderColor: p.completed ? `${colors.cobalt}30` : colors.border,
                  }}
                >
                  <button
                    onClick={() => toggleCompleted.mutate({ id: p.id, completed: !p.completed })}
                    className="w-4 h-4 rounded-full border flex items-center justify-center cursor-pointer flex-shrink-0 p-0"
                    style={{
                      background: p.completed ? colors.cobalt : "transparent",
                      borderColor: p.completed ? colors.cobalt : colors.border,
                      borderWidth: 1.5,
                    }}
                  >
                    {p.completed && <span className="text-white text-[8px]">✓</span>}
                  </button>
                  <span className={`font-sans text-[11px] ${p.completed ? "line-through" : ""}`}
                        style={{ color: p.completed ? colors.textMuted : colors.text }}>
                    {cat?.emoji} {p.activity}
                  </span>
                  <button
                    onClick={() => removePriority.mutate(p.id)}
                    className="bg-transparent border-0 cursor-pointer p-0 ml-0.5 flex-shrink-0 leading-none"
                    style={{ opacity: 0.3 }}
                  >
                    <XIcon size={10} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : !showAddPriority ? (
          <button
            onClick={() => setShowAddPriority(true)}
            className="w-full rounded-xl border-2 border-dashed py-3 text-center bg-transparent cursor-pointer"
            style={{ borderColor: `${colors.accent}30` }}
          >
            <div className="font-sans text-[11px]" style={{ color: colors.textMuted }}>
              add activities you want to prioritize this week
            </div>
          </button>
        ) : null}
      </div>

      {/* Friends' priorities */}
      {friends.length > 0 && (
        <div className="mb-5">
          <button
            onClick={() => setShowFriendsPriorities(!showFriendsPriorities)}
            className="w-full flex items-center justify-between py-2.5 px-4 rounded-xl border-0 font-sans text-xs cursor-pointer transition-all"
            style={{
              background: showFriendsPriorities ? `${colors.periwinkle}30` : `${colors.periwinkle}18`,
              color: colors.text,
            }}
          >
            <span className="font-semibold">👀 friends' priorities this week</span>
            <svg
              width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={colors.periwinkle || "#8FA3D4"} strokeWidth="2" strokeLinecap="round"
              style={{ transform: showFriendsPriorities ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
            >
              <path d="M3 4.5l3 3 3-3" />
            </svg>
          </button>

          {showFriendsPriorities && (
            <div className="mt-2 space-y-2.5 animate-fade-slide-in">
              {friendsPriorities.length === 0 ? (
                <div className="text-center py-4 rounded-xl font-sans text-[11px]" style={{ color: colors.textMuted, background: `${colors.periwinkle}08` }}>
                  no friends have set priorities this week yet
                </div>
              ) : (
                (() => {
                  const grouped: Record<string, any[]> = {};
                  friendsPriorities.forEach((p: any) => {
                    if (!grouped[p.user_id]) grouped[p.user_id] = [];
                    grouped[p.user_id].push(p);
                  });

                  return Object.entries(grouped).map(([userId, priors]) => {
                    const friend = friends.find((f: any) => f.user_id === userId);
                    if (!friend) return null;
                    const firstName = (friend.display_name || "").split(" ")[0].toLowerCase();

                    return (
                      <div key={userId} className="rounded-xl p-3" style={{ background: `${colors.periwinkle}12` }}>
                        <div className="flex items-center gap-2 mb-2">
                          {friend.avatar_url ? (
                            <img src={friend.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                          ) : (
                            <div className="w-5 h-5 rounded-full flex items-center justify-center font-sans text-[9px] font-bold" style={{ background: `${colors.periwinkle}30`, color: colors.periwinkle || "#8FA3D4" }}>
                              {firstName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="font-sans text-[12px] font-semibold" style={{ color: colors.text }}>{firstName}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {priors.map((p: any) => {
                            const cat = PRIORITY_CATEGORIES.find(c => c.id === p.category);
                            return (
                              <span
                                key={p.id}
                                className="inline-flex items-center gap-1 rounded-full py-1 px-2.5 font-sans text-[10px]"
                                style={{ background: `${colors.periwinkle}22`, color: colors.text }}
                              >
                                {cat?.emoji} {p.activity}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>
          )}
        </div>
      )}

      {upcomingConfirmed.length > 0 && (
        <div className="mb-4">
          <div className="font-sans text-xs font-semibold mb-2" style={{ color: colors.text }}>confirmed hangouts</div>
          {upcomingConfirmed.map(req => {
            const friendId = req.sender_id === user?.id ? req.recipient_id : req.sender_id;
            const blockLabel = TIME_BLOCKS[req.proposed_time_slot as TimeBlockKey]?.label || req.proposed_time_slot;
            return (
              <button key={req.id}
                ref={req.id === highlightRequestId ? highlightRef as any : undefined}
                onClick={() => {
                  if (Date.now() < hangoutTapGuardUntil) return;
                  setEditingHangout(req);
                }}
                className="w-full text-left rounded-xl border p-3 mb-2 flex items-center gap-3 bg-transparent cursor-pointer transition-all duration-500"
                style={{
                  background: req.id === highlightRequestId ? `${colors.cobalt}20` : `${colors.cobalt}08`,
                  borderColor: req.id === highlightRequestId ? colors.cobalt : `${colors.cobalt}25`,
                  boxShadow: req.id === highlightRequestId ? `0 0 0 2px ${colors.cobalt}30` : "none",
                }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                     style={{ background: colors.cobalt }}>
                  {getFriendAvatarUrl(friendId) ? (
                    <img src={getFriendAvatarUrl(friendId)!} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-[11px] font-semibold">{getFriendAvatar(friendId)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-sans text-[12px] font-semibold" style={{ color: colors.text }}>
                    {lc((req as any).activity || "hangout")} with {getFriendName(friendId)}
                  </div>
                  <div className="font-sans text-[10px] mt-0.5" style={{ color: colors.textMuted }}>
                    {formatDateLabel(req.proposed_date)} · {blockLabel}
                  </div>
                  {(req as any).note && (
                    <div className="font-sans text-[10px] mt-0.5 italic" style={{ color: colors.textMuted }}>
                      "{(req as any).note}"
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                     style={{ background: `${colors.cobalt}15` }}>
                  <span className="text-[10px]" style={{ color: colors.cobalt }}>✓</span>
                  <span className="font-sans text-[9px] font-semibold" style={{ color: colors.cobalt }}>confirmed</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ─── Hangout Edit Modal ─── */}
      {editingHangout && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditingHangout(null)} />
          <div className="relative w-full max-w-md rounded-t-2xl p-5 animate-fade-slide-in"
               style={{ background: colors.card, paddingBottom: "calc(env(safe-area-inset-bottom, 16px) + 72px)" }}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: colors.border }} />
            <div className="font-sans text-sm font-semibold mb-1" style={{ color: colors.text }}>
              {lc((editingHangout as any).activity || "hangout")} with {getFriendName(
                editingHangout.sender_id === user?.id ? editingHangout.recipient_id : editingHangout.sender_id
              )}
            </div>
            <div className="font-sans text-[11px] mb-4" style={{ color: colors.textMuted }}>
              {formatDateLabel(editingHangout.proposed_date)} · {TIME_BLOCKS[editingHangout.proposed_time_slot as TimeBlockKey]?.label || editingHangout.proposed_time_slot}
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setHangoutTapGuardUntil(Date.now() + 450);
                  handleTryAnotherTime(editingHangout);
                  setEditingHangout(null);
                }}
                className="w-full py-3 rounded-xl border font-sans text-[12px] font-semibold cursor-pointer text-left px-4 flex items-center gap-3"
                style={{ background: colors.warmGray, borderColor: colors.border, color: colors.text }}
              >
                <span>📅</span> reschedule
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setHangoutTapGuardUntil(Date.now() + 450);
                  setGroupHangTarget(editingHangout);
                  setSuggestedPeople([]);
                  setEditingHangout(null);
                }}
                className="w-full py-3 rounded-xl border font-sans text-[12px] font-semibold cursor-pointer text-left px-4 flex items-center gap-3"
                style={{ background: colors.warmGray, borderColor: colors.border, color: colors.text }}
              >
                <span>👥</span> request group hang
              </button>
            </div>

            <button
              type="button"
              onClick={() => setEditingHangout(null)}
              className="w-full mt-3 py-2.5 rounded-xl border-0 font-sans text-[11px] cursor-pointer"
              style={{ background: "transparent", color: colors.textMuted }}
            >
              cancel
            </button>
          </div>
        </div>
      )}

      {/* ─── Group Hang Request Modal ─── */}
      {groupHangTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }} onClick={() => setGroupHangTarget(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-md rounded-t-2xl p-5 pb-10 animate-fade-slide-in"
               style={{ background: colors.card }}
               onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: colors.border }} />
            <div className="font-sans text-sm font-semibold mb-1" style={{ color: colors.text }}>
              add people to this hangout
            </div>
            <div className="font-sans text-[11px] mb-1" style={{ color: colors.textMuted }}>
              suggest 1–3 friends. your hangout partner will need to approve.
            </div>
            <div className="font-sans text-[10px] mb-3" style={{ color: colors.textMuted }}>
              {lc((groupHangTarget as any).activity || "hangout")} · {formatDateLabel(groupHangTarget.proposed_date)}
            </div>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {friends
                .filter(f => {
                  const partnerId = groupHangTarget.sender_id === user?.id ? groupHangTarget.recipient_id : groupHangTarget.sender_id;
                  return f.user_id !== user?.id && f.user_id !== partnerId;
                })
                .map(f => {
                  const selected = suggestedPeople.includes(f.user_id);
                  return (
                    <button
                      key={f.user_id}
                      onClick={() => {
                        if (selected) {
                          setSuggestedPeople(suggestedPeople.filter(id => id !== f.user_id));
                        } else if (suggestedPeople.length < 3) {
                          setSuggestedPeople([...suggestedPeople, f.user_id]);
                        }
                      }}
                      className="rounded-full py-1.5 px-3 font-sans text-[11px] border cursor-pointer transition-all"
                      style={{
                        background: selected ? colors.cobalt : colors.warmGray,
                        color: selected ? "#fff" : colors.text,
                        borderColor: selected ? colors.cobalt : colors.border,
                      }}
                    >
                      {selected ? "✓ " : ""}{f.display_name}
                    </button>
                  );
                })}
              {friends.filter(f => {
                const partnerId = groupHangTarget.sender_id === user?.id ? groupHangTarget.recipient_id : groupHangTarget.sender_id;
                return f.user_id !== user?.id && f.user_id !== partnerId;
              }).length === 0 && (
                <span className="font-sans text-[11px]" style={{ color: colors.textMuted }}>no other friends to add</span>
              )}
            </div>

            <div className="font-sans text-[10px] mb-3" style={{ color: colors.textMuted }}>
              {suggestedPeople.length}/3 selected
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setGroupHangTarget(null)}
                className="flex-1 py-2.5 rounded-xl border font-sans text-xs cursor-pointer"
                style={{ background: "transparent", borderColor: colors.border, color: colors.textMuted }}
              >
                cancel
              </button>
              <button
                onClick={async () => {
                  if (suggestedPeople.length === 0) return;
                  const partnerId = groupHangTarget.sender_id === user?.id ? groupHangTarget.recipient_id : groupHangTarget.sender_id;
                  try {
                    // Find the confirmed hangout ID
                    const { data: hangout } = await supabase
                      .from("confirmed_hangouts")
                      .select("id")
                      .eq("request_id", groupHangTarget.id)
                      .maybeSingle();

                    const hangoutId = hangout?.id || groupHangTarget.id;

                    await supabase.from("group_hang_requests" as any).insert({
                      hangout_id: hangoutId,
                      requester_id: user!.id,
                      approver_id: partnerId,
                      suggested_people: suggestedPeople.map(id => ({ user_id: id, name: getFriendName(id) })),
                    });

                    // Notify the partner
                    const { data: myProfile } = await supabase
                      .from("profiles")
                      .select("display_name")
                      .eq("user_id", user!.id)
                      .single();

                    const names = suggestedPeople.map(id => getFriendName(id)).join(", ");
                    await supabase.from("notifications").insert({
                      user_id: partnerId,
                      type: "group_hang_request",
                      title: `${myProfile?.display_name || "your friend"} wants to add ${names} to your hangout`,
                      reference_id: hangoutId,
                    } as any);

                    toast.success("group hang request sent!");
                    setGroupHangTarget(null);
                    setSuggestedPeople([]);
                  } catch (err) {
                    console.error(err);
                    toast.error("something went wrong");
                  }
                }}
                disabled={suggestedPeople.length === 0}
                className="flex-1 py-2.5 rounded-xl border-0 font-sans text-xs font-semibold cursor-pointer"
                style={{
                  background: suggestedPeople.length > 0 ? colors.accent : colors.warmGray,
                  color: suggestedPeople.length > 0 ? "#fff" : colors.textMuted,
                }}
              >
                send request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Received Invites ─── */}
      {pendingIncoming.length > 0 && (
        <div className="mb-4">
          <div className="font-sans text-xs font-semibold mb-2" style={{ color: colors.text }}>received invites</div>
          {pendingIncoming.map(req => {
            const blockLabel = TIME_BLOCKS[req.proposed_time_slot as TimeBlockKey]?.label || req.proposed_time_slot;
            return (
              <div key={req.id}
                ref={req.id === highlightRequestId ? highlightRef : undefined}
                className="rounded-xl border p-3.5 mb-2 animate-fade-slide-in transition-all duration-500"
                style={{
                  background: req.id === highlightRequestId ? `${colors.cobalt}12` : colors.card,
                  borderColor: req.id === highlightRequestId ? colors.cobalt : colors.border,
                  boxShadow: req.id === highlightRequestId ? `0 0 0 2px ${colors.cobalt}30` : "none",
                }}>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                       style={{ background: colors.cobalt }}>
                    <span className="text-white text-[11px] font-semibold">{getFriendAvatar(req.sender_id)}</span>
                  </div>
                  <div>
                    <div className="font-sans text-[12px] font-semibold" style={{ color: colors.text }}>
                      {getFriendName(req.sender_id)}
                    </div>
                  </div>
                </div>
                <div className="font-sans text-[11px] mb-0.5" style={{ color: colors.text }}>
                  {formatDateLabel(req.proposed_date)} · {blockLabel}
                </div>
                <div className="font-sans text-[12px] font-semibold mb-1" style={{ color: colors.text }}>
                  {lc(req.activity || "hang out")}
                </div>
                {(req as any).note && (
                  <div className="font-sans text-[10px] italic mb-2" style={{ color: colors.textMuted }}>
                    "{(req as any).note}"
                  </div>
                )}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleAccept(req.id)}
                    className="flex-1 py-2 rounded-lg border-0 font-sans text-[11px] font-semibold cursor-pointer"
                    style={{ background: colors.cobalt, color: "#fff" }}
                  >
                    i'm in
                  </button>
                  <button
                    onClick={() => setDecliningRequestId(req.id)}
                    className="flex-1 py-2 rounded-lg border font-sans text-[11px] cursor-pointer"
                    style={{ background: "transparent", borderColor: colors.border, color: colors.textMuted }}
                  >
                    can't make it
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Incoming Group Hang Requests ─── */}
      <GroupHangInbox user={user} friends={friends} getFriendName={getFriendName} getFriendAvatar={getFriendAvatar} />

      {/* Section header */}
      <div className="mb-4">
        <div className="font-sans text-xs font-semibold" style={{ color: colors.text }}>
          your calendar
        </div>
      </div>

      {/* Availability grid */}
      <div className="rounded-xl border p-3 mb-4" style={{ background: colors.card, borderColor: colors.border }}>
        {/* Week navigation */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setCalWeek(0)}
            disabled={calWeek === 0}
            className="bg-transparent border-0 cursor-pointer p-1"
            style={{ color: calWeek === 0 ? colors.border : colors.text, opacity: calWeek === 0 ? 0.3 : 1 }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 4L6 8l4 4"/></svg>
          </button>
          <span className="font-sans text-[11px] font-semibold" style={{ color: colors.text }}>
            {calWeek === 0 ? "this week" : "next week"}
          </span>
          <button
            onClick={() => setCalWeek(1)}
            disabled={calWeek === 1}
            className="bg-transparent border-0 cursor-pointer p-1"
            style={{ color: calWeek === 1 ? colors.border : colors.text, opacity: calWeek === 1 ? 0.3 : 1 }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 4l4 4-4 4"/></svg>
          </button>
        </div>
        {(() => {
          const weekDays = days.slice(calWeek * 7, calWeek * 7 + 7);
          return (
            <>
              <div className="flex gap-1 mb-1 pl-8 pointer-events-none">
                {weekDays.map((day, i) => (
                  <div key={day.date} className="flex-1 text-center">
                    {(i === 0 || day.isFirstOfMonth) && (
                      <span className="font-sans text-[9px] font-semibold uppercase tracking-wider" style={{ color: colors.accent }}>
                        {day.monthLabel}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-1">
                <div className="flex flex-col gap-1 pr-1 flex-shrink-0" style={{ paddingTop: 42 }}>
                  {TIME_BLOCK_KEYS.map(slot => (
                    <div key={slot} className="h-9 flex items-center font-sans text-[9px] font-semibold uppercase tracking-wider"
                         style={{ color: colors.textMuted }}>
                      {SLOT_LABELS[slot]}
                    </div>
                  ))}
                </div>
                {weekDays.map(day => (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="font-sans text-[9px]" style={{ color: colors.textMuted }}>{day.dayName}</div>
                    <div className="font-sans text-[11px] font-semibold mb-0.5 w-6 h-6 flex items-center justify-center rounded-full"
                         style={{
                           color: day.date === new Date().toISOString().split("T")[0] ? colors.redOrange : colors.text,
                           border: day.date === new Date().toISOString().split("T")[0] ? `2px solid ${colors.redOrange}` : "2px solid transparent",
                         }}>
                      {day.label}
                    </div>
                    {TIME_BLOCK_KEYS.map(slot => {
                      const key = `${day.date}|${slot}`;
                      const isMine = myAvailSet.has(key);
                      const friendsHere = friendAvailMap.get(key) || [];
                      const isOverlap = isMine && friendsHere.length > 0;
                      const friendsOnlyFree = !isMine && friendsHere.length > 0;
                      const scheduled = confirmedMap.get(key);

                      return (
                        <button
                          key={slot}
                          onClick={() => {
                            if (scheduled) return;
                            handleToggle(day.date, slot);
                          }}
                          onDoubleClick={() => {
                            if (scheduled) return;
                            if (isOverlap) {
                              setSelectedDate(day.date);
                              setSelectedSlot(slot);
                              setShowSend(true);
                              requestAnimationFrame(() => {
                                requestAnimationFrame(() => {
                                  sendFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                                });
                              });
                            }
                          }}
                          className="w-full h-9 rounded-lg border-0 cursor-pointer transition-all flex items-center justify-center relative"
                          style={{
                            touchAction: "manipulation",
                            WebkitTapHighlightColor: "transparent",
                            background: scheduled
                              ? colors.accent
                              : isOverlap
                              ? colors.cobalt
                              : isMine
                              ? `${colors.cobalt}26`
                              : colors.warmGray,
                          }}
                        >
                          {scheduled ? (
                            <span className="text-white text-[9px] font-bold">📅</span>
                          ) : isOverlap ? (
                            <span className="text-white text-[9px] font-bold">{friendsHere.length}</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </>
          );
        })()}
        <div className="flex gap-3 mt-2.5 pt-2 border-t flex-wrap" style={{ borderColor: colors.border }}>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ background: `${colors.cobalt}30` }} />
            <span className="font-sans text-[9px]" style={{ color: colors.textMuted }}>you're free</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ background: colors.cobalt }} />
            <span className="font-sans text-[9px]" style={{ color: colors.textMuted }}>friends overlap</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ background: colors.accent }} />
            <span className="font-sans text-[9px]" style={{ color: colors.textMuted }}>scheduled</span>
          </div>
        </div>
        <p className="font-sans text-[9px] italic mt-1.5" style={{ color: colors.textMuted }}>
          double-tap a match to schedule
        </p>
      </div>

      {/* ─── Send Request ─── */}
      {!showSend ? (
        <button
          onClick={() => setShowSend(true)}
          className="w-full py-3 rounded-xl border-0 font-sans text-sm font-semibold cursor-pointer mb-4"
          style={{ background: colors.accent, color: "#fff" }}
        >
          make a plan
        </button>
      ) : (
        <div ref={sendFormRef} className="rounded-xl border p-4 mb-4 animate-fade-slide-in" style={{ background: colors.card, borderColor: colors.border }}>
          <div className="font-sans text-xs font-semibold mb-3" style={{ color: colors.text }}>new plan</div>

          {/* Friend selector */}
          <div className="mb-3">
            <div className="font-sans text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: colors.textMuted }}>
              who
            </div>
            <div className="flex flex-wrap gap-1.5">
              {friends.map(f => {
                const isFreeForSlot = selectedDate && selectedSlot
                  ? (friendAvailMap.get(`${selectedDate}|${selectedSlot}`) || []).includes(f.user_id)
                  : false;
                return (
                  <button
                    key={f.user_id}
                    onClick={() => setSelectedFriend(f.user_id)}
                    className="rounded-full py-1.5 px-3 font-sans text-[11px] border cursor-pointer transition-all flex items-center gap-1"
                    style={{
                      background: selectedFriend === f.user_id ? colors.cobalt : colors.warmGray,
                      color: selectedFriend === f.user_id ? "#fff" : colors.text,
                      borderColor: selectedFriend === f.user_id ? colors.cobalt : isFreeForSlot ? colors.cobalt : colors.border,
                    }}
                  >
                    {isFreeForSlot && selectedFriend !== f.user_id && (
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: colors.cobalt }} />
                    )}
                    {f.display_name}
                  </button>
                );
              })}
              {friends.length === 0 && (
                <span className="font-sans text-[11px]" style={{ color: colors.textMuted }}>add friends to my village first</span>
              )}
            </div>
          </div>

          {/* Activity */}
          <div className="mb-3">
            <div className="font-sans text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: colors.textMuted }}>
              what
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {ACTIVITY_SUGGESTIONS.slice(0, 6).map(s => (
                <button
                  key={s}
                  onClick={() => setActivity(s)}
                  className="rounded-full py-1 px-2.5 font-sans text-[10px] border cursor-pointer transition-all"
                  style={{
                    background: activity === s ? colors.cobalt : colors.warmGray,
                    color: activity === s ? "#fff" : colors.text,
                    borderColor: activity === s ? colors.cobalt : colors.border,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <input
              value={activity}
              onChange={e => setActivity(e.target.value)}
              placeholder="or type your own..."
              className="w-full py-2 px-3 rounded-lg border font-sans text-[11px] outline-none box-border"
              style={{ borderColor: colors.border, background: colors.warmGray, color: colors.text }}
            />
          </div>

          {/* Date + time block */}
          <div className="mb-3">
            <div className="font-sans text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: colors.textMuted }}>
              when
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {days.slice(0, 7).map(d => (
                <button
                  key={d.date}
                  onClick={() => setSelectedDate(d.date)}
                  className="rounded-lg py-1.5 px-2.5 font-sans text-[10px] border cursor-pointer flex flex-col items-center"
                  style={{
                    background: selectedDate === d.date ? colors.cobalt : colors.warmGray,
                    color: selectedDate === d.date ? "#fff" : colors.text,
                    borderColor: selectedDate === d.date ? colors.cobalt : colors.border,
                  }}
                >
                  <span className="text-[8px] opacity-70">{d.dayName}</span>
                  <span className="font-semibold">{d.label}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              {TIME_BLOCK_KEYS.map(slot => (
                <button
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  className="flex-1 py-2 rounded-lg border font-sans text-[10px] cursor-pointer min-w-0"
                  style={{
                    background: selectedSlot === slot ? colors.cobalt : colors.warmGray,
                    color: selectedSlot === slot ? "#fff" : colors.text,
                    borderColor: selectedSlot === slot ? colors.cobalt : colors.border,
                  }}
                >
                  {TIME_BLOCKS[slot].label}
                </button>
              ))}
            </div>
          </div>

          {/* Note field */}
          <div className="mb-3">
            <div className="relative">
              <input
                value={note}
                onChange={e => setNote(e.target.value.slice(0, NOTE_LIMIT))}
                placeholder="add a note (optional)"
                className="w-full py-2 px-3 pr-14 rounded-lg border font-sans text-[11px] outline-none box-border"
                style={{ borderColor: colors.border, background: colors.warmGray, color: colors.text }}
              />
              {note.length > 0 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-sans text-[9px]"
                      style={{ color: note.length > 160 ? colors.accent : colors.textMuted }}>
                  {note.length}/{NOTE_LIMIT}
                </span>
              )}
            </div>
          </div>


          {sendError && (
            <div className="rounded-lg p-2 mb-2 font-sans text-[11px]" style={{ background: "#A5212A15", color: "#A5212A" }}>
              {sendError}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => { setShowSend(false); setSendError(""); }}
              className="flex-1 py-2.5 rounded-xl border font-sans text-xs cursor-pointer"
              style={{ background: "transparent", borderColor: colors.border, color: colors.textMuted }}
            >
              cancel
            </button>
            <button
              onClick={handleSend}
              disabled={!selectedFriend || !selectedDate || !selectedSlot || !activity.trim() || sendRequest.isPending}
              className="flex-1 py-2.5 rounded-xl border-0 font-sans text-xs font-semibold cursor-pointer"
              style={{
                background: selectedFriend && selectedDate && selectedSlot && activity.trim() ? colors.accent : colors.warmGray,
                color: selectedFriend && selectedDate && selectedSlot && activity.trim() ? "#fff" : colors.textMuted,
              }}
            >
              {sendRequest.isPending ? "sending..." : "send request"}
            </button>
          </div>
        </div>
      )}

      {/* ─── My Sent Requests ─── */}
      {myRequests.filter(r => r.status === "pending" || r.status === "declined").length > 0 && (
        <div className="mb-4">
          <div className="font-sans text-xs font-semibold mb-2" style={{ color: colors.text }}>sent invites</div>
          {myRequests.filter(r => r.status === "pending").map(req => {
            const blockLabel = TIME_BLOCKS[req.proposed_time_slot as TimeBlockKey]?.label || req.proposed_time_slot;
            return (
              <div key={req.id} className="rounded-xl border p-3 mb-2" style={{ background: colors.card, borderColor: colors.border }}>
                <div className="font-sans text-[11px] font-semibold" style={{ color: colors.text }}>
                  {lc(req.activity || "hangout")} with {getFriendName(req.recipient_id)}
                </div>
                <div className="font-sans text-[10px] mt-0.5" style={{ color: colors.textMuted }}>
                  {formatDateLabel(req.proposed_date)} · {blockLabel} · waiting for response
                </div>
                {(req as any).note && (
                  <div className="font-sans text-[10px] mt-0.5 italic" style={{ color: colors.textMuted }}>
                    "{(req as any).note}"
                  </div>
                )}
              </div>
            );
          })}

          {/* Declined requests with "Try another time" */}
          {myRequests.filter(r => r.status === "declined").map(req => {
            const blockLabel = TIME_BLOCKS[req.proposed_time_slot as TimeBlockKey]?.label || req.proposed_time_slot;
            return (
              <div key={req.id} className="rounded-xl border p-3 mb-2" style={{ background: colors.card, borderColor: `${colors.textMuted}30` }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="font-sans text-[11px] font-semibold" style={{ color: colors.textMuted }}>
                    {lc(req.activity || "hangout")} with {getFriendName(req.recipient_id)}
                  </div>
                  <span className="font-sans text-[9px] px-1.5 py-0.5 rounded-full"
                        style={{ background: `${colors.textMuted}15`, color: colors.textMuted }}>
                    declined
                  </span>
                </div>
                <div className="font-sans text-[10px]" style={{ color: colors.textMuted }}>
                  {formatDateLabel(req.proposed_date)} · {blockLabel}
                </div>
                {(req as any).decline_note && (
                  <div className="font-sans text-[10px] mt-1 italic" style={{ color: colors.textMuted }}>
                    "{(req as any).decline_note}"
                  </div>
                )}
                <button
                  onClick={() => handleTryAnotherTime(req)}
                  className="mt-2 py-1.5 px-3 rounded-lg border font-sans text-[10px] font-semibold cursor-pointer"
                  style={{ background: "transparent", borderColor: colors.border, color: colors.cobalt }}
                >
                  try another time
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Past Hangouts ─── */}
      {pastConfirmed.length > 0 && (
        <div className="mb-4 mt-2">
          <Collapsible>
            <CollapsibleTrigger className="w-full flex items-center justify-between mb-2 group">
              <span className="font-sans text-xs font-semibold" style={{ color: colors.textMuted }}>past hangouts ({pastConfirmed.length})</span>
              <svg className="w-3.5 h-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" style={{ color: colors.textMuted }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </CollapsibleTrigger>
            <CollapsibleContent>
              {pastConfirmed.map(req => {
                const friendId = req.sender_id === user?.id ? req.recipient_id : req.sender_id;
                const blockLabel = TIME_BLOCKS[req.proposed_time_slot as TimeBlockKey]?.label || req.proposed_time_slot;
                return (
                  <div key={req.id}
                    className="w-full text-left rounded-xl border p-3 mb-2 flex items-center gap-3 opacity-70"
                    style={{ background: colors.warmGray, borderColor: colors.border }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                         style={{ background: colors.blueGray }}>
                      {getFriendAvatarUrl(friendId) ? (
                        <img src={getFriendAvatarUrl(friendId)!} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white text-[11px] font-semibold">{getFriendAvatar(friendId)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-sans text-[12px] font-semibold" style={{ color: colors.text }}>
                        {lc((req as any).activity || "hangout")} with {getFriendName(friendId)}
                      </div>
                      <div className="font-sans text-[10px] mt-0.5" style={{ color: colors.textMuted }}>
                        {formatDateLabel(req.proposed_date)} · {blockLabel}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                         style={{ background: `${colors.textMuted}15` }}>
                      <span className="font-sans text-[9px] font-semibold" style={{ color: colors.textMuted }}>done</span>
                    </div>
                  </div>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  );
}
