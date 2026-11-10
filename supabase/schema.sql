-- riff — Supabase schema
-- Run once in the Supabase SQL Editor of a fresh project.
--
-- Per-account isolation is enforced by RLS alone:
--   * every row is stamped with user_id via a DB default (auth.uid())
--   * every policy requires user_id = auth.uid()
--   * NO admin branch — deliberately absent (see vault rebuild guide §8)

create extension if not exists pgcrypto;

-- ── notes ────────────────────────────────────────────────────────────────
create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title       text not null default 'Untitled note',
  bullets     jsonb not null default '[]'::jsonb,
  source_text text not null default '',
  task_count  int  not null default 0,
  created_at  timestamptz not null default now()
);

-- ── tasks ────────────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  note_id    uuid references public.notes (id) on delete cascade,
  title      text not null,
  done       boolean not null default false,
  priority   text not null default 'normal' check (priority in ('high', 'normal')),
  category   text not null default 'other' check (category in ('work', 'school', 'personal', 'other')),
  due_hint   text not null default '',
  created_at timestamptz not null default now()
);

-- ── messages (chat bookkeeping) ──────────────────────────────────────────
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  note_id    uuid references public.notes (id) on delete set null,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  created_at timestamptz not null default now()
);

-- ── RLS: owner-only, no admin bypass ─────────────────────────────────────
alter table public.notes    enable row level security;
alter table public.tasks    enable row level security;
alter table public.messages enable row level security;

create policy "notes owner select"    on public.notes    for select to authenticated using (user_id = auth.uid());
create policy "notes owner insert"    on public.notes    for insert to authenticated with check (user_id = auth.uid());
create policy "notes owner update"    on public.notes    for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notes owner delete"    on public.notes    for delete to authenticated using (user_id = auth.uid());

create policy "tasks owner select"    on public.tasks    for select to authenticated using (user_id = auth.uid());
create policy "tasks owner insert"    on public.tasks    for insert to authenticated with check (user_id = auth.uid());
create policy "tasks owner update"    on public.tasks    for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "tasks owner delete"    on public.tasks    for delete to authenticated using (user_id = auth.uid());

create policy "messages owner select" on public.messages for select to authenticated using (user_id = auth.uid());
create policy "messages owner insert" on public.messages for insert to authenticated with check (user_id = auth.uid());
create policy "messages owner update" on public.messages for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "messages owner delete" on public.messages for delete to authenticated using (user_id = auth.uid());

-- ── read-performance indexes (owner-scoped recent-first lists) ───────────
create index if not exists notes_user_created_idx    on public.notes    (user_id, created_at desc);
create index if not exists tasks_note_user_idx       on public.tasks    (user_id, created_at desc);
create index if not exists tasks_note_id_idx         on public.tasks    (note_id);
create index if not exists messages_user_created_idx on public.messages (user_id, created_at desc);
