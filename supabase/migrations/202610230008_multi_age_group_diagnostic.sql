-- Additive V2 group review guard; existing single-age reviews keep contract 1.
alter table diagnostic_group_reviews add column curriculum_contract_version smallint not null default 1 check(curriculum_contract_version in (1,2));

create function validate_multi_age_group_review() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare c classrooms; ages jsonb; snap jsonb;
begin
 select * into c from classrooms where id=new.classroom_id;
 if c.curriculum_contract_version=1 then
  if new.curriculum_contract_version<>1 then raise exception 'El aula conserva su contrato.'; end if;
  return new;
 end if;
 if current_user in ('anon','authenticated') then raise exception 'El diagnóstico grupal requiere validación en servidor.' using errcode='42501'; end if;
 perform id from classrooms where id=c.id for update;
 snap:=new.details->'curriculum_snapshot';
 select jsonb_agg(ag.age_years order by ag.age_years) into ages from classroom_age_groups g join age_grades ag on ag.id=g.age_grade_id where g.classroom_id=c.id and g.status='active';
 if c.status<>'active' or new.created_by<>c.teacher_id or new.curriculum_contract_version<>2
  or (snap->>'contract')::int is distinct from 2 or (snap->>'classroom_id')::uuid is distinct from c.id
  or (snap->>'school_year_id')::uuid is distinct from c.school_year_id or snap->'ages' is distinct from ages
  or new.details->>'contract' is distinct from 'multi-age-group-diagnostic-v1' then
  raise exception 'Contexto del diagnóstico grupal incompatible.' using errcode='42501';
 end if;
 if tg_op='UPDATE' and (new.id<>old.id or new.classroom_id<>old.classroom_id or new.version<>old.version or new.created_by<>old.created_by) then
  raise exception 'Conserva la identidad de la revisión grupal.';
 end if;
 if new.status='confirmed' and (new.teacher_confirmed_at is null or new.details->'document_identity' is null
  or new.details->>'source_fingerprint' is null or new.source_snapshot->>'contract' is distinct from 'multi-age-group-sources-v1') then
  raise exception 'Confirma las fuentes y la identidad del diagnóstico grupal.';
 end if;
 return new;
end $$;
create trigger multi_age_group_review_tree before insert or update on diagnostic_group_reviews for each row execute function validate_multi_age_group_review();
