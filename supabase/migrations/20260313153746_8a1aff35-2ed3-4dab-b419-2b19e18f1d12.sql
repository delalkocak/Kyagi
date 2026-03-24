
ALTER TABLE public.profiles ADD COLUMN username text UNIQUE;

CREATE INDEX idx_profiles_username ON public.profiles (username);
CREATE INDEX idx_profiles_display_name_trgm ON public.profiles USING btree (lower(display_name));
