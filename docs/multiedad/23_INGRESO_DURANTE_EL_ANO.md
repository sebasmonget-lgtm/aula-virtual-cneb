# Matrícula durante el año escolar

Mi aula permite confirmar la fecha de ingreso de un niño V2. Se valida dentro del año y contra los períodos cerrados. Si el ingreso afectaría un período ya cerrado, se requiere su reapertura; una fecha posterior no obliga a cambiar el cierre anterior. La fecha de nacimiento continúa siendo opcional y no determina el grupo curricular.

La fecha reside en `multi_age_enrollment_dates`, tabla exclusiva V2 con RLS y escritura validada en servidor. No se agrega ningún campo a la fila final de estudiantes V1 ni se rellenan fechas históricas. El Consolidado considera al niño únicamente desde los bimestres cuyo fin alcanza su ingreso; no lo agrega retroactivamente como pendiente. La composición, huella y Excel guardado del período anterior permanecen iguales.

Las observaciones diagnósticas y cotidianas anteriores al ingreso se rechazan también en SQL. La interfaz ofrece el ingreso como fecha mínima de diagnóstico. Las correcciones de datos, las revisiones individuales y las entrevistas del niño respetan los períodos desde su ingreso; no se exige reabrir un período en el que aún no estaba matriculado. Una corrección de grupo mantiene las observaciones con su asignación original.

La fecha confirmada de ingreso es inmutable en esta versión. Una futura rectificación de esa fecha debe incluir revisión del efecto en cierres y fuentes; no se ofrece un cambio directo que pueda retirar a un niño de un manifiesto ya confirmado. Las matrículas históricas sin fecha explícita se consideran desde el inicio del año, conservando sus huellas anteriores.

Las migraciones nuevas 0091/0092 y equivalentes Supabase son acumulativas. La primera versión de QA tenía una columna nullable compartida; la regresión detectó la diferencia en la forma serializada de V1. La migración posterior conserva las fechas V2 ya confirmadas en la tabla separada y retira esa columna, sin editar la migración anterior. Una prueba de upgrade verifica ambos resultados.

Pruebas ejecutadas en esquemas local y Supabase temporal: cerrar el primer bimestre, rechazar ingreso retroactivo y fuera del año, matricular desde el segundo bimestre, comprobar idempotencia y conservación exacta de la huella/cierre anterior, rechazar observaciones previas al ingreso, aceptar diagnóstico en la fecha de ingreso y corregir nombre conservando el primer cierre. La prueba de upgrade conserva una fecha V2 previamente confirmada y restaura exactamente las filas V1. La prueba HTTP de transición también matricula al nuevo grupo de 3 años con fecha explícita. Reproducción: `npm run test:multiedad:transicion`.

Rollback: retirar el control de ingreso de la interfaz sin eliminar fechas ya confirmadas. Conservar el filtro y las guardas para no incorporar matrículas tardías en cierres anteriores. No borrar fuentes, fechas ni manifiestos. Sin publicación ni escritura en cuentas actuales.
