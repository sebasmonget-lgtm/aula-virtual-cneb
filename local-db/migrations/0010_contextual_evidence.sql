alter table activity_criteria add column if not exists evidence_kind text check (evidence_kind in ('observation', 'oral', 'drawing', 'production', 'photo', 'movement'));

update activity_criteria set evidence_kind = 'drawing'
 where id = 'c0000000-0000-4000-8000-000000000002' and evidence_kind is null;
