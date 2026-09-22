begin;

alter table public.daily_execution_logs
  add column if not exists current_step_index integer not null default 0 check (current_step_index >= 0);

commit;
