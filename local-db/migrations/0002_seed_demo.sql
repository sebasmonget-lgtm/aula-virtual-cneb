insert into profiles (user_id, display_name)
values ('00000000-0000-4000-8000-000000000001', 'Marisol Rojas')
on conflict do nothing;

insert into curriculum_versions (id, name, source_url, published_at, active)
values ('10000000-0000-4000-8000-000000000001', 'CNEB Inicial - desarrollo local', 'https://www.minedu.gob.pe/curriculo/', '2016-06-02', true)
on conflict do nothing;

insert into levels (id, name)
values ('20000000-0000-4000-8000-000000000001', 'Educación Inicial')
on conflict do nothing;

insert into age_grades (id, level_id, label, age_years)
values ('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001', '5 años', 5)
on conflict do nothing;

insert into curriculum_areas (id, version_id, level_id, name)
values ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Ciencia y Tecnología')
on conflict do nothing;

insert into competencies (id, area_id, code, official_text)
values ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'CYT-INDAGA', 'Indaga mediante métodos científicos para construir sus conocimientos.')
on conflict do nothing;

insert into performances (id, competency_id, age_grade_id, official_text, source_ref)
values ('60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000005', 'Texto abreviado para desarrollo; reemplazar por el desempeño oficial validado.', 'seed-local-no-oficial')
on conflict do nothing;

insert into school_years (id, owner_id, year, starts_on, ends_on)
values ('70000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 2026, '2026-03-01', '2026-12-31')
on conflict do nothing;

insert into classrooms (id, school_year_id, teacher_id, age_grade_id, institution_name, section)
values ('80000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000005', 'Jardín Los Girasoles', 'Sala Amarilla')
on conflict do nothing;

insert into institution_profiles (id, owner_user_id, display_name)
values ('81000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Jardín Los Girasoles')
on conflict do nothing;

insert into students (id, classroom_id, first_name, last_name, preferred_name) values
  ('90000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001', 'Alessia', 'Vega', 'Alessia'),
  ('90000000-0000-4000-8000-000000000002', '80000000-0000-4000-8000-000000000001', 'Benjamín', 'Flores', 'Benjamín'),
  ('90000000-0000-4000-8000-000000000003', '80000000-0000-4000-8000-000000000001', 'Camila', 'Torres', 'Camila'),
  ('90000000-0000-4000-8000-000000000004', '80000000-0000-4000-8000-000000000001', 'Diego', 'Paredes', 'Diego'),
  ('90000000-0000-4000-8000-000000000005', '80000000-0000-4000-8000-000000000001', 'Emilia', 'Salazar', 'Emilia'),
  ('90000000-0000-4000-8000-000000000006', '80000000-0000-4000-8000-000000000001', 'Fabián', 'Ríos', 'Fabián')
on conflict do nothing;

insert into learning_experiences (id, classroom_id, type, title, purpose, starts_on, ends_on)
values ('a0000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001', 'project', 'Los secretos de nuestro jardín', 'Explorar las necesidades de las plantas mediante observación y conversación.', '2026-09-14', '2026-09-25')
on conflict do nothing;

insert into activities (id, experience_id, occurs_on, title, purpose)
values ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', '2026-09-20', '¿Qué necesitan las plantas para crecer?', 'Formular explicaciones iniciales a partir de la observación.')
on conflict do nothing;

insert into activity_criteria (id, activity_id, competency_id, performance_id, criterion_text)
values ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 'Explica con sus palabras qué cree que necesita una semilla.')
on conflict do nothing;
