# Plan Maestro — F1 contratos y procedencia

Fecha: 28/09/2026. Baseline `5efa58a`; rama `codex/nuevo-ayni-f1`. Alcance exclusivo F1. Los dos JSON `environment-*.json` modificados antes de esta fase se conservaron fuera del commit. No se tocó H34 ni se inició F2.

## C0, datos y reversión

Se exportó la base QA H34 a `.local/qa-backups/f1-h34-export-full.json` (ignorado por Git). El export contiene 72 tablas; 71 tablas de datos se restauraron en `.local/qa-backups/f1-h34-restore-full` y se cotejaron por número de filas y SHA-256 de filas serializadas: 71/71 iguales, 0 discrepancias. `schema_migrations` se excluyó del cotejo de datos. También se conservó una copia sin abrir de la fuente QA. Es respaldo de base de datos, no de archivos de medios. Ninguna prueba se ejecutó sobre la base personal ni sobre el directorio QA original.

El flag `AYNI_PLANNING_V3_READ` está apagado por defecto; ponerlo en `0` retira las nuevas proyecciones API. La reversión de código es el commit F1, sin borrar datos ni revertir SQL. No hubo migraciones local/Supabase: las FK lógicas existentes y los índices de 0052/0053 y 202609260001/202609260002 bastan.

## Contratos y comprobación funcional

- Doce propuestas conservan sus ID y slots al recalcular calendario; el test de orden intercambiado y segunda persistencia comprueba estabilidad de IDs.
- `proposal_id` y el ID del slot de la propuesta 01 del aula QA devolvieron por `/api/project-flow/start` HTTP 200, `existing=true`, el mismo proyecto `627b2176-af04-4f53-bcf1-c8f0a081c605` y 8 fechas. Se usó la copia restaurada, sin generar otro proyecto.
- `GET /api/project-flow/:id` abrió ese proyecto V2 con proyección de lectura V3 marcada `compatibility_adapter=true`, el mismo ID de propuesta y slot y 8 blueprints. El plan activo devolvió 12 propuestas y 12 slots. Se comprobó que los 20 documentos de actividad del aula tienen actividad enlazada a blueprint del proyecto.
- Tras el ajuste final, la lectura de proyecto y la de Documentos devolvieron exactamente los mismos ID/version de plan, propuesta y slot, y la misma lista de IDs de blueprint; una actividad documentada conservó su vínculo.
- El documento histórico del proyecto se abrió por `/api/documents/experience/:id` (HTTP 200, 8 filas canónicas). El endpoint Word respondió 500 porque el proyecto QA ya estaba confirmado pero su contenido formal no había sido preparado; `renderSavedDocumentWord` confirma el bloqueo previo «Prepara primero el Word». Sin modificar datos, se ejecutó el renderizador de la plantilla histórica con el documento y KB autorizada: DOCX ZIP válido, 423059 bytes, `word/document.xml` presente y título de actividad incluido. No se afirmó que la descarga HTTP histórica haya pasado.
- No se pudo verificar la UI en navegador: el proceso `vinext dev` inició pero no abrió puerto 5176; la pestaña devolvió `ERR_CONNECTION_REFUSED`. El QA manual F1 cubre API y renderizador, no una interacción visual. No se modificó la app personal para forzarla.

## Gates

`node --test --test-concurrency=4`: 539/539 PASS en la corrida completa. Tras el ajuste final de la ruta de calendario, 31/31 tests focales PASS. La primera corrida completa tuvo 538/538 PASS; una intermedia detectó un fixture de Documentos sin `project_slots.proposal_id` y un timeout de arranque del test HTTP bajo carga. Se corrigió el fixture, ambos tests pasaron aislados (7/7), y toda la suite pasó con concurrencia limitada. `npx tsc --noEmit`, `npm run lint` y `npm run build` pasaron después del cambio final; el build solo advirtió sobre chunks grandes y clasificación estática de ruta. No se probó Supabase real ni se desplegó.

**Desviación del plan:** QA de apertura/Word por API y renderizado directo en vez de interfaz, por el servidor web que no escuchó; el endpoint Word del proyecto sin formalización sigue bloqueado por el flujo anterior. No se alteró el estado histórico para hacerlo pasar.

## Reintento de smoke visual posterior a la aceptación provisional

Con `vinext start --port 5176` sobre el build local, la app sí escuchó y se conectó a la copia QA restaurada; el fallo anterior de `vinext dev` fue del arranque/harness, no una prueba de error de producto. La API se inició en `127.0.0.1:8788` con el `AYNI_LOCAL_TEACHER_ID` de la profesora ficticia del respaldo, sin modificar la base original. En navegador integrado se vio el aula Exploradores (15 alumnos), se abrió **Planificar → Proyecto o unidad** y aparecieron las doce propuestas. Se abrió la primera propuesta ya confirmada y se mostraron sus ocho filas del 30/03 al 10/04 y el acceso «Preparar Word». No se generó ni descargó el Word porque esta versión histórica aún carece del contenido formal requerido; permanece el límite HTTP 500 documentado arriba. El control mediante pulsación de teclado funcionó; el click automatizado no mostró transición inmediata y no se extrapola a un fallo de mouse para una docente real. No se alteró ningún proyecto confirmado ni se hizo una llamada generativa para este smoke.
