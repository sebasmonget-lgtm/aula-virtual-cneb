# Contratos y routing de IA

## Límites comunes

Toda generación productiva se ejecuta en servidor. `prepareAIRequestV4()` construye un `AIContextBundle` filtrado; `OpenAIProvider` recibe ese bundle, el plan central y un schema de Structured Outputs estricto. El proveedor no elige modelos ni reintenta (`maxRetries: 0`). Edad, competencias permitidas, calendario, fuentes, versiones y confirmación se vuelven a validar en código.

No se envían nombres, rutas privadas, fotos, grabaciones, archivos completos ni UUID innecesarios por defecto. Assessment, conclusión e informe familiar usan contexto anonimizado. La IA produce borradores editables; nunca confirma una valoración, convierte evidencia esperada en observación real ni sustituye la decisión docente.

## Política GPT-6 v2.0.0

`src/lib/ai-execution-router-v4.mjs` es la única fuente de modelos y razonamiento:

| Tier | Modelo | Reasoning | Uso |
| --- | --- | --- | --- |
| `structured_light` | GPT-6 Luna | low | clasificación cerrada y mejora breve de texto |
| `routine_generation` | GPT-6 Luna | medium | actividad |
| `focused_writing` | GPT-6 Sol | low | comunicación clara a familias y fallback de actividad |
| `judgment_generation` | GPT-6 Sol | medium | proyecto, unidad, criterio, valoración y conclusiones |
| `deep_planning` | GPT-6 Astra | high | Plan Anual |

Plan Anual usa Astra/high; Proyecto y Unidad, Sol/medium; Actividad, Luna/medium; criterio/evidencia, valoración y conclusión, Sol/medium; informe familiar, Sol/low. La transcripción explícita de audio continúa en `gpt-4o-mini-transcribe`; la corrección factual posterior usa el tier `structured_light`.

Actividad tiene un solo fallback permitido: Luna/medium → Sol/low, con el mismo bundle, schema y Skill. Solo se activa por salida estructurada inválida, referencia curricular fuera del bundle u otra validación local de contenido. Nunca se activa por clave ausente, autenticación, rate limit, timeout o conectividad. La auditoría conserva ambos intentos en servidor y no expone modelos en la interfaz.

## Diagnóstico y tareas deterministas

El diagnóstico principal sigue en código y requiere revisión docente. Las ayudas opcionales tienen workflows separados: `diagnostic_individual_assist`, `diagnostic_group_synthesis` y `diagnostic_priority_assist`, todos con Sol/medium, contratos estrictos y fuentes anonimizadas. `evidence_capture` y `today_mode` permanecen en código.

Las tareas genéricas `decision` y el proveedor TypeSafe/Jev no tienen ruta productiva. `workshop` y `material_generation` se declaran no disponibles hasta contar con contrato, provider y benchmark. Sus modelos previstos son Luna/medium para Taller y Luna/low para material, con posible fallback Sol/low para material; esta previsión no habilita llamadas.

## Prompts y Skills

- Plan Anual: `skills/crear-plan-anual/`; recibe visión grupal y prioridades confirmadas, contexto anual, calendario y CNEB filtrado por edad. No replantea decisiones ya confirmadas.
- Proyecto/Unidad: `skills/crear-proyecto-unidad/`; recibe la propuesta anual confirmada, decisiones docentes, fechas lectivas y competencias permitidas.
- Actividad: `skills/crear-actividad/`; recibe Project Master confirmado, fila elegida, vecinas, posición y contexto actualizado. Solo desarrolla una actividad.
- Diagnóstico: `skills/crear-evaluacion-diagnostica/`; las asistencias reciben únicamente las fuentes seguras necesarias para su etapa.

Los schemas y validadores locales definen el contrato final. Las instrucciones extensas permanecen en las Skills y sus `references/`; los prompts de servicio solo describen la acción concreta.

## Evaluación de modelos

La suite `evals/ai-routing-v4/` está separada de los unit tests y requiere `AYNI_RUN_MODEL_EVALS=1` más una clave configurada. Incluye fixtures ficticios de los ocho workflows productivos, métricas automáticas, tokens, latencia, costo opcional mediante una tabla externa y una plantilla de revisión pedagógica ciega.

El inventario completo de rutas activas, previstas y deterministas está en `docs/AI_WORKFLOW_INVENTORY.md`.
