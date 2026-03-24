
CREATE TABLE public.invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  inviter_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_by uuid,
  used_at timestamptz
);

ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own invite codes"
ON public.invite_codes FOR SELECT TO authenticated
USING (inviter_id = auth.uid());

CREATE POLICY "Users create own invite codes"
ON public.invite_codes FOR INSERT TO authenticated
WITH CHECK (inviter_id = auth.uid());

CREATE POLICY "Anyone can view invite code by code"
ON public.invite_codes FOR SELECT TO anon
USING (true);

CREATE POLICY "Service role updates invite codes"
ON public.invite_codes FOR UPDATE TO authenticated
USING (inviter_id = auth.uid());
