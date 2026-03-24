import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { colors } from "./data";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

function useNonFriendProfile(userId: string) {
  return useQuery({
    queryKey: ["non-friend-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url, bio")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function useExistingFriendRequest(targetUserId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["existing-friend-request", user?.id, targetUserId],
    enabled: !!user && !!targetUserId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("friend_requests")
        .select("id, status")
        .eq("sender_id", user!.id)
        .eq("receiver_id", targetUserId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function useSendFriendRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (receiverId: string) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("friend_requests")
        .insert({ sender_id: user.id, receiver_id: receiverId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["existing-friend-request"] });
      queryClient.invalidateQueries({ queryKey: ["sent-requests"] });
    },
  });
}

interface NonFriendProfileViewProps {
  userId: string;
  onBack: () => void;
}

export function NonFriendProfileView({ userId, onBack }: NonFriendProfileViewProps) {
  const { data: profile, isLoading } = useNonFriendProfile(userId);
  const { data: existingRequest } = useExistingFriendRequest(userId);
  const sendRequest = useSendFriendRequest();
  const [sent, setSent] = useState(false);

  const alreadySent = sent || existingRequest?.status === "pending";
  const displayName = profile?.display_name || "user";
  const initial = displayName.charAt(0).toUpperCase();
  const username = profile?.username || displayName.toLowerCase().replace(/\s+/g, "");

  const handleAddFriend = async () => {
    try {
      await sendRequest.mutateAsync(userId);
      setSent(true);
      toast.success("friend request sent!");
    } catch (err: any) {
      if (err?.message?.includes("duplicate")) {
        setSent(true);
      } else {
        toast.error(err?.message || "something went wrong");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full" style={{ background: colors.bg }}>
        <div
          className="w-5 h-5 rounded-full border-2 animate-spin mx-auto"
          style={{ borderColor: colors.border, borderTopColor: colors.accent }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-full relative" style={{ background: colors.bg }}>
      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 bg-transparent border-0 cursor-pointer p-1 z-10"
      >
        <ArrowLeft size={22} color={colors.text} />
      </button>

      {/* Content */}
      <div className="flex flex-col items-center" style={{ paddingTop: 80 }}>
        {/* Avatar */}
        <div
          className="rounded-full overflow-hidden flex items-center justify-center"
          style={{ width: 96, height: 96, background: profile?.avatar_url ? "transparent" : "#E8E6DF" }}
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="font-sans text-[32px] font-medium" style={{ color: colors.textMuted }}>
              {initial}
            </span>
          )}
        </div>

        {/* Display name */}
        <div
          className="font-sans text-center mt-3"
          style={{ fontSize: 20, fontWeight: 500, color: colors.text }}
        >
          {displayName}
        </div>

        {/* Username */}
        <div
          className="font-sans text-center mt-1"
          style={{ fontSize: 14, fontWeight: 400, color: colors.textMuted }}
        >
          @{username}
        </div>

        {/* Bio */}
        {profile?.bio && (
          <div
            className="text-center mt-4"
            style={{
              fontSize: 15,
              fontWeight: 400,
              lineHeight: 1.5,
              color: colors.text,
              maxWidth: 280,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {profile.bio}
          </div>
        )}

        {/* Add Friend button */}
        <button
          onClick={alreadySent ? undefined : handleAddFriend}
          disabled={alreadySent || sendRequest.isPending}
          className="border-0 cursor-pointer font-sans transition-all"
          style={{
            marginTop: 32,
            paddingLeft: 32,
            paddingRight: 32,
            paddingTop: 12,
            paddingBottom: 12,
            borderRadius: 24,
            fontSize: 15,
            fontWeight: 500,
            background: alreadySent ? "#E8E6DF" : "#7B2D3B",
            color: alreadySent ? colors.textMuted : "#fff",
            cursor: alreadySent ? "default" : "pointer",
            opacity: sendRequest.isPending ? 0.6 : 1,
          }}
        >
          {alreadySent ? "request sent" : "add friend"}
        </button>
      </div>
    </div>
  );
}
