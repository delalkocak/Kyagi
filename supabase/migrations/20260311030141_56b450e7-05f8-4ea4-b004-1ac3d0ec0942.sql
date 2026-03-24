
-- Group hang requests: a user proposes adding people to a confirmed hangout
CREATE TABLE IF NOT EXISTS public.group_hang_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hangout_id uuid NOT NULL,
  requester_id uuid NOT NULL,
  approver_id uuid NOT NULL,
  suggested_people jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.group_hang_requests ENABLE ROW LEVEL SECURITY;

-- Users can view requests they're part of
CREATE POLICY "View own group hang requests"
  ON public.group_hang_requests
  FOR SELECT
  TO authenticated
  USING (requester_id = auth.uid() OR approver_id = auth.uid());

-- Users can create requests
CREATE POLICY "Create group hang requests"
  ON public.group_hang_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid());

-- Approver can update (approve/deny)
CREATE POLICY "Respond to group hang requests"
  ON public.group_hang_requests
  FOR UPDATE
  TO authenticated
  USING (approver_id = auth.uid());
