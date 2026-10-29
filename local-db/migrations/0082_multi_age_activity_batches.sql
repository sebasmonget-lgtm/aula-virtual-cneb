-- Reuse the private durable queue; no rewrite or conversion of existing classrooms.
alter table multi_age_generation_jobs drop constraint multi_age_generation_jobs_kind_check;
alter table multi_age_generation_jobs add constraint multi_age_generation_jobs_kind_check check(kind in ('diagnostic','annual','activity','conversation','activity_batch'));
