
ALTER TABLE public.availability_blocks DROP CONSTRAINT availability_blocks_time_slot_check;
ALTER TABLE public.availability_blocks ADD CONSTRAINT availability_blocks_time_slot_check 
  CHECK (time_slot = ANY (ARRAY['early_morning', 'morning', 'afternoon', 'evening']));
