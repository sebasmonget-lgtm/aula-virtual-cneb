# F6 — Jev y revisión curricular de observaciones

28/09/2026. Base F5 `99cd04e`, rama `codex/nuevo-ayni-f6`. Sin deploy, push ni llamadas API pagadas. Los dos JSON ajenos de auditoría permanecen fuera del checkpoint.

## Contrato y datos

Las observaciones raw se conservan tal cual, con `student_id` elegido por la profesora. F6 agrega `captured_criterion_id` nullable e inmutable y las tablas append-only `ordinary_observation_attributions` y `ordinary_observation_criterion_links` mediante migraciones local `0064` / Supabase `202609280004`. Un criterio activo elegido explícitamente durante la captura cuenta como decisión docente desde ese momento, aun si su competencia histórica carece de ID V4; no se inventa mapeo. Las sugerencias Jev pasan a la cola y no se vuelven finales sin confirmación. Corrección de raw exige nueva revisión; el original sigue visible. IDs/criterios se validan por edad, aplicabilidad, aula y actividad en servidor. RLS permite solo lectura propia; escritura directa de cliente denegada.

La captura y la cola quedan detrás de flags apagados por defecto. Apagar F6 deja operativa F5 raw y conserva todas las versiones. La foto no se manda a IA. `anonymousDecisionText` produce una copia textual acotada o se abstiene; la fuente permanece intacta. El cierre/evaluación H34 no lee aún estas atribuciones: esa integración se hace en F8.

## QA en clon

Se exportó `.local/qa-backups/f5-checkpoint-full.json` (74 tablas) y se restauró `.local/qa-backups/f6-restored` (73/73 tablas de datos iguales, excluyendo metadatos de migración). API local 8794 y web 5177 sin Jev: una nota ficticia espontánea para Camila con texto que menciona a Benjamín conservó `student_id` y bytes de texto; la falta de Jev produjo estado `unavailable` sin perder raw. Una confirmación docente de MAT_CANTIDAD quedó versionada. Por UI la cola mostró dos notas pendientes, abrió una, reveló el catálogo solo al pedir cambiar/agregar, confirmó COM_ARTE para la nota ficticia de Benjamín y la quitó de pendientes; la nota siguió accesible bajo «Otras observaciones guardadas». Otra captura ficticia guiada para Camila conservó el criterio legacy `c000...0002` y la competencia UUID histórica `500...0001`, sin ID V4 inventado ni pendiente obligatorio cuando Jev no está disponible. `scripts/qa/verify-f6-review.mjs` compara las 12 tablas históricas, dos raw preexistentes y su revisión contra F5; solo añade dos raw QA y tres versiones de atribución. No creó niveles AD/A/B/C, nuevos documentos ni llamadas IA.

## Validación y límites

Pruebas de sugerencias 0/1/N, decisión docente, criterio explícito, alumno/autor ajenos, doble submit CAS, raw corregido, paridad local/Supabase y RLS por inspección/migraciones. Suite completa `node --test --test-concurrency=4`: 585/585 PASS. `npx tsc --noEmit`, `npm run lint` y `npm run build`: PASS. El primer lint detectó un efecto React con posible actualización síncrona; se corrigió y se repitió con éxito. Build informa advertencia no bloqueante de chunk >500 kB. PENDING EXTERNAL: respuesta Jev real y prueba de Storage/RLS en cuenta Supabase nueva, micrófono físico móvil y evaluación experta de candidatos. El código usa mocks/fixtures para no consumir saldo.
