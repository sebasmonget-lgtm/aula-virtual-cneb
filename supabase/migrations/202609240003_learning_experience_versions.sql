begin;
alter table public.learning_experiences
  add column if not exists version integer not null default 1,
  add column if not exists supersedes_experience_id uuid references public.learning_experiences(id);

create index if not exists learning_experiences_supersedes_idx
  on public.learning_experiences(supersedes_experience_id)
  where supersedes_experience_id is not null;
create unique index if not exists learning_experiences_one_version_draft
  on public.learning_experiences(supersedes_experience_id)
  where supersedes_experience_id is not null and status='draft';

drop index if exists public.learning_experiences_planned_proposal_once;
create unique index learning_experiences_planned_proposal_once
  on public.learning_experiences(annual_plan_id,source_proposal_index)
  where origin='planned' and supersedes_experience_id is null;

create or replace function public.prevent_confirmed_learning_experience_change() returns trigger as $$
begin
  if old.status in ('active','archived') then
    if tg_op='DELETE' then raise exception 'Una experiencia confirmada es inmutable.'; end if;
    if old.status='active' and new.status='archived'
       and to_jsonb(new) - 'status' - 'updated_at' = to_jsonb(old) - 'status' - 'updated_at' then
      return new;
    end if;
    raise exception 'Una experiencia confirmada es inmutable.';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger learning_experience_confirmed_immutable before update or delete on public.learning_experiences
  for each row execute function public.prevent_confirmed_learning_experience_change();
commit;
