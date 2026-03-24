ALTER TABLE public.profiles
  ADD COLUMN age integer,
  ADD COLUMN gender text,
  ADD COLUMN city text,
  ADD COLUMN location_type text,
  ADD COLUMN referral_source text,
  ADD COLUMN social_media_usage text;