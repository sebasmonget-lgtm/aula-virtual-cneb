# Recorrido docente para trabajar con varias edades

La profesora trabaja con una sola aula y una jornada compartida. Ayni hace visibles las variantes que necesita para planificar, observar y evaluar sin obligarla a mantener tres proyectos paralelos. Este recorrido propuesto del 22 de octubre de 2026 complementa el [modelo de datos](01_MODELO_Y_CRITERIOS.md), los [contratos de IA](03_CONTRATOS_Y_PROMPTS.md) y el [plan de implementación](04_IMPLEMENTACION_MIGRACION_Y_PRUEBAS.md).

La navegación conserva Mi año, Hoy, Calendario, Evaluar y Documentos, con Mi aula para matrícula y conocimiento del grupo. Se conserva la guía sin inicio o cierre manual, la observación libre, el acceso directo al chat y la confirmación docente de valoraciones y textos. No se implementa ni publica interfaz en esta entrega documental.

## Configurar un aula nueva

La configuración ofrece «Una edad» o «Varias edades». En varias edades se seleccionan dos o tres grupos entre 3, 4 y 5 años. El calendario y la sección siguen siendo del aula; no se crean aulas artificiales por edad ni cuentas adicionales.

La composición se muestra como «3, 4 y 5 años». Las condiciones de atención se registran aparte: «Trabajo sola con el aula» y apoyo confirmado, si existe. No se agrega auxiliar, director, equipo digital ni participación familiar por inferencia. Los datos institucionales y el logo conservan su función actual.

Puede configurarse la composición antes de registrar alumnos. La planificación distingue los grupos previstos de los que ya tienen niños matriculados. Registrar un grupo vacío no genera evaluaciones ni conclusiones.

El guardado confirma el aula y su revisión en una transacción idempotente. Ante pérdida del acuse, se consulta la misma solicitud; no se crea una segunda aula. Volver a la pantalla no reactiva un proceso de IA.

## Aulas existentes

El aula actual conserva su edad y funcionamiento. No se convierte por mostrar el selector nuevo ni por instalar lectores V2. En la primera implementación multiedad se ensaya solo con fixtures locales; una transición real queda fuera hasta completar los gates.

Cuando el flujo de transición esté disponible, «Cambiar a varias edades» presenta una revisión concreta: grupos nuevos, grupo asignado a cada niño, planes futuros afectados y documentos históricos que se conservarán. La profesora confirma toda la revisión una vez; cancelar no escribe datos. Si hay una corrección retroactiva que afecta un cierre, se conduce a su reapertura explícita antes de aplicarla.

La transición nunca reemplaza silenciosamente los criterios de actividades ya observadas. Mientras un plan histórico no tenga una versión futura compatible, se mantiene su consulta con el contexto original y se permite conservar observaciones libres. Las nuevas observaciones guiadas por edad se habilitan cuando existe una variante válida.

## Registrar y mantener la matrícula

Cada niño tiene nombre, grupo curricular confirmado y nacimiento opcional. La selección de grupo muestra solo los atendidos por el aula. Para importar listas, la previsualización incluye grupo y errores por fila; no se guarda parcialmente una lista si ese no es el contrato explícito de importación. Se conservan los límites actuales del piloto hasta que otra decisión los cambie.

Si falta nacimiento pero se conoce el grupo, se puede continuar. Si solo se conoce nacimiento, se pide confirmar grupo; el primer alcance no calcula automáticamente una matrícula con una fecha de corte no validada. Los cumpleaños funcionan cuando existe fecha y no cambian el grupo.

Mi aula muestra una lista y filtros «Todos», «3 años», «4 años» y «5 años», con sus cantidades. Nombre completo y grupo permanecen visibles en selección y ficha. Filtrar no cambia la matrícula ni crea subaulas. Se conserva búsqueda, retiro y recuperación con su historial.

En una reincorporación del mismo año se consulta la asignación histórica y se confirma cualquier corrección necesaria. En otro año se establece la matrícula correspondiente; no se fusionan personas por coincidencia de nombres ni se arrastra una edad incrementada automáticamente.

## Conocer a los niños

Las entrevistas familiares siguen siendo individuales y conservan sus versiones y dictado. No se triplica el cuestionario por edad. Las respuestas pueden orientar la participación y los apoyos, pero no se convierten en observaciones directas ni notas.

En observación inicial guiada, la profesora consulta una experiencia compartida y sus variantes presentes. Al seleccionar un niño se muestra el referente y la orientación de su grupo. Los ejemplos son posibilidades y no frases que el niño debe repetir.

La matriz distingue información por niño y competencia y permite filtrar por edad. Una celda sin registro significa falta de información, no dificultad. La recomendación de a quién observar utiliza cobertura pertinente, sin convertir un conteo en nivel ni hacer invisibles a los grupos pequeños.

