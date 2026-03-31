-- Run this in Supabase → SQL Editor

create table sessions (
  id         bigint generated always as identity primary key,
  name       text not null,
  count      integer not null,
  date       text not null,
  created_at timestamptz default now()
);

alter table sessions enable row level security;

create policy "public access"
  on sessions for all
  using  (true)
  with check (true);
