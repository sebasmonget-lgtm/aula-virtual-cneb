-- Additive, V2-only. Preserve the existing closed manifest and V1 behavior.
create function validate_multi_age_period_write() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare classroom uuid; contract integer; starts date; ends date; record jsonb; old_record jsonb;
begin
  record:=to_jsonb(new);
  if tg_op='UPDATE' then old_record:=to_jsonb(old); end if;
  for record in select value from jsonb_array_elements(case when tg_op='UPDATE' then jsonb_build_array(old_record,record) else jsonb_build_array(record) end) loop
    if tg_table_name='activities' then
      select classroom_id into classroom from learning_experiences where id=(record->>'experience_id')::uuid;
      starts:=(record->>'occurs_on')::date; ends:=starts;
    elsif tg_table_name='ordinary_observations' then
      classroom:=(record->>'classroom_id')::uuid;
      starts:=((record->>'occurred_at')::timestamptz at time zone 'America/Lima')::date; ends:=starts;
    else
      select classroom_id into classroom from students where id=(record->>'student_id')::uuid;
      starts:=(record->>'period_start')::date; ends:=(record->>'period_end')::date;
    end if;
    select curriculum_contract_version into contract from classrooms where id=classroom;
    if contract=2 then
      perform id from classrooms where id=classroom for update;
      if exists(select 1 from period_closures c join evaluation_periods p on p.id=c.evaluation_period_id
        left join period_closure_workflows w on w.classroom_id=c.classroom_id and w.evaluation_period_id=c.evaluation_period_id
        where c.classroom_id=classroom and p.starts_on<=ends and p.ends_on>=starts
          and (c.current_version_id is null or coalesce(w.step_state#>>'{period_edit,reopened_version_id}','')<>c.current_version_id::text)) then
        raise exception 'Reabre el bimestre antes de cambiar sus registros.' using errcode='40001';
      end if;
    end if;
  end loop;
  return new;
end $$;
create trigger multi_age_period_activity before insert or update on activities for each row execute function validate_multi_age_period_write();
create trigger multi_age_period_observation before insert or update on ordinary_observations for each row execute function validate_multi_age_period_write();
create trigger multi_age_period_assessment before insert or update on competency_assessments for each row execute function validate_multi_age_period_write();
create trigger multi_age_period_conclusion before insert or update on competency_descriptive_conclusions for each row execute function validate_multi_age_period_write();
create trigger multi_age_period_family before insert or update on family_reports for each row execute function validate_multi_age_period_write();

create function validate_multi_age_grade_confirmation() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
  if exists(select 1 from students s join classrooms c on c.id=s.classroom_id where s.id=new.student_id and c.curriculum_contract_version=2) then
    if new.evaluation_period_id is null or not exists(select 1 from students s join classrooms c on c.id=s.classroom_id
      join evaluation_periods p on p.school_year_id=c.school_year_id where s.id=new.student_id and p.id=new.evaluation_period_id
      and p.starts_on=new.period_start and p.ends_on=new.period_end) then raise exception 'La evaluación no corresponde al período del niño.'; end if;
    -- Preserve older local V2 rows that did not yet record level_confirmed_by.
    -- Archiving may change only status/timestamps, never their pedagogical data or authorship.
    if tg_op='UPDATE' and old.status='active' and new.status='archived' and old.teacher_confirmed_at is not null
      and (to_jsonb(new)-array['status','updated_at','revision'])=(to_jsonb(old)-array['status','updated_at','revision']) then return new; end if;
    if new.achievement_level is not null and (new.status not in ('active','archived') or new.teacher_confirmed_at is null or new.level_confirmed_by is null) then
      raise exception 'El nivel definitivo requiere confirmación docente.';
    end if;
  end if;
  return new;
end $$;
create trigger multi_age_grade_confirmation before insert or update on competency_assessments for each row execute function validate_multi_age_grade_confirmation();

-- Keep the pre-existing V1 validation unchanged. V2 is validated by the new trigger above,
-- including immutable archival of grades while preserving their confirmed level.
create or replace function public.check_assessment_period_link() returns trigger language plpgsql as $$
begin
  if exists(select 1 from public.students s join public.classrooms c on c.id=s.classroom_id
    where s.id=new.student_id and c.curriculum_contract_version=2) then return new; end if;
  if new.evaluation_period_id is not null and not exists (
    select 1 from public.students s join public.classrooms c on c.id=s.classroom_id
    join public.evaluation_periods p on p.school_year_id=c.school_year_id
    where s.id=new.student_id and p.id=new.evaluation_period_id and p.starts_on=new.period_start and p.ends_on=new.period_end
  ) then raise exception 'La evaluación no corresponde al año y período del estudiante.'; end if;
  if new.achievement_level is not null and (new.status <> 'active' or new.teacher_confirmed_at is null or new.level_confirmed_by is null) then
    raise exception 'El nivel definitivo requiere confirmación docente.';
  end if;
  return new;
end; $$;
