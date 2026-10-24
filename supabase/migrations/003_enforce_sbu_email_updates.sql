create or replace function public.enforce_sbu_email()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.email is null or new.email !~* '^[^@[:space:]]+@stonybrook\.edu$' then
    raise exception 'Only @stonybrook.edu emails are allowed';
  end if;
  return new;
end;
$$;

drop trigger if exists sbu_email_check on auth.users;

create trigger sbu_email_check before insert on auth.users
for each row execute function public.enforce_sbu_email();

drop trigger if exists sbu_email_update_check on auth.users;
create trigger sbu_email_update_check before update of email on auth.users
for each row execute function public.enforce_sbu_email();

-- Configure this function as Supabase Auth's Custom Access Token Hook in
-- Dashboard > Authentication > Hooks. The insert trigger alone does not block
-- magic-link sign-in for non-SBU users that already existed before it was added.
create or replace function public.enforce_sbu_access_token(event jsonb)
returns jsonb
language plpgsql stable
set search_path = ''
as $$
declare
  user_email text;
begin
  user_email := lower(coalesce(event -> 'user' ->> 'email', ''));
  if user_email !~ '^[^@[:space:]]+@stonybrook\.edu$' then
    raise exception 'Only @stonybrook.edu accounts can sign in';
  end if;

  return jsonb_build_object('claims', event -> 'claims');
end;
$$;

revoke all on function public.enforce_sbu_access_token(jsonb) from public, anon, authenticated;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.enforce_sbu_access_token(jsonb) to supabase_auth_admin;
