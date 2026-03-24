-- Fix week_start values that landed on Tuesday due to UTC timezone bug
-- Move them back to the correct Monday

UPDATE public.weekly_priorities SET week_start = '2026-03-09' WHERE week_start = '2026-03-10';
UPDATE public.weekly_priorities SET week_start = '2026-03-16' WHERE week_start = '2026-03-17';
UPDATE public.weekly_priorities SET week_start = '2026-03-02' WHERE week_start = '2026-03-03';
UPDATE public.weekly_priorities SET week_start = '2026-02-23' WHERE week_start = '2026-02-24';