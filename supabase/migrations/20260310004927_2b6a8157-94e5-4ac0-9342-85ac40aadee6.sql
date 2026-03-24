
CREATE TABLE public.weekly_priorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activity text NOT NULL,
  category text NOT NULL,
  week_start date NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_priorities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own priorities" ON public.weekly_priorities
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Insert own priorities" ON public.weekly_priorities
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Update own priorities" ON public.weekly_priorities
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Delete own priorities" ON public.weekly_priorities
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_weekly_priorities_user_week ON public.weekly_priorities (user_id, week_start);
