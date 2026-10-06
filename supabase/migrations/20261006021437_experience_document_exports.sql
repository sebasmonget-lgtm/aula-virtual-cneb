alter table public.document_artifacts drop constraint document_artifacts_source_kind_check;
alter table public.document_artifacts add constraint document_artifacts_source_kind_check
  check(source_kind in ('annual_plan','experience','diagnostic_summary','activity','family_report','period_closure'));
alter table public.preparation_jobs drop constraint preparation_jobs_kind_check;
alter table public.preparation_jobs add constraint preparation_jobs_kind_check
  check(kind in ('project','activity_block','document_export'));
