create table if not exists period_closure_versions (
  id uuid primary key,
  classroom_id uuid not null references classrooms(id),
  evaluation_period_id uuid not null references evaluation_periods(id),
  version integer not null check (version > 0),
  source_fingerprint text not null,
  confirmed_by uuid not null,
  confirmed_at timestamptz not null default now(),
  manifest jsonb not null,
  unique (classroom_id,evaluation_period_id,version)
);
alter table period_closures add column if not exists current_version_id uuid references period_closure_versions(id);

create or replace function prevent_period_closure_version_change() returns trigger as $$
begin
  raise exception 'Un cierre documental es inmutable.';
end;
$$ language plpgsql;
create trigger period_closure_version_immutable before update or delete on period_closure_versions
  for each row execute function prevent_period_closure_version_change();
