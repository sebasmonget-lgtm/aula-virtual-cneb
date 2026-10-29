begin;
-- Expand only. Existing classrooms remain contract 1; no pedagogical backfill.
alter table classrooms add column age_mode text not null default 'single' check(age_mode in ('single','multi'));
alter table classrooms add column curriculum_contract_version smallint not null default 1 check(curriculum_contract_version in (1,2));
alter table classrooms add column curriculum_revision integer not null default 1 check(curriculum_revision>0);

create table classroom_age_groups (
  id uuid primary key, classroom_id uuid not null references classrooms(id),
  age_grade_id uuid not null references age_grades(id),
  status text not null default 'active' check(status in ('active','archived')),
  unique(classroom_id,age_grade_id)
);
create table classroom_curriculum_versions (
  id uuid primary key, classroom_id uuid not null references classrooms(id),
  revision integer not null check(revision>0), snapshot jsonb not null,
  confirmed_by uuid not null references profiles(user_id), confirmed_at timestamptz not null default now(),
  unique(classroom_id,revision)
);
create table student_curriculum_assignments (
  id uuid primary key, student_id uuid not null references students(id),
  classroom_id uuid not null references classrooms(id), school_year_id uuid not null references school_years(id),
  classroom_group_id uuid not null references classroom_age_groups(id), age_grade_id uuid not null references age_grades(id),
  revision integer not null default 1 check(revision>0),
  status text not null default 'active' check(status in ('active','archived')),
  source text not null check(source in ('teacher_confirmed','legacy_confirmed')),
  confirmed_by uuid not null references profiles(user_id), confirmed_at timestamptz not null default now(),
  reason text, supersedes_assignment_id uuid references student_curriculum_assignments(id),
  unique(student_id,revision)
);
create unique index student_curriculum_assignment_active on student_curriculum_assignments(student_id) where status='active';
create table multi_age_requests (
  teacher_id uuid not null references profiles(user_id), client_request_id uuid not null,
  classroom_id uuid not null references classrooms(id), kind text not null,
  fingerprint text not null, result jsonb not null, created_at timestamptz not null default now(),
  primary key(teacher_id,client_request_id)
);
create table multi_age_preparation_jobs (
  id uuid primary key, classroom_id uuid not null references classrooms(id), teacher_id uuid not null references profiles(user_id),
  source_revision integer not null, input_fingerprint text not null,
  status text not null check(status in ('queued','running','uncertain','failed','succeeded','cancelled')),
  payload jsonb not null, lease_token uuid, lease_until timestamptz,
  created_at timestamptz not null default now(), unique(classroom_id,source_revision,input_fingerprint)
);
create table multi_age_period_jobs (like multi_age_preparation_jobs including defaults including constraints);
alter table multi_age_period_jobs add primary key(id);
alter table multi_age_period_jobs add foreign key(classroom_id) references classrooms(id);
alter table multi_age_period_jobs add foreign key(teacher_id) references profiles(user_id);
create unique index multi_age_period_jobs_source on multi_age_period_jobs(classroom_id,source_revision,input_fingerprint);

alter table activity_criteria add column curriculum_contract_version smallint not null default 1 check(curriculum_contract_version in (1,2));
alter table activity_criteria add column curricular_age smallint;
alter table activity_criteria add column criterion_family_id uuid;
alter table activity_criteria add constraint criterion_curriculum_shape check(
  (curriculum_contract_version=1 and curricular_age is null and criterion_family_id is null)
  or (curriculum_contract_version=2 and curricular_age in (3,4,5) and curricular_age is not null and criterion_family_id is not null)
);
alter table ordinary_observations add column curriculum_assignment_id uuid references student_curriculum_assignments(id);
alter table evidences add column curriculum_assignment_id uuid references student_curriculum_assignments(id);
alter table diagnostic_experience_observations add column curriculum_assignment_id uuid references student_curriculum_assignments(id);

create function protect_multi_age_snapshot() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if tg_op='DELETE' then raise exception 'La historia curricular es inmutable.'; end if;
  if tg_table_name='student_curriculum_assignments' and to_jsonb(old)->>'status'='active' and to_jsonb(new)->>'status'='archived'
    and to_jsonb(new)-'status'=to_jsonb(old)-'status' then return new; end if;
  raise exception 'La historia curricular es inmutable.';
end $$;
create trigger curriculum_version_immutable before update or delete on classroom_curriculum_versions
  for each row execute function protect_multi_age_snapshot();
create trigger curriculum_assignment_immutable before update or delete on student_curriculum_assignments
  for each row execute function protect_multi_age_snapshot();

