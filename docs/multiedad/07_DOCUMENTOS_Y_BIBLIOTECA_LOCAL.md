# Documentos e historial multiedad en la prueba local

Continuación posterior: [integración local en la aplicación principal conservando su interfaz](08_INTEGRACION_PRINCIPAL_LOCAL.md). Este recibo conserva los resultados y límites de su ronda original.

Continuación autorizada de diagnóstico y Mi año en `codex/multiedad-local-20261022`, base `ae38b2c`. Implementación exclusiva del laboratorio `npm run dev:multiedad`; no habilita multiedad en la aplicación principal ni publica. Complementa el [recorrido anterior](06_DIAGNOSTICO_Y_MI_ANO_LOCAL.md).

## Recorrido añadido

La profesora puede consultar los diagnósticos individuales confirmados y Mi año activo o archivado en **Documentos multiedad e historial**. Cada entrada conserva versión, año, grupo curricular y acceso al Word correspondiente. Las revisiones diagnósticas anteriores a otra versión confirmada se identifican como históricas. Los documentos de un aula archivada siguen disponibles para su docente.

El borrador anual se muestra pero no se descarga como documento confirmado. Una versión local V2 anterior, sin los datos necesarios de exportación, conserva su contenido y solicita confirmar una nueva revisión; no se inventa su edad, identidad o fuente para completar el archivo. No hay backfill ni reescritura de documentos confirmados.

El diagnóstico Word conserva nombre y edad curricular individual, observaciones literales, fecha, referente de captura, relato familiar separado, lecturas docentes con referencias a registros numerados y competencias pendientes de información. No añade notas finales ni deduce dificultades. Mi año Word conserva las quince posiciones, fechas lectivas, organización compartida, oportunidades por edad, oportunidades cotidianas, disponibilidad de revisiones por grupo y anexo de referentes oficiales utilizados. Escritura a los 3 años mantiene la referencia de ciclo, sin copiar desempeños de 4 o 5.

Los cuatro archivos reproducibles son ejemplos ficticios de prueba. El plan de ejemplo no equivale a una planificación pedagógica final aprobada para una escuela real.

## Conservación de datos y permisos

Al guardar/revisar se añade un snapshot de presentación dentro del JSON canónico existente: institución, aula, docente, año, grupos y, para el diagnóstico, identidad del niño. Los referentes necesarios para el documento también se guardan con su versión y texto. La descarga usa ese snapshot y nunca reconstruye un documento histórico desde el roster, nombre docente o catálogo actual.

Se reutilizan `annual_plans.document_context`, `diagnostic_student_reviews.details` y sus fuentes canónicas. No se crea otra tabla de documentos, copia persistente de evidencia ni migración adicional en esta ronda. Los documentos confirmados conservan las barreras de inmutabilidad de la ronda anterior. Los nuevos campos JSON solo se escriben en bases PGlite temporales admitidas por el guard del laboratorio.

`multi-age-document-service.mjs` lista y carga por propiedad docente y año escolar; valida tipo, UUID, contrato, snapshot y estado confirmado. Las descargas de aula ajena se rechazan. Se comprueba también RLS con claims y roles sintéticos sobre el esquema Supabase en memoria, incluyendo el intento de invocar el servicio con otro `teacherId` mientras RLS pertenece a otra cuenta. No es una comprobación contra Auth/Storage remotos.

Rutas privadas del servidor de prueba:

- `GET /api/documents`: biblioteca V2 de la docente del proceso local.
- `GET /api/documents/annual_plan/:id.docx`: una versión anual confirmada.
- `GET /api/documents/diagnostic_student_review/:id.docx`: una revisión individual confirmada.

Exigen la misma cookie privada y validación de Host del laboratorio. El usuario no elige la docente. Las respuestas Word conservan `no-store`, nombre de archivo genérico por tipo/versión y no envían fuentes a servicios externos. La biblioteca principal V1 y sus exportadores no se sustituyen.

## Generación Word

`multi-age-planning-word.mjs` proyecta únicamente el DTO confirmado `AyniMultiAgeDocument/v1`; no consulta una base, roster, catálogo mutable ni IA. Reutiliza la papelería existente de Ayni. El diagnóstico recibe su propia cabecera. Los títulos nuevos son negros y no heredan la línea azul del estilo Title; se resuelve su ID real en la plantilla localizada y los demás encabezados usan formato directo y nivel de esquema, evitando estilos inexistentes.

El calendario permite partir la tabla entre páginas con cabecera repetida, anchos deliberados, filas sin recorte y bordes claros. Las fechas civiles se mantienen; los instantes de confirmación se muestran en Lima. Las observaciones y relatos se conservan en el documento de la versión que los contiene, aunque después exista otra fuente o cambie el nombre del niño/docente.

## Verificación y ejemplos

Se generan cuatro Word desde los servicios reales con fuentes ficticias mediante `scripts/multi-age-documents-qa.mjs`. El render usa Python/Node del runtime indicado por la aplicación y el LibreOffice ya extraído en `.local/qa-tools/libreoffice/program`; no se instala software nuevo. `render_docx.py` produce imágenes y PDF auxiliares para inspección. El Word final tiene 39 páginas para Mi año completo con anexos y 2 páginas por diagnóstico, 45 en total. Se inspeccionaron todas las páginas de la versión final, además de las pruebas de texto, referencias, estilos y fechas. No se certifica apertura en Microsoft Word nativo ni calidad de cualquier contenido futuro de longitud arbitraria.

