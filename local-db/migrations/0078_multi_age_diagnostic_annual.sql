-- Additive: existing rows retain contract 1. Only the isolated local service writes V2.
alter table diagnostic_experience_observations add column curriculum_snapshot jsonb not null default '{}'::jsonb;
alter table diagnostic_student_reviews add column curriculum_contract_version smallint not null default 1 check(curriculum_contract_version in (1,2));
alter table student_family_interviews add column curriculum_contract_version smallint not null default 1 check(curriculum_contract_version in (1,2));
alter table annual_plans add column curriculum_contract_version smallint not null default 1 check(curriculum_contract_version in (1,2));

create function validate_multi_age_planning_document() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare data jsonb:=to_jsonb(new); snap jsonb; contract integer; owner uuid; ages jsonb;
begin
  select curriculum_contract_version,teacher_id into contract,owner from classrooms where id=new.classroom_id;
  if contract=1 then
    if coalesce((data->>'curriculum_contract_version')::int,1)<>1 then raise exception 'El aula conserva su contrato.'; end if;
    return new;
  end if;
  if current_user in ('anon','authenticated') then raise exception 'La escritura multiedad requiere validación en servidor.' using errcode='42501'; end if;
  if tg_table_name='diagnostic_experience_observations' then snap:=new.curriculum_snapshot;
  elsif tg_table_name='annual_plans' then snap:=new.document_context->'curriculum_snapshot';
  else snap:=new.details->'curriculum_snapshot'; end if;
  if snap is null or (snap->>'contract')::int is distinct from 2
    or (snap->>'classroom_id')::uuid is distinct from new.classroom_id then raise exception 'Falta el contexto curricular multiedad.'; end if;
  if tg_table_name<>'diagnostic_experience_observations' and (data->>'curriculum_contract_version')::int<>2 then raise exception 'Contrato documental incompatible.'; end if;
  if data->>'created_by' is not null and (data->>'created_by')::uuid<>owner then raise exception 'La docente no corresponde al documento.'; end if;
  if tg_table_name='annual_plans' then
    select jsonb_agg(ag.age_years order by ag.age_years) into ages from classroom_age_groups g join age_grades ag on ag.id=g.age_grade_id where g.classroom_id=new.classroom_id and g.status='active';
    if snap->'ages' is distinct from ages or not exists(select 1 from classrooms where id=new.classroom_id and school_year_id=new.school_year_id and curriculum_revision=(snap->>'revision')::bigint)
      then raise exception 'El plan no corresponde a los grupos y año vigentes.'; end if;
  elsif not exists(select 1 from student_curriculum_assignments a join age_grades ag on ag.id=a.age_grade_id
    where a.id=(snap->>'assignment_id')::uuid and a.student_id=new.student_id and a.classroom_id=new.classroom_id
      and a.status='active' and a.revision=(snap->>'assignment_revision')::bigint and ag.age_years=(snap->>'age')::int)
    then raise exception 'El documento no corresponde a la matrícula curricular del niño.';
  end if;
  if tg_op='UPDATE' and tg_table_name='diagnostic_experience_observations' and to_jsonb(old) is distinct from data then
    raise exception 'Conservar la fuente diagnóstica; su corrección requiere una revisión versionada.';
  end if;
  return new;
end $$;
create trigger multi_age_diagnostic_document before insert or update on diagnostic_experience_observations for each row execute function validate_multi_age_planning_document();
create trigger multi_age_student_review_document before insert or update on diagnostic_student_reviews for each row execute function validate_multi_age_planning_document();
create trigger multi_age_interview_document before insert or update on student_family_interviews for each row execute function validate_multi_age_planning_document();
create trigger multi_age_annual_document before insert or update on annual_plans for each row execute function validate_multi_age_planning_document();
