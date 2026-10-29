# Word del proyecto e índice de actividades en Documentos

Fecha: 23 de octubre de 2026. Rama `codex/multiedad-local-20261022`, base `26e51f3`. Implementación local autorizada para Unidocencia V2, sin publicación ni cambios de datos de aulas actuales.

## Recorrido disponible

En **Documentos → año y aula → Proyectos y actividades**, la carpeta de cada proyecto muestra su versión y conserva las anteriores. Contiene el documento del proyecto y las actividades preparadas con esa versión, con número y fecha prevista. Al abrir el proyecto se ofrece **Descargar Word**, propósito, secuencia compartida y criterios separados para 3, 4 y 5 años. Cada edad tiene criterio, actuación esperada, momentos para observar y referentes propios.

El índice dentro del proyecto permite abrir sus actividades. Cada actividad conserva su Word y lectura completa por edades. Las actividades de una edición anterior permanecen en su carpeta; no se duplican ni pasan al maestro vigente. Una edición sin actividades explica dónde se conservan las anteriores. Se reutilizan `DocumentTree`, `ProjectReadingView`, `ActivityReadingView`, botones, paneles e ilustraciones de Ayni. El árbol y los lectores V1 no se modifican.

## Versiones y conservación

GET `/api/multi-age/documents/project/:id` y su variante `.docx` resuelven una versión exacta: el ID del proyecto original identifica v1; cada ID de `multi_age_project_versions` identifica su edición. Nunca se sustituye por la última. Se usan título, propósito y criterios de ese maestro. La secuencia v1 procede de su primera actividad confirmada y se valida contra la huella del proyecto original; las ediciones posteriores ya conservan su secuencia inmutable.

La identidad del aula y el catálogo proceden de la versión anual de origen conservada. El documento indica ese origen; no usa los nombres actuales para reconstruir un histórico. Los referentes se validan por competencia, edad y versión. Si el año congeló solo parte de los desempeños, se permite completar sus IDs únicamente con el catálogo instalado de esa misma versión, como en el Word de actividad. No se reemplazan por referentes de otra edad o catálogo futuro. Los datos incompletos impiden descargar y muestran un mensaje de revisión.

El Word conserva el maestro confirmado. El índice actualizado se consulta en Documentos y queda separado del contenido del archivo: añadir otra actividad no cambia la descarga anterior del proyecto. No se incluyen nombres de niños, observaciones, notas, conclusiones ni relatos familiares en este Word. Las oportunidades esperadas no se presentan como logros observados.

El índice proyecta proyectos, ediciones y actividades canónicas. `projectDocumentId`, `projectVersion`, `position` y fecha agrupan cada actividad con su edición real. No se crean copias documentales, tablas, backfills ni migraciones. Se mantienen las guardas/RLS instaladas, propiedad docente y gate V2. Los roles SQL simulados prueban aislamiento además de la autorización del servicio. Aula archivada conserva sus descargas.

## Pruebas ejecutadas

73 pruebas distintas PASS en esta fase, sin sumar repeticiones:

| Alcance | Pruebas |
| --- | ---: |
| Word del proyecto e índice local/Supabase temporal y API persistente nueva | 9 |
| Word de actividad, diagnóstico y año con sus históricos | 11 |
| API principal, reinicios/conversación/lotes, edición/reorganización y carpetas | 21 |
| HTTP del laboratorio y biblioteca/exportadores V1 | 32 |

Comandos: `node --test --test-concurrency=1 scripts/multi-age-project-documents-app.test.mjs src/lib/multi-age-project-document.test.mjs src/lib/multi-age-activity-document.test.mjs src/lib/multi-age-documents.test.mjs` (20); `node --test --test-concurrency=1 src/lib/multi-age-planning-revisions.test.mjs scripts/multi-age-app.test.mjs scripts/multi-age-persistent-app.test.mjs src/lib/document-folder-groups.test.mjs` (21); `node --test --test-concurrency=1 scripts/multi-age-local-http.test.mjs src/lib/document-library-service.test.mjs src/lib/document-word-export.test.mjs` (32). El alias nuevo `npm run test:multiedad:proyecto-word` reúne las nueve específicas.

