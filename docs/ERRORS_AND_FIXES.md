# Errores y soluciones

## 2026-09-27 El calendario persistido invalidaba el propio preplan anual (H08)

**Síntoma.** Un preplan recién generado se recargaba con doce propuestas, pero guardar una edición válida o confirmar intacto devolvía «Revisa los datos de la propuesta 1».

**Causa raíz.** Persistencia añadía cuatro campos derivados no reconocidos por el validador estricto de filas. La revalidación también ejecutaba un UPDATE idéntico que incrementaba la revisión optimista antes de confirmar.

**Solución validada en regresión.** El validador del round-trip admite únicamente los metadatos derivados conocidos, devuelve campos editables y conserva el esquema del modelo estricto. Las fechas/días se recalculan desde el calendario de servidor; el UPDATE se omite cuando JSONB es igual. Las dos regresiones fallaron antes y pasan después sobre PGlite con todas las migraciones, incluyendo persistir/recargar/confirmar intacto y editar/guardar/recargar/confirmar. 63 tests relacionados, typecheck, lint y build PASS. La comprobación E2E por UI continúa después del commit; no se presenta aún como PASS funcional.

**Prevención.** Probar el objeto enriquecido que vuelve de PostgreSQL, no solo el objeto inicial del modelo. Un recalculo sin cambios no debe mutar una revisión. Mantener rechazo de campos desconocidos, IDs no aplicables y revisiones obsoletas. Sin migración ni cambios en el aula original; ver ADR 084.

## 2026-09-27 La revisión opcional de cada niño seguía bloqueando el resumen del aula

**Síntoma.** El acceso individual estaba al final de una tabla ancha, el resumen exigía comentarios confirmados de todos los niños y su información se recortaba dentro de un scroll. Mover solo el botón no habría permitido avanzar sin revisar a cada niño.

**Causa raíz.** Interfaz y servidor compartían una regla de completitud individual obligatoria. La huella grupal dependía de todos los comentarios, en vez de las fuentes disponibles. La síntesis de Ayni también asumía comentarios de cada niño como única fuente.

**Solución validada.** Los accesos quedan debajo del mapa; el comentario es opcional y sin generación individual. El snapshot v2 usa padrón y fuentes actuales más comentarios vigentes disponibles. Pruebas aisladas confirman resumen y prioridades sin comentarios, preservan versiones confirmadas y rechazan confirmación tras cambiar fuentes o padrón. La sugerencia grupal usa una proyección anónima, acotada y solo por solicitud, con ausencia de información explícita. La información de aula crece con la página y la navegación coloca volver y avanzar en lados opuestos. La transcripción de comentario/resumen es literal y los permisos rechazan alumnos/aulas ajenas y scopes ambiguos antes de llamar al proveedor. Ver ADR 083.

El exportador Word asumía además un comentario por cada niño. Ahora cuenta solo comentarios existentes; el test del XML verifica cero cuando no se registraron, mantiene todos los nombres autorizados y las observaciones, y no afirma que haya comentarios confirmados inexistentes. No se hizo revisión visual del Word en este cambio.

**Prevención.** Cubrir la ruta vertical interfaz/servidor/exportación: algo descrito como opcional no debe ser una precondición oculta ni inflar conteos del informe. Los snapshots nuevos necesitan lectura compatible de versiones históricas y detección de fuentes nuevas, aun sin comentarios individuales. Mantener ejemplos como placeholders, no autocompletarlos como evaluaciones.

## 2026-09-27 Reconsultar observaciones informaba éxito sin una recomendación

**Síntoma.** «Sugerir con Jev» parecía no hacer nada; la UI seguía mostrando todas las competencias y podía informar una actualización exitosa aunque la nota hubiera sido bloqueada o el modelo se hubiera abstenido.

**Causa raíz.** La presentación trataba HTTP 200 como clasificación exitosa, sin distinguir privacidad, suficiencia o indisponibilidad. Exponía el catálogo completo antes de obtener una candidata, pese a existir guardado y clasificación automáticos en segundo plano.

**Solución validada.** Se deriva y expone un estado cerrado sin texto interno sensible. La tarjeta de Ayni presenta automáticamente principal/adicionales, carga y mensajes específicos; un error de consulta permite reintentar y el catálogo solo aparece al editar. La ruta genérica autorizada conserva el alias anterior y la respuesta tardía no sobrescribe una decisión docente. Las pruebas incluyen bloqueo de privacidad, abstención, error, acceso entre docentes y carrera con confirmación manual. Guardar una nota ficticia desde la UI produjo automáticamente `MAT_CANTIDAD`; abrir, añadir una segunda opción y cancelar no guardó cambios.

**Prevención.** Probar resultados vacíos además del camino exitoso. Derivar feedback del resultado de dominio, no del código HTTP; mantener las selecciones locales durante el polling y condicionar escrituras asíncronas a no tener clasificación docente.

## 2026-09-27 La etiqueta numérica de observaciones ficticias bloqueó su clasificación

**Síntoma.** Las doce espontáneas del lote local se guardaron y proyectaron al perfil, pero permanecieron por revisar sin sugerencias ni fuente de clasificación. No demuestra un fallo o falta de precisión del modelo.

**Causa raíz comprobada.** Su prefijo `[PRUEBA FICTICIA · OBS-20260927]` contiene un número de ocho dígitos. `anonymousDecisionText` rechaza números de siete o más dígitos como posibles identificadores antes de cualquier llamada externa. Una comprobación local aceptó 0/12 notas con el prefijo y 12/12 al retirarlo solamente en memoria, sin llamar a IA.

**Solución validada.** Se retira únicamente el prefijo inicial conocido de prueba al construir el texto temporal del modelo; la nota guardada permanece idéntica. Todas las reglas de privacidad se aplican al cuerpo. Las pruebas mantienen bloqueados identificadores/información familiar incluso con la marca, marcas desconocidas y prefijos no iniciales. La reconsulta real de las 12 filas produjo 10 recomendaciones y 2 abstenciones de Jev, sin errores; ninguna competencia quedó confirmada por la prueba y las entrevistas se conservaron. Una nota nueva con marca ficticia obtuvo automáticamente `MAT_CANTIDAD` desde la UI. Estos resultados verifican conexión/flujo, no aciertos adjudicados por especialistas.

**Prevención.** Mantener el filtro numérico general. En futuros fixtures preferir una marca visible no numérica y conservar fecha/identificador en el reporte local; comprobar admisibilidad con el mismo anonimizador antes de guardarlos. Nunca borrar la marca de las fuentes guardadas ni aceptar datos privados por pertenecer a un fixture.

## 2026-09-27 Los nombres históricos conservaban caja irregular en las entrevistas

**Síntoma.** La lista de entrevistas y sus preguntas seguían mostrando un nombre con mayúsculas mezcladas, aunque la lista principal de alumnos ya usaba capitalización legible.

**Causa raíz.** Diagnóstico recibía el nombre histórico directamente y el editor familiar lo interpolaba sin pasar por la función compartida de presentación.

**Solución validada.** La lista y los encabezados infantiles del diagnóstico, y el nombre usado en las preguntas y la impresión de la entrevista, reutilizan `displayPersonName`. No se reescriben alumnos ni entrevistas. Las pruebas de nombres y el contrato del flujo protegen esas llamadas; la lista se verificó en el navegador local.

**Prevención.** Aplicar la función de presentación en cada nueva vista de nombres históricos, sin confundir el formato visible con una corrección de identidad.

## 2026-09-27 Los campos editables parecían deshabilitados o texto plano

**Síntoma.** En «Mi aula» los campos de nombre no tenían estilo de control. En el alta inicial, un equipo con preferencia de modo oscuro mostraba los `Input` en gris pese a que la página es clara.

**Causa raíz.** El formulario de niños usaba elementos `<input>` sin clases fuera de `ayni-workflow`. Además, los componentes compartidos mantenían `dark:bg-input/30`, activado por la preferencia del sistema aunque Ayni no cambia su paleta; los bordes de entrada eran demasiado pálidos.

**Solución validada.** «Mi aula» usa campos compartidos con etiquetas persistentes, bordes visibles, envío semántico y estado de carga. Se retiró el fondo oscuro heredado y se fijó el borde compartido a `#71869d`, con contraste calculado de 3,75:1 sobre blanco. En el navegador local, con preferencia oscura activa, el fondo efectivo pasó a blanco y el borde al color previsto. Typecheck, lint, build y el contrato del flujo deben pasar antes de cerrar el cambio.

**Prevención.** Revisar el estilo computado con preferencias claras y oscuras cuando la app use una sola paleta. Proteger etiquetas, mensajes de carga y contraste de controles con pruebas de contrato; no depender del placeholder para identificar un campo.

## 2026-09-27 OpenRouter impidió la nueva prueba real de Jev

