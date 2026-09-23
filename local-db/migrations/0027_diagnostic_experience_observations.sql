-- Append-only observations for diagnostic experiences. The teacher may observe
-- the same child and aspect many times, including on different days.
create table diagnostic_experience_observations (
  id uuid primary key,
  classroom_id uuid not null references classrooms(id),
  student_id uuid not null references students(id),
  experience_id text not null,
  aspect_id text not null,
  competency_v4_id text not null,
  observation_status text not null check (observation_status in (
    'demonstrated', 'with_support', 'not_yet_demonstrated', 'insufficient_information'
  )),
  observation_text text check (observation_text is null or char_length(observation_text) between 1 and 4000),
  observed_at timestamptz not null default now(),
  created_by uuid not null references profiles(user_id)
);

create index diagnostic_experience_classroom_idx
  on diagnostic_experience_observations(classroom_id, experience_id, observed_at desc);
create index diagnostic_experience_student_idx
  on diagnostic_experience_observations(student_id, observed_at desc);
