ALTER TABLE public.sunday_papers 
  ADD COLUMN IF NOT EXISTS image_of_week_url text,
  ADD COLUMN IF NOT EXISTS image_of_week_post_id uuid,
  ADD COLUMN IF NOT EXISTS top_poster_name text,
  ADD COLUMN IF NOT EXISTS top_poster_count integer;