-- school_years.owner_id identifica la cuenta; conservar versiones archivadas.
-- Resolver duplicados vigentes antes de aplicar la restricción.
alter table public.annual_plans add column if not exists document_context jsonb not null default '{}'::jsonb;

create unique index if not exists annual_plans_one_current_per_account_year
  on public.annual_plans(school_year_id)
  where status in ('draft', 'active');
