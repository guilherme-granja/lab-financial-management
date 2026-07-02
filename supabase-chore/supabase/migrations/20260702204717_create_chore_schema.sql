-- Extensão necessária para gen_random_uuid()
create extension if not exists pgcrypto;

-- Perfil de cada usuário da plataforma, 1:1 com auth.users do projeto chore
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  name       text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Usuarios veem o proprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Usuarios atualizam o proprio perfil"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Configuracao do banco de dados pessoal de cada usuario
create table public.user_databases (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null unique references public.profiles(id) on delete cascade,
  supabase_url          text not null,
  supabase_anon_key     text not null,
  supabase_project_ref  text,
  status                text not null default 'active' check (status in ('provisioning', 'active', 'paused', 'error')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.user_databases enable row level security;

create policy "Usuarios veem a propria configuracao de banco"
  on public.user_databases for select
  using (auth.uid() = user_id);

-- Nenhuma policy de insert/update/delete para o role authenticated:
-- provisionar banco de usuario e sempre uma acao administrativa,
-- feita via SQL Editor ou service role -- nunca pelo client autenticado.
