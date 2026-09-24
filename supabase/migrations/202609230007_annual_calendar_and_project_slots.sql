create table public.calendar_blocks (
  id uuid primary key default gen_random_uuid(),
  school_year_id uuid not null references public.school_years(id) on delete cascade,
  type text not null check (type in ('instructional','management','holiday','institutional','vacation')),
  label text not null,
  start_date date not null,
  end_date date not null,
  editable boolean not null default true,
  sort_order integer not null,
  check (start_date <= end_date),
  unique (school_year_id, sort_order)
);
create index calendar_blocks_year_dates on public.calendar_blocks(school_year_id,start_date,end_date);

create table public.initial_stages (
  id uuid primary key default gen_random_uuid(),
  school_year_id uuid not null unique references public.school_years(id) on delete cascade,
  name text not null,
  duration_weeks integer not null default 2 check (duration_weeks between 1 and 4),
  purpose text not null,
  suggested_experiences jsonb not null default '[]'::jsonb,
  what_to_observe jsonb not null default '[]'::jsonb,
  family_actions jsonb not null default '[]'::jsonb,
  diagnostic_focus jsonb not null default '[]'::jsonb,
  teacher_notes text not null default ''
);

create table public.project_slots (
  id uuid primary key default gen_random_uuid(),
  annual_plan_id uuid not null references public.annual_plans(id) on delete cascade,
  slot_index integer not null check (slot_index between 1 and 12),
  calendar_block_id uuid references public.calendar_blocks(id),
  duration_weeks integer not null check (duration_weeks in (2,3)),
  starts_on date not null,
  ends_on date not null,
  check (starts_on <= ends_on),
  unique (annual_plan_id, slot_index)
);

insert into public.calendar_blocks(school_year_id,type,label,start_date,end_date,editable,sort_order)
select sy.id,seed.type,seed.label,seed.start_date::date,seed.end_date::date,true,seed.sort_order
from public.school_years sy cross join (values
  (0,'management','Gestión inicial','2026-03-02','2026-03-13'),
  (1,'instructional','Periodo lectivo 1','2026-03-16','2026-05-15'),
  (2,'management','Semana de gestión','2026-05-18','2026-05-22'),
  (3,'instructional','Periodo lectivo 2','2026-05-25','2026-07-24'),
  (4,'management','Semanas de gestión','2026-07-27','2026-08-07'),
  (5,'instructional','Periodo lectivo 3','2026-08-10','2026-10-09'),
  (6,'management','Semana de gestión','2026-10-12','2026-10-16'),
  (7,'instructional','Periodo lectivo 4','2026-10-19','2026-12-18'),
  (8,'management','Gestión final','2026-12-21','2026-12-31')
) as seed(sort_order,type,label,start_date,end_date)
where sy.year=2026 and not exists (select 1 from public.calendar_blocks cb where cb.school_year_id=sy.id);

insert into public.initial_stages(school_year_id,name,duration_weeks,purpose,suggested_experiences,what_to_observe,family_actions,diagnostic_focus)
select sy.id,'Acogida, adaptación y evaluación diagnóstica',2,
  'Conocer a los niños, acompañar su adaptación y preparar un ambiente seguro para jugar y aprender.',
  '["Juego libre en sectores","Recorrido por los espacios del jardín","Conversaciones y juegos para conocernos"]'::jsonb,
  '["Cómo se incorpora al juego","Cómo se comunica y se relaciona","Qué despierta su curiosidad"]'::jsonb,
  '["Conversar con las familias sobre rutinas y necesidades de adaptación"]'::jsonb,
  '["Registrar lo que cada niño hace y dice, sin asignar niveles por una sola observación"]'::jsonb
from public.school_years sy where sy.year=2026 on conflict(school_year_id) do nothing;

alter table public.calendar_blocks enable row level security;
alter table public.initial_stages enable row level security;
alter table public.project_slots enable row level security;
create policy calendar_blocks_own on public.calendar_blocks for all to authenticated
  using (public.owns_school_year(school_year_id)) with check (public.owns_school_year(school_year_id));
create policy initial_stages_own on public.initial_stages for all to authenticated
  using (public.owns_school_year(school_year_id)) with check (public.owns_school_year(school_year_id));
create policy project_slots_own on public.project_slots for all to authenticated
  using (exists(select 1 from public.annual_plans ap where ap.id=annual_plan_id and public.owns_school_year(ap.school_year_id)))
  with check (exists(select 1 from public.annual_plans ap where ap.id=annual_plan_id and public.owns_school_year(ap.school_year_id)));