**Síntoma.** Al probar el nuevo flujo docente de dos decisiones con la clave del experimento, ambas solicitudes recibieron HTTP 402 y no devolvieron clasificaciones.

**Causa observada.** OpenRouter rechazó la cuenta por crédito insuficiente o límite de gasto. No se infiere la configuración exacta de la cuenta solo a partir del código HTTP.

**Solución validada.** Tras añadir crédito a la misma cuenta, la clave experimental volvió a responder con la versión efectiva `typesafe/jev-1.13-20260917`. El adaptador convierte 402 en `insufficient_credits` sin guardar ni mostrar la clave, la observación o el cuerpo de respuesta. Se completaron 154 llamadas clasificatorias de la nueva composición y pruebas reales de imagen y ficha con datos ficticios. La configuración Jev se habilitó solo en el backend local.

**Prevención y pendiente.** Comprobar crédito y límite de la clave antes de otra evaluación; repetir con presupuesto explícito y etiquetas expertas nuevas. El proveedor no debe impedir guardar la observación ni la confirmación manual. El puerto 4179 pertenece al experimento; la app principal se abrió en `localhost:5173` con su API local en 8788.

## 2026-09-27 El anonimizado de Jev ocultaba acciones observables

**Síntoma.** Notas como «Dibujó círculos» o «Señaló tres bloques» llegaban al clasificador como «[persona] círculos» o «[persona] tres bloques». En 28 de 30 notas anonimizadas del conjunto difícil se introducía al menos un marcador, aunque la comparación previa había omitido esta capa.

**Causa raíz.** Una expresión regular sustituía toda palabra capitalizada de tres o más letras que no estuviera en una lista breve de verbos; incluía verbos y conectores al inicio de frases.

**Solución validada.** Se amplió una lista cerrada de actuaciones y conectores no identificadores, manteniendo la sustitución previa de nombres conocidos y la redacción de capitalizados desconocidos. En el mismo conjunto, los marcadores bajaron de 28 a 3 notas; una nota continúa rechazada por la regla de privacidad. Pruebas comprueban que se conservan verbos y conectores, que un nombre desconocido se oculta y que un nombre conocido coincidente con un verbo también se neutraliza. El resultado pedagógico necesita evaluación separada; esta prueba verifica el texto, no la exactitud de Jev.

**Prevención.** Pasar los datasets de evaluación por el mismo anonimizador que usa el servidor y registrar por separado notas aceptadas, modificadas y enviadas a revisión. No ampliar vocabulario a partir de un caso real sin revisar la implicación de privacidad.

## 2026-09-27 El límite de cuatro candidatas seguía el orden curricular, no las puntuaciones

**Síntoma.** Si más de cuatro `noul` superaban el umbral, una competencia con puntuación mayor podía omitirse por aparecer después en la KB.

**Causa raíz.** El código aplicaba `filter(...).slice(0, 4)` sobre los IDs en orden original.

**Solución validada.** Ordena las candidatas por puntuación descendente y desempata por ID antes de limitar. Una prueba con cinco candidatas y puntuaciones ascendentes verifica que se conservan las cuatro mayores. Se aplica también al máximo de tres en planificación emergente. No se cambió el umbral ni se confirma ninguna competencia automáticamente.

**Prevención.** Probar los límites de listas con más candidatos válidos que plazas disponibles; separar orden semántico de orden de almacenamiento.

## 2026-09-26 La evaluación real trataba edad y competencia confirmada como ausentes

**Síntoma.** Project, Unit y Activity devolvían propuestas prudentes pero pendientes; la validación rechazaba sus rutas o la competencia aunque el input interno sí tenía edad e IDs.

**Causa raíz.** `AIContextBundle` filtraba correctamente las tarjetas por edad, pero no declaraba de forma explícita `target_age` ni `confirmed_competency_ids`. Además, el fixture comparativo de Project/Unit usaba el alias incorrecto `competencyIds`.

**Solución validada.** Se añadieron ambos campos explícitos al bloque curricular autorizado, se corrigió el fixture y las Skills indican conservar esas decisiones. Una repetición real completó Project, Unit, Activity e Informe Familiar sin fallback.

**Prevención.** Las pruebas del contrato verifican ahora edad objetivo e IDs confirmados; los evals reales usan los mismos nombres de campo que producción.

## 2026-09-26 Assessment Master parecía desactualizado al intentar confirmarlo

**Síntoma.** Un marco recién generado y guardado pasaba la consulta de estado, pero la confirmación respondía que la planificación o los criterios habían cambiado.

**Causa raíz.** La confirmación recalculaba la huella usando el ID del registro `assessment_masters` como si fuera el ID de `evaluation_periods`. La fuente quedaba estructuralmente distinta aunque ningún criterio hubiera cambiado.

**Solución validada.** La confirmación construye explícitamente el período con `evaluation_period_id`, fechas y etiqueta antes de recalcular el snapshot. Una prueba crea dos docentes y aulas, genera y confirma el marco propio, bloquea accesos cruzados y comprueba que cambiar la revisión de un criterio sí marca el marco como desactualizado.

## 2026-09-26 El router declaraba rutas que no podían ejecutarse

**Síntoma.** Una tarea `decision` podía devolver `provider: "typesafe"` aunque el factory no implementaba ese proveedor. El booleano `allow_escalation` tampoco indicaba qué modelo usar, por qué motivo ni cuántos intentos estaban permitidos.

**Causa raíz.** La política mezclaba capacidades previstas con implementaciones productivas y no existía un contrato explícito de fallback en la orquestación.

**Solución validada.** Las decisiones, Taller y materiales quedan como `unavailable`; el factory no crea providers para planes inactivos. Actividad declara un único fallback Luna/medium → Sol/low, ejecutado por la orquestación solo tras una validación de calidad. Las pruebas demuestran que Auth, rate limit y timeout no escalan y que contexto y schema son idénticos entre intentos.

**Prevención.** Todo workflow nuevo debe aportar provider, contrato, validadores y benchmark antes de marcarse productivo. La suite de routing comprueba que política, factory y generador no declaren capacidades incompatibles.

## 2026-09-25 Las propuestas vinculadas a fechas escolares quedaban demasiado temprano

**Síntoma.** En una prueba real de generación, Sol propuso Fiestas Patrias en una fila que comenzaba en junio y Navidad/cierre en otra que terminaba a inicios de diciembre, aunque ambos títulos eran pertinentes.

**Causa raíz.** Los doce espacios iniciales se asignaban consecutivamente dentro de cada bimestre sin reservar las semanas lectivas cercanas a esos acontecimientos. El prompt no indicaba en qué fila ubicar cada uno.

**Solución validada.** El calendario intenta reservar julio para la sexta propuesta y diciembre para la duodécima, sin cruzar semanas de gestión ni forzar el calendario propio de una institución. El prompt asocia explícitamente los cuatro acontecimientos a sus filas. El código conserva los meses y duraciones calculados aun si la respuesta de Sol difiere. Una prueba real con datos ficticios devolvió doce propuestas, con Fiestas Patrias en julio y Navidad/cierre en diciembre; también pasaron la prueba focalizada, typecheck, lint y build.

**Prevención.** Verificar fechas reales de los espacios sugeridos además de contar propuestas y comprobar el esquema de respuesta. Mantener la opción docente de mover, editar o eliminar cualquier propuesta.

## 2026-09-25 Un registro nuevo bloqueaba el plan aunque existía síntesis confirmada

**Síntoma.** Planificar mostraba «Hay información diagnóstica nueva» y deshabilitaba la generación tras añadir una observación, incluso con una síntesis grupal confirmada.

**Causa raíz.** La generación exigía que la huella de todas las fuentes siguiera idéntica, mezclando registros nuevos con la decisión grupal confirmada por la docente.

**Solución validada.** El plan usa la última síntesis grupal confirmada y conserva su ID. Una síntesis nueva confirmada sí produce un conflicto que requiere revisar el plan. El recorrido deja regresar al diagnóstico con un clic. Typecheck, lint, build y pruebas focalizadas verifican el cambio.

**Prevención.** Separar la vigencia de una decisión docente de la llegada de datos sin sintetizar; probar ambos casos en el flujo de planificación.

## 2026-09-24 Una base Supabase vacía no tenía versión curricular activa

**Síntoma.** Tras aplicar el esquema, el contexto del aula no podía elegir una versión curricular activa, aunque el flujo local sí podía hacerlo.

**Causa raíz.** El seed de PGlite aportaba esa fila de metadatos y el esquema Supabase solo creaba la tabla. No se debe copiar el contenido curricular ficticio del seed local.

**Solución validada en migraciones simuladas.** `202609240011_staging_curriculum_version.sql` inserta una versión activa solo cuando falta, sin inventar competencias ni desempeños. La prueba de paridad aplica las migraciones completas desde cero.

