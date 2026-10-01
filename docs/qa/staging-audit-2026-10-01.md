# Auditoría funcional del aula QA en Vercel — 1 de octubre de 2026

## Alcance y estado

Se auditó `project-0w0pq.vercel.app` con la sesión docente del aula ficticia «Auditoría 5 años» y sus tres alumnos de prueba. La revisión siguió diagnóstico, plan anual, selección de unidad, biblioteca de documentos y acceso a evaluación. No se consultaron fuentes web externas para validar contenidos MINEDU/CNEB.

El recorrido integral sigue **en curso**. Mientras se probaba, el diagnóstico y el plan anual pasaron a confirmados sin una acción nuestra de confirmación. Es posible que otra sesión esté trabajando en el aula, pero aún no está confirmado. Al avanzar la unidad U02, la aplicación devolvió `version_conflict`; por seguridad no se reintentó la generación ni se sobrescribió el borrador. Falta aclarar la edición concurrente antes de continuar con mutaciones.

## Documentos revisados hasta ahora

| Tipo | Muestra única | Comprobación |
| --- | --- | --- |
| Diagnóstico del aula | `diagnostico-aula-2026-3f6939da.docx` | DOCX íntegro, 401 709 bytes, sin marcadores `{{…}}`. Explicita 1 de 3 niños observados, 1 de 3 entrevistas y que el registro de 30/09/2026 cae fuera del período diagnóstico previsto 16–27/03/2026. La síntesis evita generalizar el dato de un niño. |
| Plan anual | `plan-anual-2026-8a7c9633.docx` | DOCX íntegro, 9 484 769 bytes, sin marcadores `{{…}}`. Recoge 12 propuestas, cuatro períodos, punto de partida cauteloso y oportunidades por competencia. El archivo contiene 23 imágenes, varias de aproximadamente 0,7–0,9 MB; conviene optimizar su tamaño. |

La vista previa de la aplicación permitió revisar contenido y procedencia. El renderizador DOCX no pudo generar páginas porque este entorno no tiene `soffice.exe`; **la paginación y el aspecto final en Word no están verificados**.

## Hallazgos

| Severidad | Pantalla | Hallazgo y evidencia | Estado |
| --- | --- | --- | --- |
| Alta | Diagnóstico | Las tres tarjetas, entrevistas y fichas decían solo «Prueba», lo que impedía atribuir observaciones sin riesgo de confusión. Las dos consultas diagnósticas omitían el apellido. | Corregido en `4c67e25`, desplegado en `dpl_4tbGw2GVBdmVwaPBKJu2ZFeMxcPP`; la interfaz ya distingue Uno, Dos y Tres. |
| Alta | Unidad U02 | «Continuar a preguntas» terminó dos veces en un `version_conflict` literal, incluso desde el borrador recién abierto. PostgreSQL serializa `revision bigint` como texto y el servidor exigía un número; la petición se rechazaba antes de llamar a IA. | Corrección local: validación estricta de revisión decimal y mensaje legible. Pendiente de desplegar y repetir el flujo. |
| Media | Plan anual | El archivo de 9,5 MB incluye imágenes pesadas para un documento de doce propuestas. Puede dificultar descarga o envío con conexión limitada. | Pendiente de optimización; no bloquea el flujo. |
| Media | Cronología del aula QA | La planificación confirmada cubre marzo–diciembre de 2026, aunque la prueba ocurre al final de septiembre. La unidad en preparación U02 estaba fechada en abril. La interfaz prioriza ese borrador y no advierte de la fecha pasada en la tarjeta inicial. | Pendiente de revisar con el flujo de la docente; no se cambió la fecha para forzar avance. |

## Validaciones técnicas ejecutadas

Para la corrección de identificación: 10 pruebas de servicios diagnósticos, `tsc --noEmit`, lint, build Vinext y build Next.js pasaron. En el despliegue candidato, `/health` y `/api/auth/config` respondieron 200, y `/api/diagnostics` sin sesión respondió 401 esperado. La sesión docente cargó nombres completos después de promover la versión.

## Pendiente para completar la auditoría

Confirmar que no hay edición concurrente del aula; retomar desde el borrador vigente sin duplicar IA. Revisar una unidad/proyecto, una actividad, observaciones, evaluación e informes siguiendo el flujo natural. Generar y revisar como máximo un documento por cada tipo restante. No atribuir niveles finales a datos ficticios sin la confirmación docente de QA.
