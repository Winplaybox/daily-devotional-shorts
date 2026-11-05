-- Supabase/PostgreSQL schema for durable YouTube request automation.
create table if not exists public.automation_cursors (
  name text primary key,
  cursor_value text,
  updated_at timestamptz not null default now()
);

create table if not exists public.processed_youtube_comments (
  comment_id text primary key,
  outcome text not null,
  processed_at timestamptz not null default now()
);

create table if not exists public.panchang_requests (
  id bigint generated always as identity primary key,
  request_key text not null unique,
  source text not null,
  source_comment_id text,
  viewer_hash text not null,
  content_type text not null,
  requested_date date not null,
  requested_time time,
  location_name text not null,
  country_code text,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  timezone text not null,
  status text not null default 'queued',
  visibility text not null default 'public' check (visibility = 'public'),
  request_payload jsonb not null default '{}'::jsonb,
  result_video_id text,
  failure_code text,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists panchang_requests_queue_idx
  on public.panchang_requests (status, created_at);
create index if not exists panchang_requests_viewer_idx
  on public.panchang_requests (viewer_hash, created_at desc);

-- Keep this schema server-side only. Do not expose service-role credentials to clients.
-- Configure Supabase RLS and deny anon/authenticated access to all three tables.
