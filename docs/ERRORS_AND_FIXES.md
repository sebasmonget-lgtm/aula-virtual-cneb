# Errores y soluciones

## 2026-10-20 — Recurso de carátula fuera del paquete de descarga Word

Síntoma: Word local correcto y 500 al descargar el nuevo Preview; el alias QA se conserva en la versión anterior. El adorno se había colocado en public/evaluation, fuera de los directorios públicos incluidos explícitamente por outputFileTracingIncludes. Se mueve a assets/templates, que ya forma parte del paquete servidor, conservando los mismos bytes. Comprobar con build de Next y descargas reales antes de promover. No fallar silenciosamente ni borrar textos para resolver un problema de empaquetado.

La revisión también evita redistribuir porcentajes para forzar suma cien: dos cantidades iguales deben mostrar el mismo porcentaje, con aclaración breve del redondeo cuando haga falta. Pruebas de tercios y combinaciones, recibos de Preview en QA_CARATULA_CIRCULAR_2026-10-20.md. No datos pedagógicos modificados.

## 2026-10-20 — Faltaba la gráfica de asistencia en el informe familiar

Síntoma: los informes y sus Word mostraban conclusiones y notas sin el resumen gráfico de asistencia acordado. Causa: los lectores familiares no consumían el resumen existente del calendario/asistencia. Solución: mismo cálculo autorizado por aula y bimestre en pantalla y descarga, filtrado al alumno; barras nativas en Word y barras con texto en la interfaz. Fecha de corte visible, tardanza separada, sin registro explícito. No nuevas llamadas a IA ni escrituras pedagógicas.

Prevención: pruebas de conteo excluyente, días sin datos, barras Word, preservación del texto y notas; comparación funcional de los diez alumnos contra el resumen real. La verificación visual y publicación deben constar en los recibos de QA_ASISTENCIA_FAMILIAS_2026-10-20.md antes de declarar terminada la entrega.

## 2026-10-20 — QA final: notas del Excel y avisos repetidos en informes

Síntoma: el Excel coloreaba en verde cualquier letra confirmada aunque la interfaz distingue AD/A/B/C. Causa: estilo único de celda para cualquier valoración confirmada. Solución: estilos por letra con la misma paleta aprobada, sin colorear notas ausentes ni cambiar datos/filtros. Prueba del archivo OOXML vincula cada celda a su fill y cubre las cuatro letras y el pendiente.

La lectura familiar repetía avisos sobre fecha/cantidad de registros suficientes y ausencia de datos sobre apoyos. Se revisan las versiones familiares y se ajusta el prompt: describir lo observado sin extrapolar a cambios temporales, conservar apoyos reales y advertencias concretas de insuficiencia, no presentar una ausencia del registro como dificultad del niño. No se filtran ni reescriben automáticamente las fuentes canónicas.

Una conclusión real traía una etiqueta de formato en caution. La revisión corrigió ese campo auxiliar y conservó la respuesta cruda; se pide una frase comprensible sin imponer un nuevo reintento automático por vocabulario. Ver QA_CIERRE_FINAL_2026-10-20.md y recibos finales para pruebas, conciliación de datos y límites.

## 2026-10-20 — Lenguaje formal heredado en el informe familiar

Durante el smoke real de diez lecturas familiares, cinco propuestas quedaron preparadas y cinco agotaron los 30 s del proveedor. La prueba individual había durado 31,4 s con presupuesto explícito de 90 s: el factory seguía usando el límite general de 30 s en cloud. Se asignan 90 s a informes completos, sin cambiar análisis/conclusiones ni concurrencia, reintentos automáticos o datos guardados. Recuperar solo pendientes tras desplegar; verificar diez propuestas completas antes del alias. Prueba del factory cubre presupuesto específico y override.

Síntoma: un mejor diseño seguía mostrando explicaciones difíciles o propuestas como apoyos realizados. Causa: copia literal de la conclusión formal y encabezado «Qué ayudó» para un campo que también contiene propuestas. Corrección: original preservado y lectura familiar separada, editable y vinculada por huella; instrucciones distinguen hechos, apoyos realizados y futuras propuestas, con ayudas concretas. Lector común en interfaz, Documentos y Word; compatibilidad histórica y actualización explícita.

Validación: fuente intacta al editar la lectura, fuente cambiada rechazada, controles de suficiencia y contenido prohibido también en la lectura, Word imprime versión sencilla sin modificar nota ni fuente. Muestra real de doce competencias válida sin fallback y doce páginas inspeccionadas. Conciliación QA antes/después en recibos privados. Prevención: no convertir una mejora de redacción en edición silenciosa de la evaluación docente ni inventar dificultades/apoyos para llenar campos. Ver QA_LENGUAJE_SENCILLO_2026-10-20.md para límites y publicación.

## 2026-10-19 — Referentes genéricos y mediación cortada en el límite de un campo

**Síntoma y causa.** W-05 seguía abierto: el KB tenía paráfrasis por edad y mapeos oficiales vacíos; Word no podía ofrecer una selección verificable. En la muestra real posterior una mediación llegó cortada en el límite de 500 caracteres; el validador solo revisaba longitud/no vacío.

**Corrección y prevención.** Catálogo aditivo de 134 desempeños con fuente/hash/página; selección explícita por criterio y validación de IDs/edad/competencia, herencia y Word. Históricos intactos. Mediación breve con holgura de 800 caracteres y terminación de frase comprobada solo en nueva generación, sin filtros de privacidad/caracteres ni garantías semánticas absolutas. Una segunda muestra real llega completa. Comparación de fuente 134/134, 155 regresiones, typecheck/lint/build PASS y doce páginas Word revisadas. Informe `docs/qa/QA_DESEMPENOS_OFICIALES_2026-10-19.md`. Local, sin despliegue.

## 2026-10-19 — Hallazgos abiertos de pedagogía y Word en generación real

**Síntomas reproducidos.** Macetas no confirmadas son recurso central de una ruta ya preparada; alternativas sin objeto no permiten observar varios criterios. Una mediación añade papel no previsto. La proyección usa solo el primer rótulo de observación y omite el Cierre explícito en actividades 8 y 10. El Word mantiene una tabla vacía de enfoques y divide criterios/referentes entre páginas.

**Causa comprobada y límites.** `activityPedagogicalBlocks` resuelve un único `observeAt`; el renderer de proyecto conserva la tabla sin datos y el diario imprime fallbacks genéricos. La validación de fechas, contratos e IDs no evalúa la viabilidad semántica de alternativas. El desbalance de cautelas y concreción se registra como causa probable, sin atribuirlo al modelo mediante una comparación no ejecutada.

**Estado.** P1/P2 abiertos, sin corrección aplicada en esta revisión. Se conserva la muestra para regresión: cien comprobaciones canónicas diarias PASS, once Word y cuarenta páginas revisadas. Registro detallado con recomendaciones y criterios de aceptación: `docs/qa/QA_PEDAGOGIA_MACETAS_2026-10-19.json`. No son pérdidas de datos ni se declara aprobada toda Ayni.

## 2026-10-19 — Cola compartida y extracción incompleta de decisiones

Síntoma: preparación larga y resultados incompatibles con la versión de Preview; decisiones quinta y sexta ausentes del contexto estructurado. Causas: reclamo global de preparation_jobs por ejecutores antiguos y omisiones de extracción no detectadas. Solución local: cola v2 invisible al trabajador antiguo, lectura histórica sin reintento, checkpoints por actividad y conservación literal de turnos omitidos respetando ediciones docentes. Regresiones: aislamiento, fallo parcial, diez actividades/publicación atómica, seis turnos y retiro manual. Prevención: no activar hasta migrar y verificar entorno QA; no afirmar reparación cloud todavía.


## 2026-10-18 — El motivo del proyecto no se desarrollaba ni se mostraba como situación significativa

**Síntoma.** El año guardaba `rationale`, pero el mapa no exigía una situación significativa distinta del fundamento. El detalle no mostraba ese motivo; la formalización moderna copiaba el contexto breve y Word lo concatenaba con el fundamento.

**Causa.** Contrato del mapa sin un campo de origen/oportunidad/reto; lectores y contexto diario no tenían esa sección explícita.

**Solución validada.** `meaningful_situation` requerido en nuevas respuestas, máximo 1200 caracteres; una reparación acotada conserva las mismas fuentes/decisiones si falta. Guardado en `project_master`, reutilizado por lectores, formalización por código, Word y contexto diario. Razón anual y skill de proyecto exigen sustento, reto abierto y atribución honesta. Históricos conservan sus textos y exportación previa. 76 pruebas de contrato/regresión PASS, chequeos de código y QA visual local ficticio PASS. No se afirma calidad de una generación nueva con IA real: no se ejecutó.

**Prevención.** Regresiones para campo vacío/excesivo, reparación sin cambiar fuentes, texto canónico exportado una sola vez, transmisión al contexto diario y lectura histórica sin mutación. Sin migración ni llamadas adicionales normales. Informe `docs/qa/QA_SITUACION_SIGNIFICATIVA_2026-10-18.md`.

## «Sin registro» pese a tener observaciones de la competencia — 2026-10-13

- Síntoma: había observaciones libres o en otro criterio, pero selector guiado indicaba «Sin registro».
- Causa: diálogo contaba solo experiencia/aspecto y ranking tenía otra agregación incompleta.
- Solución: diálogo y ranking usan cobertura autorizada por niño/competencia de la tabla; información insuficiente no cuenta. Sugerencias sin confirmación siguen excluidas.
- Validación: pruebas de cobertura/fuentes y QA local de celda → guiada («1 registro»), 35 niños con nombres largos, búsqueda y grilla desplazable en 1366/390 px sin desbordamiento del diálogo.
- Prevención: reutilizar cobertura común y mantener pruebas que cruzan fuentes, sin filtrar solo por criterio.

## Verificación de fecha y textos largos en compactación — 2026-10-13

Síntomas locales durante implementación: fecha elegida por UI no llegaba al segundo estado React y textos largos se superponían en tarjetas móviles. Causas: retirar onInput del control date existente al reubicarlo y filas auto comprimidas por max-height del grid. Solución: conservar los dos eventos originales onInput/onChange y grid-auto-rows minmax(min-content,auto), con scroll interno. Validación: segundo registro ficticio fechado 12/10/2026 tras cambio, guardado continuo, tarjetas de ~95px para textos de 81px y sin overflow horizontal, typecheck/lint/build PASS. Prevención: preservar handlers al mover controles y revisar textos oficiales largos, no solo etiquetas breves. Ninguno de estos estados se publicó.

## Enlace de QA abre el resumen de preparación — 2026-10-13

Síntoma reportado tras publicación: al abrir el enlace raíz aparece «Conoce a tu grupo» con indicador verde del resumen, percibido como una versión antigua. Causa confirmada: el enlace final apuntaba a `/`, que TeacherWorkspace resuelve a PreparationHome si no hay año confirmado; ese componente conserva su diseño anterior y no es el espacio InterviewsWorkspace modificado. La API de Vercel comprobó nuevamente Production 3be0385/dpl_9vLYaDxmqZrfrCntrTQEFgGg3Cmw; incluye los commits anteriores a16d162/dbda48f. Corrección validada: abrir desde el resumen el espacio real y Observaciones; navegador autenticado muestra cuatro botones/checks y los SVG compactos nuevos. Destino de QA: /#planificar?tab=diagnostic&step=2&mode=spontaneous. No hubo rollback, cambios de código, datos o nueva publicación. Prevención: entregar la ruta concreta validada y comprobar la pantalla autenticada, no inferirla de health/HTTP/commit. Captura privada ignorada: .local/latest-ui-release-20261013/current-observations.png.

## Herramientas de publicación: acceso CLI y helper Git — 2026-10-13

Síntoma: conector Vercel devuelve 403 para ayni4; push Git invoca una ruta temporal de gh.exe inexistente; curl rechaza --global-config. Causas: conector sin acceso al scope autorizado, helper específico de GitHub obsoleto y CLI 63.1.2 reenviando esa opción a curl nativo. Solución validada: CLI con su configuración local existente y scope explícito; helper Git Credential Manager limitado al comando de push; smoke con credencial local heredada solo por el proceso y proyecto/equipo ya verificados. Validación: push/commit remoto coinciden, Preview y Production READY en proyecto correcto, tres fases de diez smoke PASS. No se imprimen secretos ni se cambia protección, identidad o configuración global de Git. Prevención: comprobar enlace/proyecto/commit, no repetir conector 403 sin cambio, evitar opciones globales reenviadas en curl y verificar SHA/alias antes y después de promoción.

## Codificación en edición y ancho del indicador — 2026-10-13

Síntoma local durante implementación: acentos corruptos en alta/configuración y último paso sobre ilustración. Causa: lectura Python con codificación Windows implícita y ancho del componente compartido sobrescribiendo el ancho reservado del contenedor. Solución: reconstruir desde HEAD UTF-8 con lectura/escritura explícita; selector base :where de baja especificidad respeta el layout existente. Validación: textos restaurados, typecheck/lint/build, navegación y escritorio/móvil sin superposición ni overflow. Prevención: especificar UTF-8 en herramientas de archivo e inspeccionar la composición real, incluidos los anchos del contenedor. No afecta a registros guardados.

## Observación libre interrumpida y recuperación de foto poco informativa — 2026-10-13

Síntoma confirmado en código/UI: tras guardar libre se ocultaba el formulario y exigía «Registrar otra»; al reiniciarlo podían heredarse apoyo/competencias y estado interno de foto/dictado. Causa: `captureOpen=false` y limpieza parcial. Solución: formulario continuo, limpieza completa tras confirmación, controles reiniciados por revisión y foco en texto. Validación local: 503 simulado conserva borrador/UUID; reintento y tres registros consecutivos (uno con foto privada) PASS; captura vacía, cero competencias opcionales, apoyo sin indicar y evidencia privada recuperable. Prevención: verificar registro consecutivo real por UI, no solo guardado del servicio.

Síntoma reportado: foto de matrícula falló inicialmente y reintento funcionó. Causa del mensaje genérico confirmada: `catch` descartaba el error; lista recién publicada iniciaba lecturas de avatar concurrentes con PUT. Se difiere publicación de lista hasta terminar el intento de foto, se distingue 5xx y se protege reintento independiente contra doble clic. Validación local de 503 simulado/PUT 200/GET JPEG privado 200 sin otro alta PASS; recibo confirma primer GET del nuevo avatar después de PUT. **No se confirma la causa del fallo remoto original ni solución permanente del antecedente EMAXCONNSESSION**: captura sin request/log no permite esa atribución. Prevención: conservar mensaje público/recuperación, no repetir alta ni reintentar escrituras inciertas automáticamente. Informe: docs/qa/AYNI_OBSERVACIONES_INICIAL_2026-10-13.md.

## Optimización focal de guardado — 2026-10-12

Síntoma: repetir HTTP de alta generaba otro alumno; guiada dedicaba ~1,49 s a once lecturas de contexto; guardar borrador recalculaba contexto que excluye borradores. Causa: sin recibo de operación, consultas secuenciales y trabajo no necesario. Solución: recibo atómico bajo lock, lectura agrupada, reutilización de scope en confirmación, omisión del snapshot en borrador, roster compacto. Pruebas locales y fiabilidad remota en Preview 2fc3114 PASS: concurrencia, homónimos, replay tras edición, 503 previo/tras commit, contexto actual y recuperación privada de foto. HTTP promedio bajó en las siete operaciones; guiada pasó de 3,31 a 2,43 s HTTP y snapshot de 1,49 a 0,72 s. Su latencia visible quedó contaminada por automatización, sin atribuirla exclusivamente a código. Producción/seguridad/padrón/entrevistas QA iguales; siete tablas QA cambiaron fuera del fixture, limitando la prueba de inmutabilidad global. Fixture retirado. Reporte: docs/SAVE_PERFORMANCE_20261012.md. Prevención: prueba de recibos/homónimos/rollback y contrato de una lectura de fuentes, métricas HTTP sin datos pedagógicos. Éxito de foto de alumno se anuncia tras confirmación de subida, con reintento separado si solo se guardaron datos.


## Modal guiado móvil y restauración de entrevista — 2026-10-12

Síntoma: a 390px el modal tenía scroll horizontal general (476px de contenido en 350px útiles). Causa: fieldset conserva mínimo intrínseco aunque la fila de niños tiene scroll propio. Solución: min-width:0 y width:100% en fieldset; fila interna mantiene su scroll deliberado. DOM/captura posterior prueban 350/350px sin desbordamiento general. Prevención: medir scrollWidth del modal, no solo del documento.

«Cancelar cambios» restauraba valores en memoria y cerraba edición; el borrador autoguardado reaparecía al recargar. «Restaurar datos confirmados» conserva edición y aplica autosave existente; historial confirmado cambia únicamente al confirmar. No prometer eliminación de borrador cuando el servicio conserva versiones. Typecheck/lint/build PASS; historial/confirmación e idempotencia cubiertos en pruebas de servicio.

## Hora civil y reintento de entrevista en pantalla nueva — 2026-10-12

En prueba local, Observaciones lanzó Invalid time value porque today.now es hora civil HH:mm, no un timestamp para new Date. Se usa hora del reloj QA si existe o today.now directamente; navegación y guardados libre/guiado validados. Revisión del editor detectó que una carga fallida podía presentar datos vacíos: ahora bloquea edición/autosave, muestra Reintentar y permite salir sin guardar. Desconexión simulada/reconexión y recuperación del formulario PASS; reintento reinicia estado desde el evento y limpia fallo tras respuesta válida, sin setState síncrono en efecto. Prevención: comprobar contrato semántico de hora y validar recuperación de errores, además de tipos.

## Edición de nacimiento y compatibilidad local/remota de alumnos — 2026-10-12

En comprobación local, el date nativo modificado emitía input sin actualizar el estado del formulario solo con onChange: el servidor recibía nacimiento vacío. Se manejan input/change y actualizaciones funcionales, validando guardado y recarga de 2021-03-13 en navegador y en el servicio. Además PGlite rechazó updated_at en el UPDATE nuevo porque ese campo del esquema remoto no pertenece al contrato local de students; UPDATE usa solo campos comunes y CAS por valores originales, sin migración. Prueba funcional de identidad/historial/aislamiento/replay y conflicto PASS. Prevención: validar la fecha recibida tras recarga y ejecutar SQL nuevo contra contrato local antes de publicar.

## Nueva docente veía Preparación y no tenía guardado automático del alta — 2026-10-12

Síntoma: sin aula, #preparacion mostraba portada previa; el formulario guardaba únicamente al continuar, por lo que recargar perdía datos incompletos. Causa: PilotSetup dependía de active distinto de Preparación y conservaba todos sus datos en memoria. Solución: renderizar alta siempre que needsSetup; recuperar y guardar automáticamente estado privado por cuenta en preferences existente, con debounce/cola, confirmación visible, reintento y bloqueo compartido con creación. POST limpia estado temporal dentro de la transacción. Validado con PGlite (datos incompletos, aislamiento, preferencias preservadas, limpieza final y rechazo de escrituras tardías) y navegador local (recarga, edad explícita, logo y matrícula). Prevención: no declarar «guardado automático» basándose solo en estado React ni hacer depender el alta de un hash previo.

## Preview QA: límite de conexiones de sesión — 2026-10-12

Resultado posterior: republicación autorizada del mismo código `903020b` en `dpl_48KBjF5WGdE6ojVJZta5uMyv7pLG` READY. Recuperación pública validada con auth/config 200, sesión sin ingreso 401, health 200 e ingreso vacío visible en Side Panel. Typecheck/lint, cuatro pruebas del adaptador y build cloud PASS. Producción intacta respecto de la referencia leída antes de esta operación. No se modificó el pool ni se demuestra prevención permanente de recurrencia; queda pendiente revisar el pool de sesión/serverless. Comprobación autenticada requiere ingreso manual del propietario en el nuevo dominio.

Síntoma: «No pudimos conectar con Ayni» y HTTP 500 en `/api/auth/config`, también errores previos al reinicio en diagnóstico/Mi año. Logs de Vercel prueban `EMAXCONNSESSION`, máximo 15 clientes del pool de sesión. El borrado QA terminó y se verificó independientemente; este fallo no acredita pérdida adicional de datos. Cierre administrativo de dos conexiones postgres/Supavisor en estado idle PASS, pero la Preview siguió devolviendo 500. Recuperación propuesta y expresamente autorizada: volver a publicar únicamente la misma Preview, código `903020b`, sin modificar producto. Recuperación visual/smoke pendientes; no declarar resolución antes de comprobarlos. Como prevención pendiente, revisar el uso de session pooling en serverless y la recuperación de bootstrap tras un fallo de conexión. Recibos privados en `.local/reset-qa-20261012/`; sin secretos.

## Reinicio QA: calendario compartido y recuperación del acceso — 2026-10-12

Síntoma: ensayo abortó con «Protected data changed or QA rows remain: school_calendar_versions». Causa: la huella de filas protegidas usaba `NOT (predicado de propietario)`; las versiones compartidas con `school_year_id IS NULL` quedaban excluidas de la huella inicial, pero incluidas al verificar toda la tabla tras el borrado. Solución: calcular el respaldo con `(predicado) IS NOT TRUE`, incluyendo los recursos compartidos sin propietario. Validación: ensayo con rollback, reinicio de 331 filas y verificación independiente de 81 huellas protegidas PASS; calendario compartido intacto. Prevención: contemplar NULL al calcular el complemento de ámbitos privados.

El acceso administrativo se recuperó con la CLI ya autenticada: `supabase projects list` identifica el proyecto nuevo y `supabase db query --linked --project-ref ... --file ...` ejecuta sin extraer secretos. El conector muestra otra cuenta y las URLs locales están ocultas; esos dos fallos no demuestran ausencia de acceso. Comprobar primero la sesión CLI existente antes de pedir otro ingreso. No registrar tokens ni secretos.

## UX-QA-06 — Salir de la preparación dejaba a la docente sin regreso claro

Síntoma reportado: una docente sin año confirmado puede abrir otro módulo y no encontrar su etapa de preparación. Causa: shell con todos los destinos al mismo nivel, sin portada ni regreso; el arranque anterior trataba también el borrador anual como motivo para ir a Hoy. Solución: navegación temporal de cuatro etapas basada en plans.active del servidor, acceso secundario y ruta de regreso saneada; después de confirmación, navegación habitual/Hoy. Validación: 16 focales PASS; diagnóstico→Hoy→entrevista y Calendario→etapa pendiente con borrador guardado y tres niños conservados en HTTP local; cero escrituras/IA durante navegación. Escenario anual confirmado mediante respuesta GET ficticia explícita, sin preparar un plan remoto. Prevención: probar salida/regreso y distinguir borrador de año confirmado; no guardar contenido privado para recordar navegación.


## UX-QA-05 — Confirmación de entrevista atribuida a un borrador (2026-10-12)

Síntoma observado en Side Panel: «Entrevista guardada» en lista cuyos niños aparecen sin respuestas. Causa: onSaved se invocaba también al volver guardando un borrador; el contenedor convertía ese callback en confirmación general. Solución: lista presenta estado persistido; toast de confirmación únicamente tras save-and-confirm exitoso. El progreso consulta respuestas confirmadas y conserva el estado independiente del borrador. Metadata/espacios/listas vacías no cuentan. Validación: caso HTTP/UI local pendiente→borrador recuperable (0 %)→una respuesta confirmada (100 %), servidor y recarga; 62 regresiones focales PASS. Prevención: distinguir avance guardado de entrevista confirmada, y probar correcciones con historia en lugar de contar solo el estado visible más reciente.


## Matrícula inicial: foto recuperada y borradores de importación — 2026-10-11

En el QA local, un error de foto después del alta conserva al niño y reintenta exclusivamente el archivo, pero la miniatura ya consultada como ausente no se refrescaba. La URL de foto dependía solo del ID: se agrega una revisión de imagen por niño al recuperar la foto, conservando el handler y la API privada. La recuperación de archivo/niño y su persistencia tras recarga se comprobaron con servidor local real; la aceptación visual remota se hará cuando el propietario autorice matricular.

El handler de importación limpiaba simultáneamente el formulario individual y la lista, aunque solo guardaba uno de ellos. Ahora limpia exclusivamente el origen confirmado; en matrícula inicial bloquea importar mientras hay un niño individual pendiente y explica cómo continuar. Prueba local: revisión/repetidos/exclusión no escriben; un nombre individual pendiente deshabilita importación y continuación; servidor confirma solo las tres altas esperadas, sin la fila excluida. Prevención: verificar borradores coexistentes y recuperación de foto sin repetir inscripción; no confundir guardado del niño con el del archivo opcional.

## Guardado del aula tarda aproximadamente 40 s — 2026-10-11

Síntoma: espera excesiva y dos indicadores. El aula original sí se creó una vez. Causa medida por reproducción en Preview/Supabase: dashboard posterior a COMMIT insertaba 305 días consecutivamente; calendario 36,229 s y recorrido completo central 40,061 s. No confundir red/SQL medidos en cliente DB con CPU SQL, ni atribuir retrospectivamente fases a la solicitud histórica sin trazas. Solución validada: fuente oficial compartida precargada, snapshot confirmado, progreso único y reintentos idempotentes. Guardado central corregido con logo 2,108 s y básico 1,364 s; conexión/Auth/transporte se miden aparte. El HTTP del arnés incluye preparación/limpieza y no es la latencia normal de producto. Migración aplicada preserva 84 tablas, suite completa 778 PASS y 42 focales finales PASS. Navegador local conserva formulario y recupera respuesta perdida; COMMIT incierto conserva logo. Medición remota revierte sus tres aulas ficticias y retira solo dos logos autorizados; Celeste y datos privados conservados. Prevención: calendarizar una vez por fuente/año, nunca materializar por aula; medir HTTP y fases en entorno remoto y no anunciar éxito antes de confirmar servidor.

Comprobación de huellas durante QA: el hash global varía porque preparation_dispatch_receipts conserva nonces efímeros del programador preexistente, con caducidad de dos minutos. Dos lecturas posteriores localizan la única variación en esa tabla; las otras 83 huellas coinciden. No detener ni cambiar el programador, no restaurar nonces, no atribuir esa variación al guardado ni afirmar que el hash global inicial y final coinciden. Registrar huellas individuales y distinguir estos recibos técnicos de los registros pedagógicos en futuras pruebas.

## QA de configuración: tipos en regeneración y caché Webpack — 2026-10-11

- Síntoma: typecheck concurrente con Next encontró archivos `.next/types` desaparecidos; el segundo build tuvo TypeError interno en WasmHash._updateWithBuffer, aunque el build inicial pasó.
- Causa: dependencia compartida comprobada entre tsc y regeneración de tipos de Next. La causa concreta del TypeError de Webpack no quedó demostrada; no atribuirlo al componente ni afirmar que la concurrencia lo explica.
- Corrección: completar Next antes del typecheck final; apartar la caché Webpack dentro del workspace y repetir Next de forma aislada. Reintento Next PASS, Vinext PASS. Recibo posterior de typecheck en `.local/setup-screen-qa/typecheck-final.log`.
- Prevención: no ejecutar simultáneamente comprobaciones que regeneran y leen `.next/types`; conservar logs privados y revalidar sin modificar lógica de producto para un fallo de caché.
- Recurrencia durante UX-QA-02: Next/webpack falló otra vez en WasmHash incluso ejecutándose sin otra compilación concurrente. Apartar únicamente `.next/cache/webpack` a `.local/setup-interactions-qa/` y repetir dio PASS; typecheck posterior y Vinext PASS. Esto confirma la recuperación validada, sin demostrar aún la causa interna del fallo. No se modificó configuración ni lógica de producto para sortearlo.

## Reinicio QA: comparación decimal y límite de argumentos — 2026-10-11

- Síntoma: el ensayo administrativo abortó antes de eliminar filas con «QA data changed: ai_usage_events», aun con el mismo contenido. La consulta independiente posterior tuvo error 54023 al construir un objeto con 81 huellas.
- Causa raíz: serializar números por JavaScript conserva su valor, pero puede cambiar la escala textual de numeric; un hash de esa representación no equivale a igualdad de datos. PostgreSQL limita a 100 argumentos una llamada a función.
- Solución validada: comparar arrays JSONB completos con igualdad semántica, además del recuento/IDs, para el contenido propio; mantener hashes calculados íntegramente en SQL para datos protegidos. Construir el mapa amplio con jsonb_object_agg sobre VALUES.
- Validación: ensayo con rollback PASS, reinicio de exactamente 352 filas PASS y consulta independiente con cero filas propias, Auth/seguridad y las 81 huellas protegidas intactas. Artefactos administrativos privados, sin credenciales, en `.local/reset-open-account-20261011/`.
- Prevención: no debilitar la guarda al fallar; distinguir igualdad JSONB de igualdad de representación decimal y usar agregación para mapas grandes. No reutilizar inventarios ni IDs de reinicios antiguos.

## 2026-10-11 · UX-06 · Transición tras configurar el aula

**Síntoma:** aula guardada correctamente, seguida de carga permanente en lugar de registrar niños. Reproducido con navegador y servidor HTTP real sobre PGlite nueva y docente ficticia.

**Causa:** la nueva guarda de salida busy de PilotSetup seguía activa cuando onReady llamaba a navigate; rechazaba su propia transición posterior al guardado y dejaba starting activo.

**Solución validada:** la respuesta exitosa de configuración usa la transición explícita afterSavedSetup; las otras navegaciones conservan canLeaveWorkspace. El recorrido vuelve a mostrar matrícula, añade un niño, guarda una observación, conserva dos correcciones y las recupera después de recargar. 24 pruebas focales, typecheck y builds Next/Vinext PASS.

**Prevención:** comprobar éxito de formulario dentro del workspace completo y API real; una prueba aislada del formulario con callback vacío no verifica la transición. No omitir la guarda en errores o salidas anteriores al commit de datos.

## 2026-10-07 — Integración de lotes y consolidado

**Síntoma/causa.** Una proyección nueva leía level donde el modelo canónico exponía achievement_level: consolidado perdía la valoración. Hash basado en serialización JSON dependía del orden de propiedades al recuperar JSONB. Un job de edición individual guardado solo mostraba su niño, ocultando los demás textos canónicos. Fixtures antiguas carecían de tablas de cierre y asumían modificaciones posteriores sin reapertura.