**Prevención.** Comparar también los datos de configuración indispensables, además de tablas y columnas, antes de conectar staging real.

## 2026-09-24 La confirmación simultánea devolvía un error genérico

**Síntoma.** La segunda solicitud de confirmación de la misma valoración, o una confirmación con evidencia nueva, podía devolver `422` o un texto suelto aunque los datos habían cambiado.

**Causa raíz.** La validación previa a la transacción trataba la ausencia de borrador confirmado y la huella obsoleta como errores de formulario.

**Solución validada localmente.** Esos casos devuelven `409 version_conflict`; la transacción vuelve a leer borrador y evidencias antes de escribir. Pruebas concurrentes verifican una sola valoración y una sola versión de cierre.

**Prevención.** Los cambios de versión o de fuentes se expresan como conflictos estructurados y se prueban con dos solicitudes sobre la misma revisión.

## 2026-09-24 Una propuesta de IA podía presentarse como hallazgo confirmado

**Síntoma.** Al preparar nivel y conclusión en una misma ficha, el constructor antiguo de conclusiones etiquetaba el análisis recibido como `teacher_confirmed_findings`, aunque en ese punto solo era una propuesta de IA.

**Causa raíz.** El workflow anterior generaba la conclusión después de confirmar el análisis; el nuevo flujo presenta ambas propuestas antes de la confirmación docente.

**Solución validada localmente.** La conclusión preliminar recibe las observaciones reales y el estado informativo, sin pasar el análisis de IA como hallazgo docente. El constructor antiguo conserva su ruta de evaluación ya confirmada. Una prueba del generador verifica el contexto enviado al proveedor.

**Prevención.** Distinguir en los contratos de IA las propuestas de los hallazgos docentes confirmados, incluso si comparten la misma ficha.

## 2026-09-24 La exportación local incluía tablas que el importador no aceptaba

**Síntoma.** La prueba de preparación para Supabase detectó que la exportación incluía calendario, proyectos y períodos que faltaban en el orden de importación.

**Causa raíz.** Los cambios del calendario y la evaluación habían ampliado `exportTables` sin actualizar `tableOrder` ni los campos de usuario de la preparación del traslado.

**Solución validada localmente.** El importador incluye esas tablas en orden de dependencias y remapea `confirmed_by` y `level_confirmed_by` a la cuenta nueva. La prueba de paridad de tablas vuelve a pasar.

**Prevención.** Mantener la prueba de igualdad exportador/importador y de los identificadores docentes al añadir entidades transferibles.

## 2026-09-24 El cierre podía perder competencias sin observaciones

**Síntoma.** Una vista basada solo en evidencias no mostraba las competencias previstas en el plan anual sin registros; se podía interpretar el cierre como completo con información omitida.

**Causa raíz.** El mapa de evidencias se construía a partir de filas observadas, no del alcance curricular del período.

**Solución validada localmente.** La evaluación toma competencias de criterios de actividades y de proyectos calendarizados del plan anual, las combina con observaciones reales y muestra explícitamente las fichas sin evidencias. La exclusión docente exige motivo y no oculta competencias con registros o valoración. Una prueba PGlite comprueba ambos casos.

**Prevención.** Calcular el cierre desde las competencias previstas y las fichas de todos los niños, no únicamente desde lo observado.

## 2026-09-24 «Desarrollar esta propuesta» parecía no responder

**Síntoma.** Al elegir una propuesta del plan anual, la profesora permanecía viendo la tarjeta y parecía que no se abría ningún editor.

**Causa raíz.** El editor sí se creaba, pero se mostraba después de las doce propuestas, fuera de la pantalla visible; tampoco recibía el foco.

**Solución validada localmente.** Al elegir una propuesta, abrir un borrador o consultar una experiencia confirmada, la vista se desplaza al editor y le da foco. Se deja espacio para el encabezado fijo. Se comprobó el clic y la posición visible del editor en el navegador local.

**Prevención.** Si una acción abre contenido lejos del control que la inició, llevar a la persona al resultado y hacer visible el cambio de estado.

## 2026-09-23 Planes anuales duplicables y difíciles de revisar

**Síntoma.** La cuenta podía generar más de un plan para el mismo año en aulas distintas y el resultado aparecía como un formulario extenso antes de verse como documento. Esto confundía la revisión docente y podía causar llamadas al modelo innecesarias.

**Causa raíz.** La unicidad anterior estaba limitada a borradores del mismo aula/año; el servidor permitía nuevas versiones y la UI mostraba los campos editables como vista principal.

**Solución validada localmente.** El servidor comprueba el año escolar de la cuenta antes de generar o insertar y una migración aditiva impide dos planes vigentes por año. El plan se presenta primero como documento legible, con encabezado institucional; la edición queda en una acción separada. Se añadieron pruebas de migración, presentación y guard previo al modelo. Los planes históricos se preservan.

**Prevención.** Hacer cumplir reglas de unicidad en servidor y base de datos, y mantener el documento estructurado legible como vista principal de una propuesta pedagógica.

## 2026-09-23 La síntesis por competencia fragmentaba la mirada del niño

**Síntoma.** La docente debía alternar entre competencias para interpretar a un mismo niño, aunque necesitaba considerar también la entrevista familiar y observaciones aún no clasificadas.

**Causa raíz.** El editor tomaba cada competencia como unidad de revisión y el progreso contaba síntesis separadas.

**Solución validada localmente.** Una vista por niño muestra entrevista y observaciones antes de un solo comentario docente; la matriz curricular queda como mapa de registros. La nueva tabla versionada protege la confirmación y detecta fuentes nuevas. Las revisiones anteriores por competencia siguen accesibles como historial.

**Prevención.** La competencia organiza la observación, pero el diagnóstico inicial requiere una interpretación integral del niño y confirmación docente explícita.

## 2026-09-23 Un texto de guía podía confirmarse como interpretación docente

**Síntoma.** Una síntesis confirmada mostraba conteos técnicos y la instrucción «Revisa estas actuaciones y redacta tu interpretación», en lugar de una interpretación de la profesora.

**Causa raíz.** `prepareDiagnosticSynthesis()` precargaba ese texto en `summary_text`, y la confirmación validaba solo que no estuviera vacío.

**Solución validada localmente.** Los nuevos borradores comienzan con `summary_text` vacío. Las notas observadas se muestran por separado, guardar/confirmar rechazan textos de guía antiguos y la vista señala las confirmaciones históricas que requieren una versión docente nueva.

**Prevención.** Los textos instructivos y ejemplos deben ser ayuda visual, nunca valores guardables como juicio pedagógico.

## 2026-09-23 La revisión diagnóstica exigía demasiados saltos

**Síntoma.** Para revisar a un niño había que abrir primero su lista de competencias, entrar a una competencia, escribir la síntesis y volver varias veces. El acceso al resumen grupal aparecía tras una sola síntesis, sin mostrar el avance de todos los niños observados.

**Causa raíz.** La interfaz usaba la competencia como pantalla independiente y contaba cualquier síntesis confirmada como si el niño estuviera revisado.

**Solución validada localmente.** La pantalla del niño reúne todas las observaciones y síntesis por competencia. El avance cuenta solo competencias observadas y aplicables con síntesis confirmada posterior a sus observaciones; el botón «Revisar aula» aparece al completar los niños con registros. La edición local sin guardar bloquea la salida accidental. Se añadieron pruebas de progreso y una revisión visual local.

**Prevención.** Para señalar un paso terminado, calcularlo desde fuentes y confirmaciones vigentes, no desde la existencia de una única fila.

## 2026-09-23 La revisión inicial no era un diagnóstico trazable

**Síntoma.** Guardar la revisión solo completaba una sesión, sin interpretar por niño/competencia, conservar fuentes ni dar prioridades grupales confirmadas a la planificación.

**Causa raíz.** Las observaciones de experiencias v4 y la marca `reviewed` no tenían una entidad intermedia de síntesis docente. Las políticas iniciales de Supabase permitían escritura directa en las nuevas tablas, capaz de eludir la validación semántica del servidor.

**Solución validada localmente.** Borradores individuales y grupales con snapshots de fuentes calculados en servidor, confirmación versionada e inmutable, revisión cronológica y StudentContext separado por procedencia. Una migración adicional revoca escritura directa autenticada en Supabase. Las pruebas PGlite cubren obsolescencia, versiones, aislamiento y cobertura; RLS real sigue pendiente de staging.

**Prevención.** Nunca equiparar `reviewed` con una conclusión por competencia. Las síntesis no confirmadas no entran en StudentContext ni planificación, y las fuentes no se aceptan desde el navegador.

## 2026-09-22 La guía diagnóstica reemplazaba observaciones repetidas

