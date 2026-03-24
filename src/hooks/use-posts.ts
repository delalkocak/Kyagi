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
  profile: { display_name: string; avatar_url: string | null } | null;
  media: { id: string; url: string; media_type: string; sort_order: number }[];
  comments: {
    id: string;
    text: string;
    audio_url: string | null;
    item_index: number;
    created_at: string;
    user_id: string;
    profile: { display_name: string; avatar_url: string | null } | null;
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
      // Try posts from the last 4 days first
      const since = new Date();
      since.setDate(since.getDate() - 4);

      let { data: posts, error } = await supabase
        .from("posts")
        .select("*")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fallback: if no recent posts, show the 6 most recent posts (any age)
      if (!posts || posts.length === 0) {
        const { data: fallback, error: fbError } = await supabase
          .from("posts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(6);
        if (fbError) throw fbError;
        posts = fallback || [];
      }

      if (posts.length === 0) return [];

      // Filter out posts from paused friends
      const { data: myCircle } = await supabase
        .from("circles")
        .select("id")
        .eq("owner_id", user!.id)
        .maybeSingle();

      let pausedUserIds: string[] = [];
      if (myCircle) {
        const { data: pausedMembers } = await supabase
          .from("circle_members")
          .select("user_id")
          .eq("circle_id", myCircle.id)
          .eq("paused", true);
        pausedUserIds = (pausedMembers || []).map(m => m.user_id);
      }

      if (pausedUserIds.length > 0) {
        posts = posts.filter(p => !pausedUserIds.includes(p.user_id));
      }

      if (posts.length === 0) return [];

      const userIds = [...new Set(posts.map(p => p.user_id))];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const postIds = posts.map(p => p.id);
      const { data: media } = await supabase
        .from("post_media")
        .select("*")
        .in("post_id", postIds)
        .order("sort_order", { ascending: true });

      const { data: comments } = await supabase
        .from("comments")
        .select("*")
        .in("post_id", postIds)
        .order("created_at", { ascending: true });

      const commentUserIds = comments ? [...new Set(comments.map(c => c.user_id))] : [];
      const { data: commentProfiles } = commentUserIds.length > 0
        ? await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", commentUserIds)
        : { data: [] };

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      const commentProfileMap = new Map((commentProfiles || []).map(p => [p.user_id, p]));

      return posts.map(post => ({
        ...post,
        profile: profileMap.get(post.user_id) || null,
        media: (media || []).filter(m => m.post_id === post.id),
        comments: (comments || []).filter(c => c.post_id === post.id).map(c => ({
          ...c,
          profile: commentProfileMap.get(c.user_id) || null,
        })),
      })) as DbPost[];
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
