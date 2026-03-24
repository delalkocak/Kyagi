
-- Friend requests table
CREATE TABLE public.friend_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id uuid NOT NULL,
    receiver_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(sender_id, receiver_id)
);

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

-- Validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_friend_request_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'accepted', 'denied') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_friend_request_status
  BEFORE INSERT OR UPDATE ON public.friend_requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_friend_request_status();

-- Update updated_at trigger
CREATE TRIGGER trg_friend_requests_updated_at
  BEFORE UPDATE ON public.friend_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: sender can see sent requests, receiver can see received
CREATE POLICY "View own requests"
ON public.friend_requests FOR SELECT TO authenticated
USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Only edge function (service role) inserts, but allow sender insert too
CREATE POLICY "Send friend requests"
ON public.friend_requests FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid());

-- Receiver can accept/deny
CREATE POLICY "Respond to requests"
ON public.friend_requests FOR UPDATE TO authenticated
USING (receiver_id = auth.uid());

-- Sender can cancel
CREATE POLICY "Cancel own requests"
ON public.friend_requests FOR DELETE TO authenticated
USING (sender_id = auth.uid());
