
-- Pass 1: Add onboarding columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_step TEXT DEFAULT 'welcome',
  ADD COLUMN IF NOT EXISTS is_team_account BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_hash TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS discoverable BOOLEAN DEFAULT true;

-- Index for phone_hash lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone_hash
  ON public.profiles (phone_hash);

-- Validation trigger for onboarding_step values
CREATE OR REPLACE FUNCTION public.validate_onboarding_step()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.onboarding_step NOT IN ('welcome', 'exploring', 'activated', 'complete') THEN
    RAISE EXCEPTION 'Invalid onboarding_step: %', NEW.onboarding_step;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_onboarding_step_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_onboarding_step();

-- Pass 2: Update auto_follow_founders to also add founders to new user's circle + create friend_requests
CREATE OR REPLACE FUNCTION public.auto_follow_founders()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  del_user_id uuid := '2ed094aa-92a7-4443-88d8-6bf77f03c52c';
  sonal_user_id uuid := '8eca5774-fd22-492f-98fb-35e6d137580a';
  new_user_circle_id uuid;
  founder_id uuid;
  founder_circle_id uuid;
BEGIN
  -- Skip if the new user IS a founder
  IF NEW.user_id = del_user_id OR NEW.user_id = sonal_user_id THEN
    RETURN NEW;
  END IF;

  -- Get the new user's circle
  SELECT id INTO new_user_circle_id FROM public.circles WHERE owner_id = NEW.user_id LIMIT 1;

  -- For each founder, do bidirectional circle membership + friend request
  FOREACH founder_id IN ARRAY ARRAY[del_user_id, sonal_user_id]
  LOOP
    -- Get founder's circle
    SELECT id INTO founder_circle_id FROM public.circles WHERE owner_id = founder_id LIMIT 1;

    -- Add new user to founder's circle
    IF founder_circle_id IS NOT NULL THEN
      INSERT INTO public.circle_members (circle_id, user_id)
      VALUES (founder_circle_id, NEW.user_id)
      ON CONFLICT DO NOTHING;
    END IF;

    -- Add founder to new user's circle
    IF new_user_circle_id IS NOT NULL THEN
      INSERT INTO public.circle_members (circle_id, user_id)
      VALUES (new_user_circle_id, founder_id)
      ON CONFLICT DO NOTHING;
    END IF;

    -- Create auto-accepted friend request
    INSERT INTO public.friend_requests (sender_id, receiver_id, status)
    VALUES (founder_id, NEW.user_id, 'accepted')
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Set existing users who haven't completed onboarding to 'complete' (they're existing users)
UPDATE public.profiles SET onboarding_step = 'complete' WHERE onboarding_step = 'welcome';
