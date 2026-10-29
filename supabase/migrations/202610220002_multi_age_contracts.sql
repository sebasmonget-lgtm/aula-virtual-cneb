begin;
-- Mixed classrooms are created only by the isolated local workflow in this phase.
alter table classrooms alter column age_grade_id drop not null;
alter table classrooms add constraint classroom_curriculum_shape check(
  (age_mode='single' and age_grade_id is not null)
  or (age_mode='multi' and curriculum_contract_version=2 and age_grade_id is null)
);
drop index activity_criteria_v4_active_unique;
drop index activity_criteria_v4_draft_unique;
create unique index activity_criteria_v4_active_unique on activity_criteria(activity_id,competency_v4_id)
  where competency_v4_id is not null and status='active' and curriculum_contract_version=1;
create unique index activity_criteria_v4_draft_unique on activity_criteria(activity_id,competency_v4_id)
  where competency_v4_id is not null and status='draft' and curriculum_contract_version=1;
create unique index activity_criteria_v2_active_age on activity_criteria(activity_id,competency_v4_id,curricular_age)
  where competency_v4_id is not null and status='active' and curriculum_contract_version=2;
create unique index activity_criteria_v2_draft_age on activity_criteria(activity_id,competency_v4_id,curricular_age)
  where competency_v4_id is not null and status='draft' and curriculum_contract_version=2;

create function validate_criterion_curriculum() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare contract integer; parent_contract integer; parent_age integer; parent_family uuid;
begin
  if tg_op='UPDATE' then
    if new.curricular_age is distinct from old.curricular_age or new.curriculum_contract_version<>old.curriculum_contract_version
      or new.criterion_family_id is distinct from old.criterion_family_id then
      raise exception 'La identidad curricular del criterio es inmutable.';
    end if;
    return new;
  end if;
  select coalesce((a.details->'activity_contract'->>'curriculum_contract_version')::int,1) into contract
    from activities a where a.id=new.activity_id;
  if contract<>new.curriculum_contract_version then raise exception 'No se mezclan contratos de criterios en una actividad.'; end if;
  if new.curriculum_contract_version=2 and not exists(select 1 from activities a
    join learning_experiences e on e.id=a.experience_id join classrooms c on c.id=e.classroom_id
    join classroom_age_groups g on g.classroom_id=c.id join age_grades ag on ag.id=g.age_grade_id
    where a.id=new.activity_id and c.curriculum_contract_version=2 and g.status='active' and ag.age_years=new.curricular_age) then
    raise exception 'El criterio requiere un grupo curricular del aula.';
  end if;
  if new.supersedes_criterion_id is not null then
    select curriculum_contract_version,curricular_age,criterion_family_id into parent_contract,parent_age,parent_family
      from activity_criteria where id=new.supersedes_criterion_id;
    if parent_contract<>new.curriculum_contract_version or parent_age is distinct from new.curricular_age
      or parent_family is distinct from new.criterion_family_id then raise exception 'La nueva versión debe conservar edad y familia.'; end if;
  end if;
  return new;
end $$;
create trigger criterion_curriculum_tree before insert or update on activity_criteria
  for each row execute function validate_criterion_curriculum();

create function backend_only_multi_age_activation() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if new.curriculum_contract_version=2 and current_user in ('authenticated','anon') then
    raise exception 'La activación multiedad requiere el servicio autorizado.' using errcode='42501';
  end if;
  return new;
end $$;
create trigger multi_age_activation_guard before insert or update on classrooms
  for each row execute function backend_only_multi_age_activation();


commit;
