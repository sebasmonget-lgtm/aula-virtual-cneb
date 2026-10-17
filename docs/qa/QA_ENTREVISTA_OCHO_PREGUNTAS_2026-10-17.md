# Entrevista familiar: ocho preguntas solicitadas

Fecha: 2026-10-17. Base `bb58140b892d4706af89c38636fb97c77abc8624`; rama `codex/family-eight-questions-20261017`.

## Cambio

Se incorporan los ocho títulos y preguntas de la usuaria, en su orden y con sus textos exactos: juegos e intereses; identidad y autonomía; convivencia; comunicación oral; lectura y escritura; matemática; curiosidad y exploración; contexto familiar y expectativas.

Todas siguen siendo opcionales. Se conservan las opciones pertinentes de juegos, convivencia y comunicación/lenguas; los temas nuevos se contestan por texto o dictado mediante los componentes existentes. Los cuatro campos nuevos admiten hasta 1000 caracteres en la interfaz, con validación de texto y límite de 2000 en servidor. No se exigen lectura/escritura convencionales ni se plantean pruebas al niño.

## Integridad y versión

- `questionnaire_version: 3` en el JSON de detalles identifica el cuestionario nuevo; `structured_options_version: 2` conserva el contrato de opciones vigente. No hay tablas ni migraciones nuevas.
- Las entrevistas nuevas y los borradores editables muestran ocho preguntas. Una entrevista confirmada anterior conserva las seis preguntas del contrato anterior; Corregir entrevista abre las ocho y guarda otra versión al confirmar.
- Los campos anteriores permanecen en el JSON y se muestran como respuestas conservadas cuando no corresponden directamente a las preguntas actuales. No se reparten automáticamente los ejemplos antiguos entre lectura, matemática o exploración.
- Contadores y denominadores se calculan por versión; no se deja un `/6` fijo. Responder una opción o escribir una respuesta cuenta una pregunta, no una competencia.
- El servidor rechaza versiones incompatibles, campos no permitidos y confirmaciones con solo metadatos sin respuestas. Confirmar no evalúa lo contado por la familia.
- Se actualizan lectura diagnóstica, resumen individual, contexto familiar permitido y helper de hoja imprimible. El contexto familiar general no amplía el payload privado enviado a IA. La información nueva sigue separada de la evidencia curricular.
- El enlace familiar usa configuración de opciones por clave de pregunta en lugar de por posición, evitando opciones desalineadas o fallos en preguntas 7–8. Sus respuestas siguen esperando revisión docente; no confirman una entrevista docente automáticamente.

## Verificación ejecutada

77/77 pruebas PASS en nueve archivos: nuevo contrato de ocho preguntas, rediseño de entrevista, fuentes diagnósticas, flujo UI, conteo de intereses, contexto v4, recorrido inicial/enlace familiar, continuidad UI y contexto del estudiante. Incluyen validación, opcionalidad, conteo 8/8, contrato antiguo 6, guardado/recarga por servicio, corrección versionada sin cambiar la fila anterior, hoja HTML con respuestas completas y escape, actualización del enlace familiar y exclusión de las respuestas de `evidence_history`.

QA por navegador sobre frontend 3451 / API local 3452 / PGlite nuevo, docente ficticia `66101751-0000-4000-8000-000000000001`, tres alumnos ficticios. Sin conexiones cloud ni claves IA:

1. Ana: se leen las ocho preguntas en apilado, se escriben ocho respuestas y se selecciona Construcción. Confirmación versión 1 y recarga conservan los ocho valores; vista por pasos muestra 8/8.
2. Camila: fixture inicial antiguo creado por API local como preparación de escenario, no como sustituto de una acción fallida. UI muestra 3/6 en consulta; Corregir abre ocho preguntas. Se responde Matemática y se confirma por UI versión 2 con 1/8. La sección conservada sigue mostrando cajas, mercado y apoyo de más tiempo. La inmutabilidad de la fila confirmada anterior se verifica además en la prueba de servicio.
3. Bruno: se responde únicamente Lectura y escritura y se confirma por UI. Demuestra que no se obliga a completar las ocho.
4. Capturas en 1366×1000 y 390×844, vista apilada y por pasos, consulta y edición. No hay overflow horizontal en los tamaños comprobados. Campo editable blanco y estilos aprobados conservados.

Typecheck, lint, build Vinext y build Next webpack PASS. Detector de diseño sin hallazgos en los cuatro archivos UI revisados. `git diff --check` PASS. Se ajustan dos pruebas de contrato antiguo para pedir explícitamente versión 2 y las aserciones estructurales al nuevo payload versionado. No se elimina cobertura histórica.

## Evidencia y límites

Capturas en `outputs/family-eight-questions-20261017/`: `eight-stacked-desktop.png`, `eight-wizard-desktop.png`, `eight-wizard-mobile.png`, `legacy-corrected-mobile.png` y `eight-questions-editable-desktop.png`/`mobile.png`. Logs y base aislada en `.local/family-eight-questions-20261017/`; se conserva el PGlite y se detiene limpiamente.

El micrófono se conserva y cada campo tiene botón Dictar; no se graba audio real ni se usa una API de transcripción en esta ronda. La hoja HTML se verifica mediante pruebas de contenido y escape, no mediante Word/PDF renderizado. El enlace familiar tiene prueba de backend y compilación; su interfaz pública no se declara recorrida en navegador. No se repite el QA anual.

Costo nuevo de IA: USD 0. No se modifica ni escribe en Producción. Solo Preview desde commit limpio, con smoke de rutas públicas y endpoints protegidos sin autenticación. El recibo privado registra SHA/URL/READY y comparación del deployment de Producción.

Rollback de interfaz: volver al Preview de `bb58140`. Los nuevos campos guardados se conservan en JSON; para mantener acceso a ellos se debe volver a la versión actual antes de continuar la edición. No hacer una migración inversa ni borrar respuestas para revertir apariencia. El historial anterior permanece intacto.
