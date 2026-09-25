create table public.annual_plan_formal_content (
  annual_plan_id uuid primary key references public.annual_plans(id),
  content jsonb not null,
  ai_metadata jsonb not null default '{}'::jsonb,
  source_revision integer not null,
  created_at timestamptz not null default now()
);
alter table public.annual_plan_formal_content enable row level security;
create policy annual_formal_own_read on public.annual_plan_formal_content for select to authenticated
  using (exists(select 1 from public.annual_plans ap where ap.id=annual_plan_id and private.owns_classroom(ap.classroom_id)));
revoke all on public.annual_plan_formal_content from anon, authenticated;
grant select on public.annual_plan_formal_content to authenticated;
