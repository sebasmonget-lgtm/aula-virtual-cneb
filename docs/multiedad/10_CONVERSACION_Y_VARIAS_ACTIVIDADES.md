# Conversación con Ayni y varias actividades por proyecto

## Entrega local

Continuación del recibo 09 sobre la misma rama y base `26e51f3`. Conserva la interfaz de Ayni y la elección inicial expresa de Unidocencia. No se convierte ninguna aula V1 ni se publica, hace push o abre una base cloud. El launcher sigue aislado; sus datos son ficticios.

Ahora un proyecto conserva varias actividades con identidad, fecha, momentos, criterios y observaciones propios. La preparación es sucesiva y revisable: actividad 1, 2, 3…; no se anuncia una generación automática de todo el proyecto en lote.

## Conversación y decisiones

La conversación anual y la de cada proyecto tienen alcances separados. Reutilizan `AyniChatMessage`, `AyniTyping`, controles y CSS de la conversación existente; no se conectan las rutas escalares V1 a un aula de tres edades.

Cada turno docente y su respuesta son una tarea durable de la cola V2, con ordinal, destinatario y fuentes. El mensaje se guarda con su tarea en la misma transacción/recibo; una respuesta perdida no lo duplica. Recuperar, navegar o recargar solo consulta. La respuesta usa el router existente: `annual_journey_conversation` o `project_conversation`; el runtime no hereda claves al frontend. El modo simulado sigue rotulado.

El chat distingue actuaciones observadas, relatos familiares, indicaciones docentes y sugerencias. No convierte preguntas u órdenes como guardar/continuar en temas del proyecto ni incorpora sus respuestas como evidencias. Una respuesta no modifica un plan, actividad, criterio o nota. Se limita a treinta turnos por alcance y conserva el historial.

**Usar mi indicación para próximas propuestas** requiere confirmación expresa y guarda el texto docente literal en una nueva versión. **Retirar mi indicación** crea otra versión; no elimina su historia. No se incorpora texto inventado por el asistente como decisión docente. Los snapshots de `multi_age_planning_decisions` son inmutables y se verifican contra un turno propio de la misma aula/alcance. RLS permite lectura propia y niega escrituras directas del cliente.

Las indicaciones anuales alimentan nuevos borradores. Preguntar o confirmar una indicación futura no invalida el año ya confirmado: se distingue su huella base guardada de la última propuesta. Cambiar matrícula/diagnóstico sí mantiene las guardas de revisión anteriores. Las indicaciones del proyecto orientan actividades siguientes y nunca reescriben el maestro o las anteriores. Si cambian después de preparar una propuesta, esta deja de poder aplicarse y se conserva como historia.

## Un proyecto, varias actividades

El primer guardado conserva el maestro de proyecto existente. Los siguientes exigen su ID propio, huella vigente y siguiente posición, además del plan/tramo/fecha lectiva. La posición admite hasta treinta actividades, incluso dos posiciones en una fecha si la docente así lo decide. La fecha sugerida avanza al siguiente día lectivo disponible; la docente puede revisarla.

Se reutiliza la misma fila de proyecto y sus criterios maestros. Cada actividad tiene IDs nuevos, su secuencia y los criterios de sus competencias/edades. Cada criterio hereda el ID de criterio padre y exactamente sus referentes oficiales; no se amplían referentes ni se cambia una edad para completar la generación. Un docente/plan/proyecto ajeno, posición ocupada o huella antigua se rechaza. La unicidad de posición y las transacciones evitan duplicaciones por concurrencia o respuesta perdida.

La primera actividad y sus fuentes permanecen intactas. Las observaciones posteriores se agregan a las fuentes pertinentes de cada niño/competencia/bimestre. Una valoración anterior no se sustituye automáticamente: si la evidencia cambió, requiere revisión. Los informes ya confirmados conservan sus textos.

El maestro histórico V2 se lee sin reescribirlo: su actividad previa ocupa la posición 1. Las nuevas huellas de maestro se normalizan por claves JSON, sin alterar las huellas históricas guardadas en observaciones o actividades anteriores.

## Cómo se ve una actividad

Se mantiene `ActivityReadingView`: título, fecha, número dentro del proyecto, propósito, momentos comunes, acompañamiento y observación. Desde Mi año cada enlace abre la actividad exacta; el selector permite consultar otra y la URL conserva la selección al recargar.

La sección **Qué observar en cada edad** muestra por grupo su competencia, criterio, actuación que podría observarse y momento previsto. En el ejemplo de comunicación oral:

| Grupo | Foco del ejemplo guardado |
| --- | --- |
| 3 años | Palabras, gestos o movimientos para expresar una elección. |
| 4 años | Preferencias o experiencias que comparte en una conversación. |
| 5 años | Ideas o experiencias que comparte y desarrolla en el intercambio. |