**Síntoma.** Registrar nuevamente al mismo niño y referente actualizaba la fila previa. Un segundo día de observación no quedaba como hecho independiente.

**Causa raíz.** `student_observations` tiene unicidad por `diagnostic_entry_id + reference_id` y el POST legacy usa `ON CONFLICT DO UPDATE`.

**Solución validada localmente.** El flujo por experiencias v4 escribe observaciones acumulativas con competencia v4, experiencia, aspecto y fecha. Pruebas PGlite registran dos veces el mismo aspecto, continúan otro día y verifican tres registros distintos sin seleccionar automáticamente a los demás niños.

**Prevención.** Mantener hechos observados como registros append-only y calcular cobertura por niños distintos, separando falta de registro de un estado observado con información insuficiente.

## 2026-09-22 El inicio omitía la evaluación diagnóstica

**Síntoma.** Un aula configurada sin plan ni actividades abría Hoy y sugería crear directamente el plan anual, aunque la docente todavía no había revisado el diagnóstico inicial.

**Causa raíz.** El recorrido de Planificar comenzaba en el plan anual y no consultaba `diagnostic_sessions` ni las observaciones guardadas.

**Solución validada.** Añadir el diagnóstico al recorrido persistido, abrir Niños/Evaluar como primer destino según haya estudiantes y exigir una revisión docente explícita antes de recomendar el plan. La revisión puede declarar información insuficiente y no inventa resultados; los planes históricos siguen accesibles. Las pruebas cubren el orden del recorrido, la idempotencia de la revisión y el aislamiento por docente.

**Prevención.** Calcular los siguientes pasos desde registros del servidor y distinguir “observaciones en curso” de “revisión guardada”.

## 2026-09-22 Comparación de snapshots JSONB de conclusión

**Síntoma.** Una conclusión recién regenerada no podía confirmarse aunque el assessment fuente seguía intacto.

**Causa raíz.** La comparación serializaba objetos completos con `JSON.stringify`; PostgreSQL `jsonb` reordena claves y producía un falso cambio.

**Solución validada.** Comparar por campos estables (`assessment_id`, versión, timestamps, estado y hash de details) y normalizar el contenido antes de calcular SHA-256. Una prueba con PGlite verifica guardar, regenerar y confirmar, así como el bloqueo ante un cambio real del assessment.

**Prevención.** Nunca usar el orden de claves de objetos JSONB como criterio de igualdad de snapshots.

## 2026-09-22 Extracción textual no fiable del Programa Curricular de Inicial

**Síntoma.** Los extractores preservaron Unicode, pero produjeron diferencias de segmentación de palabras y orden de bloques por la maquetación del PDF.

**Decisión.** Se registraron las huellas SHA-256 de los PDF y se dejó el maestro oficial en estado de transcripción pendiente. No se escribió texto corrupto ni se promovió contenido semántico como fuente oficial.

**Prevención.** La siguiente ingestión debe contrastar una representación visual/OCR de cada página, conservar página/sección/hash por elemento y ejecutar una segunda pasada antes de crear registros oficiales.

**Control implementado.** Los extractores preservan Unicode crítico en el piloto. `scripts/reconstruct-curriculum-reading-order.py` clasifica diferencias de orden de bloques por tokens geométricos, sin reescribir palabras; las discrepancias pendientes son de maquetación, no de tildes o eñes corruptas.

## 2026-09-22 Señal estadística sensible a evidencias repetidas

**Síntoma.** El conteo inicial podía ocultar competencias sin uso y transformar varias evidencias de un mismo niño —o un único caso con apoyo— en una señal grupal.

**Solución.** Partir del currículo aplicable por edad, usar el último estado marcado por estudiante/competencia y exigir cobertura y umbrales configurables para la señal interna.

**Prevención.** Las pruebas separan ausencia de planificación, información insuficiente, registros históricos y necesidad observada grupal.

## 2026-09-22 Estado síncrono dentro de efecto al cargar un perfil de niño

**Síntoma.** El linter de React detectó un `setState` síncrono dentro de un efecto al iniciar la carga del perfil pedagógico.

**Causa raíz.** El indicador de carga se actualizaba al reaccionar a un cambio de selección, en lugar de hacerlo en el evento que selecciona al niño.

**Solución.** Mover el inicio de carga al manejador de selección y mantener el efecto únicamente para sincronizar la respuesta asíncrona, con cancelación lógica ante desmontaje.

**Prevención.** Revisar `react-hooks/set-state-in-effect` en cada componente nuevo y ejecutar lint antes de consolidar un bloque.

## 2026-09-21 Cierre de actividad omitido después del horario

**Síntoma.** Al terminar un bloque instruccional, el estado diario podía avanzar directamente al siguiente bloque o al cierre de jornada sin ofrecer el cierre breve de la actividad.

**Causa raíz.** El resolvedor consideraba solo bloques vigentes o futuros; no identificaba la última actividad sin completar cuyo horario ya había terminado.

**Solución.** Incorporar un estado `closure` y una acción primaria `close_block`, con la opción secundaria de mantener el bloque como actual si la docente lo extendió.

**Prevención.** Las pruebas de `resolveDailyState` cubren ahora el intervalo entre un bloque terminado y el siguiente.

## 2026-09-21 Renderizador DOCX sin LibreOffice disponible

**Síntoma.** El renderizador empaquetado no pudo convertir la Actualización 03 a PNG porque `soffice.exe` no estaba disponible en la ruta del runtime.

**Impacto.** No afecta a la aplicación. Se extrajeron e inspeccionaron las imágenes de referencia incrustadas y el contenido DOCX se leyó estructuralmente.

**Prevención.** Restaurar el binario LibreOffice empaquetado antes de requerir una entrega DOCX con validación visual.

## 2026-09-20 Scripts auxiliares del starter no encontraron npm

**Síntoma.** Los scripts auxiliares de instalación y build intentaron resolver `node_modules/npm/bin/npm-cli.js` dentro del proyecto y terminaron con `MODULE_NOT_FOUND`.

**Causa raíz.** En el entorno Windows, la detección de la ruta de npm produjo una ruta relativa al directorio de trabajo.

**Solución.** Ejecutar `npm ci` y `npm run build` con la ruta absoluta del npm instalado en el host, conservando el `package-lock.json` del starter.

**Prevención.** Verificar primero la ruta resuelta de npm en Windows y usar el instalador empaquetado cuando su detección sea correcta.

## 2026-09-20 Docker Desktop no pudo iniciar

**Síntoma.** Docker Desktop cerró al iniciar con un error en `sailor-ingest.sock`; la API `dockerDesktopLinuxEngine` no estaba disponible.

**Causa raíz.** Fallo del runtime local de Docker al crear o renombrar su socket de ingestión. No se confirmó una causa más profunda y no se restableció la aplicación para evitar afectar otros entornos.

**Solución.** Adoptar PGlite, un PostgreSQL embebido persistente que no requiere Docker, para el desarrollo local. Mantener migraciones Supabase específicas para Auth y RLS. Posteriormente Docker Desktop se actualizó a 4.91.0 y se aislaron carpetas temporales dañadas; `hello-world` funcionó, sin Factory Reset. La decisión de PGlite se mantiene por independencia del daemon.

**Prevención.** No hacer que el flujo local dependa de un daemon externo. Validar la equivalencia de esquema y conteos antes de importar al futuro staging Supabase.

## 2026-09-20 PGlite no creó el directorio padre

**Síntoma.** El primer arranque terminó con `ENOENT` al intentar crear `.local/pgdata`.

**Causa raíz.** El adaptador NodeFS de PGlite crea el directorio de datos, pero requiere que su directorio padre ya exista.

**Solución.** Crear `.local` de forma idempotente antes de inicializar PGlite.

**Prevención.** Toda ruta local persistente debe preparar explícitamente su directorio padre antes de abrir el motor.

## 2026-09-21 Exportación concurrente de PGlite

**Síntoma.** El logo guardado en una ejecución local no apareció tras reiniciar el servidor; existía un exportador que abría el mismo directorio de PGlite en otro proceso mientras el servidor seguía activo.

**Causa raíz probable.** Acceso concurrente no coordinado al directorio persistente de PGlite. El exportador no debía abrir otra instancia sobre la misma carpeta mientras el servidor estaba activo.

**Solución.** Añadir una ruta de exportación solo en `127.0.0.1` sin origen de navegador y hacer que `db:export` use siempre el proceso servidor. La exportación exige que `db:local` esté encendido.

**Prevención.** Centralizar todas las lecturas/escrituras de la base local en un solo proceso durante desarrollo. Probar persistencia tras reiniciar, además de comprobar la respuesta inmediata del API.
# Errores y soluciones

## 2026-09-22 Importador desalineado con jornada local

**Síntoma.** El export local incluía horario, ejecución diaria, asistencia, excepciones y snapshots que el importador no enumeraba.

