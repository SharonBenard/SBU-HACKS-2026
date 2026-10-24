-- Fix the Custom Access Token Hook from 003.
--
-- The hook payload is { user_id, claims, authentication_method }; there is no
-- "user" key, so 003 read a null email and rejected every sign-in once the hook
-- was enabled. The email lives in event.claims.email.
--
-- Rejections are returned as a hook error object (HTTP 403 with a readable
-- message) instead of raising, which Auth would surface as a generic 500.
create or replace function public.enforce_sbu_access_token(event jsonb)
returns jsonb
language plpgsql stable
set search_path = ''
as $$
declare
  user_email text;
begin
  user_email := lower(coalesce(event -> 'claims' ->> 'email', ''));
  if user_email !~ '^[^@[:space:]]+@stonybrook\.edu$' then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'Only @stonybrook.edu accounts can sign in'
      )
    );
  end if;

  return jsonb_build_object('claims', event -> 'claims');
end;
$$;

revoke all on function public.enforce_sbu_access_token(jsonb) from public, anon, authenticated;
grant execute on function public.enforce_sbu_access_token(jsonb) to supabase_auth_admin;
