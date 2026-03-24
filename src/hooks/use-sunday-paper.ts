import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface VillageMonthly {
  id: string;
  user_id: string;
  week_start: string;
  week_end: string;
  moment_of_week_post_id: string | null;
  moment_of_week_data: {
    post_id: string;
    friend_name: string;
    content_preview: string;
    prompt_type: string;
    reaction_count: number;
    user_id: string;
  } | null;
  village_roundup: { friend_name: string; blurb: string }[];
  your_week: { days_posted: number; comments_received: number; streak: number } | null;
  nudge: string;
  dismissed: boolean;
  created_at: string;
  image_of_week_url: string | null;
  image_of_week_post_id: string | null;
  top_poster_name: string | null;
  top_poster_count: number | null;
}

/** @deprecated Use VillageMonthly instead */
export type SundayPaper = VillageMonthly;

function getMonthStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export function useVillageMonthly() {
  const { user } = useAuth();
  const monthStart = getMonthStart();

  return useQuery({
    queryKey: ["village-monthly", user?.id, monthStart],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sunday_papers" as any)
        .select("*")
        .eq("user_id", user!.id)
        .eq("week_start", monthStart)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as VillageMonthly | null;
    },
  });
}

/** @deprecated Use useVillageMonthly */
export const useSundayPaper = useVillageMonthly;

export function useDismissMonthly() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paperId: string) => {
      const { error } = await supabase
        .from("sunday_papers" as any)
        .update({ dismissed: true })
        .eq("id", paperId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["village-monthly"] });
    },
  });
}

/** @deprecated Use useDismissMonthly */
export const useDismissPaper = useDismissMonthly;

export function useGenerateMonthly() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "generate-sunday-paper"
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["village-monthly"] });
    },
  });
}

/** @deprecated Use useGenerateMonthly */
export const useGeneratePaper = useGenerateMonthly;

export function usePastMonthlies() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["past-monthlies", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sunday_papers" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("week_start", { ascending: false });

      if (error) throw error;
      
      return ((data || []) as unknown as VillageMonthly[]).filter(
        (p) => p.moment_of_week_data || (p.village_roundup && p.village_roundup.length > 0) || p.top_poster_name
      );
    },
  });
}

/** @deprecated Use usePastMonthlies */
export const usePastPapers = usePastMonthlies;

export function isMonthlyVisible(monthly: VillageMonthly | null | undefined, devMode = false): boolean {
  if (!monthly) return false;
  if (monthly.dismissed && !devMode) return false;
  if (devMode) return true;
  
  // Show for the first few days of the month
  const now = new Date();
  return now.getDate() <= 3;
}

/** @deprecated Use isMonthlyVisible */
export const isSundayPaperVisible = isMonthlyVisible;
