# Validación CURRENT DEV — 2026-09-28 (Lima)

Alcance exclusivo: `experiments/jev-competency-classifier/`, en worktree `jev-luna-benchmark`. No hay cambios de Ayni, BD, routing ni despliegue.

## Ejecutado

- `npm.cmd test`: 54/54, incluidos 11 controles nuevos de privacidad y CURRENT DEV. Proveedores simulados, sin red pagada.
- `npm.cmd run typecheck`: comprobación `node --check` de 58 archivos JS/MJS; **no** análisis de tipos TypeScript.
- `npm.cmd run lint`: reglas del experimento y búsqueda estática de secretos, sin errores.
- `npm.cmd run build`: dist local generado.
- Preview CLI: 80 casos ×3, pending_human_adjudication, executable=false, cuatro bloqueos por identificadores ficticios, máximo 2400 llamadas, estimación US$0.5016.
- CLI con `--execute` sobre propuesta pendiente: exit 1 esperado por barrera de adjudicación, antes de resolver credenciales/construir proveedores.
- Flujo funcional con dos registros sintéticos de prueba ×3: cuatro brazos, 24 decisiones Jev y seis Luna simuladas, bloqueo común, evidencia original, costos separados, subtotal físico, rutas de resultados distintas. Los reportes simulados se identifican `execution_mode:mock_test` y quedan ignorados.
- Mapping de competencia inexistente rechazado; manifest con bytes cambiados invalida ejecución; registro no adjudicado rechazado aunque el manifest declare revisión.
- Thresholds 0.50/0.70/0.80 y máximo cuatro; etiquetas/metadata no llegan a solicitudes; evidencia excluye interpretación; CLEAN solo permite su campo; edad ausente funciona.
- Snapshot V1 y payloads históricos CURRENT/PARALLEL coinciden con sus fuentes originales (pruebas existentes). `luna-client.mjs` sin cambios.
- UI en `http://127.0.0.1:4182/current-dev-review.html`: 0/80, selector con 80 casos, navegación al último y retorno al primero, sin decisión no se marca revisado; exportaciones adjudicadas deshabilitadas; consola sin errores. No se adjudicó ningún caso mediante la UI.

## Integridad del test final

Solo se ejecutó Get-FileHash sobre original y copia privada; no se parsearon ni inspeccionaron etiquetas esperadas. Ambos conservan SHA-256:

`c8dcf899eaa4a7d15d6bee414a56e3f575f39bb81e38663766c83a52e4c483ef`

La CLI nueva rechaza su nombre antes de abrir el archivo y una copia idéntica por huella antes de parsear JSON. Las pruebas de nombre usan una ruta inexistente; no abren el test final.

## Pendiente por requisito del usuario

Adjudicación humana de los 80 casos, smoke pagado y benchmark DEV real de tres repeticiones. No hay accuracy, candidata, costos o latencias reales de los brazos nuevos. Gasto API de esta fase US$0. La exportación completa desde la UI no se ejecutó: exige adjudicar todos los casos. La futura evaluación final permanece fuera de la CLI DEV.

## Respaldo y rollback

Commit previo limpio `c02d0b9efd242e4eef9e7bc87dd91a9b35512003`, tag `codex/jev-current-before-dev-v2-2026-09-28` creado antes de editar. Revertir el commit final retira esta fase experimental; guardar separadamente adjudicación/resultados ignorados. No se creó un commit vacío adicional de respaldo: el commit limpio existente contiene íntegro el estado previo.
