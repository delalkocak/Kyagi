
DELETE FROM public.circle_members WHERE user_id = '5831ad1e-a19f-4ba1-b960-0a3ce4bab291';
DELETE FROM public.friend_requests WHERE sender_id = '5831ad1e-a19f-4ba1-b960-0a3ce4bab291' OR receiver_id = '5831ad1e-a19f-4ba1-b960-0a3ce4bab291';
DELETE FROM public.circles WHERE owner_id = '5831ad1e-a19f-4ba1-b960-0a3ce4bab291';
DELETE FROM public.notifications WHERE user_id = '5831ad1e-a19f-4ba1-b960-0a3ce4bab291';
DELETE FROM public.profiles WHERE user_id = '5831ad1e-a19f-4ba1-b960-0a3ce4bab291';
DELETE FROM auth.users WHERE id = '5831ad1e-a19f-4ba1-b960-0a3ce4bab291';
