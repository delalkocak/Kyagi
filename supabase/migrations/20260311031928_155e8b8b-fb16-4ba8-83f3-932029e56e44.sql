
-- 1. Allow friends (circle members) to view each other's weekly priorities
CREATE POLICY "Friends view priorities"
  ON public.weekly_priorities
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT cm.user_id
      FROM circle_members cm
      JOIN circles c ON c.id = cm.circle_id
      WHERE c.owner_id = auth.uid()
      UNION
      SELECT c.owner_id
      FROM circles c
      JOIN circle_members cm ON cm.circle_id = c.id
      WHERE cm.user_id = auth.uid()
    )
  );

-- 2. Create priority_interests table
CREATE TABLE IF NOT EXISTS public.priority_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  priority_id uuid NOT NULL REFERENCES public.weekly_priorities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(priority_id, user_id)
);

ALTER TABLE public.priority_interests ENABLE ROW LEVEL SECURITY;

-- View interests on priorities you can see
CREATE POLICY "View priority interests"
  ON public.priority_interests
  FOR SELECT
  TO authenticated
  USING (true);

-- Express interest
CREATE POLICY "Express interest"
  ON public.priority_interests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Remove own interest
CREATE POLICY "Remove own interest"
  ON public.priority_interests
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