**Solución validada.** Leer campo canónico; stableFingerprint para fuentes; GET de lote guardado reúne textos vigentes del aula sin generar los ajenos. Fixtures usan esquema efectivo y reapertura explícita. Suite final 745/745 PASS y HTTP ficticio comprueba corrección selectiva/recierre con manifiesto anterior intacto.

**Prevención.** Probar checkpoint serializado y cambio individual con varios niños; no validar solo respuesta inicial. Guardas no fallan abiertas por falta de tablas. Capturas fullPage deben comenzar arriba para evitar cabecera fija a mitad de imagen. Render DOCX intentado pero LibreOffice ausente: registrar límite, no afirmar QA de paginación.

## 2026-10-05 — Reprogramación de actividad completada desalineó agenda y ejecución (pendiente de corrección)

**Síntoma reproducido.** `reprogramActivity` aceptó mover una actividad ficticia completada del 7 al 8 de abril: cambiaron fecha de actividad y agenda, pero el log completed conservó ejecución el 7. La ruta de calendario llama directamente al servicio. Solo base PGlite en memoria; ningún dato docente modificado.

**Causa raíz.** El servicio valida propiedad, día lectivo, límites y conflicto de fecha, pero no comprueba pasado, ejecución ni evidencias. Los guards de versiones del mapa no protegen esta entrada independiente.

**Solución propuesta, todavía no implementada ni validada.** Centralizar protección en servidor, consultar registros reales dentro de la operación transaccional y rechazar cambios de actividades pasadas/ejecutadas/con evidencia, incluyendo cambios de estado. El futuro intercambio debe validar ambas actividades y persistir ambas fechas/agenda/historial de forma atómica. No quitar controles del mapa para reutilizar esta ruta.

**Verificación y prevención.** Reproducción ejecutada en `.local/experience-audit-2026-10-05/probe-past-calendar.mjs` y recibo JSON del mismo nombre. Las 161 regresiones seleccionadas pasan, pero no cubrían este contraejemplo; no acreditan solución. Añadir regresión de calendario/HTTP con completed, evidencia, fecha pasada, concurrencia y aislamiento al corregir. Auditoría y transición en `docs/REDISENO_EXPERIENCIA_AUDITORIA_2026-10-05.md`.

## 2026-10-02 — Bloqueo de generación anual en Preview por ruta de compilación

**Síntoma registrado antes de corregir.** En el Preview de `b94cd6e`, Guardar y generar propuestas conserva la idea y la preparación QA, pero falla con `ENOENT` al abrir `/vercel/path0/skills/crear-plan-anual/references/criterios-cneb.md`; no se obtiene un plan vigente. Nota previa fuera del repositorio: `ayni-preview-annual-blocker-before-fix.md`.

**Causa raíz.** El cargador personalizado usa `new URL(..., import.meta.url)`, convertido por el bundle Next en una ubicación del servidor de compilación. Los recursos ya están incluidos por `outputFileTracingIncludes`; los cargadores anuales anteriores usan el directorio de ejecución.

**Corrección mínima y validación local.** Se resuelven las mismas dos referencias mediante `path.join(process.cwd(), ...)`, conservando archivos, textos, validación y reglas. La regresión ejecuta el módulo desde un directorio separado con referencias propias. 13 pruebas focales de cargador, personalización y preferencias PASS; typecheck, lint y build Next con webpack PASS. El trazado de la ruta API contiene ambas referencias y sus archivos existen. La validación remota posterior debe hacerse desde el commit correctivo; el commit original no se declara apto para producción. Reversión: revertir este cambio de resolución, sin alterar datos QA ni históricos.

**Prevención.** Comprobar generación real desde el paquete desplegado y la lectura desde un directorio de ejecución distinto; build READY y carga del shell no garantizan que los recursos dinámicos sean legibles.

## 2026-10-01 — Publicación desde una rama que omitía correcciones aprobadas

**Síntoma.** Después de publicar el mapa anual reaparecieron la ausencia de sugerencias de Jev y la sustitución de nombres al transcribir observaciones espontáneas.

**Causa raíz.** La rama del mapa partió de `af522a5` y no incorporó `2d251bb`, `f78b58b`, `e082f94` y `f8b2653`, existentes en otra rama/worktree. Faltaban la normalización LF del hash del clasificador en Windows y el uso de transcripción literal para archivos adjuntos espontáneos.

**Solución validada.** Merge de ambas historias en `codex/annual-year-map`, conservando las trazas de personalización, el mapa y el acceso a actividades concretas. La prueba de continuidad antigua se ajustó a la entrevista de nueve pasos aprobada. Pasaron 55 pruebas focales, typecheck, lint y build. En navegador local, una observación ficticia obtuvo una sugerencia real de Jev para cantidad, quedó pendiente de decisión docente y conservó su nombre. La prueba de audio confirma RAW exacto sin reescritura ni reemplazo por marcadores. Además, el alta empieza sin edad: con otros datos completos sigue bloqueada y solo permite avanzar tras elegir; una prueba de servidor cubre ausencia, edades inválidas y 3/4/5.

**Prevención.** Usar la rama consolidada en el checkout principal y verificar ancestros de los cambios aprobados antes de desplegar. Los worktrees anteriores son referencias históricas; no continuar producto desde sus bases. Mantener los experimentos no publicados fuera del commit. Reversión de código mediante el despliegue anterior; no hay migración ni modificación de datos remotos.

## 2026-10-01 — Reincorporación fallaba aunque quedaba un tramo lectivo libre

**Síntoma.** Al retirar una propuesta de mitad de año, «Incorporar al final» fallaba si el último bimestre estaba lleno, pese a quedar libre el tramo de la propuesta retirada.

**Causa raíz.** La bandeja intentaba agregar siempre la propuesta después de la última fila y le asignaba el bimestre de esa fila.

**Solución validada.** «Incorporar al año» prueba posiciones del bimestre original y acepta la primera compatible con el calendario. El recorrido local volvió a retirar y reincorporar una propuesta, guardó, recargó y confirmó la nueva versión. La prueba focal de inserción, typecheck, lint y build pasaron.

**Prevención.** La prueba de reincorporación cubre el caso de último bimestre lleno con un tramo anterior libre.

## 2026-10-01 — Una observación guiada devolvía «Recurso no encontrado»

**Síntoma.** Al guardar una nota desde una experiencia guiada del diagnóstico, la API respondía 404 aunque la experiencia aparecía en la interfaz.

**Causa raíz.** La autorización genérica interpretaba `experienceId` como UUID de `learning_experiences`. Las guías diagnósticas usan IDs editoriales del catálogo versionado. El rechazo ocurría antes de la validación específica de la guía.

**Solución validada.** Solo en `/api/diagnostics/experience-observations` se omite esa interpretación genérica. La autorización sigue comprobando el alumno y el servicio verifica que experiencia y aspecto sean aplicables al aula. Una prueba cubre el ID editorial válido, un alumno ajeno y el rechazo del mismo ID en rutas de proyectos.

**Prevención.** Distinguir los identificadores editoriales del catálogo de los UUID de recursos persistidos en el límite HTTP.

## 2026-10-01 — El clasificador V2.4 no cargaba en un checkout Windows

**Síntoma.** La prueba del adaptador V2.4 fallaba con «V2.4 no coincide con la versión congelada» antes de llamar a Jev.

**Causa raíz.** Git había convertido `current-v2.mjs` a CRLF en Windows. El SHA-256 esperado corresponde a los bytes LF del archivo versionado, sin cambio semántico del código.

**Solución validada.** La verificación normaliza solo los finales de línea del código fuente a LF antes de calcular su hash; el prompt sigue verificándose en bytes. La prueba del adaptador volvió a pasar. El modelo, prompt y umbrales permanecen congelados.

**Prevención.** Verificar los hashes de archivos de texto versionados sobre su representación LF canónica o fijar `eol=lf` en `.gitattributes` para los siguientes archivos congelados.

## 2026-10-01 — Calendario perdía la actividad y Hoy confundía observación cotidiana con diagnóstico

**Síntoma.** «Ver actividad» abría la portada de Planificar; «Observar» podía abrir el diagnóstico inicial aunque la intención fuera registrar una observación cotidiana.

**Causa raíz.** Calendario enviaba una función sin argumentos y descartaba el ID de actividad y experiencia. Hoy usaba Diagnóstico como destino alternativo para toda actividad sin criterio.

**Solución validada.** El ID y la experiencia viajan hasta la ficha exacta; talleres se muestran en una ficha propia del Calendario. «Observar» abre el diálogo cotidiano existente cuando no hay actividad con criterio. Se verificaron en navegador local los dos tipos de actividad pasada y el diálogo cotidiano; faltan escenarios de hoy y futuro en un aula con esos datos. Tests focales, typecheck, lint y build pasaron.

**Prevención.** Las pruebas de navegación deben conservar el ID seleccionado y cubrir experiencias de proyecto, unidad y taller; el destino de observación se decide por capacidad disponible, no por el nombre del botón.

## 2026-10-01 — Tres alumnos indistinguibles al registrar el diagnóstico

**Síntoma.** En el aula QA «Auditoría 5 años», las tarjetas de los tres alumnos, las entrevistas y la ficha de observación mostraban solo «Prueba». Una docente no podía identificar con seguridad a Prueba Uno, Dos o Tres antes de guardar evidencia.

**Causa raíz.** Las consultas de los espacios diagnósticos devolvían solo `preferred_name` o `first_name` como `name`, aunque el apellido estaba guardado. La interfaz presentaba fielmente ese dato incompleto.

**Solución validada.** Las lecturas autorizadas de experiencias y revisión diagnóstica componen el nombre visible con nombre preferido (o nombre) y apellido. No se modifican registros ni autorizaciones. Pasaron diez pruebas de ambos servicios, typecheck, lint, build Vinext y build Next.js. El commit `4c67e25` se publicó en el despliegue `dpl_4tbGw2GVBdmVwaPBKJu2ZFeMxcPP`; `/health` y `/api/auth/config` respondieron 200, y `/api/diagnostics` sin sesión respondió 401 esperado. En la sesión docente, las entrevistas y la revisión diagnóstica muestran «Prueba Uno», «Prueba Dos» y «Prueba Tres».

**Prevención.** Las pantallas donde se atribuyen entrevistas, observaciones o valoraciones deben distinguir alumnos con el mismo nombre de pila antes de habilitar el guardado.

## 2026-09-30 — Diagnóstico no cargaba con el esquema PostgreSQL de staging

**Síntoma.** La interfaz muestra «No se pudo cargar el diagnóstico local» y bloquea el recorrido natural hacia el plan anual. Los eventos de Vercel registran `GET /api/diagnostics` con estado 500 bajo la sesión docente (por ejemplo, request ID `18b34d7e-2dca-4977-adc3-35c86919dc44`); las rutas vecinas de diagnóstico y planificación devolvieron 200. El cliente reemplaza el fallo por el mismo texto genérico.

**Causa confirmada.** `observation_references.performance_ids` es `jsonb` en las migraciones locales y `uuid[]` en las migraciones de Supabase. Dos consultas del API llamaban `jsonb_array_elements_text` y `jsonb_array_length` directamente sobre la columna. Una prueba con las migraciones Supabase reproduce el rechazo de la consulta anterior por tipo incompatible. La misma incompatibilidad afectaba la validación del POST diagnóstico heredado. Los logs de la función solo emitían un evento sanitizado, sin excepción SQL; el smoke autenticado posterior confirmó la recuperación de la ruta que devolvía 500.

**Solución validada.** Ambas consultas convierten la columna con `to_jsonb` antes de usar las funciones JSONB. La prueba de paridad ejecuta esas expresiones contra ambos esquemas. Pasaron la prueba de paridad, nueve pruebas funcionales de Auth/diagnóstico, typecheck, lint, build Vinext y build Next.js. No hay migración ni cambio de datos. El commit `7118001` se desplegó en el proyecto staging de Vercel (`dpl_A9UzhvmTLv5gjVPUDLkyoHBN6zb4`) y se asignó a `project-0w0pq.vercel.app`. El smoke sin sesión dio 200 para `/health` y `/api/auth/config`, y 401 esperado para `/api/diagnostics`; con la sesión docente, los logs registraron `GET /api/diagnostics` 200 y la interfaz abrió «Observar», una experiencia guiada y su relación curricular con tres competencias.

**Prevención.** La paridad de esquema debe incluir tipos de columnas y consultas críticas, además de nombres de tablas y columnas. El mensaje cliente debe conservar un código seguro o `request_id` para distinguir autenticación de fallos internos en futuras incidencias.

## 2026-09-30 — Alta inicial completada pero acceso administrativo pendiente

**Síntoma.** Supabase Auth muestra una cuenta «Sebastian» confirmada y sin ingresos previos, pero Ayni responde «Revisa tu DNI y contraseña». El primer intento usó el DNI ficticio preparado por QA, distinto del DNI que el propietario introdujo durante el alta. Un intento posterior con el DNI usado en el alta también falló; no se ha determinado todavía si la contraseña introducida al crear la cuenta coincide con la del ingreso.

**Causa confirmada y tratamiento.** El formulario de alta regresaba al inicio sin mensaje de éxito, lo que ocultaba la diferencia entre la clave de configuración, el DNI del alta y la contraseña de ingreso. Se añadió un mensaje explícito tras crear la cuenta y una recuperación inicial con clave privada, limitada al único administrador que nunca ha ingresado. Permite sustituir DNI y contraseña sin duplicar cuentas. La recuperación real y el primer ingreso en staging aún deben verificarse; después se retira `AYNI_ADMIN_SETUP_KEY` y se redespliega.

**Prevención.** Confirmar el DNI elegido y el mensaje de alta antes de probar el ingreso. Probar el caso completo en staging y no declarar el acceso resuelto solo porque Auth contiene un usuario confirmado.

## 2026-09-30 — Vercel CLI incluía archivos privados locales en el manifest

**Síntoma.** `vercel deploy --dry --json` del staging nuevo incluyó más de siete mil archivos de `.local/`, entre ellos `.local/vercel-ayni-staging/auth.json`, aunque Git los ignoraba. No se ejecutó el despliegue con ese manifest.

**Causa raíz.** La CLI no usó la exclusión de `.local/` de `.gitignore` al construir el paquete de archivos. La lista de exclusión propia de Vercel no cubría esa carpeta personalizada.

**Solución validada.** Se añadió `.vercelignore` con `.local/`, secretos y artefactos de ejecución excluidos. Un dry run posterior detectó todavía la entrada de directorio vacía `.local` (sin archivos); se excluyó también su nombre exacto. El manifest final contiene 1631 archivos y cero rutas `.env*`, `.local`, `.local/`, `.codex/`, `node_modules/`, `.next/` o `auth.json`; conserva los archivos de aplicación revisados. No se imprimió ni subió el contenido del archivo de autenticación.

**Prevención.** Antes de cada despliegue CLI desde este checkout, ejecutar un dry run y rechazar cualquier manifest que incluya secretos o carpetas locales. Conservar `.vercelignore` al cambiar el proceso de publicación.

## 2026-09-30 — Vercel no reconocía la CA de PostgreSQL de Supabase

**Síntoma.** El primer despliegue de `ayni4/ayni-aula-staging` compiló y quedó `READY`, pero `/health` devolvió HTTP 500. Los logs de la Function mostraron `SELF_SIGNED_CERT_IN_CHAIN` al conectar con PostgreSQL.

**Causa raíz.** El adaptador exigía verificar TLS, pero Node en Vercel no tenía la CA raíz de Supabase entre sus autoridades de confianza. El build no abre una conexión y no detectó el problema.

**Solución validada.** Se incorporó la CA pública descargada desde Database Settings del proyecto nuevo, con huella SHA-256 comprobada, y se aplica solo a hosts de Supabase con `rejectUnauthorized: true`. Una conexión de prueba al pooler con contraseña deliberadamente incorrecta llegó al rechazo PostgreSQL `28P01`, confirmando que superó la verificación TLS. La prueba del adaptador, typecheck, lint y build pasaron. El despliegue corregido `dpl_GfYuLZak6ocGnqH63zGVQdaPAs5a` devolvió 200 en `/health` (`engine=postgres`), `/` y `/api/auth/config`; `/api/auth/session` sin credenciales devolvió 401. Los logs de esas peticiones no mostraron errores.

**Prevención.** Probar `/health` en la Function desplegada y revisar logs antes de anunciar un despliegue funcional. Renovar la CA antes de su vencimiento de 2031, sin desactivar la verificación del certificado ni registrar credenciales.

## 2026-09-30 — Clave nueva de Supabase enviada como JWT

**Síntoma.** Al preparar staging se observó que los adaptadores de Storage y la herramienta administrativa enviaban la nueva clave `sb_secret_…` tanto en `apikey` como en `Authorization: Bearer`. Supabase documenta que esa cabecera Bearer se interpreta como JWT y puede devolver `Invalid JWT`.

**Causa raíz.** El código se escribió para la clave `service_role` antigua, que sí es un JWT, antes de seleccionar las claves nuevas del proyecto Ayni.

**Solución validada.** Un helper común envía las claves `sb_secret_…` solo en `apikey` y conserva Bearer para JWT antiguos. Las pruebas HTTP simuladas de Storage y Auth admin verifican ambas rutas; la verificación con la instancia real sigue pendiente del despliegue.

**Prevención.** Al incorporar una clave nueva, probar las cabeceras y una operación real de Storage y Auth admin en staging. Nunca imprimir ni guardar claves en los tests o el repositorio.

## 2026-09-30 — Rutas de plantillas en el bundle de Next

**Síntoma.** La página de Next compilaba, pero `/health` y `/api/auth/config` respondieron 500 en una prueba `next start` con identidad local.

**Causa y alcance.** Primero, rutas relativas a `import.meta.url` de módulos empaquetados ya no apuntaban al árbol fuente. Tras corregirlas, el servidor de producción rechazó deliberadamente `AYNI_AUTH_MODE=local`; esa protección no se desactivó. El segundo 500 no demuestra un fallo de staging, que aún carece de la conexión PostgreSQL y Auth real para probarlo.

**Corrección comprobada.** Recursos curriculares, plantillas, guías e inventario se resuelven desde la raíz y se incluyen en el trace de Next. El build Next, typecheck, lint y las pruebas locales de documentos, plan anual y adaptadores pasaron. La invocación directa del puente con identidad local en `NODE_ENV=test` devolvió 200 en `/health`, `/api/auth/config` y `/api/auth/session`; todavía falta repetir en la Function real con PostgreSQL/Auth y descargar un Word.

**Prevención.** Ejecutar smoke en el runtime final con sus variables reales; una compilación exitosa ni una prueba local demuestran que los archivos empaquetados o la autenticación de staging funcionan.

## 2026-09-29 — Fechas discordantes en el diagnóstico de QA

**Síntoma.** El Word mostraba «Período de recojo: 16/03/2026–27/03/2026» y, más adelante, «Registros revisados: 28/09/2026». La diferencia no estaba señalada.

**Causa raíz.** En la copia local de QA, el período previsto del diagnóstico quedó en marzo, mientras que las observaciones incluidas en el snapshot confirmado tienen fecha civil 28/09/2026. Es una discrepancia de datos de esa copia; el exportador anterior presentaba ambos rangos sin distinguir su significado.

**Solución validada.** El Word separa «Período previsto de recojo» de «Registros revisados» y muestra una advertencia explícita cuando alguna observación cae fuera del período. No se cambiaron fechas ni observaciones. La prueba cubre un registro dentro y otro fuera del período; el PDF de la copia local muestra la advertencia.

**Prevención.** Revisar la fecha civil de los registros del snapshot antes de usar el diagnóstico como documento final. Corregir una fecha de origen solo con confirmación y trazabilidad docente; la presentación no debe ocultar la discordancia.

## 2026-09-29 — El Word de actividad ocultaba el apartado de observaciones

**Síntoma.** La actividad mostraba «Qué observar» en los referentes curriculares, pero el Word descargado antes de registrar evidencias no mostraba el apartado «Registro de observaciones y evidencias».

**Causa raíz.** El exportador eliminaba toda la sección VI cuando la actividad aún no tenía observaciones docentes, junto con la tabla vacía de la plantilla.

**Solución validada.** Se conserva el título de la sección y se muestra «Aún no hay observaciones registradas» con la indicación de registrarlas en Hoy. La tabla solo aparece cuando existen registros reales; la reflexión docente sigue ausente hasta que se escriba. Se comprobó el DOCX sin marcadores, la variante con taller y el PDF de una actividad de prueba.

**Prevención.** El test del exportador cubre actividades sin observaciones y con observaciones reales, además de la plantilla con taller. No se rellenan observaciones ni valoraciones por inferencia.

## 2026-09-29 — QA diagnóstico sin sugerencias de Jev

**Síntoma.** Las 12 observaciones diagnósticas del aula ficticia contaban para «Observar» (6/6), pero cada tarjeta solo ofrecía elegir una competencia manualmente.

**Causa raíz.** La importación correctiva usó `classifierEnabled=false`, dejando las filas con `classifier_status='disabled'` y sin versión V2.4. El flujo V2.4 solo procesa automáticamente filas propias pendientes.

**Solución validada.** Tras respaldar PGlite y comprobar los 12 IDs sin decisiones docentes, se marcaron únicamente esas filas como pendientes `CURRENT_V2_4_RAW`. La cola existente produjo 8 sugerencias y 4 abstenciones, visibles en la UI; ninguna se confirmó. Entrevistas 6/6, observados 6/6, Resumir pendiente y ordinarias 0. Ver `docs/qa/six-students-diagnostic-correction-2026-09-29.md`.

**Prevención.** Cuando un QA debe probar recomendaciones, cargar la observación mediante el flujo diagnóstico con V2.4 activo y comprobar `classifier_status` además del contador de alumnos observados.

## 2026-09-29 — Dataset QA de 5 años cargado en observaciones ordinarias

**Síntoma.** Había seis entrevistas confirmadas y 24 observaciones ordinarias, pero Diagnóstico → «2. Observar» mostraba 0/6.

**Causa raíz.** El script de carga usó `ordinary_observations`, mientras el contador diagnóstico consulta por alumno `diagnostic_experience_observations`, `diagnostic_spontaneous_observations` y observaciones de sesiones diagnósticas. Las notas ordinarias no alimentan ese paso.

**Solución validada.** Con respaldo previo y comprobación de los 24 IDs/textos, se retiraron únicamente esas filas de QA y se registraron O1 y O2 de cada alumno como 12 observaciones espontáneas diagnósticas, sin clasificar ni invocar IA. Se conservaron las seis entrevistas. API e interfaz muestran Conocer 6/6, Observar 6/6, Resumir pendiente; ordinarias 0. Ver `docs/qa/six-students-diagnostic-correction-2026-09-29.md`.

**Prevención.** Para QA del Diagnóstico inicial, verificar el predicado real de `diagnosticStepProgressForTeacher` antes de cargar datos. No reutilizar el script histórico de observaciones ordinarias para este fin.

## 2026-09-29 — Falsos bloqueos del filtro V2.4 ante verbos iniciales

**Síntoma.** QA-JEV-01 («Estaba…») y QA-JEV-03 («Tomó…») quedaban `privacy_blocked` sin llegar a Jev, aunque eran observaciones ficticias curriculares.

**Causa raíz.** El filtro conservador de mayúsculas trataba verbos iniciales no incluidos en `SAFE_START` como posibles nombres. El producto decidió eliminar íntegramente el filtro previo para `CURRENT_V2_4_RAW`, no ampliar una lista de excepciones.

**Solución validada.** Se retiró el filtro y el estado de este flujo, se conservó y envió RAW exacto, y las migraciones 0068 / 202609290003 transforman filas antiguas preservando decisiones docentes. Los cinco casos QA llegaron a Jev; 49 pruebas relacionadas, typecheck, lint y build pasaron. QA-JEV-05 sugirió PS_CONVIVE frente a MAT_FORMA aproximado; no se ajustó el clasificador.

**Prevención.** Mantener una prueba de frontera que compare byte a byte el RAW persistido con el entregado al clasificador, incluidos nombres, mayúsculas, correo, dirección y espacios. Cualquier cambio futuro de tratamiento de datos debe ser una decisión de producto explícita y documentada.

## 2026-09-28 — F10: timeout del arranque HTTP con concurrencia libre

**Síntoma.** `node --test` reportó 595/596; `auth-http.test.mjs` no observó al servidor iniciar dentro de su plazo mientras otras pruebas PGlite/Word corrían en paralelo.

**Causa comprobada.** El test pasó aislado (1/1) y la suite completa pasó con `--test-concurrency=4` (596/596), sin cambio de código de producto. La saturación del runner es la explicación consistente con estos resultados; no se atribuye el timeout a F10.

**Solución validada.** Limitar la concurrencia de la suite general a cuatro procesos en este host y mantener comandos por separado. No repetir ninguna llamada IA.

**Prevención.** Ejecutar suites de integración que arrancan PGlite/servidores con concurrencia controlada y reportar por separado los fallos de infraestructura.

## 2026-09-28 — F9: reajuste incompatible con huella de evidencia F8

**Síntoma.** Un cierre que incorporaba una observación ordinaria confirmada podía quedar rechazado como «nueva información» al aceptar un reajuste, aunque las fuentes no hubieran cambiado.

**Causa raíz.** La ruta de cierre F8 usaba `includeOrdinary`, pero la verificación transaccional de reajuste llamaba al lector de períodos sin esa opción.

**Solución validada.** Pasar el mismo flag a la transacción y probar con una observación ordinaria confirmada: el cálculo legacy rechaza la huella F8 y el cálculo corregido acepta la nueva versión sin tocar raw ni cierre.

**Prevención.** Los consumidores de una huella de cierre deben usar exactamente la misma proyección de fuentes que la produjo; ampliar las pruebas cruzadas en cada nueva fuente evaluable.

## 2026-09-28 — F8: navegador QA no disponible en el host

**Síntoma.** El CLI `agent-browser` no estaba instalado; el navegador integrado agotó el tiempo al navegar y luego devolvió `User unavailable`.

**Causa comprobada.** Fallo de disponibilidad de la superficie de automatización, no del servidor: Vite respondió `GET /` 200, la API QA respondió en 8796 y el build pasó. No se pudo inspeccionar visualmente el DOM.

**Tratamiento.** Se registró el límite de QA y no se declaró verificación visual. Se ejecutaron pruebas de modelo/API en clon restaurado y la suite completa; F12 debe reintentar el recorrido de interfaz cuando el navegador esté disponible.

**Prevención.** Distinguir la salud del servidor de la disponibilidad del controlador de navegador; no convertir un HTTP 200 en una afirmación de QA visual.

## 2026-09-28 — F7: flags y URL incompletos en harness QA

**Síntoma.** La página QA mostró desconexión pese a que la API local estaba disponible; después, «Hoy» contó una observación pendiente, pero la cola indicó que la captura no estaba habilitada.

**Causa raíz.** El proceso Vite recibió `NEXT_PUBLIC_LOCAL_DB_URL` en vez del contrato real `NEXT_PUBLIC_AYNI_API_URL`; el backend se inició con la revisión F6 activada pero sin `AYNI_ORDINARY_OBSERVATIONS=1`.

**Solución validada.** Reiniciar solo los procesos QA con URL y flags correctos. La UI cargó los cuatro destinos y «Hoy» abrió la observación pendiente real del clon. No se alteró código de producción para encubrir el error de configuración.

**Prevención.** Los comandos de QA deben declarar ambos flags dependientes y usar el nombre de URL importado por `local-database.ts`; verificar ruta `/health` y la cola antes del recorrido visual.

## 2026-09-28 — F6: criterio histórico sin ID de competencia V4

**Síntoma.** Una captura guiada QA con criterio activo de un taller histórico no podía conservar la atribución elegida porque la fila tenía `competency_v4_id` nulo.

**Causa raíz.** El primer validador de F6 suponía que todos los criterios de actividad ya habían migrado al catálogo V4. Los talleres anteriores conservan un UUID de competencia heredada válido y no deben recibir un mapeo V4 inventado.

**Solución validada.** Admitir el criterio activo perteneciente a la actividad autorizada, guardar su ID y texto en el snapshot y conservar el UUID legacy sin transformarlo. La QA en clon verificó captura, recarga y visualización; el cotejo histórico permaneció intacto.

**Prevención.** Probar criterios V4 y legacy en cada frontera de observación/evaluación y resolver equivalencias únicamente mediante fuente curricular autorizada, no por nombre ni por suposición.

## 2026-09-28 — F5: exportación e importación de tablas raw desalineadas

**Síntoma.** Dos pruebas de traslado fallaron después de añadir las tablas de observación al export local.

**Causa raíz.** El importador de Supabase mantenía una lista cerrada y aún no incluía `ordinary_observations` ni `ordinary_observation_revisions`.

**Solución validada.** Incorporar ambas tablas en orden de dependencia, sin tocar datos ni repetir capturas QA. Las 25 pruebas focales, la suite completa (580/580), typecheck, lint y build pasaron.

**Prevención.** Cada tabla nueva de export debe actualizar el orden de importación y pasar la prueba de paridad antes del checkpoint.

## 2026-09-28 — F5: identidad implícita y dictado reescrito en captura previa

**Síntoma.** La ventana legacy de evidencia iniciaba con el tercer niño preseleccionado y «Guardar y siguiente» seleccionaba automáticamente otro. El propósito anterior de dictado de observación devolvía una versión reescrita por IA. Esto permitía asociar por descuido un texto a un niño no elegido expresamente y no conservaba la transcripción literal para el nuevo contrato raw.

**Causa raíz.** La captura de evidencia antigua combinaba hecho observado, criterio e interacción rápida; el alumno quedaba como estado implícito de la vista. El servicio de audio compartía una etapa de edición con la nota de observación.

**Solución validada.** F5 crea captura ordinaria separada con alumno obligatorio sin default, backend que valida `student_id` del aula y jamás extrae nombres del texto. `raw_observation` devuelve transcripción literal sin segunda llamada de reescritura; la ruta legacy también inicia sin alumno y exige reelección al continuar. Pruebas SQL/servicio y QA UI confirman el caso con nombre contradictorio, original intacto y revisión append-only.

**Prevención.** Las futuras atribuciones Jev se referirán al ID de observación y a su `student_id` persistido; jamás reasignarán alumno por texto. Mantener test de contradicción nombre/texto y de micrófono con identidad seleccionada antes de habilitar un flujo nuevo.

