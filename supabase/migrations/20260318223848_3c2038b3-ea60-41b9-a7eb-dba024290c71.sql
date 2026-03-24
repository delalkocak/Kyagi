
-- Village monthly editions table
CREATE TABLE public.village_monthly_editions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  edition_month text NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (circle_id, edition_month)
);

ALTER TABLE public.village_monthly_editions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own circle editions"
  ON public.village_monthly_editions
  FOR SELECT TO authenticated
  USING (
    is_circle_owner(circle_id, auth.uid()) OR is_circle_member(circle_id, auth.uid())
  );

-- Village monthly views table
CREATE TABLE public.village_monthly_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  edition_id uuid NOT NULL REFERENCES public.village_monthly_editions(id) ON DELETE CASCADE,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, edition_id)
);

ALTER TABLE public.village_monthly_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own monthly views"
  ON public.village_monthly_views
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_id AND p.user_id = auth.uid())
  );

CREATE POLICY "Create own monthly views"
  ON public.village_monthly_views
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_id AND p.user_id = auth.uid())
  );
