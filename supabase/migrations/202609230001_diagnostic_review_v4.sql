begin;
alter table public.diagnostic_experience_observations
  add column catalog_version text not null default 'diagnostic-v4.1',
  add column experience_title_snapshot text,
  add column aspect_prompt_snapshot text;

create table public.diagnostic_competency_reviews (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  competency_v4_id text not null,
  version integer not null check (version > 0),
  status text not null check (status in ('draft', 'confirmed')),
  details jsonb not null,
  source_snapshot jsonb not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  teacher_confirmed_at timestamptz,
  unique(student_id, competency_v4_id, version)
);
create unique index diagnostic_review_one_draft_idx on public.diagnostic_competency_reviews(student_id, competency_v4_id) where status = 'draft';
create index diagnostic_review_classroom_idx on public.diagnostic_competency_reviews(classroom_id, student_id, competency_v4_id, version desc);

create table public.diagnostic_group_reviews (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  version integer not null check (version > 0),
  status text not null check (status in ('draft', 'confirmed')),
  details jsonb not null,
  source_snapshot jsonb not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  teacher_confirmed_at timestamptz,
  unique(classroom_id, version)
);
create unique index diagnostic_group_one_draft_idx on public.diagnostic_group_reviews(classroom_id) where status = 'draft';

create function public.prevent_confirmed_diagnostic_change() returns trigger language plpgsql as $$
begin
  if old.status = 'confirmed' then raise exception 'Un diagnóstico confirmado es inmutable.'; end if;
  return new;
end;
$$;
create trigger diagnostic_review_immutable before update or delete on public.diagnostic_competency_reviews
  for each row execute function public.prevent_confirmed_diagnostic_change();
create trigger diagnostic_group_immutable before update or delete on public.diagnostic_group_reviews
  for each row execute function public.prevent_confirmed_diagnostic_change();

alter table public.diagnostic_competency_reviews enable row level security;
alter table public.diagnostic_group_reviews enable row level security;
create policy diagnostic_review_read_own on public.diagnostic_competency_reviews for select to authenticated using (
  created_by = (select auth.uid()) and public.owns_classroom(classroom_id)
  and exists (select 1 from public.students s where s.id = student_id and s.classroom_id = classroom_id)
);
create policy diagnostic_review_insert_own on public.diagnostic_competency_reviews for insert to authenticated with check (
  created_by = (select auth.uid()) and public.owns_classroom(classroom_id)
  and exists (select 1 from public.students s where s.id = student_id and s.classroom_id = classroom_id and s.status = 'active')
);
create policy diagnostic_review_update_draft on public.diagnostic_competency_reviews for update to authenticated using (
  status = 'draft' and created_by = (select auth.uid()) and public.owns_classroom(classroom_id)
) with check (created_by = (select auth.uid()) and public.owns_classroom(classroom_id));
create policy diagnostic_group_read_own on public.diagnostic_group_reviews for select to authenticated using (
  created_by = (select auth.uid()) and public.owns_classroom(classroom_id)
);
create policy diagnostic_group_insert_own on public.diagnostic_group_reviews for insert to authenticated with check (
  created_by = (select auth.uid()) and public.owns_classroom(classroom_id)
);
create policy diagnostic_group_update_draft on public.diagnostic_group_reviews for update to authenticated using (
  status = 'draft' and created_by = (select auth.uid()) and public.owns_classroom(classroom_id)
) with check (created_by = (select auth.uid()) and public.owns_classroom(classroom_id));
commit;
