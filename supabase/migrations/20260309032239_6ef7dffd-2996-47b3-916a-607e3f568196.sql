-- Allow circle owners to delete members
CREATE POLICY "Owner deletes members"
ON public.circle_members
FOR DELETE
USING (circle_id IN (
  SELECT id FROM public.circles WHERE owner_id = auth.uid()
));