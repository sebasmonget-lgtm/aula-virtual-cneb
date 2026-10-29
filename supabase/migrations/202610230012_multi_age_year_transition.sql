create table multi_age_year_transitions (
 id uuid primary key, teacher_id uuid not null references profiles(user_id),
 previous_classroom_id uuid not null unique references classrooms(id),
 classroom_id uuid not null unique references classrooms(id),
 manifest jsonb not null, confirmed_at timestamptz not null default now(),
 check(previous_classroom_id<>classroom_id)
);
create function guard_multi_age_year_transition() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if current_user in ('authenticated','anon') then raise exception 'La transición anual requiere validación de servidor.' using errcode='42501'; end if;
 if tg_op<>'INSERT' then raise exception 'La transición anual confirmada es inmutable.'; end if;
 if new.manifest->>'contract' is distinct from 'multi-age-year-transition-v1' or not exists(select 1 from classrooms old_c join school_years old_y on old_y.id=old_c.school_year_id join classrooms new_c on new_c.id=new.classroom_id join school_years new_y on new_y.id=new_c.school_year_id
  where old_c.id=new.previous_classroom_id and old_c.teacher_id=new.teacher_id and new_c.teacher_id=new.teacher_id and old_y.owner_id=new.teacher_id and new_y.owner_id=new.teacher_id and old_c.status='archived' and new_c.status='active' and old_c.curriculum_contract_version=2 and new_c.curriculum_contract_version=2 and new_y.year=old_y.year+1) then raise exception 'Años o titular de la transición incompatibles.' using errcode='42501'; end if;
 return new;
end $$;
create trigger multi_age_year_transition_guard before insert or update or delete on multi_age_year_transitions for each row execute function guard_multi_age_year_transition();

alter table multi_age_year_transitions enable row level security;
create policy multi_age_year_transition_owner on multi_age_year_transitions for select to authenticated using(teacher_id=auth.uid() and exists(select 1 from classrooms c join school_years sy on sy.id=c.school_year_id where c.id=previous_classroom_id and c.teacher_id=auth.uid() and sy.owner_id=auth.uid()));
grant select on multi_age_year_transitions to authenticated;
