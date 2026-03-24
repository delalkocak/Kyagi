
-- Add note and decline_note columns to schedule_requests
ALTER TABLE public.schedule_requests 
  ADD COLUMN IF NOT EXISTS note text,
  ADD COLUMN IF NOT EXISTS decline_note text,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

-- Create confirmed_hangouts table
CREATE TABLE IF NOT EXISTS public.confirmed_hangouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES public.schedule_requests(id) ON DELETE CASCADE NOT NULL,
  user_a_id uuid NOT NULL,
  user_b_id uuid NOT NULL,
  activity text NOT NULL,
  hangout_date date NOT NULL,
  time_block text NOT NULL,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on confirmed_hangouts
ALTER TABLE public.confirmed_hangouts ENABLE ROW LEVEL SECURITY;

-- RLS: users can view hangouts they're part of
CREATE POLICY "View own hangouts"
  ON public.confirmed_hangouts
  FOR SELECT
  TO authenticated
  USING (user_a_id = auth.uid() OR user_b_id = auth.uid());

-- RLS: insert only via service role (created by edge function), but allow authenticated insert for now
CREATE POLICY "Insert hangouts as participant"
  ON public.confirmed_hangouts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_a_id = auth.uid() OR user_b_id = auth.uid());

-- RLS: no update/delete needed for now