## 2026-09-28 — F4: cotejo de clon con proyecciones reconstruibles

**Síntoma.** La comparación inicial de todas las tablas contra el snapshot F3 falló tras confirmar una actividad QA; `ai_usage_events` añadió una fila fixture con costo cero, `competency_display_labels.updated_at` se refrescó al abrir la API y el mapa derivado de período agregó dos entradas/una versión y refrescó cinco filas anteriores.

**Causa raíz.** La verificación trataba eventos de uso nuevos y proyecciones reconstruibles como fuentes históricas inmutables, mezclando semánticas de tablas. No hubo pérdida de las 26 actividades, evidencias, valoraciones ni cierres históricos.

**Solución validada.** Cotejar las 69 tablas fuente/historia por contenido, los registros anteriores de actividad/criterio/agenda/ejecución y el nuevo ActivityV3 por IDs. Auditar por separado las dos proyecciones y el uso fixture, registrando altas/refrescos sin ocultarlos. Conservar el `updated_at` real del catálogo en DB y comparar solo etiqueta/área/ID para esta tabla de presentación. Reporte `.local/test-results/f4/history.json`.

**Prevención.** Separar fuentes confirmadas, eventos aditivos y proyecciones recalculables en cada auditoría de fase; nunca inferir corrupción de datos pedagógicos por un contador de proyección distinto sin conciliar IDs.

## 2026-09-28 — F3: historial, recarga y harness QA

**Síntoma/causa.** Regeneración sucesora podía sustituir filas históricas sin overrides explícitos; V3 debía conservar string `starting_point` para Word/copia. Volver a Mi año podía usar versiones obsoletas en memoria. `vinext dev` no abrió puerto; CLI ignora `--config`; preview rechazado por entorno. Primera restauración chocó con semillas demo de migraciones.

**Solución validada.** Retener fila completa pasada/con registro y proyectar refs V3 legacy sin reescribirla. Conservar string/snapshot. Recargar listado y limpiar avisos al elegir propuesta. Harness QA con Vite/config independiente sin emulador Cloudflare, misma app/plugin local, API autorizada sobre clon. En clon nuevo vaciar únicamente semillas antes de importar; 71/71 tablas cotejadas iguales. Clon fallido preservado y original intacto. UI confirma V1 futura y V2 legacy con cinco fixtures/cero llamadas pagadas; datos históricos cotejados intactos.

**Prevención.** Comparar historia al añadir derivados y nunca normalizar confirmados. Validadores separados: primer lint bajo carga conjunta con build superó 120 s, detenido Ctrl+C y pasó aislado. Suite 541/541 en 131,5 s mantuvo progreso. No repetir resultados A/B por incidentes del harness ni confundirlos con corrupción de F2.

## 2026-09-28 Informes familiares P4 rechazados y recuperados (H49)

**Síntoma.** Los primeros intentos reales de informe familiar de Alma y Omar devolvieron `family_report_schema_mismatch`; no se guardó una salida inválida. Cada segundo intento por UI produjo un informe revisado, confirmado y descargado. Las cuatro llamadas facturables permanecen en el ledger; no equiparar dos documentos finales con dos llamadas.

**Causa conocida y límite.** La salida no superó el contrato local estricto `validateFamilyReport`; la subregla exacta no se conoce porque no se conservó texto rechazado con datos de menores. No atribuirlo a un campo, modelo o proveedor específico sin telemetría segura. No se modificó el validador ni hubo fix de producto en este corte.

**Solución operativa validada y prevención.** Reintento explícito por docente bajo el **mismo contrato**: dos informes completos, sin marcadores pendientes en Word XML. Para reparar la recurrencia, instrumentar solo subcódigo no sensible/intento/uso, construir regresiones anonimizadas, mantener rechazo seguro y medir éxito/costo por informe final. La validación de contenido evitó persistir los dos intentos fallidos, pero no evitó su costo. Ver auditoría 10, 15 y 16.

## 2026-09-28 Integridad del análisis y conclusión del período (H35/H36/H37/H39)

**Causas y soluciones.** H35 (`551409f`) compara el contexto autorizado completo al validar el marco, no una proyección sin su fingerprint. H36 (`ebaec81`) conserva SQL DATE civil en la copia para IA y en la huella, evitando que medianoche UTC se trunque como el día anterior local. H37 (`e949f54`) compara los campos del snapshot, no el orden de claves JSONB. H39 (`c6921bb`) distingue la preposición española A de una calificación explícita, manteniendo prohibidos niveles, notas y comparaciones.

**Validación.** Regresiones fallaron antes y pasaron después: respectivamente 15, 36, 26 y 42 relacionadas, con typecheck/lint/build PASS. UI: marco vigente admitido, análisis con fechas correctas, B docente de Bruno y su misma conclusión confirmados; conclusión de Alma antes rechazada y después confirmada. No se desactivaron fingerprints, ownership ni conflictos reales. Los intentos facturados rechazados se mantienen en el ledger; timeouts sin usage no se estiman como cero.

**Prevención.** Fixtures con contexto no nulo, SQL DATE real y pending serializado en JSONB. Probar expresiones españolas positivas y menciones de calificación negativas. Los juicios docentes simulados no son adjudicación experta ni prueba de precisión del modelo. No penalizar apoyos de acceso como si fueran falta de logro.

## 2026-09-28 Fidelidad diagnóstica y plazo del marco (H31/H32)

**Síntomas y causas.** Word diagnóstico usaba el día UTC, contaba asociaciones como notas, incluía áreas no aplicables en pendientes y omitía el registro más reciente. El Assessment Master multicompetencia heredaba timeout de 30 s.

**Soluciones validadas.** H31 (`223acbe`) convierte solo instantes a Lima, respeta fechas civiles y banderas, cuenta notas únicas y muestra primer/último registro con N de M. H32 (`e8cdbde`) pasa 180 s solo al maestro de evaluación. Regresiones fallaron antes; 26/26 relacionadas + typecheck/lint/build PASS. Descarga real diagnóstica después: 27 notas únicas, sin áreas desactivadas, sin placeholders; XML verificado, render visual NO PROBADO por ausencia de LibreOffice. El reintento UI produjo un marco de seis competencias, sin niveles ni actuaciones inventadas, luego guardado y confirmado por docente. El intento fallido sin usage conserva costo desconocido.

**Prevención.** Distinguir instante y fecha civil; contar entidades por ID y asociaciones por competencia. Asignar timeout según duración del workflow, no heredar el de clasificación en maestros largos. No alterar snapshots históricos para hacerlos coincidir con decisiones posteriores.

## 2026-09-27 Confirmar par diario bloqueado por orden JSONB (H26)

**Síntoma.** Actividad+taller guardados mantenían «Guarda los cambios» y confirmación deshabilitada.

**Causa raíz.** La comparación del taller usaba stringify bruto, no igualdad de contenido frente al objeto recargado.

**Solución validada.** Reusar la igualdad semántica de H22; listas siguen ordenadas y editar/retirar taller exige guardar. JSONB real y contrato de integración + 11 relacionadas, typecheck, lint y build PASS. UI recargó el borrador guardado y confirmó el par diario sin regeneración.

**Prevención.** No comparar objetos persistidos JSONB por orden de inserción de claves. Las pruebas de cambios deben cubrir también recursos vinculados.

## 2026-09-27 Talleres actualizaban una columna inexistente (H25)

**Síntoma.** El maestro se generaba pero guardar las decisiones devolvía error genérico.

**Causa raíz.** La tabla `learning_experiences` no tiene `updated_at`; tres UPDATE de talleres la asumían existente. El flujo de proyectos usa la revisión del trigger, sin esa columna.

**Solución validada.** Retirar las tres asignaciones a `updated_at` en guardar, confirmar y archivar maestros. Una regresión usa todas las migraciones y los handlers reales: guarda, rechaza revisión obsoleta, confirma y archiva al confirmar una nueva versión. 13 relacionadas, typecheck, lint y build PASS. UI guardó y confirmó el mismo maestro sin otra generación.

**Prevención.** Probar handlers de persistencia con el esquema migrado, no solo propuestas simuladas; conservar revisión optimista y transacción.

## 2026-09-27 DATE de PostgreSQL rechazado en actividades (H24)

**Síntoma.** La propuesta del 30/03, dentro del proyecto 30/03–10/04, no se podía guardar.

**Causa raíz.** Convertir DATE con `String(date).slice(0,10)` daba día de semana en lugar de fecha ISO; se comparaban rangos incompatibles. Regresión SQL real reprodujo el rechazo.

**Solución validada.** Reusar `annualCalendarDay` en límites, edición/confirmación de actividad y calendario del proyecto. 16 pruebas relacionadas, typecheck, lint y build PASS. Tras reiniciar solo API QA, el mismo borrador se guardó y confirmó por UI sin regenerarlo.

**Prevención.** Normalizar DATE con el helper existente antes de comparar o validar; probar objetos Date reales además de strings. No convertir UTC DATE a día local ni debilitar límites del calendario.

## 2026-09-27 Confirmar días del proyecto fallaba por inferencia SQL (H23)

**Síntoma.** Calendario mostraba ocho días válidos, pero confirmar devolvía error genérico.

**Causa raíz.** CASE con parámetro y NULL infería texto, incompatible con `confirmed_by` UUID. Regresión reprodujo SQLSTATE 42804 antes del fix.

**Solución validada.** Cast explícito `$2::uuid` en la consulta existente. Test con SQL real valida confirmación, identidad, revisión y vuelta a borrador. 14 relacionadas, typecheck, lint y build PASS; UI confirmó ocho días después de reiniciar solo QA.

**Prevención.** Probar persistencia de ramas CASE con el tipo real de columna; no exponer detalles SQL en UI. No requiere migración ni cambio de permisos.

## 2026-09-27 El paquete de traslado omitía los costos de IA (H19)

**Síntoma.** La paridad export/import fallaba porque `ai_usage_events` se exportaba pero no estaba en el orden de importación; un traslado perdería el ledger por docente.

**Causa raíz.** Se añadió la tabla al exportador sin añadirla al importador. El remapeo de `teacher_id` ya existía.

**Solución validada.** Añadir la tabla después de perfiles. Regresión CLI offline con evento ficticio verifica paquete SQL, conteo, identidad remapeada, tokens, importe y procedencia de costo. 16/16 combinadas, suite integrada 466/466, typecheck, lint y build PASS. No se aplicó SQL a Supabase ni se usaron cuentas existentes.

**Prevención.** Probar paridad de tablas y contenido de una transferencia real, no solo nombres.

## 2026-09-27 La regresión de reajuste dependía de la medianoche UTC (H18)

**Síntoma.** Un test de protección del pasado fallaba de noche en Lima, aunque el servicio aplicaba correctamente el día local.

**Causa raíz.** El fixture creaba fechas relativas en UTC; antes de las 05:00 UTC «ayer» podía coincidir con hoy en Lima. También derivaba el año desde UTC.

**Solución validada.** Fixtures relativos al día civil America/Lima y reloj controlado a ambos lados de medianoche y cambio de año. Los cinco tests de reajuste pasan; suite integrada 466/466, typecheck, lint y build PASS. No cambió la protección productiva de fechas pasadas.

**Prevención.** Controlar reloj y zona en tests del dominio calendario. No debilitar una regla de integridad para adaptar un fixture.

## 2026-09-27 JSONB hacía parecer editadas las decisiones del proyecto (H22)

**Síntoma.** Tras generar preguntas y criterios, la UI mostraba éxito pero ocultaba el paso de preguntas y bloqueaba el mapa.

**Causa raíz.** `JSON.stringify` dependía del orden de claves, que JSONB no conserva. La comparación semánticamente falsa afectaba decisiones, dependencias y mapa.

**Solución validada.** Comparación canónica de objetos con listas ordenadas. Regresión con round-trip PGlite y cambios pedagógicos reales; 12 pruebas relacionadas, typecheck, lint y build PASS. El mismo borrador QA mostró cuatro preguntas sin regeneración y permitió pasar al recorrido.

**Prevención.** Comparar valores JSON, no orden de inserción de claves. Conservar la detección de cambios de contenido y secuencia. Sin migración ni alteración del aula original.

## 2026-09-27 El schema del documento anual permitía cardinalidades rechazadas después (H21)

**Síntoma.** Después de confirmar correctamente el preplan QA, una llamada real para el Word terminó con desarrollo incompleto, sin perder el plan vigente.

**Causa comprobada.** El esquema formal no incluía el mínimo/máximo de cuatro criterios, límites de listas/textos ni la cantidad exacta de detalles que exige `validateAnnualFormal`. La salida rechazada no se persistió; no se conoce cuál condición falló en aquel intento.

**Solución validada.** Esquema y prompt expresan los mismos límites, con cantidad dinámica de detalles desde el preplan confirmado. 37 pruebas relacionadas, typecheck, lint y build PASS; reintento UI PASS después de `87e0d32`, Word listo en Documentos. Mismo modelo y validador, sin regeneración automática. Fidelidad/render del archivo sigue pendiente.

**Prevención.** Toda restricción de cardinalidad local debe estar en Structured Outputs cuando sea compatible; probar cantidades editadas (1, 10, 12 y 20), no solo el formato inicial. Conservar el costo de llamadas rechazadas y distinguir plan confirmado de documento pendiente.

## 2026-09-27 El calendario persistido invalidaba el propio preplan anual (H08)

**Síntoma.** Un preplan recién generado se recargaba con doce propuestas, pero guardar una edición válida o confirmar intacto devolvía «Revisa los datos de la propuesta 1».

**Causa raíz.** Persistencia añadía cuatro campos derivados no reconocidos por el validador estricto de filas. La revalidación también ejecutaba un UPDATE idéntico que incrementaba la revisión optimista antes de confirmar.

**Solución validada en regresión y UI.** El validador del round-trip admite únicamente los metadatos derivados conocidos, devuelve campos editables y conserva el esquema del modelo estricto. Las fechas/días se recalculan desde el calendario de servidor; el UPDATE se omite cuando JSONB es igual. Las dos regresiones fallaron antes y pasan después sobre PGlite con todas las migraciones, incluyendo persistir/recargar/confirmar intacto y editar/guardar/recargar/confirmar. 63 tests relacionados, typecheck, lint y build PASS. El mismo preplan QA se confirmó intacto desde la UI después de `60210c3`: «Mi año vigente · versión 1».

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

## 2026-09-27 H28: evidencia del taller confirmado rechazada

**Síntoma.** Registrar una nota de un taller confirmado devuelve que su criterio no coincide con la competencia; los IDs sí coinciden.

**Causa raíz.** El guard exigía `competency_status`, presente en activity-v1 pero ausente por contrato en workshop-v1. La confirmación atómica ya había confirmado el taller y su propio criterio.

**Solución validada.** El guard reconoce la confirmación del taller exclusivamente desde columnas del join autorizado (tipo, fecha de confirmación, actividad vinculada, índice e igualdad de competencia). Rechaza borradores, competencias distintas y estados explícitamente no confirmados. 15/15 pruebas relacionadas, typecheck, lint y build PASS. Sin cambio de esquema o notas históricas; la repetición UI queda registrada en el informe E2E.

**Prevención.** Probar el recorrido persistir → confirmar par diario → admitir criterio para evidencia, no solo que existan los dos bloques en Hoy.

## 2026-09-27 H29: maestro de talleres con plazo demasiado breve

**Síntoma.** Preparar diez sugerencias de taller termina en timeout sin guardar una propuesta.

**Causa raíz.** El workflow largo de Sol heredaba el plazo predeterminado de 30 segundos del proveedor, mientras las demás planificaciones usan 120/180 segundos.

**Solución validada.** Solo `generateWorkshopMaster` recibe 180 segundos; modelos, reintentos, validaciones y talleres diarios se conservan. 20/20 pruebas relacionadas, typecheck, lint y build PASS. El intento sin usage se registra como costo desconocido, no cero.

**Prevención.** Comprobar las opciones de proveedor de cada workflow largo, además del modelo y de la forma de salida.
## 2026-09-28 — Criterio de otra competencia al confirmar actividad con dos competencias

Síntoma: guardar evidencia falla porque actividad principal y criterio heredado tienen IDs diferentes. Causa: mapa mezcla primer elemento de `competency_ids` con `criterion_competency_id`. Solución: principal canónica del mapa deriva del criterio; herencia respeta el ID visible confirmado de la actividad. Recuperación docente explícita confirma un criterio alineado y archiva el incompatible solo si no tiene evidencias. Se preservan IDs, notas e históricos. Validación: 27/27 relacionadas, typecheck/lint/build; UI pendiente en H30 del registro de correcciones. Prevención: regresiones de mapa con dos IDs y persistencia SQL, no solo casos monocompetencia.

## 2026-09-28 — Corrección docente de valoración confirmada inaccesible

Síntoma: el campo de análisis confirmado permitía escribir pero no ofrecía guardar una revisión. Causa: la UI ocultaba las acciones ante cualquier nivel previo; el modelo priorizaba la valoración activa sobre un nuevo borrador. Solución: iniciar revisión por el endpoint existente, campo confirmado solo lectura, borrador prioritario, huella/progreso sensibles a revisión y conclusiones bloqueadas hasta reconfirmar. Historial anterior conservado/archivado, no reescrito. Validación: dos regresiones antes fallidas; 29/29 relacionadas y typecheck/lint/build PASS. Prevención: probar corregir interpretación sin cambiar evidencias, no solo evidencias nuevas. UI en H41 del registro E2E.

## 2026-09-28 — Feedback para planificar omite niveles y competencias valoradas

Síntoma: Evaluar contiene necesidad mayoritaria B y fortalezas A, pero Planificar solo muestra ausencias y cinco competencias iniciales. Causa: agregación por coincidencia literal de frases de IA y truncamiento posicional; decisiones manuales no aportaban arrays. Solución: distribución docente determinista, pendientes y registros reales del período, competencias valoradas primero y sin recorte arbitrario; una necesidad individual no se generaliza. 26/26 relacionadas y typecheck/lint/build PASS. Prevención: comprobar integración de decisiones manuales y fortalezas fuera de primeros IDs. UI en H40 E2E.

## 2026-09-28 — Nombres de compañeros en copia de evaluación para proveedor

Síntoma: conclusión e informe familiar repiten un nombre de compañero citado en los registros. Causa: sanitización conocía solo al niño evaluado. Solución: tras autorización, obtener nombres del mismo aula y neutralizarlos en copia para assessment/conclusión/familia, incluidas variantes sin tildes. No se reescriben fuentes ni historial. Regresiones con SQL y nombres de pares: 56/56 relacionadas, 3/3 focales finales, typecheck/lint/build PASS. Prevención: incluir compañeros en pruebas de privacidad; no afirmar anonimización universal de nombres desconocidos. UI en H43 E2E.

## 2026-09-28 — El nuevo flujo de proyecto/unidad ignoraba las evaluaciones elegidas

Síntoma: resumen P1 visible y opt-in marcado, pero preview P2 solo describe el diagnóstico inicial. Causa: el componente nuevo y sus tres rutas no transportaban/cargaban el período, a diferencia del flujo legado. Solución localizada: opt-in explícito, autorización de período en servidor, snapshot agregado conservado entre preview/decisiones/master e instrucciones que distinguen datos actuales del diagnóstico. Un preview sin decisiones puede actualizarse por UI y revisión optimista; un mapa/confirmado no se borra. Validación inicial: 4 regresiones rojas, 19/19 relacionadas verdes, typecheck/build PASS; logs y repetición UI en H45. Prevención: probar el input del proveedor desde el flujo actualmente visible, no solo el resumen agregado o el generador legado.

## 2026-09-28 — Captura de evidencia con pie fuera de pantalla

Síntoma: criterio extenso deja los botones fuera del viewport y el cuerpo no se desplaza. Causa: diálogo sin altura máxima ni scroll interno. Solución: flex, máximo 90dvh, cuerpo desplazable y cabecera/pie no contraíbles. 22/22 relacionadas, typecheck/lint/build PASS; guardado real por clic en QA. Prevención: probar criterios completos, no solo una línea. H46, commit 5d98048.

## 2026-09-28 — Evidencia capturada al alumno equivocado sin recuperación por UI

Síntoma: cuatro notas QA de la captura automatizada quedaron asociadas a la selección anterior. Causa de esa selección no reproducida; limitación confirmada: ninguna acción de corregir alumno. Solución mínima: reasociación docente de notas sin media/sin evaluación afectada, misma aula y propiedad verificadas, motivo e historial, revisión optimista/bloqueo de período y refresco de ambos contextos. 25/25 relacionadas, typecheck repetido/lint/build PASS; cuatro correcciones UI y conciliación 10/10. Prevención: conciliar alumno-texto-fecha después de captura, no solo contar filas; no corregir QA con SQL. H47, commit 919e381.

## 2026-09-28 — H34 exigía letras por competencias solo previstas

**Síntoma.** P1–P4 mostraban como obligatorios pares alumno–competencia nacidos de «Mi año» o de criterios aún no trabajados. El cierre pedía letras/conclusiones incluso sin evidencia suficiente.

**Causa raíz.** El `scope` mezclaba planificación con ejecución y el manifiesto aceptaba únicamente filas calificadas. La interfaz de reajuste heredaba esa misma exigencia.

**Solución validada.** Alcance basado en trabajo real, estados pendientes explícitos sin letra, cierre intermedio con `pending_entries`, cierre anual con comprobación de valoraciones vigentes de todos los pares aplicables, salidas separadas y seguimiento posterior. Un borrador docente también preserva el alcance y no puede ocultarse retirando la competencia. 38/38 pruebas focales, typecheck, lint y build PASS; P1/P2 cerraron por UI QA, P3 por API QA, P4 rechazó 163 pares nunca valorados. La interfaz no permite pulsar P3/P4 antes de su fecha de fin real; no se modificó esa guarda. Ver `docs/qa/end-to-end-audit-2026/21_H34_FASE_1.md`.

**Prevención.** Probar previstas sin trabajo, pendientes con/sin evidencia, las cuatro letras, huella tras evidencia posterior, los cuatro períodos, Excel y seguimiento; mantener la decisión de nivel exclusivamente docente.

## 2026-09-28 — Reinicio de PGlite QA dejó checkpoint inválido

**Síntoma.** Al reiniciar la API QA para el E2E H34, PGlite no abrió el directorio QA anterior y reportó que no encontraba un checkpoint válido.

**Causa raíz observada.** El proceso QA se detuvo mientras la base embebida aún necesitaba un cierre limpio; el directorio y una copia hecha tras detenerlo conservaron el mismo estado inválido. No se atribuye corrupción a las tablas de producto ni a la base original de la usuaria.

**Recuperación validada.** Se preservaron ambos directorios, se creó un directorio QA nuevo desde el último export JSON de la auditoría y se conciliaron 138 evidencias, 68 versiones de valoración, 32 conclusiones y 24 actividades QA sin cambios de contenido. Dos actividades semilla regeneraron timestamps de instalación. El export no incluía todas las tablas, por lo que no se presenta como recuperación byte a byte ni como sustituto del directorio original. La API QA activa usa el directorio restaurado; 5173/8788 de la usuaria no se tocaron.

**Prevención.** Para futuras pruebas con PGlite, detener mediante cierre limpio de la propia API y comprobar backup recuperable antes de reiniciar. No forzar el fin del proceso ni abrir el mismo directorio desde dos instancias.

## 2026-09-28 — Fixture de Documentos incompleto al añadir procedencia F1

**Síntoma.** La suite completa falló al abrir un proyecto de prueba con `column ps.proposal_id does not exist`.

**Causa raíz.** El fixture reducido de `document-library-service.test.mjs` creaba `project_slots` sin una columna que sí existe en las migraciones local y Supabase vigentes. La consulta nueva de procedencia hizo visible esa divergencia.

**Solución validada.** Se agregó `proposal_id` nullable al fixture; la prueba focal de Documentos y la suite completa volvieron a pasar (539/539 con concurrencia 4). No hubo migración ni cambio de datos.

**Prevención.** Cuando un servicio incorpora una columna de una tabla ya migrada, actualizar y ejecutar también los fixtures mínimos que simulan esa tabla; comprobar la paridad de esquema antes de atribuir el fallo al servicio.

## 2026-09-28 — Espera de bake-off F2 confundida con validación técnica

**Síntoma.** La ejecución prolongada parecía corresponder a tests/typecheck/lint bloqueados.

**Diagnóstico.** La inspección de procesos mostró únicamente `run-bakeoff.mjs` activo (PID 73516); ninguno de los tres validadores estaba ejecutándose. No se detectó cuelgue técnico ni corrupción de resultados. No se detuvo el generador ni se repitieron parejas A/B guardadas.

**Validación.** Se ejecutaron los comandos por separado: `node --test evals/project-master/*.test.mjs` (11/11, 1,3 s), `npx tsc --noEmit` (8,9 s), `npm run lint` (29,0 s), y build (15,6 s), todos con exit code 0. Las sesiones se observaron en ventanas de hasta 30 s; el límite operativo para detener exclusivamente un validador sin progreso es 120 s. Ninguno alcanzó ese límite. El build conserva advertencias no bloqueantes sobre tamaño de chunks y clasificación estática de rutas.

**Regresión adicional.** La suite completa descubierta en `src`, `scripts` y `evals` pasó 524/524 con concurrencia 4 en 122,5 s; mantuvo progreso durante la ejecución. No se realizaron nuevas llamadas A/B desde los validadores.

**Incidente externo posterior.** El generador recibió 153 fallos etiquetados `rate_limited`; una comprobación mínima del proveedor confirmó `credit_balance_exhausted` / `insufficient_quota` (429). El usuario confirmó saldo negativo y ordenó continuar sin pruebas API. Se canceló el lanzador de revisión ciega, se verificó un snapshot antes de detener el generador y se comprobó el checkpoint final: 216 registros, 63 válidos. Los 39 registros de control conservaron su SHA-256. A queda como fallback autorizado, no como ganador experimental; comparación y revisión ciega pendientes externas. El runner actual agrupa cuota agotada y rate limit temporal bajo el mismo código: no reintentar automáticamente una corrida con este síntoma ni eliminar sus fallos. No hubo cambio de manifiesto ni regeneración de éxitos.

**Prevención.** Separar los validadores de las llamadas facturables, comunicar su finalización y revisar los checkpoints de generación. La evaluación ciega debe comenzar solo después de finalizar el generador: ambos escriben el mismo archivo y no deben ejecutarse simultáneamente.

## 2026-09-28 — Avance diagnóstico desactualizado tras guardar desde el mapa

**Síntoma.** En F12 QA se guardó por UI una observación para cada uno de seis niños. El mapa mostraba los seis registros, pero el paso «Observar» seguía en 1/6 hasta recargar la página; después mostró 6/6.

**Causa raíz.** El mapa recargaba su propio `DiagnosticReviewWorkspace` tras guardar, pero no actualizaba el `DiagnosticWorkspace` del componente padre, del que depende el contador de pasos.

**Corrección.** El guardado exitoso del mapa avisa al padre, que vuelve a cargar el diagnóstico, igual que ya hacía el flujo de observación espontánea. No cambia persistencia ni valoración. Typecheck, lint, build y suite completa 603/603 pasaron; falta repetir la actualización visual en un clon con un niño aún sin observación.

**Prevención.** Los componentes que modifican registros usados por un indicador de progreso compartido deben invalidar también la lectura del indicador; probar el contador inmediatamente después de guardar, sin depender de recarga manual.
## 2026-09-29 — Contrato HTTP anterior asumía sugerencia automática con flag apagado

**Síntoma.** `scripts/auth-http.test.mjs` esperaba `privacy_blocked` al pedir una sugerencia en una nota familiar mientras el flag V2.4 estaba apagado.

**Causa raíz.** La prueba codificaba el flujo anterior, que podía llamar al clasificador aun sin el nuevo flag. El contrato del piloto exige guardar y clasificar manualmente sin Jev cuando el flag está apagado.

**Corrección.** La ruta devuelve estado `unavailable` para ese intento y la lista muestra `classifier_enabled=false` y `classifier_status=disabled`; se mantiene la comprobación de acceso entre docentes. La prueba se actualizó para verificar ese contrato y el endpoint de métricas aislado por aula.

**Prevención.** Probar explícitamente los modos encendido y apagado de flags de IA en el límite HTTP, además de los servicios.

## 2026-09-29 — El Word diagnóstico confundía período planificado con fechas de registros

**Síntoma.** El encabezado del diagnóstico mostraba «29/09/2026 – 29/09/2026» cuando todas las observaciones de QA se cargaron el mismo día, aunque la etapa inicial del año tenía dos semanas.

**Causa raíz.** La exportación usaba la primera y la última fecha de observación como período formal. La duración elegida en `initial_stages` y el primer bloque lectivo de `calendar_blocks` no se consultaban.

**Corrección.** El contexto autorizado de exportación calcula el período formal desde el calendario lectivo del año y la duración inicial elegida. Las fechas efectivas de observación siguen apareciendo como procedencia de registros, separadas del período formal. El cálculo reutiliza las reglas de semanas lectivas del plan anual.

**Prevención.** Probar por separado la ventana planificada y la ventana de evidencias, especialmente cuando todos los registros comparten una fecha o fueron capturados después del período inicial.

## 2026-09-29 — Exportación QA del diagnóstico y códigos de unidades

**Síntomas.** El Word diagnóstico mostraba párrafos casi literales de entrevistas en «Intereses identificados» y una prioridad genérica en lugar de las tres confirmadas. El cronograma anual rotulaba las unidades 07 y 11 como P07 y P11.

**Causas.** La exportación diagnóstica leía texto libre de entrevistas y el resumen general, pero no las etiquetas de interés ni la revisión de prioridades confirmada. La agenda flexible asignaba prefijo P a todas las propuestas antes de construir el Word.

**Corrección.** La proyección autorizada del diagnóstico toma las etiquetas de intereses de las últimas entrevistas familiares confirmadas y las prioridades de la revisión confirmada asociada al resumen; el Word indica que los intereses provienen de las familias. La agenda y el Word anual usan el tipo real de cada propuesta para el código P/U. Los dos documentos del aula QA se regeneraron en `.local/qa-documents`, sin modificar los originales ni los datos pedagógicos.

