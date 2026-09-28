# Correcciones durante el E2E — continuación autorizada

La auditoría inicial permanece en el checkpoint local `f506d0f` (`codex/e2e-annual-cycle`). No hay push ni deployment. Se mantiene el aula QA de 15 alumnos y su ledger inicial de 49 llamadas. El aula original no se modifica.

## H08 — Round-trip del preplan y calendario (BLOCKER)

**Antes del fix.** Generar persistía doce filas válidas. Guardar la fila recargada o confirmar fallaba con `invalid_row`, «Revisa los datos de la propuesta 1». Las dos nuevas regresiones reprodujeron ese error antes de corregir el validador (0/2 PASS).

**Causa raíz.** El contrato editable admitía nueve campos, pero la persistencia añadía `planned_start_date`, `planned_end_date`, `planned_instructional_days` y `period_label`. Además, recalcular un calendario idéntico ejecutaba un UPDATE que incrementaba la revisión optimista justo antes de confirmar.

**Solución mínima.** La validación de filas recargadas reconoce únicamente los cuatro metadatos derivados conocidos y devuelve solo los campos editables. El calendario autorizado del servidor vuelve a calcular fechas y días. La salida de IA continúa estricta y rechaza esos campos. La persistencia evita el UPDATE cuando el JSONB no cambió. No hay migración, cambio de modelo, permisos nuevos ni transformación de datos originales.

**Archivos.** `src/lib/annual-preplan-service.mjs`, `src/lib/annual-project-slots.mjs`, wrapper de `scripts/local-db-server.mjs`; regresiones en `src/lib/annual-preplan-round-trip.test.mjs`.

**Regresión.** Base PGlite efímera con todas las migraciones: generar con proveedor simulado → persistir calendario real → recargar → confirmar intacto; y editar propósito → guardar → recargar → confirmar. Comprueba feriados, IDs, inmutabilidad, revisión obsoleta, recálculo de metadatos alterados, rechazo de competencias no aplicables/campos desconocidos y schema estricto del modelo. Estas bases de pruebas no son el aula QA; el E2E pedagógico continúa únicamente desde la interfaz.

**Validación técnica y UI.** 63/63 pruebas relacionadas, typecheck, lint y build PASS. Commit `60210c3`. La API QA se reinició manteniendo los 15 alumnos, 15 entrevistas, 29 notas y 49 eventos de uso. El mismo borrador se confirmó intacto desde la UI y mostró «Mi año vigente · versión 1»: PASS. Captura `screenshots/11-h08-plan-confirmado.png`, snapshot `evidencias/h08-confirmed-qa-snapshot.json`. El Word posterior falló como una etapa separada (H21); no deshizo la confirmación. Logs separados en `evidencias/tests-h08/`, sin sobrescribir `evidencias/tests/` de la primera auditoría.

**Rollback.** Revertir únicamente el commit lógico de este fix; conservar checkpoint y datos. No requiere rollback de migraciones.

## Protección previa al checkpoint

El enlace local de dependencias del renderizador bajo `docs/qa/.../node_modules` no estaba cubierto por el ignore de raíz. Se añadió `**/node_modules/` antes del checkpoint, sin borrar el enlace ni modificar el runtime. La revisión de los 1132 candidatos no detectó claves reales por patrones de secreto; `.env.local` y `.local` permanecen excluidos. El fingerprint del dashboard original sigue siendo `29b7c96d36bca81fc781fe36cd9fd9acecb334d468a4f85888454a05ed09a1e9`.

## H21 — Contrato de desarrollo formal anual (HIGH, documento)

**Antes.** La confirmación del preplan pasó; su desarrollo formal real consumió una llamada y terminó con «El desarrollo formal llegó incompleto». El plan siguió activo. Se conserva el intento en el snapshot `annual-formal-first-failed` y en el ledger (evento 50). No se almacenó la salida rechazada, por lo que no se atribuye retrospectivamente a un campo concreto.

**Causa comprobada por código.** El validador local exigía cuatro criterios de organización, límites de listas/textos y un detalle por propuesta, pero el esquema enviado al modelo no expresaba esas cardinalidades. El contrato permitía respuestas que luego el producto rechazaba. El task tampoco indicaba los cuatro criterios.

