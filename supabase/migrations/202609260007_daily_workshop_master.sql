alter table public.learning_experiences
  add column if not exists parent_project_id uuid references public.learning_experiences(id);

alter table public.activities
  add column if not exists linked_main_activity_id uuid references public.activities(id),
  add column if not exists workshop_item_index integer;

alter table public.activities
  add constraint activities_workshop_item_positive check (workshop_item_index is null or workshop_item_index > 0);

create unique index if not exists workshop_master_one_draft_per_project
  on public.learning_experiences(parent_project_id) where type='workshop' and status='draft' and parent_project_id is not null;
create unique index if not exists workshop_master_one_active_per_project
  on public.learning_experiences(parent_project_id) where type='workshop' and status='active' and parent_project_id is not null;
create unique index if not exists workshop_day_one_draft_per_master
  on public.activities(experience_id,workshop_item_index) where status='draft' and workshop_item_index is not null;
create unique index if not exists workshop_day_one_active_per_master
  on public.activities(experience_id,workshop_item_index) where status='active' and workshop_item_index is not null;

create or replace function public.check_daily_workshop_relation() returns trigger as $$
declare parent_row record; main_row record;
begin
  if tg_table_name='learning_experiences' then
    if new.parent_project_id is null then return new; end if;
    select classroom_id,type into parent_row from public.learning_experiences where id=new.parent_project_id;
    if new.type<>'workshop' or parent_row.classroom_id is distinct from new.classroom_id
       or parent_row.type not in ('project','unit') then
      raise exception 'El maestro de talleres debe pertenecer a un proyecto del aula.';
    end if;
    return new;
  end if;
  if new.linked_main_activity_id is null then
    if new.workshop_item_index is not null then raise exception 'Falta la actividad vinculada al taller.'; end if;
    return new;
  end if;
  select a.occurs_on,e.classroom_id,e.id as project_id into main_row
    from public.activities a join public.learning_experiences e on e.id=a.experience_id
    where a.id=new.linked_main_activity_id and e.type in ('project','unit');
  select e.parent_project_id,e.classroom_id into parent_row
    from public.learning_experiences e where e.id=new.experience_id and e.type='workshop';
  if new.workshop_item_index is null or main_row.project_id is distinct from parent_row.parent_project_id
     or main_row.classroom_id is distinct from parent_row.classroom_id
     or main_row.occurs_on is distinct from new.occurs_on then
    raise exception 'El taller diario no coincide con la actividad y el aula.';
  end if;
  return new;
end;
$$ language plpgsql set search_path = pg_catalog, public;

revoke all on function public.check_daily_workshop_relation() from public, anon, authenticated;
create trigger daily_workshop_master_relation before insert or update of parent_project_id,classroom_id,type
  on public.learning_experiences for each row execute function public.check_daily_workshop_relation();
create trigger daily_workshop_activity_relation before insert or update of linked_main_activity_id,experience_id,occurs_on,workshop_item_index
  on public.activities for each row execute function public.check_daily_workshop_relation();