**Validación.** En el Word diagnóstico regenerado figuran las nueve etiquetas de interés y las tres prioridades confirmadas. El plan anual regenerado contiene U07 y U11 tres veces cada uno, y ninguna aparición de P07 o P11. Pasaron las pruebas focales de ambos exportadores.

**Prevención.** Mantener el mismo dato confirmado como fuente del diagnóstico, la UI y Mi año; probar códigos de proyectos y unidades en el cronograma además de las fichas.

## 2026-09-29 — Controles de Proyecto o Unidad y confirmación ambigua

**Síntomas.** La selección mostraba las doce propuestas, una acción de evaluación anterior aunque no había valoraciones, códigos de competencias en contexto y preguntas que solo podían quitarse al final. El recorrido y los criterios aparecían como campos extensos. Un fallo de comunicación al confirmar se mostraba como `Failed to fetch` sin aclarar si se había guardado.

**Causas.** La recomendación se basaba solo en fecha; el checkbox no consideraba el recuento; el contexto y la sugerencia compartían presentación; la selección de preguntas no filtraba elementos intermedios. El cliente exponía el error técnico de red y no consultaba el estado tras una respuesta perdida. La operación de confirmación ya usa una transacción en el servicio de versiones.

**Corrección.** La UI recomienda una propuesta por orden y estado del plan; diferencia datos y sugerencias, pide una revisión única al alterar competencias, filtra preguntas desmarcadas antes del Master, muestra recorrido secuencial y criterios compactos. El calendario muestra meses y registra explícitamente las jornadas excepcionales del aula en una capa distinta de la oficial. Una confirmación repetida del mismo proyecto devuelve el estado activo; si falla la respuesta, el cliente consulta el estado antes de sugerir reintento.

**Límite de reproducción.** La copia local del aula QA contiene un único proyecto en etapa `dependents`, todavía sin mapa confirmable. No se pudo reproducir la petición concreta que mostró `Failed to fetch` ni atribuirle una causa de red precisa sin modificar los datos. Las pruebas de servicio cubren atomicidad de versiones, autorización de calendario, filtro de preguntas y excepciones oficiales; queda pendiente repetir la confirmación en UI cuando exista un mapa listo.

**Prevención.** Mostrar el estado verificado después de confirmaciones con respuesta incierta y probar doble clic/reintento sobre un proyecto listo para confirmar.

## 2026-09-29 — Descarga del proyecto y desbordes Word

**Síntomas.** «Guardar Word» del proyecto 1 daba un error genérico cuando la formalización todavía no estaba lista. El plan anual tenía «CONTINUACIÓN» y hojas casi vacías tras propuestas o firmas; el resumen de portada del proyecto podía desbordarse.

**Causas.** La biblioteca ofrecía descargar antes de `formal_ready`. Las plantillas anuales tenían dos tablas de cronograma, saltos manuales y un párrafo final vacío. Un resumen de portada demasiado largo empujaba contenido a una página nueva.

**Solución validada.** API devuelve un 409 explicativo y la biblioteca permite preparar el Word. Se fusionó el cronograma y se compactó la portada; se corrigieron saltos y espaciados sin tocar el plan confirmado. El proyecto 1 se formalizó en la copia QA y descargó 446 kB. Word abrió los cuatro documentos reales; plan y proyecto cerraron en 18 y 8 páginas, sin hojas aisladas de desborde.

**Prevención.** Probar la transición borrador→Word listo y renderizar muestras reales para detectar cortes que una prueba de XML no muestra.

## 2026-10-01 — Proyecto bloqueado al preparar preguntas por revisión `bigint`

**Síntoma.** «Continuar a preguntas» en la unidad QA devolvió `version_conflict` dos veces, incluso después de volver a abrir el borrador. La pantalla solo mostraba el código técnico.

**Causa raíz.** PostgreSQL entrega `revision bigint` como cadena decimal. El cliente reenviaba esa cadena en `expectedRevision`, pero la validación del servidor exigía un número JavaScript. La petición se rechazaba antes de generar el contenido.

**Corrección.** `expectedRevision` admite cadenas decimales positivas provenientes del API y las convierte únicamente si caben en un entero seguro. Se siguen rechazando valores ambiguos, fraccionarios o inseguros. La pantalla del proyecto muestra el mensaje explicativo del servidor para conflictos reales.

**Validación.** Prueba de versiones con cadenas y entradas inválidas: 5/5. Pasaron `tsc --noEmit`, lint, build Vinext y build Next.js. El despliegue `dpl_7ZwGav2GxxUVcDCnWdAwSfCHd7rA` respondió en `/health` y `/api/auth/config`; en la sesión docente, la unidad U02 avanzó de competencias a tres preguntas, recorrido y criterios sin conflicto.

**Prevención.** Probar un ciclo real PostgreSQL `bigint` → JSON → cliente → mutación; no asumir que el tipo estático de TypeScript transforma el valor recibido.

## 2026-10-01 — Perfil del alumno sin apellido

**Síntoma.** La lista del aula distinguía a Prueba Uno, Dos y Tres, pero el encabezado, resumen y entrevista del perfil de Uno decían solo «Prueba».

**Causa raíz.** La respuesta de `/api/students/:id` devolvía el nombre corto del contexto pedagógico como `student.name` y omitía el apellido aunque `last_name` estaba disponible.

**Corrección.** La proyección del perfil concatena el nombre preferido o nombre y el apellido para la identidad visible, sin cambiar el contexto pedagógico ni el registro fuente.

**Validación.** Pasaron `node --check`, `tsc --noEmit`, lint, build Vinext y build Next.js. El candidato `dpl_ECovzoWmUdx3ezPEgbLi83uHELia` pasó smoke y se promovió; el perfil de «Prueba Uno» mostró el nombre completo en encabezado y resumen.

**Prevención.** Probar estudiantes con el mismo nombre de pila al entrar a sus perfiles, entrevistas y evidencias.

## 2026-10-01 — Evaluación quedaba cargando al cambiar de bimestre

**Síntoma.** Al pasar del tercer al primer bimestre, la consulta general respondió 409 y la pantalla quedó en «Cargando registros…». Una consulta de detalle del período anterior también recibió 422.

**Causa.** El mapa de evaluación se sincronizaba desde varias consultas simultáneas. La lectura de la última versión ocurría fuera de la transacción, de modo que dos solicitudes podían intentar insertar el mismo número de versión. La interfaz no distinguía un fallo de carga del estado de carga y pedía el detalle con la selección anterior antes de validar el nuevo alcance.

**Corrección.** La lectura de versión y la escritura del mapa comparten un bloqueo transaccional por aula y período. La pantalla muestra el error con «Reintentar» y espera a que niño y competencia pertenezcan al alcance cargado antes de pedir el detalle.

**Validación.** La prueba de tres sincronizaciones concurrentes conserva una sola versión del mapa. Pasaron las 11 pruebas del servicio, typecheck, lint y builds Vinext y Next.js. En Vercel, el cambio de B3 a B1 cargó registros y detalle sin quedarse en «Cargando registros…».

**Prevención.** Probar el cambio de período cuando varias tarjetas solicitan el mismo mapa y conservar un estado de error recuperable en toda carga asíncrona.

## 2026-10-01 — Actividad confirmada de un día anterior sin acceso al registro de evidencia

**Síntoma.** Una actividad confirmada del 13/04 remitía a «Hoy» para observar. El 01/10, «Hoy» no mostraba aquella actividad y no había forma visible de completar su evidencia desde la ficha.

**Causa.** La acción de observación estaba conectada solo con los bloques de la jornada actual, aunque el servidor ya autoriza evidencias de actividades activas y las fecha según la actividad.

**Corrección.** La ficha del criterio confirmado abre el mismo formulario de evidencia con su actividad y criterio, e informa la fecha a la que se vincula el registro. No se cambió la autorización del servidor ni se fabricó contenido observado.

**Validación.** Typecheck, lint y builds pasaron. En la web de QA se abrió el formulario desde la actividad confirmada de 13/04, se guardó una observación ficticia para «Prueba Uno» y apareció como evidencia del B1.

**Prevención.** Probar el registro tardío desde una actividad confirmada cuando ya no es el día actual.

## 2026-10-01 — Evidencia con tres alumnos indistinguibles

**Síntoma.** El formulario de evidencia mostraba tres opciones «Prueba» en el aula QA, aunque los apellidos Uno, Dos y Tres existían en los expedientes.

**Causa.** El dashboard entregaba `name` como nombre de pila y `full_name` por separado; el formulario consumía `name`.

**Corrección.** La proyección del dashboard usa el nombre completo para `name` y `full_name`, conservando el identificador estable de cada alumno.

**Validación.** La prueba HTTP del dashboard comprueba el nombre completo en ambos campos. En la web de QA el formulario distinguió «Prueba Uno», «Prueba Dos» y «Prueba Tres».

**Prevención.** Probar toda selección de alumnos con dos o más niños que comparten nombre de pila.

## 2026-10-01 — Límite de conexiones de PostgreSQL en Vercel

**Síntoma.** Planificar y algunas consultas de actividades fallaban de forma intermitente. El log del despliegue mostró `EMAXCONNSESSION`: límite de 15 clientes del pool en modo sesión.

**Causa.** Cada instancia serverless mantenía un pool propio de hasta cinco conexiones con 30 segundos de inactividad. Varias instancias simultáneas agotaban el límite de la base.

**Corrección.** En modo serverless el adaptador usa como máximo una conexión por instancia y cierra la conexión inactiva tras un segundo. La configuración local conserva el comportamiento anterior.

**Validación.** Pasaron las cinco pruebas del adaptador y autenticación, typecheck, lint y builds Vinext y Next.js. Tras promover el cambio, Planificar, la actividad, el formulario de evidencia y Evaluar cargaron durante el recorrido de QA. Esto demuestra el recorrido observado, no una garantía de capacidad bajo carga.

**Prevención.** Dimensionar el pool por instancia según el límite agregado de la base y vigilar errores de capacidad de conexiones durante QA concurrente.

## 2026-10-01 — Una valoración insuficiente se convertía en suficiente al confirmar

**Síntoma.** La IA identificó correctamente que la única evidencia estaba marcada como simulación de QA y que no permitía valorar a un niño real. Tras una valoración docente explícitamente ficticia, «Preparar conclusión» devolvió `descriptive_conclusion_schema_mismatch`.

**Causa raíz.** La confirmación sobrescribía siempre `information_status` con `sufficient` y borraba `insufficiency_reason`. Así la conclusión recibía una afirmación de suficiencia que contradecía el análisis guardado. El mensaje de error técnico no ofrecía una forma de redactar una conclusión cautelosa sin otra llamada de IA.

**Corrección.** La valoración confirmada conserva el estado de información y su razón. Se añadió una opción «Escribir yo» para que la docente redacte y confirme una conclusión, validada por el servidor y guardada con procedencia `teacher_manual`. La opción no asigna nivel ni inventa ejemplos de progreso.

**Validación.** La prueba integrada confirma que un análisis insuficiente sigue siendo insuficiente después de confirmar un nivel de QA, que se rechaza una conclusión con «Nivel A» y que se guarda una conclusión docente cautelosa con su procedencia. El conjunto de evaluación integrada pasó 24/24; typecheck, lint y build Vinext pasaron. La comprobación funcional en Vercel se registrará tras desplegar.

**Prevención.** Separar el nivel elegido por la docente de la suficiencia de las evidencias. Probar el recorrido con información insuficiente y permitir redacción docente cuando una propuesta de IA no se puede validar.

## 2026-10-01 — Propuesta de informe familiar rechazada por validación

**Síntoma.** Tras confirmar una conclusión de QA, «Generar propuesta» en Informe a familias devolvió `family_report_schema_mismatch` y dejó a la docente sin borrador.

**Causa raíz.** La salida de IA no cumplió el contrato estricto del informe; el endpoint devolvía el error directamente. La valoración de QA anterior a la corrección de suficiencia también conserva un estado «suficiente» contradictorio con su texto, lo que dificulta una propuesta coherente. No se dispone del texto rechazado de IA, por lo que no se atribuye el incumplimiento a un campo específico.

**Corrección.** Cuando la propuesta de IA falla específicamente por el esquema, el servidor prepara un borrador determinista con las conclusiones confirmadas, sus ejemplos y próximos pasos, sin inventar avances ni hacer otra llamada de IA. Mantiene el estado de información de la fuente, valida el mismo contrato y marca la procedencia. La interfaz explica el fallback antes de guardar.

**Validación.** La prueba funcional simulada confirma que una salida inválida produce una propuesta válida desde fuentes confirmadas, conserva información insuficiente, no inventa ejemplos, permite guardar borrador y no hace una segunda llamada. También rechaza una conclusión fuente que contiene un nivel prohibido. Pasaron 18 pruebas de informe familiar e integración, typecheck, lint y ambos builds. En Vercel, el fallback mostró su aviso, permitió guardar y confirmar un informe QA y descargar su Word.

**Prevención.** Tratar un fallo de contrato de IA como recuperable cuando existe una fuente docente validada, sin relajar las reglas de contenido ni ocultar la procedencia del borrador.

## 2026-10-01 — Word familiar sin apellido en el título

**Síntoma.** El Word de la familia de Prueba Uno se tituló «Informe a la familia de Prueba». En el aula QA hay tres alumnos cuyo nombre de pila es Prueba.

**Causa raíz.** La proyección de documentos consultaba solo `first_name` y `preferred_name` para el informe familiar; omitía `last_name` tanto en Biblioteca como en el objeto enviado al generador Word.

**Corrección.** Ambas consultas incluyen `last_name` y componen el título con nombre preferido o de pila más apellido.

**Validación.** La prueba de biblioteca comprueba el título completo en listado y detalle; las 14 pruebas de documentos y exportación, typecheck, lint y ambos builds pasaron. El despliegue `dpl_9ZuxMJp17jYyeccNfFc9MwXjhVEQ` pasó smoke y se promovió. El mismo informe descargado después mostró «Prueba Uno», ZIP íntegro, marca QA y ningún marcador. La paginación no pudo renderizarse porque falta `soffice.exe`.

**Prevención.** Revisar identidad completa en títulos y encabezados de archivos cuando varios alumnos comparten nombre de pila.

## 2026-10-02 — Crear Mi año sin recuperación y estados locales engañosos

**Síntoma.** Evidencia nueva bloqueaba confirmación sin una acción clara en pantalla; los bloques revisados localmente parecían confirmados. Una recarga o cambio de módulo podía perder ubicación o cambios no guardados.

**Causa raíz.** La interfaz no usaba la operación de actualización, no distinguía estado de sesión/persistencia y el hash estaba limitado por una bandera. Faltaba control de snapshot en escrituras de preparación.

**Corrección y validación.** Actualizar propuesta conserva campos editados y revalida fuentes; guardado de borrador separado, etiquetas Revisado/pendiente/Confirmado, snapshot con escritura condicionada y recuperación de conflictos. Hash de módulo/subvista y advertencia de cambios pendientes. Chrome completó diagnóstico, evidencia nueva, actualización, generación y confirmación; las regresiones rechazan fuentes antiguas y snapshots de otra pestaña. Ver QA 2026-10-02.

**Prevención.** Vincular Confirmado a estado persistido, representar ubicaciones en URL y acompañar errores recuperables con una acción.

## 2026-10-02 — Semana y Conclusiones no correspondían a sus acciones

**Síntoma.** Las flechas de Semana movían el mes; Conclusiones abría una revisión genérica de alumno.

**Causa raíz.** Navegación compartida basada solo en cursor mensual y entrada de evaluación que no seleccionaba la tarea de conclusiones ni su requisito.

**Corrección y validación.** Helpers de navegación por vista y semana de siete días con intervalo/selección sincronizados; Conclusiones selecciona la tarea lista o explica qué valoración/actividad falta. Regresiones de límites de mes/año y las 23 pruebas de evaluación pasan. Chrome comprobó semana/recarga y la rama sin valoraciones; la rama con valoración lista no se declara validada en navegador.

**Prevención.** Cada entrada debe seleccionar la tarea que anuncia; mantener los requisitos pedagógicos explícitos.

## 2026-10-02 — Falso Comercio local y conflictos de preparación/regeneración

**Síntoma.** Una observación sobre una ventana generaba Comercio local; dos preparaciones iniciales concurrentes podían chocar. La revisión devuelta tras regenerar no correspondía a la persistida después de recalcular slots.

**Causa raíz.** Subcadena `venta` sin límites de palabra, inserción inicial sin idempotencia y dos actualizaciones que incrementaban la revisión del plan.

**Corrección y validación.** Extracción con límites de palabra; inserción idempotente y recuperación del mismo borrador propio; regeneración devuelve revisión/propuesta reales después de persistir slots. Los conflictos ofrecen el borrador autorizado para continuar. Mientras se prepara/regenera, el mapa no se confirma ni cambia de versión. Regresiones con PGlite completo y regeneración real en Chrome mantienen V1 vigente hasta confirmar V2; no se reescriben históricos.

**Hallazgo en QA de dos pestañas.** Abrir un borrador con `refresh` también normalizaba y escribía detalles, causando conflicto entre aperturas simultáneas. La apertura ahora lee el borrador; actualizarlo requiere detalles de la acción explícita. Regresión de aperturas paralelas conserva detalles/snapshot. Dos pestañas reales comprobaron rechazo de un guardado antiguo y recuperación del texto vigente mediante Abrir revisión guardada.

**Prevención.** Probar palabras similares, concurrencia y revisión final de una transacción completa; separar preparación de confirmación anual.

## 2026-10-02 — Valoración omitida del paquete de generación de conclusiones

**Síntoma.** La tarea de Conclusiones mostraba la valoración confirmada, pero el proveedor recibía los hallazgos sin el nivel docente correspondiente.

**Causa raíz.** `buildDescriptiveConclusionInput` incluía `confirmed_achievement_level` y `analysis_status`; el filtro de inputs del workflow los descartaba antes del proveedor.

**Corrección y validación.** Se conservan ambos campos solo en `descriptive_conclusion`. La regresión verifica el paquete real del proveedor y la ausencia de nivel confirmado en análisis preliminar. Chrome generó y confirmó una conclusión ficticia de Bimestre 4 desde valoración B; se verificaron el FK y snapshot de esa valoración, F5 y regreso a la lista. No cambia la autoridad docente ni permite letras de nivel en la conclusión.

**Prevención.** Verificar los datos en la frontera del proveedor, además del input del servicio.

## 2026-10-02 — Fallo de regeneración con mensaje técnico

**Síntoma.** Un fallo del proveedor conservaba ideas y borrador, pero mostraba `provider_error` sin explicar cómo continuar.

**Corrección y validación.** La respuesta de generación anual indica que las ideas están guardadas, que el plan vigente se conserva y que se puede reintentar con la acción de generar/regenerar. Un HTTP 503 inyectado exclusivamente en transporte localhost confirmó igualdad del borrador, vigente e históricos; después de F5 el reintento regeneró el mismo borrador V3 sin activar ni alterar V2.

**Prevención.** Comprobar la recuperación en navegador con fallo controlado, incluyendo persistencia y ausencia de escrituras en el plan vigente.

## 2026-10-02 — P1 de cambios pendientes, foco anual y contexto accesible

**Síntomas y causas.** El selector anual reemplazaba la propuesta local sin consultar la protección de navegación (D1). El editor era un overlay manual sin gestión de foco (D2). Los inputs de excepción/reprogramación dependían de placeholders y las alternativas de asistencia carecían de grupo nombrado por alumno (I6).

**Corrección.** Reutilizar `ayni-before-navigation`/`canLeaveWorkspace` y la advertencia de recarga en el borrador anual; omitir el aviso para la misma versión. Usar Dialog compartido, foco inicial en Título y retorno al botón de apertura, manteniendo el mapa montado. Añadir labels vinculados y fieldset/legend, conservando reglas y callbacks.

**Validación.** Dos pruebas focales mover/retirar, typecheck, lint, build y diff check pasan. Navegador: editor abierto por teclado en mapa/lista, contención Tab/Shift+Tab, Escape y retorno del foco pasan; asistencia y calendario guardan en copia QA aislada con semántica asociada. D1 conserva el borrador durante la recuperación y permite guardarlo; versiones limpias cambian sin aviso, histórico de solo lectura, vigente/históricos sin cambios según comparación completa. El control nativo de Cancelar/Descartar no se pudo validar de forma fiable. Por autorización del usuario, cierre con tres pruebas focales PASS que ejecutan el guard y manejador reales: Cancelar conserva, Aceptar cambia sin mutar planes y limpio/misma versión no avisa. Sin cambios adicionales de producto ni repetición E2E. Detalle en `docs/qa/p1-ux-validation-2026-10-02.md`.

**Prevención.** Toda sustitución de un borrador debe consultar el guard compartido; usar Dialog para gestionar foco, mantener el disparador montado y nombrar campos/grupos con semántica nativa. Verificar el resultado de una interacción, no solo su intento.

## 2026-10-02 — Ubicación anual/calendario y retorno de Conclusiones

**Síntoma y causa.** La recarga restablecía el día/mes de Calendario y la versión por defecto de Mi año porque estas selecciones eran locales. El detalle de Conclusiones carecía de retorno propio; su foco podía persistir al cambiar a otra vista.

**Solución.** Reutilizar el hash de workspace para fechas civiles validadas y versiones devueltas por la API autorizada, esperando la carga antes de normalizar IDs. Sincronizar la propuesta al cambiar versión y mantener el guard existente de navegación sin un segundo aviso. Retorno a listado del mismo período y limpieza de foco al cambiar vista. El salto al contenido enfoca el main sin sobrescribir el hash del módulo.

**Validación.** 33 pruebas focales PASS, typecheck/lint/build PASS; navegador confirma Semana/F5, V2/F5, V1/Atrás y retorno a Conclusiones de Bimestre 4 en copia QA aislada. Deshacer idea restaura contenido/posición y respeta máximo diez. Detalle y límites en docs/qa/p2p3-ux-closure-2026-10-02.md.

**Prevención.** Persistir selección de presentación con parámetros validados; nunca introducir contenido pedagógico en URL. Mantener un solo guard por interacción y comprobar URL, selección y contenido visibles juntos.


## 2026-10-03 — Interpretación de fuentes y calendario incompleto en el recorrido anual

**Síntoma.** La auditoría encontró negaciones convertidas en intereses, pérdida de respuestas libres/otro, generalización por conteos y 26 fechas sin asignar entre 172 elegibles. La formalización posterior podía introducir contenido que la docente no había confirmado.

**Causa raíz.** Extracción por palabras clave, agregación sin sujeto, asignación greedy independiente por bimestre y dos contratos pedagógicos antes/después de confirmar. El anonimizador de clasificación descartaba además textos familiares enteros y palabras útiles capitalizadas al reutilizarlo para el contexto anual.

**Solución validada.** Snapshot literal por fuente y sujeto, señalización explícita sin inferencia regex, copia anonimizada propia que conserva las lenguas probadas; resolución global sobre calendario efectivo y validación de cada asignación; contrato pedagógico completo antes de confirmación; exportación pura del mismo objeto. La navegación ya no exige confirmar atribuciones individuales. Se conserva contenido histórico y evidencia original privada.

**Validación.** Regresión 172/172, cero huecos/solapamientos; negación, otro, Shipibo-konibo, contradicción, muchos registros de un sujeto, estados de evidencia y reparaciones acotadas; dos Word con XML pedagógico igual y cero nuevas llamadas. Recorrido real de navegador con datos ficticios y proveedor simulado. 87 casos distintos y typecheck/lint/build PASS; límites en informe QA V2.

**Prevención.** No inferir intereses por temas sueltos; conservar fuente/alcance e incertidumbre. Validar estructura, IDs, oportunidades y asignaciones en servidor. Separar copia privada de payload a IA. Toda decisión pedagógica debe existir antes de confirmar. Los errores de SQL se muestran mediante publicErrorMessage y la telemetría de incidencias omite contenido privado.

## 2026-10-03 — Hipótesis opcional bloqueaba el año y generación sin recuperación

**Síntoma.** QA reportó «La interpretación debe conservar el alcance de sus actuaciones». Repetir con las mismas fuentes llegó a una incidencia global del revisor, sin repetir el texto original. El borrador preservaba ideas, pero no respuestas intermedias.

**Causa raíz.** El validador rechaza scope individual con sujetos distintos/desconocidos. La validación previa a revisión solo reparaba errores con proposal_id; una incidencia de interpretación carecía de ese ID y bloqueaba el plan completo. No se persistía la respuesta que permitiría atribuir el fallo original a fact_keys exactos. Una única petición larga también perdía trabajo completado ante error o corte.

**Solución validada.** Mantener el validador; separar hipótesis incompatibles como información insuficiente sin aumentar alcance y revisar razones dependientes. Jobs privados con etapas, salidas y candidatos guardados; una llamada real por run, exclusión por lease/token, CAS y huellas. Refresh recupera la cola; proveedor fallido reintenta revisión sin otra generación. Un CAS/fingerprint cambiado se marca como fallo recuperable para evitar reintentos automáticos en bucle.

**Verificación.** Regresiones específicas con dos sujetos, razón dependiente, permisos, concurrencia, proveedor fallido, reanudación y CAS; calendario 172/172, XML Word y versiones conservados. Navegador real con fuentes QA reconstruidas y proveedor simulado: refresh → fallo → revisión recuperada → confirmar. La respuesta original no es recuperable y no se afirma reproducción exacta. Detalle y límites en docs/qa/annual-journey-v2-recovery-2026-10-03.md.

**Prevención.** Persistir checkpoints privados antes de cambiar de etapa; no publicar conclusiones insuficientes ni promover su alcance. Telemetría limitada a categoría, etapa y conteos, sin datos pedagógicos ni secretos. Distinguir prueba de recuperación simulada de evaluación real del proveedor.

## 2026-10-03 — Sugerencia bloqueada por transacción y foto incompatible con esquema local

**Síntomas y causa.** La sugerencia previa al guardado quedaba esperando porque el IO del proveedor estaba dentro de una transacción PGlite y el registro de uso solicitaba la misma base. La foto devolvía 42703 porque intentaba actualizar students.updated_at, columna inexistente en ese esquema.

**Solución validada.** Claim breve con lease, proveedor fuera de transacción y persistencia condicionada al token; cache sin otra llamada. Foto actualiza solo la columna real nueva, con comparación del path previo y limpieza privada ante conflicto. Regresión del clasificador consulta la misma base durante IO para detectar el deadlock. API y navegador confirmaron sugerencia antes de guardar; pruebas foto upload/read/replace/delete y permisos PASS, con archivo sintético. La migración nullable se verificó en staging conservando RLS y hashes de planes/entrevistas.

**Prevención.** No mantener una transacción abierta durante requests de IA que registran uso en la misma conexión. Verificar contra migraciones y probar operaciones completas de Storage antes de declarar cámara/upload físico validado.

## 2026-10-03 — Segunda competencia docente ausente del contexto anual

**Síntoma y causa.** La captura guardaba dos competencias confirmadas, pero personalizationSources proyectaba únicamente la primary competency de una observación espontánea.

**Solución validada.** El UNION de fuentes conserva competency_ids de cada tipo, incluyendo todo el array confirmado de la profesora. Snapshot, matriz y conversación leen la misma fuente canónica. Regresión captura dos IDs y comprueba ambos antes de editar; eventos mantienen trazabilidad. Navegador mostró comunicación y convivencia en la misma nota sin segunda confirmación.

**Prevención.** Comprobar la proyección downstream además del JSON de guardado; conservar la distinción entre cantidades de registros y evaluación pedagógica.
## 2026-10-03 — Unión de fuentes con revisión de distinta longitud

**Síntoma/causa.** La primera pasada de regresiones del refinamiento falló en personalizationSources: source_revision se agregó a un brazo del UNION y una sustitución que suponía LF omitió los otros brazos en archivos CRLF.

**Solución validada.** Misma proyección en todos los brazos (revisión efectiva espontánea, cero para fuentes sin revisión), IDs/procedencia originales y huella con revisión/texto. Suite de regresión pasó, incluyendo corrección, retiro, contexto anual y permisos. No fue desplegado el estado fallido.

**Prevención.** Aplicar patches verificando coincidencias, normalizar terminadores para scripts locales y ejecutar lectores downstream además del test de escritura antes de publicar.

## 2026-10-03 — Métodos de edición ausentes en la entrada Next

**Síntoma/causa.** El smoke previo al alias detectó HTTP 405 en PATCH/DELETE del preview. La API Node local y su CORS aceptaban los métodos, pero app/api/[...path]/route.js exportaba solo GET/POST/PUT/OPTIONS.

**Solución.** Exponer PATCH y DELETE hacia el mismo bridge/autorización, sin nuevos permisos. Rebuild de los dos runtimes y smoke remoto que exige 401 sin sesión para ambos métodos antes de mover el alias. El preview incompleto no se asignó al QA estable.

**Prevención.** Comprobar los métodos en el deployment además de la API local, incluyendo guard de sesión y assets. No asumir que la prueba local equivale a la entrada serverless.

## 2026-10-03 — Mi año V2 omitía la línea de tiempo acordada

**Síntoma y causa.** QA mostraba doce tarjetas en Mi año aunque ADR 106 había establecido el mapa horizontal con proyectos, feriados y gestión. AnnualJourneyWorkspace no reutilizaba AnnualYearMap, que seguía conectado únicamente al workspace legacy; las afirmaciones anteriores de «Mi año conservado» no cubrían la vista V2 final.

**Solución validada.** Compartir la presentación temporal existente y conectarla a las filas y fechas V2 guardadas. El mapa es principal y la lista secundaria; las acciones siguen siendo V2. La proyección V2 rechaza fechas ausentes o discrepantes sin invocar el scheduler anterior. Pruebas focales 25/25 y navegador ficticio escritorio/móvil verifican selección, feriados, scroll y persistencia de la vista, sin llamadas nuevas al proveedor. Informe: docs/qa/annual-year-map-v2-restoration-2026-10-03.md.

**Prevención.** Verificar también la llegada a Mi año al probar un nuevo recorrido, comparándola con el acuerdo visual vigente. Reutilizar la presentación sin sustituir los contratos ni recalcular fechas congeladas.

## 2026-10-03 — Ilustraciones genéricas o ajenas al tema del proyecto

