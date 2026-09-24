-- Allow one draft beside the confirmed plan while the teacher reviews a replacement.
-- Confirmation still archives the former active version in one transaction.
drop index if exists annual_plans_one_current_per_account_year;
create unique index if not exists annual_plans_one_active_per_account_year
  on annual_plans(school_year_id) where status = 'active';
create unique index if not exists annual_plans_one_draft_per_account_year
  on annual_plans(school_year_id) where status = 'draft';
