# Correcciones de matrícula, observaciones y diagnóstico

23 de octubre de 2026. Continuación local autorizada sobre `codex/multiedad-local-20261022`, base `26e51f3`. Sin publicación, push, commit ni conexiones a cuentas actuales. Esta fase completa las correcciones locales pendientes de matrícula, textos de observaciones y diagnóstico; no sustituye el resto de la preparación para piloto descrita en el recibo 15.

## Qué puede hacer la profesora

En **Mi aula → Niños y familias → Corregir y ver historial**, cada niño tiene acceso a datos de matrícula, observaciones de actividades, observaciones diagnósticas, versiones de grupo/diagnóstico/contexto familiar y motivos de cambios. Se reutilizan paneles, controles, tipografía y colores de Ayni, con secciones plegadas. No se añade otro módulo principal ni se modifica la interfaz V1. La pantalla de diagnóstico enlaza este acceso y permite confirmar una nueva lectura o relato familiar con versión esperada y motivo.

La matrícula permite corregir nombres, apellidos, nombre habitual, nacimiento opcional y grupo curricular entre los grupos confirmados del aula. El cumpleaños no cambia el grupo. Cada cambio conserva los datos anteriores y posteriores, motivo, docente, fecha y recibo; una pestaña con datos diferentes de los actuales no puede sobrescribirlos silenciosamente. No cambia aula, año, modalidad ni composición del aula. Los grupos se corrigen explícitamente; no se calculan desde el nacimiento.

Si solo cambia la identidad, se conservan las notas y sus fuentes. Se archivan los informes familiares actuales para poder preparar otros con los datos corregidos y se marca el diagnóstico para revisar, conservando su Word. Si cambia el grupo, se archiva la asignación anterior y se crea otra con revisión, motivo y enlace a la previa. Las notas, conclusiones e informes del niño pasan al historial; los de sus compañeros se mantienen. Las observaciones anteriores conservan su asignación y edad originales y quedan fuera de la valoración/diagnóstico actuales. **No se trasladan actuaciones o desempeños de una edad a otra.** La profesora registra nuevas actuaciones con los criterios correctos y confirma nuevas valoraciones y lecturas.

Una corrección de texto cotidiano conserva el original canónico y agrega una revisión. La profesora confirma que el texto corresponde al criterio mostrado: la nueva atribución curricular queda ligada a esa revisión, sin clasificación IA. Las valoraciones/conclusiones afectadas y el informe familiar del mismo niño/período se archivan para nueva revisión. No se asignan niveles nuevos. Retirar una observación conserva el original y las revisiones y la excluye del uso pedagógico. Si ya no hay fuentes para una nota, no se conserva una letra como vigente ni se obliga a inventar otra para cerrar.

Las correcciones diagnósticas son eventos inmutables sobre una fuente original sin actualizarla. La lectura actual usa el texto corregido; un retiro excluye esa fuente. Su huella invalida la revisión diagnóstica y Mi año hasta revisión docente. Una nueva lectura exige ID de revisión vigente, motivo y fuentes actuales de la misma competencia y edad. Las competencias sin actuaciones válidas pueden confirmarse como pendientes explícitos. Las lecturas previas conservan su texto, identidad y fuentes en sus documentos. El contexto familiar también conserva versiones y exige ID vigente/motivo al reemplazarlo; sigue siendo contexto, no evidencia ni sustento de nota.

No se corrigen silenciosamente niño, fecha, criterio o asignación de una fuente. Si esos datos son erróneos, se retira del uso pedagógico y se registra una nueva observación con el niño y referente correctos. El historial identifica los registros de matrícula anterior y no ofrece trasladarlos automáticamente. Esta fase no implementa traslado de aula, ingreso tardío ni transición anual.

## Integridad y compatibilidad

