
CREATE TABLE public.weekly_friend_priorities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  friend_id UUID NOT NULL,
  week_start DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, friend_id, week_start)
);

ALTER TABLE public.weekly_friend_priorities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own friend priorities"
  ON public.weekly_friend_priorities FOR SELECT
  TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Insert own friend priorities"
  ON public.weekly_friend_priorities FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Delete own friend priorities"
  ON public.weekly_friend_priorities FOR DELETE
  TO authenticated USING (user_id = auth.uid());

CREATE INDEX idx_weekly_friend_priorities_user_week
  ON public.weekly_friend_priorities (user_id, week_start);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS weekly_flow_completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
