-- Run once in the Supabase dashboard → SQL Editor → New query → Run.
--
-- One row per gallery collection. The body is kept as JSONB in the shape of
-- the `Collection` type in src/data/gallery.ts, so the admin page, the API and
-- the gallery page all speak the same language and nothing has to be mapped
-- field by field between them.

create table if not exists public.gallery_collections (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  -- Running order on the site. Lower comes first; ties fall back to newest.
  position    integer not null default 0,
  -- Drafts stay invisible to the public pages until this is flipped.
  published   boolean not null default false,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists gallery_collections_order
  on public.gallery_collections (published, position, created_at desc);

-- RLS on with no policies at all: the anon/publishable key can read nothing
-- and write nothing. Every query goes through this app's server routes, which
-- use the service key (which bypasses RLS) behind the admin password. That
-- way a leaked publishable key exposes nothing, including drafts.
alter table public.gallery_collections enable row level security;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists gallery_collections_touch on public.gallery_collections;
create trigger gallery_collections_touch
  before update on public.gallery_collections
  for each row execute function public.touch_updated_at();
