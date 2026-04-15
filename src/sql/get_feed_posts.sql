CREATE OR REPLACE FUNCTION get_feed_posts(
  p_user_id uuid,
  p_days    int DEFAULT 4,
  p_limit   int DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_circle_id  uuid;
  v_paused_ids uuid[];
  v_posts      jsonb;
BEGIN
  -- 1. Find the user's circle
  SELECT id INTO v_circle_id
    FROM circles
   WHERE owner_id = p_user_id
   LIMIT 1;

  -- 2. Collect paused member user_ids
  IF v_circle_id IS NOT NULL THEN
    SELECT COALESCE(array_agg(user_id), '{}')
      INTO v_paused_ids
      FROM circle_members
     WHERE circle_id = v_circle_id
       AND paused = true;
  ELSE
    v_paused_ids := '{}';
  END IF;

  -- 3. Try posts from the last p_days days
  WITH filtered_posts AS (
    SELECT p.*
      FROM posts p
     WHERE p.created_at >= (now() - make_interval(days => p_days))
       AND p.user_id <> ALL(v_paused_ids)
     ORDER BY p.created_at DESC
     LIMIT p_limit
  ),
  -- 4. Fallback if zero recent posts
  final_posts AS (
    SELECT * FROM filtered_posts
    UNION ALL
    SELECT p.*
      FROM posts p
     WHERE NOT EXISTS (SELECT 1 FROM filtered_posts)
       AND p.user_id <> ALL(v_paused_ids)
     ORDER BY p.created_at DESC
     LIMIT p_limit
  )
  SELECT jsonb_agg(row_result ORDER BY (row_result->>'created_at') DESC)
    INTO v_posts
    FROM (
      SELECT jsonb_build_object(
        'id',                fp.id,
        'user_id',           fp.user_id,
        'prompt_type',       fp.prompt_type,
        'content',           fp.content,
        'created_at',        fp.created_at,
        'session_id',        fp.session_id,
        'link_url',          fp.link_url,
        'link_title',        fp.link_title,
        'link_description',  fp.link_description,
        'link_image_url',    fp.link_image_url,
        'link_site_name',    fp.link_site_name,
        'profile',           CASE
                               WHEN pr.user_id IS NOT NULL THEN
                                 jsonb_build_object(
                                   'user_id',      pr.user_id,
                                   'display_name',  pr.display_name,
                                   'nickname',      pr.display_name,
                                   'avatar_url',    pr.avatar_url
                                 )
                               ELSE NULL
                             END,
        'media',             COALESCE((
                               SELECT jsonb_agg(
                                 jsonb_build_object(
                                   'id',         pm.id,
                                   'url',        pm.url,
                                   'media_type', pm.media_type,
                                   'sort_order', pm.sort_order
                                 ) ORDER BY pm.sort_order ASC
                               )
                               FROM post_media pm
                               WHERE pm.post_id = fp.id
                             ), '[]'::jsonb),
        'comments',          COALESCE((
                               SELECT jsonb_agg(
                                 jsonb_build_object(
                                   'id',         c.id,
                                   'text',       c.text,
                                   'audio_url',  c.audio_url,
                                   'item_index', c.item_index,
                                   'created_at', c.created_at,
                                   'user_id',    c.user_id,
                                   'profile',    CASE
                                                   WHEN cp.user_id IS NOT NULL THEN
                                                     jsonb_build_object(
                                                       'user_id',      cp.user_id,
                                                       'display_name',  cp.display_name,
                                                       'nickname',      cp.display_name,
                                                       'avatar_url',    cp.avatar_url
                                                     )
                                                   ELSE NULL
                                                 END
                                 ) ORDER BY c.created_at ASC
                               )
                               FROM comments c
                               LEFT JOIN profiles cp ON cp.user_id = c.user_id
                               WHERE c.post_id = fp.id
                             ), '[]'::jsonb)
      ) AS row_result
      FROM final_posts fp
      LEFT JOIN profiles pr ON pr.user_id = fp.user_id
    ) sub;

  RETURN COALESCE(v_posts, '[]'::jsonb);
END;
$$;
