-- Add unique constraint on circle_members for upsert support
ALTER TABLE public.circle_members ADD CONSTRAINT circle_members_circle_user_unique UNIQUE (circle_id, user_id);
