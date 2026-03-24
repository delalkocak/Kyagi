import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CircleMember {
  user_id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  joined_at: string;
  is_active: boolean;
  paused: boolean;
}

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  sender_display_name: string;
  sender_avatar_url: string | null;
}

const MAX_ACTIVE = 20;

/** Next shuffle = first day of next month */
export function getNextShuffleDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

export function useMyCircle() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-circle", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: circle, error: circleError } = await supabase
        .from("circles")
        .select("id, name, created_at")
        .eq("owner_id", user!.id)
        .maybeSingle();

      if (circleError) throw circleError;
      if (!circle) return { circle: null, active: [] as CircleMember[], inactive: [] as CircleMember[] };

      const { data: members, error: membersError } = await supabase
        .from("circle_members")
        .select("user_id, joined_at, is_active, paused")
        .eq("circle_id", circle.id);

      if (membersError) throw membersError;
      if (!members || members.length === 0)
        return { circle, active: [] as CircleMember[], inactive: [] as CircleMember[] };

      const memberUserIds = members.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", memberUserIds);

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

      const enriched: CircleMember[] = members.map((m) => {
        const profile = profileMap.get(m.user_id);
        return {
          user_id: m.user_id,
          display_name: profile?.display_name || "friend",
          username: profile?.username || null,
          avatar_url: profile?.avatar_url || null,
          joined_at: m.joined_at,
          is_active: m.is_active,
          paused: (m as any).paused ?? false,
        };
      });

      const active = enriched.filter((m) => m.is_active);
      const inactive = enriched.filter((m) => !m.is_active);

      return { circle, active, inactive };
    },
  });
}

export function usePendingRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("friend-requests-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "friend_requests" }, () => {
        queryClient.invalidateQueries({ queryKey: ["pending-requests", user.id] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  return useQuery({
    queryKey: ["pending-requests", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: requests, error } = await supabase
        .from("friend_requests")
        .select("id, sender_id, receiver_id, status, created_at")
        .eq("receiver_id", user!.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!requests || requests.length === 0) return [];

      const senderIds = requests.map((r) => r.sender_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", senderIds);

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

      return requests.map((r) => ({
        ...r,
        sender_display_name: profileMap.get(r.sender_id)?.display_name || "someone",
        sender_avatar_url: profileMap.get(r.sender_id)?.avatar_url || null,
      })) as FriendRequest[];
    },
  });
}

export interface SentRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  receiver_display_name: string;
  receiver_avatar_url: string | null;
}

export function useSentRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("sent-requests-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "friend_requests" }, () => {
        queryClient.invalidateQueries({ queryKey: ["sent-requests", user.id] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  return useQuery({
    queryKey: ["sent-requests", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: requests, error } = await supabase
        .from("friend_requests")
        .select("id, sender_id, receiver_id, status, created_at")
        .eq("sender_id", user!.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!requests || requests.length === 0) return [];

      const receiverIds = requests.map((r) => r.receiver_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", receiverIds);

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));

      return requests.map((r) => ({
        ...r,
        receiver_display_name: profileMap.get(r.receiver_id)?.display_name || "someone",
        receiver_avatar_url: profileMap.get(r.receiver_id)?.avatar_url || null,
      })) as SentRequest[];
    },
  });
}

export function useRespondToRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ requestId, accept }: { requestId: string; accept: boolean; senderId?: string }) => {
      const { data, error } = await supabase.functions.invoke("respond-to-request", {
        body: { requestId, accept },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-requests", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["my-circle", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
    },
  });
}

export function useInviteToCircle() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase.functions.invoke("invite-to-circle", {
        body: { email },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-circle", user?.id] });
    },
  });
}

export function useRemoveFromCircle() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (memberUserId: string) => {
      const { data: circle } = await supabase
        .from("circles")
        .select("id")
        .eq("owner_id", user!.id)
        .maybeSingle();

      if (!circle) throw new Error("No circle found");

      const { error } = await supabase
        .from("circle_members")
        .delete()
        .eq("circle_id", circle.id)
        .eq("user_id", memberUserId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-circle", user?.id] });
    },
  });
}

export function usePauseFriend() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ memberUserId, paused }: { memberUserId: string; paused: boolean }) => {
      const { data: circle } = await supabase
        .from("circles")
        .select("id")
        .eq("owner_id", user!.id)
        .maybeSingle();

      if (!circle) throw new Error("No circle found");

      const updatePayload: any = { paused };
      if (paused) {
        updatePayload.paused_at = new Date().toISOString();
      } else {
        updatePayload.paused_at = null;
      }

      const { error } = await supabase
        .from("circle_members")
        .update(updatePayload)
        .eq("circle_id", circle.id)
        .eq("user_id", memberUserId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-circle", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
    },
  });
}
