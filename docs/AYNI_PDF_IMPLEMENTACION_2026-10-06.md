# Ejecución de las instrucciones maestras del 6 de octubre

Base: `codex/release-all-20261005`, `001c17fb6170ce5411aa11af114590e1abf7b3b7`. Fetch completado; HEAD coincide con origin y árbol inicialmente limpio. Fuente: AYNI_Instrucciones_Codex_Referencias.pdf, 15 páginas; se inspeccionó texto completo y referencias visuales. El PDF autoriza commit, push y Preview; excluye producción.

## Auditoría y cambio mínimo

Existen quince tramos, línea temporal horizontal, biblioteca, protección del pasado, calendario efectivo, overrides, snapshots anuales, contexto confirmado separado de conversación, jobs con checkpoints/leases/CAS, aprobación docente, adaptador de observación para Evaluar, cuatro carpetas y Word/ZIP privados. Se reutilizan esos contratos. Nuevo Ayni está activo salvo rollback con 0; se conservan lectores antiguos y rutas de históricos.

Brechas comprobadas: inicio del shell contradice la recomendación del servidor; Mi aula desaparece de navegación principal y solo se accede indirectamente; setup mezcla datos opcionales y dice Dirección; matrícula invita al diagnóstico tras el primer alumno; listado poco visual; ficha anual sin imagen grande; proyecto sencillo expone categorías adicionales y oculta calendario; Hoy usa pasos de texto; captura moderna pierde niño sugerido/criterio; Word consulta solo evidences.

Flujo vertical inicial: guía estructurada desde servidor → momento → observación ordinaria privada con criterio contextual → Evaluar y Word con correcciones vigentes. Después onboarding/Mi aula, ficha anual/proyecto y calendario. No se cambia corpus CNEB, Jev, evaluación final, fuentes históricas ni cuentas. Router actual ya coincide con tiers indicados salvo conversación ligera: se revisará su cometido antes de cambiarlo.

Permisos: joins de propiedad docente/aula en cada proyección y validación de criterio/momento en servidor; no enviar adjuntos a IA. Riesgos: fixtures históricas sin tablas modernas, asignar momentos donde no hay criterio, calendario confirmado invalidado y cierre inferido confundido con realización observada. Pruebas específicas para esas brechas, checks completos, QA ficticio de escritorio/móvil y smoke Preview. Rollback por revert del commit, preservando datos; ningún cambio de migraciones aplicadas. No aprobar automáticamente propósito, competencias, niveles ni regenerar históricos.

## Recibo de validación

Suite amplia: 734/734 PASS con Node/PGlite, incluidos contratos, ownership, CAS, documentos y lectores históricos. Las comprobaciones finales de lint, typecheck y build Next pasaron. Recibo de logs local: `.local/pdf-suite-final.log`, `.local/pdf-lint-final.log`, `.local/pdf-types-final.log`, `.local/pdf-next-build-final.log`. Tras los últimos ajustes: 38/38 pruebas funcionales y 6/6 pruebas de Auth/HTTP PASS. Build Vinext PASS (advertencia existente de tamaño de chunks); lint sin advertencias, typecheck y build Next finales PASS.

QA ficticio, sin datos de menores reales ni llamadas pagadas: docente nueva, setup sin opcionales, dos altas consecutivas, finalización explícita, entrevista parcial confirmada, experiencia diagnóstica modular, momento conservado al escoger niño, matriz, resumen docente confirmado V1 vigente con snapshot `diagnostic-unified-v1`, conversación con contexto extraído y procedencia. La síntesis breve inicial cuenta fuentes y deja la interpretación adicional a la docente; no generaliza una observación individual.

Preparación HTTP con proveedor fixture: quince tramos, diez pasados sin registro y cinco propuestas futuras; primer tramo parcial de tres días (6, 7 y 9 de octubre; el feriado del 8 se excluye). Job de proyecto, Master, bloque completo de tres actividades, revisión/aprobación y Word/ZIP: PASS. Captura ordinaria contextual, retry idempotente, prioridad para la competencia concreta, proyección a Evaluar, Word original, corrección append-only y nuevo artefacto/Word con texto corregido: PASS. Retiro/restauración conserva observación; cierre con nota opcional: PASS. Reloj QA avanzado al 9 de octubre: actividad del 7 sigue pendiente de revisión hasta declarar explícitamente que no se realizó; actividad del día 9 disponible. Recibos: `.local/qa-redesign-20261005-results/verification.json`, `.local/pdf-vertical-observations.json`, `.local/pdf-nextday.json`.

