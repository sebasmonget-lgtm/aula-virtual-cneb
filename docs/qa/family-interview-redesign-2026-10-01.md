# QA de entrevista familiar estructurada — 2026-10-01

## Alcance

Se revisó la ruta de entrevista existente, `student_family_interviews.details` JSONB, validación y autorización del servidor, agregación del aula, personalización anual y entrada de Assessment. El cambio sustituye diez preguntas de texto por nueve preguntas con chips, rutinas de autonomía y campos cortos opcionales. No modifica el flujo de confirmación de «Así entendí tu aula» ni requiere migración SQL.

## Escenarios ficticios

- A: agricultura, animales y plantas, exploración de naturaleza y castellano/quechua con sus abuelos.
- B: comercio/taller, vehículos y construcción, armado y comparación de objetos.

La prueba focal compara contextos individuales, oportunidades e intereses agregados y propuestas de personalización. A y B producen señales distintas; sin observaciones no generan prioridades automáticas. Los ejemplos y expectativas familiares quedan fuera de la proyección grupal identificable. La proyección de Assessment mantiene `family_context` separado de `evidence_history` y sin expectativa familiar. Las sugerencias para observar cantidad, forma e indagación están redactadas como situaciones de observación, sin asignar logro. Una respuesta ausente no produce dificultad.

## Compatibilidad y privacidad

Las entrevistas v1 y de texto sin versión se aceptan sin completar campos nuevos. La edición guarda una nueva versión con las rutas y controles de propiedad existentes. En aula pequeña, la proyección pública suprime conteos pequeños pero conserva etiquetas temáticas sin nombres. La interfaz de familia no muestra competencias ni niveles. El audio y adjuntos existentes no se incorporan a las proyecciones de IA; el respaldo privado en papel permanece disponible.

## QA visual local

Instancia local aislada en `.local/qa/family-interview-redesign/pgdata`, aula y alumnos ficticios. Navegación real: Diagnóstico → entrevista de Alessia Vega → preguntas 1–9 → guardar borrador → reabrir → volver a la pregunta anterior → confirmar. Se comprobó el estado de borrador y luego «Entrevista confirmada». Se inspeccionaron las nueve pantallas, incluidos campos lingüísticos, rutinas, contexto comunitario, apoyos opcionales y expectativa familiar. El detalle vacío de entrevista antigua se ocultó para una entrevista nueva. El botón de dictado sigue disponible en los campos breves; no se probó la captura de micrófono ni la transcripción. No se usó el entorno desplegado.

## Validación

Pruebas focales de contrato, fuentes diagnósticas, arquitectura de contexto, personalización y Assessment: **44/44 pasaron**. Tras el último ajuste de lenguaje agregado y la prueba de impresión, pasaron **7/7** pruebas de rediseño y contexto de aula. `npx tsc --noEmit`, `npm run lint` y `npm run build` Vinext: **pasaron** con el código final.
