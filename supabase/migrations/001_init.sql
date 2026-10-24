-- ========== SBU-only email ==========
create or replace function public.enforce_sbu_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email is null or new.email !~* '@stonybrook\.edu$' then
    raise exception 'Only @stonybrook.edu emails are allowed';
  end if;
  return new;
end; $$;

create trigger sbu_email_check before insert on auth.users
for each row execute function public.enforce_sbu_email();

-- ========== Tables ==========
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  interests text[] default '{}',
  default_energy text check (default_energy in ('low','medium','high')) default 'medium',
  created_at timestamptz default now()
);

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending','accepted')) default 'pending',
  created_at timestamptz default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create table public.busy_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  label text,
  source text check (source in ('import','manual','work','commute')) default 'manual',
  created_at timestamptz default now()
);

create table public.statuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  mood text check (mood in ('down_for_anything','staying_in','low_budget','specific')) default 'down_for_anything',
  budget text check (budget in ('free','low','medium','high')),
  energy text check (energy in ('low','medium','high')),
  note text,
  created_at timestamptz default now(),
  check (end_at > start_at)
);

create table public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null, category text,
  cost_min numeric, cost_max numeric, duration_min int,
  best_for text, photo_url text, address text
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  start_at timestamptz not null, end_at timestamptz,
  place text, est_cost text, notes text,
  suggestion_json jsonb,
  invite_token uuid not null default gen_random_uuid(),
  created_at timestamptz default now()
);

create table public.event_participants (
  event_id uuid references public.events(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  rsvp text not null check (rsvp in ('pending','going','not_going')) default 'pending',
  primary key (event_id, user_id)
);

create index on public.statuses (end_at);
create index on public.busy_blocks (user_id);

-- ========== Auto-create profile ==========
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ========== Helper functions ==========
create or replace function public.are_friends(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.friendships
    where status = 'accepted'
      and ((requester_id = a and addressee_id = b) or (requester_id = b and addressee_id = a)));
$$;

create or replace function public.is_event_member(eid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.event_participants where event_id = eid and user_id = auth.uid())
      or exists (select 1 from public.events where id = eid and leader_id = auth.uid());
$$;

create or replace function public.get_friend_busy(friend uuid)
returns table (day_of_week smallint, start_time time, end_time time)
language sql stable security definer set search_path = '' as $$
  select b.day_of_week, b.start_time, b.end_time from public.busy_blocks b
  where b.user_id = friend and (friend = auth.uid() or public.are_friends(auth.uid(), friend));
$$;

create or replace function public.get_event_by_token(tok uuid)
returns table (id uuid, title text, start_at timestamptz, place text, est_cost text)
language sql stable security definer set search_path = '' as $$
  select e.id, e.title, e.start_at, e.place, e.est_cost from public.events e where e.invite_token = tok;
$$;

create or replace function public.join_event_by_token(tok uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare eid uuid;
begin
  select id into eid from public.events where invite_token = tok;
  if eid is null then raise exception 'Invalid invite'; end if;
  insert into public.event_participants (event_id, user_id) values (eid, auth.uid())
  on conflict do nothing;
  return eid;
end; $$;

-- ========== Row Level Security ==========
alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.busy_blocks enable row level security;
alter table public.statuses enable row level security;
alter table public.places enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;

create policy "profiles read" on public.profiles for select to authenticated using (true);
create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid());

create policy "friendships read" on public.friendships for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy "friendships request" on public.friendships for insert to authenticated
  with check (requester_id = auth.uid() and status = 'pending');
create policy "friendships accept" on public.friendships for update to authenticated
  using (addressee_id = auth.uid()) with check (addressee_id = auth.uid());
create policy "friendships delete" on public.friendships for delete to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "busy own" on public.busy_blocks for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "status read" on public.statuses for select to authenticated
  using (user_id = auth.uid() or (end_at > now() and public.are_friends(auth.uid(), user_id)));
create policy "status insert" on public.statuses for insert to authenticated with check (user_id = auth.uid());
create policy "status update" on public.statuses for update to authenticated using (user_id = auth.uid());
create policy "status delete" on public.statuses for delete to authenticated using (user_id = auth.uid());

create policy "places read" on public.places for select to authenticated using (true);

create policy "events read" on public.events for select to authenticated
  using (leader_id = auth.uid() or public.is_event_member(id));
create policy "events create" on public.events for insert to authenticated with check (leader_id = auth.uid());
create policy "events update" on public.events for update to authenticated using (leader_id = auth.uid());
create policy "events delete" on public.events for delete to authenticated using (leader_id = auth.uid());

create policy "participants read" on public.event_participants for select to authenticated
  using (public.is_event_member(event_id));
create policy "leader adds participants" on public.event_participants for insert to authenticated
  with check (exists (select 1 from public.events e where e.id = event_id and e.leader_id = auth.uid()));
create policy "rsvp own" on public.event_participants for update to authenticated using (user_id = auth.uid());

-- ========== Realtime ==========
alter publication supabase_realtime add table public.statuses;
alter publication supabase_realtime add table public.event_participants;

-- ========== Starter places (edit with real spots and prices) ==========
insert into public.places (name, category, cost_min, cost_max, duration_min, best_for, address) values
('Stony Brook Village Center','explore',0,0,105,'a casual outing','Main St, Stony Brook, NY'),
('Pickleball at the Recreation Center','active',5,15,90,'an active group hangout','Stony Brook University'),
('Local cafe near campus','food',8,15,75,'a relaxed catch-up','Stony Brook, NY');
