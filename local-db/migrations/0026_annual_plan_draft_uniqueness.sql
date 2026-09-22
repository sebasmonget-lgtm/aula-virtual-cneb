create unique index if not exists annual_plans_single_draft_per_classroom_year
  on annual_plans(classroom_id, school_year_id)
  where status = 'draft';
