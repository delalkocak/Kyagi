import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ---------- Time Blocks ----------
export const TIME_BLOCKS = {
  early_morning: { label: "early morning", start: "06:30", end: "08:30" },
  morning:       { label: "morning",       start: "09:00", end: "12:00" },
  afternoon:     { label: "afternoon",     start: "12:30", end: "17:00" },
  evening:       { label: "evening",       start: "18:00", end: "21:30" },
} as const;

export type TimeBlockKey = keyof typeof TIME_BLOCKS;

// ---------- Availability ----------
export function useAvailability() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["availability", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("availability_blocks")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useFriendsAvailability() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["friends-availability"],
    enabled: !!user,
    queryFn: async () => {
      const { data: myCircle } = await supabase
        .from("circles")
        .select("id")
        .eq("owner_id", user!.id)
        .maybeSingle();

      if (!myCircle) return [];

      const { data: members } = await supabase
        .from("circle_members")
        .select("user_id")
        .eq("circle_id", myCircle.id);

      const friendIds = (members || []).map(m => m.user_id);

      const { data: memberOf } = await supabase
        .from("circle_members")
        .select("circle_id")
        .eq("user_id", user!.id);

      if (memberOf && memberOf.length > 0) {
        const circleIds = memberOf.map(m => m.circle_id);
        const { data: owners } = await supabase
          .from("circles")
          .select("owner_id")
          .in("id", circleIds);
        if (owners) {
          owners.forEach(o => {
            if (!friendIds.includes(o.owner_id)) friendIds.push(o.owner_id);
          });
        }
      }

      if (friendIds.length === 0) return [];

      const { data, error } = await supabase
        .from("availability_blocks")
        .select("*")
        .in("user_id", friendIds);

      if (error) throw error;
      return data || [];
    },
  });
}

export function useToggleAvailability() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ date, timeSlot }: { date: string; timeSlot: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { data: existing } = await supabase
        .from("availability_blocks")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", date)
        .eq("time_slot", timeSlot)
        .maybeSingle();

      if (existing) {
        await supabase.from("availability_blocks").delete().eq("id", existing.id);
      } else {
        const { error } = await supabase
          .from("availability_blocks")
          .insert({ user_id: user.id, date, time_slot: timeSlot });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["availability"] });
    },
  });
}

// ---------- Schedule Requests ----------
export function useScheduleRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["schedule-requests"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

/** Scheduling requests are now unlimited – keep the hook for API compat */
export function useInvitesRemaining() {
  return { data: Infinity, isLoading: false, error: null } as const;
}

export function useSendScheduleRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ recipientId, date, timeSlot, activity, note }: {
      recipientId: string;
      date: string;
      timeSlot: string;
      activity: string;
      note?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Include sender's timezone for calendar invite generation
      const senderTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const insertData: any = {
        sender_id: user.id,
        recipient_id: recipientId,
        proposed_date: date,
        proposed_time_slot: timeSlot,
        activity,
      };
      if (note?.trim()) insertData.note = note.trim();

      const { error } = await supabase
        .from("schedule_requests")
        .insert(insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-requests"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useRespondToScheduleRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ requestId, status, declineNote }: { 
      requestId: string; 
      status: "accepted" | "declined";
      declineNote?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const updateData: any = { status, updated_at: new Date().toISOString() };
      if (status === "declined" && declineNote?.trim()) {
        updateData.decline_note = declineNote.trim();
      }

      const { error } = await supabase
        .from("schedule_requests")
        .update(updateData)
        .eq("id", requestId);
      if (error) throw error;

      // If accepted, create confirmed hangout + send notification
      if (status === "accepted") {
        // Get the request details
        const { data: req } = await supabase
          .from("schedule_requests")
          .select("*")
          .eq("id", requestId)
          .single();

        if (req) {
          await supabase.from("confirmed_hangouts" as any).insert({
            request_id: requestId,
            user_a_id: req.sender_id,
            user_b_id: req.recipient_id,
            activity: req.activity || "hangout",
            hangout_date: req.proposed_date,
            time_block: req.proposed_time_slot,
            note: (req as any).note || null,
          });

          // Send calendar invite emails (fire-and-forget, don't block confirmation)
          supabase.functions.invoke("send-calendar-invite", {
            body: {
              requestId,
              activity: req.activity || "hangout",
              proposedDate: req.proposed_date,
              timeSlot: req.proposed_time_slot,
              senderId: req.sender_id,
              recipientId: req.recipient_id,
            },
          }).catch((err) => console.error("Calendar invite email failed:", err));

          // Get friend's name for notification
          const { data: myProfile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", user.id)
            .single();

          const friendName = myProfile?.display_name || "your friend";
          const dateStr = new Date(req.proposed_date).toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" });

          // Notify sender
          await supabase.from("notifications").insert({
            user_id: req.sender_id,
            type: "schedule_accepted",
            title: `${friendName} is in for ${req.activity || "hangout"} on ${dateStr}!`,
            body: null,
            reference_id: requestId,
          } as any);
        }
      } else if (status === "declined") {
        const { data: req } = await supabase
          .from("schedule_requests")
          .select("*")
          .eq("id", requestId)
          .single();

        if (req) {
          const { data: myProfile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", user.id)
            .single();

          const friendName = myProfile?.display_name || "your friend";
          const dateStr = new Date(req.proposed_date).toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" });
          const noteText = declineNote?.trim() ? ` — "${declineNote.trim()}"` : "";

          await supabase.from("notifications").insert({
            user_id: req.sender_id,
            type: "schedule_declined",
            title: `${friendName} can't make it for ${req.activity || "hangout"} on ${dateStr}.${noteText}`,
            body: null,
            reference_id: requestId,
          } as any);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-requests"] });
      queryClient.invalidateQueries({ queryKey: ["confirmed-hangouts"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// ---------- Confirmed Hangouts ----------
export function useConfirmedHangouts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["confirmed-hangouts"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("confirmed_hangouts" as any)
        .select("*")
        .order("hangout_date", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}
