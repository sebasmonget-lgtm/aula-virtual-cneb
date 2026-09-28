# F3 — Proyecto docente sencillo

28/09/2026. Rama `codex/nuevo-ayni-f3`; entrada F2 `24e5a12`, baseline H34 `5efa58a`. A elegido, B experimental. Sin push/deploy. JSON `environment-*.json` ajenos fuera del commit.

## Cambio y reversión

Propuesta real por ID → contexto opcional → preparado → confirmación docente. Reanuda sin llamadas si preparado idéntico. Detalle de fundamento, propósito/competencias, criterios/evidencias, preguntas, progresión, recursos, cierre y mapa/mediación. Vista editable legacy opcional. Confirmados cambian solo mediante sucesor; filas pasadas/con registros retenidas completas.

V3 dentro de `details`, sin segunda ruta editable: IDs de criterio/blueprint, plan/propuesta/slot, KB y huellas. `starting_point` string compatible, DTO estructurado derivado. Sin migraciones ni cambio H34. Flags `NEXT_PUBLIC_AYNI_PROJECT_SIMPLE` UI / `AYNI_PROJECT_SIMPLE` servidor apagados por defecto. DTO opt-in `AYNI_PLANNING_V3_READ`. Rollback apagar flags, no borrar versiones/SQL; regenerar dependencias V2 necesita F3, mapa V3 preparado sigue legible/editable/confirmable.

## Respaldo y QA

Snapshot previo `.local/qa-backups/f2-baseline-export-full.json` restaurado en `.local/qa-backups/f3-restored-v2`: 71/71 tablas de datos iguales, excluye migraciones. Intento `f3-restored` falló por semillas y se preservó. Reportes privados `restore.json`/`history.json` en `.local/test-results/f3/`. Original/personal no se abrió; backup DB, no medios.

UI localhost:5176, API 127.0.0.1:8791, Responses fixture 127.0.0.1:8790, clave dummy/base URL local, sin OpenRouter. Fixture acepta solo tres schemas de proyecto y proceso test/flag QA; no calidad curricular ni pricing. Cinco respuestas fixture/cero pagadas:

1. Planificar → Proyecto: doce propuestas/estados. Slot 01 existente abre sin generar, detalle y ocho fechas históricas visibles.
2. Slot 01 → sucesor → contexto explícito QA → preparar: V2 borrador, exige confirmación. Confirmar por UI deja V1 archivada/V2 activa, mismos ocho blueprints íntegros. V2 `59d86d13-c8db-47ad-8a99-4b50f150ec3f`.
3. Propuesta 10 futura → “No hay nada nuevo; usar la propuesta de Mi año”, sin escribir contexto: preparado con propósito/competencias heredados y diez días 19–30/10. Cada componente expandido/inspeccionado. Confirmar UI deja V1 activa `00ec5120-f948-4441-a0e0-70eb1e9eb3c9`.
4. Observador DB tras detener API: 26 actividades/vínculos exactos, 27 criterios, 138 evidencias, 68 valoraciones, 32 conclusiones, tres cierres/tres versiones, plan anual y contenido de todos los proyectos previos idénticos al respaldo. Dos versiones nuevas pasan V3. Sin notas/observaciones inventadas.

Desviaciones: slot 01 ya confirmado, se probó sucesor; creación sin novedades en slot 10 futuro, no borrando historia. Harness Vite sin Cloudflare por dev bloqueado antes de listen, config principal intacta. Word histórico sin formalización no se regeneró: conserva límite F1. Sin Supabase/Storage real, móvil/dictado ni E2E anual; gates posteriores. Fixture no valida pertinencia CNEB; F2 es provisional y especialistas pendientes.

## Gates

23/23 tests focales de flujo/V3/adaptadores/guardia histórica/transacción. Suite final src/scripts/evals concurrency=4: 543/543 en 106,9 s con progreso. Typecheck/lint/build finales exit 0; warnings existentes de chunks/plugins/clasificación estática. F4–F12 no aceptadas ni release.

Los cinco aportes opcionales se combinan en el único `additional_context`, con validación de longitud total antes de hacer llamadas. Se probó automáticamente que reordenar claves JSONB no vuelve a generar un preparado idéntico. El QA visual descrito arriba precedió esos últimos campos opcionales; no se declara una segunda inspección visual de ellos. La vuelta a Mi año recarga versiones para no ofrecer un sucesor con revisión antigua.
