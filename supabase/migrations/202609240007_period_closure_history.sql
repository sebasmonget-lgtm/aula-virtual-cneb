begin;
create table public.period_closure_versions (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id),
  evaluation_period_id uuid not null references public.evaluation_periods(id),
  version integer not null check (version > 0),
  source_fingerprint text not null,
  confirmed_by uuid not null references auth.users(id),
  confirmed_at timestamptz not null default now(),
  manifest jsonb not null,
  unique (classroom_id,evaluation_period_id,version)
);
alter table public.period_closures add column current_version_id uuid references public.period_closure_versions(id);

create function public.prevent_period_closure_version_change() returns trigger as $$
begin
  raise exception 'Un cierre documental es inmutable.';
end;
$$ language plpgsql;
create trigger period_closure_version_immutable before update or delete on public.period_closure_versions
  for each row execute function public.prevent_period_closure_version_change();

alter table public.period_closure_versions enable row level security;
create policy period_closure_versions_own on public.period_closure_versions for select to authenticated
  using (public.owns_classroom(classroom_id) and exists (
    select 1 from public.evaluation_periods p join public.classrooms c on c.school_year_id=p.school_year_id
    where p.id=evaluation_period_id and c.id=classroom_id));
revoke insert,update,delete on public.period_closure_versions from authenticated;
commit;