Son criterios del ejemplo, no reglas universales para todas las actividades. Al elegir un niño, el lector/captura utiliza su edad y solo permite sus criterios. La vista de todas las edades queda plegada y puede consultarse. El servidor rechaza cruces de edad aunque se manipule la interfaz. El período sugerido corresponde a la fecha de la actividad.

## Migración y permisos

Se añaden `0081_multi_age_conversation_and_activities.sql` y `202610230003_multi_age_conversation_and_activities.sql`, sin editar migraciones previas. Amplían el tipo de tarea, añaden unicidad de turno/posición y snapshots de indicaciones con RLS y trigger de propiedad/literalidad. No hacen backfill ni modifican maestros, observaciones, notas o informes. Solo se aplican en los almacenes PGlite aislados y SQL Supabase temporal de prueba; no en cuentas remotas.

## Validación

Las pruebas funcionales cubren tres actividades en un mismo proyecto, criterios heredados, observaciones de tres edades, maestro/primera actividad conservados, respuesta perdida, rechazo de proyecto/posición/referentes incorrectos y relectura tras reiniciar. El chat comprueba que una pregunta no cambia fuentes, selección/retiro literal y versionado, alcances anual/proyecto independientes, obsolescencia de propuestas y rechazo de una respuesta con nota fuera del contrato. SQL local prueba RLS de dos docentes y escritura/historia restringidas.

Los comandos son `npm run test:multiedad:conversacion`, `npm run test:multiedad:persistencia`, las suites anteriores y los gates habituales. No se suman dos veces las cuatro pruebas HTTP compartidas entre los dos comandos.

Resultado ejecutado: **108 pruebas distintas PASS**: multiedad 41, aplicación 7, persistencia unitaria 8, HTTP persistente 4, conversación/actividades 6 y regresión de esquema/proveedor/navegación 42. `tsc --noEmit`, lint y build Vinext PASS después de los cambios finales de lector/captura. Lint conserva una advertencia previa en `diagnostic-generation-control.tsx`; build conserva avisos de PGlite/eval, tamaños de chunks y clasificación estática. `git diff --check` sin errores de whitespace.

Muestra real separada: `.local/multi-age-main-20261023/conversacion-actividades/live-1792774688362/receipt.json`, `status:passed`. Dos respuestas válidas de `gpt-6-luna`, conversación de proyecto y actividad 2, sin reintentos ni timeout. Se retoma solo el almacén ficticio del smoke anterior, con selección explícita de la clave de texto local en memoria. Se conserva el maestro y aparecen dos actividades. Se revisaron las respuestas: la conversación distingue 3/4/5, no afirma guardar/cambiar, y la actividad usa solo los bloques indicados, con referencias heredadas de PS_IDENTIDAD por edad. Subtotal estimado del ledger de estas dos llamadas: USD 0,001636725; no es el costo total de las fases anteriores.

Prueba de navegador en el almacén simulado `qa-persistencia-20261023`: enviar mensaje, confirmar indicación, preparar/revisar/confirmar actividad 2, conservar actividad 1 y abrir la segunda por su enlace. Después de reiniciar el servidor se recuperan ambas actividades y la preparación de la tercera; recargar el enlace de actividad conserva la segunda, su propósito y posición 2 de 2. Seleccionar al niño de 4 años muestra únicamente su criterio y el bimestre de la fecha prevista. Evidencia privada bajo `.local/multi-age-main-20261023/conversacion-actividades/`: `chat-y-proyecto.png`, `actividad-por-edad.png` y `movil-criterio-4.png`, separada de los outputs reales. Se conserva la identificación de simulación, no se confunde con esa muestra real. Escritorio 1366 y viewport móvil 390, sin desborde horizontal (contenido y ancho útil 375 px); no celular físico. Se restablece el viewport al terminar, sin guardar una observación inventada.

## Límites y rollback

Al cerrar esta fase continuaban pendientes rollout persistente/Auth/RLS real en staging, reorganización del año preservando proyectos preparados, edición/versionado de maestros, preparación en lote, conversación por voz, Word de actividad/proyecto V2, Excel, cierres y los otros casos del recibo 09. La preparación en lote continúa localmente en [el recibo 11](11_ACTIVIDADES_EN_LOTE.md), con límites y validación separados. No se presenta toda Unidocencia como lista para publicación.

Con el flag apagado V1 no consulta estas tablas/rutas. Detener el launcher conserva el almacén; volver a la ejecución temporal no lo borra ni convierte sus filas. No retirar la migración aplicada ni bajar a un escritor que asuma una sola actividad: conservar el código lector compatible o trabajar con un almacén de prueba nuevo. Toda futura migración es aditiva y la publicación sigue requiriendo autorización expresa.
