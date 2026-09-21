begin;

alter table public.institution_profiles add column if not exists institution_code text;
alter table public.institution_profiles add column if not exists district text;
alter table public.institution_profiles add column if not exists ugel text;
alter table public.institution_profiles add column if not exists director_name text;

alter table public.institution_assets drop constraint if exists institution_assets_mime_type_check;
alter table public.institution_assets add constraint institution_assets_mime_type_check
  check (mime_type in ('image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'));

create table public.diagnostic_sessions (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 180),
  status text not null default 'active' check (status in ('active', 'completed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.diagnostic_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.diagnostic_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  competency_id uuid not null references public.competencies(id) on delete restrict,
  guide_id uuid references public.competency_observation_guides(id) on delete set null,
  observation_context text not null check (char_length(observation_context) between 2 and 240),
  observation_text text not null check (char_length(observation_text) between 1 and 4000),
  teacher_interpretation text,
  teacher_confirmed boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'confirmed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(session_id, student_id, competency_id)
);

create index diagnostic_entries_student_idx on public.diagnostic_entries(student_id, updated_at desc);

alter table public.diagnostic_sessions enable row level security;
alter table public.diagnostic_entries enable row level security;

create policy diagnostic_sessions_own_all on public.diagnostic_sessions for all
  using (created_by = auth.uid() and public.owns_classroom(classroom_id))
  with check (created_by = auth.uid() and public.owns_classroom(classroom_id));

create policy diagnostic_entries_own_all on public.diagnostic_entries for all
  using (public.owns_student(student_id) and exists (
    select 1 from public.diagnostic_sessions ds
    where ds.id = session_id and ds.created_by = auth.uid()
  ))
  with check (public.owns_student(student_id) and exists (
    select 1 from public.diagnostic_sessions ds
    where ds.id = session_id and ds.created_by = auth.uid()
  ));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('institution-logos', 'institution-logos', false, 2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

create policy institution_logos_read_own on storage.objects for select to authenticated
  using (bucket_id = 'institution-logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy institution_logos_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'institution-logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy institution_logos_update_own on storage.objects for update to authenticated
  using (bucket_id = 'institution-logos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'institution-logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy institution_logos_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'institution-logos' and (storage.foldername(name))[1] = auth.uid()::text);

commit;
