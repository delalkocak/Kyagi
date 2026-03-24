
-- Allow service role (via edge function) to update flares is_active
CREATE POLICY "Update own flares" ON public.flares
  FOR UPDATE TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());
