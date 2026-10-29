-- Guard the OLD identity too: removing the marker or changing the parent cannot bypass the snapshot guard.
create function retain_multi_age_workshop_identity() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare marker text;
begin
 if tg_table_name='activity_criteria' then
  select details->>'contract_version' into marker from activities where id=old.activity_id;
 else marker:=old.details->>'contract_version';
 end if;
 if marker='multi-age-workshop-v1' then
  if current_user in ('anon','authenticated') then raise exception 'El taller requiere validación en servidor.' using errcode='42501'; end if;
  if (to_jsonb(new)-'status'-'updated_at') is distinct from (to_jsonb(old)-'status'-'updated_at') then raise exception 'Conserva la identidad y el contenido confirmado del taller.'; end if;
 end if;
 return new;
end $$;
create trigger multi_age_workshop_00_identity before update on learning_experiences for each row execute function retain_multi_age_workshop_identity();
create trigger multi_age_workshop_00_identity before update on activities for each row execute function retain_multi_age_workshop_identity();
create trigger multi_age_workshop_00_identity before update on activity_criteria for each row execute function retain_multi_age_workshop_identity();