**Causa raíz.** El orden de importación no se actualizó al crecer el modelo local.

**Solución validada.** Se añadió el conjunto completo de tablas operativas al orden dependiente y una validación bidireccional entre tablas exportadas e importadas. El dry run con el export local actual no reportó problemas.

**Prevención.** Toda nueva tabla exportada debe añadirse a `tableOrder` o declararse explícitamente como excepción antes de generar un paquete.

## 2026-09-22 Alta de aula rechazaba fechas válidas

**Síntoma.** La primera creación de aula devolvía «El año escolar ya existe con otras fechas» aunque acababa de insertarse.

**Causa raíz.** PGlite devuelve columnas `date` como `Date`; comparar `String(date).slice(0, 10)` con ISO devolvía texto del día de semana.

**Solución validada.** Normalizar `Date` a ISO antes de comparar. La prueba de onboarding con dos docentes y aula nueva ejecuta todas las migraciones locales.

**Prevención.** Probar servicios de persistencia con el driver real, no solo con mocks.

## 2026-09-22 Tablas de Plan Anual sin RLS

**Síntoma.** Auditoría de migraciones detectó seis tablas públicas nuevas sin `enable row level security`: tres de planificación y tres de referencia curricular.

**Causa raíz.** Sus migraciones originales crearon tablas pero no incluyeron políticas.

**Solución validada localmente.** Nueva migración Supabase habilita RLS, propiedad docente para planes y solo lectura autenticada para referencias. Una prueba enumera todas las tablas creadas y verifica cobertura de RLS. Falta aplicar y probar la migración en staging real.

**Prevención.** Mantener el test de cobertura de migraciones y probar denegación cruzada con dos usuarios antes de datos reales.

## 2026-09-22 Borradores y errores de carga en flujos v4

**Síntoma.** Plan Anual informaba de un borrador existente, pero no lo abría tras recargar; permitía iniciar otra propuesta. Otras pantallas interpretaban respuestas HTTP fallidas como listas vacías. En Activity y Project/Unit, un fallo al refrescar la lista después de guardar o confirmar podía dar a entender que la escritura había fallado.

**Causa raíz.** Los componentes no comprobaban `response.ok` en todas las lecturas ni separaban el resultado de la escritura del refresco posterior. El editor anual no vinculaba el draft recibido con `planId` y `proposal`.

**Solución validada localmente.** Reabrir el mismo borrador anual, impedir generar otro mientras existe y rechazar también una segunda creación en el servidor local. Ofrecer reintento de carga y distinguir los mensajes de escritura completada con lista pendiente de actualizar. Los editores v4 revisados bloquean confirmar cuando el contenido visible difiere del borrador guardado.

**Prevención.** Mantener pruebas de continuidad del editor y de estados de error, además de comprobar en una prueba funcional que el borrador recargado conserva su ID. Una respuesta HTTP fallida nunca debe representarse como ausencia de datos pedagógicos.

## 2026-09-22 Consulta de experiencias devolvía HTTP 500

**Síntoma.** Planificar → Experiencias mostraba un error de carga; `GET /api/learning-experiences` devolvía 500 con el aula local configurada.

**Causa raíz.** La consulta ordenaba por `created_at`, columna que no existe en `learning_experiences` según las migraciones locales. Además, la lista mezclaba filas legacy de proyecto y taller sin el esquema v4, capaces de abrir un editor v4 incompleto.

**Solución validada localmente.** Ordenar por `starts_on` e `id`; comprobar la consulta contra todas las migraciones en PGlite y verificar HTTP 200 en el servidor local. Los editores de Project/Unit y Activity muestran solamente experiencias v4 compatibles y dejan los registros históricos para sus flujos legacy.

**Prevención.** Ejecutar consultas de rutas críticas contra el esquema real migrado en tests, y filtrar por contrato antes de abrir editores tipados.

## 2026-09-22 Validación y unicidad incompletas del Plan Anual

**Síntoma.** El servidor local aceptaba una propuesta anual editada con listas malformadas, competencias no aplicables o año escolar distinto, y podía confirmar ese borrador. Dos solicitudes de creación simultáneas podían superar la comprobación de borrador existente.

**Causa raíz.** La validación del modelo comprobaba solo parte de `annual-plan-v1` y no se reutilizaba en el límite de persistencia. La unicidad del borrador dependía de una consulta previa sin constraint de base de datos.

**Solución validada localmente.** Un contrato compartido valida campos, elementos de listas, experiencias, año y competencias aplicables en generación, guardado y confirmación. Migraciones nuevas local y Supabase crean un índice único parcial para el borrador por aula/año. La suite ensaya casos malformados y la restricción en PGlite; Supabase real sigue sin probarse.

**Prevención.** Mantener el contrato como fuente única y probar tanto el rechazo semántico antes de persistir como el constraint ante escrituras concurrentes. Revisar duplicados antes de aplicar la migración a una base existente.

## 2026-09-22 Avance visual confundía visitas con trabajo terminado

**Síntoma.** La navegación entre pantallas podía parecer un progreso completado aunque no existiera un plan, experiencia o actividad confirmada. Tras recargar, la docente debía averiguar dónde estaba su borrador.

**Causa raíz.** El estado de la secuencia se infería de la pestaña abierta y no de los registros guardados.

**Solución validada localmente.** Un resolver consulta plan, experiencias y actividades del servidor; distingue pendiente, borrador y confirmado y abre el paso recomendado al entrar en Planificar. Las pruebas cubren borradores, registros confirmados y exclusión de planes anteriores.

**Prevención.** Las marcas de progreso y la siguiente acción deben derivarse de datos persistidos. Una pantalla visitada no equivale a una etapa pedagógica terminada.

## 2026-09-22 Continuación de evaluación desaparecía al recargar

**Síntoma.** Después de confirmar un análisis o conclusión aparecía una tarjeta para continuar, pero al recargar esa recomendación desaparecía aunque el registro siguiera confirmado. Un perfil con evidencias legacy podía sugerir un análisis v4 que no estaba disponible.

**Causa raíz.** La tarjeta dependía de un estado temporal del componente y la recomendación del perfil contaba evidencias sin distinguir su contrato curricular.

**Solución validada localmente.** Mostrar la continuación a partir de análisis y conclusiones confirmados recuperados del servidor. Un resolvedor puro clasifica cada competencia por registros v4, cantidad de evidencias y confirmaciones; las evidencias legacy no ofrecen acciones v4. Las pruebas cubren prioridad, ausencia de datos y determinismo.

**Prevención.** Las acciones posteriores a una confirmación deben renderizarse también al reabrir el registro. Validar aplicabilidad de la acción con datos reales antes de mostrarla.

## 2026-09-22 El plan anual mostró un error de actividad tras una espera larga

**Síntoma.** Al preparar el primer borrador anual, la pantalla Planificar terminó mostrando «No pudimos preparar la actividad». El motivo concreto de esa solicitud anterior no se puede reconstruir porque la respuesta solo incluía un mensaje genérico.

**Causa raíz comprobada.** El servicio del plan anual reutilizaba el traductor de errores de Activity. Además, el cliente OpenAI conservaba los dos reintentos automáticos del SDK con un plazo de 30 segundos por intento, por lo que un fallo transitorio o un timeout podía prolongar la espera sin explicar qué ocurrió.

**Solución validada localmente.** El plan anual tiene mensajes propios, clasificación segura en su respuesta HTTP y una indicación visible durante la espera. El provider realiza una sola solicitud por clic, y el plan anual permite hasta 90 segundos para generar una propuesta amplia. Pruebas con mocks cubren clasificación, plazo y ausencia de reintentos; la preparación del contexto del aula local pasó sin llamar al modelo.

**Prevención.** No reutilizar mensajes de otro workflow. Mantener motivo seguro en errores de generación y probar el comportamiento del SDK ante reintentos y plazos sin hacer llamadas reales en la suite.

**Actualización 2026-09-23.** El plan anual rediseñado realiza dos llamadas secuenciales sin reintentos: plan maestro y desarrollo del documento. Cada una dispone de hasta 180 segundos; la pantalla avisa que la espera puede durar varios minutos. Los fallos de cualquiera de las etapas no crean un borrador y conservan una categoría segura para la docente. Esta actualización sustituye el plazo anterior de 90 segundos para este workflow.
# Plan anual antiguo descargado con numerosos campos «Pendiente de completar» (2026-09-23)

