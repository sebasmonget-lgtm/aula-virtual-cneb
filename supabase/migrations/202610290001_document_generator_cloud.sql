begin;
create table document_generator_worker_state (
 teacher_id uuid primary key references profiles(user_id),lease_token uuid not null,lease_until timestamptz not null
);
create table document_generator_dispatch_receipts (
 nonce uuid primary key,teacher_id uuid not null references profiles(user_id),accepted_at timestamptz not null default now()
);
create function guard_ayni_product_mode() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare previous text:=old.preferences->>'ayni_product_mode'; chosen text:=new.preferences->>'ayni_product_mode';
begin
 if chosen is not null and chosen not in ('daily','documents') then raise exception 'Modalidad de Ayni inválida.' using errcode='23514';end if;
 if previous is not null and chosen is distinct from previous then raise exception 'La modalidad de esta cuenta se conserva.' using errcode='23514';end if;
 if previous is null and chosen='documents' and exists(select 1 from classrooms where teacher_id=new.user_id) then raise exception 'No se convierte una cuenta con aula existente.' using errcode='23514';end if;
 return new;
end $$;
create trigger profiles_product_mode_guard before update of preferences on profiles for each row execute function guard_ayni_product_mode();

-- A backend-only role preserves RLS and passes existing server-write guards.
-- Authenticated browser sessions are NOT members of this role.
create role ayni_document_server nologin inherit nobypassrls;
grant authenticated to ayni_document_server;
do $$begin execute format('grant ayni_document_server to %I',current_user);end $$;
grant usage on schema public,private,auth to ayni_document_server;
create function private.document_generator_teacher() returns boolean language sql stable set search_path=public,pg_temp as $$
 select exists(select 1 from profiles where user_id=auth.uid() and preferences->>'ayni_product_mode'='documents')
$$;
revoke all on function private.document_generator_teacher() from public,anon,authenticated;
grant execute on function private.document_generator_teacher() to ayni_document_server;

alter table document_generator_worker_state enable row level security;
alter table document_generator_dispatch_receipts enable row level security;
revoke all on document_generator_worker_state,document_generator_dispatch_receipts from public,anon,authenticated;
create policy document_worker_tenant on document_generator_worker_state for all to ayni_document_server
 using(teacher_id=auth.uid() and private.document_generator_teacher()) with check(teacher_id=auth.uid() and private.document_generator_teacher());
grant select,insert,update,delete on document_generator_worker_state to ayni_document_server;

-- Read access is granted only to tables already protected by RLS. Existing
-- owner policies apply through membership in authenticated, never BYPASSRLS.
do $$declare r record;begin
 for r in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity loop
  if r.relname<>'document_generator_dispatch_receipts' then execute format('grant select on public.%I to ayni_document_server',r.relname);end if;
 end loop;
end $$;
grant insert,update on profiles,school_years,classrooms,students,institution_profiles,institution_assets,evaluation_periods,annual_plans,annual_plan_formal_content,annual_plan_competencies,learning_experiences,activities,activity_criteria to ayni_document_server;

create policy document_server_write on profiles for all to ayni_document_server using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy document_server_write on school_years for all to ayni_document_server using(owner_id=auth.uid() and private.document_generator_teacher()) with check(owner_id=auth.uid() and private.document_generator_teacher());
create policy document_server_write on classrooms for all to ayni_document_server using(teacher_id=auth.uid() and private.owns_school_year(school_year_id) and private.document_generator_teacher() and curriculum_contract_version=2) with check(teacher_id=auth.uid() and private.owns_school_year(school_year_id) and private.document_generator_teacher() and curriculum_contract_version=2);
create policy document_server_write on students for all to ayni_document_server using(private.owns_classroom(classroom_id) and private.document_generator_teacher()) with check(private.owns_classroom(classroom_id) and private.document_generator_teacher());
create policy document_server_write on institution_profiles for all to ayni_document_server using(owner_user_id=auth.uid() and private.document_generator_teacher()) with check(owner_user_id=auth.uid() and private.document_generator_teacher());
create policy document_server_write on institution_assets for all to ayni_document_server using(owner_user_id=auth.uid() and private.document_generator_teacher()) with check(owner_user_id=auth.uid() and private.document_generator_teacher());
create policy document_server_write on evaluation_periods for all to ayni_document_server using(private.owns_school_year(school_year_id) and private.document_generator_teacher()) with check(private.owns_school_year(school_year_id) and private.document_generator_teacher());
create policy document_server_write on annual_plans for all to ayni_document_server using(private.owns_classroom(classroom_id) and private.owns_school_year(school_year_id) and private.document_generator_teacher()) with check(private.owns_classroom(classroom_id) and private.owns_school_year(school_year_id) and private.document_generator_teacher());
create policy document_server_write on annual_plan_competencies for all to ayni_document_server using(exists(select 1 from annual_plans p where p.id=plan_id and private.owns_classroom(p.classroom_id)) and private.document_generator_teacher()) with check(exists(select 1 from annual_plans p where p.id=plan_id and private.owns_classroom(p.classroom_id)) and private.document_generator_teacher());
create policy document_server_write on annual_plan_formal_content for all to ayni_document_server using(exists(select 1 from annual_plans p where p.id=annual_plan_id and private.owns_classroom(p.classroom_id)) and private.document_generator_teacher()) with check(exists(select 1 from annual_plans p where p.id=annual_plan_id and private.owns_classroom(p.classroom_id)) and private.document_generator_teacher());
create policy document_server_write on learning_experiences for all to ayni_document_server using(private.owns_classroom(classroom_id) and private.document_generator_teacher()) with check(private.owns_classroom(classroom_id) and private.document_generator_teacher());
create policy document_server_write on activities for all to ayni_document_server using(private.owns_experience(experience_id) and private.document_generator_teacher()) with check(private.owns_experience(experience_id) and private.document_generator_teacher());
create policy document_server_write on activity_criteria for all to ayni_document_server using(private.owns_activity(activity_id) and private.document_generator_teacher()) with check(private.owns_activity(activity_id) and private.document_generator_teacher());

