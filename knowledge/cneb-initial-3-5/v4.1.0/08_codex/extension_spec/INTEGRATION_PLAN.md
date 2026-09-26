# Plan de integración para Codex — v4.0.0 → v4.1.0

## 0. Regla principal

**Integrar; no reconstruir.** No editar ni borrar `knowledge/cneb-initial-3-5/v4.0.0/`.

## 1. Auditoría y respaldo

1. Confirmar que HEAD usa v4.0.0 y que las pruebas actuales pasan.
2. Crear commit de respaldo antes de cambios.
3. Leer `00_contract/`, `manifest.json`, `source_registry.json`, `workflow_knowledge_requirements.json`, loader y retrieval actuales.

## 2. Crear la nueva versión

Crear `knowledge/cneb-initial-3-5/v4.1.0/` copiando v4.0.0 como base.

Fusionar, sin duplicar IDs:

- `01_sources/source_registry_additions.json` → `01_sources/source_registry.json`.
- `01_sources/source_claims_additions.jsonl` → source claims/compilación.
- incorporar los módulos de `04_pedagogy/domain_guidance/`, `situation_families/`, `exemplar_patterns/` y `context/`.
- aplicar `05_workflows/workflow_knowledge_requirements_patch.json` semánticamente; no reemplazar ciegamente el archivo actual.
- aplicar los tres patches de reasoning a los archivos de `05_generation/` correspondientes.

## 3. Runtime: mínimo cambio arquitectónico

Los nuevos archivos de `04_pedagogy/*` son **fuentes de mantenimiento**. No es obligatorio cargarlos todos directamente desde `PEDAGOGY_FILES`.

Ruta recomendada:

1. Compilarlos a unidades estrechas de retrieval.
2. Fusionar `06_retrieval/knowledge_units_additions.jsonl` con las 245 unidades actuales.
3. Cambiar en cada unidad integrada `knowledge_base_version` a `4.1.0`.
4. Deduplicar por `id`.
5. Mantener `layers` actuales (`official_reference`, `source_digest`, `semantic`).

Así evitamos inflar `AIContextBundle.knowledge.pedagogical_modules` y dejamos que el retrieval seleccione únicamente conocimiento pertinente.

## 4. Cambios necesarios en el loader

`src/lib/knowledge-base-v4.mjs` actualmente está acoplado a:

- raíz `v4.0.0`;
- `VERSION = "4.0.0"`;
- exactamente 245 unidades.

Modificar para v4.1.0:

- apuntar a `v4.1.0`;
- `VERSION = "4.1.0"`;
- validar `knowledgeUnits.length === manifest.counts.combined_retrieval_units` en vez de `=== 245`;
- conservar `14` competencias y `13` workflows salvo que una modificación deliberada y probada cambie esos contratos;
- validar los nuevos `source_refs`.

**No renombrar necesariamente `loadKnowledgeBaseV4()`**: v4.1 sigue siendo arquitectura v4. Si se renombra, actualizar todos los consumidores y tests.

## 5. Retrieval

Añadir a `workflow_knowledge_requirements.json` los dominios nuevos indicados por el patch:

- `domain_didactics`
- `situation_families`
- `exemplar_patterns`
- `intercultural_context`
- `family_partnership`
- `tutoring_individual`

Reglas:

- filtros deterministas siguen primero;
- con competencia confirmada, excluir unidades de otras competencias;
- edad exacta debe seguir puntuando por encima de unidad 3–5;
- `workflow_scope` es metadata auxiliar: si Codex decide aplicarla como filtro, debe hacerlo con tests; si no, los dominios del workflow ya limitan el corpus;
- fuentes históricas no ganan autoridad sobre PCI/CNEB.

### Multi-competencia

No ampliar a múltiples competencias por llamada en esta migración salvo necesidad real. `ai-context-builder-v4.mjs` hoy lo prohíbe (excepto `family_report`). Mantener ese contrato para evitar una regresión grande.

Para Plan Anual, las familias de situaciones pueden recuperarse por prioridad/relevancia durante la propuesta global; la selección curricular final sigue validándose con el contrato actual.

## 6. Cambios por workflow

### Plan Anual

Nuevo flujo conceptual:

`diagnóstico/contexto → prioridad → competencia → familias de situaciones → organización (proyecto/unidad/taller) → propuesta provisional`

El plan puede indicar `anticipated_opportunity`; nunca afirmar que un detonante ocurrió si no está en contexto.

### Proyecto

Añadir detonante, preguntas, caminos posibles y `decision_points`. No generar un mapa completamente cerrado.

### Actividad

Con competencia confirmada, recuperar:

- age reference oficial;
- didáctica específica;
- una o pocas familias de situaciones pertinentes;
- mediación/evidencia del dominio.

### Assessment/conclusión

`assessment` puede recibir didáctica como **cautela interpretativa**.
`descriptive_conclusion` no debe recuperar `situation_families` por defecto.

## 7. Manifest e integridad

Tras fusionar:

1. establecer todas las versiones a `4.1.0` donde el contrato v4 lo exige;
2. actualizar `manifest.counts.sources` y `combined_retrieval_units`;
3. recalcular SHA-256 de todos los archivos que el loader valida;
4. no incluir este `manifest_extension.json` dentro del manifest de producción salvo que se decida conservarlo como metadata.

## 8. Tests obligatorios

Ejecutar primero las pruebas v4 existentes. Luego añadir casos de `07_quality/retrieval_cases.json` y benchmarks de generación.

Mínimos:

- 3/4/5 siguen siendo las únicas edades válidas;
- 14 tarjetas válidas;
- 13 workflows parsean;
- todos los source_refs existen;
- L2/Religión mantienen aplicabilidad;
- overlay temporal conserva comportamiento;
- una competencia confirmada filtra didáctica de otras competencias;
- 3 años no recibe conocimiento exclusivo de 5 años;
- fuentes históricas no se usan como texto oficial;
- assessment no convierte evidencia esperada en observada;
- descriptive_conclusion no recibe familias hipotéticas por defecto;
- no hay lectura de PDF en runtime.

## 9. Comparación antes/después

Ejecutar los benchmarks de `generation_benchmarks.json` con la misma entrada en v4.0 y v4.1. Revisar especialmente:

- Plan Anual: menos títulos temáticos genéricos, más situaciones auténticas.
- Proyecto: más apertura y decisiones infantiles.
- Actividad: menos fichas/consignas mecánicas y mejor mediación específica.
- Criterio/evidencia: actuaciones más auténticas.

No aprobar v4.1 solo porque la salida sea más larga.

## 10. No hacer

- No borrar v4.0.0.
- No modificar routing/modelos.
- No meter PDFs en runtime.
- No meter recursos concretos de la Biblioteca en la KB pedagógica.
- No activar EIB si el contexto no lo justifica.
- No convertir tiempos/frecuencias de talleres históricos en norma actual.
