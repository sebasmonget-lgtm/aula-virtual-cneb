-- A saved raw observation remains recoverable, including after a teacher voids it.
create function reject_ordinary_observation_delete() returns trigger language plpgsql as $$
begin
  raise exception 'La observación original no se elimina; usa una revisión de anulación.';
end;
$$;
create trigger ordinary_observation_no_delete before delete on ordinary_observations
  for each row execute function reject_ordinary_observation_delete();
