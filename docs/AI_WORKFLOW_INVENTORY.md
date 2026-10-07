# Inventario de workflows de IA

## Recorrido vigente — 2026-10-07

Política `AI_ROUTING_POLICY` v4.0.0; ADR 119. Los contratos históricos de abajo conservan lectores y recuperación, pero no describen la experiencia moderna.

| Operación moderna | Ejecución efectiva |
| --- | --- |
| Síntesis diagnóstica con afirmaciones trazables | GPT-6.1 Sol high; observación, reporte familiar y comentario docente separados |
| Conversación anual, conversación de proyecto y conversación de tarjeta nueva | GPT-6 Luna medium; hasta tres respuestas docentes |
| Mi año | Una generación GPT-6.1 Sol high; quince tramos y validación por código; una reparación condicional medium |
| Nueva tarjeta | GPT-6.1 Sol medium; una reparación condicional, sin revisión rutinaria |
| Movimiento, intercambio, retiro, asignación de fechas y cobertura | Código; cero llamadas |
| Project Master | Una generación GPT-6.1 Sol high que incluye criterios, recorrido y blueprints; una reparación condicional |
| Preview, Dependents y documento formal del proyecto | Código; no son pasos IA modernos |
| Actividad desde blueprint confirmado | GPT-6 Luna medium; fallback GPT-6.1 Sol low solo por validación |
| Taller opcional solicitado | GPT-6 Luna medium directo; fallback GPT-6.1 Sol low solo por validación; sin Workshop Master |
| Realineación del criterio | GPT-6.1 Sol medium únicamente por cambio confirmado de propósito/acciones infantiles; logística no habilita IA |
| Assessment Context | Código determinista, con actividades realizadas, criterios y CNEB; sin familia ni calificación |
| Análisis de evidencia | GPT-6 Luna medium; actuaciones de aula originales, sin reporte familiar ni nota final |
| Conclusión descriptiva | GPT-6 Luna medium; evidencia original y nivel confirmado por docente; análisis previo auxiliar |
| Informe familiar | GPT-6 Luna medium; secciones de logro copiadas por código, familia solo en recomendaciones; acuerdos escritos por docente |
| Consolidado y cierre | Código; se conserva lectura de informes históricos del aula |

Las generaciones anuales modernas usan Responses background con `store:false`. El job guarda el ID únicamente en servidor y recupera la misma respuesta en consultas separadas. Una consulta pendiente no incrementa generaciones ni repite la petición inicial. La expiración requiere un reintento docente explícito con aviso de generación nueva. QA detallado solo registra fixtures ficticias explícitas fuera de Production.

## Inventario histórico — 2026-09-26

Auditoría anterior con política v3.0.0. No usar esta tabla para presupuestar ni activar el recorrido moderno.

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
