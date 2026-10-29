-- V2 only: immutable project editions and annual placements. Never reparent prepared activities.
create table multi_age_project_versions (
 id uuid primary key, classroom_id uuid not null references classrooms(id), project_id uuid not null references learning_experiences(id),
 version integer not null check(version>=2), supersedes_version_id uuid references multi_age_project_versions(id),
 title text not null, purpose text not null, details jsonb not null, fingerprint text not null,
 reason text not null check(char_length(reason) between 3 and 500), confirmed_by uuid not null references profiles(user_id),
 confirmed_at timestamptz not null default now(), unique(project_id,version),unique(project_id,fingerprint)
);
create table multi_age_annual_project_links (
 annual_plan_id uuid not null references annual_plans(id), slot_id text not null,
 classroom_id uuid not null references classrooms(id), project_id uuid not null references learning_experiences(id),
 confirmed_by uuid not null references profiles(user_id), confirmed_at timestamptz not null default now(),
 primary key(annual_plan_id,slot_id), unique(annual_plan_id,project_id)
);
create trigger multi_age_project_version_immutable before update or delete on multi_age_project_versions for each row execute function protect_multi_age_snapshot();
create trigger multi_age_annual_link_immutable before update or delete on multi_age_annual_project_links for each row execute function protect_multi_age_snapshot();

create function validate_multi_age_planning_revision() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare owner uuid; project learning_experiences; previous multi_age_project_versions; starts date; ends date;
begin
 if current_user in ('anon','authenticated') then raise exception 'La edición requiere validación en servidor.' using errcode='42501'; end if;
 select teacher_id into owner from classrooms where id=new.classroom_id and curriculum_contract_version=2 and status='active';
 select * into project from learning_experiences where id=new.project_id and classroom_id=new.classroom_id and status='active' and details->>'curriculum_contract_version'='2';
 if owner is null or owner<>new.confirmed_by or project.id is null then raise exception 'Proyecto no disponible.' using errcode='42501'; end if;
 perform id from classrooms where id=new.classroom_id for update;
 if tg_table_name='multi_age_project_versions' then
  select * into previous from multi_age_project_versions where project_id=project.id order by version desc limit 1;
  if new.version<>coalesce(previous.version,1)+1 or new.supersedes_version_id is distinct from previous.id then raise exception 'Cambió la versión del proyecto.' using errcode='40001'; end if;
  if new.details->>'curriculum_contract_version'<>'2' or new.details->'participant_age_groups' is distinct from project.details->'participant_age_groups'
    or new.details->>'project_revision_id' is distinct from new.id::text then raise exception 'Contexto curricular incompatible.'; end if;
  starts:=project.starts_on; ends:=project.ends_on;
  if exists(select 1 from period_closures c join evaluation_periods p on p.id=c.evaluation_period_id
   left join period_closure_workflows w on w.classroom_id=c.classroom_id and w.evaluation_period_id=c.evaluation_period_id
   where c.classroom_id=new.classroom_id and p.starts_on<=ends and p.ends_on>=starts
    and (c.current_version_id is null or coalesce(w.step_state#>>'{period_edit,reopened_version_id}','')<>c.current_version_id::text)) then
   raise exception 'Reabre el bimestre antes de editar su proyecto.' using errcode='40001';
  end if;
 else
  if not exists(select 1 from annual_plans p where p.id=new.annual_plan_id and p.classroom_id=new.classroom_id and p.curriculum_contract_version=2
    and p.status='draft' and p.school_year_id=(select school_year_id from classrooms where id=new.classroom_id)
    and exists(select 1 from jsonb_array_elements(p.proposal->'proposals') r where r->>'slot_id'=new.slot_id))
    or project.details->>'annual_slot_id' is distinct from new.slot_id then raise exception 'El vínculo no corresponde al tramo del proyecto.'; end if;
 end if;
 return new;
end $$;
create trigger multi_age_project_version_tree before insert on multi_age_project_versions for each row execute function validate_multi_age_planning_revision();
create trigger multi_age_annual_link_tree before insert on multi_age_annual_project_links for each row execute function validate_multi_age_planning_revision();
