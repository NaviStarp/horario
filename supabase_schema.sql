-- ============================================================
-- BASE DE DATOS Y SEGURIDAD SUPABASE: HORARIO & DIARIO PERSONAL
-- ============================================================
-- Ejecuta este script en el Editor SQL de tu proyecto Supabase:
-- https://supabase.com/dashboard/project/_/sql

-- 1. EXTENSIONES
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLA 1: schedule_blocks (Plantilla de horario)
-- ============================================================
create table if not exists public.schedule_blocks (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
    day_group text not null default 'weekdays', -- 'weekdays', 'weekend', 'all', o día específico
    start_time time not null,                  -- ej: '10:30:00'
    end_time time not null,                    -- ej: '11:00:00'
    title text not null,                       -- ej: 'Despertar y desayunar'
    category text not null default 'rutina',   -- 'estudio', 'entreno', 'ocio', 'rutina', 'trabajo'
    sort_order integer not null default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Índices de consulta frecuente
create index if not exists idx_schedule_blocks_user on public.schedule_blocks(user_id, day_group, sort_order);

-- ============================================================
-- TABLA 2: daily_logs (Registro diario y Diario personal)
-- ============================================================
create table if not exists public.daily_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
    log_date date not null,                    -- ej: '2026-11-10'
    completed_blocks jsonb not null default '[]'::jsonb, -- array de IDs de schedule_blocks completados
    custom_adjustments jsonb null default '{}'::jsonb,
    diary_content text not null default '',    -- Texto en formato Markdown
    mood text null,                            -- Estado de ánimo ('😊', '🚀', '😴', etc.)
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    constraint unique_user_date unique (user_id, log_date)
);

create index if not exists idx_daily_logs_user_date on public.daily_logs(user_id, log_date);

-- Trigger para actualizar updated_at automáticamente
create or replace function public.set_current_timestamp_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_daily_logs_updated_at on public.daily_logs;
create trigger trigger_daily_logs_updated_at
    before update on public.daily_logs
    for each row
    execute function public.set_current_timestamp_updated_at();

-- ============================================================
-- TABLA 3: quick_notes (Notas rápidas / Inbox)
-- ============================================================
create table if not exists public.quick_notes (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
    content text not null,
    is_pinned boolean not null default false,
    is_archived boolean not null default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_quick_notes_user on public.quick_notes(user_id, is_archived, is_pinned, created_at desc);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - PRIVACIDAD ABSOLUTA
-- ============================================================
-- Activamos RLS en todas las tablas
alter table public.schedule_blocks enable row level security;
alter table public.daily_logs enable row level security;
alter table public.quick_notes enable row level security;

-- Políticas estrictas: auth.uid() = user_id
-- 1. schedule_blocks
drop policy if exists "schedule_blocks_select_policy" on public.schedule_blocks;
create policy "schedule_blocks_select_policy" on public.schedule_blocks
    for select using (auth.uid() = user_id);

drop policy if exists "schedule_blocks_insert_policy" on public.schedule_blocks;
create policy "schedule_blocks_insert_policy" on public.schedule_blocks
    for insert with check (auth.uid() = user_id);

drop policy if exists "schedule_blocks_update_policy" on public.schedule_blocks;
create policy "schedule_blocks_update_policy" on public.schedule_blocks
    for update using (auth.uid() = user_id);

drop policy if exists "schedule_blocks_delete_policy" on public.schedule_blocks;
create policy "schedule_blocks_delete_policy" on public.schedule_blocks
    for delete using (auth.uid() = user_id);

-- 2. daily_logs
drop policy if exists "daily_logs_select_policy" on public.daily_logs;
create policy "daily_logs_select_policy" on public.daily_logs
    for select using (auth.uid() = user_id);

drop policy if exists "daily_logs_insert_policy" on public.daily_logs;
create policy "daily_logs_insert_policy" on public.daily_logs
    for insert with check (auth.uid() = user_id);

drop policy if exists "daily_logs_update_policy" on public.daily_logs;
create policy "daily_logs_update_policy" on public.daily_logs
    for update using (auth.uid() = user_id);

drop policy if exists "daily_logs_delete_policy" on public.daily_logs;
create policy "daily_logs_delete_policy" on public.daily_logs
    for delete using (auth.uid() = user_id);

-- 3. quick_notes
drop policy if exists "quick_notes_select_policy" on public.quick_notes;
create policy "quick_notes_select_policy" on public.quick_notes
    for select using (auth.uid() = user_id);

drop policy if exists "quick_notes_insert_policy" on public.quick_notes;
create policy "quick_notes_insert_policy" on public.quick_notes
    for insert with check (auth.uid() = user_id);

drop policy if exists "quick_notes_update_policy" on public.quick_notes;
create policy "quick_notes_update_policy" on public.quick_notes
    for update using (auth.uid() = user_id);

drop policy if exists "quick_notes_delete_policy" on public.quick_notes;
create policy "quick_notes_delete_policy" on public.quick_notes
    for delete using (auth.uid() = user_id);

-- ============================================================
-- INSTRUCCIONES DE CONFIGURACIÓN DE SEGURIDAD EN SUPABASE:
-- ============================================================
-- 1. Desactivar Registro Público:
--    Panel Supabase -> Authentication -> Configuration -> Sign In / Providers -> Email:
--    Desmarcar la opción "Enable Signups" (Permitir nuevos registros).
--
-- 2. Crear tu usuario administrador:
--    Panel Supabase -> Authentication -> Users -> Click en "Add user" -> "Create user".
--    Ingresa tu correo y una contraseña segura.
--
-- 3. Copiar credenciales a tu archivo .env:
--    Panel Supabase -> Project Settings -> API:
--    - Project URL -> PUBLIC_SUPABASE_URL
--    - anon public key -> PUBLIC_SUPABASE_ANON_KEY
