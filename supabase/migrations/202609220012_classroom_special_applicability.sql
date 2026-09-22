begin;
alter table public.classrooms add column if not exists castellano_l2_applicable boolean not null default false;
alter table public.classrooms add column if not exists religion_applicable boolean not null default false;
commit;
