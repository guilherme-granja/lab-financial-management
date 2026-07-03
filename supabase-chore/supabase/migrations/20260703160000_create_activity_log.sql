create table public.activity_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  action     text not null,
  metadata   jsonb,
  created_at timestamptz not null default now()
);

create index activity_log_user_id_idx on public.activity_log(user_id);
create index activity_log_created_at_idx on public.activity_log(created_at);

alter table public.activity_log enable row level security;

create policy "Usuarios inserem a propria atividade"
  on public.activity_log for insert
  with check (auth.uid() = user_id);

create policy "Usuarios veem a propria atividade"
  on public.activity_log for select
  using (auth.uid() = user_id);

create policy "Admins veem toda atividade"
  on public.activity_log for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  ));
