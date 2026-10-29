-- Optional for historical/V1 enrollments; no historical date is guessed or backfilled.
alter table students add column enrolled_on date;
create function guard_multi_age_enrollment_date() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare joined date; starts date; ends date; contract integer;
begin
 if tg_table_name='students' then
  select sy.starts_on,sy.ends_on,c.curriculum_contract_version into starts,ends,contract from classrooms c join school_years sy on sy.id=c.school_year_id where c.id=new.classroom_id;
  if contract<>2 then return new; end if;
  if tg_op='UPDATE' and new.enrolled_on is distinct from old.enrolled_on then raise exception 'La fecha confirmada de ingreso se conserva con la matrícula.'; end if;
  if new.enrolled_on is not null and (new.enrolled_on<starts or new.enrolled_on>ends) then raise exception 'El ingreso pertenece al año escolar.'; end if;
 else
  select s.enrolled_on,c.curriculum_contract_version into joined,contract from students s join classrooms c on c.id=s.classroom_id where s.id=new.student_id;
  if contract=2 and joined is not null and (case when tg_table_name='ordinary_observations' then (to_jsonb(new)->>'occurred_at')::timestamptz else (to_jsonb(new)->>'observed_at')::timestamptz end at time zone 'America/Lima')::date<joined then raise exception 'No se registra una observación anterior al ingreso del niño.'; end if;
 end if;
 return new;
end $$;
create trigger multi_age_enrollment_date before insert or update on students for each row execute function guard_multi_age_enrollment_date();
create trigger multi_age_observation_enrollment before insert or update on ordinary_observations for each row execute function guard_multi_age_enrollment_date();
create trigger multi_age_diagnostic_enrollment before insert or update on diagnostic_experience_observations for each row execute function guard_multi_age_enrollment_date();

create or replace function guard_multi_age_correction_period() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare target_class uuid; contract integer; starts date; ends date; target_owner uuid;
begin
  if tg_table_name='students' then
    target_class:=old.classroom_id;
    select coalesce(s.enrolled_on,sy.starts_on),sy.ends_on into starts,ends from students s join classrooms c on c.id=s.classroom_id join school_years sy on sy.id=c.school_year_id where s.id=old.id;
  elsif tg_table_name='multi_age_correction_events' then
    target_class:=new.classroom_id;
    if new.entity_kind='diagnostic_observation' then select (observed_at at time zone 'America/Lima')::date into starts from diagnostic_experience_observations where id=new.entity_id;
    elsif new.entity_kind='ordinary_observation' then select (occurred_at at time zone 'America/Lima')::date into starts from ordinary_observations where id=new.entity_id;
    else select coalesce(s.enrolled_on,sy.starts_on),sy.ends_on into starts,ends from students s join classrooms c on c.id=s.classroom_id join school_years sy on sy.id=c.school_year_id where s.id=new.student_id; end if;
    ends:=coalesce(ends,starts);
  else
    select classroom_id,(occurred_at at time zone 'America/Lima')::date,created_by into target_class,starts,target_owner from ordinary_observations where id=new.observation_id;
    ends:=starts;
  end if;
  select curriculum_contract_version into contract from classrooms where id=target_class;
  if contract=2 then
    if tg_op='DELETE' then raise exception 'La historia del niño se conserva.'; end if;
    if current_user in ('anon','authenticated') then raise exception 'La corrección requiere validación en servidor.' using errcode='42501'; end if;
    if tg_table_name in ('ordinary_observation_revisions','ordinary_observation_attributions') then
      if new.created_by<>target_owner then raise exception 'Registro no disponible.' using errcode='42501'; end if;
    end if;
    perform id from classrooms where id=target_class for update;
    if exists(select 1 from period_closures c join evaluation_periods p on p.id=c.evaluation_period_id
      left join period_closure_workflows w on w.classroom_id=c.classroom_id and w.evaluation_period_id=c.evaluation_period_id
      where c.classroom_id=target_class and p.starts_on<=ends and p.ends_on>=starts
        and (c.current_version_id is null or coalesce(w.step_state#>>'{period_edit,reopened_version_id}','')<>c.current_version_id::text)) then
      raise exception 'Reabre el bimestre antes de corregir sus fuentes.' using errcode='40001';
    end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
