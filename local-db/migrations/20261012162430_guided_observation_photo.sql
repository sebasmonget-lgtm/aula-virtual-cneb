begin;
set local lock_timeout = '5s';
alter table public.diagnostic_experience_observations
  add column media_path text,
  add column media_mime_type text,
  add column media_sha256 text,
  add constraint diagnostic_guided_photo_check check (
    (media_path is null and media_mime_type is null and media_sha256 is null) or
    (media_path is not null and media_mime_type is not null and media_sha256 is not null and media_mime_type in ('image/jpeg','image/png','image/webp')
      and media_sha256 ~ '^[0-9a-f]{64}$')
  );
-- Existing ownership/RLS and server-only writes apply to these optional columns.
-- No updates, deletes, new buckets, grants or changes to historical observations.
commit;
