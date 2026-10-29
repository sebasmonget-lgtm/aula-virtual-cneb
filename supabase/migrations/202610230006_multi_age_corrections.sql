-- Additive V2 correction history. Original observations and document identities survive edits.
create table multi_age_correction_events (
  id uuid primary key, classroom_id uuid not null references classrooms(id),
  student_id uuid not null references students(id), entity_kind text not null check(entity_kind in ('student','ordinary_observation','diagnostic_observation')),
  entity_id uuid not null, revision integer not null check(revision>0),
  action text not null check(action in ('correct','void')), reason text not null check(char_length(reason) between 3 and 500),
  before_snapshot jsonb not null, after_snapshot jsonb not null,
  created_by uuid not null references profiles(user_id), created_at timestamptz not null default now(),
  unique(entity_kind,entity_id,revision), check(entity_kind<>'student' or action='correct')
);
create table multi_age_family_document_snapshots (
  report_id uuid primary key references family_reports(id), classroom_id uuid not null references classrooms(id),
  identity jsonb not null, created_by uuid not null references profiles(user_id), created_at timestamptz not null default now()
);
create trigger multi_age_correction_immutable before update or delete on multi_age_correction_events
  for each row execute function protect_multi_age_snapshot();
create trigger multi_age_family_identity_immutable before update or delete on multi_age_family_document_snapshots
  for each row execute function protect_multi_age_snapshot();

create function validate_multi_age_correction() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare owner uuid; actual_student uuid; target_class uuid; expected_revision integer;
begin
  if current_user in ('anon','authenticated') then raise exception 'La corrección requiere validación en servidor.' using errcode='42501'; end if;
  select teacher_id into owner from classrooms where id=new.classroom_id and curriculum_contract_version=2 and status='active';
  if owner is null or owner<>new.created_by then raise exception 'Registro curricular no disponible.' using errcode='42501'; end if;
  perform id from classrooms where id=new.classroom_id for update;
  if tg_table_name='multi_age_family_document_snapshots' then
    select r.student_id,s.classroom_id into actual_student,target_class from family_reports r join students s on s.id=r.student_id where r.id=new.report_id;
  else
    if new.entity_kind='student' then actual_student:=new.entity_id;
    elsif new.entity_kind='ordinary_observation' then select student_id into actual_student from ordinary_observations where id=new.entity_id and created_by=owner;
    else select student_id into actual_student from diagnostic_experience_observations where id=new.entity_id and created_by=owner; end if;
    select classroom_id into target_class from students where id=actual_student;
    if actual_student is distinct from new.student_id then raise exception 'Registro curricular no disponible.' using errcode='42501'; end if;
    select coalesce(max(revision),0)+1 into expected_revision from multi_age_correction_events where entity_kind=new.entity_kind and entity_id=new.entity_id;
    if new.revision<>expected_revision then raise exception 'Cambió la revisión.' using errcode='40001'; end if;
  end if;
  if target_class is distinct from new.classroom_id then raise exception 'Registro curricular no disponible.' using errcode='42501'; end if;
  return new;
end $$;
create trigger multi_age_correction_tree before insert on multi_age_correction_events for each row execute function validate_multi_age_correction();
create trigger multi_age_family_identity_tree before insert on multi_age_family_document_snapshots for each row execute function validate_multi_age_correction();

create function guard_multi_age_correction_period() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare target_class uuid; contract integer; starts date; ends date; target_owner uuid;
begin
  if tg_table_name='students' then
    target_class:=old.classroom_id;
    select sy.starts_on,sy.ends_on into starts,ends from classrooms c join school_years sy on sy.id=c.school_year_id where c.id=target_class;
  elsif tg_table_name='multi_age_correction_events' then
    target_class:=new.classroom_id;
    if new.entity_kind='diagnostic_observation' then select (observed_at at time zone 'America/Lima')::date into starts from diagnostic_experience_observations where id=new.entity_id;
    elsif new.entity_kind='ordinary_observation' then select (occurred_at at time zone 'America/Lima')::date into starts from ordinary_observations where id=new.entity_id;
    else select sy.starts_on,sy.ends_on into starts,ends from classrooms c join school_years sy on sy.id=c.school_year_id where c.id=target_class; end if;
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
create trigger multi_age_student_correction_period before update or delete on students for each row execute function guard_multi_age_correction_period();
create trigger multi_age_event_correction_period before insert on multi_age_correction_events for each row execute function guard_multi_age_correction_period();
create trigger multi_age_raw_revision_period before insert on ordinary_observation_revisions for each row execute function guard_multi_age_correction_period();
create trigger multi_age_raw_attribution_period before insert on ordinary_observation_attributions for each row execute function guard_multi_age_correction_period();

alter table public.multi_age_correction_events enable row level security;
alter table public.multi_age_family_document_snapshots enable row level security;
create policy multi_age_correction_owner_read on public.multi_age_correction_events for select to authenticated
  using (exists(select 1 from public.classrooms c where c.id=classroom_id and c.teacher_id=auth.uid()));
create policy multi_age_family_identity_owner_read on public.multi_age_family_document_snapshots for select to authenticated
  using (exists(select 1 from public.classrooms c where c.id=classroom_id and c.teacher_id=auth.uid()));
grant select on public.multi_age_correction_events,public.multi_age_family_document_snapshots to authenticated;
