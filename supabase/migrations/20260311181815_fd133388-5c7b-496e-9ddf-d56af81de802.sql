
-- Allow users to update their own comments (for editing)
CREATE POLICY "Update own comments"
ON public.comments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