- **Síntoma:** el Word de un plan activo anterior mostraba cuadros vacíos para fortalezas, necesidades, intereses y competencias, además de párrafos densos de prioridades.
- **Causa:** ese plan se guardó antes de confirmar el diagnóstico grupal y su propuesta histórica no tenía IDs de competencias; la plantilla interpretaba cada campo ausente como una tarea manual pendiente.
- **Solución validada:** la proyección de descarga recupera datos grupales confirmados para campos ausentes del plan activo, y la plantilla omite apartados que todavía carecen de fuente real. Las experiencias se muestran de forma compacta, los bimestres son la organización predeterminada y se evita duplicar decisiones. El archivo se abrió en Word y las pruebas comprueban que no aparece la frase «Pendiente de completar por la docente».
- **Prevención:** pruebas de exportación con propuestas v1 sin competencias ni diagnóstico en su snapshot, además de revisión visual del Word tras cambios de plantilla.

## 2026-09-23 El Word rediseñado conservaba frases genéricas de la plantilla

**Síntoma.** En una prueba de 26 páginas, la síntesis decía que se había construido a partir de entrevistas y observaciones sin distinguir sus funciones; el cierre mencionaba unidades y sesiones aunque el plan nuevo contiene proyectos y actividades. Cuando un proyecto tenía una sola competencia aparecía la frase de relleno «Se prioriza la competencia eje».

**Causa raíz.** Word dividió una frase entre varios elementos de texto XML, por lo que un reemplazo literal no la encontró. La plantilla también contenía texto editorial fijo y el renderizador completaba la competencia de soporte ausente con una explicación redundante.

**Solución validada.** El renderizador sustituye la frase completa por párrafo, distingue la entrevista como contexto de la observación docente, ajusta el cierre a proyectos y actividades y omite la línea de soporte cuando no existe otra competencia. Una prueba descarga el plan desde un registro guardado y verifica autorización y ausencia de placeholders. El Word se abrió de nuevo con textos más largos y mantuvo 26 páginas legibles.

## 2026-09-23 Encabezado duplicado, UGEL ausente y proyectos de muestra repetidos

**Síntoma.** La vista previa Word mostraba dos franjas de encabezado, «UGEL: No registrada» pese a existir en Ayni y veinte proyectos casi idénticos que solo cambiaban de número.

**Causa raíz.** La plantilla traía una franja en el encabezado de página y otra en la portada; además repetía el título de desarrollo en cada ficha. La vista previa ficticia se creó sin perfil institucional y con un fixture repetitivo. La proyección de un borrador tampoco completaba campos institucionales vacíos desde el perfil actualizado.

**Solución validada.** Se deja una franja solo en portada y un título de desarrollo en la primera ficha; el Word carga logo y UGEL del perfil autorizado cuando faltan en el borrador. Los cuadros diagnósticos pasan a frases completas basadas en datos confirmados. El contrato rechaza títulos numerados y repeticiones excesivas de situaciones, motivos, propósitos y productos. Una nueva vista previa con veinte proyectos diferentes se abrió en Word y se revisó en 26 páginas, con el logo y la UGEL locales. Las pruebas automatizadas usan providers simulados.

## 2026-09-23 Fechas SQL y desbordamiento del Word detectados en prueba real

**Síntoma.** El primer intento de prueba del plan anual se detuvo antes del modelo con `calendar_invalid`. Después de normalizar fechas, la generación real funcionó, pero el Word puso prioridades en una página casi vacía y desplazó la firma a otra página.

**Causa raíz.** PGlite entrega fechas SQL como objetos `Date` y la agenda esperaba `AAAA-MM-DD`. En la exportación, listas extensas del modelo se volcaron completas en celdas con espacio limitado y repitieron información ya visible. Un campo de flexibilidad incluso decía que las fechas aún no estaban calculadas.

**Solución validada.** El contexto del servidor normaliza los días en UTC antes de generar y guardar el snapshot. La exportación resume prioridades y contexto, usa indicaciones breves para evaluación y flexibilidad, y completa orientaciones diarias desde estrategias existentes cuando el modelo no propone enfoques. La propuesta completa sigue en el borrador. La prueba real hizo dos llamadas previstas, una por etapa, produjo veinte títulos y productos distintos, y el Word revisado se abrió en 27 páginas sin hojas casi vacías. No se guardó ni confirmó un plan nuevo.

**Prevención.** Comprobar frases visibles en el DOCX generado y revisar visualmente las páginas de diagnóstico, proyecto y cierre, además de validar que no queden campos de plantilla.

## 2026-09-23 Veinte proyectos de diez días ignoraban semanas no lectivas

**Síntoma.** El plan trataba la adaptación como el primer proyecto y asignaba fechas a veinte proyectos de diez días aunque los periodos lectivos de 2026 no daban espacio para ese recorrido. Podía mostrar días de gestión o interrupciones como parte de un proyecto.

**Causa raíz.** El contrato exigía veinte proyectos y un cálculo por días de lunes a viernes entre los límites generales del año; no distinguía los cuatro bloques lectivos, la gestión, las excepciones ni la etapa diagnóstica.

**Solución.** Las nuevas generaciones usan doce propuestas y una etapa inicial independiente. Un planificador determinista ocupa dos o tres semanas lectivas, con cierre en viernes, dentro de cuatro bloques. Excluye semanas enteramente interrumpidas; un feriado de un día conserva el resto de la semana, pero no permite comenzar o cerrar en un día sin clases. Falla antes de llamar a IA cuando el calendario no permite completar el plan. Se guardan los slots calculados y se revalidan al confirmar. Los planes históricos siguen disponibles.

**Prevención.** Pruebas del calendario oficial 2026, gestión, suspensiones y feriados, duración editable y compatibilidad del formato anterior. Revisar visualmente el Word después de cambiar su plantilla.

## 2026-09-23 Word diagnóstico inválido al ocultar el logo ausente

**Síntoma.** Microsoft Word informó que una vista previa `.docx` parecía corrupta, aunque todos sus XML eran bien formados.

**Causa raíz.** Al no existir logo institucional, el renderizador eliminaba el párrafo completo que contenía el dibujo. La celda de portada quedó sin su párrafo obligatorio en WordprocessingML.

**Solución validada.** Se conserva el párrafo y se retira solo el nodo del dibujo. El documento sin logo se abrió en Word y se exportó a PDF; el caso también tiene prueba automatizada. La revisión visual detectó una firma aislada y un cuadro dividido por saltos, por lo que la plantilla derivada conserva los saltos de sección originales y omite el bloque de firma que no corresponde a un dato confirmado.

## 2026-09-23 Bloques pegados en los Word diagnóstico y anual

**Síntoma.** En el informe diagnóstico, la tabla de competencias terminaba pegada al título de prioridades. En el plan anual, el cuadro de periodos tocaba el título del cronograma y las fichas tenían poco espacio interno.

**Causa raíz.** Los bloques consecutivos son tablas de Word sin un párrafo separador. La plantilla también usa interlineado y márgenes internos muy compactos. Un primer aumento global de márgenes hizo que el cronograma de doce filas se partiera, por lo que no era apropiado para todos los cuadros.

**Solución validada.** Se añadieron espacios cortos entre los bloques afectados y se amplió solo el relleno de las fichas y la etapa inicial; se dejó compacto el cronograma. Cuando la tabla diagnóstica tiene al menos diez competencias, el título de decisiones comienza en la página siguiente junto con su contenido. Los documentos ficticios se abrieron en Microsoft Word y se exportaron a PDF para revisar la página diagnóstica y las páginas de calendario y proyecto. El plan conserva sus doce filas en una página y sus 17 páginas totales.

## 2026-09-23 La descarga Word no se iniciaba desde Documentos

**Síntoma.** La app mostraba el plan anual guardado y el botón de descarga, pero al pulsarlo el navegador integrado no guardaba ningún archivo ni mostraba un error.

**Causa raíz.** El cliente recuperaba correctamente el DOCX mediante `fetch`, pero intentaba descargarlo con un enlace temporal `blob:` creado y pulsado por JavaScript. Ese gesto no produjo un evento de descarga en el navegador integrado. El endpoint autorizado sí devolvía el Word completo.

**Solución.** Documentos presenta ahora un enlace de descarga normal a la ruta autorizada del servidor, con `download` y `Content-Disposition: attachment`; ya no depende de un objeto `blob:` ni de un clic programático. La ruta real del plan guardado respondió HTTP 200 con un DOCX de 385364 bytes, que se dejó también en Descargas para acceso inmediato. Typecheck, lint, build y las 16 pruebas de documentos pasaron. El navegador integrado aún no mostró un evento de descarga verificable al pulsar el enlace; debe comprobarse el guardado desde un navegador estándar antes de dar por resuelto ese entorno.

**Cierre del caso en el navegador integrado.** Un enlace HTTP de descarga tampoco guardó el archivo allí. Como la profesora usa la misma computadora que ejecuta el servidor local, Documentos incorpora «Guardar Word en Descargas»: la ruta POST vuelve a autorizar el documento, genera el Word y lo escribe en la carpeta Descargas del usuario del proceso. Reutiliza el archivo si el contenido es idéntico y nunca sobrescribe una versión distinta. La interfaz muestra el nombre guardado; la prueba funcional desde el navegador integrado mostró «Word guardado en Descargas: plan-anual-2026-8a16fde6-3.docx» y se verificó que el archivo de 385364 bytes existe. El enlace HTTP permanece como opción para otros dispositivos.

