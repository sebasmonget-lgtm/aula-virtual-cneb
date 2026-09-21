-- Datos de desarrollo. El texto curricular es deliberadamente abreviado y
-- debe reemplazarse por contenido oficial validado antes de cualquier piloto.
begin;

insert into public.curriculum_versions (id, name, source_url, published_at, active)
values ('10000000-0000-0000-0000-000000000001', 'CNEB Inicial - seed de desarrollo', 'https://www.minedu.gob.pe/curriculo/', '2016-06-02', true)
on conflict do nothing;

insert into public.levels (id, name)
values ('20000000-0000-0000-0000-000000000001', 'Educación Inicial')
on conflict do nothing;

insert into public.age_grades (id, level_id, label, age_years) values
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '3 años', 3),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', '4 años', 4),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', '5 años', 5)
on conflict do nothing;

insert into public.curriculum_areas (id, version_id, level_id, name)
values ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Ciencia y Tecnología')
on conflict do nothing;

insert into public.competencies (id, area_id, code, official_text)
values ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'CYT-INDAGA', 'Texto abreviado de desarrollo: indaga mediante métodos científicos para construir sus conocimientos.')
on conflict do nothing;

commit;