**Síntoma y causa.** El mapa usaba una hoja como fallback para numerosos proyectos. Al probar la biblioteca nueva, verbos genéricos compartidos («cuidamos», «exploramos») y contexto del aula podían puntuar un dibujo ajeno al sustantivo principal, por ejemplo Tierra en un proyecto del agua.

**Solución validada.** Catálogo de 50 temas, prioridad del título sobre el contexto, omisión de verbos genéricos/materiales y fallback neutral de ideas. Pruebas con 23 títulos y una línea de tiempo ficticia de doce temas verifican imágenes diferenciadas. La extracción del puntuador compartido conserva las pruebas de Word y Jev.

**Prevención.** Ampliar ejemplos de títulos reales anonimizados al agregar vocabulario; comprobar que el propósito genérico no desplaza el tema específico y que un tema desconocido no recibe una imagen arbitraria. Mantener el check de archivos y tamaño del catálogo.

## 2026-10-03 — Tema parcial confundido con salud y títulos ambiguos

**Síntoma y causa.** El mapa podía elegir botiquín para movimiento porque «cuerpo» coincidía parcialmente con «cuidado del cuerpo». Dos proyectos de cuentos recibían el mismo libro pese a enfatizar oralidad y lectura respectivamente. El selector anterior no usaba las competencias del proyecto.

**Solución validada.** Coincidencias de frases completas, normalización de plurales y apoyo de IDs curriculares existentes. Narración y lectura tienen dibujos diferenciados; el tema explícito mantiene prioridad y el fallback curricular exige un rol curado. Las pruebas cubren cuerpo/movimiento, cuentos oral/lectura, agua con escritura, Navidad/solidaridad y IDs desconocidos. 28 pruebas focales PASS y mapa ficticio de doce proyectos verificado en escritorio/móvil sin modificar el plan.

**Prevención.** Probar empates semánticos con competencias reales además del título. No convertir cualquier coincidencia curricular en un tema textual pertinente; mantener imágenes neutrales para casos desconocidos y verificar peso/transparencia de cada nuevo asset.

## 2026-10-03 — Feriado en extremo de semana impedía construir un tramo

**Síntoma y causa.** El solver anterior exigía que el primer lunes y último viernes fueran días lectivos. Un feriado en un extremo invalidaba una semana calendario válida. Reemplazar ciegamente doce por quince también podía reinterpretar calendarios/jobs ya guardados.

**Solución validada.** El editor nuevo construye quince posiciones a partir de semanas calendario dentro de bloques lectivos y mantiene por separado las fechas efectivamente lectivas. El solver/lector histórico de doce se conserva para sus contratos y recuperación; upgrade requiere una acción explícita sobre borrador compatible. Pruebas de feriado interior/lunes/viernes y override conservan límites/duración, comprueban asignación única y el caso de dos semanas/nueve días. Suite focal final 65/65 PASS; HTTP local verifica fechas y swaps sin requests IA.

**Prevención.** Probar límites de semana además de conteos, distinguir versión de editor/contrato y no recalcular históricos al leer. Si ya se persistieron quince tramos, mantener sus lectores/exportadores en cualquier rollback. Ver ADR 113 y docs/qa/annual-year-editor-v3-2026-10-03.md.

## 2026-10-03 — Revisión final requería preview completo y trazabilidad de sustitución

**Síntoma y causa.** La candidata nueva enseñaba acciones y motivo pero omitía campos pedagógicos necesarios para una aprobación informada. El evento estructural inicial identificaba insuficientemente a la propuesta desplazada en un swap/sustitución.

**Solución validada.** El preview incluye competencias y detalles completos del contrato con fuentes pertinentes antes de Guardar en Biblioteca. El historial incluye IDs entrante/desplazado y slots origen/destino; la regresión de swap comprueba esos campos y la suite focal final conserva 65/65 PASS. La captura final del preview queda pendiente; el resultado de las pruebas no equivale a aprobación visual.

**Prevención.** Revisar todos los campos que la docente aprueba y registrar ambos lados de una operación estructural. Mantener separado QA de servidor, primeras capturas y QA final: la recaptura móvil/Biblioteca/matriz/filtro/chat y el drag genuino quedaron bloqueados por conectividad local/política de URL, y no deben declararse ejecutados. Pasos de cierre en docs/qa/annual-year-editor-v3-2026-10-03.md.

## 2026-10-03 — Panel de una propuesta podía aplicar pendientes de otros alcances

**Síntoma y causa.** «Cambiar propuesta con Ayni» reutilizaba pendientes/aplicación de lote completo. Un contexto visual local no se trasladaba de forma explícita al filtro del servidor ni al revisor; podían consumirse indicaciones globales/ajenas.

**Solución validada.** Selección exacta por proposal_id o null en UI/servidor, revisión limitada al ID local y rechazo de cambios fuera de alcance. Solo se retiran pendientes aplicados y solo ellos pasan al historial. La proyección del revisor omite pendientes ajenos (hallazgo P1 de privacidad); recargar limpia el scope desaparecido sin excepción y recupera las indicaciones retiradas por separado (P2). Regresiones de aplicación local/global, pendientes conservados y reparación ajena PASS dentro de la suite corregida final 68/68. Typecheck/lint/Next (`npx next build`)/Vinext finales PASS, exit 0; sin QA visual final.

**Prevención.** Transportar el alcance hasta proveedor, validación, revisión y persistencia; no asumir autorización por el título del panel. Probar pendientes locales de dos propuestas junto con uno global y comprobar qué queda sin aplicar. Si una propuesta se retira, conservar su indicación en una sección independiente con «Quitar indicación»: limpiar un scope inválido no autoriza descartar decisiones docentes.

## 2026-10-03 — Copia histórica de doce confundida con el editor nuevo de quince

**Síntoma y causa.** Una copia preservaba el contrato/calendario anterior de doce y criterios generados que mencionaban esa cantidad. La presentación nueva podía hacer pensar que abrir/copiar equivalía a convertirla en quince.

**Solución y estado.** Criterios nuevos de organización determinísticos solo para editor_version 3; el histórico mantiene sus criterios originales visibles. Banner de doce y presentación semántica compartida sin mutar su JSON literal. Upgrade únicamente explícito del borrador compatible. Se preparó una copia QA recuperable con tres alternativas sin IA y guard transaccional de hashes del activo V1/otros planes; el upgrade por UI sigue pendiente tras deployment. Pruebas actuales PASS acreditan lógica/compatibilidad, no conversión visual ya ejecutada.

**Prevención.** Verificar editor_version y resolved_calendar antes de atribuir cantidad/funcionalidad; distinguir copia, upgrade y confirmación. Mantener el original recuperable y lectores de quince en rollback. La fase integral en cola se retoma tras estabilizar este cierre. Ver ADR 114 y docs/qa/annual-year-scope-closure-2026-10-03.md.

## 2026-10-03 — Respuesta fallida ocultaba una candidata ya guardada

**Síntoma y causa.** El panel mostraba un fallo de generación aunque la candidata ya se había persistido. El estado de la respuesta HTTP se trataba como ausencia de resultado y podía invitar a reiniciar/generar otra vez sin consultar la sesión guardada.

**Solución validada.** El catch del panel intenta GET de la conversación existente; una candidata guardada se recupera y muestra sin IA nueva. La integración comprueba identidad exacta de candidata, mismo contador de calls y 404 para otra cuenta. Suite final 69/69, typecheck/lint/Next/Vinext PASS. La ronda real sobre plantas confirmó que la candidata guardada podía continuar a Biblioteca; la revisión humana de su omisión de Crea sigue pendiente y no se atribuye aprobación semántica al recovery.

**Prevención.** Consultar estado persistido antes de interpretar un error de transporte como falta de resultado. Separar requests de la sesión nueva de métricas heredadas y conservar permisos en recuperación; no repetir una generación únicamente por una respuesta fallida. Detalle y QA integral en docs/qa/annual-year-integral-qa-2026-10-03.md.

## 2026-10-04 — La candidata omitía competencias elegidas por la docente

**Síntoma y causa raíz.** La unidad real de plantas conservó Indaga/Lee, pero omitió Crea solicitado en QA. El filtro de privacidad ocultaba Indaga y Crea como nombres propios; la revisión validaba currículo sin exigir los IDs elegidos.

**Solución validada.** Vocabulario confiable del currículo efectivo en conversación/preparación/cambios; nombres personales y contactos permanecen protegidos. Selección docente explícita de hasta cinco competencias, obligatorias en generación/revisión/reparación de una candidata. El servidor exige oportunidad real, bloquea aprobación incompleta (incluidas candidatas antiguas) y repara solo esa fila. Integración comprueba cero mutaciones del año ante omisión/fallo, revisión cached y permisos; 76/76 focales PASS. La prueba real y los deployments se acreditan separadamente en el recibo posterior al commit, no mediante mocks.

**Prevención.** Comparar intención literal/selección curricular con oportunidades reales antes de aprobar; no confundir revisión formal con cumplimiento de una preferencia. No permitir que aprobar cambie IDs para saltarse el control. Detalles y rollback en docs/qa/annual-proposal-competency-intent-2026-10-04.md.

## 2026-10-04 — Intención de Navidad perdida, candidata anterior y recuperación incompleta

**Síntomas y causas reproducibles.** El filtro de nombres reemplazaba Navidad por `[persona]`; una nueva idea conservaba candidata/draft anteriores. El turno docente solo se persistía después de responder el proveedor. La captura desde matriz descartaba el ID de competencia en su callback. Un fallo de refresco posterior se presentaba como fallo de avance, y el poll podía detenerse al conocer `succeeded` antes de cargar el borrador.

**Corrección.** Vocabulario temático cerrado seguro, con neutralización previa de nombres conocidos/contactos; intención literal recuperable, invalidación de candidata/draft/revisión/procedencia en nuevo turno y revisión del tema reciente. Turno guardado antes de IO, GET/reanudación sin duplicación. Captura contextual alumno/competencia, momento requerido y consulta claramente separada de Guardar. Retry acotado solo de lecturas, poll secuencial y cierre tras recuperar el plan. Foto de inscripción normalizada privada de hasta 100 KB. Checkpoints animados desde estados reales, mascota y escritura visibles en móvil.

**Validación y prevención.** Suite focal 60/60 en servidor con proveedores simulados: corte entre mercado y Navidad descarta candidata anterior, conserva el turno/tema y deja intacto el año; fotos sintéticas y aislamiento docente, momento vacío sin IA, idempotencia/CAS y recuperación de jobs. Typecheck/lint y builds verificados antes de publicar; recibo final y QA visual separados en `.local/qa-fixes-*`. Logs históricos consultados no devolvieron el evento de `Failed to fetch`: no atribuir infraestructura sin evidencia. Mantener pruebas de intención nueva, pending turn y carga final; no repetir POST automáticamente ni tratar `ready` antiguo como respuesta al nuevo turno. Detalle/rollback: `docs/qa/initial-journey-recovery-2026-10-04.md`.


## 2026-10-05 — El worker interno recuperable resolvía el proxy de base de datos dentro de sí mismo

**Síntoma.** El recorrido HTTP ficticio creó Mi año pero la preparación backend del proyecto falló al resolver la conexión de base de datos.

**Causa raíz.** El adaptador interno colocaba el proxy contextual db como conexión en AsyncLocalStorage. Leer db dentro de ese contexto volvía a resolver el mismo proxy de forma recursiva.

**Solución validada.** Usar job.db transaccional cuando existe y, en caso contrario, la conexión real del contexto o database.db. El recorrido HTTP completo volvió a funcionar desde sus checkpoints: proyecto, cuatro actividades, aprobación atómica, seis Word y ZIP; ocho llamadas simuladas y cero pagadas. Su repetición conservó ese contador. Pruebas PostgreSQL de checkpoints/aprobación y suite final 109/109 PASS.

**Prevención.** Nunca registrar un proxy de resolución contextual como su propia conexión. Verificar un flujo vertical con el servidor y worker reales, además de probar el executor con adaptadores de fixture.


## 2026-10-05 — Integración de ramas y fixtures anteriores al rediseño

**Síntoma y causa raíz.** El merge automático añadió por segunda vez loadPersonalizedPreplanSkill, aunque las ramas implementaban la misma función con rutas diferentes. Next y Vinext rechazaron el módulo. Las pruebas antiguas también conservaban textos anteriores, un contexto VM sin el nuevo setter de navegación y fixtures sin effective_diagnostic_spontaneous_observations; esto produjo errores SQL y conflictos derivados de respuestas incompletas.

**Solución validada.** Una sola función conserva las rutas desde process.cwd() para el empaquetado serverless. Comprobación sintáctica de 375 módulos PASS y ambas compilaciones PASS. Las fixtures incluyen la vista efectiva, los hooks reciben sus dependencias reales y las aserciones reflejan el dictado/consulta/guardado explícitos actuales. Pruebas focales de evaluación/versiones/navegación 36/36, continuidad UI 15/15, contratos anteriores corregidos 12/12 e informe diagnóstico 3/3 PASS. La corrida completa se registra en el documento de consolidación cuando termine.

**Prevención.** Tras integrar historiales divergentes, comprobar sintaxis de módulos .mjs además de TypeScript; usar fixtures alineadas con el esquema efectivo y conservar controles de propiedad, CAS y confirmación docente al actualizar textos. Nunca aceptar un fallo de infraestructura como ausencia de información pedagógica.

## 2026-10-06 — Captura moderna y límites de integración del PDF

Síntomas: Word de actividad omitía las observaciones ordinarias; Preview devolvía captura no habilitada; resumen/calendario y navegación presentaban contratos diferentes. Causa: lector Word solo legacy, flags modernas ausentes en Preview y shell/textos no alineados con la autoridad del servidor. Solución validada: proyección autorizada de ambas fuentes con corrección vigente y nueva huella documental; flags solo Preview; bloques/contexto/calendario explícitos compartidos. QA guardó una observación una sola vez, corrigió sin borrar raw y descargó otro Word con texto vigente. Prevención: regresiones ownership/idempotencia/corrección/void y smoke de rutas privadas.

Durante integración, dashboard usó today antes de declararlo; esquema de conversación inicial v2 se compartía por error con crear una sola propuesta; fixtures nuevas escogían aula demo en vez de docente QA; selector HTTP interpretaba /students/inactive como UUID. Soluciones: fecha calculada antes de consulta, esquema independiente para propuesta, fixtures por ownership y excepción exacta para colección inactive (servicio sigue filtrando docente). Pruebas amplias 734 PASS, integración y contratos específicos PASS; HTTP autenticado comprueba colección y bloquea PATCH de alumno ajeno. Prevención: cubrir nuevos paths con frontera autenticada además del QA local, y no reutilizar esquemas con semántica distinta.

La captura fullPage desde un scroll intermedio situaba la cabecera fija dentro de la página. Se recapturó desde el inicio y se abrió cada archivo antes de revisión. El revisor detectó propósito fuera del viewport móvil y títulos redundantes; jerarquía corregida y dos fixes puntuados ship. No confundir esos fixes con validación visual de todo el producto.

El smoke del primer Preview READY devolvió 403 con su propio Origin. Causa: la lista de orígenes solo incluía el alias fijo de QA. Solución: admitir además el hostname exacto VERCEL_URL exclusivamente cuando VERCEL=1; validar dominio HTTPS vercel.app, sin wildcard ni Host/X-Forwarded-Host del cliente. Ocho pruebas de origen/Auth/HTTP PASS: origen propio público 200, privado 401 y otro dominio con headers manipulados 403. Prevención: el smoke debe enviar el Origin del URL publicado, no sustituirlo por el alias anterior. Se vuelve a publicar desde commit limpio y se exige smoke remoto antes de entrega.
# Correcciones del paquete maestro — 2026-10-07

## Procedencia de conversaciones y recuperación de citas

- Síntoma: avanzar a Dependents descartaba `project_context`; el provider neutralizaba text pero podía conservar support_text original. Recargar la síntesis no mostraba sus citas guardadas.
- Causa raíz: reconstrucción de details sin copiar la conversación, expansión indiscriminada del mensaje y proyección pública limitada al texto docente.
- Solución validada: conservar conversación al avanzar, seleccionar campos del mensaje y neutralizar también support_text; proyectar la propuesta IA validada por separado y recuperarla en el resumen. Refresh Preview moderno usa código.
- Evidencia: HTTP con un turno Luna simulado, replay sin nueva llamada y source_turn/support_text conservados; pruebas de privacidad del bundle y límite de tres turnos; recuperación del snapshot de síntesis sin sobrescribir texto docente; conversación Luna real adicional PASS.
- Prevención: separar datos guardados para la docente de campos enviados al modelo y conservar la procedencia en cada transición del trabajo durable.

## Preparación anual larga y recuperación del proveedor

- Síntoma: el escenario válido de quince propuestas con GPT-6.1 Sol high agotó el timeout síncrono de 180 segundos sin devolver usage.
- Causa raíz: una respuesta high extensa vivía dentro de una única petición HTTP. Un checkpoint de salida completada no permitía recuperar una respuesta todavía en curso.
- Solución validada: Responses background con `store:false`, guardar ID antes de devolver pendiente y recuperar ese mismo ID en peticiones cortas con espera. Público recibe solo progreso; ownership, revisión, fingerprint y lease siguen vigentes. La expiración muestra aviso y exige reintento docente explícito antes de crear una respuesta nueva.
- Evidencia: proveedor create/retrieve y expiración sin reintento automático; checkpoint con una sola tentativa; ruta PGlite con recarga, consulta temprana, identidad ajena y finalización. Muestra real: quince propuestas, una generación, 56 consultas, PASS en 319466 ms.
- Prevención: no reducir effort ni dividir el año para ocultar la latencia; no repetir create al recargar ni contabilizar polls como generaciones. Costes de timeouts sin usage se consideran desconocidos.

## Taller opcional dentro de un proyecto confirmado

- Síntoma: actualizar la lista JSON del contenedor confirmado infringía su protección de inmutabilidad.
- Causa raíz: se trató el contenedor activo como una colección mutable de propuestas, aunque representa una versión confirmada.
- Solución validada: contenedor estructural `direct-workshops-v1` con items vacíos inmutables; cada taller solicitado y criterio se insertan por separado con enlace a la actividad principal. Lock de aula, revisión y comprobación de duplicado/historia antes de confirmar.
- Evidencia: integración PGlite y ruta funcional ficticia generar → revisar → confirmar; duplicado, actividad ajena y cambio logístico no agregan llamadas al proveedor. Proyectos confirmados no generan talleres automáticamente.
- Prevención: no actualizar padres confirmados ni reutilizar Workshop Master como requisito del recorrido moderno.

## Recomendación familiar pendiente tras cambiar una entrevista

- Síntoma: el fingerprint escolar por sí solo podía permitir reutilizar recomendaciones basadas en un contexto familiar anterior.
- Causa raíz: el contexto familiar nuevo pertenecía a una autoridad distinta y no estaba incorporado a la clave de recomendación.
- Solución validada: fingerprint separado de fuente/tipo/versión/detalles confirmado en generación, batch y confirmación. El cambio invalida únicamente la recomendación pendiente; conclusiones y niveles escolares permanecen iguales.
- Evidencia: pruebas de informe y batch, incluyendo confirmación rechazada después de cambiar entrevista.
- Prevención: conservar las fuentes familiares fuera del análisis y conclusión; no convertirlas en evidencia escolar ni acuerdos.
## SQ-01 — Una nota pedagógica desaparecía del diagnóstico

- Síntoma: seis notas vigentes se proyectaban como cinco; la mención «mi hermana» descartaba todo un registro y una entrevista con «abuela» perdía su interés. Contextos como Exploración quedaban como persona.
- Causa raíz: reutilización de `anonymousDecisionText`, un filtro de Jev deliberadamente más restrictivo que el contrato de diagnóstico.
- Solución validada: proyección específica de diagnóstico, neutralización de nombres y exclusión conservadora de contactos/domicilio/DNI, sin descartar parentescos ordinarios por sí solos. Vocabulario explícito conserva momentos y comienzos habituales. Referencia de Skill actualizada al contexto familiar confirmado separado.
- Evidencia: regresión PGlite conserva el relato y excluye la nota con domicilio/teléfono; payload real del intento 3 contiene seis notas y cuatro entrevistas, sin nombres ni borradores familiares. Diagnóstico confirmado desde UI con claims sustentados.
- Prevención: auditar conteos y significado antes del modelo; no intercambiar filtros entre clasificación, diagnóstico y planificación por similitud de nombres.

## SQ-02 — Alias técnicos dentro de la síntesis visible

- Síntoma: el segundo output decía child_N dentro del texto docente.
- Causa raíz: prompt pedía citar alias en cada afirmación, aunque el schema ya disponía de `claims.source_refs`.
- Solución validada: citas solo en metadatos y rechazo de alias en los campos visibles. Regresión focal y tercer output real PASS, sin una cuarta invocación.
- Prevención: separar requisitos de trazabilidad de la prosa destinada a la docente. Hallazgo similar SQ-03 permanece abierto en la prosa anual de esta ronda.

## Alcance de la suite completa en Windows

- Síntoma: `node --test` sin rutas descubrió utilidades históricas y experimentos, y la concurrencia automática saturó el navegador. Una ejecución acotada produjo 820/825 PASS, con cinco fallos externos al alcance del producto.
- Causas verificadas: fixture de reloj histórico ausente, utilidad externa sin configuración, carrera de renombrado de resultados mock en Windows y baseline experimental de hashes invalidado al cambiar una dependencia. Este último es un efecto de esta corrección sobre el experimento congelado, no un benchmark de precisión ejecutado.
- Prevención: enumerar `*.test.mjs` de src/lib, scripts y evals con rg y pasar el array a `node --test --test-concurrency=2`. No renovar hashes experimentales para ocultar un cambio ni ejecutar una prueba de proveedor externo sin opt-in. Resultado de la última suite en el informe secuencial.

## QA de continuación — SQ-03 / CQ-01 a CQ-10 — 2026-10-08

La evidencia detallada y los ciclos están en docs/qa/AYNI_QA_CONTINUACION_SOLO_QA_2026-10-08.md. Todas las reproducciones usan datos ficticios; requests/raw y outputs rechazados se conservan fuera de Git.

| Incidente | Síntoma / causa raíz | Solución validada | Prevención |
|---|---|---|---|
| SQ-03 | Alias visibles; trazabilidad interna usada directamente como prosa. | Proyección por fuente propia, UI/Word, hash raw intacto y regresión PGlite. | No resolver alias por orden de matrícula ni editar evidencia original. |
| CQ-01 | Tarjeta ready sin intención nueva y pregunta inicial perdida al recuperar. | Intención obligatoria por código y pregunta estable; focales y tres llamadas de conversación/tarjeta. | Contrato del modelo no sustituye precondición de dominio. |
| CQ-02 | Chat pide materiales conocidos porque payload omitía campos. | Herencia de materiales/acciones/apoyos/flexibilidad neutralizados; focales y nueva conversación real. | Auditar inputs heredados antes de cambiar prompt o downstream. |
| CQ-03 | Fecha coincidente rechazada; DATE del adaptador se comparaba con string. Captura planificada legacy. | SELECT DATE::text y captura ordinaria bajo flag; tres guardados UI y focales. | Contrato ISO explícito en límites SQL/API. |
| CQ-04 | Corrección no aparecía para revisión; filtro solo status pending. | source_revision>1 exige revisión manual; RED/GREEN y confirmación UI. | Nueva revisión invalida atribución previa, conserva original. |
| CQ-05 | Análisis inaccesible en vista moderna; spinner de botón equivocado. | Botón a ruta existente, busyAction por acción, motivo de insuficiencia visible; UI y typecheck. | Distinguir análisis auxiliar de confirmación docente, sin elegir letra automáticamente. |
| CQ-06 | Conteos y evidencia esperada incompletos; consulta legacy y reconstrucción parcial del Master. | Constructor completo existente, merge ordinarias revisadas/legacy por ID; regresión y inputs reales. | Comparar conteos, área, criterio y evidencia esperada antes del proveedor. |
| CQ-07 | Auxiliar etiquetado hallazgo docente; modelo escribe nombre en ID de competencia. | Retirar duplicación solo del auxiliar y enum en schema clonado de request; focales y outputs revalidados. | No promover análisis IA a fuente confirmada; rechazar referencias abiertas erróneas. |
| CQ-08 | Draft antiguo bloquea cierre tras dejar nota sin clasificación. | CTA pendiente por save-draft con CAS/fingerprint actual y nivel null; UI y 41 focales. | Ausencia de evidencia tiene resolución explícita sin letra. |
| CQ-09 | Excel corta nombres/conclusiones por ancho default. | Formato de columnas, wrap y filas; render y comparación exacta de 42 valores; 13 focales. | QA visual de exportación, no solo ZIP/XML. |
| CQ-10 | Acuerdo docente guardado no aparece en Word; whitelist de proyección omitía campo ya soportado. | Campo permitido en biblioteca; regresión integrada RED/GREEN, 17 focales y render final. | Comparar documento descargado con estado docente confirmado; no solo render con objeto construido a mano. |

Limitaciones del harness, separadas del producto: reinicio con reloj de fixture hacia atrás ordenó batch antiguo como reciente; se corrigió exclusivamente reloj privado, sin alterar artifacts. Chrome bloqueó descarga local de origen distinto; no se desactivó protección, se inspeccionó endpoint propio HTTP 200 y se dejó descarga nativa pendiente. Lint descubrió scripts de LibreOffice extraído en .local/qa-tools; comando final excluye solo esa carpeta privada. Typecheck se ejecuta con npx tsc --noEmit, pues no existe script npm typecheck.

## QA integral del 9 de octubre — incidencias reproducidas

| ID | Síntoma y causa | Corrección y validación focal | Prevención |
|---|---|---|---|
| IQ-01 | Privacidad sustituía acciones y decisiones comunes por `[persona]`; retomar conservaba la copia incompleta. | Vocabulario explícito y reconstrucción desde original autorizado. Regresión con nombres/contactos excluidos y recuperación de decisiones; 17 pruebas focales finales de conversación/preparación. | Auditar input efectivo antes de aprobar un consumidor. |
| IQ-02 | Chat anual unía fragmentos como cita literal y contaba referencias desde uno. | Citas continuas e índice explícito desde cero; validación conserva y recupera turnos rechazados. Conversación real posterior aceptada. | Las citas del modelo nunca sustituyen la fuente literal. |
| IQ-03 | Costo omitía escrituras en caché. | Propagación del conteo y tarifa separada, sin doble conteo; 28 pruebas de costo/proveedor/generación/traza. | Guardar versión de tarifa; no recalcular silenciosamente registros históricos. |
| IQ-04 | Reloj del dispositivo dejaba un proyecto futuro sin días o elegía otro bimestre. | Fecha de Lima de servidor para calendario, selección de proyecto y período. HTTP/Auth/calendario/proyecto: 25 pruebas; prueba funcional con relojes deliberadamente distintos. | Compartir la fecha autorizada con clientes que filtran fechas; servidor conserva la validación. |
| IQ-05 | «Quiero cambiar algo» recuperaba job exitoso anterior o duplicaba el contexto guardado. | Reset por ruta existente con CAS, trabajo ligado a revisión del borrador; entrada libre no se rellena con turnos ya guardados. 17 focales, incluido doble envío, propiedad, estado y revisión. | Identidad de reintento distingue recuperación de una decisión de regenerar. |
| IQ-06 | Master real produjo 1.832 caracteres; validador aceptaba máximo 1.500, schema no declaraba el límite. | Schema alineado con límites canónicos de textos, evidencia, tiempos y listas. 11 pruebas de Master, incluida reparación por longitud sin cambiar fuentes. Llamada real 18 aceptada: 994 caracteres completos, ocho días y contrato preservado. | Schema y validador deben imponer el mismo contrato; no recortar raw ni relajar validación para aprobarlo. |

Evidencia y gates de la nueva historia: `docs/qa/AYNI_QA_IA_UX_COSTOS_2026-10-09.md`. Los resultados focales no sustituyen la regresión final. Límite privado del harness: el reloj se reiniciaba hacia atrás; se fijó un offset estable antes de continuar, sin modificar fechas históricas ni el reloj del sistema.

### IQ-07 — Tipo de taller sin enumeración en el schema (09.10.2026)

- Síntoma: la primera petición real devolvió «Gráfico-plástico», rechazada porque la categoría canónica es «gráfico-plástico». El fallback quedó bloqueado por el límite privado secuencial; no es otra llamada facturable.
- Causa raíz: schema aceptaba cualquier string mientras el validador exige uno de siete valores exactos.
- Solución: incorporar el mismo enum al schema, conservando el validador. La siguiente llamada Luna produjo el valor permitido y fue revisada antes de confirmar; raw anterior y costo conservados.
- Validación: taller directo, persistencia y Word 9/9; llamada real 22 aceptada, 21 rechazada. Prevención: verificar que las categorías del schema y del contrato coincidan.

### IQ-08 — Taller opcional confirmado fuera de la jornada (09.10.2026)

- Síntoma: el taller solicitado del segundo día persistía como actividad confirmada, pero Hoy solo mostraba la actividad principal.
- Causa raíz: la ruta directa nueva omitía el bloque de class_schedule_entries que sí inserta la confirmación histórica de la pareja.
- Solución: crear el horario del taller en la misma transacción de confirmación, bajo bloqueo del aula y validación de fecha, propiedad y revisión existentes. Sin migración ni generación adicional para guardar.
- Validación: regresión PGlite 2/2 comprueba horario, fecha, título, aula y ausencia de duplicados; flujo real posterior: taller 30 confirmado, un único horario creado y abierto desde Hoy con inicio/desarrollo/cierre.
- Prevención: verificar producto completo persistencia → agenda → apertura, además del documento guardado.

### IQ-09 — Actividad futura confundida con taller o con ejecución (09.10.2026)

- Síntoma: llamada 27 anunció «el siguiente taller» al referirse a otra fila de activity_route; llamada 29 abrió el taller afirmando que los niños ya habían probado y observado una actividad todavía prevista.
- Causa raíz: autoridad incompleta en las instrucciones: la preferencia de un taller de dibujo se confundía con el tipo de la siguiente actividad, y el plan recibido se redactaba como registro de ejecución.
- Solución: aclarar en la referencia existente de crear-actividad que las filas son actividades y que el taller es una solicitud separada; en el taller directo distinguir planificación y ejecución y mantener las alternativas docentes por falta de recursos. Cambios secuenciales, sin modificar raw ni modelo.
- Validación: actividad 28 aceptada tras verificación del prompt físico y continuidad a «siguiente actividad». Taller 30 aceptado: condición «si realizaron la prueba», alternativa sin sol y advertencia de no asumir ejecución conservadas. Las salidas rechazadas conservan costo y motivo privado.
- Prevención: auditar modalidad temporal y tipo de unidad en cada continuidad; un contrato JSON válido no acredita fidelidad pedagógica.

