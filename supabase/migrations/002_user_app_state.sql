create table public.user_app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.user_app_state enable row level security;

grant select, insert, update, delete on public.user_app_state to authenticated;

create policy "account state read own" on public.user_app_state for select to authenticated
  using (user_id = auth.uid());
create policy "account state insert own" on public.user_app_state for insert to authenticated
  with check (user_id = auth.uid());
create policy "account state update own" on public.user_app_state for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "account state delete own" on public.user_app_state for delete to authenticated
  using (user_id = auth.uid());

-- Relational domain tables used as the shared database contract.
alter table public.profiles
  add column if not exists commuter boolean not null default true,
  add column if not exists town text,
  add column if not exists energy_level text check (energy_level in ('chill', 'social', 'active')),
  add column if not exists energy_date date;

alter table public.busy_blocks
  add column if not exists kind text not null default 'other'
    check (kind in ('class', 'work', 'meeting', 'commute', 'other'));

alter table public.statuses
  add column if not exists mode text not null default 'now' check (mode in ('now', 'later')),
  add column if not exists activity text not null default 'anything'
    check (activity in ('anything', 'food', 'active', 'staying-in', 'low-key')),
  add column if not exists app_budget text not null default 'any'
    check (app_budget in ('free', 'under15', 'under30', 'any')),
  add column if not exists app_energy text not null default 'social'
    check (app_energy in ('chill', 'social', 'active'));

alter table public.events rename to plans;
alter table public.event_participants rename to plan_invitees;
alter table public.plan_invitees rename column event_id to plan_id;
alter table public.plans
  add column if not exists transport text not null default '',
  add column if not exists activity_id text;
create unique index if not exists plans_invite_token_key on public.plans (invite_token);

create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select a = auth.uid() and exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = a and f.addressee_id = b) or (f.requester_id = b and f.addressee_id = a))
  );
$$;

drop policy if exists "profiles read" on public.profiles;
drop policy if exists "friendships accept" on public.friendships;
drop policy if exists "events read" on public.plans;
drop policy if exists "events create" on public.plans;
drop policy if exists "events update" on public.plans;
drop policy if exists "events delete" on public.plans;
drop policy if exists "participants read" on public.plan_invitees;
drop policy if exists "leader adds participants" on public.plan_invitees;
drop policy if exists "rsvp own" on public.plan_invitees;

drop function if exists public.is_event_member(uuid);
drop function if exists public.get_event_by_token(uuid);
drop function if exists public.join_event_by_token(uuid);

create or replace function public.is_plan_member(plan_uuid uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.plans p
    where p.id = plan_uuid and p.leader_id = auth.uid()
  ) or exists (
    select 1 from public.plan_invitees i
    where i.plan_id = plan_uuid and i.user_id = auth.uid()
  );
$$;

create or replace function public.join_plan_by_token(token uuid)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare plan_uuid uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in before joining a plan';
  end if;

  select p.id into plan_uuid
  from public.plans p
  where p.invite_token = token;

  if plan_uuid is null then
    raise exception 'Invalid invite';
  end if;

  insert into public.plan_invitees (plan_id, user_id)
  values (plan_uuid, auth.uid())
  on conflict (plan_id, user_id) do nothing;

  return plan_uuid;
end;
$$;

-- Profiles expose identity only, and only to the owner or an accepted friend.
create policy "profiles read own or friends" on public.profiles for select to authenticated
  using (id = auth.uid() or public.are_friends(auth.uid(), id));
revoke select on public.profiles from anon, authenticated;
grant select (id, display_name) on public.profiles to authenticated;
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name, interests, default_energy, commuter, town, energy_level, energy_date)
  on public.profiles to authenticated;

create policy "friendships accept" on public.friendships for update to authenticated
  using (addressee_id = auth.uid() and status = 'pending')
  with check (addressee_id = auth.uid() and status = 'accepted');
revoke insert, update, delete on public.friendships from anon, authenticated;
grant select, insert, delete on public.friendships to authenticated;
grant update (status) on public.friendships to authenticated;

-- Busy intervals are fetched through get_friend_busy; labels are never exposed by that function.
drop policy if exists "busy own" on public.busy_blocks;
create policy "busy blocks own" on public.busy_blocks for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.busy_blocks to authenticated;
revoke all on function public.get_friend_busy(uuid) from public, anon;
grant execute on function public.get_friend_busy(uuid) to authenticated;

drop policy if exists "status read" on public.statuses;
drop policy if exists "status insert" on public.statuses;
drop policy if exists "status update" on public.statuses;
drop policy if exists "status delete" on public.statuses;
create policy "statuses own or active friends" on public.statuses for select to authenticated
  using (user_id = auth.uid() or (end_at > now() and public.are_friends(auth.uid(), user_id)));
create policy "statuses insert own" on public.statuses for insert to authenticated
  with check (user_id = auth.uid());
create policy "statuses update own" on public.statuses for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "statuses delete own" on public.statuses for delete to authenticated
  using (user_id = auth.uid());
revoke all on public.statuses from anon, authenticated;
grant select, insert, update, delete on public.statuses to authenticated;

revoke all on public.places from anon, authenticated;
grant select on public.places to authenticated;

create policy "plans read leader or invitee" on public.plans for select to authenticated
  using (public.is_plan_member(id));
create policy "plans create own" on public.plans for insert to authenticated
  with check (leader_id = auth.uid());
create policy "plans update leader" on public.plans for update to authenticated
  using (leader_id = auth.uid()) with check (leader_id = auth.uid());
create policy "plans delete leader" on public.plans for delete to authenticated
  using (leader_id = auth.uid());

create policy "plan invitees read members" on public.plan_invitees for select to authenticated
  using (public.is_plan_member(plan_id));
create policy "plan leader manages invitees" on public.plan_invitees for insert to authenticated
  with check (
    exists (select 1 from public.plans p where p.id = plan_id and p.leader_id = auth.uid())
  );
create policy "invitees update own rsvp" on public.plan_invitees for update to authenticated
  using (user_id = auth.uid() and public.is_plan_member(plan_id))
  with check (user_id = auth.uid() and public.is_plan_member(plan_id));
create policy "plan leader removes invitees" on public.plan_invitees for delete to authenticated
  using (
    exists (select 1 from public.plans p where p.id = plan_id and p.leader_id = auth.uid())
  );

revoke all on function public.is_plan_member(uuid) from public, anon;
revoke all on function public.join_plan_by_token(uuid) from public, anon;
revoke all on function public.are_friends(uuid, uuid) from public, anon;
grant execute on function public.is_plan_member(uuid) to authenticated;
grant execute on function public.join_plan_by_token(uuid) to authenticated;
grant execute on function public.are_friends(uuid, uuid) to authenticated;
grant select, insert, update, delete on public.plans, public.plan_invitees to authenticated;
revoke update on public.plan_invitees from authenticated;
grant update (rsvp) on public.plan_invitees to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.plan_invitees;
exception
  when duplicate_object then null;
end;
$$;
