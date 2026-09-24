begin;
create table public.diagnostic_student_reviews (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  version integer not null check (version > 0),
  status text not null check (status in ('draft', 'confirmed')),
  details jsonb not null,
  source_snapshot jsonb not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  teacher_confirmed_at timestamptz,
  unique(student_id, version)
);
create unique index diagnostic_student_review_one_draft_idx
  on public.diagnostic_student_reviews(student_id) where status = 'draft';
create index diagnostic_student_review_classroom_idx
  on public.diagnostic_student_reviews(classroom_id, student_id, version desc);
create trigger diagnostic_student_review_immutable before update or delete on public.diagnostic_student_reviews
  for each row execute function public.prevent_confirmed_diagnostic_change();

alter table public.diagnostic_student_reviews enable row level security;
create policy diagnostic_student_review_read_own on public.diagnostic_student_reviews
  for select to authenticated using (
    created_by = (select auth.uid()) and public.owns_classroom(classroom_id)
    and exists (select 1 from public.students s where s.id = student_id and s.classroom_id = classroom_id)
  );
revoke insert, update, delete on public.diagnostic_student_reviews from authenticated;
commit;
