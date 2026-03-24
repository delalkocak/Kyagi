import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useOnboardingStep() {
  const { user } = useAuth();

  const { data: step, isLoading } = useQuery({
    queryKey: ["onboarding-step", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("onboarding_step")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return (data as any)?.onboarding_step as string || "welcome";
    },
  });

  return { step: step ?? "welcome", isLoading };
}

export function useCompleteOnboarding() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newStep: string) => {
      if (!user) throw new Error("Not authenticated");
      await supabase
        .from("profiles")
        .update({ onboarding_step: newStep } as any)
        .eq("user_id", user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-step"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
