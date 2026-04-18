import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ArchiveMonth {
  key: string; // "2026-03"
  label: string; // "March 2026"
  count: number;
}

export interface ArchivePost {
  id: string;
  prompt_type: string;
  content: string;
  created_at: string;
  media: { url: string; media_type: string }[];
}

export function useArchiveMonths() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["archive-months", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: posts, error } = await supabase
        .from("posts")
        .select("id, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!posts || posts.length === 0) return { months: [], totalCount: 0, mediaCount: 0, allDates: [] as string[] };

      // Collect all dates for streak/days calculation
      const allDates = posts.map(p => p.created_at);

      // Group by month
      const monthMap = new Map<string, number>();
      for (const p of posts) {
        const d = new Date(p.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthMap.set(key, (monthMap.get(key) || 0) + 1);
      }

      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const months: ArchiveMonth[] = Array.from(monthMap.entries()).map(([key, count]) => {
        const [year, month] = key.split("-");
        return { key, label: `${monthNames[parseInt(month) - 1]} ${year}`, count };
      });

      // Get media count
      const postIds = posts.map(p => p.id);
      const { count: mediaCount } = await supabase
        .from("post_media")
        .select("id", { count: "exact", head: true })
        .in("post_id", postIds);

      return { months, totalCount: posts.length, mediaCount: mediaCount || 0, allDates };
    },
  });
}

export function useArchivePostsByMonth(monthKey: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["archive-posts", user?.id, monthKey],
    enabled: !!user && !!monthKey,
    queryFn: async () => {
      if (!monthKey) return [];
      const [year, month] = monthKey.split("-").map(Number);
      const start = new Date(year, month - 1, 1).toISOString();
      const end = new Date(year, month, 1).toISOString();

      const { data: posts, error } = await supabase
        .from("posts")
        .select("id, prompt_type, content, created_at")
        .eq("user_id", user!.id)
        .gte("created_at", start)
        .lt("created_at", end)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!posts || posts.length === 0) return [];

      const postIds = posts.map(p => p.id);
      const { data: media } = await supabase
        .from("post_media")
        .select("post_id, url, media_type")
        .in("post_id", postIds);

      return posts.map(p => ({
        ...p,
        media: (media || []).filter(m => m.post_id === p.id),
      })) as ArchivePost[];
    },
  });
}

export function useFriendArchive(userId: string) {
  return useQuery({
    queryKey: ["friend-archive", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: posts, error } = await supabase
        .from("posts")
        .select("id, prompt_type, content, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!posts || posts.length === 0) return { posts: [], totalCount: 0 };

      const postIds = posts.map(p => p.id);
      const { data: media } = await supabase
        .from("post_media")
        .select("post_id, url, media_type")
        .in("post_id", postIds);

      const enriched = posts.map(p => ({
        ...p,
        media: (media || []).filter(m => m.post_id === p.id),
      }));

      return { posts: enriched, totalCount: posts.length };
    },
  });
}
