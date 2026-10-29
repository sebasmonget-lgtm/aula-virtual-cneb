# Actividades en lote por proyecto de Unidocencia

## Entrega local

Continuación del recibo 10 en la misma rama local basada en `26e51f3`. No hay commit, push, publicación, cuentas cloud nuevas ni migración remota. El flag permanece apagado por defecto; las aulas V1 no se convierten. Se reutiliza la interfaz de Ayni y la cola privada V2 existente.

En Mi año, dentro de un proyecto confirmado, **Qué quieres preparar → Varias actividades en lote** permite elegir de dos a cinco actividades. La primera actividad confirma previamente el maestro y sus criterios; este lote añade las siguientes y no crea otro maestro. Se elige una fecha inicial y se muestran las siguientes fechas lectivas disponibles del mismo tramo. No se cruza al siguiente proyecto/bimestre ni se completa con días no lectivos. Se mantiene el máximo de treinta actividades por proyecto. Si faltan fechas o posiciones, se informa el límite sin solicitar IA.

La competencia o conjunto de competencias elegido se conserva en todas las actividades del lote, dentro del límite existente de seis familias y de las oportunidades por edad del proyecto. La docente puede continuar con otro lote u otra actividad después. No es una preparación automática ilimitada de todo el año.

## Preparación, revisión y guardado

Una tarea durable `activity_batch` realiza una sola solicitud de propuesta, con esquema estricto `proposals` de dos a cinco actividades. Usa el workflow/router existente de actividad y la configuración explícita de proveedor multiedad. No hereda credenciales generales ni envía fotos o audios. El presupuesto del lote es 300 s, dentro del lease de 360 s; una interrupción no se reintenta sola y conserva el aviso de consumo incierto y máximo de tres intentos explícitos.

El prompt incluye el maestro confirmado, las actividades previas, la posición inicial, fechas exactas, referentes oficiales por edad e indicaciones docentes seleccionadas. Pide continuidad y variación con una profesora; no presupone logros ni convierte una previsión en actuación observada. La revisión de calidad pedagógica sigue siendo docente: comprobar un JSON válido no acredita adecuación de todas sus propuestas.

Preparar no crea actividades confirmadas. Abrir o recuperar el lote solo consulta la tarea guardada, sin nuevas llamadas. Para volver después de recargar se seleccionan el mismo proyecto, cantidad, fecha y competencias, y aparece **Revisar lote guardado**. Los cambios manuales de los campos aún no confirmados no se autoguardan; se mantiene la advertencia de salida con cambios.

La revisión muestra cada actividad con fecha, título, propósito, inicio/desarrollo/cierre y criterios, posibles evidencias y referentes de 3/4/5. Permite editar sus textos. Una casilla por actividad exige revisar sus criterios antes de **Confirmar lote**. Las fechas/cantidad/competencias se conservan en la confirmación; cambiarlas requiere preparar y revisar el lote correspondiente.

El servidor valida propiedad, aula V2, proyecto/maestro, revisión curricular, plan/tramo, siguiente posición y vigencia de fuentes. Rechaza edades ausentes/cruzadas, referentes diferentes del maestro, fechas fuera del tramo, cantidades distintas y títulos o secuencias idénticos dentro del lote. El validador de posiciones futuras usa un offset exclusivamente interno; ningún cliente puede autorizar un salto enviando ese parámetro.

El guardado comprueba la tarea una vez y escribe las actividades dentro de una única transacción/recibo. Cada escritura vuelve a comprobar la siguiente posición real. Si falla una, se revierte todo el lote y el recibo: no quedan actividades parciales. Repetir la confirmación con el mismo recibo recupera sus IDs incluso si la tarea ya quedó obsoleta. Si otra actividad ocupa la posición o cambian las fuentes antes de confirmar, se bloquea todo el lote y se conserva su salida histórica.

El maestro, las actividades previas, observaciones, valoraciones, conclusiones y documentos confirmados no se reescriben. Cada actividad nueva tiene identidad y criterios propios con `source_project_criterion_id` y los mismos referentes oficiales de su competencia/edad. Después usa el lector y la captura individual ya existentes.

## Migración, permisos y rollback

Migración nueva `0082_multi_age_activity_batches.sql` y equivalente `202610230004_multi_age_activity_batches.sql`: amplía únicamente la lista de tipos de la cola V2. No crea tablas de datos infantiles, modifica políticas ni hace backfill. Se conserva RLS de propiedad, denegación de escritura directa del cliente e historia inmutable. SQL Supabase comprobado solo en PGlite temporal, sin aplicar en cuentas remotas.

El escritor común se extrae dentro del servicio V2; sus dos entradas públicas comprueban permisos y recibos antes de usarlo en la misma transacción. La ruta nueva `/api/multi-age/activity/batch` conserva autenticación, rechazo de identidad enviada por cliente, Origin/JSON y gate local. Las rutas V1 y sus handlers no cambian.

Rollback: apagar el gate conserva V1 y los datos locales. Detener el launcher conserva el almacén. No eliminar una migración aplicada ni bajar a un worker que desconozca `activity_batch` sobre tareas pendientes: mantener código compatible de lectura/cola o usar otro almacén ficticio. Todo futuro ajuste de esquema requiere migración nueva.

## Validación ejecutada

**123 pruebas distintas PASS**: lote 14, HTTP persistente ampliado 5, multiedad 41, aplicación principal 7, conversación/persistencia/paridad de esquema 15 y proveedor/navegación 41. El comando `npm run test:multiedad:lote` agrupa las primeras 19; no volver a sumar el HTTP si se ejecuta también desde otro script.

Se comprobaron una sola llamada por lote, máximo de cinco, revisión sin escrituras, tres edades, rollback ante fallo SQL en la última actividad, confirmaciones concurrentes/repetidas, fuentes obsoletas con output original conservado, proveedor malformado sin reintento implícito, fechas/posiciones/referentes inválidos, dos propietarios RLS y denegación de escritura directa. HTTP prepara un lote de tres después de tres actividades previas, reinicia antes y después del guardado, conserva notas/informes y descarga previamente siete Word. No se inventan notas para verificar la nueva preparación.

Navegador con proveedor **simulado y rotulado** en `qa-persistencia-20261023`: prepara actividades 3–5, reinicia el servidor, recupera el mismo lote, revisa los criterios de cada edad, edita el título de la tercera, confirma las tres y conserva las actividades 1–2. Móvil emulado 390 sin desborde horizontal (375 px útiles y de contenido), escritorio 1366; no celular físico. Evidencia privada en `.local/multi-age-main-20261023/lotes/`. No se hicieron llamadas reales nuevas de IA en esta fase; las muestras reales del recibo 10 eran conversación y actividad individual, no lote.

Typecheck, lint y build Vinext ejecutados. Lint conserva la advertencia previa de dependencias en `diagnostic-generation-control.tsx`; build conserva avisos de PGlite/eval, tamaño de chunks y clasificación estática. No equivalen a una validación de staging remoto ni de latencia/adecuación de un lote real del proveedor.

## Pendientes fuera de esta fase

Al cerrar esta fase quedaban pendientes persistencia/Auth/RLS en staging real con cuentas propias; muestra de lote con proveedor real y revisión pedagógica de su variedad; edición/versionado de maestros y reorganización anual; voz V2, Word de actividad/proyecto V2, Excel y cierres. La muestra real de tres actividades se completa posteriormente en [el recibo 12](12_PRUEBA_REAL_DE_LOTE.md), con alcance y límites propios. Esta entrega no declara toda Unidocencia lista para publicar.
