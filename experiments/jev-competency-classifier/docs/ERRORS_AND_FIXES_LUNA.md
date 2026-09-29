# Errores y correcciones del experimento Luna

## 2026-09-28 — Bytes CRLF en KB del worktree nuevo

**Síntoma.** Nueve pruebas anteriores fallaron con «La huella de KB no coincide». La KB nueva v4.1 podía cargarse, pero el lector v4.0 del panel anterior verifica hashes byte a byte.

**Causa comprobada.** Git produjo CRLF al crear el worktree Windows. Los tres blobs de HEAD de tarjetas, matriz y aplicabilidad coincidían con el manifiesto; los archivos del worktree no.

**Solución validada.** Restaurar solo en el worktree los tres blobs de HEAD después de verificar sus hashes, conservando contenido y sin editar el manifiesto/lector. Git confirmó diff vacío de `knowledge/`; la suite completa del experimento pasó 33/33 tras restaurarlos.

**Prevención.** Verificar integridad tras crear un worktree Windows antes de atribuir la diferencia a la KB. No relajar hashes ni actualizar un manifiesto para ocultar CRLF. Este cambio no modifica `.gitattributes` ni archivos curriculares versionados.

## 2026-09-28 — Una llamada adicional tras rechazo por saldo

**Síntoma.** El mock 402 contó tres solicitudes Jev antes de detenerse; se esperaban solo las dos concurrentes originales de CURRENT.

**Causa raíz.** La guardia de parada había quedado en la rama de privacidad y faltaba antes de ejecutar el siguiente método RAW.

**Solución validada.** Guardar la causa de parada al terminar CURRENT, omitir siguientes proveedores, persistir el checkpoint y detener la corrida. Test 402: dos solicitudes concurrentes, cero Luna y ninguna observación posterior. Los calls sin usage conservan costo desconocido.

**Prevención.** El límite incluye llamadas físicas; probar ausencia de llamadas posteriores, no solo el código de error final. No reintentar automáticamente errores de cuota.

## 2026-09-28 — Pérdida de billing al fallar la validación

**Síntoma detectado durante revisión.** Un adaptador que miraba solo el resultado normalizado perdía usage de Jev cuando sus answers eran inválidos. Una salida JSON inválida de Luna también podía perder tokens ya consumidos.

**Causa raíz.** La validación anterior retorna una falla sin usage o lanza antes de devolver el objeto normalizado.

**Solución.** Observar las respuestas en el límite HTTP y mantener billing independiente de la validación pedagógica/schema. Usar el cliente original de CURRENT, sin reemplazar validación ni prompts. Las fallas adicionales permanecen visibles y su comparación se marca incompleta.

**Prevención.** Tests con usage real y answers inválidos, JSON Luna inválido y fallas parciales. Distinguir gasto conocido de llamadas con costo desconocido; no sumarlas como cero.
