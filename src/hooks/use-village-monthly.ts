import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface MonthlyEdition {
  id: string;
  circle_id: string;
  edition_month: string; // "YYYY-MM"
  published_at: string;
  created_at: string;
}

export interface MonthlyRecPost {
  id: string;
  user_id: string;
  content: string;
  recommendation_category: string;
  created_at: string;
  display_name: string;
  avatar_url: string | null;
  media_url: string | null;
  like_count: number;
}

interface RecSection {
  header: string;
  category: string;
  items: MonthlyRecPost[];
}

const CATEGORY_SECTIONS: { category: string; header: string }[] = [
  { category: "reading", header: "what we've been reading" },
  { category: "dining", header: "where we've been eating" },
  { category: "watching", header: "what we've been watching" },
  { category: "listening", header: "what we've been listening to" },
  { category: "culture", header: "worth seeing" },
];

const CATEGORY_DISPLAY: Record<string, string> = {
  reading: "books / articles",
  dining: "restaurants / food",
  watching: "film / TV",
  listening: "music / podcasts",
  culture: "arts / culture",
};

export { CATEGORY_DISPLAY as MONTHLY_CATEGORY_DISPLAY };

// Get user's circle ID
async function getMyCircleId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("circles")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();
  if (data) return data.id;

  // Check if member of a circle
  const { data: membership } = await supabase
    .from("circle_members")
    .select("circle_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return membership?.circle_id || null;
}

// Fetch all editions for user's circle
export function useMonthlyEditions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["monthly-editions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const circleId = await getMyCircleId(user!.id);
      if (!circleId) return [];

      const { data, error } = await supabase
        .from("village_monthly_editions")
        .select("*")
        .eq("circle_id", circleId)
        .order("edition_month", { ascending: false });

      if (error) throw error;
      return (data || []) as MonthlyEdition[];
    },
  });
}

// Fetch the current (latest) edition
export function useCurrentMonthlyEdition() {
  const { data: editions, ...rest } = useMonthlyEditions();
  const current = editions?.[0] || null;
  const past = editions?.slice(1) || [];
  return { current, past, ...rest };
}

// Fetch recommendation posts for a specific month
export function useMonthlyRecPosts(editionMonth: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["monthly-rec-posts", editionMonth],
    enabled: !!user && !!editionMonth,
    queryFn: async () => {
      if (!editionMonth) return [];

      // Parse "YYYY-MM" to get date range
      const [year, month] = editionMonth.split("-").map(Number);
      const monthStart = new Date(year, month - 1, 1).toISOString();
      const monthEnd = new Date(year, month, 1).toISOString();

      // Get circle members
      const circleId = await getMyCircleId(user!.id);
      if (!circleId) return [];

      const { data: circle } = await supabase
        .from("circles")
        .select("owner_id")
        .eq("id", circleId)
        .single();

      const { data: members } = await supabase
        .from("circle_members")
        .select("user_id")
        .eq("circle_id", circleId)
        .eq("is_active", true);

      const memberIds = [
        circle?.owner_id,
        ...(members || []).map((m: any) => m.user_id),
      ].filter(Boolean) as string[];

      // Exclude current user's posts — village monthly shows friends only
      const friendIds = memberIds.filter(id => id !== user!.id);
      if (friendIds.length === 0) return [];

      // Get rec posts
      const { data: posts, error } = await supabase
        .from("posts")
        .select("id, user_id, content, recommendation_category, created_at")
        .in("user_id", friendIds)
        .not("recommendation_category", "is", null)
        .gte("created_at", monthStart)
        .lt("created_at", monthEnd)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!posts || posts.length === 0) return [];

      // Get profiles
      const userIds = [...new Set(posts.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, { name: p.display_name, avatar_url: p.avatar_url }])
      );

      // Get post media (first image only)
      const postIds = posts.map(p => p.id);
      const { data: media } = await supabase
        .from("post_media")
        .select("post_id, url, media_type")
        .in("post_id", postIds)
        .in("media_type", ["photo", "image"])
        .order("sort_order", { ascending: true });

      const mediaMap = new Map<string, string>();
      for (const m of media || []) {
        if (!mediaMap.has(m.post_id)) mediaMap.set(m.post_id, m.url);
      }

      // Get like counts
      const { data: likes } = await supabase
        .from("post_likes")
        .select("post_id")
        .in("post_id", postIds);

      const likeMap = new Map<string, number>();
      for (const l of likes || []) {
        likeMap.set(l.post_id, (likeMap.get(l.post_id) || 0) + 1);
      }

      return posts.map(p => ({
        id: p.id,
        user_id: p.user_id,
        content: p.content,
        recommendation_category: p.recommendation_category!,
        created_at: p.created_at,
        display_name: profileMap.get(p.user_id)?.name || "someone",
        avatar_url: profileMap.get(p.user_id)?.avatar_url || null,
        media_url: mediaMap.get(p.id) || null,
        like_count: likeMap.get(p.id) || 0,
      })) as MonthlyRecPost[];
    },
  });
}