### IQ-10 — Sustento inaccesible con tres notas e información insuficiente (09.10.2026)

- Síntoma: el análisis real de tres notas indicaba información insuficiente; el formulario permitía elegir una letra pero no ofrecía el sustento exigido por el servidor.
- Causa raíz: la UI solo consultaba el conteo y la evaluación previa, omitiendo el estado del nuevo borrador de análisis.
- Solución: una condición compartida incluye la insuficiencia del borrador para mostrar el sustento y deshabilitar la confirmación hasta completarlo. El servidor mantiene su validación.
- Validación funcional: mismo análisis guardado, sin regenerarlo; aparece el campo, se registra sustento y B manual, se confirma y avanza al siguiente niño. Capturas privadas antes/después; regresión final 775/775 PASS.
- Prevención: las condiciones de presentación y habilitación deben consultar la misma fuente vigente que la autorización del servidor.

### IQ-11 — Conclusión cambia el estado de información (10.10.2026)

- Síntoma: llamada 34 devolvió sufficient cuando la valoración docente conservaba insufficient. El contrato rechazó la salida y el lote retuvo la conclusión anterior.
- Causa: la instrucción no hacía explícita la autoridad del estado guardado frente a la letra docente.
- Solución validada: indicar que analysis_status se conserva literalmente y que una letra confirmada no crea suficiencia. Reintento 35 únicamente del texto pendiente: insufficient, motivo concreto y hechos vigentes. 14/14 focales de conclusión; capturas y costos privados.
- Prevención: conservar estados canónicos también cuando la IA produce una prosa plausible; no relajar el contrato ni modificar raw.

### IQ-12 — Informe omite ejemplos e incluye el fin futuro del período (10.10.2026)

- Síntoma: salida 36 extendió la observación al 15 de mayo; 37 y 38 omitieron examples aunque había tres actuaciones confirmadas. El lote quedó sin confirmar.
- Causa: prompt no distinguía el intervalo del informe de las fechas observadas; schema permitía una lista vacía que el validador rechazaba si existían ejemplos.
- Cambios secuenciales: instrucción temporal y copia de ejemplos; después minItems=1 solo cuando todas las competencias seleccionadas tienen ejemplos, conservando el schema base y el caso sin ejemplos. No se modifica la evidencia, ni se atribuye una corrección manual a la IA.
- Validación: llamadas 39/40 aceptadas; 48 conserva contenido canónico con introducción sin fechas observadas futuras. Regresión final 775/775 PASS; todos los rechazos permanecen en ledger.

## Consolidación IQ-13 a IQ-21 — 10.10.2026

Contexto: historia local nueva, base 16c1d6f, rama codex/ayni-qa-ia-ux-costos-20261009. SHA correctivo: commit que contiene este registro, documentado en recibo privado posterior. Severidad retrospectiva: IQ-01/02/06/09/11/12/16/18 P1 por alterar fuentes o contrato pedagógico; IQ-03/04/05/07/08/10/13/14/15/17/19/20/21 P2. Ninguna salida rechazada crítica se incorpora al estado final. Los P1 reproducidos se corrigieron; los criterios pendientes del informe no se convierten en PASS.

| ID | Síntoma / causa raíz | Solución y validación | Prevención |
|---|---|---|---|
| IQ-13 | Descarga nativa fallaba por solicitud fuera de apiFetch/Origin autenticado. | Blob por cliente autorizado y Origin exacto; Auth/Origin focal, descarga IAB final Word/Excel con XML canónico igual. | Probar descarga navegador y ownership, además de HTTP. |
| IQ-14 | Ruido de matriz anual, sugerencias y acciones repetidas. | Lectura sin matriz; frases eliminadas, fila con dos CTA y detalle a pedido; QA desktop/móvil final. Reproducción visual antes/después, no RED automatizado. | Distinguir control pedagógico de presentación técnica. |
| IQ-15 | Observación corregida y conteos de historia mostraban texto anterior o duplicación. | Mostrar corrected_text vigente y contar revisión humana; cambiar nota desde móvil y verificar downstream. | Conservar raw y mostrar revisión actual por ID. |
| IQ-16 | Revisión de un niño creó cuatro versiones de informes vacíos de otros niños. Causa: fallback sin conclusión dependía de fingerprint de familia irrelevante. | Reutilizar fallback activo cuando sigue sin conclusión; metadata de fuente explícita. PGlite RED/GREEN y suite final; historia incorrecta conservada. | Comparar alumnos no afectados, no borrar versiones para ocultar error. |
| IQ-17 | Lote ready exponía borradores tras cambiar fuentes. Causa: estado durable no revalidaba fingerprint al presentar. | Proyección pública stale sin items, payload durable intacto; rutas latest/direct y prueba con dos resultados históricos inalterados. | Revalidar fuente al leer sin mutar historia; reintento explícito. |
| IQ-18 | Cambio manual B→A sin nuevo análisis convertía insufficient en sufficient. Causa: draft sin IA perdía metadata confirmada vigente. | Heredar análisis confirmado solo con mismo fingerprint y lock. RED/GREEN; llamada 44 rechazada no guardada; nuevo análisis explícito 45 y conclusión 46 delimitan fuente final. | Letra docente no crea evidencia ni suficiencia. |
| IQ-19 | Preparar día cinco y volver a Hoy mostraba jornada vieja. Causa: dashboard se cargaba únicamente al montar. | Actualizar al entrar a Hoy, abortar carga obsoleta; calendario→Hoy sin F5 muestra horario nuevo único. | Verificar retorno tras mutación y no solo recarga. |
| IQ-20 | Calendario usaba fecha de dispositivo, mostraba contenedor técnico y contaba días pasados como realizados. | Propagar todayDate del servidor, conservar selección explícita; excluir padre de talleres y conteo inferido. QA final desktop/móvil y F5 con fecha Apr7. | Fecha planificada no prueba ejecución ni logro. |
| IQ-21 | ASR con usage real seguía costándose solo por minutos. | Tarifa token input 1.25/output 5 por millón; preferir costo proveedor, después tokens válidos y finalmente duración. RED antes del fix y GREEN 5/5, suite final 775. Conciliación 52 calls sin desconocidos. | Conservar versión y ledger anterior; nunca sumar tokens y duración para la misma respuesta. |

Limitaciones de herramientas: zoom no verificable por atajo; micrófono sin autorización específica; secretos cloud no extraíbles por env pull. No son permisos para desactivar seguridad. El render final produjo ocho páginas válidas, aunque el wrapper PowerShell de foreach terminó con error de redirección; se verifican archivos/render individuales, no se atribuye exit 0 al wrapper.

## Harness RLS exige lectura docente de nonces del backend — 2026-10-11

- Síntoma: `scripts/test-supabase-rls.mjs` falla con `preparation_dispatch_receipts: exactly one policy` al aplicar las 73 migraciones.
- Causa raíz: clasificaba una tabla exclusivamente del servidor como registro pedagógico legible por docentes. La migración 20261006015005 ya habilita RLS y revoca todos los grants de public/anon/authenticated; cero políticas de cliente es el comportamiento previsto.
- Solución: conservar la migración y los permisos intactos; excluir esa tabla de la expectativa de SELECT docente y comprobar explícitamente que anon/authenticated carezcan de SELECT/INSERT/UPDATE/DELETE. No se cambió código de producto ni datos cloud.
- Validación: harness completo PASS con 73 migraciones, 66 tablas privadas y aislamiento de dos docentes en 16 tablas sensibles y Storage. No sustituye QA autenticado de RLS remoto.
- Prevención: distinguir datos pedagógicos con lectura por ownership de las tablas técnicas reservadas al backend; comprobar ausencia de grants, además de presencia de RLS.

## UX-01/02 · Salida de observación y correcciones sucesivas — 2026-10-11

- Síntoma: cerrar el diálogo descartaba texto pendiente sin aviso; una segunda corrección abría el RAW original en lugar del texto vigente.
- Causa raíz: cierre sin comprobación de borrador/preparación de foto y editor inicializado con `raw_text` aun cuando el listado incluía `corrected_text`.
- Solución: guarda compartida de trabajo pendiente, controles de salida consistentes y lectura de la corrección vigente. Original consultable; APIs, CAS y revisiones intactos. No se añaden cachés con datos de menores ni llamadas IA.
- Validación: RED/GREEN de ambos casos en Chromium con datos ficticios y componentes reales; 16 casos focales distintos PASS, incluyendo dos correcciones sucesivas en PGlite; typecheck/lint y builds Next/Vinext PASS. Detalles en el informe de implementación.
- Prevención: probar segunda edición además de primera; proteger cada ruta de salida y mostrar versión vigente sin modificar el original. No equiparar trabajo en memoria con autosave persistido.

## UX-03/15 · Período incorrecto y edición evaluativa pendiente — 2026-10-11

- Síntoma: entre períodos aparecía el bimestre 1; cambiar niño o salir de un lote permitía descartar textos sin advertencia. La revisión moderna solo exponía confirmación, no guardado de borrador independiente.
- Causa raíz: fallback al primer período; formularios locales sin guardas propias y recarga de detalle dependiente de cualquier cambio de `rows`.
- Solución: selector compartido explícito/vigente/último terminado, portada sin ceros ficticios; guardar borrador por API existente con CAS, separar confirmación y proteger navegación/regeneración. Recarga de detalle solo por contexto o actualización deliberada.
- Validación: RED/GREEN en Chromium, recarga recupera borrador sin confirmar nivel y lote editado; 35 pruebas focales, typecheck, lint y Next PASS. Ningún dato real, migración o llamada IA pagada.
- Prevención: probar fechas de gestión entre períodos y salidas internas de formularios, además del menú principal; progreso guardado del job no significa que todas las ediciones locales estén guardadas.

## UX-04 · Edición manual bloqueaba decisiones posteriores de Mi año

Síntoma: después de tocar contexto, el chat ya no incorporaba decisiones nuevas; recargar antes de preparar perdía correcciones e historia. Causa: un booleano global bloqueaba todo el contexto y este solo se persistía al preparar. Solución: importación por turno, borrador privado con CAS/autosave y recuperación por lectura. Las fuentes actualizadas conservan el borrador; la retención cubre el año escolar. Validación: 20 pruebas focales PASS y RED/GREEN de componentes reales con datos ficticios (edición, eliminación, nuevo turno, recarga y respuesta incierta). Prevención: separar importación de decisiones de las ediciones docentes, bloquear preparación durante respuesta/guardado y no prometer guardado antes de su confirmación.

## UX-05 · Atribución de captura y revisión de matrícula

Síntoma: una captura pendiente podía cambiar de niño; una lista CSV se enviaba sin revisión previa. Causa: acciones locales sin guarda y POST directo. Solución: guarda de captura/corrección y revisión explícita de lista con aviso de coincidencias; no hay deduplicación automática. Validado con navegador ficticio y 52 pruebas focales de servicios. Prevención: revisar antes de importar y mantener texto, niño e identidad de reintento ligados hasta guardar o descartar deliberadamente.


## 2026-10-12 — El cierre de matrícula no dejaba check persistente

Síntoma: tras pulsar «Terminé de registrar a mis niños», etapa 2 seguía numerada al regresar/recargar. Causa: callback solo navegaba y portada solo calculaba completado para etapa 1; faltaba escritura explícita. Solución: confirmación por aula en preferencias docentes existentes, servidor con ownership/RLS, bloqueo/transacción/idempotencia; lectura en dashboard y check por estado confirmado. Validado: pruebas focales, HTTP local error/reintento, recarga/nuevo montaje, preservación de tres niños y un borrador ficticios, typecheck/lint/Next/Vinext. No se infiere ni se rellena estado remoto por conteo. Prevención: comprobar persistencia de cada acción de finalización y no usar navegación como evidencia de guardado. QA cloud autenticado queda pendiente de ingreso manual.

## 2026-10-12 — Entrar a Mi año podía iniciar IA durante preparación

Síntoma: continuar desde preparación con cobertura incompleta hacía POST de conversación al abrir Mi año. Causa: montaje del componente recuperaba GET y, ante 404/409 o conversación interrumpida, iniciaba/reanudaba automáticamente. Solución mínima: flag de preparación inicial propagado por los contenedores existentes; lectura sin POST y botones explícitos Comenzar conversación/Retomar respuesta. No cambian backend, prompts ni generación anual. Validado: UI local con GET 404 y conversación interrumpida, botones de advertencia, acceso con 100 %, 129 lecturas finales sin escritura/IA, persistencia de tres niños y borrador, checks técnicos PASS. Primera exploración produjo un registro interrumpido solo local, conservado; ninguna mutación cloud. Prevención: verificar solicitudes al navegar y separar recuperación de trabajo guardado de acciones que lo generan.


## UX-QA-09 — Registro guiado lejos del criterio y reintentos sin identidad (2026-10-12)

Síntoma: Registrar observación y selección de experiencia desplazaban al listado inferior; cuatro filtros/niños separados obligaban a recuperar criterio, y el guardado recargaba workspace. Causa: formulario global debajo de todas las tarjetas y ausencia de ID estable por solicitud. Solución: aspecto editorial fijo abre modal en contexto, todos los niños disponibles con prioridad por competencia, respuesta compacta; UUID y lock transaccional existentes protegen replay/conflictos. Error previo y respuesta perdida probados en PGlite sin perder texto/foto; concurrencia crea una sola fila, nueva intención permite otra. No IA por guardado. Prevención: pruebas de selección/merge y servicio idempotente; preservar guardas y no limpiar formulario hasta confirmación servidor.

Foto guiada no tenía persistencia propia: tres columnas opcionales, storage privado reutilizado y ruta owner-only. CHECK exige tipo y huella no nulos junto a ruta, evitando la semántica UNKNOWN de CHECK SQL. No desplegar antes de aplicar migración aprobada; no ocultar este requisito con un UI funcional a medias. Columnas cloud siguen pendientes de autorización y no hay DDL remoto en esta fase.

## UX-QA-10 — Portada como cuatro formularios y carga de progreso sin límite (2026-10-12)

Síntoma: las cuatro filas desarrolladas competían visualmente; error lento podía dejar barras consultando sin fin. Causa: render simultáneo y fetch de cobertura sin plazo. Solución: reutilizar timeline con único panel y selección por estados reales; timeout/error/Reintentar en portada. Visual 1280 y 390 px, teclado/recarga y navegación habitual confirmada por GET ficticio comprobadas. Nunca interpretar error como 0 % ni completar matrícula por tener niños.

Validación de build volvió a encontrar WasmHash._updateWithBuffer en cache incremental webpack de Windows ya documentado. Apartar únicamente .next/cache/webpack bajo .local tras validar rutas absolutas permitió build limpio; no cambio de configuración/framework ni borrado de datos. No confundir fallo de cache con error pedagógico. Recibo final pendiente de cierre.

## Fotografías — reducción excesiva y pérdida de transparencia (2026-10-12)

Síntoma: procesador previo recodificaba toda imagen a JPEG y reducía sucesivamente calidad (82/68/54/48 %) y resolución al superar el presupuesto; podía afectar texto y convertir alfa en blanco. Causa: presupuesto rígido mezclaba compresión fotográfica con transparencia/retratos. Solución: reutilizar helper con WebP/JPEG 80 %, EXIF explícito, 1600 sin ampliación, 500 KB blando/3 MB máximo existente, PNG para alfa y presupuesto independiente de retratos. Cámara y archivos comparten preparación; evidencia cotidiana deja su encoder duplicado. Validación: 22 comprobaciones reales de navegador más guardado/recuperación exacta y replay concurrente local, 12 focales y código de Production compatible con columnas nulas. Prevención: no bajar calidad/resolución de evidencia sólo para cumplir 500 KB, no usar este helper para logos, conservar tests EXIF/transparencia/bytes y distinguir medición local de cloud.

## 2026-10-12 — Límite de conexiones durante smoke de Production

Síntoma: tras publicar afeb45e, primera tanda de diez lecturas simultáneas dio un 500 en GET privado de fotografía guiada; otros nueve controles PASS. Causa observada en log Vercel: EMAXCONNSESSION, pooler Supabase en modo sesión con máximo de 15 clientes. El adaptador serverless ya limita cada pool a una conexión/idle de un segundo; no se atribuye a duplicación de fotografías ni a cambios de permisos. Reintento de la tanda dio diez PASS y ruta afectada 401 sin sesión como corresponde. Scan final una entrada de error. Estado: recuperado en reintento, causa permanente no corregida en esta publicación. No cambios backend/pooler ni mutaciones QA. Prevención: distinguir saturación del pooler de fallo de autorización; conservar recibo del error y analizar capacidad/concurrencia sólo dentro de una tarea autorizada, sin afirmar que un reintento prueba resolución permanente.

## EX-01/02 — Continuar a Mi año y matrícula sin recarga (2026-10-12)
Síntoma: continuar podía no navegar y confirmar matrícula requería recargar. Causas: callback omitido durante preparación, planningTarget residual y perfil inicial sin classroom_id. Solución: callback anual explícito, limpieza de destino y classroom_id en dashboard; autosave/confirmación reales antes de avanzar. Validación: aula ficticia nueva creada por interfaz hasta conversación anual, doble clic, recuperación del resumen y pruebas focales PASS. Prevención: probar flujo fresco completo y no sólo URL/botón.

## EX-03 — Listado guiado desactualizado y borrador tras fallo IA
Síntomas: registro guiado recién guardado no aparecía en lista compartida; preparar nueva versión para IA podía dejar borrador sin correcciones docentes si fallaba el proveedor. Solución: refrescar lista por registros confirmados y persistir correcciones en versión nueva antes de solicitar IA. Autosave no limpia texto ante error. Servicios focales y build PASS; error local no se declara como éxito de IA remota.

## EX-04 — Retiro incompatible con el enum cloud
QA por interfaz detectó error al retirar a un niño ficticio: el servicio escribía inactive, válido en esquema local text pero inexistente en classroom_status cloud (draft/active/archived). No hubo borrado. Solución: mantener API inactive y mapear persistencia a archived; lectura/recuperación admiten también filas locales históricas inactive mediante cast text. Sin migración ni cambio de permisos. Seis pruebas focales PASS, incluyendo enum cloud real, CAS, aislamiento y conservación de historia. Prevención: probar servicio con tipos oficiales además del esquema local flexible.

## AN-01 — Estado del resumen perdido al recargar durante IA
Causa: ai_snapshot conservaba procesamiento/salida, pero su estado no llegaba al editor y una petición de un editor desmontado podía intentar guardar después. Solución focal: publicar estado/expiración, consultar sin regenerar y aplicar propuesta guardada solo expresamente; retorno tardío desmontado no persiste correcciones. Cache/lease y validación de fuentes se conservan. Focales servidor, typecheck/lint/build PASS; recuperación UI real se verificará con una generación. Prevención: distinguir propuesta durable y texto docente y medir proveedor/DB separadamente.
# AN-02 — Cambio local rechazado por eco de decisiones globales (13/10/2026)

- Síntoma: Aplicar cambios desde Cambiar propuesta con Ayni conserva la indicación, pero devuelve invalid_scope; el error quedaba oculto fuera del panel.
- Causa: el esquema del parche local exigía regenerar/copiar oportunidades cotidianas e interpretaciones del año y comprobaba igualdad literal. Esta escritura no pertenecía al alcance autorizado de la propuesta.
- Solución: request/esquema focal incluye solo replacements; servidor conserva campos globales. Igual autorización de IDs, propuestas protegidas y validadores; respuesta con campos globales extra se rechaza. Error renderizado dentro del Sheet.
- Prevención/validación: pruebas de alcance, propuestas ajenas y pendientes, conservación de decisiones globales y rechazo de campos extra. Medición y validación UI cloud en el informe de Mi año; no se regeneran los 15 tramos para probar el arreglo.
- AN-03 (13/10/2026): durante QA real, el título solicitado «Construimos lugares para jugar» llegó como «[persona] lugares para jugar». Causa: vocabulario cerrado de privacidad no incluía ese verbo ni varios imperativos habituales. Corrección mínima: diez verbos explícitos, conservando neutralización previa de nombres conocidos y filtros de nombres desconocidos/contactos. Prueba de título, instrucciones y privacidad; validación UI registrada en el informe de Mi año. No cambia permisos ni política de datos.
- AN-04 (13/10/2026): proyecto con Plan Maestro map_review todavía decía Por preparar y la recarga olvidaba la propuesta abierta. Datos y trabajo sí eran durables. Corrección focal: estado Preparado para revisar cuando corresponde y UUID seleccionado en ubicación usando helper existente; sin nuevas consultas/IA ni modificación de registros. Verificación UI de recarga y reingreso en informe Mi año.
- DIA-01 (13/10/2026): QA real del primer proyecto: la vista preparada omitía fundamento/materiales y ajustes no tenían cancelación. Se exponen datos existentes en detalle y Cancelar ajustes vuelve al estado guardado, sin regeneración. Validación cloud en informe del primer día.
- DIA-02 (13/10/2026): Preparar día perdía la selección tras recargar; ocultaba fecha/materiales y permitía cambiar proyecto/criterio durante operaciones, sin proteger texto pendiente. Se conserva selección en URL y se reutiliza useUnsavedWork, controles disabled en operación, fecha/materiales desde datos existentes. No se guarda contenido privado en navegador, no hay peticiones adicionales, migración ni IA de recuperación. Verificación UI y límites en informe del primer día.

### DIA-03 — Documento diario no abre en Supabase aunque está confirmado (13/10/2026)

Síntoma: biblioteca lista actividad, Abrir devuelve 500 reproducible. Causa raíz: UNION de observación tipo text con evidences.type enum evidence_type; fixture local simplificaba el enum a text. Solución: proyección ev.type::text, sin migración ni datos cambiados; consulta cloud aislada PASS y ocho pruebas de biblioteca/Word/autorización PASS con fixture enum. Prevención: conservar tipo real en regresión y smoke funcional de documento con Supabase. Vista HTML también muestra criterio/evidencia/taller existentes en proyección, sin IA ni nuevas consultas.

### CHAT-01 — Ediciones válidas de contexto podían fallar con conflicto

Síntoma: en QA local, tras editar dos decisiones y añadir un proyecto, el autosave respondía 409 aunque la profesora no había cambiado de pestaña. Causa: el componente de conversación conservaba una lectura previa y la enviaba de nuevo al hook, reduciendo la revisión que había avanzado mediante PUT. Solución: mantener revisión monótona para la misma conversación; ante respuesta incierta recuperar la revisión vigente sin reemplazar el texto local y permitir reintento explícito. Validación: regresión de lectura 7 tras revisión 9, edición/guardado real por interfaz, generación y GET del año conservando decisión corregida, recursos e historia. Prevención: diferenciar versión del diálogo y del contexto, no usar una respuesta antigua como autoridad de escritura.

### CHAT-02 — Recuperar una carga fallida dejaba la entrada vacía

La primera lectura falló en Production por EMAXCONNSESSION, límite de 15 clientes del pool Supabase en modo sesión, ya registrado anteriormente. El reintento recuperaba los datos, pero la UI no recomputaba si debía abrir el chat o el año guardado. Se conserva la lectura existente y se recalcula ese estado tras el reintento, con la misma condición del montaje inicial. Validación local: fallo 503 sostenido al cargar, retirada de la simulación, botón de recuperación y chat visible sin recargar la página. Build/typecheck/lint de la corrección PASS. Esto corrige la recuperación de interfaz, no la capacidad del pool; no se cambian infraestructura, credenciales, variables ni permisos.

### DEP-POOL — Temporizadores de conexiones suspendidos

Después del reintento siguió apareciendo EMAXCONNSESSION también al recuperar sesión. Se detectó ausencia de attachDatabasePool en el adaptador Vercel; el cierre por idleTimeoutMillis solo depende de un temporizador, que Vercel documenta como suspendido durante inactividad de funciones. Se incorpora el vínculo oficial para mantener la instancia activa hasta liberar clientes ociosos. Once pruebas de adaptador/paridad/autorización PASS; incluye transacción/release, TLS, un único vínculo y ausencia de dependencia de Vercel en modo standalone. El fixture de paridad necesitó emular auth.jwt, función usada por la migración admin-only ya existente; no se edita esa migración ni se relajan sus políticas. Build/typecheck/lint PASS. Prevención: verificar ciclo de vida serverless además de max/idleTimeout, y registrar comprobación cloud antes de declarar resuelto el incidente.

### LIST-01 — Guiadas sin acciones equivalentes a libres

Síntoma: una observación guiada no tenía los tres puntos ni retiro; el menú libre exigía otro clic en su disparador. Causa: dos implementaciones de acciones y ausencia de retiro guiado en servidor. Solución: componente compartido accesible con cierre exterior y ruta DELETE autorizada que registra evento privado, sin borrar original/foto. Lectores actuales filtran esos eventos; versiones históricas quedan preservadas. Validación: UI local de apertura/clic fuera/retiro, CAS, propiedad ajena, replay, exclusión en cobertura/contexto/trayectoria/progreso/fuentes anuales y conservación de original/media. Prevención: probar operación vertical, no ocultar solo la tarjeta. La regresión de evaluación usa ahora los campos reales created_by/preferences; un fixture sin ellos producía fallos de esquema, no una incompatibilidad de Production.

### AN-05 — Mi año reabría preparación o permitía regeneración completa

Síntoma: retroceder/avanzar podía reabrir preparación; además existía Volver a preparar el borrador. Causa: entrada basada en cantidad de propuestas futuras y estado/TTL de job, aunque ya había calendario durable; prepare/generate no reutilizaban ese año. Solución: detectar el plan guardado (incluido año sin futuro disponible), cargarlo sin consultar el job terminado y devolverlo desde ambas rutas bajo el lock existente. Se elimina la regeneración completa desde la UI; cambios focales usan revisión existente. Validación: 46 pruebas focales PASS, replay antes/después de confirmar y con job expirado sin generación extra, selección histórica y UI de vuelta/recarga con IDs conservados.

### AN-06 — Confirmar para preparar quedaba en Mi año

En QA local la confirmación persistía, pero navegar al proyecto en el mismo callback encontraba la guarda global todavía ocupada. Se difiere la navegación hasta busy liberado, usando efecto y microtarea cancelable. Confirmación/reload terminan primero. Validación: interfaz real local confirma copia de revisión y abre el proyecto elegido; la generación inicial sigue siendo una sola solicitud al proveedor ficticio. No se cambia la guarda ni se omite confirmación docente.

### AN-07 — Borradores del proyecto y acceso a actividades
Síntomas: texto/fechas previos a preparar podían perderse al navegar; una lectura del calendario al crear el proyecto podía reemplazar fechas escogidas; el desplegable de ideas podía cerrarse al escribir; la misma bandera de protección ocultaba abrir y editar; botones finales excedían cinco píxeles en móvil. Causas: ausencia de baseline/guarda, respuesta asíncrona sin identidad ni señal de interacción, apertura ligada a changing, autorización visual compartida y flex sin wrap. Solución: baseline de texto/fechas y useUnsavedWork, secuencia de lectura con ref de selección, apertura explícita, política separada abrir/editar y wrap de acciones. Movimientos esperan liberación de busy antes de navegar. Validación: 34 regresiones focales, QA UI con cancelación de salida y conservación de texto/calendario, secuencia de nueve fechas recuperada, edición/recarga, confirmado conservado al copiar; móvil 390 px sin overflow. La cancelación se automatizó mediante confirm=false exclusivamente en el fixture; el aviso nativo real fue cancelado por el usuario. Prevención: distinguir restricciones de edición del acceso y verificar borradores antes de navegación/reentrada.

### AN-08 — Cambiar propuesta exigía demasiadas operaciones y no previsualizaba
Síntoma: Cambiar con Ayni abría panel con alcance global, agregar/quitar indicaciones y aplicar sin ver la propuesta resultante. Causa: interfaz de batch anual reutilizada para un solo proyecto; endpoint apply escribía el borrador inmediatamente. Solución: diálogo directo y candidato durable separado, reutilizando generación scoped y validación existente; aceptar por ID/CAS/hash, cancelar sin reemplazar propuesta. Guardas servidor congelan fechas/otros proyectos y reevalúan trabajo protegido al aceptar. Validación: 42 pruebas incluyendo ocho subcasos de vista previa, propiedad, candidato inventado, cancelación, versiones, concurrencia, respuesta fuera de alcance y protección sobrevenida. QA UI/API/PGlite con 35 alumnos ficticios confirma generar/revisar/editar/cancelar/aplicar/reabrir y copia de vigente. Prevención: toda acción que dice revisar antes de aplicar necesita un candidato separado de contenido y una aceptación explícita validada en servidor.

### AN-09 — Publicación completa escribía autorización dentro del contrato pedagógico
Síntoma: validación V3 rechazaba el bloque después de generar las diez actividades. Causa: metadata operativa añadida a details con esquema estricto. Solución: publication_authorization se guarda en generation_metadata, con alcance/teacher/fecha y reviewed_individually=false; contenido pedagógico conserva contrato. Validación: QA real aislado recupera/publica las diez respuestas sin otra llamada; fallo de segunda confirmación revierte todo el bloque. Prevención: separar provenance operativa de DTO pedagógico.

### AN-10 — Nueva versión futura perdía vínculos con criterios ya registrados
Síntoma: “El mapa V3 tiene vínculos incompletos o duplicados”. Causa: dependientes modernos vacíos perdían criterion_id de la fuente, mientras blueprints protegidos conservaban referencias anteriores. Solución: tomar criterios de la versión fuente; mantener identidad y texto de criterios referidos por días protegidos. Validación: regresión V3 y preparación de nueve días futuros, primer día/observación/documento y año intactos. Prevención: conservar significado e identidad de referencias históricas, no renumerarlas ni reescribir criterios registrados.

