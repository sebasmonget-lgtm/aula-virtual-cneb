# Inventario de workflows de IA

Fecha de auditoría: 2026-09-26. Política: `AI_ROUTING_POLICY` v2.0.0.

| Workflow | Estado real | Origen productivo | Modelo vigente | Contrato / validación |
| --- | --- | --- | --- | --- |
| `annual_plan` | Productivo | preplan, Plan Anual v4 y redacción formal | GPT-6 Astra / high | `annual-plan-v2`, desarrollo/formal y validadores anuales |
| `project` | Productivo | flujo Project Master y compatibilidad v4 | GPT-6 Sol / medium | schemas de preview, dependencias, master y `project-v2` |
| `unit` | Productivo | flujo Unit v4 | GPT-6 Sol / medium | `unit-v2` y validación local |
| `activity` | Productivo | actividad bajo demanda | GPT-6 Luna / medium | `activity-v1`; fallback único GPT-6 Sol / low por calidad |
| `criterion_and_evidence` | Productivo | criterio de actividad | GPT-6 Sol / medium | `criterion-evidence-v1` |
| `assessment` | Productivo | evaluación por niño, competencia y período | GPT-6 Sol / medium | `assessment-v2`; nivel final docente |
| `descriptive_conclusion` | Productivo | conclusión de valoración confirmada | GPT-6 Sol / medium | `descriptive-conclusion-v1` |
| `family_report` | Productivo | informe familiar desde conclusiones confirmadas | GPT-6 Sol / low | `family-report-v1` |
| `diagnostic` | Código | diagnóstico publicado y confirmación | Sin modelo | reglas y snapshots deterministas |
| `diagnostic_individual_assist` | Asistencia opcional | comentario individual | GPT-6 Sol / medium | `diagnostic-student-suggestion-v1` |
| `diagnostic_group_synthesis` | Asistencia opcional | “Así está mi grupo” | GPT-6 Sol / medium | `diagnostic-group-suggestion-v2` |
| `diagnostic_priority_assist` | Asistencia opcional | prioridades anuales | GPT-6 Sol / medium | `diagnostic-priorities-v1` |
| `observation_rewrite` | Productivo y explícito | mejorar transcripción | GPT-6 Luna / low | JSON estricto de texto mejorado |
| `observation_competency_suggestion` | Productivo y revisable | clasificación cerrada de observación | GPT-6 Luna / low | IDs dentro de opciones de edad |
| `audio_transcription` | Productivo y explícito | audio máximo de un minuto | `gpt-4o-mini-transcribe` | validación de tipo, tamaño y duración |
| `evidence_capture` | Código | registro factual | Sin modelo | autorización y validación local |
| `today_mode` | Código | jornada, horarios y siguiente acción | Sin modelo | estado derivado en código |
| `workshop` | No disponible | no existe generación v4 completa | Previsto Luna / medium | falta contrato productivo |
| `material_generation` | No disponible | no existe generación v4 completa | Previsto Luna / low | falta contrato productivo; Sol/low sería fallback de calidad |
| tareas `decision` | No disponibles | sin provider productivo | Sin modelo | TypeSafe/Jev queda fuera de producción |

## Auditoría y privacidad

La metadata segura de servidor conserva provider, modelo, reasoning, response ID, usage, versión de routing y datos de fallback. La UI recibe únicamente la propuesta y un identificador opaco de generación. Los precios no forman parte de la lógica pedagógica; una evaluación puede cargarlos desde un archivo externo versionado por fecha.

## Reversión

La política puede volver al commit de respaldo `973ea5c` sin migración de datos. Las propuestas ya confirmadas, fingerprints, schemas y relaciones curriculares permanecen válidos porque el cambio solo afecta selección de modelo, fallback y auditoría.
