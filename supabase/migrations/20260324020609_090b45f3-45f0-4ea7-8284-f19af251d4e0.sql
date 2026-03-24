-- Add paused_at timestamp to track when a friend was paused
ALTER TABLE public.circle_members ADD COLUMN paused_at timestamptz;

-- Backfill any currently paused members
UPDATE public.circle_members SET paused_at = now() WHERE paused = true AND paused_at IS NULL;

-- Function: can viewer see poster's content created at a given time?
CREATE OR REPLACE FUNCTION public.is_visible_to_viewer(_poster_id uuid, _viewer_id uuid, _content_created_at timestamptz)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _poster_id = _viewer_id
    OR (
      -- They are connected via circles (either direction)
      (
        EXISTS (
          SELECT 1 FROM circle_members cm JOIN circles c ON c.id = cm.circle_id
          WHERE c.owner_id = _poster_id AND cm.user_id = _viewer_id
        )
        OR EXISTS (
          SELECT 1 FROM circle_members cm JOIN circles c ON c.id = cm.circle_id
          WHERE c.owner_id = _viewer_id AND cm.user_id = _poster_id
        )
      )
      AND
      -- Poster has NOT paused the viewer for content after the pause
      NOT EXISTS (
        SELECT 1 FROM circle_members cm JOIN circles c ON c.id = cm.circle_id
        WHERE c.owner_id = _poster_id
          AND cm.user_id = _viewer_id
          AND cm.paused = true
          AND cm.paused_at IS NOT NULL
          AND _content_created_at >= cm.paused_at
      )
    );
$$;

-- Replace posts SELECT policy to use visibility function
DROP POLICY IF EXISTS "View posts from circles" ON public.posts;
CREATE POLICY "View posts from circles"
ON public.posts
FOR SELECT
TO authenticated
USING (is_visible_to_viewer(user_id, auth.uid(), created_at));

-- Replace availability SELECT policy for friends
DROP POLICY IF EXISTS "View friends availability" ON public.availability_blocks;
CREATE POLICY "View friends availability"
ON public.availability_blocks
FOR SELECT
TO authenticated
USING (is_visible_to_viewer(user_id, auth.uid(), created_at));