create function validate_student_curriculum_assignment() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if not exists(select 1 from students s join classrooms c on c.id=s.classroom_id
    join classroom_age_groups g on g.classroom_id=c.id
    join age_grades ag on ag.id=g.age_grade_id join levels l on l.id=ag.level_id
    where s.id=new.student_id and c.id=new.classroom_id and c.school_year_id=new.school_year_id
      and c.teacher_id=new.confirmed_by and c.curriculum_contract_version=2 and g.id=new.classroom_group_id
      and g.age_grade_id=new.age_grade_id and g.status='active' and ag.age_years in (3,4,5)
      and l.name='Educación Inicial') then
    raise exception 'La matrícula curricular no corresponde al niño, aula, año o docente.';
  end if;
  return new;
end $$;
create trigger student_curriculum_assignment_tree before insert on student_curriculum_assignments
  for each row execute function validate_student_curriculum_assignment();

create function validate_observation_curriculum() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare source jsonb:=to_jsonb(new); owner_class uuid; contract smallint; assignment uuid;
  student uuid; criterion uuid; assigned_age integer; owner_teacher uuid;
begin
  if tg_op='UPDATE' then
    if source->'curriculum_assignment_id' is distinct from to_jsonb(old)->'curriculum_assignment_id' then
      raise exception 'La asignación curricular capturada es inmutable.';
    end if;
    if to_jsonb(old)->>'curriculum_assignment_id' is not null and (source->'student_id' is distinct from to_jsonb(old)->'student_id' or source->'activity_id' is distinct from to_jsonb(old)->'activity_id' or source->'criterion_id' is distinct from to_jsonb(old)->'criterion_id') then raise exception 'La corrección curricular requiere revisión versionada.'; end if;
    return new;
  end if;
  student:=(source->>'student_id')::uuid;
  select c.id,c.curriculum_contract_version,c.teacher_id into owner_class,contract,owner_teacher
    from students s join classrooms c on c.id=s.classroom_id where s.id=student;
  assignment:=(source->>'curriculum_assignment_id')::uuid;
  if contract=2 and (source->>'created_by')::uuid is distinct from owner_teacher then raise exception 'La observación no corresponde a la docente.'; end if;
  if contract=1 then
    if assignment is not null then raise exception 'El registro histórico conserva su contrato.'; end if;
    return new;
  end if;
  select ag.age_years into assigned_age from student_curriculum_assignments a
    join age_grades ag on ag.id=a.age_grade_id
    where a.id=assignment and a.student_id=student and a.classroom_id=owner_class and a.status='active';
  if assigned_age is null then raise exception 'Falta la matrícula curricular confirmada del niño.'; end if;
  if source->>'classroom_id' is not null and (source->>'classroom_id')::uuid<>owner_class then
    raise exception 'La observación no pertenece al aula del niño.';
  end if;
  criterion:=coalesce(source->>'captured_criterion_id',source->>'criterion_id')::uuid;
  if criterion is not null and not exists(select 1 from activity_criteria ac
    join activities act on act.id=ac.activity_id join learning_experiences e on e.id=act.experience_id
    where ac.id=criterion and ac.curriculum_contract_version=2 and ac.curricular_age=assigned_age
      and ac.activity_id=(source->>'activity_id')::uuid and e.classroom_id=owner_class and ac.status='active') then
    raise exception 'El criterio no corresponde a la edad y actividad del niño.';
  end if;
  return new;
end $$;
create trigger ordinary_curriculum_tree before insert or update on ordinary_observations
  for each row execute function validate_observation_curriculum();
create trigger evidence_curriculum_tree before insert or update on evidences
  for each row execute function validate_observation_curriculum();
create trigger diagnostic_curriculum_tree before insert or update on diagnostic_experience_observations
  for each row execute function validate_observation_curriculum();


create function validate_multi_age_classroom_tree() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare source jsonb:=to_jsonb(new); owner uuid; actual_ages jsonb;
begin
  select teacher_id into owner from classrooms where id=new.classroom_id and curriculum_contract_version=2;
  if owner is null then raise exception 'La configuración requiere una aula con contrato curricular 2.'; end if;
  if tg_table_name='classroom_age_groups' then
    if not exists(select 1 from age_grades where id=new.age_grade_id and age_years in (3,4,5)
      and level_id='20000000-0000-4000-8000-000000000001') then raise exception 'El grupo debe pertenecer a Inicial de 3, 4 o 5 años.'; end if;
  elsif tg_table_name='classroom_curriculum_versions' then
    if new.confirmed_by<>owner then raise exception 'La configuración no corresponde a la docente.'; end if;
    select jsonb_agg(ag.age_years order by ag.age_years) into actual_ages from classroom_age_groups g
      join age_grades ag on ag.id=g.age_grade_id where g.classroom_id=new.classroom_id and g.status='active';
    if actual_ages is distinct from new.snapshot->'ages' then raise exception 'La versión debe conservar los grupos confirmados.'; end if;
  elsif (source->>'teacher_id')::uuid<>owner then raise exception 'La solicitud no corresponde a la docente.';
  end if;
  return new;
