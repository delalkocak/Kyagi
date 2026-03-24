-- Auto-add new users as members of Sonal's and Del's circles
CREATE OR REPLACE FUNCTION public.auto_follow_founders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  del_circle_id uuid := 'f4e463a6-bb5d-4d8b-89e0-fda3741fd1de';
  sonal_circle_id uuid := 'c81b0d90-e161-4bb4-b30e-bfef6c961b26';
  del_user_id uuid := '2ed094aa-92a7-4443-88d8-6bf77f03c52c';
  sonal_user_id uuid := '8eca5774-fd22-492f-98fb-35e6d137580a';
BEGIN
  -- Don't add founders to their own circles
  IF NEW.id != del_user_id THEN
    INSERT INTO public.circle_members (circle_id, user_id)
    VALUES (del_circle_id, NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;

  IF NEW.id != sonal_user_id THEN
    INSERT INTO public.circle_members (circle_id, user_id)
    VALUES (sonal_circle_id, NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger after new user is created in auth
CREATE TRIGGER on_auth_user_created_auto_follow
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_follow_founders();