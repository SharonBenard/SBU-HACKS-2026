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
