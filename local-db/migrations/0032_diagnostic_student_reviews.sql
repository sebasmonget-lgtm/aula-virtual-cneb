create table diagnostic_student_reviews (
  id uuid primary key,
  classroom_id uuid not null references classrooms(id),
  student_id uuid not null references students(id),
  version integer not null check (version > 0),
  status text not null check (status in ('draft', 'confirmed')),
  details jsonb not null,
  source_snapshot jsonb not null,
  created_by uuid not null references profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  teacher_confirmed_at timestamptz,
  unique(student_id, version)
);
create unique index diagnostic_student_review_one_draft_idx
  on diagnostic_student_reviews(student_id) where status = 'draft';
create index diagnostic_student_review_classroom_idx
  on diagnostic_student_reviews(classroom_id, student_id, version desc);
create trigger diagnostic_student_review_immutable before update or delete on diagnostic_student_reviews
  for each row execute function prevent_confirmed_diagnostic_change();