`multi-age-corrections.mjs` concentra autorización V2, recibos, revisión esperada, motivo, archivo de derivados e historial. Las rutas nuevas son POST `/api/multi-age/corrections/student`, `/ordinary`, `/diagnostic` y GET `/history?studentId=…`. Se ejecutan después de la autenticación habitual, con identidad del contexto servidor, comprobación de propiedad y gate local V2. El bloqueo transaccional se deriva del aula real del niño; un `classroomId` contradictorio se rechaza. No se aceptan adaptadores externos.

Las correcciones de observación comprueban el período de su fecha; la corrección de matrícula y reemplazo de lectura/contexto familiar requieren reabrir los períodos cerrados del año que bloquean el cambio. La reapertura utiliza el flujo del recibo 15, con motivo e historial. Recibos, revisión de texto, atribución, archivo de derivados y evento se confirman juntos: un fallo posterior a escribir una revisión revierte todo. Una repetición del recibo ya completado puede recuperarse sin duplicar cambios.

Migraciones aditivas `local-db/migrations/0084_multi_age_corrections.sql` y `supabase/migrations/202610230006_multi_age_corrections.sql`: tabla de eventos de corrección y tabla de identidad congelada para informes familiares, ambas inmutables. Se valida árbol docente/aula/niño/registro y secuencia de revisión. Guardas SQL V2 cubren correcciones de estudiante, eventos y nuevas revisiones/atribuciones ordinarias en períodos cerrados. RLS permite leer únicamente el historial propio y no concede escrituras directas del cliente. Se probaron en PGlite local y esquema Supabase temporal; no en Supabase remoto.

Los informes familiares nuevos guardan su identidad al confirmar. Antes de corregir matrícula se congela la identidad actualmente descargable de informes V2 anteriores que aún no la tenían, incluidos los archivados, para que el cambio no altere sus Word. Es una captura local previa al cambio autorizado, no un backfill global ni una reconstrucción de nombres pasados desconocidos. La descarga prefiere esa identidad o la confirmada en el informe. Los diagnósticos y cierres anteriores ya usan sus snapshots y permanecen iguales.

El escritor de atribución existente reconocía solo la edad escalar del aula: ahora resuelve V2 con la asignación individual y valida cada criterio, manteniendo la rama V1. La corrección reutiliza los escritores canónicos dentro de la misma transacción del recibo, sin abrir otra transacción física. El lector de evaluación ignora fuentes de asignaciones anteriores y no interrumpe la consulta por encontrarlas. La consulta de Consolidado y el cálculo de pares relevantes usan esa misma separación, sin crear obligaciones de otra edad.

No se cambian modelos ni instrucciones pedagógicas de los prompts: los contratos existentes reciben únicamente las fuentes vigentes proyectadas. Las propuestas preparadas con fuentes corregidas/retiradas o matrícula anterior quedan obsoletas. Un trabajo ya encolado cuyas fuentes dejan de ser utilizables se clasifica como obsoleto antes del proveedor, sin llamada nueva; las respuestas completadas se siguen conservando conforme al recibo 15. No hay regeneración automática ni confirmaciones IA.

## Validación ejecutada

| Grupo, sin contar repeticiones | Resultado |
| --- | --- |
| `src/lib/multi-age-corrections.test.mjs` | 8 PASS; matrícula, texto cotidiano y diagnóstico en ambos esquemas, con subpruebas de cierre/propiedad |
| `scripts/multi-age-corrections-app.test.mjs` | 1 PASS; flujo HTTP persistente completo con tres edades y reinicios |
| `ordinary-attribution-service.test.mjs`, `ordinary-observation-service.test.mjs` | 14 PASS de regresión de escritores compartidos |
| `npm run test:multiedad` | 41 PASS |
| `npm run test:multiedad:cierres` | 12 PASS |
| `multi-age-persistence-generation.test.mjs`, `multi-age-activity-batch.test.mjs`, `multi-age-conversation-activities.test.mjs`, `multi-age-persistent-app.test.mjs`, `multi-age-app.test.mjs` | 40 PASS |
| `period-assessment-closure.test.mjs`, `period-evaluation.test.mjs`, `integrated-period-workflow.test.mjs`, `ordinary-evaluation-adapter.test.mjs` | 70 PASS |
| `scripts/database-schema-parity.test.mjs` | 1 PASS |

