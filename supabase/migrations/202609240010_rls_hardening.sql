begin;

-- Keep policy helpers outside the exposed Data API schema. ALTER SET SCHEMA keeps
-- their OIDs, so existing policy dependencies remain valid until replaced below.
create schema if not exists private;
revoke create on schema public from public, anon, authenticated;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

alter function public.owns_school_year(uuid) set schema private;
alter function public.owns_classroom(uuid) set schema private;
alter function public.owns_student(uuid) set schema private;
alter function public.owns_experience(uuid) set schema private;
alter function public.owns_activity(uuid) set schema private;

alter function private.owns_school_year(uuid) set search_path = '';
alter function private.owns_classroom(uuid) set search_path = '';
alter function private.owns_student(uuid) set search_path = '';
alter function private.owns_experience(uuid) set search_path = '';
alter function private.owns_activity(uuid) set search_path = '';

revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.owns_school_year(uuid), private.owns_classroom(uuid),
  private.owns_student(uuid), private.owns_experience(uuid), private.owns_activity(uuid)
  to authenticated;
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema private revoke execute on functions from public;

-- No teacher or student record is writable through the Data API. The backend
-- validates business rules and uses its server-only database connection.
revoke all on all tables in schema public from anon;
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from authenticated;
revoke all on public.ai_pending_generations from authenticated;
grant select on public.curriculum_versions, public.levels, public.age_grades,
  public.curriculum_areas, public.competencies, public.capacities,
  public.standards, public.performances, public.competency_observation_guides,
  public.document_templates, public.observation_references,
  public.curriculum_source_documents, public.cycles,
  public.transversal_approaches to authenticated;

