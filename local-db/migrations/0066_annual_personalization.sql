create table annual_personalization_reviews (
  id uuid primary key,
  classroom_id uuid not null references classrooms(id),
  school_year_id uuid not null references school_years(id),
  version integer not null check (version > 0),
  status text not null check (status in ('draft','confirmed')),
  proposal jsonb not null default '{}'::jsonb,
  details jsonb not null default '{}'::jsonb,
  source_refs jsonb not null default '[]'::jsonb,
  source_fingerprint text not null,
  created_by uuid not null references profiles(user_id),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unique(classroom_id,school_year_id,version)
);
create unique index annual_personalization_one_draft_idx on annual_personalization_reviews(classroom_id,school_year_id) where status='draft';
alter table annual_plans add column source_personalization_review_id uuid references annual_personalization_reviews(id);
