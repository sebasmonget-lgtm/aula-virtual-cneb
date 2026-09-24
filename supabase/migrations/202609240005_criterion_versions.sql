begin;
alter table public.activity_criteria
  add column if not exists version integer not null default 1,
  add column if not exists supersedes_criterion_id uuid references public.activity_criteria(id);

drop index if exists public.activity_criteria_v4_activity_competency_unique;
create unique index activity_criteria_v4_active_unique on public.activity_criteria(activity_id,competency_v4_id)
  where competency_v4_id is not null and status='active';
create unique index activity_criteria_v4_draft_unique on public.activity_criteria(activity_id,competency_v4_id)
  where competency_v4_id is not null and status='draft';
create unique index activity_criteria_one_version_draft on public.activity_criteria(supersedes_criterion_id)
  where supersedes_criterion_id is not null and status='draft';

create or replace function public.prevent_confirmed_criterion_change() returns trigger as $$
begin
  if old.status in ('active','archived') then
    if tg_op='DELETE' then raise exception 'Un criterio confirmado es inmutable.'; end if;
    if old.status='active' and new.status='archived'
       and to_jsonb(new) - 'status' - 'updated_at' = to_jsonb(old) - 'status' - 'updated_at' then
      return new;
    end if;
    raise exception 'Un criterio confirmado es inmutable.';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger criterion_confirmed_immutable before update or delete on public.activity_criteria
  for each row execute function public.prevent_confirmed_criterion_change();
commit;
