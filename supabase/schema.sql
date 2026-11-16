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

-- ---------------------------------------------------------------------------
-- Storage: the "gallery" bucket
--
-- Bucket settings live in the project, not in SQL, so they are recorded here
-- rather than applied by running this file. Set them in Storage → gallery →
-- Configuration, or with the management API:
--
--   file_size_limit:     52428800   (50MB — the plan ceiling; larger is
--                                    rejected with EntityTooLarge)
--   allowed_mime_types:  image/jpeg, image/png, image/webp, image/avif,
--                        audio/mpeg, audio/mp4, audio/aac, audio/x-m4a,
--                        audio/wav, audio/wave, audio/x-wav, audio/vnd.wave,
--                        audio/x-pn-wav, audio/flac, audio/x-flac,
--                        audio/aiff, audio/x-aiff
--
-- The several spellings of WAV are deliberate: browsers disagree about which
-- one a .wav carries, and a type that is not on the list is refused with a
-- 415 the browser only sees as a bare status code. Keep this list in step with
-- EXTENSIONS in src/app/api/admin/upload-url/route.ts.