La síntesis opcional puede explicar lo común, lo observado en una edad y lo individual. Cada afirmación mantiene su alcance y fuentes. La profesora puede ir al chat y planificar con información incompleta; no se restituye una pantalla obligatoria de diagnóstico o prioridades.

## Conversar y preparar Mi año

El chat conoce edades, composición y condiciones ya guardadas. Si una docente dice «trabajo sola», lo registra como condición para organizar las propuestas, no como un tema infantil. Las órdenes como «guardar» o «crear Mi año» conservan la separación vigente entre instrucciones de uso y contexto pedagógico.

Se mantiene una pregunta breve por turno. Solo se pregunta por decisiones necesarias que faltan; no se repiten edad, fechas ni recursos ya informados. La falta de observaciones no bloquea la planificación ni se rellena inventando intereses de los niños.

Mi año conserva quince tramos y las reglas de calendario actuales. Cada propuesta puede indicar participación de toda el aula o de grupos determinados, y la revisión permite comprobar oportunidades por edad a lo largo del año. La vista general sigue siendo breve; el detalle de mediación pertenece al proyecto y a la actividad.

Cambiar una propuesta, reutilizar Biblioteca o incorporar una invitación nueva conserva los destinatarios y exige revisión si cambian. Las oportunidades futuras de una edad no se acreditan por haber planificado la misma competencia para otra.

## Preparar el proyecto

La profesora revisa una situación significativa y un propósito compartidos, las competencias elegidas y las oportunidades de los grupos participantes. Se conserva el calendario confirmado y la preparación recuperable.

La vista de criterios agrupa por competencia. Dentro de cada familia muestra 3, 4 y 5 años cuando hay variantes para esos grupos, con texto, evidencia esperada y acceso al referente oficial. Una misma redacción puede repetirse si es pertinente; las variantes siguen teniendo identidad propia.

Para cada actividad se especifican grupos participantes y oportunidades concretas por competencia. No se exige trabajar todas las competencias en todas las edades en cada fecha. Tampoco se elimina una competencia del recorrido de un niño por no ser destinatario de una actividad particular.

Antes de confirmar, Ayni presenta la organización: momentos comunes, agrupamientos, lugar de acompañamiento de la profesora y qué harán los demás. Si una propuesta exige atención simultánea incompatible o recursos inexistentes, se revisa antes de publicarla como secuencia lista.

Los cambios en propósito o acciones infantiles siguen el flujo de revisión y nueva secuencia. Ajustes logísticos conservan su tratamiento actual y no disparan tres generaciones nuevas. Las actividades trabajadas y las versiones confirmadas quedan protegidas.

## Consultar la guía de una actividad

La guía abre en la secuencia común: preparación, inicio, desarrollo y cierre pedagógico. «Cierre» aquí es un momento de la actividad, no un botón que marque ejecución ni el cierre evaluativo del bimestre.

Debajo del momento correspondiente se muestran variantes breves por edad para participación, mediación y observación. En escritorio se pueden comparar; en celular se consultan en secciones que conservan el grupo elegido. No se fuerzan tres columnas pequeñas ni se ocultan los grupos que la profesora necesita atender.

Ejemplo de organización posible: una invitación común, exploración en parejas o pequeños grupos con materiales compartidos, acompañamiento de la profesora a quienes lo necesitan y conversación final. Es una posibilidad de diseño; la agrupación concreta depende de la actividad y los recursos confirmados. Los mayores no quedan siempre a cargo de ayudar a los pequeños.

El tiempo estimado corresponde a la jornada compartida, no a sumar tres actividades completas. Si una propuesta se dirige a un grupo, la guía explica qué oportunidad realizan los otros y si requiere o no acompañamiento; no deja niños sin una organización prevista.

## Hoy y asistencia

Hoy mantiene la actividad prevista, asistencia y Observación libre. Los talleres continúan siendo opcionales al final. Abrir o avanzar en la guía no escribe realización, no crea evidencia ni bloquea por sí solo una reprogramación.

Asistencia conserva un registro por niño y fecha. Filtrar una edad cambia la vista, no la fecha ni los registros del resto. Las acciones colectivas muestran su alcance exacto; una selección «Todos» con filtro debe decir si afecta al grupo visible o al aula y el servidor debe aplicar ese mismo alcance.

Las recomendaciones de observación distinguen quiénes tienen oportunidad pertinente ese día y quiénes carecen de registros. No interpretan ausencia como dificultad ni obligan a observar a todos en todos los criterios durante una misma jornada.

## Registrar una observación

1. La profesora selecciona al niño por nombre, con grupo visible.
2. Ayni muestra las competencias y variantes pertinentes a ese niño y actividad. Si hay más de una competencia, la selección es explícita; no mezcla criterio principal con evidencia secundaria.
3. La profesora escribe o dicta lo que hizo o dijo el niño. Los apoyos efectivamente registrados se distinguen de los previstos.
4. El servidor valida asignación, variante, revisión, fecha y permisos, y devuelve el registro canónico.
5. Al guardar y registrar otro, se actualizan conteos sin mover inesperadamente los nombres o cambiar el seleccionado.

