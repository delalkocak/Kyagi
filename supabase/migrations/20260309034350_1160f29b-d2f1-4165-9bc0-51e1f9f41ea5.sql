-- Fix existing asymmetry: add Del to Sonal's circle
INSERT INTO circle_members (circle_id, user_id) 
VALUES ('c81b0d90-e161-4bb4-b30e-bfef6c961b26', '2ed094aa-92a7-4443-88d8-6bf77f03c52c')
ON CONFLICT DO NOTHING;

-- Mark the existing pending request as accepted since they're already connected
UPDATE friend_requests SET status = 'accepted' WHERE id = '8de3760f-44ef-47c2-8b4d-c2062a777450';

-- Enable realtime for friend_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_requests;