La prueba HTTP crea otro almacenamiento ficticio, confirma dos versiones del proyecto y prepara tres actividades en total. Comprueba agrupación por edición, edades, descarga privada, rechazo de IDs ajenos y conservación tras reiniciar. Compara el XML de nueve Word anteriores y cada fila canónica inicial de proyecto, actividad, criterios, observaciones, notas, conclusiones e informes: intactos. El núcleo comprueba otra reorganización anual, cambio posterior de nombres y archivo del aula. Listar y descargar no genera trabajos IA ni escribe datos pedagógicos. Los proveedores de las regresiones son simulados explícitos; cero IA real y cero escrituras remotas.

Tipos, lint y build PASS. Se conserva la advertencia previa de `useEffect` en `diagnostic-generation-control.tsx` y los avisos de Vinext sobre PGlite/eval, chunks y clasificación de rutas. Detector estático de los dos componentes V2 sin hallazgos. `git diff --check` correcto para archivos seguidos.

## Revisión del Word y límites visuales

Los ejemplos se descargan mediante la API real local y se renderizan con el Python autorizado, `render_docx.py`, LibreOffice portátil y Poppler existentes. Se inspeccionan las cuatro páginas finales del proyecto y las tres de la actividad de prueba: sin recortes, solapamientos ni contenido perdido. El nuevo Word del proyecto mantiene juntos criterio, evidencia esperada y momentos de cada edad, y cada bloque de referentes. Se conserva la plantilla original y el XML de exportaciones anteriores. No se certifica Microsoft Word nativo ni cualquier longitud futura de contenido; la actividad conserva su paginación anterior.

Los ejemplos ficticios de Comunicación toman del catálogo instalado referentes sobre expresar intereses/preferencias para 3 años, participar en el intercambio para 4 y explicar razones/esperar turnos para 5. No proceden de observaciones reales ni de una nueva respuesta IA.

Work devuelve `Local browser use is disabled in Work settings`. No hubo recorrido interactivo de esta pantalla ni inspección desktop/móvil; HTTP, tipos y build no equivalen a esa validación. No se elude la configuración con otro automatizador. Se reinició el preview para actualizar API y frontend: página local HTTP 200 y ocho documentos con lectura JSON y Word válidos. El estado incluye los campos de protección anual requeridos. La revisión visual de la aplicación sigue pendiente.

## Evidencias y rollback

Evidencias privadas ignoradas por Git: `.local/multi-age-main-20261023/proyecto-word/receipt.json`, `state.json`, `preview.json`, `proyecto-3-4-5.docx`, `actividad-3-4-5.docx`, `render-proyecto-final/` y `render-actividad-final/`. El recibo identifica la base exacta de QA. Cada ejecución crea otra base propia y no reutiliza una cuenta existente.

Preview `http://127.0.0.1:5175/`, base sintética previa `planning-b4e7d5c1-2028-4f2f-b0d3-727021910033`, IA apagada. Conserva dos proyectos, cuatro actividades, año v3 y proyecto principal v3. Documentos lista catorce entradas: tres años, tres diagnósticos, cuatro versiones de proyecto y cuatro actividades. Los tres informes familiares se agregan mediante la integración existente. No se reemplazó esta base con el fixture nuevo.

Rollback: ocultar el acceso V2 a estos documentos y retirar sus nuevas rutas, conservando lectores de actividades con edición exacta y año de origen. No borrar maestros, versiones, vínculos ni actividades, ni convertir aulas a V1. No hay migraciones nuevas que revertir. Continúan pendientes la revisión visual habilitada, diagnóstico grupal/cuestionario familiar completos, talleres, calendario institucional, ingreso tardío, transición anual, voz y validación remota con cuentas nuevas y Auth/RLS reales. Sin commit, push ni publicación.