**Fix.** El mismo Sol/low recibe cardinalidades y límites coherentes; el esquema de detalles toma la cantidad real del preplan (1–20), y el prompt pide orden/índices y cantidades exactas. Se conserva la validación local, las decisiones confirmadas, la revisión docente y las plantillas. No se relaja el rechazo ni se añade reintento automático. La documentación oficial confirma `minItems`/`maxItems`: [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

**Archivos.** `annual-formal-service.mjs` y su test. **Validación:** 37/37 relacionadas, typecheck, lint y build PASS en `evidencias/tests-h21-formal/`. Commit `87e0d32`. Reintento UI PASS: «El Plan Anual formal está listo en Documentos»; captura `screenshots/12-plan-anual-formal-listo.png`, snapshot `annual-formal-retry-pass`. Se conserva el intento anterior facturado. Esto confirma preparación, no todavía fidelidad ni render del Word. Rollback: revertir el commit del contrato, sin transformar planes o contenido formal existente.

## H22 — Preguntas guardadas pero ocultas en el proyecto (BLOCKER)

**Antes.** El primer proyecto preparó y guardó preguntas/criterios con una llamada real, pero la UI no mostraba el contenido del paso 4 ni permitía llegar al mapa. Snapshot `project-questions-invisible`.

**Causa raíz.** Las banderas de cambios comparaban objetos con `JSON.stringify`. PostgreSQL JSONB reordena claves; un objeto recargado semánticamente idéntico parecía editado. La condición `!decisionsChanged` ocultaba preguntas, recorrido y evaluación. La misma comparación afectaba mapa y dependencias.

**Solución localizada.** Comparar JSON con claves de objeto ordenadas, conservando el orden significativo de listas/actividades. No se relajan validaciones ni se sustituyen decisiones docentes. Archivos: `project-draft-changes.mjs`, su test y las tres comparaciones en `project-development-workspace.tsx`.

**Regresión.** Round-trip real de JSONB con PGlite reproduce el orden distinto y comprueba que el borrador intacto no tiene cambios. Cambios de propósito, competencias, preguntas, fechas y orden de actividades sí activan revisión. 12/12 pruebas relacionadas, typecheck, lint y build PASS en `tests-h22-project-draft`.

**UI después.** PASS: las cuatro preguntas aparecen en el mismo borrador, sin regeneración; posteriormente se revisó y confirmó el mapa de ocho días desde la UI. Capturas `screenshots/13-h22-preguntas-visibles.png` y `screenshots/15-p1-proyecto-confirmado.png`, snapshot `p1-project-map-confirmed`. Commit `06f9c20`. Rollback: revertir el commit de comparación; no hay migración ni cambio de datos.

## H18 — Fixture UTC/Lima en reajuste (MEDIUM, pruebas)

**Causa.** El test calculaba ayer/hoy/año en UTC mientras el servicio usa America/Lima. Entre 00:00 y 04:59 UTC podía considerar pasado un día que para el servicio era hoy.

**Solución.** Solo `bimester-replan-service.test.mjs`: día civil Lima, reloj controlado en las dos ventanas y regresión de cambio de año. No se modifica el servicio ni se permite reescribir pasado.

**Validación.** 5/5 de reajuste; 16/16 combinadas con traslado. Suite integrada `tests-integrated-h08-h21-h18-h19`: 466/466, typecheck, lint y build PASS. Es una corrección de prueba, no un PASS de reajuste E2E. Commit `493e2c2`. Rollback: revertir el test.

## H19 — Ledger ausente en importador (HIGH, integridad de costos)

**Causa.** Exportador incluía `ai_usage_events`, importador no. Se perdía historial al preparar una transferencia aunque el remapeo de docente ya estaba implementado.

**Fix mínimo.** Añadir tabla después de perfiles en `prepare-supabase-import.mjs`; regresión en `pilot-readiness.test.mjs` ejecuta CLI offline, sin aplicar SQL, y verifica tokens/costo/fuente/versionado y docente nueva. La prueba usa directorios temporales propios; no datos QA/originales.

**Validación.** 16/16 combinadas y suite integrada 466/466, typecheck, lint y build PASS. Importación real a Supabase NO PROBADA porque no se conectaron cuentas nuevas. Commit `59fcd26`. Rollback: revertir importador y su regresión; no migración.

## H23 — Confirmación del calendario falla por UUID (BLOCKER)

**Antes.** «Confirmar estos días» devolvía error genérico. Regresión ejecutando la consulta real sobre PGlite reprodujo SQLSTATE 42804: `confirmed_by` UUID frente a expresión CASE de tipo texto.

**Causa/fix.** Inferencia de `$2` dentro de CASE/NULL. Cast `$2::uuid` en la misma consulta de `local-db-server.mjs`, sin cambiar migraciones, identidad autorizada, filas ni validación de fechas. Test en `school-calendar-service.test.mjs` verifica confirmar con identidad, fecha/revisión y regresar a borrador limpiando confirmación.

**Validación.** Antes 5/6 (regresión falla); después 14/14 relacionadas, typecheck, lint y build PASS (`tests-h23-calendar-confirm`). Reinicio solo de API QA, mismos datos. UI PASS: ocho días lectivos confirmados, mapa preparado y proyecto confirmado, sin feriados ni fines de semana. Commit `0a19612`. Rollback: revertir cast/test, sin migración.

## H24 — Fechas SQL válidas rechazadas al guardar actividad (BLOCKER)

**Antes.** La primera actividad se generó desde el mapa confirmado para 30/03/2026, pero guardar devolvió «La fecha debe estar dentro de la experiencia y del año escolar». Snapshot `h24-activity-date-rejected`. No se regeneró la propuesta.

**Causa.** PGlite devuelve SQL DATE como objeto Date. `String(date).slice(0,10)` produce texto del día de semana, no YYYY-MM-DD; las comparaciones lexicográficas rechazaban el rango. El mismo patrón estaba en validación lectiva, edición/confirmación de actividad y lectura del calendario del proyecto.

**Fix localizado.** Reusar `annualCalendarDay`, ya disponible, para esos límites/fechas almacenadas. No cambiar fechas, calendarios, modelo, permisos ni restricciones sobre el pasado. Archivos: `scripts/local-db-server.mjs` y `activity-persistence-v4.test.mjs`.

**Regresión.** Consulta SQL DATE real, ejecución de la función real del servidor; acepta extremos inclusivos y fechas interiores, también strings ISO persistidos. Rechaza fuera del proyecto/año, vacío y timestamp recibido como fecha editable. Antes 5/6 (nueva prueba reproduce el rechazo); después 16/16 relacionadas, typecheck, lint y build PASS (`tests-h24-activity-dates`).

**UI después.** PASS: guardar y confirmar la misma actividad, sin nueva llamada de IA. Captura `screenshots/16-h24-actividad-confirmada.png`. Commit `a4d2d48`.

**Rollback.** Revertir únicamente este commit; sin migración.

## H25 — Guardar/confirmar talleres usa columna inexistente (BLOCKER)

**Antes.** El maestro se generó y la profesora eligió tres talleres, pero guardar mostraba error genérico (`workshop-save-rejected`).

**Causa.** Tres UPDATE de `learning_experiences` en edición, confirmación y archivo de maestro usaban `updated_at`, columna que no existe en el esquema migrado. El control de revisión sí existe y se incrementa mediante trigger.

**Solución.** Retirar solo las tres asignaciones a la columna inexistente, conservando revisión optimista, transacción, identidad autorizada e inmutabilidad. No añadir una columna que el flujo no necesita ni editar migraciones aplicadas. Archivos: `workshop-routes.mjs`, `workshop-master-service.mjs`, nueva `workshop-route-persistence.test.mjs`.

**Regresión.** Todas las migraciones en PGlite, rutas HTTP reales de guardar/confirmar, rechazo de revisión obsoleta, confirmar nueva versión y archivar anterior. Antes falla 0/1 al guardar; después 13/13 relacionadas, typecheck, lint y build PASS (`tests-h25-workshop-persistence`).

**UI después.** PASS: mismo maestro guardado y confirmado, tres días aceptados y cinco sin taller, sin regenerar. Captura `screenshots/17-h25-talleres-confirmados.png`. Commit `267a290`. Rollback: revertir este fix, sin migración.

## H26 — El par diario guardado sigue indicando cambios (BLOCKER)

**Antes.** Actividad y taller se generaron/revisaron/guardaron, pero «Confirmar actividad» quedaba deshabilitado. Snapshot `daily-pair-confirm-disabled`.

**Causa.** La comparación del taller seguía usando `JSON.stringify` frente al JSONB recargado: distinto orden de claves, mismos valores. La comparación principal del borrador guardado en memoria no presenta este round-trip.

**Fix.** Reusar la comparación semántica ya validada en H22 para la bandera del taller. Se mantienen las diferencias por contenido, materiales ordenados, eliminación del taller y revisión del servidor. Archivos: `parent-activity-generator.tsx`, export del helper `project-draft-changes.mjs` y test.

**Regresión.** Contrato de integración de la bandera + JSONB real: valores idénticos no son cambios; propósito/materiales distintos o retirar el taller sí. Antes 2/3; después 11/11 relacionadas, typecheck, lint y build PASS (`tests-h26-daily-pair-comparison`).

**UI después.** PASS: recargado el mismo borrador, el botón se habilitó y confirmó actividad+taller. Sin regeneración ni datos nuevos; captura `screenshots/18-h26-par-diario-confirmado.png`. Commit `cae3770`. Rollback: revertir este fix, sin migración.

## Condición temporal de la simulación anual

El launcher de auditoría usa un preload de reloj de negocio **solo** en el proceso QA: exige puerto 8790, docente ficticia exacta, modo local y directorio QA exacto. Dos pruebas comprueban rechazo en el puerto original y conservación de fechas explícitas/UTC. No se importa desde producto. La comprobación del primer registro confirmó que **PGlite/WASM también usa el reloj simulado**: `observed_at` y eventos posteriores tienen fecha virtual, no la fecha real de facturación. Las acciones UI conservan por separado el timestamp real; el ledger conserva los eventos tal como se registraron y marca esta condición, sin prometer conciliación por fecha con una factura. Se documenta el día simulado por etapa. Todos los registros pedagógicos ingresan por UI. Esto permite simular jornadas y semanas de gestión en una noche; no permite editar el pasado del reloj de prueba ni desactiva guardas. La cabecera del navegador mantiene el reloj del equipo, diferencia esperada del fixture, no prueba del calendario real del cliente.

## H27 — Actividad diaria sin pasos breves (MEDIUM, no bloqueante)

El mapa desarrolla acciones del niño, mediación y continuidad, visibles en Planificar, pero el registro diario v4 guarda `sequence: []`. Hoy muestra «Esta actividad no tiene pasos breves registrados todavía» y no ofrece la propuesta completa. Registrar evidencia y terminar actividad funcionan; el taller sí muestra inicio/desarrollo/cierre. Se documenta y continúa, sin refactor mientras quede recorrido anual pendiente.

## H28 — Evidencia de taller confirmado rechazada (BLOCKER)

**Antes.** Las cuatro notas del taller de 01/04 no se guardaron: «El criterio v4 ya no coincide con la competencia confirmada de la actividad».

**Causa raíz.** `workshop-v1` tiene competencia pero no el campo `competency_status` de `activity-v1`. La confirmación atómica del par ya había confirmado taller y criterio; el guard de evidencia exigía un campo que el contrato del taller no contiene. No era un desacuerdo de IDs ni una competencia de la actividad principal.

**Fix mínimo.** Validación compartida reconoce la confirmación persistida del taller, exclusivamente desde el join autorizado: tipo workshop, fecha de confirmación, vínculo con actividad principal e índice válidos, ID del criterio igual al del taller. Un estado explícitamente no confirmado sigue rechazado. Actividades normales conservan su requisito `competency_status=confirmed`. No cambia el JSON estricto del taller, no migra ni modifica notas previas.

**Archivos y regresión.** `evidence-capture-v4.mjs`, tests de evidencia/par diario, `local-db-server.mjs`. Regresión SQL real guarda y confirma un par con competencias distintas y comprueba que el criterio del taller es admitido; guardas negativas incluyen otra competencia, borrador, tipo project y vínculo ausente. Antes 1/2 del par diario; después 15/15 relacionadas, typecheck, lint y build PASS (`tests-h28-workshop-evidence`).

**UI después.** PASS: cuatro notas guardadas desde la interfaz, sin regenerar taller ni cambiar datos confirmados. Captura `screenshots/19-h28-taller-evidencia-guardada.png`; snapshot `h28-workshop-evidence-pass`. Las 7 notas de convivencia y 5 de identidad anteriores permanecen separadas. El aula original conserva su fingerprint.

**Rollback.** Revertir el commit `82b2379`; no hay migración.

## H29 — Maestro largo de talleres agota plazo de clasificación (HIGH)

**Antes.** Preparar diez talleres del huerto terminó «Proveedor OpenAI no disponible: timeout». No se guardó maestro ni se recibió usage: ese intento UI tiene costo desconocido, no se inventa cero ni se agrega una llamada ficticia al ledger facturable.

**Causa.** `generateWorkshopMaster` creaba el proveedor sin opciones, heredando 30 segundos. Proyecto y desarrollo anual usan plazos de planificación de 120/180 segundos; el maestro de talleres también es una generación larga con Sol, no una clasificación breve.

**Solución mínima.** Solo el maestro recibe `timeoutMs: 180000`, igual al mapa del proyecto. Conserva modelo, prompt, máximo de cero reintentos SDK y validación. No cambia los talleres diarios ni las clasificaciones.

**Regresión.** `workshop-flow.test.mjs` inyecta proveedor y comprueba el plazo recibido y salida válida. Antes 6/7; después 20/20 relacionadas, typecheck, lint y build PASS (`tests-h29-workshop-timeout`). Sin migración ni transformación de planes.

**UI después.** PASS: el reintento real preparó diez propuestas; la profesora eligió cantidad el día 2, su continuación el día 3 y comunicación oral el día 5, dejando los demás sin taller. Guardó y confirmó desde la interfaz. Captura `screenshots/22-h29-talleres-huerto-confirmados.png`, snapshot `h29-workshop-master-pass`. El intento inicial sin usage continúa separado como costo desconocido. Rollback: revertir el commit localizado.

## H30 — Dos competencias del mapa generan un criterio incompatible (HIGH / bloqueante)

**Antes.** La primera nota de indagación del 14/04 fue rechazada. Actividad confirmada `CYT_INDAGA`, criterio heredado guardado `TRANS_AUTONOMO`. No se insertó evidencia; snapshot `h30-main-evidence-rejected`.

**Causa.** El mapa derivaba `competency_id` del primer elemento de la lista, pero `primary_competency_id` del ID del criterio; la herencia mezclaba ambos. La interfaz mostraba el primero y el criterio se guardaba con el segundo.

**Fix.** Nuevos mapas, edición y conservación de modificaciones derivan su principal del ID del criterio. La herencia de una actividad conserva su competencia visible y confirmada, también para mapas legacy. No se reescriben mapas ni criterios históricos. Para recuperar el criterio incompatible ya guardado se utiliza la opción UI existente de preparar criterio. Su confirmación archiva únicamente criterios incompatibles **sin evidencias**, con la competencia actual confirmada en servidor; jamás mueve observaciones o borra históricos.

**Archivos y pruebas.** `project-flow-service`, `experience-lineage`, `criterion-version-service` y sus tests. Antes 7/9 con dos fallos reproducibles. Después 27/27 relacionadas, typecheck, lint y build PASS (`tests-h30-primary-criterion`). Regresión SQL real confirma un criterio alineado y conserva archivado el incompatible sin evidencia.

**UI después.** PASS: preparar, guardar y confirmar criterio Indaga desde la interfaz, recargar Hoy y guardar las seis notas (Inés, Thiago, Camila, Mateo, Valeria y Bruno). La recuperación no regeneró actividad ni taller; sí tuvo una llamada adicional de criterio, registrada. Snapshot `h30-main-evidence-pass`, captura `screenshots/23-h30-evidencias-indaga-guardadas.png`. Los 25 registros previos permanecen. Rollback sin migración: revertir este cambio; los históricos permanecen.

## H31 — Fidelidad del diagnóstico Word (HIGH; engloba H11/H12/H13/H16)

**Antes y causa.** El render tomaba el día UTC de un instante; el listado de pendientes no filtraba las dos áreas condicionadas; contaba asociaciones competencia–nota como notas distintas; mostraba las primeras dos asociaciones en vez de registros distintos y evolución. Dos regresiones nuevas fallaron sobre el código anterior.

**Fix localizado.** Instantes se proyectan a America/Lima, fechas civiles no se desplazan. Pendientes respetan las banderas del snapshot confirmado. Los conteos globales deduplican por estudiante/fuente/ID (los conteos por competencia conservan sus asociaciones). El seguimiento ordena cronológicamente y muestra primero/último registro distinto con aviso explícito N de M. No inventa síntesis ni cambia la prioridad histórica del diagnóstico por otra posterior.

**Archivos y pruebas.** `diagnostic-unified-word.mjs` y test. 26/26 relacionadas, typecheck, lint y build PASS en `tests-h31-h32-docs-assessment`. Incluye banderas activadas/desactivadas, instante antes de medianoche Lima, fecha civil, nota multicompetencia y evolución con orden de entrada distinto. UI/descarga después: pendiente. Render visual: NO PROBADO, falta LibreOffice en runtime. Rollback: revertir fix sin migración.

## H32 — Assessment Master multicompetencia agota plazo breve (HIGH / bloqueante)

**Antes.** Preparar marco P1 con seis competencias trabajadas devolvió timeout; no quedó maestro ni usage del intento fallido. El costo de ese intento es desconocido, no cero.

**Causa y fix.** La ruta creaba el proveedor con el plazo por defecto de 30 s, igual que H29. Solo Assessment Master pasa `timeoutMs:180000`; sin cambio de modelo, prompt, retry ni otras funciones.

**Pruebas.** La regresión de handler SQL captura opciones: falló antes (undefined), pasa después. 26/26 relacionadas, typecheck/lint/build PASS. Archivos: `scripts/assessment-master-routes.mjs`, `assessment-master-service.test.mjs`. API QA reiniciada después de validar; original sin reiniciar. UI después: pendiente de reintento. Rollback sin migración.
