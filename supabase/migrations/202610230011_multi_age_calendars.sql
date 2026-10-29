create table multi_age_calendars (
 classroom_id uuid primary key references classrooms(id),
 definition jsonb not null,
 confirmed_by uuid not null references profiles(user_id),
 confirmed_at timestamptz not null default now()
);
alter table multi_age_calendars enable row level security;
create policy multi_age_calendar_owner on multi_age_calendars for select to authenticated using(exists(select 1 from classrooms c join school_years sy on sy.id=c.school_year_id where c.id=classroom_id and c.teacher_id=auth.uid() and sy.owner_id=auth.uid()));
grant select on multi_age_calendars to authenticated;
create function guard_multi_age_calendar() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if current_user in ('authenticated','anon') then raise exception 'El calendario requiere validación en servidor.' using errcode='42501'; end if;
 if tg_op<>'INSERT' then raise exception 'El calendario confirmado se conserva con su año.'; end if;
 if not exists(select 1 from classrooms c join school_years sy on sy.id=c.school_year_id where c.id=new.classroom_id and c.curriculum_contract_version=2 and c.status='active' and c.teacher_id=new.confirmed_by and sy.owner_id=new.confirmed_by)
  or new.definition->>'contract' is distinct from 'multi-age-institutional-calendar-v1' then raise exception 'Calendario incompatible con el aula.' using errcode='42501'; end if;
 return new;
end $$;
create trigger multi_age_calendar_guard before insert or update or delete on multi_age_calendars for each row execute function guard_multi_age_calendar();
