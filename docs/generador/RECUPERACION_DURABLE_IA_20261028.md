# Recuperación durable de IA documental · 2026-10-28

## Incidente real y causa

La preparación del cuarto proyecto quedó interrumpida antes de crear el maestro. El registro privado muestra 300.343 segundos entre creación y fallo, con provider_uncertain: el plazo efectivo de la conexión documental era de 300 segundos. El transporte esperaba el final del stream y solo guardaba una salida al terminar; no persistía el ID recibido al comenzar. Por ello, una espera/corte no permitía consultar la respuesta en curso y acababa mostrando «Tu preparación está pausada».

Las dos pruebas de contenido V32 habían completado sus generaciones, pero no validaban esta condición de transporte. No era suficiente aprobar estructura y Word para afirmar fiabilidad ante esperas largas.

## Cambio general

Se adapta el mecanismo de respuesta background que ya existe en el proveedor de Ayni. Solo el generador de documentos usa este transporte en anual, maestro, actividad y lote; el modo diario y los chats conservan su configuración. Al recibir el ID se guarda inmediatamente un checkpoint privado. Cada paso posterior consulta ese mismo ID, sin crear otra respuesta ni consumir otro intento de creación. Se respeta un intervalo mínimo de cinco segundos y Retry-After acotado; otros trabajos pueden avanzar entre consultas.

Pending, timeout de consulta, red temporal y rate limit con ID conocido vuelven a la cola como trabajo en preparación. Un reinicio recupera la consulta desde la base. Un resultado completo sigue pasando por los validadores de edades, calendario, competencias, referentes y huellas antes de guardarse. Los datos pedagógicos no se sustituyen por una salida parcial.

No se repite automáticamente una creación si se perdió la conexión antes de guardar el ID: permanece incierta para evitar duplicar consumo. Respuesta expirada, cuota, credenciales y salida inválida conservan causas diferenciadas. El polling está acotado a 240 consultas/20 minutos; expiración requiere otro intento explícito. No se promete que un proveedor externo nunca falle.

El estado privado se añade mediante migraciones nuevas `0093_multi_age_provider_checkpoint.sql` y `202610280001_multi_age_provider_checkpoint.sql`, sin modificar migraciones aplicadas. En Supabase la tabla tiene RLS y ningún permiso para anon/authenticated; solo service_role. IDs de respuesta, claves y contenidos no se publican en errores ni en resúmenes API.

El proveedor mantiene store=false. Background supone almacenamiento temporal para ejecución/consulta, no ausencia absoluta de retención: [documentación oficial de OpenAI](https://developers.openai.com/api/docs/guides/background). Se revisó la guía y el SDK existente; no se cambió el modelo ni el prompt pedagógico.

## Pruebas

57 comprobaciones finales PASS: anual, maestro y lotes con respuesta pendiente, pérdida de red, siete minutos de espera y cierre/reapertura de base; una creación por respuesta y recuperación por GET. Se comprueban equidad/backoff de cola, interrupción sin ID sin POST automático, expiración sin regeneración, autorización/RLS, fechas, referencias, recuperación/idempotencia, esquema local/Supabase y proveedor SDK. Typecheck, lint y build PASS; lint conserva la advertencia anterior de diagnostic-generation-control.tsx.

Las expectativas previas de streaming se actualizan al transporte durable. Una aserción de backoff se precisa para permitir que la cola procese otra tarea mientras espera, en lugar de exigir que esté totalmente inactiva. Pruebas finales: `.local/incident-final-tests.log`; controles: `.local/incident-typecheck.log`, `.local/incident-lint.log`, `.local/incident-build.log`.

## Recuperación del intento docente

Se hizo un respaldo del almacén propio antes de migrar, `.local/backups/incident-durable-before`. Tras activar la variante se verificaron los 38 Word, alumnos, planes y chats intactos. El intento viejo carecía de ID recuperable: se reanudó explícitamente una vez con su mismo input/chat guardado, sin crear un cuestionario nuevo ni reescribir proyectos anteriores.

Resultado real: cuarto proyecto del agua y diez actividades completas. Maestro más dos lotes listos; el maestro conserva dos intentos totales (original fallido + recuperación), cada lote un intento. Interfaz comprobada haciendo clic: «10 actividades listas» y «Todo está guardado en Mi año». ZIP descargado por la API: once Word íntegros y XML válido.

Después de completar: cuatro alumnos y 27 turnos idénticos en los 16 ámbitos; planes anuales, proyectos/actividades previos y cuerpos de los 38 Word anteriores idénticos; solo se añade el proyecto solicitado y sus diez actividades. El input del intento recuperado coincide exactamente con el original. Evidencia: `output/generador-documentos/recuperacion-20261028/recovery-checks.json`, ZIP y captura `preparacion-completa.png`. Los snapshots completos con datos docentes quedan únicamente en .local.

Solo se reinició la variante local. No hubo despliegue ni cambios en la carpeta o cuentas publicadas del Ayni original. Rollback: volver al código de transporte anterior manteniendo la migración adicional y los documentos; no eliminar una migración aplicada ni restaurar un respaldo sobre las nuevas actividades sin solicitud docente.
