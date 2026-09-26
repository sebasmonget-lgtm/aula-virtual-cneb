create table school_calendar_versions (
  id uuid primary key,
  school_year_id uuid not null references school_years(id) on delete cascade,
  calendar_year integer not null,
  name text not null,
  version text not null,
  source_name text not null,
  source_url text not null,
  source_metadata jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  unique(school_year_id,version)
);
create unique index school_calendar_versions_active_unique
  on school_calendar_versions(school_year_id) where status='active';

create table school_calendar_holidays (
  id uuid primary key,
  calendar_year integer not null,
  holiday_date date not null,
  name text not null,
  scope text not null default 'national',
  source_name text not null,
  source_url text not null,
  source_version text not null,
  unique(calendar_year,holiday_date,scope)
);

create table school_calendar_days (
  id uuid primary key,
  calendar_version_id uuid not null references school_calendar_versions(id) on delete cascade,
  date date not null,
  day_of_week integer not null check (day_of_week between 0 and 6),
  calendar_type text not null check (calendar_type in ('instructional_day','weekend','national_holiday','management_week','school_non_instructional','school_instructional_override')),
  is_instructional boolean not null,
  source text not null,
  reason text not null,
  editable boolean not null default false,
  school_override boolean not null default false,
  unique(calendar_version_id,date)
);
create index school_calendar_days_date_idx on school_calendar_days(calendar_version_id,date);

create table classroom_calendar_overrides (
  id uuid primary key,
  classroom_id uuid not null references classrooms(id) on delete cascade,
  override_date date not null,
  previous_calendar_type text not null,
  new_calendar_type text not null check (new_calendar_type in ('school_non_instructional','school_instructional_override')),
  previous_is_instructional boolean not null,
  new_is_instructional boolean not null,
  reason text not null,
  changed_by uuid not null references profiles(user_id),
  changed_at timestamptz not null default now(),
  reverted_at timestamptz,
  reverted_by uuid references profiles(user_id)
);
create index classroom_calendar_overrides_lookup_idx
  on classroom_calendar_overrides(classroom_id,override_date,changed_at desc);
create unique index classroom_calendar_overrides_active_unique
  on classroom_calendar_overrides(classroom_id,override_date) where reverted_at is null;

create table project_calendar_selections (
  id uuid primary key,
  learning_experience_id uuid not null unique references learning_experiences(id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'draft' check (status in ('draft','confirmed')),
  revision integer not null default 1,
  confirmed_at timestamptz,
  confirmed_by uuid references profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_on <= ends_on)
);

create table project_instructional_dates (
  id uuid primary key,
  selection_id uuid not null references project_calendar_selections(id) on delete cascade,
  calendar_day_id uuid references school_calendar_days(id),
  date date not null,
  selected boolean not null default true,
  exclusion_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(selection_id,date)
);
create index project_instructional_dates_selection_idx on project_instructional_dates(selection_id,date);

alter table activities add column if not exists planned_date date;
alter table activities add column if not exists schedule_status text not null default 'planned'
  check (schedule_status in ('planned','rescheduled','cancelled','not_worked'));
create table activity_schedule_changes (
  id uuid primary key,
  activity_id uuid not null references activities(id) on delete cascade,
  previous_date date not null,
  new_date date,
  change_type text not null check (change_type in ('rescheduled','cancelled','not_worked')),
  reason text not null,
  changed_by uuid not null references profiles(user_id),
  changed_at timestamptz not null default now()
);
create index activity_schedule_changes_activity_idx on activity_schedule_changes(activity_id,changed_at desc);

-- Confirmed pedagogical content stays immutable. Only its execution date/status may
-- change through the audited backend reprogramming service.
create or replace function prevent_confirmed_activity_change() returns trigger as $$
begin
  if old.status in ('active','archived') then
    if tg_op='DELETE' then raise exception 'Una actividad confirmada es inmutable.'; end if;
    if old.status='active' and new.status='archived'
       and to_jsonb(new)-'status'-'updated_at'-'superseded_at'-'revision'=to_jsonb(old)-'status'-'updated_at'-'superseded_at'-'revision' then return new; end if;
    if old.status='active' and new.status='active'
       and to_jsonb(new)-'occurs_on'-'schedule_status'-'updated_at'-'revision'=to_jsonb(old)-'occurs_on'-'schedule_status'-'updated_at'-'revision' then return new; end if;
    raise exception 'Una actividad confirmada es inmutable.';
  end if;
  return new;
end; $$ language plpgsql;

