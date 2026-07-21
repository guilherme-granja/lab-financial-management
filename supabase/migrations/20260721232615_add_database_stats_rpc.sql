create or replace function public.get_database_stats()
returns table (database_size_bytes bigint, storage_size_bytes bigint)
language sql
security definer
set search_path = public
as $$
  select
    pg_database_size(current_database()) as database_size_bytes,
    coalesce((select sum((metadata->>'size')::bigint) from storage.objects), 0) as storage_size_bytes;
$$;

grant execute on function public.get_database_stats() to anon;

create or replace function public.get_last_migration()
returns table (version text, name text, inserted_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select
    version,
    name,
    to_timestamp(version, 'YYYYMMDDHH24MISS') as inserted_at
  from supabase_migrations.schema_migrations
  order by version desc
  limit 1;
$$;

grant execute on function public.get_last_migration() to anon;
