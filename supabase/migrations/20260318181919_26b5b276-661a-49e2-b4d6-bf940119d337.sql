
-- Backfill session_ids for all existing posts using 10-min gap + 3-post cap
DO $$
DECLARE
  rec RECORD;
  prev_user_id uuid := NULL;
  prev_created_at timestamptz := NULL;
  current_session uuid := NULL;
  session_count int := 0;
BEGIN
  FOR rec IN
    SELECT id, user_id, created_at
    FROM public.posts
    ORDER BY user_id, created_at ASC
  LOOP
    IF prev_user_id IS NULL 
       OR rec.user_id != prev_user_id 
       OR (rec.created_at - prev_created_at) > interval '10 minutes'
       OR session_count >= 3 THEN
      -- Start new session
      current_session := gen_random_uuid();
      session_count := 1;
    ELSE
      session_count := session_count + 1;
    END IF;

    UPDATE public.posts SET session_id = current_session WHERE id = rec.id;

    prev_user_id := rec.user_id;
    prev_created_at := rec.created_at;
  END LOOP;
END;
$$;
