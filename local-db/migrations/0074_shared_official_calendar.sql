-- Add a shared OFFICIAL base. Preserve all owned versions and referenced day IDs.
alter table public.classrooms add column setup_submission jsonb;
alter table public.school_calendar_versions alter column school_year_id drop not null;
create unique index school_calendar_shared_active_unique on public.school_calendar_versions(calendar_year) where school_year_id is null and status='active';
insert into public.school_calendar_versions(id,school_year_id,calendar_year,name,version,source_name,source_url,source_metadata)
values('20260000-0000-4000-8000-000000000001',null,2026,'Calendario MINEDU 2026','MINEDU-2026-RM-501-2025-v1','Ministerio de Educación del Perú','https://www.gob.pe/institucion/minedu/normas-legales/7380466-501-2025-minedu','{"resolution":"RM 501-2025-MINEDU","instructional_weeks":36,"management_weeks":8,"shared_official":true}') on conflict do nothing;
insert into public.school_calendar_days(id,calendar_version_id,date,day_of_week,calendar_type,is_instructional,source,reason,editable,school_override)
select gen_random_uuid(),v.id,d::date,extract(dow from d)::int,
  case when h.holiday_date is not null then 'national_holiday' when b.type='management' then 'management_week'
    when extract(isodow from d) in (6,7) then 'weekend' when b.type='instructional' then 'instructional_day'
    else 'school_non_instructional' end,
  case when h.holiday_date is null and b.type='instructional' and extract(isodow from d) not in (6,7) then true else false end,
  case when h.holiday_date is not null then h.source_name when b.type='management' then 'MINEDU' when extract(isodow from d) in (6,7) then 'Sistema' else 'MINEDU' end,
  case when h.holiday_date is not null then h.name when b.type='management' then b.label when extract(isodow from d) in (6,7) then 'Fin de semana' else coalesce(b.label,'Fuera de bloque lectivo') end,
  case when h.holiday_date is null and extract(isodow from d) not in (6,7) and b.type='instructional' then true else false end,false
from public.school_calendar_versions v
cross join lateral generate_series('2026-03-02'::date,'2026-12-31'::date,interval '1 day') d
left join lateral (
  select x.type,x.label from (values
    (0,'management','Gestión inicial','2026-03-02'::date,'2026-03-13'::date),
    (1,'instructional','Periodo lectivo 1','2026-03-16'::date,'2026-05-15'::date),
    (2,'management','Semana de gestión','2026-05-18'::date,'2026-05-22'::date),
    (3,'instructional','Periodo lectivo 2','2026-05-25'::date,'2026-07-24'::date),
    (4,'management','Semanas de gestión','2026-07-27'::date,'2026-08-07'::date),
    (5,'instructional','Periodo lectivo 3','2026-08-10'::date,'2026-10-09'::date),
    (6,'management','Semana de gestión','2026-10-12'::date,'2026-10-16'::date),
    (7,'instructional','Periodo lectivo 4','2026-10-19'::date,'2026-12-18'::date),
    (8,'management','Gestión final','2026-12-21'::date,'2026-12-31'::date)
  ) x(sort_order,type,label,start_date,end_date)
  where d::date between x.start_date and x.end_date order by x.sort_order limit 1
) b on true
left join public.school_calendar_holidays h on h.calendar_year=2026 and h.holiday_date=d::date and h.scope='national'
where v.id='20260000-0000-4000-8000-000000000001'
on conflict(calendar_version_id,date) do nothing;
