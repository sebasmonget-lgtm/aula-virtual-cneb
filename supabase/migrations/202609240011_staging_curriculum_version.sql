begin;

-- The application needs one active curriculum version for classroom context.
-- Official competency content remains in the versioned CNEB knowledge base;
-- this row is metadata, not a fabricated performance or competency.
insert into public.curriculum_versions(id, name, source_url, published_at, active)
select '10000000-0000-4000-8000-000000000001',
  'CNEB Inicial · Knowledge Base v4.0.0',
  'https://www.minedu.gob.pe/curriculo/',
  date '2016-06-02', true
where not exists (select 1 from public.curriculum_versions where active);

commit;
