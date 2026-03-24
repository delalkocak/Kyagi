
-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  reference_id uuid,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Mark own notifications read" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Delete own notifications" ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Index for fast queries
CREATE INDEX idx_notifications_user_created ON public.notifications (user_id, created_at DESC);

-- Trigger: notify on new comment
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  post_owner_id uuid;
  commenter_name text;
BEGIN
  SELECT user_id INTO post_owner_id FROM public.posts WHERE id = NEW.post_id;
  
  IF post_owner_id IS NOT NULL AND post_owner_id != NEW.user_id THEN
    SELECT display_name INTO commenter_name FROM public.profiles WHERE user_id = NEW.user_id LIMIT 1;
    
    INSERT INTO public.notifications (user_id, type, title, body, reference_id)
    VALUES (
      post_owner_id,
      'comment',
      COALESCE(commenter_name, 'someone') || ' commented on your post',
      LEFT(NEW.text, 100),
      NEW.post_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_comment();

-- Trigger: notify on friend request
CREATE OR REPLACE FUNCTION public.notify_on_friend_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sender_name text;
BEGIN
  SELECT display_name INTO sender_name FROM public.profiles WHERE user_id = NEW.sender_id LIMIT 1;
  
  INSERT INTO public.notifications (user_id, type, title, reference_id)
  VALUES (
    NEW.receiver_id,
    'friend_request',
    COALESCE(sender_name, 'someone') || ' sent you a friend request',
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_friend_request
  AFTER INSERT ON public.friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_friend_request();

-- Trigger: notify on schedule request
CREATE OR REPLACE FUNCTION public.notify_on_schedule_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sender_name text;
BEGIN
  SELECT display_name INTO sender_name FROM public.profiles WHERE user_id = NEW.sender_id LIMIT 1;
  
  INSERT INTO public.notifications (user_id, type, title, body, reference_id)
  VALUES (
    NEW.recipient_id,
    'schedule_request',
    COALESCE(sender_name, 'someone') || ' wants to meet up',
    NEW.activity,
    NEW.id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_schedule_request
  AFTER INSERT ON public.schedule_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_schedule_request();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