Si la variante cambió durante la edición, se conserva el texto y se ofrece revisar el contexto. No se cambia el criterio silenciosamente ni se reenvía el mismo ID de solicitud con otro contenido. Los cambios de filtro o navegación avisan de texto sin guardar según el patrón actual.

Observación libre permanece disponible fuera de una actividad o cuando todavía falta un criterio compatible. La captura del hecho no inventa una asociación curricular. Fotos y audio conservan privacidad y no se envían automáticamente a IA.

Si el aula histórica está pendiente de confirmar grupos, se puede conservar una observación libre identificada como pendiente de contexto. Esa excepción de recuperación no permite crear matrículas multiedad nuevas sin grupo ni ejecutar análisis por edad adivinada.

## Talleres y recursos

Biblioteca muestra cuáles edades tienen adaptación disponible. La etiqueta multiedad no basta: la selección comprueba contenido para todos los destinatarios y una organización conjunta viable. Si falta una variante, se ofrece otro taller o selección explícita de grupos; no se copia la de una edad distinta.

Programar conserva un taller y sus variantes como snapshot en una sola fecha, respetando la regla vigente de talleres por día. Una ficha específica para 5 años no se imprime automáticamente con nombres de niños de 3. Los recursos compartidos y por grupo se identifican sin convertirse en nuevos módulos principales.

## Evaluar el período

La profesora entra a Evaluar, elige competencia o niño y puede filtrar por grupo. El detalle muestra el grupo del niño, los criterios pertinentes realmente vinculados y sus observaciones. Un análisis individual no recibe como referencia general la edad de otro grupo.

Se conservan análisis previo, valoración docente y guardado recuperable. La IA no asigna AD/A/B/C, ni una variante produce notas extra. Los estados diferencian evidencia insuficiente, ausencia, oportunidad pendiente y fuentes que necesitan revisión; no se usan como sinónimos de una nota baja.

Una competencia del ciclo puede ser pertinente aunque falte desempeño específico para una edad. En ese caso se explica el referente disponible; no se copia otra edad ni se marca «no aplica» automáticamente.

Las conclusiones permanecen en Informe a familias después de las valoraciones pertinentes. Los filtros no cambian la elegibilidad: el primer alcance conserva la comprobación global del período y no crea cierres independientes por edad. La pantalla explica qué niño y fuente tienen pendientes para que no parezca un bloqueo anónimo.

## Informes y cierre

El informe individual identifica el grupo curricular del niño y conserva las conclusiones confirmadas. Las recomendaciones familiares no alteran notas ni hechos. Consolidado permite consultar todas las edades o filtrar; un futuro Excel puede separar hojas por grupo conservando también el conjunto y los datos literales.

Los documentos comunes identifican el aula multiedad y sus variantes. El diseño impreso debe evitar páginas enormes o columnas ilegibles. Documentos y pantalla utilizan el mismo snapshot; no generan nuevas decisiones pedagógicas al descargar.

El cierre sigue siendo del aula y período. Su manifiesto conserva composición y grupo de cada niño, fuentes y versiones. Reabrir exige motivo y recerrar produce otra versión. Ningún cumpleaños, filtro o cambio de etiqueta altera un cierre anterior.

## Cambios y recuperación

| Situación | Comportamiento esperado |
| --- | --- |
| Nuevo niño de un grupo ya atendido | Confirmar matrícula, comenzar su evidencia y actualizar cobertura; no regenerar todo el año. |
| Nueva edad atendida | Revisar configuración y asignaciones, preparar oportunidades futuras compatibles y conservar historia anterior. |
| Grupo mal asignado | Nueva revisión con motivo; mostrar borradores y cierres afectados antes de aplicar la corrección. |
| Niño retirado | Conservar fuentes, archivos, valoraciones e informes; retirarlo de listas activas según reglas vigentes. |
| Generación incompleta de una edad | Conservar avance y explicar qué falta; no marcar toda la secuencia como preparada. |
| Servicio de IA no disponible | Consultar lo guardado y conservar captura manual; retomar el trabajo autorizado sin duplicar solicitudes. |
| Desactivación operativa de multiedad | Conservar lectores e historia; no presentar el aula como una sola edad. |

## Criterios de aceptación de experiencia

La profesora puede completar el recorrido con un niño de cada edad, desde matrícula hasta informe, sin cambiar manualmente la edad de referencia en cada pantalla. Puede comparar criterios, identificar a quién observa, recuperar trabajo tras recargar y entender un conflicto sin perder el texto.

La revisión conjunta de escritorio y celular incluye nombres largos, grupos vacíos, 45 niños activos dentro del límite actual, teclado y foco, errores de guardado, red interrumpida y documentos impresos. Se prueba con una profesora sola y sin apoyos supuestos. La validación pedagógica comprueba viabilidad de las tareas simultáneas y participación de las tres edades, además de la corrección del currículo.
