-- Commit 13. Abort on inconsistent existing data; never repair or delete it silently.
do $$ begin
  if exists (select 1 from annual_plans p join classrooms c on c.id=p.classroom_id where c.school_year_id<>p.school_year_id) then
    raise exception 'annual_plans contains a classroom/year mismatch';
  end if;
  if exists (select 1 from learning_experiences e join annual_plans p on p.id=e.annual_plan_id where e.classroom_id<>p.classroom_id) then
    raise exception 'learning_experiences contains a plan/classroom mismatch';
  end if;
  if exists (select 1 from period_closures x join classrooms c on c.id=x.classroom_id join evaluation_periods p on p.id=x.evaluation_period_id where c.school_year_id<>p.school_year_id)
    or exists (select 1 from period_closure_versions x join classrooms c on c.id=x.classroom_id join evaluation_periods p on p.id=x.evaluation_period_id where c.school_year_id<>p.school_year_id)
    or exists (select 1 from period_competency_scope x join classrooms c on c.id=x.classroom_id join evaluation_periods p on p.id=x.evaluation_period_id where c.school_year_id<>p.school_year_id) then
    raise exception 'period records contain a classroom/year mismatch';
  end if;
  if exists (select 1 from competency_assessments a join students s on s.id=a.student_id join classrooms c on c.id=s.classroom_id join evaluation_periods p on p.id=a.evaluation_period_id where c.school_year_id<>p.school_year_id)
    or exists (select 1 from competency_descriptive_conclusions a join students s on s.id=a.student_id join classrooms c on c.id=s.classroom_id join evaluation_periods p on p.id=a.evaluation_period_id where c.school_year_id<>p.school_year_id) then
    raise exception 'evaluations contain a student/period year mismatch';
  end if;
  if exists (select 1 from evidences e join students s on s.id=e.student_id join activities a on a.id=e.activity_id
    join learning_experiences x on x.id=a.experience_id where s.classroom_id<>x.classroom_id)
    or exists (select 1 from evidences e join activity_criteria c on c.id=e.criterion_id where c.activity_id is distinct from e.activity_id) then
    raise exception 'evidences contains a student/activity/criterion mismatch';
  end if;
  if exists (select 1 from period_closures c join period_closure_versions v on v.id=c.current_version_id
    where c.classroom_id<>v.classroom_id or c.evaluation_period_id<>v.evaluation_period_id) then
    raise exception 'a closure points to a version from another period or classroom';
  end if;
  if exists (select 1 from competency_descriptive_conclusions c join competency_assessments a on a.id=c.assessment_id
    where c.student_id<>a.student_id or c.competency_v4_id is distinct from a.competency_v4_id
      or c.evaluation_period_id is distinct from a.evaluation_period_id) then
    raise exception 'a conclusion points to an assessment in another tree';
  end if;
  if exists (select 1 from learning_experiences e join learning_experiences parent on parent.id=e.supersedes_experience_id where e.classroom_id<>parent.classroom_id or e.type<>parent.type)
    or exists (select 1 from activities a join activities parent on parent.id=a.supersedes_activity_id where a.experience_id<>parent.experience_id)
    or exists (select 1 from activity_criteria c join activity_criteria parent on parent.id=c.supersedes_criterion_id where c.activity_id<>parent.activity_id or c.competency_v4_id is distinct from parent.competency_v4_id) then
    raise exception 'a version points to a source in another tree';
  end if;
end $$;

alter table annual_plans add column revision bigint not null default 1;
alter table learning_experiences add column revision bigint not null default 1,
  add column lineage_id uuid default gen_random_uuid(), add column superseded_at timestamptz;
alter table activities add column revision bigint not null default 1,
  add column lineage_id uuid default gen_random_uuid(), add column superseded_at timestamptz;
alter table activity_criteria add column revision bigint not null default 1,
  add column lineage_id uuid default gen_random_uuid(), add column superseded_at timestamptz;
alter table competency_assessments add column revision bigint not null default 1;
alter table period_closures add column revision bigint not null default 1;

-- Backfilling a technical lineage ID does not change the historical content.
alter table learning_experiences disable trigger learning_experience_confirmed_immutable;
alter table activities disable trigger activity_confirmed_immutable;
alter table activity_criteria disable trigger criterion_confirmed_immutable;

