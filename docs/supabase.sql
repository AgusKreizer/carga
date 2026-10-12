-- Backup por usuario: una fila con todo el respaldo en JSON. Pegar en Supabase → SQL Editor → Run.
create table if not exists public.user_data (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_data enable row level security;
create policy "leer lo propio"       on public.user_data for select using (auth.uid() = user_id);
create policy "insertar lo propio"   on public.user_data for insert with check (auth.uid() = user_id);
create policy "actualizar lo propio" on public.user_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
