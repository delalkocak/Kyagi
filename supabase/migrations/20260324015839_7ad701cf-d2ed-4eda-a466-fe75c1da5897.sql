-- Add paused column to circle_members for muting friends
ALTER TABLE public.circle_members ADD COLUMN paused boolean NOT NULL DEFAULT false;

-- Allow circle owners to update members (needed for pause toggle)
CREATE POLICY "Owner updates members"
ON public.circle_members
FOR UPDATE
TO authenticated
USING (is_circle_owner(circle_id, auth.uid()))
WITH CHECK (is_circle_owner(circle_id, auth.uid()));