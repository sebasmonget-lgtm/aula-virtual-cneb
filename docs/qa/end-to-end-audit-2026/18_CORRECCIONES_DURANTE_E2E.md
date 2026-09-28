# Correcciones durante el E2E — continuación autorizada

La auditoría inicial permanece en el checkpoint local `f506d0f` (`codex/e2e-annual-cycle`). No hay push ni deployment. Se mantiene el aula QA de 15 alumnos y su ledger inicial de 49 llamadas. El aula original no se modifica.

## H08 — Round-trip del preplan y calendario (BLOCKER)

**Antes del fix.** Generar persistía doce filas válidas. Guardar la fila recargada o confirmar fallaba con `invalid_row`, «Revisa los datos de la propuesta 1». Las dos nuevas regresiones reprodujeron ese error antes de corregir el validador (0/2 PASS).

**Causa raíz.** El contrato editable admitía nueve campos, pero la persistencia añadía `planned_start_date`, `planned_end_date`, `planned_instructional_days` y `period_label`. Además, recalcular un calendario idéntico ejecutaba un UPDATE que incrementaba la revisión optimista justo antes de confirmar.

**Solución mínima.** La validación de filas recargadas reconoce únicamente los cuatro metadatos derivados conocidos y devuelve solo los campos editables. El calendario autorizado del servidor vuelve a calcular fechas y días. La salida de IA continúa estricta y rechaza esos campos. La persistencia evita el UPDATE cuando el JSONB no cambió. No hay migración, cambio de modelo, permisos nuevos ni transformación de datos originales.

**Archivos.** `src/lib/annual-preplan-service.mjs`, `src/lib/annual-project-slots.mjs`, wrapper de `scripts/local-db-server.mjs`; regresiones en `src/lib/annual-preplan-round-trip.test.mjs`.

**Regresión.** Base PGlite efímera con todas las migraciones: generar con proveedor simulado → persistir calendario real → recargar → confirmar intacto; y editar propósito → guardar → recargar → confirmar. Comprueba feriados, IDs, inmutabilidad, revisión obsoleta, recálculo de metadatos alterados, rechazo de competencias no aplicables/campos desconocidos y schema estricto del modelo. Estas bases de pruebas no son el aula QA; el E2E pedagógico continúa únicamente desde la interfaz.

**Validación técnica.** 63/63 pruebas relacionadas, typecheck, lint y build PASS. Commit del fix y resultado UI pendientes al iniciar este registro. Logs separados en `evidencias/tests-h08/`, sin sobrescribir `evidencias/tests/` de la primera auditoría.

**Rollback.** Revertir únicamente el commit lógico de este fix; conservar checkpoint y datos. No requiere rollback de migraciones.

## Protección previa al checkpoint

El enlace local de dependencias del renderizador bajo `docs/qa/.../node_modules` no estaba cubierto por el ignore de raíz. Se añadió `**/node_modules/` antes del checkpoint, sin borrar el enlace ni modificar el runtime. La revisión de los 1132 candidatos no detectó claves reales por patrones de secreto; `.env.local` y `.local` permanecen excluidos. El fingerprint del dashboard original sigue siendo `29b7c96d36bca81fc781fe36cd9fd9acecb334d468a4f85888454a05ed09a1e9`.