-- Global official catalog rows are seeded by migration, never by a teacher.
insert into levels(id,name) values('20000000-0000-4000-8000-000000000001','Educación Inicial') on conflict(id) do nothing;
insert into age_grades(id,level_id,label,age_years) values
 ('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000001','3 años',3),
 ('30000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000001','4 años',4),
 ('30000000-0000-4000-8000-000000000005','20000000-0000-4000-8000-000000000001','5 años',5)
 on conflict(level_id,age_years) do nothing;
create policy document_server_write on classroom_age_groups for all to ayni_document_server using(private.document_generator_teacher() and private.owns_classroom(classroom_id)) with check(private.document_generator_teacher() and private.owns_classroom(classroom_id));
grant insert,update on classroom_age_groups to ayni_document_server;
create policy document_server_write on classroom_curriculum_versions for all to ayni_document_server using(private.document_generator_teacher() and private.owns_classroom(classroom_id) and confirmed_by=auth.uid()) with check(private.document_generator_teacher() and private.owns_classroom(classroom_id) and confirmed_by=auth.uid());
grant insert,update on classroom_curriculum_versions to ayni_document_server;
create policy document_server_write on multi_age_requests for all to ayni_document_server using(private.document_generator_teacher() and private.owns_classroom(classroom_id) and teacher_id=auth.uid()) with check(private.document_generator_teacher() and private.owns_classroom(classroom_id) and teacher_id=auth.uid());
grant insert,update on multi_age_requests to ayni_document_server;
create policy document_server_write on multi_age_planning_decisions for all to ayni_document_server using(private.document_generator_teacher() and private.owns_classroom(classroom_id)) with check(private.document_generator_teacher() and private.owns_classroom(classroom_id));
grant insert,update on multi_age_planning_decisions to ayni_document_server;
create policy document_server_write on multi_age_calendars for all to ayni_document_server using(private.document_generator_teacher() and private.owns_classroom(classroom_id)) with check(private.document_generator_teacher() and private.owns_classroom(classroom_id));
grant insert,update on multi_age_calendars to ayni_document_server;
create policy document_server_write on multi_age_project_versions for all to ayni_document_server using(private.document_generator_teacher() and private.owns_classroom(classroom_id)) with check(private.document_generator_teacher() and private.owns_classroom(classroom_id));
grant insert,update on multi_age_project_versions to ayni_document_server;
create policy document_server_write on multi_age_annual_project_links for all to ayni_document_server using(private.document_generator_teacher() and private.owns_classroom(classroom_id)) with check(private.document_generator_teacher() and private.owns_classroom(classroom_id));
grant insert,update on multi_age_annual_project_links to ayni_document_server;
create policy document_server_write on multi_age_correction_events for all to ayni_document_server using(private.document_generator_teacher() and private.owns_classroom(classroom_id)) with check(private.document_generator_teacher() and private.owns_classroom(classroom_id));
grant insert,update on multi_age_correction_events to ayni_document_server;
create policy document_server_write on multi_age_enrollment_dates for all to ayni_document_server using(private.document_generator_teacher() and private.owns_classroom(classroom_id)) with check(private.document_generator_teacher() and private.owns_classroom(classroom_id));
grant insert,update on multi_age_enrollment_dates to ayni_document_server;

create policy document_server_assignment on student_curriculum_assignments for all to ayni_document_server
 using(private.document_generator_teacher() and private.owns_classroom(classroom_id) and confirmed_by=auth.uid())
 with check(private.document_generator_teacher() and private.owns_classroom(classroom_id) and confirmed_by=auth.uid());
grant insert,update on student_curriculum_assignments to ayni_document_server;
create policy document_server_job on multi_age_generation_jobs for all to ayni_document_server
 using(private.document_generator_teacher() and teacher_id=auth.uid() and private.owns_classroom(classroom_id))
 with check(private.document_generator_teacher() and teacher_id=auth.uid() and private.owns_classroom(classroom_id));
grant insert,update on multi_age_generation_jobs to ayni_document_server;
create policy document_server_checkpoint on multi_age_generation_provider_state for all to ayni_document_server
 using(exists(select 1 from multi_age_generation_jobs j where j.id=job_id and j.teacher_id=auth.uid()) and private.document_generator_teacher())
 with check(exists(select 1 from multi_age_generation_jobs j where j.id=job_id and j.teacher_id=auth.uid()) and private.document_generator_teacher());
grant insert,update,delete on multi_age_generation_provider_state to ayni_document_server;
create policy document_server_usage on ai_usage_events for insert to ayni_document_server with check(teacher_id=auth.uid() and private.document_generator_teacher());
grant insert on ai_usage_events to ayni_document_server;
commit;
