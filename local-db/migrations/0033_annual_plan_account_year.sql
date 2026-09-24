-- Una propuesta vigente por cuenta y año: school_years ya pertenece a una cuenta.
-- Los planes archivados se conservan como historial. Resolver duplicados vigentes
-- antes de aplicar esta migración; nunca se eliminan automáticamente.
alter table annual_plans add column if not exists document_context jsonb not null default '{}'::jsonb;

create unique index if not exists annual_plans_one_current_per_account_year
  on annual_plans(school_year_id)
  where status in ('draft', 'active');