do $$ declare total bigint; reached bigint; begin
  with recursive tree as (
    select id,id as root,array[id] as path from learning_experiences where supersedes_experience_id is null
    union all
    select child.id,tree.root,tree.path||child.id from learning_experiences child join tree on child.supersedes_experience_id=tree.id where not child.id=any(tree.path)
  ) select count(distinct id) into reached from tree;
  select count(*) into total from learning_experiences;
  if reached<>total then raise exception 'learning_experiences has a cyclic or unreachable version chain'; end if;
  with recursive tree as (
    select id,id as root,array[id] as path from learning_experiences where supersedes_experience_id is null
    union all
    select child.id,tree.root,tree.path||child.id from learning_experiences child join tree on child.supersedes_experience_id=tree.id where not child.id=any(tree.path)
  ) update learning_experiences e set lineage_id=tree.root from tree where e.id=tree.id;

  with recursive tree as (
    select id,id as root,array[id] as path from activities where supersedes_activity_id is null
    union all
    select child.id,tree.root,tree.path||child.id from activities child join tree on child.supersedes_activity_id=tree.id where not child.id=any(tree.path)
  ) select count(distinct id) into reached from tree;
  select count(*) into total from activities;
  if reached<>total then raise exception 'activities has a cyclic or unreachable version chain'; end if;
  with recursive tree as (
    select id,id as root,array[id] as path from activities where supersedes_activity_id is null
    union all
    select child.id,tree.root,tree.path||child.id from activities child join tree on child.supersedes_activity_id=tree.id where not child.id=any(tree.path)
  ) update activities a set lineage_id=tree.root from tree where a.id=tree.id;

  with recursive tree as (
    select id,id as root,array[id] as path from activity_criteria where supersedes_criterion_id is null
    union all
    select child.id,tree.root,tree.path||child.id from activity_criteria child join tree on child.supersedes_criterion_id=tree.id where not child.id=any(tree.path)
  ) select count(distinct id) into reached from tree;
  select count(*) into total from activity_criteria;
  if reached<>total then raise exception 'activity_criteria has a cyclic or unreachable version chain'; end if;
  with recursive tree as (
    select id,id as root,array[id] as path from activity_criteria where supersedes_criterion_id is null
    union all
    select child.id,tree.root,tree.path||child.id from activity_criteria child join tree on child.supersedes_criterion_id=tree.id where not child.id=any(tree.path)
  ) update activity_criteria c set lineage_id=tree.root from tree where c.id=tree.id;
end $$;

alter table learning_experiences enable trigger learning_experience_confirmed_immutable;
alter table activities enable trigger activity_confirmed_immutable;
alter table activity_criteria enable trigger criterion_confirmed_immutable;

alter table learning_experiences alter column lineage_id set not null;
alter table activities alter column lineage_id set not null;
alter table activity_criteria alter column lineage_id set not null;

do $$ begin
  if exists(select 1 from learning_experiences group by lineage_id,version having count(*)>1)
    or exists(select 1 from learning_experiences where status in ('active','draft') group by lineage_id,status having count(*)>1)
    or exists(select 1 from activities group by lineage_id,version having count(*)>1)
    or exists(select 1 from activities where status in ('active','draft') group by lineage_id,status having count(*)>1)
    or exists(select 1 from activity_criteria group by lineage_id,version having count(*)>1)
    or exists(select 1 from activity_criteria where status in ('active','draft') group by lineage_id,status having count(*)>1) then
    raise exception 'a version lineage has duplicate versions, drafts or active rows';
  end if;
end $$;

create unique index learning_experiences_lineage_version on learning_experiences(lineage_id,version);
create unique index learning_experiences_lineage_active on learning_experiences(lineage_id) where status='active';
create unique index learning_experiences_lineage_draft on learning_experiences(lineage_id) where status='draft';
create unique index activities_lineage_version on activities(lineage_id,version);
create unique index activities_lineage_active on activities(lineage_id) where status='active';
create unique index activities_lineage_draft on activities(lineage_id) where status='draft';
create unique index criteria_lineage_version on activity_criteria(lineage_id,version);
create unique index criteria_lineage_active on activity_criteria(lineage_id) where status='active';
create unique index criteria_lineage_draft on activity_criteria(lineage_id) where status='draft';

alter table classrooms add constraint classrooms_id_year_unique unique(id,school_year_id);
alter table annual_plans add constraint annual_plans_id_classroom_unique unique(id,classroom_id),
  add constraint annual_plans_classroom_year_fk foreign key(classroom_id,school_year_id) references classrooms(id,school_year_id);
alter table learning_experiences add constraint learning_experiences_id_tree_unique unique(id,classroom_id,lineage_id),
  add constraint learning_experiences_plan_classroom_fk foreign key(annual_plan_id,classroom_id) references annual_plans(id,classroom_id),
  add constraint learning_experiences_version_parent_fk foreign key(supersedes_experience_id,classroom_id,lineage_id) references learning_experiences(id,classroom_id,lineage_id);
alter table activities add constraint activities_id_tree_unique unique(id,experience_id,lineage_id),
  add constraint activities_version_parent_fk foreign key(supersedes_activity_id,experience_id,lineage_id) references activities(id,experience_id,lineage_id);
alter table activity_criteria add constraint criteria_id_tree_unique unique(id,activity_id,lineage_id),
  add constraint criteria_version_parent_fk foreign key(supersedes_criterion_id,activity_id,lineage_id) references activity_criteria(id,activity_id,lineage_id);
alter table period_closure_versions add constraint period_closure_versions_tree_unique unique(id,classroom_id,evaluation_period_id);
alter table period_closures add constraint period_closures_current_tree_fk foreign key(current_version_id,classroom_id,evaluation_period_id)
  references period_closure_versions(id,classroom_id,evaluation_period_id);

