import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface RecPost {
  id: string;
  user_id: string;
  content: string;
  recommendation_category: string;
  created_at: string;
  display_name: string;
}

interface RecSection {
  label: string;
  items: { emoji: string; name: string; text: string; user_id: string; avatar_url: string | null }[];
}

const CATEGORY_EMOJI: Record<string, string> = {
  book: "📚",
  restaurant: "🍽️",
  art: "🎨",
  movie: "🎬",
  music: "🎵",
  activity: "🏃",
  other: "✨",
};

function truncate(text: string, max = 60): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "...";
}

function dedup(posts: RecPost[]): RecPost[] {
  const seen = new Map<string, RecPost>();
  for (const p of posts) {
    const key = `${p.user_id}|${p.content.toLowerCase().trim()}`;
    if (!seen.has(key) || new Date(p.created_at) > new Date(seen.get(key)!.created_at)) {
      seen.set(key, p);
    }
  }
  return Array.from(seen.values());
}

export function useRecommendationSections() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["rec-sections", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: posts, error } = await supabase
        .from("posts")
        .select("id, user_id, content, recommendation_category, created_at")
        .eq("is_recommendation", true)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!posts || posts.length === 0) return { reading: null, dining: null, gallery: null };

      // Get profile names
      const userIds = [...new Set(posts.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, { name: p.display_name, avatar_url: p.avatar_url }]));

      const enriched: RecPost[] = posts
        .filter(p => p.recommendation_category)
        .map(p => ({
          ...p,
          recommendation_category: p.recommendation_category!,
          display_name: profileMap.get(p.user_id)?.name || "someone",
        }));

      const dedupd = dedup(enriched);

      const buildSection = (
        label: string,
        categories: string[]
      ): RecSection | null => {
        const items = dedupd
          .filter(p => categories.includes(p.recommendation_category))
          .map(p => ({
            emoji: CATEGORY_EMOJI[p.recommendation_category] || "✨",
            name: p.display_name,
            text: truncate(p.content),
            user_id: p.user_id,
            avatar_url: profileMap.get(p.user_id)?.avatar_url || null,
          }));
        return items.length > 0 ? { label, items } : null;
      };

      return {
        reading: buildSection("the reading section", ["book"]),
        dining: buildSection("dining out", ["restaurant"]),
        gallery: buildSection("the gallery", ["art", "movie", "music"]),
      };
    },
  });
}
