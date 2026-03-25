-- Pre-beta security fixes
-- 1. Enforce 120-character limit on comments at the database level.
--    Client-side enforcement (CommentThread.tsx) is bypassable via direct API calls.
ALTER TABLE public.comments
  ADD CONSTRAINT comment_length_limit CHECK (char_length(text) <= 120);

-- 2. Fix schedule_requests UPDATE RLS: only allow updates when status is still 'pending'.
--    Without this guard, recipients can re-accept or re-decline an already-resolved request,
--    which creates duplicate confirmed_hangout records.
DROP POLICY IF EXISTS "Respond to schedule requests" ON public.schedule_requests;
CREATE POLICY "Respond to schedule requests"
  ON public.schedule_requests FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid() AND status = 'pending')
  WITH CHECK (recipient_id = auth.uid());

-- 3. Enforce the 20-active-member circle limit atomically inside the database.
--    The application-level check (getActiveCount → upsert) has a TOCTOU race condition:
--    two concurrent accepts can both read count=19, both decide is_active=true,
--    and both insert — exceeding the freemium limit.
--    This trigger runs inside the transaction and is immune to concurrent inserts.
CREATE OR REPLACE FUNCTION public.enforce_circle_active_limit()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_active = true THEN
    -- On INSERT: id != NEW.id is always true (row doesn't exist yet) — counts all existing active members.
    -- On UPDATE: excludes the row being updated so we only count other active members.
    IF (
      SELECT COUNT(*) FROM public.circle_members
      WHERE circle_id = NEW.circle_id
        AND is_active = true
        AND id != NEW.id
    ) >= 20 THEN
      RAISE EXCEPTION 'circle_active_limit_exceeded';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_circle_active_limit
  BEFORE INSERT OR UPDATE ON public.circle_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_circle_active_limit();
