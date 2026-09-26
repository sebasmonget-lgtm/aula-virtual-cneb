# Inventario de workflows de IA

Fecha de auditoría: 2026-09-26. Política: `AI_ROUTING_POLICY` v3.0.0.

| Workflow | Estado | Modelo | Contrato y notas |
| --- | --- | --- | --- |
| `annual_plan` | Productivo | GPT-6 Sol / high; redacción Sol / low | razonamiento anual global en el Master; desarrollo formal desde decisiones confirmadas con `document_development` |
| `project`, `unit` | Productivo | GPT-6 Sol / medium | Project Master confirmado y blueprints de actividades |
| `activity` | Productivo | GPT-6 Luna / medium | desarrolla una fila; fallback único Sol/low por calidad o validación |
| `criterion_and_evidence` | Reemplazado | sin llamada | el criterio normal viene del Project Master |
| `criterion_realignment` | Excepcional | GPT-6 Sol / medium | solo después de un cambio que vuelva incompatible el criterio heredado |
| `assessment_master` | Productivo | GPT-6 Sol / medium | un marco versionado por aula y período; no evalúa niños |
| `assessment` | Productivo | GPT-6 Luna / medium | aplica el marco a un niño y competencia; fallback Sol/medium por validación o revisión profunda |
| `descriptive_conclusion` | Productivo | GPT-6 Luna / medium | parte de una valoración confirmada; fallback Sol/low por calidad |
| `family_report` | Productivo | GPT-6 Luna / medium | usa conclusiones confirmadas, sin releer evidencia original |
| `diagnostic` | Código | sin modelo | cálculo determinista y confirmación docente |
| ayudas diagnósticas | Opcionales | GPT-6 Sol / medium | workflows separados con contexto anonimizado |
| `observation_rewrite`, `observation_competency_suggestion` | Productivo | GPT-6 Luna / low | texto breve y clasificación cerrada revisable |
| `audio_transcription` | Explícito | `gpt-4o-mini-transcribe` | audio máximo de un minuto |
| `evidence_capture`, `today_mode` | Código | sin modelo | reglas y autorización locales |
| `workshop`, `material_generation` | No disponibles | previstos Luna | no habilitan llamadas productivas |

GPT-6 Astra queda fuera de producción normal. Una comparación futura debe ejecutarse como benchmark separado y no como fallback oculto.

## Fallback y auditoría

Los fallbacks conservan workflow, `AIContextBundle`, schema y Skill. Se permiten una sola vez por salida inválida o validación pedagógica definida. No se activan por autenticación, clave, rate limit, timeout o conectividad. `maxRetries` permanece en cero.

La metadata segura de servidor conserva provider, modelo, reasoning, response ID, usage, versión de routing y fallback. La interfaz solo recibe la propuesta y un identificador opaco. La docente confirma las decisiones pedagógicas.

## Reversión

La migración de `assessment_masters` es aditiva. Revertir la UI o la orquestación no elimina marcos, valoraciones ni planes históricos. Los criterios ya materializados en actividades conservan sus IDs y snapshots.
