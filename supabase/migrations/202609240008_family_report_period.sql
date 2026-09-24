begin;
alter table public.family_reports add column evaluation_period_id uuid references public.evaluation_periods(id);
create index family_reports_formal_period on public.family_reports(evaluation_period_id,student_id);

update public.family_reports fr set evaluation_period_id=matched.period_id
from (
  select report.id,max(p.id::text)::uuid as period_id
  from public.family_reports report join public.students s on s.id=report.student_id
  join public.classrooms c on c.id=s.classroom_id
  join public.evaluation_periods p on p.school_year_id=c.school_year_id
    and p.starts_on=report.period_start and p.ends_on=report.period_end
  where report.evaluation_period_id is null
  group by report.id having count(*)=1
) matched where fr.id=matched.id;

create function public.check_family_report_period_link() returns trigger as $$
begin
  if new.evaluation_period_id is not null and not exists (
    select 1 from public.students s join public.classrooms c on c.id=s.classroom_id
    join public.evaluation_periods p on p.school_year_id=c.school_year_id
    where s.id=new.student_id and p.id=new.evaluation_period_id
      and p.starts_on=new.period_start and p.ends_on=new.period_end
  ) then raise exception 'El informe no corresponde al período del estudiante.'; end if;
  return new;
end;
$$ language plpgsql;
create trigger family_report_period_integrity before insert or update on public.family_reports
  for each row execute function public.check_family_report_period_link();
commit;
