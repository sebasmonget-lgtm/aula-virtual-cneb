begin;
alter table public.annual_plans
  add column if not exists supersedes_plan_id uuid references public.annual_plans(id),
  add column if not exists source_diagnostic_review_id uuid references public.diagnostic_group_reviews(id),
  add column if not exists source_context_fingerprint text;

create index if not exists annual_plans_supersedes_idx on public.annual_plans(supersedes_plan_id)
  where supersedes_plan_id is not null;

update public.annual_plans plan set source_diagnostic_review_id=review.id,
  source_context_fingerprint=nullif(plan.document_context->>'source_context_fingerprint','')
from public.diagnostic_group_reviews review
where plan.source_diagnostic_review_id is null and plan.document_context->>'source_diagnostic_review_id'=review.id::text
  and review.classroom_id=plan.classroom_id and review.status='confirmed';

update public.annual_plans draft set supersedes_plan_id=previous.id
from public.annual_plans previous
where draft.status='draft' and previous.status='active'
  and draft.classroom_id=previous.classroom_id and draft.school_year_id=previous.school_year_id
  and draft.version>previous.version and draft.supersedes_plan_id is null
  and (previous.proposal->>'plan_format') is distinct from 'twelve_projects_flexible_weeks'
  and draft.proposal->>'plan_format'='twelve_projects_flexible_weeks';

create or replace function public.prevent_confirmed_annual_plan_change() returns trigger as $$
begin
  if old.status in ('active', 'archived') then
    if tg_op = 'DELETE' then raise exception 'Un plan anual confirmado es inmutable.'; end if;
    if old.status = 'active' and new.status = 'archived'
       and to_jsonb(new) - 'status' - 'updated_at' = to_jsonb(old) - 'status' - 'updated_at' then
      return new;
    end if;
    raise exception 'Un plan anual confirmado es inmutable.';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger annual_plan_confirmed_immutable before update or delete on public.annual_plans
  for each row execute function public.prevent_confirmed_annual_plan_change();
commit;
