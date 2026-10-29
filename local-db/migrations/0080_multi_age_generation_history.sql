-- A stale result must not be offered for application, but its original output is historical data.
alter table multi_age_generation_jobs drop constraint multi_age_generation_jobs_check;
alter table multi_age_generation_jobs add constraint multi_age_generation_result_state check(
  (status<>'ready' or result is not null) and (result is null or status in ('ready','stale'))
);
create function preserve_multi_age_generation_result() returns trigger language plpgsql as $$
begin
  if old.result is not null and new.result is distinct from old.result then
    raise exception 'La propuesta original guardada es inmutable.';
  end if;
  return new;
end $$;
create trigger multi_age_generation_result before update on multi_age_generation_jobs for each row execute function preserve_multi_age_generation_result();