## 2026-09-23 Un plan anterior seguía descargándose con la plantilla antigua

**Síntoma.** Después de habilitar la descarga, la profesora obtuvo un plan de seis experiencias con el diseño y los textos antiguos, aunque el generador actual ya preparaba doce propuestas.

**Causa raíz.** La descarga transforma el plan guardado según su `plan_format`; el plan confirmado de 2026 no tenía este campo y conservaba la propuesta antigua. El arreglo de descarga solo hizo accesible ese mismo archivo. La interfaz y los índices impedían crear un borrador nuevo mientras existía el plan activo.

**Solución validada.** Se permite una sola versión activa y un solo borrador por año escolar. La docente puede preparar una versión actualizada del plan histórico; el servidor comprueba el aula, año, ID activo, formato anterior y generación antes de guardar. La versión anterior sigue vigente hasta confirmar la nueva. Una generación real con dos llamadas a IA produjo doce proyectos distintos y se guardó como borrador v2; el plan v1 permanece activo. Documentos avisa cuando se abre un plan anterior. Typecheck, lint, build y pruebas del plan y documentos pasaron.

**Revisión del Word.** Microsoft Word mostró páginas vacías causadas por saltos al final de tablas llenas. El exportador eliminó los saltos redundantes antes de las secciones III, V y VII y el salto posterior al primer proyecto; también abrevia una nota de ajuste solo en el Word. El borrador revisado se abrió en Word y se exportó a PDF de 17 páginas, sin páginas vacías; portada, cronograma y fichas se inspeccionaron visualmente. Para prevenir la regresión, verificar paginación real además de contratos y marcadores XML.

## 2026-09-24 Contexto de otra edad y residuos de plantilla en DOCX unificados

**Síntoma.** El paquete de currículo podía incluir focos de edades distintas a la del aula. Las plantillas nuevas traían una imagen de logo de ejemplo, instrucciones editoriales y saltos de página que producían páginas casi vacías. La plantilla de actividad conservaba un encabezado de Planificación Anual.

**Causa raíz.** El constructor reenviaba la propiedad `ages` completa de la tarjeta CNEB. Los marcadores de Word estaban resueltos, pero imágenes, encabezados y saltos son partes independientes del OOXML.

**Solución validada.** El paquete de IA limita `ages` y la selección por edad antes de llamar al proveedor. El exportador retira la imagen de ejemplo, inserta el logo institucional autorizado cuando existe, corrige el encabezado y elimina saltos redundantes en la copia generada. Los cuatro DOCX se abrieron en Microsoft Word y se exportaron a PDF para inspección visual. Las pruebas comprueban la proyección de edad, los marcadores, la privacidad nominal y las rutas de datos heredados.

## 2026-09-24 La actividad con una observación dejaba una página casi vacía

**Síntoma.** La nueva plantilla de actividad generaba cinco páginas con un solo registro; la reflexión docente terminaba sola en la última.

**Causa raíz.** El exportador insertaba textos genéricos de síntesis y ajustes en filas de la sección VII aunque la docente no los había escrito. Estas filas empujaban el cierre real a otra página.

**Solución validada.** Se omiten esas filas y la instrucción editorial de la sección VI en la copia generada. La reflexión se muestra solo si existe un cierre docente guardado. El mismo ejemplo quedó en cuatro páginas tras abrirlo y exportarlo con Microsoft Word; se inspeccionó la última página y las pruebas comprueban que el registro nominal y su criterio proceden de la base. Para prevenirlo, renderizar tanto una actividad sin observaciones como otra con observaciones y revisar la paginación.

## 2026-09-24 Proyectos de un plan sustituido desaparecían del recorrido

**Síntoma.** Al pasar a una nueva versión anual, `planning-journey` solo contaba experiencias cuyo `annual_plan_id` coincidía con el plan vigente. Además, el servidor exigía que el plan padre siguiera activo al confirmar un proyecto borrador.

**Causa raíz.** Una misma condición se usaba para dos preguntas distintas: qué propuestas sirven para trabajo nuevo y qué proyectos ya existen. Archivar un plan no invalida sus proyectos ni la procedencia del borrador.

**Solución y prevención.** El recorrido incluye experiencias guardadas vinculadas a cualquier versión del aula; la UI muestra su versión de origen. La generación de trabajo nuevo sigue leyendo solo el plan vigente, mientras guardar una generación ya iniciada y confirmar un borrador validan su propuesta contra el plan padre activo o histórico. Una prueba con V1, V2 y proyectos de ambos estados comprueba que no se reasignan ni desaparecen.

## 2026-09-24 Archivar un proyecto ocultaba sus actividades anteriores

**Síntoma.** La selección de actividades y su consulta exigían que el proyecto o unidad padre estuviera activo. Al confirmar una nueva versión, las actividades ligadas a la versión anterior dejaban de verse o de poder terminarse.

**Causa raíz.** La misma condición `status='active'` se usaba para iniciar actividades nuevas y para leer o terminar las ya existentes. La base local tampoco tenía `updated_at` en `learning_experiences`, a diferencia del esquema remoto.

**Solución validada.** La ruta de creación conserva el requisito de versión vigente. La consulta de actividades y la edición o confirmación de borradores existentes admiten un padre histórico; la pantalla lo identifica y oculta el formulario para crear actividades nuevas allí. La transición de versión local cambia solo el estado, compatible con ambos esquemas. Las pruebas persisten V1, V2 y una actividad que conserva su `experience_id` original.

## 2026-09-24 Confirmación de Criterio V2 respondía sin la fila confirmada

**Síntoma.** El servidor completaba la confirmación de Criterio V2, pero enviaba una respuesta vacía al navegador.

**Causa raíz.** `confirmCriterionVersion()` ya devuelve la fila confirmada; la ruta intentaba leer `result.rows[0]` como si recibiera el objeto de consulta de PostgreSQL.

**Solución y prevención.** La ruta envía directamente la fila devuelta. La prueba de servicio de Criterio V2 y el recorrido integrado comprueban el estado confirmado y la permanencia del `criterion_id` de las evidencias históricas. Al integrar servicios, revisar su contrato de retorno además del efecto en la base.
## 2026-09-24 Un selector de recurso confundía la ruta de importación

**Síntoma.** La prueba HTTP con Auth devolvía 404 al importar alumnos, aunque la docente estuviera autenticada.

**Causa raíz.** La autorización previa interpretaba `/api/students/import` como si `import` fuese un ID de alumno.

**Solución y prevención.** La ruta reservada se excluye del analizador de IDs. La prueba HTTP crea dos aulas, importa un alumno y comprueba accesos propios y cruzados antes de considerar completo un cambio en el límite común.

## 2026-09-25 Typecheck fallaba después del build de vinext

**Síntoma.** `npx tsc --noEmit` pasaba antes de compilar, pero después del build señalaba que `AppRoutes`, `LayoutRoutes` y `ParamMap` no existían en `.next/types/routes.d.ts`.

**Causa raíz.** Quedó un `validator.ts` generado por Next.js junto a los tipos de rutas generados por vinext. El validador esperaba exportaciones del generador anterior.

**Solución y prevención.** `tsconfig.json` excluye únicamente los validadores generados por Next.js, incluidos los de desarrollo; conserva los tipos de rutas de vinext. Verificar typecheck también después del build.

## 2026-09-25 El diagnóstico parecía evidencia de la valoración del período

**Síntoma.** La matriz mostraba una observación diagnóstica y la ficha de evaluación indicaba cero evidencias, sin explicar que se trataba de fuentes diferentes.

**Causa raíz.** La cobertura podía contar observaciones diagnósticas como registros de seguimiento, mientras la valoración del período solo leía evidencias de actividades. La interfaz llamaba “registros” a ambas cifras.

**Solución y prevención.** La ficha y el historial muestran los antecedentes diagnósticos separados de las evidencias del período; la matriz identifica cada fuente en sus dos vistas. El antecedente permanece fuera del cálculo de la valoración y su huella de confirmación. Las pruebas cubren antecedente sin evidencia y antecedente con evidencias. Revisar siempre los textos de conteo junto con la procedencia del dato.

## 2026-09-25 Las sugerencias de observación quedaban desactualizadas tras guardar

**Síntoma.** “Podrías observar hoy” seguía mostrando el motivo anterior hasta recargar la página.

**Causa raíz.** Las sugerencias se consultaban solo al abrir la actividad, sin depender de los registros nuevos.