Las pruebas verifican: tres diagnósticos sin fuentes cruzadas, quince tramos y referentes por edad; relato familiar separado; ausencia de placeholders; fecha Lima cerca de medianoche; descarga antigua inalterada después de nuevas fuentes, nombres y versiones; borrador bloqueado; versión sin snapshot bloqueada; aula archivada consultable; RLS entre docentes; HTTP con descarga real y nombre de archivo por versión. La prueba de igualdad de XML usa los documentos anteriores y posteriores a los cambios, no solo un conteo de archivos.

Resultados finales de la ronda: **90 pruebas distintas PASS**, sin fallos, saltos o cancelaciones. Los resultados anteriores de los documentos 05/06 son históricos y no se suman como pruebas reejecutadas aquí.

| Control ejecutado | Resultado |
|---|---|
| `npm run test:multiedad` | 41 PASS. Incluye las siete pruebas de documentos/RLS nuevas y el recorrido HTTP ampliado con cuatro descargas Word privadas. |
| Nueve archivos existentes de documentos y biblioteca, `node --test --test-concurrency=2` | 49 PASS. Biblioteca, exportación, anual, diagnóstico, proyecto, actividad y plantilla compartida V1. |
| `node node_modules/typescript/bin/tsc --noEmit` | PASS. |
| `npm run lint` | PASS sin errores; una advertencia histórica de dependencia compleja de `useEffect` en `diagnostic-generation-control.tsx`. |
| `npm run build` | PASS Vinext, con advertencias existentes de PGlite/eval, tamaño de chunks y clasificación estática de rutas. |
| `node --check` de UI y renderer nuevo; `git diff --check` | PASS. |
| Render e inspección de los cuatro ejemplos | 45 páginas en total. Se corrigieron cabecera, estilo localizado, anchos de tabla y continuidad de encabezados antes del render final. |

Los nueve archivos de regresión son `activity-unified-word`, `annual-plan-redesigned-word`, `annual-journey-word`, `diagnostic-unified-word`, `diagnostic-report-word`, `document-word-export`, `document-library-service`, `learning-experience-unified-word` y `unified-word-template`, sus archivos `.test.mjs`.

Navegador real: biblioteca local con tres niños, año confirmado versión 2, anterior identificado como histórico, edades/versión de un diagnóstico y enlaces propios de descarga. La preparación del fixture se hizo por API local; no se repitió manualmente todo el onboarding. Captura de 1265 × 712; no se declara prueba móvil ni descarga nativa desde el navegador. Las descargas reales se verificaron por HTTP y las muestras de Word mediante render. El proceso de la captura se inició antes del último ajuste de estilos/ordenación; los tests HTTP y los Word finales se ejecutaron desde procesos nuevos con el código actualizado.

Evidencias privadas y reproducibles: `.local/multi-age-documents-20261022/`, con `mi-ano-multiedad.docx`, `diagnostico-3-anos.docx`, `diagnostico-4-anos.docx`, `diagnostico-5-anos.docx`, carpetas `stable-*`, contactos de inspección y capturas `biblioteca-local.png` / `biblioteca-versiones.png`. PDFs y PNGs son auxiliares de QA.

Ejemplos ficticios locales: [Mi año](../../.local/multi-age-documents-20261022/mi-ano-multiedad.docx), [diagnóstico de 3 años](../../.local/multi-age-documents-20261022/diagnostico-3-anos.docx), [4 años](../../.local/multi-age-documents-20261022/diagnostico-4-anos.docx) y [5 años](../../.local/multi-age-documents-20261022/diagnostico-5-anos.docx). Las huellas SHA-256 se conservan en `artifact-hashes.json` en esa carpeta privada.

## Límites y siguientes fases

Esta ronda completa exportación Word individual de diagnóstico, anual y biblioteca de esos documentos dentro del laboratorio. No implementa todavía síntesis pedagógica grupal/exportación grupal, Excel, Word de proyecto/actividad/taller V2 ni integración de Documentos en las rutas principales. Las fuentes familiares siguen siendo el relato textual del laboratorio, no el cuestionario completo.

Siguen pendientes activación persistente explícita, calendarios institucionales e ingreso tardío, conversación y workers recuperables V2, talleres, reorganización que preserve proyectos ya preparados, cierres y transición entre años. Se mantienen los bloqueos actuales de reemplazo de un plan con proyectos preparados. No aplicar las migraciones preparadas a una base real como parte de esta revisión.

## Rollback

Detener el proceso local descarta su base en memoria; conservar el diff y los ejemplos de QA para revisión. No existen datos reales o despliegues que revertir. Retirar este experimento requiere quitar sus lectores/exportador/UI juntos, sin modificar los exportadores V1. Una futura activación persistente necesitará su propio plan de migración y rollback con lector V2; nunca borrar snapshots históricos para volver a una edad escalar.