create or replace function ayni_bump_revision() returns trigger as $$
begin new.revision=old.revision+1; return new; end;
$$ language plpgsql;
create trigger zz_annual_revision before update on annual_plans for each row execute function ayni_bump_revision();
create trigger zz_experience_revision before update on learning_experiences for each row execute function ayni_bump_revision();
create trigger zz_activity_revision before update on activities for each row execute function ayni_bump_revision();
create trigger zz_criterion_revision before update on activity_criteria for each row execute function ayni_bump_revision();
create trigger zz_assessment_revision before update on competency_assessments for each row execute function ayni_bump_revision();
create trigger zz_closure_revision before update on period_closures for each row execute function ayni_bump_revision();

create or replace function prevent_confirmed_learning_experience_change() returns trigger as $$
begin
  if old.status in ('active','archived') then
    if tg_op='DELETE' then raise exception 'Una experiencia confirmada es inmutable.'; end if;
    if old.status='active' and new.status='archived'
       and to_jsonb(new)-'status'-'updated_at'-'superseded_at'=to_jsonb(old)-'status'-'updated_at'-'superseded_at' then return new; end if;
    raise exception 'Una experiencia confirmada es inmutable.';
  end if;
  return new;
end; $$ language plpgsql;
create or replace function prevent_confirmed_activity_change() returns trigger as $$
begin
  if old.status in ('active','archived') then
    if tg_op='DELETE' then raise exception 'Una actividad confirmada es inmutable.'; end if;
    if old.status='active' and new.status='archived'
       and to_jsonb(new)-'status'-'updated_at'-'superseded_at'=to_jsonb(old)-'status'-'updated_at'-'superseded_at' then return new; end if;
    raise exception 'Una actividad confirmada es inmutable.';
  end if;
  return new;
end; $$ language plpgsql;
create or replace function prevent_confirmed_criterion_change() returns trigger as $$
begin
  if old.status in ('active','archived') then
    if tg_op='DELETE' then raise exception 'Un criterio confirmado es inmutable.'; end if;
    if old.status='active' and new.status='archived'
       and to_jsonb(new)-'status'-'updated_at'-'superseded_at'=to_jsonb(old)-'status'-'updated_at'-'superseded_at' then return new; end if;
    raise exception 'Un criterio confirmado es inmutable.';
  end if;
  return new;
end; $$ language plpgsql;

create or replace function ayni_period_tree_guard() returns trigger as $$
begin
  if not exists(select 1 from classrooms c join evaluation_periods p on p.id=new.evaluation_period_id
    where c.id=new.classroom_id and c.school_year_id=p.school_year_id) then
    raise exception 'El período no pertenece al año escolar del aula.' using errcode='23514';
  end if;
  return new;
end; $$ language plpgsql;
create trigger period_scope_tree_guard before insert or update on period_competency_scope for each row execute function ayni_period_tree_guard();
create trigger period_closures_tree_guard before insert or update on period_closures for each row execute function ayni_period_tree_guard();
create trigger period_closure_versions_tree_guard before insert on period_closure_versions for each row execute function ayni_period_tree_guard();

create or replace function ayni_student_period_guard() returns trigger as $$
begin
  if new.evaluation_period_id is not null and not exists(
    select 1 from students s join classrooms c on c.id=s.classroom_id join evaluation_periods p on p.id=new.evaluation_period_id
    where s.id=new.student_id and c.school_year_id=p.school_year_id) then
    raise exception 'El período no pertenece al año escolar del estudiante.' using errcode='23514';
  end if;
  return new;
end; $$ language plpgsql;
create trigger assessment_period_tree_guard before insert or update on competency_assessments for each row execute function ayni_student_period_guard();
create trigger conclusion_period_tree_guard before insert or update on competency_descriptive_conclusions for each row execute function ayni_student_period_guard();

create or replace function ayni_evidence_tree_guard() returns trigger as $$
begin
  if new.activity_id is not null and not exists(
    select 1 from students s join activities a on a.id=new.activity_id
    join learning_experiences x on x.id=a.experience_id
    where s.id=new.student_id and s.classroom_id=x.classroom_id) then
    raise exception 'La actividad no pertenece al aula del estudiante.' using errcode='23514';
  end if;
  if new.criterion_id is not null and not exists(
    select 1 from activity_criteria c where c.id=new.criterion_id and c.activity_id=new.activity_id) then
    raise exception 'El criterio no pertenece a la actividad.' using errcode='23514';
  end if;
  return new;
end; $$ language plpgsql;
create trigger evidences_tree_guard before insert or update on evidences for each row execute function ayni_evidence_tree_guard();

create or replace function ayni_conclusion_source_guard() returns trigger as $$
begin
  if not exists(select 1 from competency_assessments a where a.id=new.assessment_id and a.student_id=new.student_id
    and a.competency_v4_id is not distinct from new.competency_v4_id
    and a.evaluation_period_id is not distinct from new.evaluation_period_id) then
    raise exception 'La conclusión no corresponde a la valoración de este estudiante y período.' using errcode='23514';
  end if;
  return new;
end; $$ language plpgsql;
create trigger conclusion_source_tree_guard before insert or update on competency_descriptive_conclusions
  for each row execute function ayni_conclusion_source_guard();
