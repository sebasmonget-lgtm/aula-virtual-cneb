alter table public.learning_experiences add column if not exists source_proposal_id uuid;
alter table public.project_slots add column if not exists proposal_id uuid;

update public.project_slots s set proposal_id=(p.proposal->'proposed_experiences'->(s.slot_index-1)->>'proposal_id')::uuid
from public.annual_plans p where p.id=s.annual_plan_id and s.proposal_id is null
  and p.proposal->'proposed_experiences'->(s.slot_index-1)->>'proposal_id'
    ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
update public.learning_experiences e set source_proposal_id=(p.proposal->'proposed_experiences'->e.source_proposal_index->>'proposal_id')::uuid
from public.annual_plans p where p.id=e.annual_plan_id and e.source_proposal_id is null
  and p.proposal->'proposed_experiences'->e.source_proposal_index->>'proposal_id'
    ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

create unique index if not exists project_slots_proposal_unique
  on public.project_slots(annual_plan_id,proposal_id) where proposal_id is not null;
create unique index if not exists learning_experiences_plan_proposal_root_unique
  on public.learning_experiences(annual_plan_id,source_proposal_id)
  where origin='planned' and supersedes_experience_id is null and source_proposal_id is not null;

create table public.experience_formal_contents (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null unique references public.learning_experiences(id),
  content jsonb not null,
  source_revision bigint not null,
  generation_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.experience_formal_contents enable row level security;
create policy experience_formal_contents_own_read on public.experience_formal_contents for select to authenticated
  using (exists(select 1 from public.learning_experiences e
    where e.id=experience_id and private.owns_classroom(e.classroom_id)));
revoke all on public.experience_formal_contents from anon, authenticated;
grant select on public.experience_formal_contents to authenticated;
