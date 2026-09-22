create unique index if not exists activity_criteria_v4_activity_competency_unique on public.activity_criteria(activity_id, competency_v4_id) where competency_v4_id is not null;
