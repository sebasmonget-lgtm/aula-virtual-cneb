begin;
-- No public URL: bytes are served only after student and teacher authorization.
alter table public.students add column profile_photo_path text;
commit;
