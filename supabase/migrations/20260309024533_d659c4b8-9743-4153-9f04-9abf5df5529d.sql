
-- Timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Auto-create circle on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_circle()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.circles (owner_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Circles
CREATE TABLE public.circles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Circle',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.circles ENABLE ROW LEVEL SECURITY;

-- Circle members
CREATE TABLE public.circle_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (circle_id, user_id)
);
ALTER TABLE public.circle_members ENABLE ROW LEVEL SECURITY;

-- Circles policies (after circle_members exists)
CREATE POLICY "View circles owned or member of" ON public.circles FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR id IN (SELECT circle_id FROM public.circle_members WHERE user_id = auth.uid()));
CREATE POLICY "Insert own circle" ON public.circles FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Update own circle" ON public.circles FOR UPDATE TO authenticated USING (auth.uid() = owner_id);

-- Circle members policies
CREATE POLICY "Owner manages members" ON public.circle_members FOR ALL TO authenticated
  USING (circle_id IN (SELECT id FROM public.circles WHERE owner_id = auth.uid()));
CREATE POLICY "Members view own memberships" ON public.circle_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER on_auth_user_created_circle AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_circle();

-- Posts
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_type TEXT NOT NULL DEFAULT 'grateful',
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View posts from circles" ON public.posts FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    user_id IN (
      SELECT cm.user_id FROM public.circle_members cm JOIN public.circles c ON c.id = cm.circle_id WHERE c.owner_id = auth.uid()
      UNION
      SELECT c.owner_id FROM public.circles c JOIN public.circle_members cm ON cm.circle_id = c.id WHERE cm.user_id = auth.uid()
    )
  );
CREATE POLICY "Create own posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own posts" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Delete own posts" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Post media
CREATE TABLE public.post_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'audio')),
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View media if post viewable" ON public.post_media FOR SELECT TO authenticated USING (post_id IN (SELECT id FROM public.posts));
CREATE POLICY "Add media to own posts" ON public.post_media FOR INSERT TO authenticated WITH CHECK (post_id IN (SELECT id FROM public.posts WHERE user_id = auth.uid()));
CREATE POLICY "Delete media from own posts" ON public.post_media FOR DELETE TO authenticated USING (post_id IN (SELECT id FROM public.posts WHERE user_id = auth.uid()));

-- Comments
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  item_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View comments if post viewable" ON public.comments FOR SELECT TO authenticated USING (post_id IN (SELECT id FROM public.posts));
CREATE POLICY "Add comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND post_id IN (SELECT id FROM public.posts));
CREATE POLICY "Delete own comments" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Storage
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true);
CREATE POLICY "Media publicly readable" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "Auth users upload media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);
