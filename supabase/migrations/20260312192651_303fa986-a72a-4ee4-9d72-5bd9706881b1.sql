
-- Sunday Papers table
CREATE TABLE public.sunday_papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  week_end date NOT NULL,
  moment_of_week_post_id uuid,
  moment_of_week_data jsonb,
  village_roundup jsonb NOT NULL DEFAULT '[]'::jsonb,
  your_week jsonb,
  nudge text NOT NULL,
  dismissed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- RLS
ALTER TABLE public.sunday_papers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own papers" ON public.sunday_papers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Dismiss own papers" ON public.sunday_papers
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add last_nudge to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_nudge text;
