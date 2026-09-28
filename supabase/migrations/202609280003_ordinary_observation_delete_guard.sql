create function public.reject_ordinary_observation_delete() returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'La observación original no se elimina; usa una revisión de anulación.';
end;
$$;
create trigger ordinary_observation_no_delete before delete on public.ordinary_observations
  for each row execute function public.reject_ordinary_observation_delete();
revoke all on function public.reject_ordinary_observation_delete() from public, anon, authenticated;
