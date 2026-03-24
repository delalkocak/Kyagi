ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_recommendation boolean NOT NULL DEFAULT false;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS recommendation_category text;