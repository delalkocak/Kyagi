
-- Trigger function: when someone responds to a flare, notify the sender
CREATE OR REPLACE FUNCTION public.notify_on_flare_response()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  sender_user_id uuid;
  responder_name text;
  flare_message text;
  _url text;
BEGIN
  -- Get the flare sender's user_id (flares.sender_id is a profile.id)
  SELECT p.user_id, f.message
  INTO sender_user_id, flare_message
  FROM public.flares f
  JOIN public.profiles p ON p.id = f.sender_id
  WHERE f.id = NEW.flare_id;

  IF sender_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get responder display name (responder_id is also a profile.id)
  SELECT display_name INTO responder_name
  FROM public.profiles
  WHERE id = NEW.responder_id
  LIMIT 1;

  -- Create in-app notification
  INSERT INTO public.notifications (user_id, type, title, body, reference_id)
  VALUES (
    sender_user_id,
    'flare_response',
    COALESCE(split_part(responder_name, ' ', 1), 'someone') || ' is down for your flare!',
    CASE WHEN NEW.message IS NOT NULL AND NEW.message != '' 
         THEN NEW.message 
         ELSE NULL 
    END,
    NEW.flare_id
  );

  -- Trigger push notification via edge function
  _url := current_setting('app.settings.supabase_url', true);
  IF _url IS NOT NULL AND _url != '' THEN
    PERFORM net.http_post(
      url := _url || '/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)
      ),
      body := jsonb_build_object(
        'userId', sender_user_id,
        'title', COALESCE(split_part(responder_name, ' ', 1), 'someone') || ' is down!',
        'body', COALESCE(split_part(responder_name, ' ', 1), 'someone') || ' responded to your flare',
        'tag', 'flare_response',
        'data', jsonb_build_object('type', 'flare_response', 'flareId', NEW.flare_id::text)
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger on flare_responses
CREATE TRIGGER on_flare_response_notify
  AFTER INSERT ON public.flare_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_flare_response();
