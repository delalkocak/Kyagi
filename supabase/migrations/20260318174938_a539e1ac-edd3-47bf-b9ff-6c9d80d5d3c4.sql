
-- Security definer: check if a profile id belongs to the authenticated user
CREATE OR REPLACE FUNCTION public.is_own_profile(_profile_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _profile_id AND user_id = _user_id
  );
$$;

-- Update is_flare_sender to resolve profile->user mapping
CREATE OR REPLACE FUNCTION public.is_flare_sender(_flare_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.flares f
    JOIN public.profiles p ON p.id = f.sender_id
    WHERE f.id = _flare_id AND p.user_id = _user_id
  );
$$;

-- Fix flares policies: sender_id is a profile id, not auth.uid()
DROP POLICY IF EXISTS "Sender reads own flares" ON public.flares;
DROP POLICY IF EXISTS "Create own flares" ON public.flares;
DROP POLICY IF EXISTS "Update own flares" ON public.flares;

CREATE POLICY "Sender reads own flares" ON public.flares
  FOR SELECT TO authenticated
  USING (public.is_own_profile(sender_id, auth.uid()));

CREATE POLICY "Create own flares" ON public.flares
  FOR INSERT TO authenticated
  WITH CHECK (public.is_own_profile(sender_id, auth.uid()));

CREATE POLICY "Update own flares" ON public.flares
  FOR UPDATE TO authenticated
  USING (public.is_own_profile(sender_id, auth.uid()))
  WITH CHECK (public.is_own_profile(sender_id, auth.uid()));

-- Fix flare_recipients: recipient_id is also a profile id
CREATE OR REPLACE FUNCTION public.is_flare_recipient(_flare_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.flare_recipients fr
    JOIN public.profiles p ON p.id = fr.recipient_id
    WHERE fr.flare_id = _flare_id AND p.user_id = _user_id
  );
$$;

-- Fix flare_recipients policies
DROP POLICY IF EXISTS "Recipient reads own row" ON public.flare_recipients;

CREATE POLICY "Recipient reads own row" ON public.flare_recipients
  FOR SELECT TO authenticated
  USING (public.is_own_profile(recipient_id, auth.uid()));

-- Fix flare_responses: responder_id is a profile id
DROP POLICY IF EXISTS "Respond to active flare" ON public.flare_responses;
DROP POLICY IF EXISTS "Responder reads own response" ON public.flare_responses;

CREATE POLICY "Responder reads own response" ON public.flare_responses
  FOR SELECT TO authenticated
  USING (public.is_own_profile(responder_id, auth.uid()));

CREATE POLICY "Respond to active flare" ON public.flare_responses
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_own_profile(responder_id, auth.uid())
    AND public.is_flare_active(flare_id)
    AND public.is_flare_recipient(flare_id, auth.uid())
  );
