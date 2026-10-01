create table public.annual_personalization_reviews (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id),
  school_year_id uuid not null references public.school_years(id),
  version integer not null check (version > 0),
  status text not null check (status in ('draft','confirmed')),
  proposal jsonb not null default '{}'::jsonb,
  details jsonb not null default '{}'::jsonb,
  source_refs jsonb not null default '[]'::jsonb,
  source_fingerprint text not null,
  created_by uuid not null references public.profiles(user_id),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unique(classroom_id,school_year_id,version)
);
create unique index annual_personalization_one_draft_idx on public.annual_personalization_reviews(classroom_id,school_year_id) where status='draft';
create trigger annual_personalization_immutable before update or delete on public.annual_personalization_reviews
  for each row execute function public.prevent_confirmed_diagnostic_change();
alter table public.annual_personalization_reviews enable row level security;
create policy annual_personalization_own_read on public.annual_personalization_reviews for select to authenticated
  using (created_by=(select auth.uid()) and private.owns_classroom(classroom_id) and private.owns_school_year(school_year_id));
revoke all on public.annual_personalization_reviews from anon, authenticated;
grant select on public.annual_personalization_reviews to authenticated;
alter table public.annual_plans add column source_personalization_review_id uuid references public.annual_personalization_reviews(id);
