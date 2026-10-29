-- Existing owner RLS and immutable result history apply to batches as well.
alter table public.multi_age_generation_jobs drop constraint multi_age_generation_jobs_kind_check;
alter table public.multi_age_generation_jobs add constraint multi_age_generation_jobs_kind_check check(kind in ('diagnostic','annual','activity','conversation','activity_batch'));