**Solución y prevención.** Cada guardado incrementa una revisión de evidencias y vuelve a consultar las sugerencias. Mientras llega la respuesta, se oculta la lista anterior para no presentar motivos obsoletos. En una prueba aislada, Diego pasó de “Aún no tenemos registros” a “Solo tenemos registros de una situación” sin recargar la página.

## 2026-09-25 Los tests de documentos no creaban la tabla de desarrollo formal

**Síntoma.** La consulta de un Plan Anual histórico falló en pruebas con `relation annual_plan_formal_content does not exist`.

**Causa raíz.** Tres fixtures construían un esquema mínimo manual y no incluían la tabla aditiva que ahora se consulta para encontrar el Word derivado.

**Solución y prevención.** Se añadió la tabla mínima a esos fixtures y se repitieron las suites de Word y Documentos. Cuando una lectura canónica incorpore una tabla nueva, revisar también los esquemas mínimos de sus pruebas además de la paridad de migraciones.

## 2026-09-26 Los planes históricos no podían iniciar el nuevo flujo de proyecto

**Síntoma.** Las doce propuestas se mostraban, pero al desarrollar una perteneciente a un plan anterior la API respondía que no pertenecía al Plan Anual.

**Causa raíz.** Los planes históricos tienen filas por posición y espacios de calendario, pero no `proposal_id`. El flujo nuevo usaba únicamente ese identificador. Además, la primera migración de retrocompatibilidad contenía una expresión regular incompleta para una de las actualizaciones y ya había sido aplicada localmente.

**Solución y prevención.** El servidor acepta el ID estable de `project_slots` para planes históricos y conserva el índice de origen. La interfaz normaliza ambos formatos. Se añadió una migración posterior que corrige el backfill sin editar la migración aplicada. Una prueba real con API creó contexto, propósitos, preguntas, criterios y un mapa de ocho actividades a partir del plan histórico vigente.

## 2026-09-26 Un ejemplo de contexto válido era rechazado por longitud

**Síntoma.** Luna devolvía una vista previa estructurada válida, pero la API respondía «No pudimos preparar las opciones del proyecto».

**Causa raíz.** El contrato de salida permitía texto, mientras la validación posterior limitaba el ejemplo opcional a 250 caracteres. La respuesta real tenía 298 caracteres y el mensaje no distinguía esa causa.

**Solución y prevención.** El límite del ejemplo se alineó con el uso visible a 500 caracteres y se mantuvieron límites estrictos para contexto y propósitos. La misma llamada real pasó después del ajuste.

## 2026-09-26 La migración del calendario intentaba modificar actividades confirmadas

**Síntoma.** Al aplicar la nueva migración sobre una base con actividades confirmadas, el backfill de `planned_date` era rechazado por el trigger de inmutabilidad.

**Causa raíz.** El nuevo campo se intentó completar mediante un `UPDATE` general. El trigger protege correctamente todo cambio en una actividad confirmada y no distingue un backfill histórico de una edición pedagógica.

**Solución validada.** La migración deja `planned_date` nulo en actividades históricas y la lectura usa `occurs_on` como respaldo. Las actividades nuevas guardan ambos campos desde su creación. El trigger actualizado solo admite cambios auditados de fecha y estado de ejecución; título, propósito, contenido y relación pedagógica continúan inmutables. La paridad local/Supabase, la copia de versiones y los casos históricos pasaron sus pruebas.

**Prevención.** Las migraciones aditivas no deben reescribir filas confirmadas cuando el valor puede derivarse de forma segura. Probar siempre una base con documentos históricos antes de dar por válida una migración.

## 2026-09-26 El análisis individual incluía una recomendación de AD/A/B/C

**Síntoma.** El contrato anterior del assessment pedía `suggested_level` y la misma generación preparaba texto de conclusión antes de que la profesora confirmara su valoración. Esto mezclaba análisis de evidencias, juicio docente y comunicación final.

**Causa raíz.** El flujo trataba el nivel sugerido y la conclusión como campos auxiliares del borrador, aunque AD/A/B/C corresponde exclusivamente a la decisión docente sobre el conjunto de evidencias.

**Solución validada.** `assessment-v3` elimina los campos de nivel del schema y el validador rechaza cualquier campo adicional. La profesora guarda y confirma su valoración sin preselección; después se habilita una llamada separada para la conclusión, ligada mediante snapshot a la valoración confirmada. Cero evidencias detiene el flujo antes del proveedor. Las pruebas comprueban que la salida de IA no contiene letras, que la conclusión requiere valoración y que evidencia nueva exige revisión.

**Prevención.** Mantener análisis, valoración y conclusión como etapas y contratos separados. Cualquier modelo futuro para assessment debe pasar el schema estricto sin campos de calificación.

## 2026-09-26 La extensión de KB traía ámbitos incompatibles con el runtime vigente

**Síntoma.** Algunas unidades v4.1 contenían `content` como lista y `workflow_scope` con nombres de áreas (`science`, `mathematics`, `personal_social`) o el workflow antiguo `materials`. La validación estricta rechazaba el corpus fusionado.

**Causa raíz.** El paquete fue preparado para una matriz anterior de 13 workflows; Ayni ya tiene 16. Un ámbito de área no es un workflow.

**Solución validada.** Se normalizaron las listas como texto y los ámbitos por los IDs vigentes, con `materials` mapeado a `material_generation`. El loader valida todo ámbito contra el registro actual y la suite recorre las unidades nuevas.

**Prevención.** Compilar extensiones contra los contratos del repositorio en HEAD y validar los IDs antes de activar una versión de KB.

## 2026-09-26 Una fuente de 5 años podía aparecer al recuperar didáctica para 3 años

**Síntoma.** Una unidad transversal con alcance 3–5 referenciaba una guía específica para 5 años y podía enviarse al modelo en un contexto de 3 años.

**Causa raíz.** El filtro por edad miraba `age_scope` de la unidad pero no la compatibilidad de las fuentes adicionales.

**Solución validada.** En la compilación v4.1 se retiraron de cada unidad las referencias de fuentes incompatibles con su edad; cuando todas las fuentes eran específicas, se restringió el alcance de la unidad. Un caso de retrieval de 3 años verifica la exclusión.

**Prevención.** Validar edad de unidad y procedencia de cada fuente al fusionar corpus nuevos.

La revisión del corpus completo detectó además dos resúmenes de fuentes de lectura/escritura de v4.0 con `competency_id` nulo y sin ámbito de competencia. En v4.1 se les añadieron `COM_LECTURA` y `COM_ESCRITURA` como IDs aplicables, sin tocar v4.0. La prueba de integridad verifica ahora que todas las referencias con condición de edad o competencia la respeten.

## 2026-09-26 El ordenamiento de unidades generales podía producir NaN

**Síntoma.** Para una competencia confirmada, ciertas unidades generales sin `applicable_competency_ids` recibían `NaN` en la puntuación y alteraban el ranking.

**Causa raíz.** `Number(undefined)` se aplicaba al resultado de una comprobación opcional.

**Solución validada.** La comprobación se convierte primero a booleano y luego a número. Las pruebas de recuperación y contexto para competencias confirmadas pasan con orden determinista.

**Prevención.** Exigir puntuaciones finitas para metadatos opcionales en nuevos componentes del ranking.

## 2026-09-26 La normalización de líneas de Git podía invalidar el manifest de la KB

**Síntoma.** El loader validaba los hashes del árbol de trabajo, pero algunos blobs preparados para el commit tenían bytes diferentes. En Windows, Git podía convertir finales de línea al preparar o extraer archivos.

**Causa raíz.** El manifest verifica SHA-256 de bytes exactos y la nueva carpeta no tenía una política de finales de línea.

**Solución validada.** Se normalizaron los archivos de v4.1 a LF y `.gitattributes` fija `eol=lf` solo para esa versión. Una comprobación independiente leyó los 80 blobs del índice de Git y comparó cada hash con el manifest; todos coincidieron.

**Prevención.** Comprobar integridad tanto en el árbol de trabajo como en el índice antes de confirmar nuevas versiones de KB.

## 2026-09-26 La finalización de escenas intentó duplicar tres metadatos

**Síntoma.** Al procesar la primera colección, tres escenas de muestra con nombres de archivo cortos recibieron un segundo JSON con el mismo ID.

**Causa raíz.** El script comprobaba únicamente si existía un JSON con el nombre derivado del ID; las muestras ya tenían JSON homónimos de sus JPEG, pero esos nombres eran diferentes.

**Solución validada.** El finalizador carga primero todos los metadatos existentes y omite cualquier ID ya catalogado. Se retiraron los tres duplicados creados por el intento y el constructor del índice validó 61 IDs únicos.

**Prevención.** Comprobar unicidad por ID y ruta en el constructor del índice; conservar nombres de JPEG y JSON homónimos aunque el ID sea más largo.
