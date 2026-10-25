-- Shared plans: fixes needed for creating plans and joining them by invite link.

-- 1. Let the leader read their own plan directly.
-- is_plan_member() is STABLE, so inside an INSERT ... RETURNING it can't see the
-- row being inserted. The old policy therefore rejected insert().select().
drop policy if exists "plans read leader or invitee" on public.plans;
create policy "plans read leader or invitee" on public.plans for select to authenticated
  using (leader_id = auth.uid() or public.is_plan_member(id));

-- 2. Opening your own invite link must not add the leader as an invitee.
create or replace function public.join_plan_by_token(token uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  plan_uuid uuid;
  plan_leader uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in before joining a plan';
  end if;

  select p.id, p.leader_id into plan_uuid, plan_leader
  from public.plans p
  where p.invite_token = token;

  if plan_uuid is null then
    raise exception 'Invalid invite';
  end if;

  if plan_leader <> auth.uid() then
    insert into public.plan_invitees (plan_id, user_id)
    values (plan_uuid, auth.uid())
    on conflict (plan_id, user_id) do nothing;
  end if;

  return plan_uuid;
end;
$$;

revoke all on function public.join_plan_by_token(uuid) from public, anon;
grant execute on function public.join_plan_by_token(uuid) to authenticated;

-- 3. Names of the people in plans the caller belongs to. Plan members are often
-- not friends, so profiles RLS hides them; this exposes display names only, and
-- only for plans the caller leads or was invited to.
create or replace function public.get_plan_people(plan_ids uuid[])
returns table (plan_id uuid, user_id uuid, display_name text)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.leader_id, pr.display_name
  from public.plans p
  join public.profiles pr on pr.id = p.leader_id
  where p.id = any(plan_ids) and public.is_plan_member(p.id)
  union
  select i.plan_id, i.user_id, pr.display_name
  from public.plan_invitees i
  join public.profiles pr on pr.id = i.user_id
  where i.plan_id = any(plan_ids) and public.is_plan_member(i.plan_id);
$$;

revoke all on function public.get_plan_people(uuid[]) from public, anon;
grant execute on function public.get_plan_people(uuid[]) to authenticated;
