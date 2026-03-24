ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notify_hangout_invites BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_flare_alerts BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_comments BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_monthly_paper BOOLEAN DEFAULT true;