Total: **187 pruebas distintas PASS**. El comando nuevo `npm run test:multiedad:correcciones` reúne núcleo y HTTP; la última ampliación añade los casos de observaciones/diagnóstico del esquema Supabase al núcleo, ejecutados aparte, sin sumar otra vez los seis casos iniciales o el HTTP repetido. Las regresiones incluyen aulas V1 sin conversión y documentos/historial conservados.

El caso persistente crea una base nueva y confirma matrícula 3/4/5, observaciones diagnósticas, revisión individual, año, actividad manual, observaciones cotidianas, notas, conclusiones, informes y cierre v1. Reabre, corrige nombre/nacimiento y textos de las tres edades, reinicia y comprueba historial/obsolescencia. Confirma nuevas lecturas, notas, conclusiones e informes, recierra v2 y reinicia otra vez. Compara exactamente XML de tres Word familiares, tres diagnósticos previos, Excel original y JSON del cierre v1. Una confirmación de criterio omitida falla después del escritor interno y deja revisión 1 sin evento ni modificación parcial. La prueba de grupo corregido verifica nueva observación propia de cuatro años, nueva valoración/conclusión/informe/diagnóstico y recierre en ambos esquemas, preservando archivos anteriores.

`npx tsc --noEmit`, `npm run lint` y `npm run build`: PASS. Lint mantiene una advertencia previa de `useEffect` en `diagnostic-generation-control.tsx`; build conserva avisos anteriores de PGlite/eval, chunks y clasificación estática. Detector mecánico Impeccable sobre ambos componentes: sin hallazgos en la pasada de integración. `git diff --check` correcto para archivos seguidos; no valida por sí mismo todos los archivos nuevos aún sin seguimiento.

**Límite visual:** `cua.getState()` devuelve `Local browser use is disabled in Work settings`. No se realizó el recorrido interactivo de los nuevos controles ni capturas desktop/móvil, y no se usa otro automatizador para eludirlo. Tipos, build, detector y API no equivalen a esa validación. Queda pendiente repetir el recorrido visual y una prueba en dispositivo físico.

El preview local `http://127.0.0.1:5175/` queda en la base ficticia `corrections-5255c557-4d3b-47f6-9136-c2cd62e29c0c`, con IA apagada, edades 3/4/5, cierre v2 vigente y tres historiales recuperados por API. Las bases sintéticas anteriores de lotes y cierres permanecen guardadas. Evidencia privada en `.local/multi-age-main-20261023/correcciones/receipt.json`, `histories.json` y `overview.json`. Toda fuente es ficticia/manual; **cero IA real** y cero operaciones cloud en esta fase. Los proveedores de pruebas son simulados explícitos.

## Pendientes y rollback

Siguen pendientes la revisión visual habilitada, edición del maestro y reorganización anual preservando proyectos preparados, Word del maestro/índice de actividades en Documentos, diagnóstico grupal y cuestionario familiar completos, talleres, calendario institucional, ingreso tardío, transición anual, voz, ampliación de revisión pedagógica IA y staging con cuentas nuevas y Auth/RLS reales. Corregir las fuentes marca el año para revisar, pero no regenera ni reemplaza los proyectos preparados; su edición es una fase posterior.

Para desactivar escrituras, apagar el gate V2 y retirar la entrada a nuevos formularios/rutas, conservando lectores de historial, criterios por asignación y descargas compatibles. No enviar V2 a lectores V1, borrar eventos o volver a incluir fuentes de asignaciones archivadas. La migración aplicada no se edita ni elimina; usar una migración nueva para cambios posteriores. Conservar snapshots de identidad, recibos, versiones archivadas y bases locales. No hay conversión de aulas actuales, migración remota ni publicación que revertir. La publicación requiere solicitud expresa posterior y todos los gates del proyecto.