-- Replace every private-data policy, including older FOR ALL policies. Keeping
-- this inventory explicit makes newly added tables fail closed until reviewed.
do $hardening$
declare item record;
declare old_policy record;
begin
  for item in
    select * from (values
      ('profiles', 'user_id = (select auth.uid())'),
      ('school_years', 'owner_id = (select auth.uid())'),
      ('classrooms', 'teacher_id = (select auth.uid()) and private.owns_school_year(school_year_id)'),
      ('students', 'private.owns_classroom(classroom_id)'),
      ('calendar_events', 'private.owns_school_year(school_year_id)'),
      ('learning_experiences', 'private.owns_classroom(classroom_id)'),
      ('activities', 'private.owns_experience(experience_id)'),
      ('activity_criteria', 'private.owns_activity(activity_id)'),
      ('evidences', 'private.owns_student(student_id) and (activity_id is null or private.owns_activity(activity_id))'),
      ('institution_assets', 'owner_user_id = (select auth.uid())'),
      ('institution_profiles', 'owner_user_id = (select auth.uid())'),
      ('document_versions', 'owner_user_id = (select auth.uid())'),
      ('diagnostic_sessions', 'created_by = (select auth.uid()) and private.owns_classroom(classroom_id)'),
      ('diagnostic_entries', 'private.owns_student(student_id) and exists (select 1 from public.diagnostic_sessions ds join public.students s on s.id = student_id where ds.id = session_id and ds.classroom_id = s.classroom_id and ds.created_by = (select auth.uid()))'),
      ('student_observations', 'author_id = (select auth.uid()) and exists (select 1 from public.diagnostic_entries de join public.diagnostic_sessions ds on ds.id = de.session_id join public.students s on s.id = de.student_id where de.id = diagnostic_entry_id and ds.classroom_id = s.classroom_id and private.owns_classroom(ds.classroom_id))'),
      ('class_schedule_entries', 'private.owns_classroom(classroom_id)'),
      ('daily_execution_logs', 'exists (select 1 from public.class_schedule_entries se where se.id = schedule_entry_id and private.owns_classroom(se.classroom_id))'),
      ('attendance_records', 'private.owns_classroom(classroom_id) and exists (select 1 from public.students s where s.id = student_id and s.classroom_id = classroom_id)'),
      ('calendar_exceptions', 'private.owns_classroom(classroom_id)'),
      ('student_context_snapshots', 'private.owns_student(student_id)'),
      ('annual_plans', 'private.owns_classroom(classroom_id) and private.owns_school_year(school_year_id) and exists (select 1 from public.classrooms c where c.id = classroom_id and c.school_year_id = school_year_id)'),
      ('annual_plan_competencies', 'exists (select 1 from public.annual_plans p where p.id = plan_id and private.owns_classroom(p.classroom_id))'),
      ('annual_plan_changes', 'exists (select 1 from public.annual_plans p where p.id = plan_id and private.owns_classroom(p.classroom_id))'),
      ('competency_assessments', 'private.owns_student(student_id) and (evaluation_period_id is null or exists (select 1 from public.students s join public.classrooms c on c.id = s.classroom_id join public.evaluation_periods p on p.school_year_id = c.school_year_id where s.id = student_id and p.id = evaluation_period_id))'),
      ('competency_descriptive_conclusions', 'private.owns_student(student_id) and (evaluation_period_id is null or exists (select 1 from public.competency_assessments a where a.id = assessment_id and a.student_id = student_id and a.evaluation_period_id = evaluation_period_id))'),
      ('family_reports', 'private.owns_student(student_id) and (evaluation_period_id is null or exists (select 1 from public.students s join public.classrooms c on c.id = s.classroom_id join public.evaluation_periods p on p.school_year_id = c.school_year_id where s.id = student_id and p.id = evaluation_period_id))'),
      ('diagnostic_experience_observations', 'created_by = (select auth.uid()) and private.owns_classroom(classroom_id) and exists (select 1 from public.students s where s.id = student_id and s.classroom_id = classroom_id)'),
      ('diagnostic_competency_reviews', 'created_by = (select auth.uid()) and private.owns_classroom(classroom_id) and exists (select 1 from public.students s where s.id = student_id and s.classroom_id = classroom_id)'),
      ('diagnostic_group_reviews', 'created_by = (select auth.uid()) and private.owns_classroom(classroom_id)'),
      ('student_family_interviews', 'created_by = (select auth.uid()) and private.owns_classroom(classroom_id) and exists (select 1 from public.students s where s.id = student_id and s.classroom_id = classroom_id)'),
      ('student_family_interview_attachments', 'created_by = (select auth.uid()) and private.owns_classroom(classroom_id) and exists (select 1 from public.students s where s.id = student_id and s.classroom_id = classroom_id and exists (select 1 from public.student_family_interviews i where i.id = interview_id and i.student_id = student_id and i.classroom_id = classroom_id))'),
      ('diagnostic_spontaneous_observations', 'created_by = (select auth.uid()) and private.owns_classroom(classroom_id) and exists (select 1 from public.students s where s.id = student_id and s.classroom_id = classroom_id)'),
      ('diagnostic_student_reviews', 'created_by = (select auth.uid()) and private.owns_classroom(classroom_id) and exists (select 1 from public.students s where s.id = student_id and s.classroom_id = classroom_id)'),
      ('calendar_blocks', 'private.owns_school_year(school_year_id)'),
      ('initial_stages', 'private.owns_school_year(school_year_id)'),
      ('project_slots', 'exists (select 1 from public.annual_plans p where p.id = annual_plan_id and private.owns_classroom(p.classroom_id))'),
      ('evaluation_periods', 'private.owns_school_year(school_year_id)'),
      ('period_competency_scope', 'private.owns_classroom(classroom_id) and exists (select 1 from public.evaluation_periods p join public.classrooms c on c.school_year_id = p.school_year_id where p.id = evaluation_period_id and c.id = classroom_id)'),
      ('period_closures', 'private.owns_classroom(classroom_id) and exists (select 1 from public.evaluation_periods p join public.classrooms c on c.school_year_id = p.school_year_id where p.id = evaluation_period_id and c.id = classroom_id)'),
      ('period_closure_versions', 'private.owns_classroom(classroom_id) and exists (select 1 from public.evaluation_periods p join public.classrooms c on c.school_year_id = p.school_year_id where p.id = evaluation_period_id and c.id = classroom_id)')
    ) as scoped(table_name, predicate)
  loop
    for old_policy in select policyname from pg_policies where schemaname = 'public' and tablename = item.table_name loop
      execute format('drop policy %I on public.%I', old_policy.policyname, item.table_name);
    end loop;
    execute format('alter table public.%I enable row level security', item.table_name);
    execute format('create policy teacher_read_own on public.%I for select to authenticated using (%s)', item.table_name, item.predicate);
    execute format('grant select on public.%I to authenticated', item.table_name);
  end loop;
end;
$hardening$;

-- Student media, family attachments and logos are read-only from the client.
-- Upload, replacement and deletion must use the authorized backend.
drop policy if exists student_evidence_insert_own on storage.objects;
drop policy if exists student_evidence_delete_own on storage.objects;
drop policy if exists institution_logos_insert_own on storage.objects;
drop policy if exists institution_logos_update_own on storage.objects;
drop policy if exists institution_logos_delete_own on storage.objects;

commit;
