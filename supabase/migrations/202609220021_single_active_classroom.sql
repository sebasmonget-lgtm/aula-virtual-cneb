create unique index if not exists classrooms_one_active_per_teacher on public.classrooms(teacher_id) where status='active';
