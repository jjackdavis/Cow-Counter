-- Run this in Supabase → SQL Editor

create table sessions (
  id         bigint generated always as identity primary key,
  device_id  text not null,
  name       text not null,
  count      integer not null,
  date       text not null,
  created_at timestamptz default now()
);

alter table sessions enable row level security;

-- Allow anyone to read/write rows that match their device_id
create policy "device scoped access"
  on sessions for all
  using  (true)
  with check (true);
