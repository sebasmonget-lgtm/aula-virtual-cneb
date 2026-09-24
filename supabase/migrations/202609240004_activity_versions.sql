begin;
alter table public.activities
  add column if not exists version integer not null default 1,
  add column if not exists supersedes_activity_id uuid references public.activities(id);

create index if not exists activities_supersedes_idx on public.activities(supersedes_activity_id)
  where supersedes_activity_id is not null;
create unique index if not exists activities_one_version_draft on public.activities(supersedes_activity_id)
  where supersedes_activity_id is not null and status='draft';
create unique index if not exists activities_one_version_active on public.activities(supersedes_activity_id)
  where supersedes_activity_id is not null and status='active';

create or replace function public.prevent_confirmed_activity_change() returns trigger as $$
begin
  if old.status in ('active','archived') then
    if tg_op='DELETE' then raise exception 'Una actividad confirmada es inmutable.'; end if;
    if old.status='active' and new.status='archived'
       and to_jsonb(new) - 'status' - 'updated_at' = to_jsonb(old) - 'status' - 'updated_at' then
      return new;
    end if;
    raise exception 'Una actividad confirmada es inmutable.';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger activity_confirmed_immutable before update or delete on public.activities
  for each row execute function public.prevent_confirmed_activity_change();
commit;
