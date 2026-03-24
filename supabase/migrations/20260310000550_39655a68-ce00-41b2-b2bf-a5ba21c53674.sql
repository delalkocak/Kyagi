
-- Availability blocks for scheduling
CREATE TABLE public.availability_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  time_slot TEXT NOT NULL CHECK (time_slot IN ('morning', 'afternoon', 'evening')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, date, time_slot)
);

ALTER TABLE public.availability_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own availability"
  ON public.availability_blocks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own availability"
  ON public.availability_blocks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own availability"
  ON public.availability_blocks FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Friends can see each other's availability
CREATE POLICY "View friends availability"
  ON public.availability_blocks FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT cm.user_id FROM circle_members cm
        JOIN circles c ON c.id = cm.circle_id
      WHERE c.owner_id = auth.uid()
      UNION
      SELECT c.owner_id FROM circles c
        JOIN circle_members cm ON cm.circle_id = c.id
      WHERE cm.user_id = auth.uid()
    )
  );

-- Schedule requests
CREATE TABLE public.schedule_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  proposed_date DATE NOT NULL,
  proposed_time_slot TEXT NOT NULL CHECK (proposed_time_slot IN ('morning', 'afternoon', 'evening')),
  activity TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.schedule_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own schedule requests"
  ON public.schedule_requests FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Send schedule requests"
  ON public.schedule_requests FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Respond to schedule requests"
  ON public.schedule_requests FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid());

-- Add scheduling_requests_remaining to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS scheduling_requests_remaining INTEGER NOT NULL DEFAULT 3;
