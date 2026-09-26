update public.project_slots s set proposal_id=(p.proposal->'proposed_experiences'->(s.slot_index-1)->>'proposal_id')::uuid
from public.annual_plans p where p.id=s.annual_plan_id and s.proposal_id is null
  and p.proposal->'proposed_experiences'->(s.slot_index-1)->>'proposal_id'
    ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

update public.learning_experiences e set source_proposal_id=(p.proposal->'proposed_experiences'->e.source_proposal_index->>'proposal_id')::uuid
from public.annual_plans p where p.id=e.annual_plan_id and e.source_proposal_id is null
  and p.proposal->'proposed_experiences'->e.source_proposal_index->>'proposal_id'
    ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