insert into school_calendar_holidays(id,calendar_year,holiday_date,name,scope,source_name,source_url,source_version)
values
  (gen_random_uuid(),2026,'2026-04-02','Jueves Santo','national','Plataforma del Estado Peruano','https://www.gob.pe/feriados','gob-pe-2026'),
  (gen_random_uuid(),2026,'2026-04-03','Viernes Santo','national','Plataforma del Estado Peruano','https://www.gob.pe/feriados','gob-pe-2026'),
  (gen_random_uuid(),2026,'2026-05-01','Día del Trabajo','national','Plataforma del Estado Peruano','https://www.gob.pe/feriados','gob-pe-2026'),
  (gen_random_uuid(),2026,'2026-06-07','Batalla de Arica y Día de la Bandera','national','Plataforma del Estado Peruano','https://www.gob.pe/feriados','gob-pe-2026'),
  (gen_random_uuid(),2026,'2026-06-29','San Pedro y San Pablo','national','Plataforma del Estado Peruano','https://www.gob.pe/feriados','gob-pe-2026'),
  (gen_random_uuid(),2026,'2026-07-23','Día de la Fuerza Aérea del Perú','national','Plataforma del Estado Peruano','https://www.gob.pe/feriados','gob-pe-2026'),
  (gen_random_uuid(),2026,'2026-07-28','Fiestas Patrias','national','Plataforma del Estado Peruano','https://www.gob.pe/feriados','gob-pe-2026'),
  (gen_random_uuid(),2026,'2026-07-29','Fiestas Patrias','national','Plataforma del Estado Peruano','https://www.gob.pe/feriados','gob-pe-2026'),
  (gen_random_uuid(),2026,'2026-08-06','Batalla de Junín','national','Plataforma del Estado Peruano','https://www.gob.pe/feriados','gob-pe-2026'),
  (gen_random_uuid(),2026,'2026-08-30','Santa Rosa de Lima','national','Plataforma del Estado Peruano','https://www.gob.pe/feriados','gob-pe-2026'),
  (gen_random_uuid(),2026,'2026-10-08','Combate de Angamos','national','Plataforma del Estado Peruano','https://www.gob.pe/feriados','gob-pe-2026'),
  (gen_random_uuid(),2026,'2026-11-01','Día de Todos los Santos','national','Plataforma del Estado Peruano','https://www.gob.pe/feriados','gob-pe-2026'),
  (gen_random_uuid(),2026,'2026-12-08','Inmaculada Concepción','national','Plataforma del Estado Peruano','https://www.gob.pe/feriados','gob-pe-2026'),
  (gen_random_uuid(),2026,'2026-12-09','Batalla de Ayacucho','national','Plataforma del Estado Peruano','https://www.gob.pe/feriados','gob-pe-2026'),
  (gen_random_uuid(),2026,'2026-12-25','Navidad','national','Plataforma del Estado Peruano','https://www.gob.pe/feriados','gob-pe-2026')
on conflict(calendar_year,holiday_date,scope) do nothing;

insert into school_calendar_versions(id,school_year_id,calendar_year,name,version,source_name,source_url,source_metadata)
select gen_random_uuid(),sy.id,sy.year,'Calendario MINEDU '||sy.year,'MINEDU-2026-RM-501-2025-v1',
  'Ministerio de Educación del Perú',
  'https://repositorio.minedu.gob.pe/handle/20.500.12799/11753',
  '{"resolution":"RM 501-2025-MINEDU","instructional_weeks":36,"management_weeks":8}'::jsonb
from school_years sy where sy.year=2026
on conflict(school_year_id,version) do nothing;

insert into school_calendar_days(id,calendar_version_id,date,day_of_week,calendar_type,is_instructional,source,reason,editable,school_override)
select gen_random_uuid(),v.id,d::date,extract(dow from d)::int,
  case
    when h.holiday_date is not null then 'national_holiday'
    when b.type='management' then 'management_week'
    when extract(isodow from d) in (6,7) then 'weekend'
    when b.type='instructional' then 'instructional_day'
    else 'school_non_instructional'
  end,
  case when h.holiday_date is null and b.type='instructional' and extract(isodow from d) not in (6,7) then true else false end,
  case when h.holiday_date is not null then h.source_name when b.type in ('instructional','management') then 'MINEDU' else 'Sistema' end,
  coalesce(h.name,b.label,'Fuera de bloque lectivo'),
  case when h.holiday_date is null and extract(isodow from d) not in (6,7) and b.type='instructional' then true else false end,
  false
from school_calendar_versions v
join school_years sy on sy.id=v.school_year_id
cross join lateral generate_series(
  coalesce((select min(start_date) from calendar_blocks where school_year_id=sy.id),sy.starts_on),
  coalesce((select max(end_date) from calendar_blocks where school_year_id=sy.id),sy.ends_on), interval '1 day') d
left join lateral (select type,label from calendar_blocks where school_year_id=sy.id and d::date between start_date and end_date order by sort_order limit 1) b on true
left join school_calendar_holidays h on h.calendar_year=sy.year and h.holiday_date=d::date and h.scope='national'
where v.status='active'
on conflict(calendar_version_id,date) do nothing;
