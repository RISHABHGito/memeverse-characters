-- Make has_role run as the calling user. It is only used in RLS policies
-- to check the caller's own role row, so invoker rights are sufficient and
-- remove the security-definer warning.
ALTER FUNCTION public.has_role(_user_id uuid, _role public.app_role) SECURITY INVOKER;

-- Restrict the internal view-counter helper to service-role callers only.
REVOKE EXECUTE ON FUNCTION public.increment_meme_view(_meme_id uuid) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.increment_meme_view(_meme_id uuid) TO service_role;