### AN-11 — Volver no borraba el parámetro de consulta
Síntoma: volver desde actividad/documento mantenía el mismo enlace. Causa: setter de useWorkspaceParam rechazaba el fallback vacío. Solución: permitir seleccionar explícitamente fallback; validación de otros IDs intacta. Validación: UI móvil vuelve al mismo año y lista de documentos; recarga conserva consulta por ID.

### AN-12 — Calendario contaba actividades reemplazadas y permitía mover el bloque aceptado
Síntoma: dos actividades por fecha después de ajuste futuro. Causa: lectura incluía todas las versiones archived aunque ya no ocupaban agenda; reprogramar no distinguía autorización del proyecto completo. Solución: archived solo se muestra si conserva bloque de agenda; documentos mantienen toda la historia. Política completa bloquea reprogramación individual servidor/UI, mantiene registro de ejecución. Validación: siete pruebas calendario, HTTP público bloqueado, UI una actividad por fecha y consulta completa. Prevención: separar archivo histórico de programación vigente y validar secuencia en servidor.

### AN-13 — Preparación detenida en 0 en Vercel (14/10/2026)
Síntoma informado: varios minutos en 0 de 10. Causa encontrada: worker se iniciaba únicamente por temporizador standalone; AYNI_SERVERLESS lo desactivaba y ninguna solicitud del puente disparaba la cola. Solución: Next after activa el ejecutor durable existente tras respuesta autenticada; conexión worker independiente y continuación privada firmada, con leases y checkpoints existentes. Progreso muestra etapa real y actividades guardadas; no inventa un porcentaje de tiempo ni notificaciones. Validación: bridge real local en modo serverless, sin temporizador, prepara/publica nueve actividades y recupera sin proveedor adicional; pruebas de presupuesto/firma/replay y ownership. Flujo con proveedor real autenticado cloud pendiente, no declarar resuelto por benchmark ficticio.

### AN-14 — Fechas conservadas rechazadas como cambio global
Síntoma: invalid_scope al preparar una revisión focal pese a conservar las fechas. Causa: comparación JSON.stringify sensible al orden de claves tras JSONB y comparación contra una fuente diferente del snapshot refrescado al copiar. Sustituir la tarjeta por otra de Biblioteca además cambia legítimamente IDs/asignaciones y conserva la anterior. Solución: igualdad estructural y baseline/revisión de copia focal; validación específica de sustitución que autoriza solo ese ID/asignación, fuentes docentes de creación y archivo literal del anterior. Validación: regresión JSON con claves reordenadas, fechas/otros proyectos/fuentes alterados rechazados; crear, reemplazar, ajustar y preparar con nueve días desde UI/HTTP aislados. No se eliminan las guardas ni se fuerzan fechas producidas por IA.

### AN-15 — Proyecto aceptado figura terminado con cero actividades (14/10/2026)
Síntoma cloud: Ayni está preparando tu proyecto / 0 de 10, sin animación ni error. Consulta de solo lectura al job afectado confirma status=succeeded, stage=ready, approved_at=null, items=0; proyecto draft/map_review con Plan Maestro y diez fechas, cero actividades. Plan anual activo y revisión coincidente. La interfaz asumía que succeeded significaba bloque publicado; no son equivalentes. El contrato del ejecutor anterior se detenía al guardar Plan Maestro. No se atribuye a un proceso concreto sin log que lo identifique.
Solución: un bloque aceptado solo termina con approved_at persistido. Lectura del trabajo propio recupera una terminación prematura usando el mismo ID/checkpoints, únicamente con fuente/versión/proyecto/propietario vigentes y Master existente. Una llamada pendiente incierta mantiene confirmación explícita de posible repetición. Estado incompatible se muestra pendiente, con recuperación; no como carga infinita. Confirmados publicados no se reinician, y Plan Maestro no se regenera.
Validación local: reproduce succeeded/ready/0, lectura API recupera queued, prepara diez actividades con diez respuestas fixture, no vuelve a preparar Master y publica atómicamente; replay/proveedor/propietario incorrecto/revisión cambiada/llamada incierta/concurrencia/publicación incompleta protegidos. 11 pruebas focales, tsc/lint/build PASS. La lectura real cloud no escribe ni llama a IA; recibo de recuperación autenticada se registra en docs/qa/AYNI_PREPARACION_DETENIDA_2026-10-14.md.

Validación cloud posterior al login docente: recuperación del mismo job completó las diez actividades aceptadas; succeeded/ready y approved_at, diez active con criterios y calendario exacto. UI lista/consulta completa/regreso PASS, avance continúa fuera de Mi año, Master/año conservados. Apareció timeout transitorio en una consulta durante publicación; la publicación terminó y la siguiente lectura recuperó la lista sin reintento ni regeneración. No prueba eliminación de futuros problemas de conexión. Production intacta; detalle y evidencia en el informe AN-15.

### AN-16 — Calendario previo poco visible y consulta formal sin secuencia
Síntoma: calendario antes de Master no quedaba visible; cliente antiguo podía iniciar sin selección explícita. Consulta reutilizaba párrafos formales y ruta superior interceptaba activityConsult sin lista de navegación. Solución: foco/scroll al calendario existente, confirmación de días obligatoria para nueva aceptación, replay existente conservado; lectura visual sin cambiar textos, lista autorizada de actividades desde documento y navegación consistente. Validación: nueve fechas seleccionadas→nueve actividades, feriados/fines de semana/fuera del tramo bloqueados, no generar antes de confirmar; consulta/siguiente/Word, regresiones propietario y texto íntegro PASS. Sin alterar bloques existentes, motores, calendario oficial o datos cloud. Detalles/límites en informe de calendario/actividad visual.


### AN-17 — Apertura lenta, Biblioteca oculta y documentos modernos no encontrados
Síntomas: diálogo vacío/deshabilitado al abrir; Crear otro proyecto tarda más; falta reemplazo tras preparar; imagen anterior parece representar la nueva propuesta; una competencia y materials=supports; versión 3 de Documentos no abre.
Causas: apertura esperaba dos recuperaciones y el cambio de modo copiaba el año; se equiparaba preparado con trabajado; fuente visual no rotulada; validación solo exigía competencias solicitadas explícitamente; catálogo/lectura anual filtraban formatos legacy. Además la creación pendiente se recuperaba globalmente para todo el año.
Solución: saludo local nominal, restauración no bloqueante y copia diferida; mensajes optimistas y auto-scroll responsive; sesiones por propuesta; etiqueta Se reemplazará y pictograma del candidato; dos competencias con oportunidades completas y materiales concretos; permisos de sustitución basados en historia real, con publicación atómica y auditoría; consulta journey_version y lectores visuales existentes. La navegación principal regresa al año vigente; no se pierde el bloque preparado al abrir una revisión idéntica.
Validación: 68 pruebas focales PASS y reejecución de los módulos afectados tras ajustes; QA HTTP aislado crea y publica ocho actividades con ocho fechas, conserva documentos anteriores y valida bloqueo por ejecución. UI escritorio/móvil, envío inmediato con indicador, biblioteca visible, versión 3, Hoy/observación/Word PASS; treinta y cinco alumnos ficticios, cero llamadas pagadas. No modificar retrospectivamente datos históricos ni desactivar protecciones para corregir presentación. Informe: docs/qa/AYNI_CHAT_HOY_DOCUMENTOS_2026-10-14.md.


### AN-18 — Hoy repetía consulta y permitía terminar al comienzo; cobertura y materiales incompletos
Síntomas: abrir en Hoy conservaba la ficha de consulta; materiales colapsados; terminar visible desde el primer momento; captura fotográfica poco reconocible; Biblioteca y actividades sin competencias visuales. Un niño con una observación de octubre aparecía Sin registro al adelantar una actividad de un bimestre posterior.
Causas: la guía dependía del inicio real, materiales usaban details, checkpoint calculaba solo preparation.steps y no los momentos canónicos V3; el cierre no comprobaba el último momento. Cobertura de captura reutilizaba la ventana bimestral de evaluación, que excluía una observación válida del año. Mínimo de competencias aplicado al chat, pero no a generación inicial/preparación; materiales admitían marcadores españoles por definir.
Solución: consulta autorizada aporta guía de solo lectura, confirmación off-date antes de start_today, materiales visibles, avance persistido y guardas de secuencia/cierre bajo bloqueo de aula. Formulario cotidiano con búsqueda/fotos privadas y fuente libre explícita, sin reutilizar almacenamiento diagnóstico. Contador anual autorizado incluye diagnóstico, evidencias y atribuciones docentes vigentes; no confunde conteo con suficiencia/logro. Dos competencias con oportunidades reales en generación inicial y nuevas preparaciones, reparación acotada y revisión de legacy sin reescribir historia. Validación de recursos concretos y fallback de lectura exclusivamente desde recursos guardados del propio proyecto, sin inventario inventado.
Validación: 83 regresiones focales y 32 de evaluación PASS; flujo UI/HTTP aislado de 35 alumnos, foto privada, libre sin criterio, cierre prematuro rechazado, último momento recuperado tras recarga, cancelación sin ejecución y confirmación off-date preservando programación; Word con notas nominales. Capturas escritorio/móvil sin overflow. IA real y permisos de cámara/dictado no probados. No migraciones ni writes pedagógicos cloud. Recibo de Preview separado en informe AN-18.


### AN-19 — Biblioteca inutilizable cuando existe trabajo registrado
Síntoma: Usar esta propuesta aparecía deshabilitado al intentar recuperar la anterior. Causa: se aplicaba al proyecto entero la restricción de sustitución completa, incluso habiendo días futuros disponibles. Solución: restauración literal acotada al mismo tramo, historia intacta y calendario excluyendo días protegidos; publicación omite esas filas y retira solo las mutables. No se eliminan guardas generales. También se impide que un job antiguo aprobado oculte Preparar después de una nueva restauración. Fuentes nuevas de una copia focal literal se actualizan junto al baseline, tras probar alcance; no se genera otro año ni se reinterpretan registros. Validación: PGlite y flujo UI/HTTP aislado, siete actividades nuevas, tres históricas conservadas, segunda recuperación/confirmación y Word existentes; taller vinculado protegido. Prevención: pruebas de tarjeta inventada/alterada, fechas, protección docente, colisiones e idempotencia.

### AN-20 — Observar oculto en consulta y asistencia que fallaba al guardar
Síntomas: tarjeta de criterio sin acción antes de iniciar Hoy; asistencia devolvía 500. Causas: preview suprimía onObserve y el diálogo dependía de un bloque del día; ruta de asistencia usaba today fuera de su ámbito. Solución: consulta pasa criterio/momento reales a OrdinaryObservationDialog y libre sin criterio; guardar no inicia la actividad. Asistencia usa fecha Lima/reloj QA existente y vuelve a cargar estados propios al abrir, evitando convertir faltas guardadas en presentes por defecto. Validación: observación nominal persistida sin ejecución, Word conservado, 35 asistencias guardadas y falta recuperada en UI; móvil 390 px. Prevención: captura de consulta reutiliza autorización/validadores ordinarios; no prueba con niños ni fotos reales, ni se asignan valoraciones automáticamente.


### AN-21 — Saludo desactualizado y siguientes actividades ya realizadas
Síntoma: el saludo podía conservar la hora de la carga inicial; un próximo listado calculado solo por fecha prevista podía anunciar una actividad ya terminada anticipadamente. Causas: reloj del dashboard estático y proyección sin ejecución real. Solución: saludo de presentación con America/Lima, actualización al volver a la pestaña/cada minuto; lectura del último estado de ejecución y exclusión de terminadas/omitidas en las tarjetas próximas. El calendario histórico conserva sus filas. En móvil, Revisar observaciones usa icono y nombre accesible para reducir la presión sobre el encabezado. Validación: límites horarios Perú, agenda con finalizada/cancelada/versión archivada, 32 pruebas focales y 15 repetidas finales, typecheck/lint/build, UI escritorio/móvil aislada sin overflow. Prevención: separar fechas previstas de ejecución y probar ambos estados; no usar fechas/nombres ficticios del mockup en el producto.


### AN-22 — Inicio tardío dejaba tramos anuales vacíos y copia futura no cambiaba el bimestre
Síntomas: crear Mi año en octubre omitía las propuestas anteriores; reutilizar una propuesta pasada guardaba la copia futura pero la pantalla seguía en B1. Causas: applyPlanningHorizon eliminaba IDs/fechas anteriores y generación solicitaba solo propuestas futuras; filtro del período no se actualizaba junto al nuevo ID. Solución: contrato full_year para generaciones nuevas, quince previsiones sin ejecución pasada, copia con ID nuevo hacia futuro y actualización conjunta de período/propuesta. Guardas de preparación/ejecución y pasado de solo consulta. Versiones anteriores conservadas. Validación: 70 regresiones, typecheck/lint/build, UI/HTTP con 35 niños ficticios, copias futuras publicadas, cero actividades en origen pasado y Word anual completo. Prevención: distinguir propuesta anual de actividad ejecutada y comprobar juntos ID y bimestre de destino.
El primer build falló por importar node:crypto desde annual-year-editor, compartido por cliente. Se sustituyó por globalThis.crypto.randomUUID; build y navegador se repitieron con éxito. No introducir imports exclusivos de servidor en helpers compartidos.


### AN-23 — Secuencia repetida y captura libre sin decisión previa en Hoy
Síntomas: botón guiado general fuera del criterio, Inicio/Desarrollo/Cierre completos repetidos dentro del desarrollo y selector sin cantidades exactas. Captura libre no permitía revisar competencias antes de guardar. Causas: bloque development recibía child_actions íntegro y el renderer volvía a descomponerlo; captura cotidiana usaba solo has_evidence y relegaba la atribución al diálogo posterior. Solución: proyección por apartados explícitos, acción junto al criterio, conteo anual exacto/orden ascendente y selector visual compartido con Diagnóstico. Preview reutilizado para sugerencia textual, decisión docente con atribución existente; sin fotos a IA ni competencia implícita. Una confirmación fallida conserva raw/media y se reintenta separadamente. Validación: 79 regresiones y QA UI/HTTP aislado de 35 niños, 0/1/2, anulación/pendiente excluidas, guiada 2→3, libre con foto en otra competencia, fallo/reintento sin duplicado, unclassified, Word completo y móvil sin overflow. Prevención: pruebas de etapas literales, procedencia válida y conteos desconocidos; ningún relleno pedagógico ni reescritura histórica.

### AN-24 — Un taller elegido no podía abrir ejecución en Hoy

Síntoma en QA del nuevo catálogo: la guía y el Word abrían, pero Desarrollar ahora devolvía «Abre una actividad confirmada y programada de tu proyecto». Causa: startActivityToday exigía block_type=activity; el taller usa correctamente block_type=workshop. Solución: admitir además talleres activos con schema=library-workshop-v1, conservando propiedad, bloqueo de aula, fecha real separada, unicidad de jornada e historia. No se amplía la autorización de talleres legacy ni se mueven fechas. La navegación usa la guía común solo cuando existe; los históricos sin bloques pedagógicos mantienen su lector anterior.

Validación: taller futuro iniciado en otra fecha lectiva, momentos en orden, cierre prematuro y saltos rechazados, criterio/momento y observación nominal conservados, Word con registro, fechas prevista/real distintas y prioridad por ejecución real. Regresiones de ejecución de proyectos pasan. También se valida que el cuerpo HTTP no pueda sustituir el reloj de servidor para autorizar fechas pasadas. Pruebas exclusivamente ficticias, sin mutaciones de datos cloud.


### QA-ANUAL-01 — Reloj perdido y confirmación prematura al preparar

Síntoma: preparar un proyecto futuro con el reloj QA devolvía trabajo protegido; una fecha feriada podía rechazar la preparación después de confirmar el año. Causas: llamada interna con job temporal borraba el reloj validado; selectedDates se validaba después del efecto de confirmación. Solución: herencia explícita restringida a teacher/Preview y validación previa de fechas del candidato. Validado: preparación real6 días; regresión HTTP con nuevo borrador devuelve409 en feriado y active/draft quedan idénticos; tests reloj/fecha/publicación. Prevención: probar efectos de una respuesta negativa y reloj de llamadas anidadas, no solo código de estado.

### QA-ANUAL-02 — Criterios editables e intercambio individual legacy

Síntomas: copiar y editar el borrador de un criterio confirmado devolvió200; Hoy aún mostraba Usar esta actividad hoy intercambiando fechas. Causas: guardas de aceptación solo cubrían rutas modernas; motor antiguo de intercambio permitía confirmadas futuras. Solución: escrituras de criterios409, detección de secuencia confirmada también histórica, copia/edición/generación individual protegidas, switch-schedule bloqueado y servicio swap rechaza confirmadas; se retira la acción UI. No se confirmó ningún criterio erróneo ni se intercambiaron actividades del recorrido. Validado: seis negativos HTTP y contenido original intacto; prueba DB de swap pasa de rojo a verde con fechas/agenda/auditoría intactas. HTTP de swap posterior al reinicio409, fechas/agenda/auditoría intactas. Prevención: inventario de todos los escritores, incluidos servicios y rutas anteriores.

### QA-ANUAL-03 — Resumen de chat conservaba un recurso retirado

Síntoma: IA ya había quitado telas, pero el resumen autogenerado mantenía el aporte anterior. Causa: merge append-only por source_turn. Solución: baseline opcional y reconciliación de grupos IA no editados tras un mensaje nuevo. Históricos sin baseline y decisiones manuales se conservan. Validado: cinco tests y UI con fixture declarada en aula3/25, corrección y reload conservan patio/papel, historial literal intacto. Prevención: comprobar contexto canónico que recibe la siguiente generación, no solo respuesta de chat.

### QA-ANUAL-04 — Adjuntos invisibles al evaluar y pendientes de actividades retiradas

Síntomas: foto ordinaria guardada no podía abrirse desde la revisión por competencia; actividades archivadas/canceladas reaparecían en pendientes anteriores. Causas: proyección moderna omitía acceso privado al medio; pendingPastActivities y reviewPastActivity no filtraban vigencia ni ejecución en otra fecha. La sustitución del proyecto sí había archivado correctamente toda la secuencia futura; no se modificó su publicación. Solución: ruta privada según fuente canónica, lectura autenticada y vista de foto; filtros y guardas repetidos bajo bloqueo para vigencia/identidad/fecha/ejecución real. Validado: foto sintética abre en Evaluar, tres tests de adaptador/medio; fixture DB rojo→verde para retiradas y adelantadas, HTTP422 para dos retiradas y dashboard íntegro,4 pendientes legítimas en lugar de6. Prevención: distinguir estado almacenado de proyección antes de atribuir causa y probar lectura más escritor.

### QA-ANUAL-05 — Estado, revisión y accesos inconsistentes

Síntomas reproducidos: calendario ofrecía no realizada tras ejecutar; saludo ignoraba reloj QA; corrección libre seguía anunciando competencia confirmada; cierre anual deshabilitado sin causa; trayectoria visible devolvía flag deshabilitado; lector anual abría editor anterior. Causas: proyecciones de estado/revisión y defaults distintos. Correcciones focales reutilizan estado canónico, fecha QA validada, invalidación explícita de atribución, explicación de237 pendientes, default compartido y ruta anual compacta. HTTP409 de actividad ejecutada sin mutación, corrección/reconfirmación UI, trayectoria200/UI y documentos V1/V3 PASS. También selección repetida de alumno conserva detalle y Queremos deja de ser falso nombre manteniendo protección de nombres conocidos.

Pendientes reproducidos: QA06 TIC depende de dispositivo no confirmado; QA20 resumen Mi aula omite atribuciones libres aunque Evaluar está correcto; QA21 reanálisis borra decisión provisional sin aviso claro; QA22 placeholder [estudiante] visible. No solucionarlos fabricando recursos/evidencias o preservando decisiones obsoletas. Matriz, evidencia, límites y regresiones en informe QA integral.

### QA-FINAL-01 — QA06/20–22 corregidos (2026-10-15)

Recursos: proveedor/cobertura no filtraban TIC sin dispositivo confirmado. Política común para entradas, contratos nuevos y cambio focal;15 proyectos/mínimo2 conservados y otras competencias sin restricciones nuevas. Roster: la proyección omitía atribuciones posteriores de observaciones libres; ahora usa el lector efectivo canónico con revisión/retiro/multicompetencia. Camila2 registros/3 competencias coincide con Evaluar/Trayectoria.

Reanálisis: el borrador perdía letra/motivo. Diálogo explícito y guardia de revisión antes de IA; historial JSONB del texto anterior y decisión provisional conservada, nunca confirmación automática. 409 sin reconocimiento no consume IA. IA real/UI conserva B y motivo, recierre B4 y lectura histórica PASS. Anonimización: marcador propio distinto de referencias a compañeros; presentación sustituye solo sujeto inequívoco. Regresión adicional: criterio nulo en observación libre no debe ejecutar replaceAll ni impedir analizar.

Prevención: comprobar proyección canónica, efectos de errores y costo antes de despacho; separar suficiencia del resumen de suficiencia de evaluación; conservar huellas y confirmación docente. Pruebas/pasos/archivos y limitaciones en ronda final del informe QA.

### QA-FINAL-02 — Contexto del bimestre y paginación Word (2026-10-15)

Síntomas: aviso/competencia anterior reaparecían al cambiar bimestre; un lector legacy oculto sobrescribía el enlace compacto. Se limpia estado al aceptar cambio, se conserva si se cancela y se recupera el par del enlace sin proyección legacy. Handler real y UI B4→B3/enlace Indagación PASS.

Word: observación del taller dividida sin nombre/criterio en continuación. Filas indivisibles cuando caben, cabecera repetida y unida a primera fila; render Word local autorizado comprueba sección+alumno+criterio+texto juntos. Nuevos artefactos layout2 sin sobrescribir históricos. ZIP44 archivos real desde UI, CRC y OOXML PASS. Presentación técnica del anual histórico sigue P2, sin ocultar el hallazgo ni rediseño global.

### QA-FINAL-03 — Preview y Producción comparten base (bloqueo de QA cloud)

Lectura de configuraciones muestra misma conexión DB y proyecto Supabase. Se detuvieron escrituras cloud antes de crear datos ficticios. Usuario autorizó misma cuenta/base separada; organización gratuita y formulario de proyecto preparados, credencial nueva requiere entrada/envío manual. Auth/RLS/Storage cruzados no se declaran validados. No hay fallo de RLS demostrado ni migración aplicada. No incluir valores secretos en recibos o repositorio.

### QA-SETUP-01 — Guardar aula queda bloqueado con valores restaurados (2026-10-16)

Síntoma: botón deshabilitado sin explicación, con campos visualmente completos; usuaria pudo continuar tras recargar. Reproducción local: restaurar valores del formulario sin emitir input/change deja el borrador React desactualizado y `complete` falso. Ese mecanismo está demostrado; el evento exacto de la cuenta original no se capturó después de su recuperación. Solución: validación accionable y lectura de FormData al enviar/validar, manteniendo required, servidor, idempotencia, cola y opciones del logo. Validación local: vacío enfoca institución; restauración completa guarda y avanza sin recargar; los datos exactos se recuperan al editar aula. Tres regresiones nuevas y 26 existentes PASS. Prevención: probar valores visibles restaurados además del tecleo React y nunca bloquear la única acción sin explicar qué falta. Informe: docs/qa/QA_SETUP_GUARDAR_CONTINUAR_2026-10-16.md. Sin escrituras cloud ni cambios a Producción.

### QA-GUIADAS-01 — Texto repetido y guías diagnósticas de desarrollo (2026-10-16)
Síntoma: Qué observar repetía ejemplos casi iguales y volvía a aparecer bajo el criterio; instrucciones genéricas y dibujo atribuido a escritura. Causa: catálogo development_fixture más mapas paralelos de instrucciones y cue derivado por concatenación. Solución: catálogo v4.5 revisado internamente, acciones/cue/ejemplos originales y referentes por edad; preparación visible y secuencia coherente. UI muestra cue una vez y conserva registro vinculado. Aspectos de significado distinto reciben IDs nuevos sin alterar snapshots históricos. Validación: 48 regresiones PASS, 22 momentos en UI con backend real local,62 presentaciones por edad en consulta, guardado/reload/prioridad, móvil y ambos builds PASS. Prevención: validar fuente editorial única, ejemplos distintos, contratos por edad e historia v4.4. No confundir reviewed con certificación curricular o prueba de campo. Informe QA_GUIADAS_EDITORIAL_2026-10-16.md.

### QA-GUIA-DIARIA-01 — Criterio repetido como evidencia e instrucción obsoleta
Al revisar preocupación por frases redundantes se identificó fallback de PedagogicalBlock que volvía a mostrar el criterio bajo evidencia si esta faltaba. Se muestra únicamente evidencia guardada propia y se evita igualdad literal también en compacto, sin tocar datos ni Word. La skill crear-actividad todavía autorizaba modificar después decisiones heredadas: se corrige conforme a ADR152 y se refuerza redacción concreta sin paráfrasis redundantes.13 respuestas reales archivadas revisadas,16 regresiones PASS y seis variantes UI con callback criterio/momento intacto. No es garantía semántica universal ni validación real del prompt nuevo; no nuevas llamadas IA. Informe QA_GUIA_DIARIA_CLARIDAD_2026-10-16.md.

### QA-ENTREVISTA-01 — Preguntas, categorías y resumen familiar incoherentes
Síntomas: pregunta escucha/usa seguida solo de usa; comunidad pide importancia y ofrece categorías; resumen pierde lenguas sin interlocutor, antepone le gusta a negaciones y atribuye disfrutar conversar por cualquier opción comunicativa. Causa: copia no alineada con selecciones y concatenaciones/inferencias de presentación. Solución: seis preguntas más precisas, categorías contextualizadas, helper para otra lengua, todas las lenguas en resumen, texto libre neutral y pistas sin gustos/habilidades inventados. IDs/JSONB/versiones originales intactos.36 regresiones distintas PASS y entrevista ficticia confirmada/reload por UI con texto negativo y tres lenguas conservados; sin evidencia curricular fabricada. Prevención: probar sentido de cada opción y proyección posterior, no solo que el botón guarde. Informe QA_ENTREVISTA_EDITORIAL_2026-10-16.md.


## 2026-10-17 - Paneles y campos con separacion visual insuficiente
Sintoma: tarjetas de matricula casi se fundian entre si y con el fondo; campos editables poco distinguibles. Causa: blancos y bordes muy palidos sobrescritos en modulos, gap cero entre paneles y elevaciones inconsistentes. Solucion: tokens compartidos de superficies, borde/campo accesibles, sombra suave y gap 24 px en matricula. Validacion: UI local ficticia desktop/mobile, alta/busqueda/recarga, 52 regresiones, typecheck/lint y ambos builds. Prevencion: asercion de contraste en vez de fijar un hex antiguo; reutilizar tokens sin modificar colores semanticos ni datos. Informe: docs/qa/QA_CONTRASTE_SUPERFICIES_2026-10-17.md.

## 2026-10-17 — Campos disponibles con apariencia bloqueada
Síntoma: campo gris parece disabled y sugerencias de entrevista demasiado tenues. Causa: token común de campo teñido sin distinguir disponibilidad, bordes/casillas suaves y overrides del layout apilado. Solución: blanco editable, gris disabled/readonly y clase específica de opción con borde/casilla contrastados, selección turquesa con check y hover. Sombras intactas. Validación: QA local de confirmación/reload/reapertura, escritorio/móvil, 52 regresiones y checks de compilación. Prevención: revisar estados disponibles, elegidos y bloqueados juntos; contraste numérico no sustituye su interpretación por la profesora. Informe QA_CONTROLES_ACTIVOS_2026-10-17.md.

## 2026-10-18 — Texto pedagógico mutilado y contradicciones en documentos

Síntomas reproducidos: «Plantear», «Responde» o «Favorecer» tratados como personas; contexto familiar bloqueado; Word niega una competencia secundaria que el mapa incluye; criterio duplicado como foco; fases completas anidadas en Desarrollo y preguntas repetidas. Causas: heurísticas de mayúsculas/lista cerrada y filtros textuales compartidos, texto fijo del exportador y lectura sin separar fases. Solución: retirar anonimización/veto textual según instrucción explícita, conservar atribución y medios privados, derivar competencias del mapa, usar foco distinto y separador de fases existente. Uso de registros ajusta acompañamiento, no una actividad pedagógica confirmada.

Se añade comprobación de cobertura conjunta de competencias en nuevos mapas y refuerzo de prompts sobre variedad, progresión, comparación y apoyos concretos. No reconstruye generaciones históricas ni cambia evidencias. Prevención: regresiones con verbos/nombres reales, actores distintos, competencias integradas y fases de Word; revisión cualitativa de salidas pagadas. Muestra: quince propuestas, tres proyectos/doce blueprints y ocho actividades, once Word. 932 regresiones amplias y suites posteriores de 14/13 PASS. USD 0,38710 estimado, control conservador 0,63225. Límites y evidencia en `docs/qa/QA_PEDAGOGICA_PROYECTOS_ACTIVIDADES_2026-10-18.md`.

## 2026-10-18 — Continuación manual repetida en planificación

Síntoma reportado: Mi año/proyecto pide reintentar; preguntas vuelven durante la recuperación. Causas identificadas en código: el cliente solo continúa `queued`; no excluye montar el chat mientras recupera el trabajo; estados inciertos no reconcilian automáticamente un resultado ya persistido. Solución focal: continuación acotada para resultados conocidos, espera de lectura antes del chat, lectura final del plan terminado y reconciliación de proyecto/actividad canónicos con propiedad, versión y decisiones intactas. Conflicto tras timeout retira elegibilidad para evitar un bucle. Decisión adicional después de ready ya existía, pero ahora tiene etiqueta/acción explícitas; se retira la sustitución de respuesta por cierre genérico desde el tercer aporte. Recuperación y chat comprobados visualmente con API simulada; no atribuir este resultado a la cuenta original. Sin IA pagada ni datos cloud. Informe `docs/qa/QA_CONTINUIDAD_PLANIFICACION_2026-10-18.md`.

## 2026-10-18 — Brecha de competencias transversales en diagnóstico de 5 años

La auditoría por edad de la KB encontró sin oportunidad guiada a TRANS_AUTONOMO y TRANS_TIC. Catálogo v4.6 añade dos experiencias/cinco momentos propios con acciones, orientación, ejemplos y criterios; TIC solo con recurso adecuado y acompañamiento, sin suponer disponibilidad. Validador y pruebas recorren edad y aplicabilidad L2/Religión para evitar brechas futuras. Versiones/IDs históricos y almacenamiento se conservan; registrar y recargar una observación nueva usa el flujo actual y no crea una evaluación. Total 114 regresiones PASS, UI actual/lector y móvil comprobados; no certificación curricular externa ni intervención real con niños.