end $$;
create trigger classroom_group_tree before insert on classroom_age_groups for each row execute function validate_multi_age_classroom_tree();
create trigger classroom_version_tree before insert on classroom_curriculum_versions for each row execute function validate_multi_age_classroom_tree();
create trigger multi_age_request_tree before insert on multi_age_requests for each row execute function validate_multi_age_classroom_tree();
create trigger multi_age_preparation_job_tree before insert on multi_age_preparation_jobs for each row execute function validate_multi_age_classroom_tree();
create trigger multi_age_period_job_tree before insert on multi_age_period_jobs for each row execute function validate_multi_age_classroom_tree();
create function protect_multi_age_group() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin raise exception 'El grupo curricular se conserva; su revisión requiere el flujo versionado.'; end $$;
create trigger classroom_group_history before update or delete on classroom_age_groups for each row execute function protect_multi_age_group();

create function validate_multi_age_evaluation_tree() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare contract integer; snapshot jsonb:=new.details->'curriculum_snapshot'; assigned_age integer; assigned_revision integer;
begin
 select c.curriculum_contract_version into contract from students s join classrooms c on c.id=s.classroom_id where s.id=new.student_id;
 if contract=1 then return new; end if;
 select ag.age_years,a.revision into assigned_age,assigned_revision from student_curriculum_assignments a join age_grades ag on ag.id=a.age_grade_id
   where a.id=(snapshot->>'assignment_id')::uuid and a.student_id=new.student_id and a.status='active';
 if assigned_age is null or (snapshot->>'age')::int is distinct from assigned_age or (snapshot->>'assignment_revision')::int is distinct from assigned_revision
   then raise exception 'La evaluación requiere el contexto curricular vigente del niño.'; end if;
 return new;
end $$;
create trigger multi_age_assessment_tree before insert on competency_assessments for each row execute function validate_multi_age_evaluation_tree();
create trigger multi_age_conclusion_tree before insert on competency_descriptive_conclusions for each row execute function validate_multi_age_evaluation_tree();
create trigger multi_age_family_tree before insert on family_reports for each row execute function validate_multi_age_evaluation_tree();

alter table public.classroom_age_groups enable row level security;
create policy classroom_age_groups_own_read on public.classroom_age_groups for select to authenticated using (private.owns_classroom(classroom_id));
revoke all on public.classroom_age_groups from public,anon,authenticated;
grant select on public.classroom_age_groups to authenticated;
alter table public.classroom_curriculum_versions enable row level security;
create policy classroom_curriculum_versions_own_read on public.classroom_curriculum_versions for select to authenticated using (private.owns_classroom(classroom_id));
revoke all on public.classroom_curriculum_versions from public,anon,authenticated;
grant select on public.classroom_curriculum_versions to authenticated;
alter table public.student_curriculum_assignments enable row level security;
create policy student_curriculum_assignments_own_read on public.student_curriculum_assignments for select to authenticated using (private.owns_classroom(classroom_id));
revoke all on public.student_curriculum_assignments from public,anon,authenticated;
grant select on public.student_curriculum_assignments to authenticated;
alter table public.multi_age_requests enable row level security;
create policy multi_age_requests_own_read on public.multi_age_requests for select to authenticated using (private.owns_classroom(classroom_id));
revoke all on public.multi_age_requests from public,anon,authenticated;
grant select on public.multi_age_requests to authenticated;
alter table public.multi_age_preparation_jobs enable row level security;
create policy multi_age_preparation_jobs_own_read on public.multi_age_preparation_jobs for select to authenticated using (private.owns_classroom(classroom_id));
revoke all on public.multi_age_preparation_jobs from public,anon,authenticated;
grant select on public.multi_age_preparation_jobs to authenticated;
alter table public.multi_age_period_jobs enable row level security;
create policy multi_age_period_jobs_own_read on public.multi_age_period_jobs for select to authenticated using (private.owns_classroom(classroom_id));
revoke all on public.multi_age_period_jobs from public,anon,authenticated;
grant select on public.multi_age_period_jobs to authenticated;
commit;
