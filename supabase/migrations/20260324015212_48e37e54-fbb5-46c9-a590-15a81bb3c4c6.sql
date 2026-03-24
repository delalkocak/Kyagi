-- Add founders to test user's circle (was missed by trigger timing)
INSERT INTO public.circle_members (circle_id, user_id)
VALUES 
  ('06226de0-f1bf-41d4-8337-481c39effc2d', '2ed094aa-92a7-4443-88d8-6bf77f03c52c'),
  ('06226de0-f1bf-41d4-8337-481c39effc2d', '8eca5774-fd22-492f-98fb-35e6d137580a')
ON CONFLICT DO NOTHING;

-- Also add test user to founders' circles
INSERT INTO public.circle_members (circle_id, user_id)
SELECT c.id, 'aad13865-e20c-4814-8d04-145e19baebc0'
FROM public.circles c 
WHERE c.owner_id IN ('2ed094aa-92a7-4443-88d8-6bf77f03c52c', '8eca5774-fd22-492f-98fb-35e6d137580a')
ON CONFLICT DO NOTHING;