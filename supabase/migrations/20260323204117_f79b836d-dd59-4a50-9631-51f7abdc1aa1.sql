-- Fix signup failure: auto_follow_founders must run on public.profiles, not auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_auto_follow ON auth.users;

-- Ensure the correct trigger exists on profiles
DROP TRIGGER IF EXISTS on_new_profile_auto_follow_founders ON public.profiles;
CREATE TRIGGER on_new_profile_auto_follow_founders
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_follow_founders();