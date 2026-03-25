-- Wire the webhook secret into DB trigger functions so they can authenticate
-- against the now-secured edge functions.
--
-- The secret VALUE is NOT stored here (that would expose it in git).
-- Before deploying, run the following in your Supabase SQL editor:
--
--   ALTER DATABASE postgres
--     SET "app.settings.webhook_secret" = '<your_WEBHOOK_SECRET_value>';
--
-- Use the same value you set as the WEBHOOK_SECRET edge function secret
-- in the Supabase dashboard (Settings → Edge Functions → Secrets).

-- Update notify_push_on_new_post to include x-webhook-secret header
CREATE OR REPLACE FUNCTION public.notify_push_on_new_post()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _url text;
  _secret text;
BEGIN
  _url := current_setting('app.settings.supabase_url', true);
  IF _url IS NULL OR _url = '' THEN
    RETURN NEW;
  END IF;

  _secret := current_setting('app.settings.webhook_secret', true);

  PERFORM net.http_post(
    url := _url || '/functions/v1/notify-new-post',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true),
      'x-webhook-secret', coalesce(_secret, '')
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'record', row_to_json(NEW)
    )
  );
  RETURN NEW;
END;
$function$;

-- Update notify_push_on_schedule_event to include x-webhook-secret header
CREATE OR REPLACE FUNCTION public.notify_push_on_schedule_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _url text;
  _secret text;
BEGIN
  _url := current_setting('app.settings.supabase_url', true);
  IF _url IS NULL OR _url = '' THEN
    RETURN NEW;
  END IF;

  _secret := current_setting('app.settings.webhook_secret', true);

  PERFORM net.http_post(
    url := _url || '/functions/v1/notify-schedule-event',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true),
      'x-webhook-secret', coalesce(_secret, '')
    ),
    body := jsonb_build_object(
      'type', TG_OP,
      'record', row_to_json(NEW),
      'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
    )
  );
  RETURN NEW;
END;
$function$;

-- Update notify_on_flare_response to include x-webhook-secret for send-push-notification
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
  _secret text;
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

  -- Trigger push notification via edge function (using webhook secret for auth)
  _url := current_setting('app.settings.supabase_url', true);
  _secret := current_setting('app.settings.webhook_secret', true);

  IF _url IS NOT NULL AND _url != '' THEN
    PERFORM net.http_post(
      url := _url || '/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true),
        'x-webhook-secret', coalesce(_secret, '')
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
