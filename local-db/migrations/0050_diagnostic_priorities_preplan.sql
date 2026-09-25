create table diagnostic_priority_reviews (
  id uuid primary key,
  classroom_id uuid not null references classrooms(id),
  group_review_id uuid not null references diagnostic_group_reviews(id),
  version integer not null check (version > 0),
  status text not null check (status in ('draft', 'confirmed')),
  details jsonb not null default '{}'::jsonb,
  ai_snapshot jsonb not null default '{}'::jsonb,
  source_snapshot jsonb not null default '{}'::jsonb,
  created_by uuid not null references profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  teacher_confirmed_at timestamptz,
  unique(group_review_id,version)
);
create unique index diagnostic_priority_one_draft_idx on diagnostic_priority_reviews(group_review_id) where status='draft';
create trigger diagnostic_priority_immutable before update or delete on diagnostic_priority_reviews
  for each row execute function prevent_confirmed_diagnostic_change();

insert into diagnostic_priority_reviews
  (id,classroom_id,group_review_id,version,status,details,source_snapshot,created_by,teacher_confirmed_at)
select gen_random_uuid(),g.classroom_id,g.id,1,'confirmed',
  jsonb_build_object('priorities',coalesce((select jsonb_agg(jsonb_build_object(
    'title',p->>'reason','reason',p->>'reason',
    'related_competency_ids',jsonb_build_array(p->>'competency_id'),
    'importance',case p->>'emphasis' when 'prioritize' then 'higher' when 'observe_more' then 'observe_more' else 'normal' end))
    from jsonb_array_elements(coalesce(g.details->'competency_priorities','[]'::jsonb)) p),'[]'::jsonb)),
  jsonb_build_object('legacy_group_review_id',g.id),g.created_by,g.teacher_confirmed_at
from diagnostic_group_reviews g where g.status='confirmed';

alter table diagnostic_student_reviews add column if not exists ai_snapshot jsonb not null default '{}'::jsonb;
alter table diagnostic_group_reviews add column if not exists ai_snapshot jsonb not null default '{}'::jsonb;
alter table school_years add column if not exists annual_planning_context jsonb not null default '{}'::jsonb;
alter table annual_plans add column if not exists source_priority_review_id uuid references diagnostic_priority_reviews(id);
alter table annual_plans add column if not exists preplan_confirmed_at timestamptz;

alter table project_slots drop constraint if exists project_slots_slot_index_check;
alter table project_slots add constraint project_slots_slot_index_check check(slot_index > 0);
