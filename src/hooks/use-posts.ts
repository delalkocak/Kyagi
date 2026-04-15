import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ---------- Types ----------
export interface DbPost {
  id: string;
  user_id: string;
  prompt_type: string;
  content: string;
  created_at: string;
  session_id: string;
  link_url: string | null;
  link_title: string | null;
  link_description: string | null;
  link_image_url: string | null;
  link_site_name: string | null;
  profile: { user_id: string; display_name: string; nickname: string; avatar_url: string | null } | null;
  media: { id: string; url: string; media_type: string; sort_order: number }[];
  comments: {
    id: string;
    text: string;
    audio_url: string | null;
    item_index: number;
    created_at: string;
    user_id: string;
    profile: { user_id: string; display_name: string; nickname: string; avatar_url: string | null } | null;
  }[];
}

// ---------- Fetch feed posts ----------
export function useFeedPosts() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Subscribe to realtime changes
  useEffect(() => {
    if (!user) return;
    const postsChannel = supabase
      .channel("feed-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => {
        queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => {
        queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
    };
  }, [user, queryClient]);

  return useQuery({
    queryKey: ["feed-posts"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_feed_posts", {
        p_user_id: user!.id,
      });

      if (error) throw error;

      return (data as DbPost[]) || [];
    },
  });
}

// ---------- Create post ----------
export function useCreatePost() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ promptType, content, mediaFiles, isRecommendation, recommendationCategory, linkUrl, linkTitle, linkDescription, linkImageUrl, linkSiteName }: {
      promptType: string;
      content: string;
      mediaFiles?: { file: File; type: string }[];
      isRecommendation?: boolean;
      recommendationCategory?: string | null;
      linkUrl?: string | null;
      linkTitle?: string | null;
      linkDescription?: string | null;
      linkImageUrl?: string | null;
      linkSiteName?: string | null;
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Determine session_id: reuse if user posted within last 10 minutes AND session has < 3 posts
      let sessionId: string | undefined;
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: recentPost } = await supabase
        .from("posts")
        .select("session_id")
        .eq("user_id", user.id)
        .gte("created_at", tenMinAgo)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentPost?.session_id) {
        // Check how many posts already share this session_id
        const { count } = await supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("session_id", recentPost.session_id);

        if ((count ?? 0) < 3) {
          sessionId = recentPost.session_id;
        }
      }

      const insertData: any = { user_id: user.id, prompt_type: promptType, content };
      if (sessionId) insertData.session_id = sessionId;
      if (isRecommendation) insertData.is_recommendation = true;
      if (recommendationCategory) insertData.recommendation_category = recommendationCategory;
      if (linkUrl) {
        insertData.link_url = linkUrl;
        insertData.link_title = linkTitle || null;
        insertData.link_description = linkDescription || null;
        insertData.link_image_url = linkImageUrl || null;
        insertData.link_site_name = linkSiteName || null;
      }

      const { data: post, error } = await supabase
        .from("posts")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      if (mediaFiles && mediaFiles.length > 0) {
        for (let i = 0; i < mediaFiles.length; i++) {
          const { file, type } = mediaFiles[i];
          const ext = file.name.split(".").pop() || (type === "video" ? "mp4" : "jpg");
          const path = `${user.id}/${post.id}/${i}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from("media")
            .upload(path, file, {
              contentType: file.type || (type === "video" ? "video/mp4" : "image/jpeg"),
              upsert: true,
            });

          if (uploadError) {
            console.error("Media upload failed:", uploadError);
            throw new Error(`Failed to upload ${type}: ${uploadError.message}`);
          }

          const { data: { publicUrl } } = supabase.storage
            .from("media")
            .getPublicUrl(path);

          const { error: mediaInsertError } = await supabase.from("post_media").insert({
            post_id: post.id,
            url: publicUrl,
            media_type: type,
            sort_order: i,
          });

          if (mediaInsertError) {
            console.error("Media record insert failed:", mediaInsertError);
            throw new Error(`Failed to save ${type} record: ${mediaInsertError.message}`);
          }
        }
      }

      return post;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      queryClient.invalidateQueries({ queryKey: ["archive-months"] });
      queryClient.invalidateQueries({ queryKey: ["archive-posts"] });
    },
  });
}

// ---------- Edit post (within 1 hour) ----------
export function useEditPost() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ postId, content, promptType }: {
      postId: string;
      content: string;
      promptType?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const updateData: any = { content };
      if (promptType) updateData.prompt_type = promptType;

      const { data, error } = await supabase
        .from("posts")
        .update(updateData)
        .eq("id", postId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      queryClient.invalidateQueries({ queryKey: ["archive-months"] });
      queryClient.invalidateQueries({ queryKey: ["archive-posts"] });
    },
  });
}

// ---------- Delete post ----------
export function useDeletePost() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
      queryClient.invalidateQueries({ queryKey: ["archive-months"] });
      queryClient.invalidateQueries({ queryKey: ["archive-posts"] });
    },
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ postId, itemIndex, text, audioUrl }: {
      postId: string;
      itemIndex: number;
      text: string;
      audioUrl?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const insertData: any = { post_id: postId, user_id: user.id, item_index: itemIndex, text };
      if (audioUrl) insertData.audio_url = audioUrl;

      const { data, error } = await supabase
        .from("comments")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
    },
  });
}

// ---------- Edit comment ----------
export function useEditComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ commentId, text }: { commentId: string; text: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("comments")
        .update({ text })
        .eq("id", commentId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
    },
  });
}

// ---------- Delete comment ----------
export function useDeleteComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (commentId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-posts"] });
    },
  });
}

// ---------- Get current user profile ----------
export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}
