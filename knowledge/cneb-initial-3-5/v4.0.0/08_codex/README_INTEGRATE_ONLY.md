# CODEX — INTEGRAR, NO RECONSTRUIR

Paquete: Ayni_Aula_CNEB_Initial_3_5_AI_KnowledgeBase_v4.0.0

Ya está estructurado para Ayni Aula. No recrear documentos desde PDFs.

## Destino
Integrar versionado en una ruta equivalente a:
`knowledge/cneb-initial-3-5/v4.0.0/`
No sobrescribir v3.0.0.

## Arquitectura
Implementar `buildAIContext(...)`.
Toda IA debe pasar por:
- `05_workflows/workflow_knowledge_requirements.json`
- `05_workflows/context_builder_contract.json`

## Retrieval
Corpus principal:
`06_retrieval/combined_knowledge_units.jsonl`

Filtros deterministas primero:
workflow -> age -> competency_id (si confirmado) -> applicability -> temporal_scope.
Después ranking local por texto/tags/prioridad.
No embeddings externos todavía.

## Selección curricular
Usar tarjetas completas:
`03_semantic/competency_cards.jsonl`
No enviar solo ID+nombre a un clasificador semántico.

## Referencia curricular
Usar:
`02_official_reference/curriculum_reference.json`
para nombre canónico, capacidades, referencia de ciclo y edad.
Los resúmenes de desempeño son semánticos, no citas literales.

## Trazabilidad
Cada contexto:
{
  "knowledge_base_version":"4.0.0",
  "knowledge_unit_ids":[],
  "source_claim_ids":[],
  "source_refs":[],
  "competency_ids":[]
}

## Tests mínimos
- v4.0.0
- 14 competencias
- edad 3/4/5 únicamente
- source_refs válidos
- workflows parsean
- invalid age/workflow rechazado
- overlay 2026 excluido por defecto
- L2 y Religión filtrados por aplicabilidad
- competencia confirmada reduce contexto
- estados sin desempeño específico no fabrican desempeño
- provenance retornada
- ninguna lectura de PDF en runtime

## No hacer aún
No Jev externo, GPT, vector DB, deploy ni nueva ingestión PDF.
Primero integración + retrieval local + context builder + tests.

Commits sugeridos:
1. feat: integrate Initial 3-5 knowledge base v4
2. feat: add workflow-scoped AI context builder
3. test: validate knowledge retrieval and context bundles
