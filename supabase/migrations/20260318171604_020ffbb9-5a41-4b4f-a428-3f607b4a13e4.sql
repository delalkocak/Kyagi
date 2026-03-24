
-- ═══ FLARES ═══
CREATE TABLE public.flares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text CHECK (char_length(message) <= 80),
  availability_type text NOT NULL CHECK (availability_type IN ('right_now', 'tonight', 'custom')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.flares ENABLE ROW LEVEL SECURITY;

-- Sender can read own flares
CREATE POLICY "Sender reads own flares" ON public.flares
  FOR SELECT TO authenticated
  USING (sender_id = auth.uid());

-- Users create flares as themselves
CREATE POLICY "Create own flares" ON public.flares
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- ═══ FLARE RECIPIENTS ═══
CREATE TABLE public.flare_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flare_id uuid NOT NULL REFERENCES public.flares(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.flare_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sender reads flare recipients" ON public.flare_recipients
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.flares f WHERE f.id = flare_id AND f.sender_id = auth.uid())
  );

CREATE POLICY "Recipient reads own row" ON public.flare_recipients
  FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "Sender inserts recipients" ON public.flare_recipients
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.flares f WHERE f.id = flare_id AND f.sender_id = auth.uid())
  );

-- Now add the cross-referencing policy on flares
CREATE POLICY "Recipients read flares" ON public.flares
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.flare_recipients fr WHERE fr.flare_id = id AND fr.recipient_id = auth.uid())
  );

-- ═══ FLARE RESPONSES ═══
CREATE TABLE public.flare_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flare_id uuid NOT NULL REFERENCES public.flares(id) ON DELETE CASCADE,
  responder_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text CHECK (char_length(message) <= 150),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (flare_id, responder_id)
);

ALTER TABLE public.flare_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sender reads responses" ON public.flare_responses
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.flares f WHERE f.id = flare_id AND f.sender_id = auth.uid())
  );

CREATE POLICY "Responder reads own response" ON public.flare_responses
  FOR SELECT TO authenticated
  USING (responder_id = auth.uid());

CREATE POLICY "Respond to active flare" ON public.flare_responses
  FOR INSERT TO authenticated
  WITH CHECK (
    responder_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.flares f
      WHERE f.id = flare_id AND f.is_active = true AND f.expires_at > now()
    )
    AND EXISTS (
      SELECT 1 FROM public.flare_recipients fr
      WHERE fr.flare_id = flare_id AND fr.recipient_id = auth.uid()
    )
  );
