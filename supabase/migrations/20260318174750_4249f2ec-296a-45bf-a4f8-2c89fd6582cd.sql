
-- Security definer function: check if user is the sender of a flare
CREATE OR REPLACE FUNCTION public.is_flare_sender(_flare_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.flares
    WHERE id = _flare_id AND sender_id = _user_id
  );
$$;

-- Security definer function: check if user is a recipient of a flare
CREATE OR REPLACE FUNCTION public.is_flare_recipient(_flare_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.flare_recipients
    WHERE flare_id = _flare_id AND recipient_id = _user_id
  );
$$;

-- Security definer function: check if flare is active and not expired
CREATE OR REPLACE FUNCTION public.is_flare_active(_flare_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.flares
    WHERE id = _flare_id AND is_active = true AND expires_at > now()
  );
$$;

-- Drop and recreate flares policies
DROP POLICY IF EXISTS "Recipients read flares" ON public.flares;
DROP POLICY IF EXISTS "Sender reads own flares" ON public.flares;
DROP POLICY IF EXISTS "Create own flares" ON public.flares;
DROP POLICY IF EXISTS "Update own flares" ON public.flares;

CREATE POLICY "Sender reads own flares" ON public.flares
  FOR SELECT TO authenticated
  USING (sender_id = auth.uid());

CREATE POLICY "Recipients read flares" ON public.flares
  FOR SELECT TO authenticated
  USING (public.is_flare_recipient(id, auth.uid()));

CREATE POLICY "Create own flares" ON public.flares
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Update own flares" ON public.flares
  FOR UPDATE TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- Drop and recreate flare_recipients policies
DROP POLICY IF EXISTS "Recipient reads own row" ON public.flare_recipients;
DROP POLICY IF EXISTS "Sender reads flare recipients" ON public.flare_recipients;
DROP POLICY IF EXISTS "Sender inserts recipients" ON public.flare_recipients;

CREATE POLICY "Recipient reads own row" ON public.flare_recipients
  FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "Sender reads flare recipients" ON public.flare_recipients
  FOR SELECT TO authenticated
  USING (public.is_flare_sender(flare_id, auth.uid()));

CREATE POLICY "Sender inserts recipients" ON public.flare_recipients
  FOR INSERT TO authenticated
  WITH CHECK (public.is_flare_sender(flare_id, auth.uid()));

-- Drop and recreate flare_responses policies
DROP POLICY IF EXISTS "Respond to active flare" ON public.flare_responses;
DROP POLICY IF EXISTS "Responder reads own response" ON public.flare_responses;
DROP POLICY IF EXISTS "Sender reads responses" ON public.flare_responses;

CREATE POLICY "Responder reads own response" ON public.flare_responses
  FOR SELECT TO authenticated
  USING (responder_id = auth.uid());

CREATE POLICY "Sender reads responses" ON public.flare_responses
  FOR SELECT TO authenticated
  USING (public.is_flare_sender(flare_id, auth.uid()));

CREATE POLICY "Respond to active flare" ON public.flare_responses
  FOR INSERT TO authenticated
  WITH CHECK (
    responder_id = auth.uid()
    AND public.is_flare_active(flare_id)
    AND public.is_flare_recipient(flare_id, auth.uid())
  );