Revisión visual real en navegador: setup, Mi aula, entrevista, experiencia, matriz, resumen y propuesta/proyecto en escritorio 1366 y móvil 390. Detector Impeccable: sin hallazgos en los archivos inspeccionados. Revisor independiente pidió compactar la cabecera móvil y retirar etiqueta/títulos redundantes; ajustes puntuados como `ship` tras recapturar, con alcance a esos dos fixes del proyecto. Detalle en `docs/qa/ayni-pdf-design-review-2026-10-06.md`. No se probó grabación física con micrófono/cámara ni calidad pedagógica de una generación pagada; dictado, cámara/subida y Storage conservan los mecanismos existentes y sus pruebas. Los ejemplos generados por fixture prueban contratos, no calidad de la IA real.

## Cobertura del encargo

| Puntos del PDF | Resultado |
|---|---|
| 1–4 auditoría, identidad, componentes, datos básicos/opcionales | Base remota verificada; shell conservado; setup simplificado y Director(a). |
| 5–6 Mi aula, matrícula y dos rutas de inicio | Selector permanente, altas continuas, tarjetas y finalización explícita; diagnóstico recomendado y Mi año directo. Retiro/restauración reversible sin borrar historia. |
| 7–9 diagnóstico y bloques modulares | Proyección estructurada compartida con Hoy; resumen breve confirmable, con revisión/prioridades avanzadas opcionales. |
| 10–12 contexto, conversación y snapshot | Contexto separado de mensajes y editable; aportes con soporte literal/turno de origen; snapshot y versiones existentes reutilizados. |
| 13–15 año, proyecto y calendario | Quince tramos horizontales intactos, ficha con imagen/propósito/competencias/fechas y Ver proyecto; ajustes opcionales, calendario determinístico visible antes de preparar. |
| 16–17 Master y bloque completo | Jobs/checkpoints/aprobación existentes reutilizados; preparación completa y ZIP comprobados. |
| 18–20 Hoy, captura y prioridad | Guía vertical sin parseo frontend; momentos reales validados en servidor; niño/criterio/contexto conservados; todos los niños seleccionables. |
| 21–22 Word y cierre/jornada posterior | Fuente moderna + legacy autorizada en una proyección; correcciones vigentes y artefacto nuevo; nota opcional y revisión prudente del pasado. |
| 23–24 Evaluar y carpetas documentales | Cuatro módulos/folders existentes conservados; observación moderna alimenta Evaluar sin nivel automático; plantillas Word preservadas. |
| 25 router, QA y publicación | Luna medium para conversación; tiers restantes y Jev preservados. Preview explícito tras commit limpio, push, READY y smoke; producción excluida. |

## Publicación y reversión

Solo cuenta separada `ayni4` y proyecto `ayni-aula-staging`. Antes de publicar, producción es `dpl_aNZN76kJsHBhrR7hnDFVqr8z6eEd`, SHA `001c17fb6170ce5411aa11af114590e1abf7b3b7`. Se detectó que Preview carecía de los flags de captura/evaluación modernas: se añadieron las cuatro variables correspondientes con valor 1 exclusivamente para Preview. Ninguna variable de producción se modifica. Sin migraciones nuevas, secretos nuevos, cambios RLS ni modificación del corpus CNEB. El recibo posterior incluye SHA, URL, READY, smoke y producción intacta en `.local/pdf-preview-smoke.json`, evitando alterar el commit publicado. Rollback: revert del commit y despliegue Preview de la base; los registros/versiones se conservan. Si se deshabilitan las flags, conservar el lector de observaciones y sus artefactos.

Primer despliegue READY, commit 9bcd579: smoke falló por 403 al enviar su dominio único como Origin. Corrección adicional mínima: lista de orígenes incluye únicamente el hostname VERCEL_URL validado desde configuración del servidor cuando VERCEL=1; nunca Host/X-Forwarded-Host ni wildcard. Ocho pruebas de origen/Auth/HTTP PASS confirman acceso público, protección privada y rechazo de otro dominio. Lint, typecheck y build Next repetidos PASS (`.local/pdf-origin-{tests,lint,types,build}.log`) antes del nuevo commit/Preview; el recibo final debe corresponder a ese SHA y Origin exactos.
