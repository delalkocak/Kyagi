import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ── Types ──
export interface Flare {
  id: string;
  sender_id: string;
  message: string | null;
  availability_type: "right_now" | "tonight" | "custom";
  expires_at: string;
  created_at: string;
  is_active: boolean;
}

export interface FlareRecipient {
  id: string;
  flare_id: string;
  recipient_id: string;
  created_at: string;
}

export interface FlareResponse {
  id: string;
  flare_id: string;
  responder_id: string;
  message: string | null;
  created_at: string;
}

// ── Helpers ──
function computeExpiresAt(type: "right_now" | "tonight" | "custom", customDate?: Date): string {
  const now = new Date();
  if (type === "right_now") {
    return new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
  }
  if (type === "tonight") {
    // 11:59 PM America/New_York today
    const eastern = new Date(
      now.toLocaleString("en-US", { timeZone: "America/New_York" })
    );
    eastern.setHours(23, 59, 0, 0);
    // Convert back: find the offset between local representation and UTC
    const utcMidnight = new Date(
      eastern.toLocaleString("en-US", { timeZone: "America/New_York" })
    );
    const diff = eastern.getTime() - utcMidnight.getTime();
    // Simpler: just build a Date in ET then convert
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const dateStr = formatter.format(now); // YYYY-MM-DD in ET
    // Create 11:59 PM ET as an ISO string manually
    // ET is UTC-5 (EST) or UTC-4 (EDT). Use a trick: create the date in ET and let JS figure offset.
    const etDate = new Date(`${dateStr}T23:59:00`);
    // This is in local tz, we need to adjust for ET
    const etOffset = getETOffset(now);
    const utcMs = etDate.getTime() + etOffset * 60 * 1000;
    return new Date(utcMs).toISOString();
  }
  if (type === "custom" && customDate) {
    return customDate.toISOString();
  }
  // fallback 2 hours
  return new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
}

function getETOffset(date: Date): number {
  // Returns minutes to ADD to ET local time to get UTC
  const jan = new Date(date.getFullYear(), 0, 1);
  const jul = new Date(date.getFullYear(), 6, 1);
  const stdOffset = Math.max(
    jan.getTimezoneOffset(),
    jul.getTimezoneOffset()
  );
  // Check if we're in DST for ET
  // ET standard = UTC-5 (300 min), ET daylight = UTC-4 (240 min)
  // Use Intl to check
  const etStr = date.toLocaleString("en-US", { timeZone: "America/New_York", hour12: false, hour: "2-digit" });
  const utcStr = date.toLocaleString("en-US", { timeZone: "UTC", hour12: false, hour: "2-digit" });
  // Simpler: just get the offset
  const etTime = new Date(date.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const utcTime = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  return utcTime.getTime() - etTime.getTime(); // ms difference — but we want minutes
  // Actually returns ms, divide by 60000 for minutes... but we use ms directly
}

// Tonight = midnight ET (00:00 next day in ET)
function getTonightExpiresAt(): string {
  const now = new Date();
  // Get today's date in ET
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const dateStr = formatter.format(now); // e.g. "2026-03-19"
  // Midnight ET = start of next day in ET
  // Use Intl to find the exact UTC offset for this moment in ET
  const etTimeStr = now.toLocaleString("en-US", { timeZone: "America/New_York" });
  const utcTimeStr = now.toLocaleString("en-US", { timeZone: "UTC" });
  const etMs = new Date(etTimeStr).getTime();
  const utcMs = new Date(utcTimeStr).getTime();
  const offsetMs = utcMs - etMs; // positive when ET is behind UTC
  // Build midnight (00:00) of today's ET date = effectively 24:00 today
  const parts = dateStr.split("-");
  const midnightET = new Date(
    parseInt(parts[0]),
    parseInt(parts[1]) - 1,
    parseInt(parts[2]),
    0, 0, 0, 0
  );
  // Add 24 hours to get to midnight (end of today), then convert to UTC
  return new Date(midnightET.getTime() + 24 * 60 * 60 * 1000 + offsetMs).toISOString();
}

export function getExpiresAt(
  type: "right_now" | "tonight" | "custom",
  customHour?: number,
  customAmPm?: "AM" | "PM"
): string {
  if (type === "right_now") {
    return new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  }
  if (type === "tonight") {
    return getTonightExpiresAt();
  }
  if (type === "custom" && customHour != null && customAmPm) {
    const now = new Date();
    let hour24 = customAmPm === "AM" ? customHour % 12 : (customHour % 12) + 12;
    const target = new Date(now);
    target.setHours(hour24, 0, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    return target.toISOString();
  }
  return new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
}

// ── My active flares ──
export function useMyActiveFlare() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-active-flare", user?.id],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: async () => {
      // Get my profile id first (sender_id uses profile.id)
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user!.id)
        .single();
      if (!myProfile) return null;

      const { data, error } = await supabase
        .from("flares" as any)
        .select("*")
        .eq("sender_id", myProfile.id)
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any) as Flare[] | null;
    },
  });
}

