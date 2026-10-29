-- Shared workshops keep their confirmed age variants and export identity immutable.
create function guard_multi_age_workshop_snapshot() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare c classrooms; snap jsonb; parent_details jsonb; ages jsonb; parent_classroom uuid;
begin
 if tg_table_name='learning_experiences' then
  if new.type<>'workshop' or new.details->>'contract_version' is distinct from 'multi-age-workshop-v1' then return new; end if;
  select * into c from classrooms where id=new.classroom_id;
  snap:=new.details->'workshop_snapshot';
 elsif tg_table_name='activities' then
  select e.details,e.classroom_id into parent_details,parent_classroom from learning_experiences e where e.id=new.experience_id;
  if parent_details->>'contract_version' is distinct from 'multi-age-workshop-v1' then return new; end if;
  select * into c from classrooms where id=parent_classroom;
  snap:=new.details->'workshop_snapshot';
 else
  select a.details into parent_details from activities a where a.id=new.activity_id;
  if parent_details->>'contract_version' is distinct from 'multi-age-workshop-v1' then return new; end if;
  if current_user in ('anon','authenticated') then raise exception 'El taller requiere validación en servidor.' using errcode='42501'; end if;
  if tg_op='UPDATE' and (to_jsonb(new)-'status'-'updated_at') is distinct from (to_jsonb(old)-'status'-'updated_at') then raise exception 'Conserva el criterio confirmado del taller.'; end if;
  return new;
 end if;
 if current_user in ('anon','authenticated') then raise exception 'El taller requiere validación en servidor.' using errcode='42501'; end if;
 if tg_op='UPDATE' and old.teacher_confirmed_at is not null and (to_jsonb(new)-'status'-'updated_at') is distinct from (to_jsonb(old)-'status'-'updated_at') then raise exception 'Conserva la versión confirmada del taller.'; end if;
 select jsonb_agg(ag.age_years order by ag.age_years) into ages from classroom_age_groups g join age_grades ag on ag.id=g.age_grade_id where g.classroom_id=c.id and g.status='active';
 if c.curriculum_contract_version is distinct from 2 or c.status<>'active' or (snap->'identity'->>'classroom_id')::uuid is distinct from c.id
  or (snap->'identity'->>'school_year_id')::uuid is distinct from c.school_year_id or snap->'identity'->'ages' is distinct from ages or new.teacher_confirmed_at is null then raise exception 'El taller necesita aula, grupos e identidad confirmados.'; end if;
 return new;
end $$;
create trigger multi_age_workshop_experience_guard before insert or update on learning_experiences for each row execute function guard_multi_age_workshop_snapshot();
create trigger multi_age_workshop_activity_guard before insert or update on activities for each row execute function guard_multi_age_workshop_snapshot();
create trigger multi_age_workshop_criterion_guard before insert or update on activity_criteria for each row execute function guard_multi_age_workshop_snapshot();
