
CREATE OR REPLACE FUNCTION public.notify_on_schedule_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sender_name text;
BEGIN
  SELECT display_name INTO sender_name FROM public.profiles WHERE user_id = NEW.sender_id LIMIT 1;
  
  INSERT INTO public.notifications (user_id, type, title, body, reference_id)
  VALUES (
    NEW.recipient_id,
    'schedule_request',
    COALESCE(sender_name, 'someone') || ' wants to meet offline',
    NEW.activity,
    NEW.id
  );
  RETURN NEW;
END;
$function$;