## 2026-10-17 — Dependencias del cuestionario fijadas a seis preguntas
Al incorporar ocho preguntas se identificaron denominadores `/6`, opciones del enlace familiar elegidas por índice y guardado que no admitía las respuestas nuevas. Solución: versión explícita de cuestionario, campos permitidos, progreso por versión y configuración de opciones por clave; conservar contrato anterior y datos no reasignados. Confirmar comprueba respuestas reales, no solo la presencia de un marcador de versión. 77 regresiones y QA local de 8/8, parcial y corrección histórica; builds PASS. Prevención: validar desde pregunta hasta persistencia, lectura, impresión y contexto familiar sin inventar evidencia. Informe QA_ENTREVISTA_OCHO_PREGUNTAS_2026-10-17.md.

## 2026-10-18 — Timeout del proyecto y recuperación identificada

Síntoma reproducido con IA real ficticia: la preparación síncrona de un proyecto de lectura terminó por timeout sin ID ni resultado recuperable. Causa: el flujo de Master esperaba una respuesta larga en una única petición; la recuperación del trabajo no podía consultar lo que no había identificado. Corrección: el trabajo moderno opta por ejecución del proveedor en segundo plano, guarda ID/huella/etapa en su checkpoint existente y recupera la misma respuesta. Las respuestas principales completadas se conservan también mientras una reparación está pendiente, evitando repetir uso y creación. Conflictos de contexto/versiones siguen rechazándose antes de IA; una creación sin ID sigue incierta. Reintentar con posible repetición conserva el reconocimiento explícito existente. No hay migración ni cambio de modelo. Endpoint directo/legacy no certificado para esperas largas.

Validación: IA real recuperada por ID en proyectos locales; pruebas del servicio y ejecutor, conflictos, reparación acotada y regresiones de trabajos. No se ejecutó este cambio en una cuenta cloud. La incertidumbre de la llamada fallida conserva toda su reserva de costo. Prevención: medir el tiempo completo desde creación a resultado y distinguir recuperación de una reducción de latencia. Informe QA_PEDAGOGICA_RONDA_2_2026-10-18.md.

## 2026-10-18 — Fragmentación de cuento breve y prueba de generalización

Síntoma: el primer recorrido de lectura repartió un cuento confirmado de seis páginas entre tres días sin razón pedagógica explícita. Causa identificada: instrucción insuficiente sobre primer encuentro y relecturas al distribuir fechas. Se refuerza la skill compartida: relato breve preferentemente completo, entregas justificadas por extensión/condiciones/decisión docente y relecturas con otros propósitos. Mismo input/modelo/esquema en A/B mejora la secuencia; ambas salidas se conservan y solo B origina las cinco diarias nuevas. No se modifica una actividad confirmada ni se añade una excepción por título.

Prevención: casos adicionales y rúbrica fijados antes de generar, incluyendo lectura por entregas explícita y recurso sin argumento. Resultados y límites en el informe de ronda 2. Regresiones estructurales no sustituyen lectura semántica. Persisten hallazgos P2 de páginas Word casi vacías y trazabilidad anual demasiado técnica, sin ocultarlos ni alterar documentos históricos.

## 2026-10-18 — Páginas vacías y procedencia técnica en documentos

Síntoma reproducido: proyecto9 páginas/última vacía y diaria5/última vacía; fuentes del anual repetidas con etiquetas de implementación. Causa: párrafo terminal sin texto conserva espaciado/tamaño de título al retirar secciones; exportador anual imprime las mismas fuentes completas por proyecto y al final. Solución: limpieza terminal opt-in que conserva contenido/campos/imagenes/tablas/secciones, referencias numeradas y texto completo una vez con origen/alcance/fecha en español. Conteos del calendario derivados del resultado real. Revisiones de plantilla nuevas conservan los bytes anteriores. Validación: render Word local9→8 y5→4 con todos los runs no vacíos idénticos; nueva descarga estable y anterior intacta en prueba de almacenamiento privado;940 regresiones y37 focales posteriores PASS. Persisten páginas con poco texto real y anual largo; no declarar todo el diseño resuelto.

Otro hallazgo del render: sin interpretation_review se anunciaba revisado por defecto. Solo status reviewed explícito permite ese rótulo; ausencia/desconocido queda pendiente. La confirmación y las interpretaciones canónicas no cambian. Regresión de confirmación solo de planificación frente a revisión explícita, fuente y artefactos históricos intactos. Informe QA_PEDAGOGICA_FINAL_2026-10-18.md. Sin IA adicional para corregir formato, migraciones ni escrituras pedagógicas cloud.

Ampliación de la misma ronda: inspección del contrato vigente detecta cinco campos familiares ausentes del snapshot anual (identidad/autonomía, lectura/escritura, matemática, exploración y contexto/expectativas). La primera muestra usaba el formato anterior y no demostraba esta integración. Se conserva la lista anterior y se deriva cobertura adicional del contrato familiar; prueba recorre las ocho preguntas y mantiene las respuestas como family_report, nunca evidencia observada. Se traducen etiquetas de campos textuales en Word sin cambiar respuestas o texto observado. Se ejecuta un anual adicional real con entrevista vigente, dentro del mismo techo; métricas finales en informe/JSON. Sin backfill de planes previos.

## 2026-10-19 — Criterios múltiples y correcciones de la revisión de macetas

Una actividad puede desarrollar varias competencias pertinentes, cada una con criterio, evidencia y uno o varios momentos de observación. Se heredan y persisten las referencias completas; se reutiliza el almacenamiento existente. La muestra real detectó y permitió corregir otra restricción de AIContextBundle a una competencia por llamada diaria. No se obliga a integrar dos competencias en todos los días ni se reescriben actividades confirmadas.

Se agregó confirmación docente previa para recursos explícitamente pendientes, se reforzaron las reglas de viabilidad y lenguaje práctico y se ajustaron los Word. Las observaciones libres sin criterio tampoco reciben un criterio por defecto en el documento. Detalle, evidencia, límites y rollback: docs/qa/QA_CORRECCIONES_PEDAGOGICAS_2026-10-19.md. En esta etapa inicial el mapeo de desempeños oficiales estaba pendiente. La ampliación posterior lo implementa y valida: ver docs/qa/QA_DESEMPENOS_OFICIALES_2026-10-19.md; las paráfrasis históricas siguen diferenciadas de las citas oficiales.

QA: 96 regresiones PASS; typecheck, lint y build PASS. Muestra nueva de IA real: un Master y seis actividades de cinco años; ocho llamadas pagadas contando una revisión del último borrador. Costo adicional estimado USD 0,1066935; acumulado USD 4,607772955 de 5. Sin escrituras cloud, commit ni despliegue de esta ronda.


## 2026-10-19 — Prerrequisito de publicación: cola nueva y base compartida

Síntoma: preparation_jobs_v2 ausente en la conexión cloud prevista para Preview. Causa: la corrección local introduce una cola aislada, mientras Preview y Producción aún comparten el esquema anterior. Solución de activación: proyecto Supabase QA independiente autorizado, 77 migraciones y copia acotada de la cuenta QA con validación íntegra de filas/archivos. Auth/RLS reales aprobados; prueba de cola revertida. El proyecto Vercel no tiene repositorio conectado y rechaza variables por rama: usar overrides exclusivos del despliegue Preview y verificar su auth/config antes de compartirlo. Prevención: no publicar basándose solo en build; comprobar conexión efectiva, tabla, permisos y que el target de Producción conserve ID/SHA. Evidencia privada en .local/release-20261019/.

## 2026-10-19 — Preparación pausada y deterioro documental

QA-R-H03: después de aceptar recursos/fechas, Master se detenía antes de IA. Causa: dependents reconstruía details sin resource_readiness. Tres validaciones usaban context.age fuera de alcance y limpieza no disponía de context. La regresión HTTP detectó además updated_at inexistente al guardar el recibo. Solución: conservar recibo, aula autorizada, ámbito correcto y actualizar solo campos reales. Borradores anteriores reconfirman materiales antes del reintento; no se inventa disponibilidad ni se reescriben confirmados. HTTP real conserva la decisión, bloquea reintento sin ella y alcanza proveedor local de cuota controlada. no-undef queda activo en servidor/ejecutor.

Descargas sin portada: compactación retiraba la carátula original. Otro corte anual dentro de tabla producía DOCX inválido aunque pasaba el test textual. Se restaura papelería/tablas, se corta desde la tabla contenedora y se añade regresión XML; Word real abre/renderiza. Nueva revisión conserva artefactos históricos. La consulta omitía workshop_catalog: ahora conserva el paquete PDF y se verifica en 246 variantes. Materiales literales en details también se leen al ejecutar, sin inventarlos. Evidencia, prevención, límites y rollback: QA_PRESENTACION_RECUPERACION_2026-10-19.md.

Comprobación adicional de descarga real en Preview: sección de observaciones sin registros provocaba una última página casi vacía aun con la carátula restaurada. Se omite esa sección vacía y se mueve el aviso junto al propósito; con registros reales conserva tabla/fechas/criterios y con taller conserva la sección posterior. Layout9 preserva bytes de artefactos anteriores. Regresión focal25 PASS, render del mismo contenido guardado5→4 páginas. Sin recortar contenido legítimo para forzar un número de páginas.

## 2026-10-19 — Fallos de formato al ampliar la muestra documental

PT01–PT06: la revisión anterior no cubría todas las familias. Encabezados de unos63pt invadían márgenes menores; títulos diagnósticos eran tablas sin unión efectiva al contenido; saltos duros aislaban firmas/filas; el fallback genérico seguía básico y el cierre separaba identidad de valoración. En PDF el colegio largo usaba la misma coordenada vertical que el aula. Se reserva espacio real, se usan títulos nativos conservando sus runs/iconos, registros de cierre indivisibles cuando caben y geometría PDF según líneas. Taller breve unido, secciones opcionales renumeradas, informes compactos y nuevas revisiones sin sustituir bytes históricos. Prevención: casos largos y sin campos opcionales,66 regresiones PASS, render Word real y muestras de familias de PDF. Typecheck se ejecuta después de Next para evitar carrera sobre .next/types. Evidencia, cobertura exacta y límites: docs/qa/QA_PLANTILLAS_2026-10-19.md. Sin IA nueva ni publicación.

## 2026-10-19 — Confirmación redundante de materiales al preparar

Síntoma: un borrador de macetas mostraba otra casilla de disponibilidad y bloqueaba Retomar lo pendiente. Causa: resourcesConfirmed era una condición independiente de la aceptación del proyecto, y los borradores antiguos podían carecer del recibo. Decisión de producto revisada: confirmar la disponibilidad mediante la propia acción de preparar, mostrando previamente la lista.

Solución: el POST protegido de preparación crea el recibo con procedencia project_preparation; el POST de reintento de borrador propio lo recupera con project_resume. Se retiran las dos casillas y su bloqueo en la interfaz, conservando el control interno de correspondencia de recursos. GET no crea aceptación. No se modifican fuentes históricas ni se ocultan errores de saldo o resultados inciertos. Ocho regresiones focales PASS, incluyendo HTTP con proveedor local controlado; no equivale a una generación IA real nueva ni a QA del despliegue. Rollback: revertir estos cambios focales en preparación/readiness/interfaz; recibos JSON existentes siguen compatibles sin migración.

## 2026-10-19 — Controles ambiguos, menú persistente y texto de fichas rasterizado

Síntomas: controles secundarios parecen texto; Mi aula permanece abierto; ayuda de crear año se repite; PDF de recursoAyni reproduce letras como píxeles y dibujos genéricos. Causas: ghost sin borde, details sin gestión de cierre exterior, ayuda sin estado anual y conversión de páginaPNG completa aPDF. Solución: borde común, DropdownMenu existente, bandera de plan activo/borrador y composición PDF con letras nativas del SVG interno e ilustraciones aparte. Sin rutas de archivo aportadas por cliente ni cambios a fichas oficiales.

Validación:49 regresiones, texto extraíble en cincoPDF, muestras renderizadas y recorridoUI local con diez alumnos. Se simplifican expresiones leyendo las oraciones completas para comprobar concordancia y sentido. Hoy también se prueba en cuatro horas; el caso cloud no contiene principal para19/10 y no se inventa esa actividad. Rollback focal sin migraciones; evidencia y límites en QA_HOY_FLEXIBLE_Y_FICHAS_2026-10-19.md.

## 2026-10-19 — T100: fichas y guías de la biblioteca completa

Síntoma:64 propuestas sin hoja infantil reciben tres tarjetas genéricas; las que tienen ficha descargan solo esa hoja. Inicio/cierre repetidos en18 variantes; vocabulario abstracto, cabecera idéntica y escenas geométricas genéricas. Causa: impresión basada en recurso en lugar de guía individual y texto compartido sin acciones específicas. Solución: guía completa por taller/edad, acciones concretas por familia, revisión en las cuatro fuentes editoriales y once recursos originales con texto nativo e ilustración pertinente. Se conserva geometría exacta para matemáticas. El enlace antiguo de tarjetas motoras entrega el mismo recurso nuevo; no se modifica material oficial.

Validación:28 pruebas PASS (incluyen246 selecciones/persistencias y PDF con propósito/preparación/materiales/criterio/evidencia y ambas voces de cada momento), extracción independiente246 PDF y visualización200 páginas representativas/once fichas. UI local de lectura multiedad y modelado con descargaPDF; typecheck/lint/builds PASS. Prevención: regresión que exige guía docente también al haber ficha, evita frases genéricas y conserva ID al cambiar título. Nuevas selecciones usan catálogo1.5.0; snapshots/observaciones/documentos históricos intactos. Detalle en QA_TALLERES_BIBLIOTECA_COMPLETA_2026-10-19.md. Cambios locales sin publicación.

## 2026-10-19 — Descarga infantil incluía páginas docentes

Síntoma: «Material para imprimir» entregaba también la preparación y los momentos que ya se consultan en Hoy; talleres sin ficha ofrecían solo guía docente. Causa: el pipeline unificaba ambos destinos y la interfaz mostraba el enlace por tener ID de taller, no por disponer de recursos infantiles. Decisión posterior del usuario: separar destinos.

Solución: PDF solo con recursos infantiles; regla de disponibilidad compartida con el manifiesto oficial por edad, usada en biblioteca/Hoy/servidor. Se conserva la edad del taller en la consulta de Hoy. Taller sin ficha no ofrece enlace y su URL directa devuelve un error claro; no entrega PDF vacío. Se mantienen rutas antiguas y guía/Word. Prevención: recorrido de246 variantes, caso Nina de una página, ficha oficial de mesa solo para4años y guía persistida en Hoy.30 pruebas de talleres y29 de documentos/preparación PASS, lint/typecheck/builds PASS y descarga real local comprobada. Sin cambios a datos pedagógicos cloud.

## 2026-10-20 — PDF MINEDU completo y borde recortado al imprimir

Síntoma: los dos talleres con fichas oficiales todavía anexaban la página docente del PDF descargado; la ficha de reparto perdía un borde al incorporarse. Causa: appendSource incluía todas las páginas y embedPage usaba límites desde cero aunque el original tiene MediaBox/CropBox desplazados. Solución focal: print_pages explícitas, validación de rango/unicidad y CropBox real como límites de incorporación. Los archivos oficiales completos permanecen sin cambios; Hoy, Word y registros históricos no se modifican. El paquete de adivinanzas pasa de 3 a 2 páginas y reparto de 2 a 1. Prevención: regresión de páginas infantiles/docentes, BBox/Matrix del objeto PDF y SHA de fuentes; revisión visual de ambos paquetes. Rollback: revertir manifiesto y workshop-print.mjs conjuntamente; sin migración ni cambios de datos. Cambios locales, sin despliegue.

## 2026-10-20 — Fichas infrautilizadas, desafíos mezclados y orientación

Síntoma: solo dos originales descargados estaban vinculados y no era fácil encontrarlos. Al ampliar la muestra, minedu_crea_5_025 incluye también El nabo gigante (páginas 5–6) y minedu_juega_5_030 incluye La Caperucita Roja (3–4); ocho fichas tienen contenido girado dentro del lienzo sin atributo Rotate. Elegir todas las páginas impares habría impreso un desafío ajeno. Causa: manifiesto mínimo, archivos divididos con cortes imprecisos y falta de revisión visual del contenido interno.

Solución: cuarenta originales curados en doce talleres, tres guías nuevas coherentes con su material, filtro y descargas individuales verificadas por taller/edad. Metadatos explícitos de páginas infantiles, docentes, reversos y ajenas; giro de presentación sin reescribir fuentes. Se conservan recortables y nombres originales MINEDU. Prevención: SHA, partición completa de páginas, exclusiones de ambos errores de corte, geometría y pruebas de rechazo de otra edad/taller/rutas. Revisión visual de 60 páginas. Rollback conjunto de catálogo/guías, manifiesto/archivos añadidos, impresión y controles de recursos; actividades guardadas conservan su snapshot y no necesitan migración.

Evaluar: «por confirmar» se interpretaba como confirmación de observaciones. El contador corresponde a valoraciones. Se explicita la diferencia y se conserva la elección docente de nivel. El recurso parents.webp de 160px perdía nitidez ampliado: se añade una versión de 640px solo para estas pantallas. Los assets y la pantalla Mi año permanecen intactos.

Empaquetado detectado al incorporar los originales: tracing incluía unos 120MB de PNG maestros de edición de imágenes que solo usa el script de construcción. Runtime lee el campo file del índice (61 JPEG), no master. Exclusión precisa en Next y .vercelignore conserva originales en el repo y todos los recursos de ejecución. Limitación comprobada: Next/Windows compara globs con rutas inversas y retiene masters en la traza local; no atribuir la proyección Linux de 150,2MB a una publicación real. Smoke de la futura Preview debe comprobar los recursos y el tamaño del paquete antes de darla por aprobada.


## 2026-10-20 — Analizar evidencias consumía IA y no mostraba resultado

Síntoma: clic sin resultado aparente; llamadas de assessment completadas pero borrador vacío. Causa raíz reproducida: PostgreSQL devuelve revision bigint como cadena; la ruta enviaba esa cadena al guardado, cuya comparación numérica producía un falso version_conflict. Solución: convertir la revisión a Number antes del guardado. Se mantiene control de cambios reales y cierre; no ocultar conflictos válidos. Prevención: regresión con adaptador que devuelve revisiones como string, comprobación inmediata del párrafo, feedback/carga/error junto al botón y reutilización del resultado vigente.

Durante el piloto, el validador exigía el nombre completo también dentro del párrafo, aunque student_name ya lo identificaba de forma exacta. Siete respuestas fueron rechazadas; se ajusta a nombre completo exacto en el campo y nombre propio como palabra en el párrafo. Se validan competencia, edad, referencias y longitud. No basta validar JSON para certificar la calidad pedagógica. El modelo inventó un mínimo de días para considerar suficiente un caso: se elimina explícitamente ese umbral en la instrucción y se repite el caso dirigido (null→A). AD/C quedan pendientes de calibración docente. 87 regresiones, lint/typecheck/builds PASS; evidencia detallada en QA_EVALUAR_ANALISIS_BREVE_2026-10-20.md.


## 2026-10-20 — Límite y función del análisis, sin notas sugeridas

Hallazgo de la comparación: medium y high variaron A/AD con las mismas notas; no se declara que más esfuerzo resuelva la calibración. La persona usuaria retira la función de sugerir nota. Se elimina en origen la escala y las instrucciones de calificación, los campos de salida y su presentación/API, conservando notas/historial docentes. El validador rechaza claves extra y calificaciones explícitas; una sugerencia antigua en metadatos tampoco se muestra.

Un resultado del perfil inicial sin nota excedió 100 palabras y se rechazó sin truncar ni guardar. Se orienta la generación a un margen corto; después de la nueva indicación, el contrato definitivo exige 30–70 palabras y dos o tres frases. Pruebas de límites 29/30/70/71 y tres muestras de IA reales con 54/61/63 palabras pasan. No equivale a garantizar que cualquier salida futura cumpla: una respuesta inválida sigue sin guardarse. Referencia anterior solo confirmada y del mismo niño/competencia/período inmediato; no se envía a IA ni impone una progresión automática.

Validación: 89 regresiones, lint, TypeScript y builds Vinext/Next webpack PASS. UI local de escritorio/390px con API simulada y notas de ejemplo, sin escrituras pedagógicas cloud. Evidencia y límites en docs/qa/QA_EVALUAR_SOLO_ANALISIS_2026-10-20.md. Sin migración, commit, push o despliegue.


## 2026-10-20 — Cero observaciones por consultar otro bimestre

Síntoma: cero por confirmar y preparación deshabilitada, interpretados como borrado. Causa comprobada: Chrome abrió B1 con reloj QA de febrero; las 140 observaciones de B4 y los 430 registros de asistencia conservan sus hashes. La navegación principal dentro de Evaluar podía conservar un período manual anterior. Solución: nueva entrada por fecha del servidor, manteniendo cambio manual/enlaces; vacío identifica bimestre. Retirar contador ambiguo y copia de confirmar observaciones en captura/revisión. Prevención: recorrido UI B4→B1→Evaluar→B4, pruebas de fechas de inicio/cierre y servicio de atribuciones/persistencia; 92 regresiones distintas, lint/typecheck/builds y escritorio/390px PASS. Sin migraciones ni recreación de datos. Rollback y evidencia: QA_EVALUAR_CLARIDAD_PERIODO_2026-10-20.md.


## 2026-10-20 — Contexto de evaluación repetido por cada llamada paralela

Síntoma: avance lento pese a tres llamadas concurrentes. Causa comprobada en código: cada hijo recargaba contexto y fuentes completas del aula, sobre pool serverless de una conexión. Corrección: una preparación compartida por grupo de ocho y un escritor de resultados/checkpoints, manteniendo revalidación canónica al guardar. Prevención: carga local de120 pares con15 lecturas comunes, pico8/un escritor, duplicados0; conflicto conserva siete y fallo común no inicia IA ni deja lease en ejecución.57 regresiones PASS. Proveedor real3/6/8/12 sin fallos de red/rate-limit; una salida de6 rechazada por validador, sin ocultarla ni atribuirla a concurrencia. Ver QA_EVALUAR_CONCURRENCIA_2026-10-20.md. Sin migraciones ni cambio de reglas pedagógicas.


Cierre de verificación de concurrencia:57 pruebas, lint/typecheck y ambos builds PASS. Código local preparado con techo8; sin commit/push/publicación de esta ronda. El lote cloud previo permanece pausado con41/120, causa individual no disponible en su payload; no se reinicia ni se atribuye ese fallo a concurrencia.

## 2026-10-20 — Un fallo individual pausaba todos los análisis

Síntoma:41/120 sin avance al recargar; reanudación UI llega61 y vuelve a pausar. Causa comprobada: cualquier rechazo de Promise.allSettled pausaba todo el lote sin categoría individual; además un error cliente reconciliado y una consulta fallida podían dejar de conducir el avance. La causa concreta de los fallos históricos no está guardada y no se atribuye al conteo de palabras. Solución: categorías por par sin datos privados, continuar pares no intentados, una regeneración automática máxima de respuesta recibida inválida, no repetir timeouts automáticamente; conservar checkpoints y reprogramar consultas de lectura fallidas. Un grupo sin tareas no inicia consultas compartidas huérfanas.

Regla editorial anterior rechazaba29/71 palabras o puntuación distinta sin demostrar un fallo pedagógico. Indicación nueva:30–70 orientativas,20–100 aceptadas, sin recortar ni rellenar texto y sin conteo rígido de frases. Mantener controles de identidad, referencias y ausencia de notas. Prevención:80 pruebas y UI local con interrupción simulada de POST y de consulta; duplicados0 y notas confirmadas0. Evidencia/límites/rollback en QA_EVALUAR_RECUPERACION_2026-10-20.md; publicación efectiva y ejecución real se verifican aparte.

## 2026-10-20 — Guardar valoración hacía esperar al aula completa

Síntoma: Guardar y siguiente tarda demasiado al revisar muchos pares. Causas: POST de borrador y confirmación consecutivos, contexto individual rehace mantenimiento global/etiquetas, guardado relee registros del salón y cliente espera overview antes de consultar al siguiente. Solución: acción transaccional save-and-confirm para el borrador preparado, inserción conjunta condicional de etiquetas, proyección de evidencia restringida al par para revalidación y contexto individual de lectura. Respuesta canónica actualiza fila; se consume una precarga del siguiente, sin nota elegida y sin esperar overview. No adelantar visualmente una nota cuyo guardado falló ni ocultar conflictos.

Prevención: equivalencia de proyección ordinaria multicompetencia, lectura de otro niño/competencia vacía, conflicto de revisión/fuentes, rollback sin media confirmación, repetición sin duplicado y carga120/un escritor.84 pruebas PASS; UI simulada de envío único, prefetched next y error que conserva trabajo. Medición PostgreSQL temporal11943→3627ms y119→38consultas, con exclusiones explícitas. Prueba IA120 con12 simultáneos:4min03s,0 fallos/duplicados. El benchmark no reasigna notas ni reinicia análisis QA. Informe/rollback: QA_EVALUAR_AGIL_2026-10-20.md.


## 2026-10-20 — Informes prematuros y espera de contexto tras guardar

Síntomas: Informe a familias se abre antes de terminar notas/conclusiones y presenta preparación vacía; los mismos tres destinos aparecen al entrar y de nuevo dentro; Guardar y siguiente aún demora. Causas: no se exponía una elegibilidad familiar común al cliente y la confirmación esperaba reconstruir todo el contexto del niño después del commit. Tres guardados cloud anteriores medidos:~6,25s cada uno, excluyendo detalle.

Corrección: elegibilidad canónica compartida entre overview y lotes, aviso breve con regreso a evaluación, protección equivalente en generación individual para períodos formales; entrada moderna directa con pestañas. Invalidación de caché en la transacción y reconstrucción en ficha, bajo el bloqueo de refresco, evitando también devolver fallo de refresco tras guardar una nota válida. Pruebas: rechazo sin IA antes de notas/conclusiones, acceso individual con/sin periodId, habilitación sin cierre, invalidación por nueva observación, rollback/cache y persistencia idempotente; UI escritorio/390px. Los resultados finales de build, smoke y medición cloud se conservan en recibos de entrega; no atribuir la velocidad de mocks a Vercel. Sin migración. Detalle/rollback en QA_INFORMES_REQUISITOS_2026-10-20.md.


### Segundo tramo comprobado de la demora

Diferir la caché no mostró mejora cloud consistente en tres muestras; aún se leían todas las valoraciones y borradores del salón para una sola ficha. Se añade proyección individual equivalente y fallback al alcance completo sin registros propios. El append de evento pasa de lectura/reenvío del historial a una operación JSONB atómica, conservando reaperturas y otras secciones. Prueba de eventos concurrentes conserva tres eventos únicos y autor/fecha;91 regresiones PASS. Comparación controlada en PostgreSQL temporal:40→31 consultas,3517→2695ms (~23%), sin HTTP/Auth ni notas QA. No confundir esa medición con la latencia final del navegador.

En la población QA por API se observaron una respuesta503 de verificación de sesión y una400 del guard de selectores bajo varias peticiones; no se conserva diagnóstico suficiente para atribuir ambas a una causa SQL concreta. Se concilia cada par desde su estado canónico antes de continuar, sin sobrescribir otra nota ni repetir análisis de IA. Reducir la carga del llenado y verificar IDs/huellas al terminar; no ocultar los fallos ni interpretar un error de acuse como permiso para repetir escrituras a ciegas.


### Latencia regional identificada

Observación verificable: despliegue97716be en iad1 y pool Supabase QA en sa-east-1, con guardados cloud de varios segundos pese a consultas temporales más rápidas. La distancia introduce un viaje de red por cada operación SQL; se considera un factor y se valida con una Preview gru1 antes de atribuirle toda la demora. CLI permite --regions; selección por despliegue, sin tocar Producción. Exigir región efectiva,15 smoke checks y muestras HTTP antes del alias; resultados en recibos privados de la entrega regional.


## 2026-10-20: demasiadas advertencias y avance de textos poco visible

Síntoma:120 conclusiones preparadas/100 por revisar, generación de un texto por POST e indicador familiar alejado del botón;120 tarjetas sin paginar. Causa: regla de menos de tres registros incluso tras valorar evidencia suficiente, runner de textos secuencial y progreso solo al inicio. Solución: motivos concretos desde suficiencia confirmada, lectura compatible de lotes previos, grupos12/6 con checkpoint serial y recuperación por tarea, resumen filtrable,10 resultados por página y progreso junto al informe. Se preservan identidad, snapshots, leases, guardado docente y datos antiguos.

Validación:121 pruebas PASS incluyendo carga120+10 sin duplicados, evidencia insuficiente conservada, nota vinculada dentro del bundle y rechazo de preparación parcial sin aceptación. Typecheck/lint/build Vinext y revisión visual de componentes reales escritorio/390px; detector sin hallazgos. No inferir velocidad real del proveedor a partir de mocks. Ver QA_CONCLUSIONES_PARALELAS_2026-10-20.md y recibos privados de Preview para smoke y preservación efectiva.

## 2026-10-20: compatibilidad y paginación al maquetar el Word familiar

Síntoma durante desarrollo: LibreOffice renderizaba el archivo, pero Word exigía repararlo; además los recuadros dejaban huecos grandes. Causas: `altText` sin el atributo `name` requerido y IDs de dibujos repetidos en la biblioteca DOCX; `keepNext` en etiquetas de celdas encadenaba bloques completos. Solución: nombre y ID únicos en foto, símbolos y logo; mantener cada grupo breve por fila y permitir continuidad del bloque con encabezado repetido. Ajustar márgenes internos sin reducir la letra.

Validación: apertura normal en Microsoft Word y ocho páginas tanto allí como en el render de LibreOffice, inspección de todas las páginas y regresión de nombres/IDs de dibujos, viñetas, cuatro notas y contenido literal. Prevenir el fallo verificando Word además del render y validando atributos requeridos de imágenes; no entregar un DOCX reparado como sustituto de corregir el generador.
