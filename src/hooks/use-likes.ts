import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface LikeData {
  count: number;
  likedByMe: boolean;
}

/**
 * Fetches all likes for a set of post IDs in one query.
 * Returns a map of postId → { count, likedByMe }.
 */
export function useLikes(postIds: string[]) {
  const { user } = useAuth();
  const sortedIds = [...new Set(postIds)].sort();
  const key = ["post_likes", sortedIds.join(","), user?.id];

  return useQuery<Record<string, LikeData>>({
    queryKey: key,
    enabled: sortedIds.length > 0 && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_likes")
        .select("post_id, user_id")
        .in("post_id", sortedIds);

      if (error) throw error;

      const result: Record<string, LikeData> = {};
      for (const id of sortedIds) {
        result[id] = { count: 0, likedByMe: false };
      }
      for (const row of data || []) {
        if (!result[row.post_id]) {
          result[row.post_id] = { count: 0, likedByMe: false };
        }
        result[row.post_id].count++;
        if (row.user_id === user!.id) {
          result[row.post_id].likedByMe = true;
        }
      }
      return result;
    },
    staleTime: 30_000,
  });
}

export function useToggleLike() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      if (liked) {
        // Unlike
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user!.id);
        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from("post_likes")
          .insert({ post_id: postId, user_id: user!.id });
        if (error) throw error;
      }
    },
    onMutate: async ({ postId, liked }) => {
      // Optimistic update — find and update any matching query cache
      await qc.cancelQueries({ queryKey: ["post_likes"] });
      
      qc.setQueriesData<Record<string, LikeData>>(
        { queryKey: ["post_likes"] },
        (old) => {
          if (!old || !old[postId]) return old;
          return {
            ...old,
            [postId]: {
              count: liked ? Math.max(0, old[postId].count - 1) : old[postId].count + 1,
              likedByMe: !liked,
            },
          };
        }
      );
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["post_likes"] });
    },
  });
}