// Build sections from rec posts
export function buildRecSections(posts: MonthlyRecPost[]): RecSection[] {
  return CATEGORY_SECTIONS
    .map(({ category, header }) => {
      const items = posts
        .filter(p => p.recommendation_category === category)
        .sort((a, b) => b.like_count - a.like_count);
      return items.length > 0 ? { header, category, items } : null;
    })
    .filter(Boolean) as RecSection[];
}

// Get lead story (most reacted rec post)
export function getLeadStory(posts: MonthlyRecPost[]): MonthlyRecPost | null {
  if (posts.length === 0) return null;
  return [...posts].sort((a, b) => b.like_count - a.like_count)[0];
}

// Check if user has viewed an edition
export function useHasViewedEdition(editionId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["monthly-view", editionId, user?.id],
    enabled: !!user && !!editionId,
    queryFn: async () => {
      // Get profile id
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user!.id)
        .single();

      if (!profile) return false;

      const { data } = await supabase
        .from("village_monthly_views")
        .select("id")
        .eq("edition_id", editionId!)
        .eq("user_id", profile.id)
        .maybeSingle();

      return !!data;
    },
  });
}

// Mark edition as viewed
export function useMarkEditionViewed() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (editionId: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user!.id)
        .single();

      if (!profile) throw new Error("No profile");

      const { error } = await supabase
        .from("village_monthly_views")
        .upsert(
          { user_id: profile.id, edition_id: editionId },
          { onConflict: "user_id,edition_id" }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-view"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-unviewed"] });
    },
  });
}

// Check if there's an unviewed edition (for badge)
export function useHasUnviewedEdition() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["monthly-unviewed", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const circleId = await getMyCircleId(user!.id);
      if (!circleId) return false;

      const { data: editions } = await supabase
        .from("village_monthly_editions")
        .select("id")
        .eq("circle_id", circleId)
        .order("edition_month", { ascending: false })
        .limit(1);

      if (!editions || editions.length === 0) return false;

      const latestEditionId = editions[0].id;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user!.id)
        .single();

      if (!profile) return false;

      const { data: view } = await supabase
        .from("village_monthly_views")
        .select("id")
        .eq("edition_id", latestEditionId)
        .eq("user_id", profile.id)
        .maybeSingle();

      return !view;
    },
  });
}

// Get latest edition for feed banner (48-hour check)
export function useMonthlyBanner() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["monthly-banner", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const circleId = await getMyCircleId(user!.id);
      if (!circleId) return null;

      const { data: editions } = await supabase
        .from("village_monthly_editions")
        .select("*")
        .eq("circle_id", circleId)
        .order("edition_month", { ascending: false })
        .limit(1);

      if (!editions || editions.length === 0) return null;

      const edition = editions[0] as MonthlyEdition;

      // Check if within 48 hours of published_at
      const publishedAt = new Date(edition.published_at);
      const now = new Date();
      const hoursSincePublish = (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60);

      if (hoursSincePublish > 48) return null;

      return edition;
    },
  });
}

export function formatEditionMonth(editionMonth: string): string {
  const [year, month] = editionMonth.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en", { month: "long", year: "numeric" }).toLowerCase();
}
