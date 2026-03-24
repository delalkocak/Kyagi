DELETE FROM public.circle_members WHERE user_id = 'e094f1f7-f5f9-42d7-aacb-f62bfb853d7a';
DELETE FROM public.friend_requests WHERE sender_id = 'e094f1f7-f5f9-42d7-aacb-f62bfb853d7a' OR receiver_id = 'e094f1f7-f5f9-42d7-aacb-f62bfb853d7a';
DELETE FROM public.circles WHERE owner_id = 'e094f1f7-f5f9-42d7-aacb-f62bfb853d7a';
DELETE FROM public.notifications WHERE user_id = 'e094f1f7-f5f9-42d7-aacb-f62bfb853d7a';
DELETE FROM public.profiles WHERE user_id = 'e094f1f7-f5f9-42d7-aacb-f62bfb853d7a';
DELETE FROM auth.users WHERE id = 'e094f1f7-f5f9-42d7-aacb-f62bfb853d7a';