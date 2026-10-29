# Protección de generación en los tres niveles — 2026-10-27

## Alcance y auditoría

Petición expresa: comprobar y completar la protección en año, proyecto y actividades, conservando todo lo existente. Se modifica únicamente la variante local. Sin nueva generación del año o proyecto docente, llamadas pagadas, migraciones, publicación ni cambios al checkout original.

El transporte durable con streaming interno ya incluía año documental, maestro del proyecto, actividad individual y lote: espera resultado final, `store:false`, cero reintentos automáticos y plazos acotados. Las actividades posteriores restringían sus referencias al maestro. Faltaba una restricción equivalente antes de generar el año y el maestro nuevo; la primera actividad también podía devolver una selección de referentes diferente de la generada en el maestro dentro de la misma respuesta.

## Cambio mínimo

- Año y cambio de un tramo: esquema especializado con combinaciones permitidas de edad, competencia habilitada y referentes del catálogo oficial versionado. Un referente de otra competencia o edad queda fuera de la respuesta admitida. Si esa edad no tiene desempeños específicos, solo admite `[]`, conservando el referente de ciclo. Tramos restringidos al calendario autorizado, con `$defs` compartidos para mantener el esquema dentro de los límites del proveedor. Solo se ordenan por calendario filas con identidades completas, conocidas y únicas; no se inventan ni sustituyen filas ausentes o duplicadas. Siguen las validaciones de cobertura, duplicados, organización y preservación de posiciones desarrolladas.
- Maestro nuevo: competencias y edades autorizadas, referentes oficiales propios, fecha elegida y título de la primera actividad restringidos. La selección del maestro conserva su libertad pedagógica dentro del catálogo. La primera actividad no devuelve una segunda copia de los IDs: el servidor incorpora esa metadata desde el maestro ya validado por competencia y edad. Los textos del criterio, acompañamiento y evidencia se mantienen tal como se generaron. Respuestas históricas con referencias explícitas siguen leyéndose y validándose; nunca se repara silenciosamente un ID incorrecto.
- Actividad posterior y lote: además del vínculo estricto con el maestro, el esquema restringe las competencias solicitadas, fechas elegidas, grupos y cantidad de actividades. La validación final conserva posición, unicidad y coherencia; el guardado del lote sigue siendo atómico.

Los esquemas privados llevan sufijo `protected-v26`. Se mantienen la política editorial v24, la versión de chat v25, contratos públicos guardados y huellas de las fuentes existentes. No se reinterpretan ni reescriben documentos anteriores. Los permisos de docente/aula, RLS, snapshots de conversación y controles de versión permanecen en servidor.

## Verificación

Pruebas independientes con JSON Schema compilado: aceptar propuestas válidas y rechazar edades ajenas, competencias inventadas, referentes de otra competencia o edad, omisión de referentes obligatorios, fecha incorrecta, tramo ajeno, comienzo distinto, competencias no solicitadas y cantidad de días equivocada. También verifica lectura histórica, herencia de metadata sin modificar el texto, rechazo de un ID explícito equivocado, cobertura y duplicados. El catálogo máximo habilitado, incluyendo L2 y religión cuando corresponden, se comprueba contra los límites de enum y longitud de Structured Outputs.

Pruebas del flujo completo en bases temporales: año, proyecto, primera actividad con el nuevo contrato, lotes, recuperación, atomicidad, idempotencia, aislamiento y Word. El proveedor simulado omite los referentes de la primera actividad según el contrato nuevo: el flujo confirma y exporta la versión canónica con metadata heredada. Los proveedores de los cuatro trabajos largos documentales se instancian sin llamar a IA y se comprueban streaming, privacidad y plazos; el modo diario conserva su configuración. Las pruebas del SDK cubren stream final completo, incompleto e interrumpido, sin otro intento automático.

Un test anterior todavía esperaba 90 s para una actividad documental posterior: se actualiza a los 300 s ya aprobados en v25. Las aserciones de 90 s del modo diario se mantienen. No se modifica el runtime de producción para satisfacer ese test.

Gates y recibos privados: `.local/generation-guards-v26-final-tests.log`, `generation-guards-v26-types.log`, `generation-guards-v26-lint.log`, `generation-guards-v26-build.log`, `generation-guards-v26-before.json` y `generation-guards-v26-preservation.json`. La inspección no cambia las plantillas: la regresión compara estilos e imágenes del año, proyecto y actividad.

Se usan las restricciones admitidas en la [documentación oficial de Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs). No se afirma una nueva prueba real de generación ni validación de infraestructura cloud en este cierre. La restricción de identidad no garantiza pertinencia pedagógica de todos los textos ni elimina cortes externos; los resultados completos y las guardas siguen siendo necesarios.

## Activación y rollback

Reiniciar exclusivamente el launcher de esta variante si no hay tareas en curso, con el mismo almacén y configuración. Comparar antes/después la matrícula, planes, proyecto, actividades y conversaciones. No actualizar, regenerar ni volver a confirmar documentos.

Para revertir código: retirar las llamadas a los nuevos constructores de esquema y a la herencia de metadata del primer día, restaurar la copia de referentes del proveedor simulado y los argumentos opcionales de fecha/competencias si fuera necesario. Mantener el catálogo y validadores existentes. Ningún rollback de código requiere restaurar la base ni descartar documentos válidos.

Cierre validado: 68 pruebas PASS; typecheck y build PASS; lint completo sin errores, con el aviso React preexistente. La revisión automática bloqueó inicialmente el reinicio conjunto sin motivo más específico. Se pudo completar de forma más acotada: detener solo la API identificada y dejar que su supervisor cerrara la variante; respaldo privado y nuevo launcher 35668 con el mismo almacén. Comparación exacta de workspace, planes, resúmenes de trabajos conversacionales y ambos chats completos antes/después: idénticos (SHA256 0acf032dec7e8e3f501eb340a08eda02a65755ef2695c3e648fe67a200e7f66d). Cuatro alumnos, quince turnos y diez actividades conservados. Proyecto y actividad 10 descargan Word HTTP 200; web y API activas. Cero llamadas reales y cero regeneraciones en este cambio.
