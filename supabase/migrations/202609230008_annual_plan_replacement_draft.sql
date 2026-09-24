-- Permit a teacher-reviewed replacement draft alongside the confirmed annual plan.
drop index if exists public.annual_plans_one_current_per_account_year;
create unique index if not exists annual_plans_one_active_per_account_year
  on public.annual_plans(school_year_id) where status = 'active';
create unique index if not exists annual_plans_one_draft_per_account_year
  on public.annual_plans(school_year_id) where status = 'draft';
