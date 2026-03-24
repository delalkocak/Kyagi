
-- Drop all RESTRICTIVE policies and recreate as PERMISSIVE

-- posts
DROP POLICY IF EXISTS "Create own posts" ON public.posts;
DROP POLICY IF EXISTS "Delete own posts" ON public.posts;
DROP POLICY IF EXISTS "Update own posts" ON public.posts;
DROP POLICY IF EXISTS "View posts from circles" ON public.posts;

CREATE POLICY "Create own posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own posts" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Update own posts" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "View posts from circles" ON public.posts FOR SELECT TO authenticated USING (
  (user_id = auth.uid()) OR (user_id IN (
    SELECT cm.user_id FROM circle_members cm JOIN circles c ON c.id = cm.circle_id WHERE c.owner_id = auth.uid()
    UNION
    SELECT c.owner_id FROM circles c JOIN circle_members cm ON cm.circle_id = c.id WHERE cm.user_id = auth.uid()
  ))
);

-- post_media
DROP POLICY IF EXISTS "Add media to own posts" ON public.post_media;
DROP POLICY IF EXISTS "Delete media from own posts" ON public.post_media;
DROP POLICY IF EXISTS "View media if post viewable" ON public.post_media;

CREATE POLICY "Add media to own posts" ON public.post_media FOR INSERT TO authenticated WITH CHECK (post_id IN (SELECT id FROM posts WHERE user_id = auth.uid()));
CREATE POLICY "Delete media from own posts" ON public.post_media FOR DELETE TO authenticated USING (post_id IN (SELECT id FROM posts WHERE user_id = auth.uid()));
CREATE POLICY "View media if post viewable" ON public.post_media FOR SELECT TO authenticated USING (post_id IN (SELECT id FROM posts));

-- comments
DROP POLICY IF EXISTS "Add comments" ON public.comments;
DROP POLICY IF EXISTS "Delete own comments" ON public.comments;
DROP POLICY IF EXISTS "View comments if post viewable" ON public.comments;

CREATE POLICY "Add comments" ON public.comments FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id) AND (post_id IN (SELECT id FROM posts)));
CREATE POLICY "Delete own comments" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "View comments if post viewable" ON public.comments FOR SELECT TO authenticated USING (post_id IN (SELECT id FROM posts));

-- circles
DROP POLICY IF EXISTS "Insert own circle" ON public.circles;
DROP POLICY IF EXISTS "Update own circle" ON public.circles;
DROP POLICY IF EXISTS "View circles owned or member of" ON public.circles;

CREATE POLICY "Insert own circle" ON public.circles FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Update own circle" ON public.circles FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "View circles owned or member of" ON public.circles FOR SELECT TO authenticated USING (
  (owner_id = auth.uid()) OR (id IN (SELECT circle_id FROM circle_members WHERE user_id = auth.uid()))
);

-- circle_members
DROP POLICY IF EXISTS "Members view own memberships" ON public.circle_members;
DROP POLICY IF EXISTS "Owner deletes members" ON public.circle_members;
DROP POLICY IF EXISTS "Owner manages members" ON public.circle_members;

CREATE POLICY "Members view own memberships" ON public.circle_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR circle_id IN (SELECT id FROM circles WHERE owner_id = auth.uid()));
CREATE POLICY "Owner manages members" ON public.circle_members FOR INSERT TO authenticated WITH CHECK (circle_id IN (SELECT id FROM circles WHERE owner_id = auth.uid()));
CREATE POLICY "Owner deletes members" ON public.circle_members FOR DELETE TO authenticated USING (circle_id IN (SELECT id FROM circles WHERE owner_id = auth.uid()));

-- profiles
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
