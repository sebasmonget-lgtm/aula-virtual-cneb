begin;

-- Reference data is shared, but writes remain restricted to the migration role.
alter table public.curriculum_source_documents enable row level security;
alter table public.cycles enable row level security;
alter table public.transversal_approaches enable row level security;
create policy curriculum_source_documents_read on public.curriculum_source_documents for select to authenticated using (true);
create policy cycles_read on public.cycles for select to authenticated using (true);
create policy transversal_approaches_read on public.transversal_approaches for select to authenticated using (true);

-- Annual planning tables predate this security pass and held private classroom data.
alter table public.annual_plans enable row level security;
alter table public.annual_plan_competencies enable row level security;
alter table public.annual_plan_changes enable row level security;
create policy annual_plans_own on public.annual_plans for all to authenticated
  using (public.owns_classroom(classroom_id))
  with check (public.owns_classroom(classroom_id) and public.owns_school_year(school_year_id));
create policy annual_plan_competencies_own on public.annual_plan_competencies for all to authenticated
  using (exists (select 1 from public.annual_plans p where p.id = plan_id and public.owns_classroom(p.classroom_id)))
  with check (exists (select 1 from public.annual_plans p where p.id = plan_id and public.owns_classroom(p.classroom_id)));
create policy annual_plan_changes_own on public.annual_plan_changes for all to authenticated
  using (exists (select 1 from public.annual_plans p where p.id = plan_id and public.owns_classroom(p.classroom_id)))
  with check (exists (select 1 from public.annual_plans p where p.id = plan_id and public.owns_classroom(p.classroom_id)));

-- A pupil, activity and criterion must belong to the same classroom chain.
drop policy if exists evidences_own_all on public.evidences;
create policy evidences_own_all on public.evidences for all to authenticated
  using (public.owns_student(student_id))
  with check (created_by = auth.uid() and public.owns_student(student_id)
    and (activity_id is null or exists (
      select 1 from public.students s
      join public.learning_experiences le on le.classroom_id = s.classroom_id
      join public.activities a on a.experience_id = le.id
      where s.id = public.evidences.student_id and a.id = public.evidences.activity_id and public.owns_activity(a.id)))
    and (criterion_id is null or exists (
      select 1 from public.activity_criteria ac where ac.id = public.evidences.criterion_id and ac.activity_id = public.evidences.activity_id)));

-- Object names follow <teacher-uuid>/<student-uuid>/<opaque-filename>.
-- Ownership must hold for both folders, so a teacher cannot attach a file to another pupil.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('student-evidence', 'student-evidence', false, 3000000,
  array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy student_evidence_read_own on storage.objects for select to authenticated
  using (bucket_id = 'student-evidence' and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.students s where s.id::text = (storage.foldername(name))[2]
      and public.owns_student(s.id)));
create policy student_evidence_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'student-evidence' and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.students s where s.id::text = (storage.foldername(name))[2]
      and public.owns_student(s.id)));
create policy student_evidence_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'student-evidence' and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.students s where s.id::text = (storage.foldername(name))[2]
      and public.owns_student(s.id)));

commit;
