
ALTER TABLE public.posts
  ADD COLUMN link_url text,
  ADD COLUMN link_title text,
  ADD COLUMN link_description text,
  ADD COLUMN link_image_url text,
  ADD COLUMN link_site_name text;
