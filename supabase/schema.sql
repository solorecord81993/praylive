-- PrayLive v2: live participants and private per-viewer like progress.
-- The frontend receives room_state through a public SELECT policy.
-- Only the trusted Render bridge uses service-role access for writes.

alter table public.room_state
  drop constraint if exists room_state_character_count_check;

alter table public.room_state
  alter column character_count set default 0,
  add constraint room_state_character_count_check
    check (character_count between 0 and 20);

alter table public.room_state
  drop column if exists subtitle_enabled,
  drop column if exists subtitle_language,
  add column if not exists participants jsonb not null default '[]'::jsonb,
  add column if not exists focus_seat integer,
  add column if not exists connector_status text not null default 'offline',
  add column if not exists tiktok_username text not null default '',
  add column if not exists bridge_url text not null default '',
  add column if not exists live_session_id text not null default '',
  add column if not exists last_event_at bigint;

update public.room_state
set character_count = 0,
    participants = '[]'::jsonb,
    focus_seat = null,
    connector_status = 'offline'
where room_id = 'chant-room-01';

create table if not exists public.viewer_like_progress (
  session_id text not null,
  user_id text not null,
  unique_id text not null default '',
  nickname text not null default '',
  avatar_url text not null default '',
  likes integer not null default 0 check (likes >= 0),
  updated_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

alter table public.viewer_like_progress enable row level security;
revoke all on public.viewer_like_progress from anon, authenticated;
grant select on public.room_state to anon, authenticated;

drop policy if exists "authenticated control writes" on public.room_state;

drop policy if exists "room state readable" on public.room_state;
create policy "room state readable"
on public.room_state
for select
to anon, authenticated
using (true);

-- This event-trigger helper only needs to run internally during DDL.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