// ── Friend flares (where I'm a recipient) ──
export function useFriendFlares() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["friend-flares", user?.id],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: async () => {
      // First get my profile id (flare_recipients uses profile.id, not auth uid)
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user!.id)
        .single();
      if (!myProfile) return [];

      // Get flare IDs where I'm a recipient
      const { data: recipientRows, error: rErr } = await supabase
        .from("flare_recipients" as any)
        .select("flare_id")
        .eq("recipient_id", myProfile.id);
      if (rErr) throw rErr;
      if (!recipientRows || recipientRows.length === 0) return [];

      const flareIds = recipientRows.map((r: any) => r.flare_id);

      const { data: flares, error: fErr } = await supabase
        .from("flares" as any)
        .select("*")
        .in("id", flareIds)
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (fErr) throw fErr;

      if (!flares || flares.length === 0) return [];

      // Get sender profiles
      const senderIds = [...new Set((flares as any[]).map((f: any) => f.sender_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, user_id, display_name, avatar_url")
        .in("id", senderIds);

      // Check which I've responded to (responder_id uses profile.id)
      const { data: myResponses } = await supabase
        .from("flare_responses" as any)
        .select("flare_id")
        .eq("responder_id", myProfile.id)
        .in("flare_id", flareIds);

      const respondedSet = new Set((myResponses || []).map((r: any) => r.flare_id));

      return (flares as any[]).map((f: any) => {
        const profile = (profiles || []).find((p) => p.id === f.sender_id);
        return {
          ...f,
          sender_name: profile?.display_name || "friend",
          sender_avatar_url: profile?.avatar_url || null,
          has_responded: respondedSet.has(f.id),
        };
      });
    },
  });
}

// ── Flare responses (for my active flare) ──
export function useFlareResponses(flareId: string | undefined) {
  return useQuery({
    queryKey: ["flare-responses", flareId],
    enabled: !!flareId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flare_responses" as any)
        .select("*")
        .eq("flare_id", flareId!)
        .order("created_at", { ascending: true });
      if (error) throw error;

      if (!data || data.length === 0) return [];

      // responder_id is a profile.id, so look up profiles by id
      const responderIds = [...new Set((data as any[]).map((r: any) => r.responder_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, user_id, display_name, avatar_url")
        .in("id", responderIds);

      return (data as any[]).map((r: any) => {
        const profile = (profiles || []).find((p) => p.id === r.responder_id);
        return {
          ...r,
          responder_name: profile?.display_name || "friend",
          responder_avatar_url: profile?.avatar_url || null,
        };
      });
    },
  });
}

// ── Circle friends (for picking recipients) ──
export function useCircleFriendsForFlares() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["circle-friends-flares"],
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
        (members || []).forEach((m) => friendIds.push(m.user_id));
      }

      const { data: memberOf } = await supabase
        .from("circle_members")
        .select("circle_id")
        .eq("user_id", user!.id);

      if (memberOf && memberOf.length > 0) {
        const { data: owners } = await supabase
          .from("circles")
          .select("owner_id")
          .in("id", memberOf.map((m) => m.circle_id));
        (owners || []).forEach((o) => {
          if (!friendIds.includes(o.owner_id)) friendIds.push(o.owner_id);
        });
      }

      if (friendIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, user_id, display_name, avatar_url")
        .in("user_id", friendIds);

      return profiles || [];
    },
  });
}

// ── Send flare ──
export function useSendFlare() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      availabilityType,
      message,
      expiresAt,
      recipientUserIds,
    }: {
      availabilityType: "right_now" | "tonight" | "custom";
      message: string;
      expiresAt: string;
      recipientUserIds: string[];
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Get my profile id
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!myProfile) throw new Error("Profile not found");

      // Insert flare
      const { data: flare, error: fErr } = await supabase
        .from("flares" as any)
        .insert({
          sender_id: myProfile.id,
          message: message?.trim() || null,
          availability_type: availabilityType,
          expires_at: expiresAt,
        })
        .select("id")
        .single();
      if (fErr) throw fErr;

      // Get profile IDs for recipient user_ids
      const { data: recipientProfiles } = await supabase
        .from("profiles")
        .select("id, user_id")
        .in("user_id", recipientUserIds);

      if (recipientProfiles && recipientProfiles.length > 0) {
        const recipientRows = recipientProfiles.map((p) => ({
          flare_id: (flare as any).id,
          recipient_id: p.id,
        }));
        const { error: rErr } = await supabase
          .from("flare_recipients" as any)
          .insert(recipientRows);
        if (rErr) throw rErr;
      }

      return flare;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-active-flare"] });
      queryClient.invalidateQueries({ queryKey: ["friend-flares"] });
    },
  });
}

// ── Respond to flare ──
export function useRespondToFlare() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      flareId,
      message,
    }: {
      flareId: string;
      message?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data: myProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!myProfile) throw new Error("Profile not found");

      const { error } = await supabase
        .from("flare_responses" as any)
        .insert({
          flare_id: flareId,
          responder_id: myProfile.id,
          message: message?.trim() || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend-flares"] });
      queryClient.invalidateQueries({ queryKey: ["flare-responses"] });
    },
  });
}

// ── Cancel flare ──
export function useCancelFlare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (flareId: string) => {
      const { error } = await supabase
        .from("flares" as any)
        .update({ is_active: false })
        .eq("id", flareId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-active-flare"] });
      queryClient.invalidateQueries({ queryKey: ["friend-flares"] });
    },
  });
}

// ── Format helpers ──
export function flareAvailabilityLabel(flare: Flare): string {
  if (flare.availability_type === "right_now") return "free right now";
  if (flare.availability_type === "tonight") return "free tonight";
  const t = new Date(flare.expires_at);
  const h = t.getHours();
  const m = t.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `free until ${h12}${m > 0 ? `:${m.toString().padStart(2, "0")}` : ""} ${ampm}`;
}

export function flareCountdown(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "expired";
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function flareExpiresLabel(
  type: "right_now" | "tonight" | "custom",
  expiresAt: string
): string {
  if (type === "right_now") return "expires in 2 hours";
  if (type === "tonight") return "expires tonight";
  const t = new Date(expiresAt);
  const h = t.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `expires at ${h12} ${ampm}`;
}
