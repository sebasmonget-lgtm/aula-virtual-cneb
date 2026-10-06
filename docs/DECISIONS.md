# Decisiones de arquitectura

## ADR 109 — Interpretaciones insuficientes y preparación anual recuperable

**Decisión (2026-10-03).** Mantener la validación estricta de alcance y separar hipótesis opcionales incompatibles como información insuficiente; revisar también cualquier razón/apoyo dependiente. Reutilizar ai_pending_generations para jobs privados del aula, checkpoints de salidas, etapas reales y una llamada por petición. La página consulta estados y despacha pasos en cola; una lease con token cerca ejecuciones concurrentes/tardías. Las huellas y el CAS se vuelven a comprobar antes de guardar. No se añaden workers ni migraciones ni porcentajes ficticios.

**Permisos.** Identidad, aula activa y propietario del año se verifican en servidor; cada lectura/escritura de job filtra aula, workflow y docente. El navegador recibe metadatos, nunca el checkpoint ni sus fuentes privadas. Los secretos y textos no aparecen en telemetría. La matriz cuenta atribuciones docentes y mantiene los registros sin competencia fuera de celdas, sin exigir completar nada.

**Reversión y límites.** Revertir el Preview/alias conserva datos y documentos. Jobs expiran a las 24 horas sin purga global. Una función interrumpida permite retomar tras vencer su lease; se necesita una página que continúe despachando pasos. Informe: docs/qa/annual-journey-v2-recovery-2026-10-03.md.

## ADR 104 — Panel administrativo y alta inicial protegida

**Decisión (2026-09-30).** Un usuario Auth con `app_metadata.ayni_role=admin` accede a un directorio de cuentas Ayni, crea docentes con DNI y contraseña inicial y restablece la contraseña de una docente seleccionada. El backend verifica el rol en cada petición antes de usar la clave de servicio. Las rutas docentes rechazan administradores. El DNI se transforma en alias HMAC solo en servidor; el directorio no expone alias ni contraseñas. El primer administrador se crea una vez mediante clave de configuración privada de 32+ caracteres, origen permitido y comprobación de que aún no existe administrador. El propietario retira esa clave tras el alta.

**Gasto y límites.** El directorio agrega `ai_usage_events` por docente para el mes de Lima y el acumulado. Incluye llamadas sin precio y estimaciones separadas; no afirma ser factura ni cubre uso previo/infraestructura. No se agrega una política RLS amplia: solo el backend con rol verificado y conexión privada consulta la agregación; las lecturas directas de docente siguen restringidas por RLS.

**Validación y reversión.** Typecheck, lint, build y pruebas de Auth/HTTP/servicio administrativo son la puerta antes de staging. La reversión de código vuelve al commit anterior sin borrar las cuentas creadas; si ya se usó la clave de configuración, retirarla de Vercel. No hay migración.

**Ajuste de recuperación inicial (2026-09-30).** Mientras exista `AYNI_ADMIN_SETUP_KEY`, haya exactamente un administrador y nunca haya iniciado sesión, el propietario puede sustituir su alias de DNI y contraseña desde Ayni con esa clave. La recuperación no crea otra cuenta ni permite cambiar el rol. Tras el primer ingreso deja de estar disponible; retirar la clave temporal y redesplegar cierra también la vía de recuperación. El navegador solo recibe la contraseña que la persona introduce en el formulario y no la guarda Ayni: «Recordar contraseña» solicita almacenamiento al gestor del navegador cuando es compatible.

## ADR 099 — Identificadores únicos de migración en staging nuevo

**Decisión (2026-09-30).** Antes de aplicar por primera vez las migraciones al proyecto Supabase nuevo, se detectó que dos archivos diferentes usaban el identificador `202609250001`. La migración posterior de prioridades diagnósticas se renombró a `202609250003_diagnostic_priorities_preplan.sql`, sin cambiar su SQL. La migración de observaciones conserva `202609250001` y la formal anual conserva `202609250002`. Ninguna de las tres estaba aplicada al proyecto remoto. El orden nuevo se valida con `supabase db push --dry-run`, la prueba de paridad y RLS local; después se aplica en staging. No se modifica una migración ya aplicada.


## ADR 098 — Sesión docente renovable por 30 días de inactividad

**Decisión (2026-09-30).** El acceso por DNI conserva el refresh token de Supabase en una cookie HTTP-only firmada; otra cookie firmada guarda la última actividad. Cada petición docente autenticada renueva el plazo de 30 días, sin casilla opcional. Si el JWT corto expiró, el servidor cambia el refresh token por un nuevo par y vuelve a validar el usuario y su rol. Una petición sin actividad durante 30 días, con firma alterada o con refresh token revocado exige iniciar sesión. Las cookies usan `Secure` en producción, `SameSite=Lax` y ruta `/api`; las respuestas que las renuevan no se almacenan en caché. El cierre de sesión las elimina y solicita revocación local a Supabase. `AYNI_SESSION_SIGNING_KEY` es una clave privada estable distinta de la usada para derivar el alias del DNI. La validación real de rotación y revocación en Supabase nuevo sigue siendo puerta de staging.

## ADR 097 — Acceso docente con DNI

**Decisión (2026-09-30).** La profesora entra con DNI de ocho dígitos y contraseña; el administrador crea y restablece las cuentas, sin correo de recuperación ni registro público. El servidor deriva un alias técnico con HMAC y una clave privada estable, y usa Supabase Auth para verificar la contraseña. Solo acepta usuarios con `app_metadata.ayni_role=teacher`; el UUID Auth sigue siendo el propietario del aula. No se guarda el DNI en el alias ni en metadatos Auth. La pantalla toma como referencia una composición simple con cabecera, campos amplios y botón principal. La clave de derivación, el dominio del alias y el procedimiento administrativo se documentan en `docs/DNI_ACCESS.md`. El piloto requiere validar creación, reinicio y aislamiento de dos cuentas en Supabase real antes de publicar.

## ADR 096 — F10: artefacto Word confirmado e inmutable

**Decisión (2026-09-28).** Una acción docente explícita prepara un artefacto estable para una fuente confirmada de Mi año o proyecto/unidad. `document_artifacts` guarda identidad de fuente, versión, plantilla, huella de fuente, estado pending/failed/confirmed, tamaño, SHA-256 y ruta privada; no modifica ni rellena documentos históricos. El primer render guarda bytes en ruta privada con creación exclusiva y verifica el archivo leído antes de confirmar metadata. Una repetición devuelve el mismo ID y bytes. Si el materializador falla, la fuente pedagógica sigue confirmada y la fila puede reintentarse. Un cambio posterior de fuente exige nueva versión; no se reescribe un artefacto confirmado.

**Acceso.** La preparación y cada descarga vuelven a verificar docente/aula/año en servidor. El bucket de Supabase es privado y sin políticas de lectura/escritura del navegador; solo el backend con clave de servicio puede usarlo después de verificar identidad. La clave nunca va al cliente. RLS de la metadata concede solo lectura propia y niega escritura directa. En local, archivos exclusivos bajo `.local/assets/document-artifacts` no usan `save-local` como sincronización. El API y UI están apagados por defecto (`AYNI_DOCUMENT_ARTIFACTS`, `NEXT_PUBLIC_AYNI_F10_ARTIFACTS`). El catálogo antiguo y descarga legacy siguen disponibles al apagarlos.

**Límite.** Primera vertical: plan y proyecto/unidad. Diagnóstico, actividad e informe familiar conservan descarga histórica dinámica; el cierre sin plantilla no se anuncia como Word. Ampliar a otros tipos requiere política de versión/privacidad y migración aditiva. La herramienta CLI de Supabase no estaba instalada; la migración nueva se creó con el formato versionado del repositorio y se verificó por paridad y RLS en PGlite, no contra un staging remoto.

## ADR 095 — F9: reajuste futuro con diff explícito

**Decisión (2026-09-28).** `NEXT_PUBLIC_AYNI_F9_REPLAN=1` presenta, tras un cierre vigente, hasta tres propuestas de reajuste con proyecto futuro, competencias antes/después y motivo basado en estadísticas calculadas. La profesora elige «Aceptar propuesta» o «Quiero cambiar algo»; esta segunda acción abre los controles de edición anteriores. Ningún cambio se confirma al abrir la pantalla. Si no hay propuesta futura elegible, no se crea una versión vacía desde la vista compacta.

**Integridad.** El backend ya crea una nueva versión de Mi año con CAS y diff, conserva la versión archivada y no edita propuestas comenzadas, proyectos desarrollados, actividades ni cierres. F9 hace que su verificación transaccional del fingerprint use la misma fuente ordinaria F8 que produjo el cierre; sin ello una observación confirmada provocaba un falso conflicto. La priorización y el destino se vuelven a validar en servidor. No hay migración ni IA. Apagar el flag UI restaura el asistente anterior sin tocar versiones.

## ADR 094 — F8: trayectoria derivada y fuente ordinaria para H34

**Decisión (2026-09-28).** Bajo `AYNI_F8_EVALUATION=1`, la evaluación por período agrega una proyección de observaciones ordinarias a la consulta de evidencias legacy sin cambiar las tablas históricas. Solo entran una atribución docente confirmada para la revisión raw vigente o un criterio V4 elegido explícitamente por la docente al capturar, salvo decisión posterior de dejar sin clasificar. El día civil Lima ubica la fuente en el período; el snapshot de contexto sigue como procedencia, no fija el período si el calendario cambia. Una corrección desactualiza la atribución anterior hasta reconfirmar. La proyección conserva texto, alumno y revisión, admite espontánea sin actividad y varias competencias. No genera niveles.

**H34.** Scope, detalle, fingerprints, borradores, cierre y Excel usan el mismo modelo con la fuente nueva cuando el flag está activo. La regla prevista/trabajada/pendiente, la decisión docente AD/A/B/C y el bloqueo anual no cambian. La trayectoria es lectura autorizada por alumno; muestra diagnóstico, P1–P4, fuentes y próximas oportunidades que consten en una conclusión confirmada. Las observaciones sin atribución siguen en cola, no en evaluación. Apagar `AYNI_F8_EVALUATION` y `NEXT_PUBLIC_AYNI_F8_TRAJECTORY` devuelve rutas y vista anteriores sin eliminar registros.

**Límite.** No se reescriben cierres ni documentos confirmados. La QA visual F8 quedó sin automatización de navegador en el host; PGlite/API, typecheck, lint, build y suite completa sí se comprobaron. F12 debe completar la revisión UI y staging nuevo.

## ADR 093 — F7: cuatro destinos y agregado autorizado de Hoy

**Decisión (2026-09-28).** Bajo `NEXT_PUBLIC_AYNI_F7_NAV=1`, la navegación principal ofrece Hoy, Planificar, Mi aula y Documentos. Calendario/Biblioteca siguen accesibles desde Planificar; Diagnóstico/Evaluación desde Mi aula. Los destinos legacy conservan su pantalla y enlace hash, sin migración ni reescritura de datos. Sin el flag se mantiene la navegación anterior.

**Hoy.** `GET /api/teacher/today` resuelve aula del docente verificado, fecha civil Lima ya usada por el dashboard, cola de revisión de esa aula y próxima actividad programada, sin aceptar `teacher_id`/`classroom_id` del cliente. Solo devuelve acciones basadas en fuentes; una observación pendiente no es un déficit ni una valoración. La cola se actualiza al volver de la revisión. No hay llamadas IA ni nuevas tablas.

**Reversión.** Apagar el flag restaura la navegación anterior; la ruta de lectura puede quedar sin consumidores. La seguridad del agregado permanece en servidor.

## ADR 092 F6: atribución curricular posterior y revisable

**Decisión (2026-09-28).** La observación raw y su `student_id` nunca se reescriben al clasificar. Una tabla append-only registra cada sugerencia Jev, abstención o decisión docente con versión, revisión raw y procedencia. Choice propone la primaria y las preguntas independientes pueden proponer adicionales; ninguna se confirma sola. La profesora acepta, cambia, agrega, quita o deja sin clasificar. Una corrección posterior del texto invalida la vigencia de la atribución anterior y permite nueva revisión, sin borrar el historial.

**Criterio explícito.** Si la profesora elige un criterio activo al capturar dentro de una actividad propia, `captured_criterion_id` y su snapshot quedan inmutables como atribución docente de origen; Jev solo puede sugerir adicionales. Los criterios legacy activos sin ID V4 mantienen su UUID/leyenda histórica, sin inventar correspondencia curricular V4. Los vínculos de criterio de decisiones posteriores se proyectan de forma idempotente en una tabla append-only; solo la última decisión docente de la revisión raw vigente puede usarse como fuente de evaluación. La integración de esa fuente en H34 corresponde a F8.

**Permisos y rollback.** API autoriza docente/aula/autor y valida IDs aplicables y criterios del mismo activity. Supabase concede lectura propia por RLS, prohíbe escrituras directas, y las migraciones F6 son aditivas. `AYNI_CURRICULAR_REVIEW` y `NEXT_PUBLIC_AYNI_CURRICULAR_REVIEW` quedan apagadas por defecto; desactivarlas restaura captura raw sin borrar atribuciones. Fotos/audio no se envían a Jev; solo copia textual anonimizada. Un fallo del proveedor deja la observación guardada y la cola manual disponible.

## ADR 091 F5: identidad explícita y observación original inmutable

**Decisión (2026-09-28).** Toda observación ordinaria nueva exige que la profesora seleccione un alumno antes de escribir, dictar o guardar. El `student_id` enviado y autorizado contra el aula es la única fuente de identidad: ni el texto, ni la transcripción literal, ni una sugerencia posterior de Jev extraen o cambian ese vínculo. La captura raw (`ordinary_observations`) no exige competencia ni actividad; si hay actividad, el servidor fija el snapshot proyecto/blueprint, no el cliente. El texto se persiste exactamente como llegó, incluyendo nombres contradictorios, errores, espacios y saltos. La corrección/anulación docente se agrega como revisión con CAS, sin overwrite del original ni cambio de alumno.

**Privacidad y reversión.** La foto permanece privada y nunca se envía a IA por defecto. El dictado `raw_observation` hace solo transcripción literal, sin llamada de reescritura; exige el alumno seleccionado. API comprueba docente/aula/autor; Supabase concede lectura propia con RLS, niega escritura directa y usa bucket privado solo desde backend autorizado. Dos migraciones aditivas local/Supabase; flag `AYNI_ORDINARY_OBSERVATIONS` y `NEXT_PUBLIC_AYNI_ORDINARY_OBSERVATIONS` apagados por defecto. Apagarlos oculta el nuevo flujo pero conserva raw/revisiones, y el flujo legacy continúa leyendo sus registros anteriores. No backfill de `evidences` históricos ni modificación H34.

**Límite.** La paridad SQL/RLS se ensayó en PGlite; falta staging en cuenta Supabase nueva y prueba de micrófono físico. El uso de un token service-role para Storage requiere secreto de servidor de la cuenta nueva, nunca en cliente o repositorio.

## ADR 087 Bake-off F2 provisional sin revisión humana previa a implementación

**Decisión (2026-09-28).** Por autorización expresa, el gate de especialistas de `PLAN_MAESTRO_NUEVO_AYNI.md` §8 se traslada a antes del piloto, no bloquea la implementación local F2–F12. F2 conserva 36 casos, 3 repeticiones por brazo, rúbrica, validador común, hashes, métricas y regla cuantitativa. Los seis casos difíciles proceden de patrones CNEB/QA desidentificados. Dos evaluaciones de IA independientes y ciegas reemplazan provisionalmente a los dos especialistas; sus estimaciones de edición no son tiempos docentes observados. El resultado se denomina **validación provisional de ingeniería/pedagogía pendiente de validación humana posterior**, nunca validación especialista. Ante resultado ambiguo se conserva A. B solo puede seleccionarse si satisface el gate determinista y la regla preregistrada; A se mantiene como rollback. Ninguna rama se activa sin el resto de QA de su fase.

**Permisos y reversión.** La comparación usa exclusivamente casos ficticios, sin nombres, fotos ni audio de menores. Corre fuera del flujo de producción y guarda resultados privados bajo `.local/`; no modifica proyectos confirmados ni tablas. Revertir la preparación F2 no transforma datos. Antes de piloto debe repetirse la adjudicación curricular y la medición de edición con docentes/especialistas humanos.

## ADR 084 Preplan recargable con calendario derivado

**Decisión (2026-09-27).** Las filas guardadas de `annual_preplan_v1` pueden transportar los cuatro metadatos de calendario calculados por servidor. El validador de edición/confirmación reconoce solo esos campos adicionales y los excluye de su salida editable. Guardar y confirmar vuelven a calcular fechas y días desde el calendario autorizado. El contrato estricto del modelo no admite metadatos de calendario ni campos arbitrarios. No cambian aplicabilidad, IDs, modelos ni permisos.

**Integridad.** La proyección de calendario se actualiza solo cuando el JSONB cambia; una revalidación idéntica no incrementa la revisión optimista antes de confirmar. La función de persistencia compartida permite probar la misma ruta usada por el servidor con PGlite y migraciones completas. No requiere migración ni modifica documentos activos históricos.

**Validación y reversión.** Las dos regresiones reprodujeron H08 antes del fix y ahora pasan: generar/persistir/recargar/confirmar intacto y editar/guardar/recargar/confirmar. 63 pruebas relacionadas, typecheck, lint y build PASS; confirmación por UI pendiente al registrar el commit. Revertir únicamente el commit lógico, sin borrar datos ni revertir migraciones. Evidencia histórica y continuación en `docs/qa/end-to-end-audit-2026/18_CORRECCIONES_DURANTE_E2E.md`.

## ADR 083 Revisión individual opcional y resumen docente fácil de completar

**Decisión (2026-09-27).** Los nombres y el acceso «Ver registros» pasan a una sección visible debajo del mapa, sin columna de revisión al extremo derecho. El comentario individual es opcional y exclusivamente docente: se escribe o dicta y «Guardar comentario» guarda y confirma esa versión explícitamente. Se retira la sugerencia individual de la interfaz y su ruta responde `422 teacher_comment_only` sin llamar al proveedor. Las versiones ya confirmadas no se reescriben. Esta decisión sustituye el requisito de comentarios de todos los niños de ADR 037/049/069 y la asistencia individual activa de ADR 069; no elimina la confirmación de la visión grupal y las prioridades antes del plan nuevo.

**Fuentes e integridad.** Preparar o confirmar el resumen no exige comentarios individuales. El snapshot `group-sources:v2` reúne padrón activo, edad/opciones curriculares, huellas de entrevistas confirmadas y observaciones, más los comentarios confirmados que siguen vigentes. Cambios de fuentes o padrón invalidan el borrador hasta que se actualice; actualizar conserva el texto escrito. Las versiones históricas conservan su comprobación anterior. El informe nuevo incluye a todos los niños con sus registros disponibles y deja vacío el comentario que no exista, sin inventar evaluaciones.

**Ayni grupal y dictado.** Solo al solicitar la sugerencia grupal se preparan comentarios vigentes y una selección de hechos anonimizados con alias neutrales por niño, IDs curriculares válidos y filtros de privacidad. No se envían entrevistas crudas, multimedia ni identificadores. El contexto selecciona hasta seis notas recientes por niño, limita cada nota a 1200 caracteres y reparte presupuestos de 24 000 caracteres entre niños tanto para notas como para comentarios; las notas recortadas se marcan y el prompt prohíbe completar el contenido o generalizar a toda el aula. Sin contenido admisible, la escritura y el dictado siguen disponibles sin llamada generativa. Comentarios y resumen usan transcripción literal, sin reescritura ni recomendaciones automáticas. El audio del resumen se autoriza contra el aula activa de la docente autenticada, no un alumno ni un ID de aula enviado por el cliente; se rechazan propósitos o scopes ambiguos. Conserva captura explícita, 59 segundos en navegador, validación de 60 segundos/8 MB, grabación temporal y guardado manual del texto. No cambia RLS ni requiere migración.

**Interfaz.** La información grupal se muestra completa, sin scroll interno ni recorte de la lista de intereses. Cada campo del resumen permite dictado y ayuda opcional de Ayni. Las prioridades comienzan con un formulario visible: qué acompañar, por qué, competencia y forma de acompañamiento. Ejemplos grises son placeholders, nunca datos guardados. Se elige una competencia primero y se despliegan las adicionales solo si se necesitan (máximo cuatro por prioridad, seis prioridades). Se conserva la decisión explícita de no definir prioridades específicas. La navegación usa una fila: volver a la izquierda y avanzar/confirmar a la derecha, con estados de carga, bloqueo durante grabación y protección de cambios sin guardar; los botones mantienen altura táctil y texto adaptable. No se cambia el resto de módulos ni se despliega.

**Validación ejecutada.** Typecheck, lint y build correctos; 78 pruebas diagnósticas, de audio, autorización HTTP, fuentes, prioridades, continuidad, contexto y exportación pasaron. La comprobación adicional del XML del Word confirma cero comentarios cuando no existen, sin omitir niños o hechos registrados; no se hizo QA visual de Word en esta vuelta. En navegador se verificaron el acceso individual sin botones de sugerencia, el aula con sus doce competencias pendientes sin scroll interno y navegación de la misma altura en escritorio y móvil. Las huellas antes/después de padrón, entrevistas, notas y versiones de comentarios permanecen idénticas. No se guardaron borradores ni confirmaciones en la base de la profesora, no se enviaron consultas facturables y no se activó un micrófono físico. La grabación real del celular sigue pendiente. Reporte y captura privados en `.local/test-results/diagnostic-ui-review-2026-09-27.json` y `diagnostico-revision-opcional.png`.

**Reversión.** Puede retirarse esta presentación y el dictado sin transformar ni borrar datos. Debe conservarse la lectura de snapshots v2 y versiones confirmadas al revertir una interfaz; no reimponer retroactivamente comentarios individuales a los informes guardados bajo esta política. Las entrevistas, observaciones y comentarios de la base de prueba local permanecen intactos.

## ADR 082 Recomendación automática y compacta de Ayni en observaciones

**Decisión (2026-09-27).** La observación espontánea conserva el guardado previo y la clasificación diferida existentes. La UI muestra siempre la nota y una tarjeta «Recomendación de Ayni», con la candidata principal y las adicionales si existen; no pide iniciar una consulta normal ni muestra el catálogo completo. «Usar recomendación» confirma únicamente la principal por acción docente. «Cambiar o agregar competencia» abre un selector múltiple local; cancelar no guarda cambios y una respuesta asíncrona no reemplaza una selección que la docente esté editando. Las observaciones ya confirmadas muestran sus competencias sin reconsultarlas. Imagen y ficha conservan su algoritmo y revisión, pero las acciones visibles usan Ayni, no el proveedor Jev.

**Contrato y permisos.** La lectura expone solo un estado cerrado: pendiente, sugerencia, bloqueo de privacidad, texto ausente, información insuficiente, indisponibilidad o decisión docente. No entrega motivos libres internos. La reconsulta excepcional de una falla usa `POST /api/diagnostics/spontaneous-observations/:id/suggest`; la ruta anterior `suggest-jev` permanece compatible. Ambas validan docente, aula y autor antes de consultar y usan el clasificador configurado con su fallback existente. La UI distingue una abstención de un error y no informa éxito si no hubo recomendación. Las escrituras tardías están condicionadas a que no exista una decisión docente. No hay migración, cambio RLS, confirmación automática de competencias ni asignación de niveles.

**Fixtures y privacidad.** El anonimizador elimina únicamente del input temporal el prefijo inicial conocido `[PRUEBA FICTICIA]` o `[PRUEBA FICTICIA · OBS-AAAAMMDD]`. La nota visible e histórica permanece inmutable. El cuerpo sigue pasando por todas las restricciones de identificadores, información familiar, nombres y longitud; una etiqueta no autoriza enviar datos privados. Otras marcas, prefijos no iniciales y un cuerpo con identificadores siguen rechazados. Esto resuelve el bloqueo de ADR 081 sin relajar el filtro numérico general.

**Validación ejecutada.** Typecheck, lint y build correctos; 47 pruebas de estados/UI, Jev, privacidad, fuentes diagnósticas, autorización HTTP, concurrencia y composición de dictado pasaron. Tras reiniciar el backend local, 12 notas ficticias ya existentes recibieron 24 respuestas reales de Jev: 10 recomendaciones y 2 abstenciones, sin fallas de consulta. No es una medición de aciertos pedagógicos. Se verificaron notas originales, seis entrevistas y competencias confirmadas sin cambios. Una nueva nota ficticia guardada desde la UI recibió automáticamente `MAT_CANTIDAD` sin reconsulta ni confirmación; la observación previa registrada por la docente permaneció idéntica. El navegador verificó catálogo oculto, apertura/selección adicional/cancelación y tarjeta sin desbordamiento a 375 px. No se activó micrófono ni se envió audio/foto. Reportes privados en `.local/test-results/ayni-recommendations-live-2026-09-27.json` y `ayni-automatic-smoke-2026-09-27.json`.

**Reversión.** Puede restaurarse la presentación anterior y el endpoint compatible sin transformar ni borrar observaciones, entrevistas o clasificaciones docentes. El estado público se deriva de columnas existentes. Desactivar `AYNI_JEV_ENABLED` y reiniciar el backend retira Jev y conserva el fallback/revisión; no se cambian otras banderas o entornos ni se despliega.

## ADR 081 Diagnóstico independiente y dictado compartido de observaciones

**Decisión (2026-09-27).** Diagnóstico tiene una entrada propia en la navegación de escritorio y móvil, con sus tres pasos Conocer, Observar y Resumir. Evaluar conserva análisis, conclusiones e informes del período, sin repetir el diagnóstico. Los accesos desde Hoy, Aula y Planificar abren el módulo independiente; un aula con alumnos y diagnóstico inicial pendiente también comienza allí. En móvil se mantienen seis acciones inferiores y Calendario pasa al encabezado; en escritorio continúa en la barra lateral. Los ejemplos de cada pista guiada son visibles desde el principio, sin «Ver ejemplos»; la relación curricular sigue siendo secundaria. Esta decisión sustituye la presentación plegada de ejemplos de ADR 041, no el catálogo ni sus referentes.

**Dictado y guardado.** `DictationRecorder` reutiliza la captura directa de entrevista para notas guiadas y espontáneas. En móvil se mantiene pulsado para dictar y al soltar se incorpora el texto al campo; en escritorio se puede escuchar, aceptar, rehacer o descartar. El texto se añade al existente y respeta su límite, sin reemplazar una nota escrita. Observaciones reutilizan la transcripción y mejora factual existentes; entrevistas conservan transcripción literal y autoguardado de borrador de ADR 080. En ambos tipos de observación el registro pedagógico requiere «Guardar observación»; soltar el micrófono no lo guarda ni confirma competencias. Los selectores del alumno/contexto y el envío quedan bloqueados durante captura o preparación/transcripción. La grabación temporal no se persiste y se limpia al salir del formulario.

**Permisos y reversión.** Se reutiliza el endpoint de audio con autorización docente/alumno y límites existentes de 60 segundos/8 MB; la captura se detiene a los 59 segundos. No se envía audio sin una acción de grabación/aceptación ni se añaden permisos, rutas de datos, migraciones o cambios RLS. Se puede retirar el dictado y restaurar la ubicación anterior del módulo sin transformar ni borrar observaciones o entrevistas; el campo de texto sigue siendo operativo.

**Prueba ejecutada y límites.** Typecheck, lint y build pasaron, además de 47 pruebas de autorización HTTP, audio, contexto diagnóstico, navegación y composición de texto. Se comprobó en navegador el módulo propio, los ejemplos visibles, ambos controles de micrófono, edición por teclado y estados de guardado, con anchos de móvil y escritorio. No se activó un micrófono físico ni se transcribió audio real. Para el aula local se cargaron 30 notas guiadas y 12 espontáneas ficticias, cinco y dos por cada uno de los seis niños, con marca visible y reporte privado de seguimiento. Una segunda carga reutilizó las 42 filas sin duplicarlas; las seis entrevistas y el conteo de evidencias formativas permanecieron iguales. No se confirmaron niveles ni síntesis grupal. Las espontáneas quedan por revisar: el número de ocho dígitos de su etiqueta de prueba activa el filtro de identificadores antes de llamar a IA; este lote no evalúa aciertos de Jev y no justifica relajar la protección.

## ADR 080 Guardar entrevista equivale a confirmación docente

**Decisión (2026-09-27).** Por solicitud docente, el editor reemplaza el guardado y la confirmación separados por «Guardar entrevista» (o «Guardar corrección»). La acción explícita del usuario confirma al menos una respuesta, mantiene las demás preguntas opcionales y vuelve al perfil o a la lista de entrevistas. Diagnóstico muestra un mensaje de éxito y actualiza los estados para continuar con otro niño. Los controles de edición y la navegación se bloquean durante el envío; el guardado final también se bloquea durante captura, preparación o transcripción de audio.

**Integridad y permisos.** `POST /api/diagnostics/students/:id/family-interview/save-and-confirm` reutiliza la autorización por docente y alumno. Un bloqueo transaccional por entrevista serializa tanto el borrador como la confirmación; el servicio guarda y confirma en la misma transacción. Una falla revierte ambas operaciones. Reintentar respuestas idénticas ya confirmadas devuelve la misma versión, mientras una corrección crea una nueva y conserva las anteriores inmutables. Las rutas anteriores permanecen para compatibilidad y autoguardado. No hay migración ni cambio de RLS.

**Audio.** En móvil se mantiene la pulsación sostenida y la transcripción automática al soltar, con autoguardado del texto como borrador. En escritorio la escucha previa ofrece «Aceptar grabación» y «Rehacer grabación»; aceptar es la acción explícita que inicia la transcripción. Si falla el autoguardado, el texto permanece en el campo y puede guardarse manualmente sin volver a transcribir. Audio temporal, límites y autorización del endpoint existente se conservan; ninguna respuesta se convierte en evidencia o evaluación de competencia.

**Prueba local y reversión.** La carga de entrevistas ficticias está autorizada solo para el aula local de prueba: sus textos llevan una marca visible, no sobrescribe entrevistas existentes y mantiene un reporte privado de rasgos para seguimiento. No se presenta como información familiar real. Para revertir la interacción, restaurar los botones de borrador/confirmación usando las rutas compatibles; las versiones ya confirmadas y los adjuntos se conservan. ADR 080 sustituye únicamente la interacción de guardado y revisión de audio de ADR 078/079; la medición de costos de ADR 079 no cambia.

**Validación ejecutada.** Typecheck, lint y build correctos; 33 pruebas de autorización HTTP, transacción/rollback, entrevistas, nombres, continuidad UI, audio y contexto pasaron. La carga local verificó versiones, persistencia, proyección individual, agregado grupal y ausencia de nuevas observaciones/evidencias. El navegador mostró el regreso a la lista y seis entrevistas confirmadas; guardar respuestas idénticas conservó la versión. No se hicieron llamadas facturables ni se probó la captura/transcripción con un micrófono físico de teléfono.

## ADR 079 Grabación móvil de entrevista y libro de costos IA por docente

**Interacción y privacidad.** Las preguntas de entrevista tienen mayor contraste y tamaño. En móvil, una pulsación sostenida inicia la grabación, soltarla la detiene, transcribe y guarda el texto como borrador; una cancelación descarta la grabación. El límite sigue siendo un minuto y la docente confirma la entrevista por separado. El audio existe solo en memoria del navegador y se descarta tras transcribir; no se almacena en la entrevista. En escritorio se mantiene el control de inicio/detención y revisión antes de transcribir.

**Medición.** `ai_usage_events` agrega una fila por respuesta facturable con identidad docente verificada en servidor, proveedor, flujo, modelo, tokens, duración, costo y origen del precio; nunca prompts, texto, rutas o nombres. El contexto asíncrono liga llamadas de OpenAI, Jev y audio a la petición, incluso la clasificación diagnóstica diferida. Se inserta con conexión propia para no perder el costo cuando falle el guardado pedagógico. RLS permite lectura propia y prohíbe escritura directa autenticada. `GET /api/ai-usage` vuelve a filtrar por docente y alimenta el resumen del perfil. La escritura de telemetría es de mejor esfuerzo y no impide completar la tarea docente: un fallo puede subestimar el costo.

**Estimación y reversión.** Se usa la tarifa Standard versionada al momento del evento; el costo de OpenRouter prevalece cuando el proveedor lo informa. Tokens de OpenAI y duración de transcripción generan estimaciones, no una factura. Eventos sin base fiable quedan sin precio y se cuentan. El resumen no reconstruye llamadas históricas ni incluye almacenamiento/alojamiento. Se puede ocultar la UI o desactivar el registro sin borrar `ai_usage_events`; la migración es aditiva. Ver `docs/AI_COST_MODEL.md`.

## ADR 073 Project Master, Assessment Master y routing económico

**Routing.** ADR 073 sustituye las asignaciones de modelo de ADR 072. El router central v3 usa Sol/high para el Plan Anual Master y Sol/low para redactar su contenido formal desde las decisiones confirmadas; Sol/medium para Project/Unit Master, realineación excepcional de criterio y Assessment Master; Luna/medium para Actividad, valoración individual, conclusión descriptiva e informe familiar. Actividad puede escalar una vez a Sol/low; valoración a Sol/medium; conclusión a Sol/low, solo por validación de calidad o revisión profunda explícita. Astra queda fuera del flujo normal.

**Project Master.** El mapa confirmado contiene blueprints completos de actividad. La actividad bajo demanda recibe el Master, su fila, vecinas y posición. El criterio y la evidencia esperada se materializan por código al confirmar la actividad; la llamada independiente normal desaparece. Los proyectos históricos conservan sus contratos y criterios.

**Assessment Master.** Cada aula y período puede tener un borrador y un marco vigente versionado. Sol define cómo interpretar las competencias trabajadas sin analizar niños. Las fuentes confirmadas se guardan como snapshot y fingerprint; un cambio en proyectos, actividades o criterios marca el marco para revisión. Luna aplica el marco a evidencias anonimizadas por niño y competencia. La docente conserva la decisión del nivel. RLS permite lectura propia y bloquea escrituras directas desde Data API; las mutaciones pasan por el backend.

**Reversión.** Las migraciones son aditivas y no se editan migraciones aplicadas. La UI puede ocultarse y el router volver a la política anterior sin borrar masters, valoraciones ni criterios históricos.

## ADR 072 Routing GPT-6 semántico y fallback explícito

**Estado.** Sustituido por ADR 073 para las asignaciones de modelo. Conserva el principio de router único, Responses API, Structured Outputs, `AIContextBundle`, `maxRetries: 0` y fallback explícito.

**Decisión.** `ai-execution-router-v4.mjs` es la única fuente de selección de modelos y usa cinco tiers semánticos: Luna/low para trabajo estructurado breve, Luna/medium para generación rutinaria, Sol/low para redacción enfocada, Sol/medium para juicio pedagógico y Astra/high para planificación profunda. Plan Anual usa Astra/high; Project, Unit, criterio, assessment y conclusión usan Sol/medium; Actividad usa Luna/medium; informe familiar usa Sol/low. El diagnóstico principal, evidencia y modo Hoy permanecen en código. Sus asistencias opcionales tienen workflows propios. Taller, materiales y tareas `decision` se declaran no disponibles hasta tener implementación real.

**Fallback.** Solo Actividad puede realizar un segundo intento, de Luna/medium a Sol/low, cuando falla el schema o una validación curricular/de contenido. Orquestación conserva exactamente el mismo `AIContextBundle`, schema y Skill. Clave ausente, autenticación, rate limit, timeout y conectividad no escalan. `OpenAIProvider` continúa neutral, usa Responses API + Structured Outputs strict y mantiene `maxRetries: 0`.

**Trazabilidad, evaluación y reversión.** La metadata interna añade versión de routing, intento primario, fallback y motivo seguro, sin llegar al navegador. La suite opt-in `evals/ai-routing-v4/` mide contratos, IDs, edad, grounding, repetición, tokens, latencia y costo mediante una tabla externa; la calidad pedagógica se registra de forma ciega. No hay migración de datos. Revertir a `973ea5c` restaura la política anterior sin cambiar propuestas confirmadas. Este ADR supera la política de modelos de ADR 024 y las asignaciones concretas de ADR 048–050, ADR 051, ADR 068–070; sus decisiones pedagógicas, de datos y privacidad siguen vigentes.

## ADR 071 Cobertura anual y propuesta de proyecto por fecha

**Cobertura.** La Skill del Plan Maestro busca dos oportunidades pertinentes por competencia aplicable y exige al menos una en el resultado nuevo. TIC se exige solo cuando el aula confirma un medio digital disponible; sin ese recurso permanece visible en el mapa con la oportunidad pendiente, sin inventar dispositivos. La validación ocurre antes de la redacción del documento; si falta un ID exigible, Sol recibe una sola oportunidad de rehacer el Plan Maestro completo con los IDs faltantes. No se insertan competencias mediante código ni se alteran planes ya confirmados. La docente puede revisar y editar la propuesta. Este mínimo es una decisión de Ayni, no una regla del MINEDU. Las advertencias del mapa siguen siendo una proyección de los doce objetos del plan.

**Selección por fecha.** El endpoint del plan vigente devuelve sus `project_slots`, siempre después de verificar el año y la propietaria del aula. Proyecto/Unidad muestra primero el espacio que incluye la fecha local de hoy; si no hay uno, muestra el siguiente, o el último si terminó la secuencia. Al elegirlo, completa las fechas guardadas para ese índice estable. Las otras propuestas siguen elegibles y las fechas siguen editables. Los planes históricos sin espacios fechados mantienen la selección manual.

**Reversión.** Se puede retirar la validación y la recomendación de interfaz sin migración; los planes y proyectos ya guardados conservan sus IDs, fechas e historial.

## ADR 070 Recorrido secuencial y calendario anual sencillo

**Decisión.** La navegación de Planificar permite volver siempre al diagnóstico. Preparar un plan nuevo requiere una síntesis grupal confirmada; un proyecto o unidad nuevo requiere un plan anual activo, y una actividad nueva requiere además un proyecto o unidad confirmado. La interfaz explica el paso pendiente y el servidor repite las comprobaciones para impedir que un cliente omita la secuencia. Los registros históricos siguen consultables.

**Diagnóstico posterior.** Una observación o entrevista posterior no invalida automáticamente la síntesis grupal ya confirmada para planificar. El plan conserva el ID de la síntesis que utilizó. Si la profesora confirma una síntesis grupal nueva durante la generación, el guardado o la confirmación del plan exige revisar la nueva fuente. La huella agregada sigue registrada como procedencia, pero un cambio de fuentes sin nueva decisión docente no bloquea el plan.

**Calendario.** Para 2026 se precargan los bloques lectivos y de gestión y los feriados nacionales dentro del año escolar. La profesora elige visiblemente entre una y cuatro semanas de adaptación; Ayni calcula los doce espacios de proyecto. Si el calendario institucional difiere, puede editar bloques o agregar interrupciones. El calendario se guarda al preparar o confirmar el plan. No se editan migraciones existentes ni plantillas Word. Reversión: volver al UI y servicio anterior; los planes y calendarios guardados conservan sus fuentes y fechas.

## ADR 044 Concurrencia e integridad de versiones

**Decisión.** Las ediciones y confirmaciones de Plan Anual, proyecto/unidad, actividad y criterio exigen `expectedRevision`. El servidor serializa cada linaje o período con un bloqueo transaccional de PostgreSQL y comprueba la revisión al escribir. Las restricciones únicas conservan un solo borrador y una sola versión activa por linaje. Una revisión obsoleta responde `409 version_conflict` con `currentRevision` cuando se conoce. El cliente debe recargar y revisar; no fusionamos cambios automáticamente.

**Integridad histórica.** Las nuevas versiones de proyecto, actividad y criterio reciben `lineage_id`, `revision` y `superseded_at`. Las programaciones, evidencias, criterios y documentos ya vinculados conservan sus IDs históricos. Claves compuestas y guards acotados impiden mezclar año, aula, plan, estudiante, período, actividad y criterio de árboles diferentes. La migración audita filas existentes y aborta si detecta inconsistencias; no las repara ni elimina. Rollback: revertir el código y la migración únicamente en una base de prueba restaurada desde respaldo, sin borrar cadenas históricas en uso.

**Evaluación y cierre.** La confirmación compara revisión y huella de evidencias recalculada dentro de la misma transacción. `suggested_level` sigue siendo propuesta; `achievement_level` requiere confirmación docente. El cierre serializa por período, comprueba la versión vigente y huella esperadas, y congela identidad docente, institución, UGEL, aula, edad, año, período, fecha y referencias históricas de valoración/conclusión. Ninguna pantalla cliente es la única barrera de integridad. Esta decisión no conecta Auth, Storage ni Supabase real.

## ADR 043 Evaluación por estudiante, competencia y período formal

**Decisión.** `evaluation_periods` define bimestres o trimestres del año escolar. La pantalla Evaluar presenta una ficha por estudiante, competencia y período, y consulta las tablas existentes `evidences`, `competency_assessments` y `competency_descriptive_conclusions`. El alcance incluye competencias de criterios de actividades y proyectos del plan anual que se superponen con el período, incluso cuando aún no hay evidencias. Una docente puede añadir o excluir una competencia con motivo; una competencia con observaciones o valoración no se puede ocultar. Las fuentes conservan IDs de actividad, criterio, desempeño cuando existe, fecha y evidencia adjunta privada.

**Decisión docente.** Ninguna evidencia individual recibe AD/A/B/C. La IA propone `suggested_level` y una conclusión, sin confirmar el nivel. `achievement_level` solo se escribe cuando la docente revisa la ficha, elige el nivel y confirma. La ausencia de registros y la información insuficiente permanecen como estados distintos de C. La docente debe dejar una justificación explícita cuando confirma con pocos registros, contra una sugerencia de información insuficiente o con un nivel diferente del sugerido. El análisis, la conclusión y la justificación confirmados se versionan en las tablas existentes. Un cambio posterior en las fuentes marca la valoración como «requiere revisión» por comparación de snapshots.

**Cierre y salidas.** `period_closures` guarda la huella de todas las fichas confirmadas. El Informe de Progreso estructurado y el CSV de consolidado se calculan de las valoraciones vigentes, sin duplicar notas. El consolidado se puede previsualizar con pendientes antes del cierre; la salida final solo se habilita con cierre vigente. No se ingresa información automáticamente a SIAGIE. Las tablas nuevas y vínculos usan migraciones aditivas local/Supabase; las políticas RLS de Supabase se deberán verificar en staging antes de habilitar ese backend. Revertir la interfaz no elimina observaciones ni valoraciones anteriores.

## ADR 038 Un plan anual por cuenta y año escolar, presentado como documento

**Decisión.** Cada cuenta conserva como máximo un plan anual vigente por año escolar. `school_years.owner_id` identifica la cuenta y un índice único parcial sobre `annual_plans.school_year_id` protege los estados `draft` y `active`, incluso si la cuenta tiene más de un aula. El servidor consulta el año antes de llamar al modelo y antes de insertar; un borrador existente se reabre y edita sobre el mismo ID. Los planes de años anteriores se conservan y los archivados siguen legibles. No se borran ni fusionan duplicados antiguos automáticamente al aplicar la migración.

**Documento y revisión.** Antes de generar, la docente ve una comprobación breve de colegio, docente, aula, calendario y resumen diagnóstico grupal confirmado. El plan generado aparece como un documento con encabezado institucional y secciones de diagnóstico, propósitos, competencias, ruta anual, acompañamiento, seguimiento y revisión. La plantilla compartida por la usuaria orientó esta organización, pero las secciones sin base suficiente quedan vacías u omitidas y el número de experiencias es dinámico. Los nombres de competencias se resuelven desde KB v4; el payload estructurado validado sigue siendo la fuente canónica. `annual-plan-v2` añade propósitos, estrategias, seguimiento, colaboración familiar y apoyos, manteniendo lectura/edición de planes v1 históricos. La edición es secundaria y la confirmación exige guardar primero. El encabezado y las categorías grupales confirmadas se obtienen del servidor y quedan como snapshot seguro en `document_context`, sin datos individuales de niños. El workflow anual recibe todas las tarjetas v4 aplicables a la edad para poder proponer competencias a lo largo del año; los demás workflows conservan su shortlist acotado.

**Consecuencia y reversión.** El plan confirmado se muestra en solo lectura. El índice y el guard del servidor evitan generaciones duplicadas y gasto innecesario; la UI no es la única barrera. Si se revierte la nueva vista, `proposal` sigue disponible y `document_context` es una columna aditiva. Hay que resolver manualmente eventuales duplicados vigentes previos antes de aplicar el índice en un entorno con datos. No se genera PDF ni se efectúa una llamada de IA en las pruebas.

## ADR 037 Un comentario diagnóstico por niño

**Decisión.** La revisión inicial reúne en una vista la entrevista familiar confirmada, todas las observaciones guiadas y espontáneas del niño y un solo comentario diagnóstico redactado por la docente. La entrevista informa el contexto, pero no cuenta como evidencia observada. La tabla niño × competencia permite localizar registros y añadir una observación factual por celda, incluso si estaba vacía; no pide una síntesis por celda. El servidor valida docente, niño y aplicabilidad de la competencia por edad, Castellano L2 y Religión, y guarda cada nota en la fuente espontánea existente con clasificación docente explícita, sin clasificador ni nivel de logro. Las notas previas permanecen. El comentario se guarda como borrador en `diagnostic_student_reviews`, se confirma con huella de todas las fuentes y queda inmutable; cambios posteriores de entrevista u observaciones exigen una nueva versión. Sin observaciones, la docente solo puede confirmar que necesita seguir observando. El resumen grupal nuevo requiere un comentario vigente por cada niño activo y permanece bajo confirmación docente. Las síntesis anteriores por competencia son historial de compatibilidad.

**Seguridad y reversión.** El servidor verifica docente, aula, niño y frescura de fuentes. Supabase prepara RLS de lectura propia y revoca escritura directa autenticada; la migración 0032/202609230005 añade la tabla sin alterar fuentes anteriores. Si se revierte la interfaz, los comentarios nuevos siguen legibles y no modifican las observaciones ni entrevistas canónicas.

## ADR 036 Síntesis diagnóstica escrita por la docente y revisión secuencial

**Estado.** Superada por ADR 037 en la secuencia de UI y el requisito de síntesis por competencia. Se conserva la validación de texto docente para registros históricos.

**Decisión.** El borrador de síntesis individual se prepara con fuentes y estado de información, pero sin texto interpretativo precargado. Las observaciones originales aparecen al lado del editor; guardar y confirmar exigen una síntesis escrita por la docente. El servidor rechaza los antiguos textos de guía si se intentan reutilizar como síntesis. Las confirmaciones históricas que contienen ese texto permanecen inmutables, pero la interfaz las señala para una nueva revisión y no las cuenta como completas en el progreso visible. La vista por niño abre la siguiente competencia pendiente y pliega las ya revisadas.

**Consecuencia.** La aplicación guía la secuencia sin atribuir a la docente una interpretación redactada por el sistema. Las fuentes y versiones históricas permanecen trazables; una corrección crea una versión nueva.

## ADR 035 Fuentes canónicas del diagnóstico y clasificación acotada

**Entrevista familiar.** Son diez preguntas opcionales de contexto agrupadas en tres bloques. Las respuestas se guardan una vez por versión en `student_family_interviews`; la versión confirmada es inmutable y una corrección crea un borrador nuevo. Las respuestas antiguas de doce campos se leen mediante una normalización compatible, sin reescribir la fuente histórica. Perfil y diagnóstico consultan proyecciones de esa fuente; `StudentContextSnapshot` conserva solo lenguaje, intereses, autonomía, comunicación, relación, adaptación y experiencia educativa previa. `buildSafeDiagnosticStudentContext()` aplica una lista explícita adicional, marca la fuente familiar y depura nombres; cada futuro workflow deberá seleccionar solo lo que necesite. Expectativas, rutina diaria y compañía familiar quedan fuera de esa proyección. Un relato de la familia permanece como antecedente informado por la familia: nunca incrementa cobertura, crea evidencia docente, asigna logro ni confirma competencias. La versión confirmada preserva el historial; el snapshot de StudentContext es una materialización derivada que se refresca y no es fuente editable.

**Decisión.** El diagnóstico distingue experiencias guiadas editoriales de Ayni y observaciones espontáneas. El catálogo `knowledge/diagnostic-experiences/catalog.json` es versionado, validado contra tarjetas v4 y hoy está marcado `development_fixture`; no constituye la batería definitiva. En una experiencia, cada aspecto ya conoce su competencia y el mapping es determinista, sin IA. La observación original es fuente canónica append-only: la clasificación es metadata modificable, y una corrección docente no puede ser sustituida por el clasificador. Una entrevista familiar versionada es la fuente canónica de contexto familiar; solo una proyección permitida de una versión confirmada entra a `StudentContextSnapshot`. El PDF o foto de la entrevista queda como respaldo privado, sin OCR ni análisis de imagen.

**Clasificación.** El router v4 reserva `typesafe` para una posible decisión estructurada de competencia en observaciones espontáneas. El adaptador aislado de prueba recibe texto depurado, contexto breve, edad y opciones v4 aplicables; devuelve una decisión validable y puede abstenerse. El servidor vigente no instancia el adaptador ni configura endpoint: después de guardar, el registro queda **Por revisar** hasta la corrección docente. No existe umbral definitivo ni aceptación automática en el producto; cualquier umbral experimental debe pasarse explícitamente y medirse fuera de Ayni. Jev legacy y sus estados de revisión no participan. No se modifican los modelos generativos existentes.

**Write once, use everywhere appropriate.** Entrevista, observaciones guiadas y espontáneas y diagnósticos confirmados se consultan por relaciones y proyecciones para perfil, historial cronológico, evidencia diagnóstica, cobertura, diagnóstico individual/grupal y planificación. Cuaderno de campo, anecdotario y portafolio son posibles vistas del mismo hecho original, no tablas de textos duplicados. Cobertura no equivale a logro; una síntesis diagnóstica confirmada es distinta del assessment formativo posterior. El plan consume únicamente prioridades grupales confirmadas, sin copiar datos sensibles de familias.

**Seguridad y reversión.** Toda escritura se autoriza en servidor por docente, aula y estudiante. Supabase expone solo lectura RLS propia y revoca escritura directa del navegador; el storage del piloto permanece privado. Las migraciones se agregan sin editar las aplicadas. Ante problemas, se desactiva el adaptador TypeSafe y los registros quedan disponibles para organización manual, sin perder observaciones.

## ADR 034 Diagnóstico inicial antes de la planificación nueva

**Decisión.** Para un aula sin plan anual, el siguiente paso docente se resuelve con el estado persistido del diagnóstico: la configuración de docente, institución, edad y aula precede al alta de niños; luego la docente revisa el diagnóstico y guarda explícitamente que examinó la información disponible. Solo entonces se recomienda preparar el plan anual. La revisión usa el estado `completed` y `completed_at` ya existentes en `diagnostic_sessions`; un endpoint de progreso devuelve solo conteos y el estado, sin datos personales. No se exige cobertura total ni se interpreta una observación aislada como evaluación terminada. Los planes existentes permanecen accesibles aunque no tengan esta marca histórica.

**Consecuencia.** La app abre la sección inicial apropiada en un aula nueva y Planificar muestra Diagnóstico como primer paso. La docente puede continuar con información insuficiente y observar después. La marca de revisión no genera niveles, no confirma interpretaciones pedagógicas y no altera datos CNEB.

## ADR 033 Conclusión descriptiva v4 dependiente de assessment confirmado

**Decisión.** `descriptive_conclusion` recibe una sola competencia y usa Sol/medium con el schema estricto `descriptive-conclusion-v1`. El servidor construye el `AIContextBundle` a partir del assessment activo confirmado y las evidencias v4 que lo sustentaron; entrega al proveedor solo identificador neutro, textos depurados y contexto curricular pertinente. La conclusión se guarda como draft versionado y conserva una huella del assessment confirmado. Antes de confirmar, se comprueba que el assessment siga activo e intacto y que sus evidencias no hayan cambiado. La confirmación archiva solo la conclusión activa del mismo estudiante, competencia y periodo dentro de una transacción.

**Consecuencia.** El texto es una propuesta contextual, no texto oficial ni valoración automática. La docente puede revisar, editar y regenerar sobre el mismo draft; una conclusión activa es de solo lectura. `StudentContextSnapshot` conserva un resumen seguro y `family_report` podrá consumirlo en una fase posterior. La metadata técnica permanece en servidor.

## ADR 032 Assessment v4 como síntesis pedagógica revisable

**Decisión.** `assessment` consume solo evidencias v4 del estudiante, competencia y periodo solicitados. El servidor anonimiza el contexto que llega al proveedor, conserva un snapshot de fingerprints SHA-256 de evidencias y criterios, y usa Sol/medium con `assessment-v1` estricto. La docente revisa el borrador y solo puede confirmarlo si las fuentes siguen iguales. La confirmación archiva únicamente la versión activa del mismo estudiante, competencia y periodo dentro de una transacción.

**Consecuencia.** Las marcas observacionales no son notas ni conclusiones finales. Una evidencia obliga a declarar información insuficiente; con más evidencias no se presume suficiencia. La versión confirmada alimenta `StudentContextSnapshot` sin metadata técnica ni multimedia. `descriptive_conclusion` será el siguiente workflow.

## ADR 029 Captura de evidencia v4 determinista

**Decisión.** `evidence_capture` se resuelve exclusivamente en código y reutiliza `evidences`. Cada registro requiere una Activity y un criterio activos, un estudiante del aula y una marca observacional explícita de la docente. Los criterios v4 se enlazan mediante `criterion_id` y conservan su `competency_v4_id`; los criterios legacy siguen usando su UUID propio. La foto queda en almacenamiento local privado y no se envía a proveedores.

**Consecuencia.** La evidencia esperada orienta la interfaz, pero no se transforma en observación ni assessment. `StudentContextService` conserva ambos catálogos con claves explícitas (`v4:<id>` y `legacy:<uuid>`), sin mappings inventados. La captura grupal sigue produciendo únicamente observaciones individuales que la docente decide registrar.

## ADR 028 Plan anual v4 como raíz de planificación

**Estado.** Su política de nuevos borradores/versiones del mismo año queda superada por ADR 038. La persistencia y la confirmación docente continúan vigentes.

**Decisión.** `annual_plan` usa Sol/medium desde el router, guarda propuesta y metadata de auditoría reducida en `annual_plans`, y solo cambia a activo por confirmación docente. En local, el servidor retiene esa metadata tras un identificador opaco de generación hasta que se guarda el borrador; producción debe sustituir este handoff por auditoría durable y con control de acceso. Cada borrador nuevo usa `max(version)+1`; al confirmar se archiva el anterior activo dentro de la misma transacción. Las experiencias propuestas permanecen en el payload; no crean `learning_experiences`.

## ADR 027 Generación de activity desde Planificar

**Decisión.** La pantalla existente Planificar consume un endpoint del backend local para generar únicamente `activity`. El backend obtiene el aula y edad activa, crea el input v4, resuelve el plan, construye el provider con `createAIProviderForPlan` y devuelve solo la propuesta ya validada. La interfaz precarga datos disponibles, permite editar, descartar o regenerar, y no recibe claves, bundle, prompts ni metadata técnica.

**Compatibilidad curricular.** `annual_plan_competencies.competency_id` referencia UUIDs del catálogo heredado. No existe un mapping explícito y seguro desde los IDs semánticos v4, por lo que esa tabla queda sin poblar. La alineación futura mínima requiere una tabla de correspondencias versionada, revisada y con claves v4 antes de persistir competencias estructuradas.

**Consecuencia.** Una generación no crea ni confirma una actividad, competencia, criterio, evidencia o evaluación. La operación local actual no tiene un endpoint aprobado para crear actividades; por ello “Revisar y guardar” deja explícito que la propuesta sigue sin persistir hasta diseñar esa operación sobre la base existente. La metadata queda en el límite del backend para una futura auditoría, sin exponerla a la docente.
## ADR 026 Smoke controlado para OpenAI activity

**Decisión.** El único smoke real disponible usa `npm run smoke:openai-activity`, un input ficticio mínimo para `activity`, el plan central y `createAIProviderForPlan`. Si falta `OPENAI_API_KEY`, informa que no se ejecutó y termina sin invocar proveedor. El script muestra únicamente el resultado validado, el uso de tokens y el tiempo total.

**Consecuencia.** El equipo puede comprobar el camino completo con una llamada explícita y acotada, sin exponer claves, prompts, bundles completos, nombres, multimedia ni rutas privadas. Las pruebas automáticas inyectan factory y generador simulados, por lo que no consumen API ni generan costos.
## ADR 025 OpenAI aislado para generación v4 de actividades

**Decisión.** `OpenAIProvider` es una implementación intercambiable de `AIProvider` para los workflows habilitados por el router. Recibe únicamente un `AIContextBundle` inmutable, el schema `activity-v1` y el execution plan producido por `resolveAIExecutionPlan`. Usa la Responses API con Structured Outputs strict y toma la clave solo de `OPENAI_API_KEY`; el modelo y `reasoning_effort` se obtienen del plan central y cualquier discrepancia se rechaza.

**Consecuencia.** La respuesta conserva validación local, provenance y metadata de uso, sin enviar fotos, rutas privadas, multimedia ni input crudo. Errores de clave, autenticación, rate limit, timeout, respuesta incompleta, rechazo, JSON inválido o modelo inesperado son estados estructurados. Las pruebas usan un cliente simulado y no realizan llamadas de pago.

**Estado.** Histórico: la misma arquitectura v4 también habilita `annual_plan` desde ADR 028.
## ADR 024 Política central de routing de modelos

**Estado.** Superada en selección de modelos y fallback por ADR 072; se conserva la separación entre política, orquestación y proveedor.

**Decisión.** `resolveAIExecutionPlan` decide de forma determinista el tier, provider, modelo y posibilidad de escalamiento antes de cualquier generación. Code resuelve tareas deterministas; TypeSafe queda reservado para decisiones estructuradas; Luna, Terra y Sol se asignan según complejidad. Ningún modelo ni provider puede escoger su propio routing.

**Consecuencia.** Los nombres de modelo viven en una sola política versionada y la generación de `activity` consume el plan sin acoplarse a un modelo. El escalamiento Luna → Terra → Sol queda permitido solo donde la política lo declara y no se ejecuta automáticamente.

## ADR 023 Generación de actividades mediante provider neutral

**Decisión.** La primera generación vertical de IA usa `generateAIWorkflowV4(input, options)`: prepara el bundle v4, entrega al provider inyectado una copia inmutable del `AIContextBundle` y valida una salida estructurada de actividad antes de devolverla. El provider no recibe el input crudo ni puede seleccionar conocimiento fuera del bundle.

**Consecuencia.** La selección de proveedor/modelo queda desacoplada de la Knowledge Base y se podrá configurar externamente sin cambiar el constructor de contexto. `activity` y `annual_plan` están habilitados; los otros 11 workflows permanecen fuera de la capa generativa.


**Estado.** Histórico: ADR 028 extiende esta arquitectura a `annual_plan`; no describe ya el único workflow habilitado.
## ADR 022 Arquitectura vigente de IA: Knowledge Base v4

**Decisión.** La arquitectura vigente de IA para Inicial 3–5 es `knowledge/cneb-initial-3-5/v4.0.0/` y su pipeline `loadKnowledgeBaseV4` → `retrieveKnowledgeV4` → `buildAIContext` → `prepareAIRequestV4`. El runtime usa conocimiento versionado y no lee PDFs, no crea `official-corpus` y no depende de Jev ni del Knowledge Pack v2.

**Consecuencia.** Cualquier integración futura de modelo consume únicamente `AIContextBundle`. v3, Jev y los catálogos previos se mantienen como histórico, compatibilidad o pruebas legacy; no deben ser importados por integraciones nuevas.

## ADR 021 Preservación explícita de entradas de workflow

**Decisión.** El bundle v4 conserva los campos presentes requeridos o preferidos por el workflow en `context.workflow_inputs`, además de los subconjuntos de aula, estudiante y evidencia ya definidos. Las tarjetas sin competencia confirmada provienen únicamente de unidades semánticas recuperadas; no se completan por orden alfabético.

**Consecuencia.** Un futuro modelo recibirá el propósito, detonante, situación, material o bloque horario como dato estructurado y no deberá deducirlos de la solicitud libre. Contextos vacíos no satisfacen requisitos obligatorios.

## ADR 020 Contexto obligatorio y aplicabilidad antes de IA

**Decisión.** Un bundle solo se construye cuando el contexto obligatorio declarado por su workflow está presente en campos estructurados. Las tarjetas candidatas respetan las condiciones de L2 y Religión, y los atajos prohibidos forman parte de las restricciones duras.

**Consecuencia.** El backend no aparenta disponer de información que falta ni expone contexto estructurado que el workflow no necesita. Las integraciones de modelos deberán manejar el error estructurado de contexto incompleto antes de solicitar una generación.

## ADR 019 Constructor de contexto acotado por workflow

**Decisión.** `buildAIContext` compone loader, retrieval, tarjetas completas, referencia curricular de una sola edad, módulos pedagógicos, reglas de generación y guardrails en un bundle trazable por workflow. Una competencia confirmada restringe el bundle a esa tarjeta; sin confirmación se entregan pocas candidatas sin declarar una ganadora.

**Consecuencia.** La futura capa de IA recibirá solamente conocimiento pertinente y una procedencia completa. L2, Religión y los overlays de 2026 exigen aplicabilidad explícita antes de entrar al bundle.

## ADR 018 Retrieval local determinista para Knowledge Base v4

**Decisión.** El retrieval v4 filtra unidades por workflow, edad, dominios permitidos, competencia confirmada y aplicabilidad contextual. Excluye por defecto las reglas temporales de 2026 y las unidades de Castellano L2 o Religión sin contexto explícito. Luego ordena de forma estable según la política versionada y aplica los límites de unidades semánticas y reclamos de fuente.

**Consecuencia.** La selección es repetible, trazable y local. La construcción de contexto de IA, cualquier proveedor de modelos y los embeddings siguen fuera de esta fase.

## ADR 017 Runtime de carga para Knowledge Base v4

**Decisión.** Cargar la Knowledge Base v4 desde sus JSON y JSONL versionados, validando versión, huellas SHA-256, cardinalidades, IDs, referencias de fuente, edades y requisitos de workflow al iniciar su consumo. El loader no realiza retrieval ni construye contextos de IA.

**Consecuencia.** Las futuras llamadas de IA podrán depender de una base comprobada y trazable sin releer PDFs en runtime. La selección de unidades y `buildAIContext` quedan en una fase posterior.

## ADR 013 Estadísticas con cobertura y señales separadas

**Decisión.** `StatisticsService` calcula conteos desde datos estructurados y clasifica por separado poca presencia en planificación, información insuficiente y necesidad observada con cobertura suficiente.

**Consecuencia.** El contrato podrá alimentar interfaz, informe o Excel sin guardar cifras manuales ni presentar porcentajes como dominio del aula. Ninguna señal modifica la planificación; una futura sugerencia requerirá confirmación docente.

La señal interna usa una cobertura mínima configurable de 50%, y requiere al menos tres estudiantes y 25% de la información suficiente para mostrar una necesidad grupal. Estas constantes no son un estándar CNEB ni una calificación.

## ADR 012 Memoria pedagógica como derivación estructurada

**Decisión.** El contexto pedagógico individual se construye en servidor desde estudiante, diagnóstico y evidencias; se conserva como `student_context_snapshots.structured_payload` para consultas posteriores. Los binarios multimedia y una síntesis generada no forman parte del payload actual.

**Consecuencia.** Niños puede mostrar trayectorias reales sin depender de un documento Word ni de IA. Los snapshots se regeneran cuando se registra evidencia o diagnóstico y no emiten una evaluación final automática.

## ADR 011 Marca observacional por evidencia, no nivel de competencia

**Decisión.** Las nuevas evidencias asociadas a un criterio guardan una marca docente obligatoria (`demonstrated`, `with_support`, `not_yet_demonstrated` o `insufficient_information`) y una nota opcional. La actividad entrega todos los criterios que planificó; la docente elige el observado cuando hay más de uno.

**Consecuencia.** Una evidencia puede guardarse sin texto, no equivale a una calificación CNEB y podrá acumularse como trayectoria sin interpretar archivos multimedia ni inferir un nivel final.

## ADR 014 Ejecución guiada con posición persistente

**Decisión.** La ejecución diaria conserva una referencia a la actividad planificada y solo persiste un índice de paso en `daily_execution_logs`; no duplica pasos ni crea una sesión independiente. Continuar actividad abre esa vista y `keep_current` queda reservado para extender manualmente un bloque.

**Consecuencia.** La docente puede avanzar, retroceder o cerrar la actividad sin quedar atrapada en un asistente obligatorio. Si la planificación reduce sus pasos, el índice se limita al último paso disponible.

## ADR 015 Evidencia fotográfica local y privada

**Decisión.** La primera evidencia multimedia es una foto opcional, reducida en el navegador antes de enviarla a la API local y almacenada bajo `.local/assets/evidences/` con un UUID no derivado de datos del niño. La futura equivalencia será el bucket privado `student-evidence`; no se crean recursos ni se aplican políticas en cuentas externas desde este repositorio.

**Consecuencia.** Las fotos no se incluyen en el contexto de IA ni se exponen por ruta pública. Las siguientes modalidades multimedia quedan fuera de esta fase.

## ADR 010 Resolvedor central para la jornada diaria

**Decisión.** La pantalla Hoy no calcula su estado con reglas dispersas. El servidor local usa `resolveDailyState` para decidir el bloque actual/siguiente, la acción primaria y los pendientes a partir de horario, asistencia, ejecución y excepción de calendario.

**Consecuencia.** La interfaz conserva una sola acción principal y puede manejar ingreso tarde, cierre posterior a una actividad, actividad extendida, feriados y ausencia de horario sin crear copias de la planificación. El mismo contrato se podrá portar al backend de Supabase.

## ADR 011 Doble revisión para propuestas curriculares de Jev

**Estado.** Superada para la arquitectura de IA vigente por ADR 017–022, en particular ADR 022. La condición `official_review_status === verified` y `semantic_review_status === verified` permanece solo en Jev legacy y no bloquea Knowledge Base v4.

**Decisión.** Una tarjeta que Jev use para proponer competencia o desempeño debe tener `official_review_status: verified` y `semantic_review_status: verified`, además de todos sus campos obligatorios. Para desempeño, también debe coincidir con la edad y con la competencia ya confirmada por la docente.

**Consecuencia.** La ausencia de catálogo oficial trazado obliga el modo de selección manual. Los bancos de casos sirven para medir el enrutamiento y el fallback, pero no convierten hipótesis semánticas en contenido oficial ni activan una integración de IA.

## ADR 016 Knowledge Pack semántico importado con cuarentena curricular

**Estado.** Superada como ruta principal de IA por ADR 022. `CNEB_Inicial_AI_KnowledgePack_v2` permanece como histórico/compatibilidad; v4 es la fuente vigente y no requiere transcribir ni extraer PDFs para completar su runtime.

**Decisión.** El paquete CNEB Inicial AI Knowledge Pack v2 enriquece las fichas semánticas existentes y conserva sus 140 candidatos de desempeño en un catálogo separado. La importación mantiene ambos estados de revisión en `pending`; no escribe sobre `curriculum/official` ni agrega candidatos semánticos como desempeños del runtime.

**Consecuencia.** Jev obtiene mejores explicaciones, ejemplos y distinciones cuando exista una ficha doblemente validada, pero el estado actual sigue exigiendo selección manual. La siguiente ingestión oficial debe transcribir PDF MINEDU, guardar página/sección/hash y recién mapear estos candidatos a IDs oficiales.

## ADR 009 Horario derivado para la pantalla Hoy

**Decisión.** Guardar bloques de horario que referencian actividades existentes y registrar su ejecución diaria de forma separada. La pantalla Hoy consulta esos bloques en la zona horaria America/Lima; no crea una copia diaria de actividades ni talleres.

**Consecuencia.** Reprogramar una hora conserva la actividad original y las evidencias siguen vinculadas a su criterio.

## ADR 008 Referencia visual del diagnóstico

**Decisión.** Adaptar la interfaz a la referencia visual proporcionada (azul marino, turquesa y acentos pastel, navegación lateral clara, tarjetas y lista de competencias con progreso), conservando el nombre Ayni Aula, la estructura de datos y los flujos reales existentes. La imagen es una guía estética; sus nombres, conteos y estados no son datos del proyecto.

**Consecuencia.** El diseño se aplica al tema global, perfil y diagnóstico sin introducir dependencias externas ni cambiar el modelo pedagógico.

## ADR 001 Servicios externos aislados

**Problema.** El equipo dispone de conexiones existentes de Vercel y Supabase que no pertenecen a este proyecto.

**Decisión.** No usar, enlazar ni modificar esas cuentas. El repositorio solo incluye contratos, migraciones y variables vacías. La conexión se hará más adelante con cuentas nuevas y primero en staging.

**Consecuencia.** El desarrollo persiste datos en PostgreSQL embebido local y no está desplegado.

## ADR 005 PostgreSQL local sin Docker

**Problema.** Docker Desktop falló en el equipo por sockets locales; se necesitaba continuidad de desarrollo sin depender del daemon.

**Opciones consideradas.** Supabase CLI local con Docker; SQLite; PostgreSQL embebido con PGlite.

**Decisión.** Usar PGlite para el desarrollo local. Conserva semántica PostgreSQL, funciona sin daemon y persiste en una carpeta ignorada por Git. Mantener migraciones Supabase separadas para Auth, RLS y Storage, con nombres e IDs de dominio equivalentes.

**Consecuencia.** El flujo puede desarrollarse y probarse localmente; la seguridad real de Supabase debe validarse después en staging.

## ADR 006 Diagnóstico basado en referentes revisados

**Decisión.** Cada marca observacional se vincula a un referente de competencia y edad, y cada referente a uno o más `performance_ids`. Los estados son operativos, no niveles oficiales. El catálogo de muestra se identifica como tal y no se exporta a producción por defecto. Notas y archivos son opcionales.

**Consecuencia.** Una observación aislada nunca determina una conclusión ni actualiza el plan anual automáticamente. La síntesis requiere revisión y confirmación docente.

## ADR 007 Importación Supabase offline primero

**Decisión.** La exportación local pasa por validación curricular y genera un paquete SQL/manifiesto revisable. El importador no toma credenciales ni escribe en cuentas externas. El UUID de Auth del proyecto nuevo se indica explícitamente al generar el paquete.

**Consecuencia.** La aplicación de migraciones, subida privada de logos y pruebas RLS quedan para un proyecto nuevo de staging.

## ADR 002 Fuente de verdad estructurada

**Decisión.** Currículo, aula, planificación, actividad, criterio y evidencia viven como datos relacionados. Los textos de IA y los DOCX/PDF son resultados derivados y regenerables.

## ADR 003 IA con confirmación docente

**Decisión.** La IA propone y organiza. No inventa hechos sobre estudiantes ni confirma niveles finales. Toda conclusión o valoración queda asociada a confirmación docente.

## ADR 004 Currículo versionado

**Decisión.** Los textos oficiales se almacenan por versión y se referencian por ID estable. Una experiencia o actividad no guarda una reformulación libre de la competencia como sustituto del dato oficial.


## ADR 029 Project y Unit como experiencias v4 derivadas

**Decisión.** `project` y `unit` usan schemas estrictos, routing Sol/medium y se materializan solamente tras confirmación docente como `learning_experiences`. Una propuesta del plan anual se identifica por `annual_plan_id` y su índice final; un índice único evita duplicados. Las experiencias emergentes usan `origin = emergent`. La metadata queda detrás de un identificador opaco de generación y nunca llega al navegador.

**Consecuencia.** El plan anual sigue siendo una propuesta. Project y Unit conservan en `details` propósito, competencias v4, detonante o necesidad, caminos o situaciones, materiales, evidencia y flexibilidad para la futura creación de actividades. Esta fase no crea `activities`; workshop sigue pendiente.

## ADR 030 Activities v4 derivadas de experiencias confirmadas

**Estado.** La creación y persistencia continúan vigentes; ADR 073 sustituye la ausencia de criterio por herencia desde el blueprint confirmado.

**Decisión.** Las nuevas actividades docentes se crean únicamente como hijas de un `learning_experience` activo de tipo `project` o `unit`. El servidor vuelve a comprobar propiedad del aula, estado del parent, aplicabilidad y pertenencia de la competencia v4, fechas de experiencia y año escolar en generación, guardado, edición y confirmación. La salida `activity-v1` se persiste íntegra en `activities.details`; `generation_metadata` queda en servidor y se asocia mediante un identificador opaco de generación.

**Consecuencia.** La docente no vuelve a transcribir el contexto del Project o Unit. Los borradores se pueden reabrir y editar; las actividades activas son de solo lectura. `sequence` y `adaptations` se mantienen como arreglos vacíos y no se crean filas en `activity_criteria` ni evidencias: esos conceptos se resolverán en `criterion_and_evidence`, sin mapear IDs v4 al catálogo curricular legacy.

## ADR 031 Criterios v4 preparados desde actividades confirmadas

**Estado.** Flujo histórico. ADR 073 incorpora el criterio normal al Project Master y conserva generación separada solo como `criterion_realignment` excepcional.

**Decisión.** `criterion_and_evidence` se genera solo para una Activity activa con competencia v4 confirmada. Su salida estricta se persiste en `activity_criteria.details`, con `competency_v4_id` y sin UUID artificial en `competency_id` ni `performance_id`. La docente confirma el criterio antes de que pueda usarse en un flujo posterior.

**Consecuencia.** El criterio y la evidencia esperada no registran una observación real ni crean filas en `evidences`. Las filas legacy siguen usando `competency_id` UUID; la migración permite ambos formatos. `evidence_capture` será el siguiente workflow.

## ADR 035 Informe familiar como comunicación derivada de conclusiones confirmadas

**Decisión.** `family_report` recibe solo las conclusiones descriptivas v4 activas y confirmadas del estudiante, completamente dentro del rango elegido y para las competencias seleccionadas por la docente. El servidor resuelve y anonimiza el contenido antes de crear el `AIContextBundle`; el proveedor recibe identidad neutral, sin UUID, fotos, rutas ni metadata técnica. La salida estricta `family-report-v1` conserva una sección por competencia y el estado de información suficiente o insuficiente.

**Persistencia.** `family_reports` guarda el contenido estructurado, periodo, versión y estado draft/active/archived. IDs de conclusiones, snapshot con huellas de contenido y metadata de generación permanecen en servidor. Guardado de nueva generación y confirmación revalidan fuentes; la confirmación archiva la versión anterior del mismo estudiante y periodo en una transacción. La edición manual conserva auditoría y fuentes; regenerar reemplaza ambas mediante un identificador válido. Migraciones local y Supabase preparan índices únicos parciales y RLS por estudiante.

**Consecuencia.** El informe confirmado queda inmutable y podrá alimentar un documento futuro sin regeneración. No se incorpora a `StudentContextSnapshot`: ya existen conclusiones confirmadas como fuente de continuidad y se evita que la comunicación familiar se convierta en nueva fuente de assessment. `material_generation`, PDF, despliegue y Supabase real siguen pendientes.

## ADR 036 Preparación local separada de autorización real

**Decisión.** El piloto local puede configurar un docente/aula nuevos y cargar niños sin SQL manual. `AYNI_LOCAL_TEACHER_ID` selecciona la identidad ficticia del proceso local; no se toma del navegador ni se considera Auth. Los datos pedagógicos se filtran por aula. El handoff de generación se guarda en PostgreSQL con TTL; fotos usan una interfaz de almacenamiento privado. La exportación de datos de menores exige habilitación explícita.

**Consecuencia.** RLS y Storage están definidos en migraciones, pero no probados contra Supabase. No se despliega el servidor local como backend real. Un API con Auth verificada por petición, aislamiento en staging, backups y prueba con dos docentes son condiciones para datos reales. Ver `docs/PRODUCTION_READINESS.md`.

## ADR 037 Recorrido docente guiado por estado persistido

**Decisión.** La interfaz responde a la próxima decisión de la docente con una acción principal y una continuación clara. Planificar ordena Plan Anual → Project/Unit → Activity → criterio; Evaluar orienta desde evidencias hacia análisis, conclusión e informe. Los estados del recorrido se derivan de registros del servidor, nunca de pestañas visitadas. Los formularios muestran primero preguntas esenciales y dejan detalles complementarios bajo demanda. La IA permanece como ayuda para preparar propuestas que la docente revisa y confirma.

**Consecuencia.** Al recargar, la docente puede retomar el borrador existente sin crear otro. Un borrador nuevo no oculta la versión confirmada aún válida. La navegación y las tarjetas de siguiente paso no alteran estados pedagógicos ni sustituyen la validación del servidor. Hoy sigue siendo la entrada cotidiana; el perfil del niño elige el paso válido según evidencias v4, análisis y conclusiones confirmados, sin ofrecer análisis v4 desde registros legacy. Las continuaciones de criterio, análisis y conclusión se muestran desde registros recargados, no solo tras hacer clic en Confirmar.

## ADR 038 Experiencias diagnósticas con elección libre de niños

**Decisión.** Una experiencia diagnóstica presenta una oportunidad de juego/observación, aspectos sencillos y competencias aplicables provenientes de la KB v4. El app muestra siempre a toda el aula por defecto; la docente elige libremente a quién observó. Se permiten cero, una o varias observaciones por niño y aspecto, también en días distintos. Los registros son acumulativos y usan los mismos estados conceptuales de `evidence_capture`, con fuente y competencia v4 explícitas. Los filtros y conteos de cobertura son orientativos, nunca niveles de logro. No se crea automáticamente un registro negativo para niños sin observación.

**Persistencia y seguridad.** `diagnostic_experience_observations` conserva la fuente diagnóstica sin fingir una Activity ni un criterio confirmado. El servidor valida docente, aula, niño, edad, experiencia, aspecto, aplicabilidad L2/Religión y estado; Supabase prepara RLS equivalente. StudentContext incorpora las observaciones, mientras valoración y revisión docente siguen separadas. El sistema legacy continúa disponible para lectura/compatibilidad. La reversión de la nueva UI consiste en volver a importar `GuidedDiagnostic` desde `profile-and-diagnostic.tsx`; los registros nuevos permanecen intactos.

## ADR 039 Síntesis diagnóstica versionada y distinta del assessment formativo

**Decisión.** La observación de una experiencia diagnóstica es un hecho docente append-only con catálogo versionado, competencia v4 y procedencia visible. No se inserta en `evidences`, que exige Activity y criterio confirmados y representa evaluación formativa posterior. Ambas fuentes comparten estados observacionales, pero conservan tablas, procedencia y usos distintos. “Aún no se observó” indica que hubo oportunidad sin la actuación descrita; “información insuficiente” indica que el registro no permite interpretación. No hay registro significa solamente falta de información.

**Revisión individual.** `diagnostic_competency_reviews` almacena un borrador editable y versiones confirmadas inmutables por niño y competencia. Preparar la propuesta organiza únicamente conteos y notas reales en código local; no llama a IA. La docente decide el estado informativo y redacta la interpretación. El servidor calcula el snapshot de fuentes y exige que permanezca igual al confirmar. Un cambio posterior requiere preparar una versión nueva; nunca altera la confirmada. `StudentContext` incluye solo la última síntesis confirmada como diagnóstico y conserva las observaciones por separado; un borrador no se convierte en hecho del niño. El assessment formativo sigue leyendo exclusivamente evidencias de Activity/criterio.

**Revisión grupal y planificación.** La vista grupal muestra cobertura por niños distintos y competencias aplicables, sin umbrales de logro ni ranking. Una revisión grupal requiere al menos una síntesis individual confirmada y conserva su propio snapshot. La docente escribe y confirma fortalezas, necesidades y prioridades; solo esa versión confirmada se ofrece como `diagnostic_summary` a la planificación, con nombres conocidos depurados. No se crean proyectos o niveles por porcentajes. Se puede seguir observando después de confirmar. El periodo diagnóstico carece de plazo automático. La información inicial opcional del niño es contexto, no evidencia ni fuente de la síntesis.

**Recorrido docente.** La interfaz llama Resumir al último paso diagnóstico y muestra la secuencia niño → competencia observada → síntesis docente → resumen grupal. Sin síntesis individual confirmada, la vista grupal lleva directamente a elegir un niño; la cobertura por competencia y el contexto familiar son consultables, pero no interrumpen la acción principal. Esto no cambia los requisitos ni la autoridad del servidor.

**Señales de avance.** El check de Conocer exige entrevistas familiares confirmadas para todos los niños activos, pero la entrevista es opcional y no impide observar o resumir. Observar indica únicamente que cada niño activo tiene al menos un registro diagnóstico de cualquier fuente; Resumir requiere revisión grupal confirmada. Ningún check acredita suficiencia de información, nivel de logro ni cierre definitivo: el aprendizaje y la observación continúan durante el año. Los conteos se derivan de las fuentes existentes, sin nuevos registros duplicados.

**Seguridad y reversión.** El servidor valida docente, aula, niño, competencia aplicable y fuentes en cada operación. Supabase habilita lectura RLS por aula, pero revoca escrituras directas autenticadas sobre tablas diagnósticas: la futura API con Auth verificada debe ser la única autoridad de escritura. Las migraciones y políticas requieren prueba de aislamiento en staging antes de usar datos reales. Para revertir la navegación, se puede volver a la UI diagnóstica anterior; las tablas y versiones permanecen para lectura histórica. Ninguna migración aplicada se edita.

## ADR 040 Contexto derivado y mínimo por workflow

**Decisión.** La entrevista versionada, observación diagnóstica, revisión confirmada, evidencia formativa, assessment y conclusión siguen siendo fuentes canónicas. `StudentContext` es una proyección individual actual con procedencia; `ClassroomContext` es un agregado bajo demanda que se construye solo después de autorizar el aula. Durante la entrevista se eligen opciones estructuradas de lenguas (varias y principal), intereses (varios y «Otro») y experiencia previa (estado y tipo opcional); el comentario original queda en la misma versión. El pequeño catálogo de opciones se versiona. No existe una clasificación posterior obligatoria. Solo las entrevistas confirmadas contribuyen al agregado. No se infieren patrones de texto libre sin un extractor validado. Celdas pequeñas y grupos pequeños se suprimen antes de UI o IA.

**Consumidores y snapshots.** La política `CONTEXT_POLICY_V4` asigna fuente, proyección, consumidor, permiso de IA y finalidad. Plan Anual, Project, Unit y Activity reciben subproyecciones grupales diferentes; diagnóstico, assessment, conclusión e informe reciben subsets individuales y no el aula completa. El caché `student_context_snapshots` de versión 1 se actualiza con el estado actual. Una generación de planificación conserva en su metadata de servidor un snapshot mínimo del agregado público y su huella de fuentes para auditoría histórica. Las entrevistas y adjuntos no se copian a nuevas tablas de contexto ni al proveedor. Ver `docs/CONTEXT_ARCHITECTURE.md`.

**Reversión.** Los builders pueden dejar de incluir `context_v4` y la UI ocultar el panorama grupal sin borrar ni migrar fuentes; las generaciones antiguas mantienen su metadata histórica. El backend local no sustituye Auth/RLS en staging.

## ADR 041 Pistas diagnósticas breves con ejemplos opcionales

**Decisión.** Una experiencia diagnóstica presenta primero una descripción corta de lo que harán los niños y hasta cinco aspectos observables escritos en lenguaje cotidiano. Cada aspecto puede desplegar dos o tres ejemplos; permanecen cerrados por defecto. La lista de niños sigue inmediatamente a las pistas y la relación curricular se muestra plegada al final. El catálogo `diagnostic-v4.2` conserva los IDs de experiencias/aspectos, el vínculo a competencia y referente por edad, y estado `development_fixture` hasta revisión editorial. Se omiten pistas de competencias no aplicables a la edad o aula, aunque queden menos de cuatro.

**Registro.** La docente elige un aspecto para organizar una única nota sobre lo que vio u oyó. La UI guiada guarda `observed_without_judgment` y no exige Sí/No, marcas de logro ni un formulario por aspecto. El análisis ocurre después, mediante revisión docente. Observaciones anteriores conservan su versión y texto de aspecto como snapshot; no se reescriben al cambiar el catálogo. La reversión de la presentación consiste en volver a la vista anterior sin modificar registros.

**Aclaración editorial v4.3.** La experiencia abierta muestra una secuencia de tres acciones en lenguaje docente: preparar un juego concreto, observar mientras los niños juegan y elegir a un niño solo cuando haya algo significativo que anotar. La instrucción de preparación se versiona en el catálogo para cada experiencia; la descripción breve de la tarjeta sigue sirviendo para elegirla. No se añade otro formulario ni una obligación de cubrir todas las pistas.

## ADR 042 Biblioteca de documentos sobre registros canónicos

**Decisión.** «Documentos» reúne el resumen diagnóstico del aula, planes anuales, proyectos/unidades v4, actividades v4 e informes a familias ya guardados. La lista muestra año escolar, tipo, título y estado; el contenido se solicita solo al abrir un documento y se presenta en solo lectura. El plan anual reutiliza su presentación documental existente. No se crea una copia en otra tabla ni se transforma un borrador en confirmado al visualizarlo.

**Acceso y alcance.** El servidor local filtra cada lista y cada detalle por docente propietario del año escolar y del aula; no acepta el docente desde la URL. La respuesta omite metadata de generación, tokens, snapshots internos y rutas privadas. Las pantallas de edición originales siguen siendo la autoridad para corregir o confirmar. La reversión consiste en ocultar la entrada de navegación y las rutas GET; ningún documento ni migración debe revertirse. Antes de conectar un backend remoto siguen siendo obligatorias Auth por petición y pruebas de RLS en staging.

**Descarga Word.** Cada documento abierto ofrece un `.docx` generado a demanda desde la misma proyección autorizada; la descarga vuelve a verificar propiedad en el servidor. El plan anual toma los mismos datos guardados que la vista en pantalla. Los otros tipos exportan solo campos pedagógicos presentables y usan nombres de competencias v4, sin prompts, tokens, rutas privadas ni metadata de generación. El archivo no se almacena como copia y no cambia el estado del registro. El nombre de descarga usa tipo, año e ID corto, sin nombre del niño. La exportación no llama a IA.

**Plantilla anual v4 (actualizada 2026-09-23).** La descarga del Plan Anual usa la plantilla Word suministrada por la usuaria, alojada en el backend y saneada de metadatos personales. El servidor rellena portada, datos de institución y aula, diagnóstico grupal confirmado, decisiones y experiencias desde registros autorizados; un plan antiguo activo puede recuperar únicamente datos confirmados que faltaban en su snapshot. El logo actual se consulta por docente y se inserta en el Word. La docente puede subir PNG/JPG/WebP de hasta 2 MB; el servidor valida la imagen, elimina metadatos y guarda una versión PNG local. La ruta anual usa cuatro bimestres por defecto en la generación y el editor. El ejemplo manual `desarrollo_programacion_anual_5_anios_2026.docx` orientó una presentación más breve con datos generales y experiencias agrupadas por bimestre. No se fuerza su lista de 20 proyectos ni fichas con fechas, productos y materiales que el plan todavía no conoce. El Word omite cuadros sin datos reales y evita avisos repetidos de campos pendientes; no inventa competencias, intereses, fechas ni resultados. Los nombres curriculares citados provienen de KB v4. La generación del `.docx` sigue siendo local y no invoca modelos. Para revertir esta presentación, el exportador anterior permanece disponible como código, sin migrar registros. La subida y aislamiento remoto del logo se validarán por separado en el nuevo staging.

## ADR 043 Plan anual rediseñado en dos etapas

**Decisión.** A petición de la usuaria, el plan anual nuevo contiene exactamente veinte proyectos de diez días de lunes a viernes, cinco por bimestre. `gpt-5.6-sol` propone el plan maestro con secuencia, competencias v4 aplicables y puntos de partida; su salida se valida antes de solicitar a `gpt-5.6-terra` propósito, producto final posible y materiales de cada proyecto. La segunda etapa recibe solo una proyección estructurada del maestro validado y el mismo AIContextBundle v4; no puede alterar títulos, orden ni competencias. El servidor calcula las fechas desde el calendario; los feriados y suspensiones aún no se descuentan, por lo que la docente debe revisarlas. Las salidas se fusionan en `twenty_projects_ten_days`, se vuelven a validar al guardar y confirmar, y el Word se rellena desde la plantilla rediseñada del backend. La docente puede editar el contenido del borrador, conservando estructura y trazabilidad. Los planes v1/v2 siguen descargándose con el renderizador anterior.

**Control de variedad y portada (2026-09-23).** Títulos que solo cambian de número se consideran repetidos. El maestro también limita la repetición de situaciones y motivos; el desarrollo limita la de propósitos y productos. Un plan demasiado repetitivo se rechaza antes de guardarse, sin reintento automático del modelo. La exportación Word deja el encabezado visual solo en la portada y el título de desarrollo mensual en la primera ficha. Para borradores con datos institucionales ausentes en su snapshot, la descarga completa el nombre y la UGEL desde el perfil actual de la misma docente; el logo siempre procede de ese perfil autorizado.

**Presentación y fechas (2026-09-23).** PGlite puede devolver fechas SQL como objetos `Date`; el servidor convierte inicio y fin del año a días ISO en UTC antes de construir la agenda o guardar el contexto documental. El Word presenta una versión abreviada de contexto, prioridades, evaluación y flexibilidad para mantener legibles las tablas, sin alterar la propuesta pedagógica guardada. Cuando faltan enfoques propuestos, el cuadro de orientaciones puede tomar estrategias docentes de la propia propuesta; si tampoco existen, usa una indicación general de juego, observación y ajuste.

**Entradas y privacidad.** Antes de generar se muestran institución, docente, edad, año, fechas, diagnóstico grupal confirmado, intereses agregados y recursos registrados. La indicación adicional de la docente es opcional. Ninguna respuesta individual de entrevista, nombre de niño, foto o archivo pasa al proveedor. Un plan que no cabe en el calendario se rechaza antes de invocar modelos. Esta decisión sustituye solo para planes nuevos la flexibilidad de cantidad de proyectos descrita en ADR 042; no cambia planes históricos.

## ADR 044 Doce propuestas y calendario lectivo explícito

**Decisión.** ADR 043 queda como formato histórico: las nuevas generaciones proponen exactamente doce proyectos, tres por periodo lectivo, y muestran esos mismos doce en el editor y el Word. Son propuestas iniciales que la docente puede ajustar, mover o sustituir. La acogida, adaptación y evaluación diagnóstica se guarda como `initial_stage` independiente, con duración predeterminada de dos semanas lectivas editable y sin código P01 ni producto final obligatorio. Los planes de veinte proyectos ya guardados conservan su renderizador y contrato de lectura.

**Calendario.** `school_years` y `calendar_exceptions` existentes se complementan con `calendar_blocks` y `project_slots`; no se duplican los años escolares. Una plantilla nacional 2026 carga cuatro bloques lectivos y cinco de gestión, editables antes de generar el plan y mientras siga en borrador, con las fechas de la [Norma Técnica MINEDU 2026](https://repositorio.minedu.gob.pe/handle/20.500.12799/11753). Se pueden agregar bloques de feriado, vacación o suspensión institucional. Cada proyecto ocupa dos o tres semanas lectivas completas, comienza un lunes y termina un viernes. El servidor calcula fechas tras la etapa inicial y nunca extiende un proyecto a una semana de gestión. Una semana totalmente interrumpida no cuenta; un feriado aislado no elimina los demás días lectivos de esa semana. Un proyecto no comienza en lunes no lectivo ni termina en viernes no lectivo. Prefiere tres semanas para la última propuesta de cada periodo y reduce a dos cuando el calendario lo exige. Si doce proyectos de dos semanas no caben, advierte y bloquea la generación antes de llamar al modelo. Guardar y confirmar vuelven a calcular y validar las fechas; los slots se persisten con el plan. Un cambio del calendario con borrador revalida el proyecto y actualiza slots y contexto del documento en una transacción; el plan confirmado conserva su calendario aprobado.

**Documento y reversión.** Una plantilla Word derivada de la versión rediseñada presenta la etapa inicial, cuatro periodos, un cronograma de doce filas y doce fichas. La exportación usa el calendario guardado en el contexto del plan y conserva el logo institucional autorizado. La reversión de las rutas nuevas consiste en deshabilitar el editor y el formato nuevo; las migraciones se dejan intactas, y los documentos históricos siguen su ruta anterior. El calendario de cada institución requiere revisión docente, especialmente feriados y suspensiones no cargados en la plantilla nacional.

## ADR 045 Plantilla diagnóstica basada en fuentes confirmadas

**Decisión.** El informe Word diagnóstico adopta la plantilla visual entregada por la usuaria, pero rellena solo campos con fuente canónica: perfil institucional, resumen grupal docente, entrevistas confirmadas como contexto y recuentos de observaciones/comentarios. La matriz de interpretación por competencia y el seguimiento nominal opcional se omiten porque el flujo actual no guarda esas conclusiones grupales. En su lugar se muestra cobertura por competencia, sin asignar niveles. La descarga se autoriza otra vez en servidor y nunca incluye respuestas familiares, notas individuales, archivos, metadata técnica ni nombres de niños. El logo proviene del perfil de la misma docente.

**Alcance y reversión.** No hay llamada a IA, migración ni nuevo registro. Los recuentos muestran las fuentes disponibles al descargar; la redacción grupal sigue siendo la versión seleccionada. Si la plantilla se retira, puede volver a usarse el exportador Word genérico sin modificar datos. El informe generado se abre y se verifica visualmente con datos ficticios antes de entregarse.

## ADR 046 Guardado local de Word para el prototipo

**Decisión.** El navegador integrado de Codex no inicia una descarga de archivo, incluso si el servidor responde con `Content-Disposition: attachment`. En el prototipo local, Documentos ofrece una acción explícita para guardar el Word en `Downloads` del usuario que ejecuta Ayni. El servidor vuelve a comprobar la propiedad del documento, genera el archivo en memoria y utiliza un nombre generado por la aplicación sin datos de niños ni texto libre. Una versión diferente recibe sufijo y no sobrescribe otra; una versión idéntica reutiliza el archivo. Se conserva el enlace de descarga HTTP para navegadores y dispositivos que sí admiten descargas.

**Alcance.** Este mecanismo guarda en la computadora que ejecuta el servidor local; no debe trasladarse sin cambios a un backend remoto. En producción, el guardado debe quedar a cargo del navegador o de un mecanismo explícito para el dispositivo de la docente. Para revertirlo, se retira la acción POST y se mantiene la descarga HTTP; los documentos canónicos en la base no cambian.

## ADR 047 Nueva versión de un plan anual histórico

**Decisión.** Un plan anual confirmado conserva su formato original al descargarlo: el exportador no transforma silenciosamente una propuesta antigua de seis experiencias en doce proyectos. Si el plan vigente del aula usa un formato anterior, la docente puede generar una versión con el formato actual y guardarla como único borrador del año escolar. El plan anterior permanece vigente durante la revisión. Al confirmar el borrador, el servidor archiva el anterior y activa la nueva versión en una transacción. Los índices del año permiten a lo sumo un plan activo y un borrador; las versiones archivadas permanecen como historial.

**Control y reversión.** La sustitución se autoriza por aula y año en el servidor, comprueba el ID del plan activo, el formato antiguo y la generación correspondiente. Documentos advierte cuando se abre un plan de formato anterior. Para revertir la interfaz se puede ocultar la acción de preparar una versión actualizada sin alterar los documentos históricos; la migración de índices se conserva.

## ADR 048 Skill para el Plan Maestro anual

**Estado.** La Skill y los contratos siguen vigentes; la asignación actual es Sol/high según ADR 073.

**Decisión.** Separar la metodología pedagógica del primer prompt anual en la Skill de repositorio `skills/crear-plan-anual/`. `SKILL.md` conserva el alcance y las prohibiciones esenciales; `references/` detalla la lectura de fuentes, los criterios CNEB y el contrato pedagógico. El servidor carga únicamente esos archivos fijos y los envía como instrucciones del primer llamado, Sol/high. La petición docente permanece como dato filtrado en el `AIContextBundle`. El esquema `annual-plan-v2`, la validación contra competencias aplicables, el calendario, la redacción con Terra/low y la plantilla DOCX siguen bajo control de la aplicación.

**Control y reversión.** No hay migración de datos ni cambio del formato guardado. Las pruebas verifican que la Skill llegue solo al Plan Maestro y que el segundo llamado conserve su contrato. Si se detecta una regresión, se puede restaurar el prompt anterior y retirar el cargador de Skill sin tocar borradores o documentos confirmados. La Knowledge Base CNEB versionada sigue siendo la autoridad curricular; la Skill no almacena una copia de su catálogo.

## ADR 049 Skill para proponer la síntesis diagnóstica grupal

**Estado.** La Skill, privacidad y confirmación siguen vigentes; la ayuda se denomina `diagnostic_group_synthesis` y usa Sol/medium según ADR 072.

**Decisión.** `skills/crear-evaluacion-diagnostica/` concentra la metodología de lectura de fuentes, cautelas CNEB y los tres campos de la propuesta grupal. En «Revisar aula», la docente puede pedir una sugerencia opcional cuando ya confirmó un comentario vigente por cada niño. El servidor entrega al modelo únicamente la edad, el número de niños y esos comentarios con nombres conocidos neutralizados; no envía entrevistas, registros de observación, fotos, archivos ni identificadores. La propuesta vuelve como `strengths`, `needs` y `planning_priorities`, se valida y aparece en el editor. La profesora corrige y confirma; la IA no guarda ni confirma resultados.

**Control y reversión.** El router `diagnostic` conserva Terra/low y el proveedor estructurado existente. El servidor comprueba aula, docente, borrador y vigencia de las fuentes antes y después de la llamada. El Word diagnóstico y el Plan Anual siguen leyendo solo la versión grupal confirmada. No hay migración ni cambio del formato guardado; para revertir se retira el botón y la ruta de sugerencia, y la redacción manual permanece disponible.

## ADR 050 Cuatro hitos pedagógicos y evidencias anuales completas

**Estado.** Los hitos y la separación producto/evidencia siguen vigentes; las asignaciones Sol/Terra fueron sustituidas por ADR 072.

**Decisión.** En los planes nuevos de doce propuestas, la Skill reserva cuatro proyectos cercanos a Día del Niño Peruano, Día de la Educación Inicial, Fiestas Patrias y Navidad/cierre de año. El calendario entrega a Sol los espacios lectivos calculados; la Skill establece el vínculo pedagógico y deja los otros ocho proyectos guiados por diagnóstico, intereses y necesidades. El hito no sustituye una competencia ni convierte una celebración en producto obligatorio. Terra conserva el desarrollo; calendario, validación, guardado y DOCX permanecen en código.

**Documento.** El resumen de evaluación del Word flexible presenta la primera categoría de evidencia observable de cada una de las doce propuestas, en vez de las primeras ocho categorías de la secuencia. Las notas de observación se nombran como registros; los criterios no se presentan como instrumentos. El campo `final_product` conserva su contrato, pero se muestra como «Producto posible del proyecto», separado de la evidencia individual. No hay migración ni cambio de planes históricos. Para revertir la orientación de hitos se retira la referencia de Skill; el plan guardado no requiere conversión.

## ADR 051 Plantillas unificadas como vistas de datos estructurados

**Decisión.** Las cuatro plantillas entregadas por la docente se conservan sin modificar en `assets/templates/` con versión `unificada-v1`. El registro confirmado en la base es la fuente de verdad; el exportador llena una copia en memoria. Los documentos anteriores sin marcador de versión conservan su exportador. El Plan Anual nuevo se llena con los mismos doce objetos para la distribución mensual, el cronograma y las doce fichas; se omiten las ocho fichas sobrantes del archivo original.

**Diagnóstico.** El informe interno puede mostrar nombres, observaciones y comentarios confirmados por niño. La síntesis grupal continúa separada. La ausencia de registros se expresa como información insuficiente. El servidor vuelve a comprobar la propiedad del aula al descargar. Solo se incluye una proyección de la entrevista familiar pertinente como contexto, identificada como información de la familia.

**Trazabilidad.** El contexto estructurado del plan anual guarda el ID de la revisión diagnóstica confirmada que lo originó. Si esa revisión cambia durante una generación, el borrador generado no se puede guardar con un vínculo equivocado. Proyecto/unidad conserva el ID del plan y el índice de su propuesta; cada actividad conserva el ID de la fila de su ruta. Las ediciones del proyecto y la actividad guardan `teacher_overrides`.

**Proyecto y actividad.** Sol mantiene el routing existente para preparar la ruta de proyecto o unidad, ahora con la Skill `crear-proyecto-unidad`; Terra mantiene el routing de la actividad y recibe `crear-actividad`. Cada fila de la ruta obtiene un ID estable al guardar. La actividad hereda esa fila por ID y sus cambios docentes quedan registrados explícitamente. El criterio heredado se confirma junto con la actividad sin una segunda generación. La plantilla de actividad incorpora evidencias y cierre solo cuando existen registros reales de la docente.
La confirmación de la actividad y la inserción del criterio heredado se ejecutan en una sola transacción para evitar estados parciales.

**Reversión.** Retirar los marcadores de formato nuevos en futuras generaciones restaura los exportadores anteriores; los registros y las plantillas originales permanecen intactos. Los cambios pedagógicos ya confirmados no se regeneran al exportar.

## ADR 052 Actividad: criterio práctico y observación descriptiva

**Decisión.** Las actividades nuevas que nacen de una fila confirmada de proyecto o unidad heredan competencia, propósito y criterio con identificador estable. La IA desarrolla `evidence_opportunities` como «¿Qué observar?» específico de esa actividad; la docente puede corregir decisiones heredadas y el cambio queda registrado. El Word usa la plantilla nueva intacta como base y representa el criterio activo, el referente de edad como síntesis orientativa y los datos estructurados autorizados.

**Registros posteriores.** Guardar una observación requiere texto o foto, pero no una marca de logro. El servidor vincula alumno, actividad, criterio, competencia y fecha; el DOCX muestra el criterio de cada registro, no el criterio genérico de la actividad. Solo se incorporan hechos guardados por la docente, y las fotos permanecen en almacenamiento privado. El análisis posterior puede considerar estos registros sin inferir una conclusión desde la ausencia de marca.

**Reversión.** La plantilla anterior permanece en el repositorio y puede restablecerse en el exportador. La interfaz de captura puede revertirse sin transformar registros existentes ni editar migraciones. Los estados observacionales históricos siguen siendo legibles.

## ADR 053 Vigencia del diagnóstico que alimenta un plan nuevo

**Decisión.** La revisión grupal confirmada solo se usa para generar un Plan Anual nuevo si su `source_snapshot` sigue coincidiendo con los comentarios individuales confirmados y estos, a su vez, con entrevistas y observaciones actuales. La vista grupal separa las tres decisiones docentes de dos proyecciones calculadas: intereses con etiquetas repetidas en entrevistas confirmadas de estudiantes activos, y competencias aplicables que todavía carecen de registros para parte del aula. La ausencia de observación nunca se interpreta como dificultad. Las proyecciones no se guardan en la revisión ni se promueven a prioridades automáticamente.

**Control y reversión.** El servidor bloquea generar, guardar o confirmar un plan nuevo si el diagnóstico está desactualizado. La generación pendiente y el borrador nuevo conservan la huella de fuentes ya disponible para evitar confirmar una propuesta preparada con datos anteriores. El contexto de IA sigue siendo grupal y suprime patrones de celdas pequeñas. No hay migración ni cambio de los planes confirmados históricos; revertir la proyección de la interfaz no exige transformar registros.

## ADR 054 Versiones inmutables del Plan Anual

**Decisión.** «Preparar nueva versión» copia el plan vigente de doce propuestas y sus espacios de calendario a un borrador sin llamar a la IA. La copia registra una FK al plan sustituido, una FK al diagnóstico grupal confirmado y la huella del contexto vigente. La docente puede editar el borrador; al confirmarlo, el plan anterior pasa a histórico y la copia a vigente. Un trigger impide modificar o borrar planes confirmados y solo permite la transición de vigente a histórico sin cambiar su contenido. Los planes antiguos sin procedencia determinable conservan campos de relación nulos.

**Descendientes.** Los proyectos y unidades conservan el ID y el índice de la propuesta del plan del que nacieron. El plan vigente aporta las propuestas para trabajo nuevo; los proyectos existentes de planes históricos permanecen visibles y los borradores pueden completarse con su fuente archivada. La biblioteca continúa leyendo las versiones históricas desde su fila original. El flujo anterior que convierte un plan de formato antiguo a doce propuestas permanece separado de la copia sin IA.

**Reversión.** La interfaz y la ruta de copia pueden retirarse sin alterar planes confirmados; la migración se conserva porque fija procedencia e inmutabilidad. No se regeneran Plan Maestro, desarrollo ni DOCX al crear una versión copiada.

## ADR 055 Versiones de Proyecto y Unidad sin reasignar actividades

**Decisión.** «Preparar nueva versión» copia una experiencia confirmada de tipo proyecto o unidad a una fila nueva en borrador. Guarda una FK a la versión anterior y conserva el plan anual, origen, índice de propuesta y tipo. La copia no llama a la IA; la docente puede editarla o pedir explícitamente una nueva redacción usando el generador existente. Al confirmar, la versión anterior pasa a histórica y V2 queda vigente en una transacción. Un trigger protege las versiones confirmadas frente a cambios de contenido o eliminación. Las filas antiguas parten de versión 1 sin inventar relaciones retrospectivas.

**Actividades.** Su `experience_id` nunca se modifica. La versión histórica sigue disponible para consultar y terminar actividades ya creadas, incluso borradores; solo la versión vigente admite actividades nuevas. Las propuestas anuales del plan vigente y las experiencias ya creadas son listas distintas. La biblioteca conserva cada versión por ID para consulta y exportación.

**Reversión.** Se puede retirar la acción de copia y regeneración sin migrar actividades ni modificar documentos previos. La migración de procedencia e inmutabilidad se conserva; las migraciones local y Supabase son equivalentes.

## ADR 056 Versiones de Actividad sin mover evidencias ni programación

**Decisión.** La docente puede copiar una actividad confirmada de un proyecto o unidad vigente. La copia es un borrador con ID y versión propios; editarla o regenerarla requiere una acción explícita. Al confirmar, la actividad anterior pasa a histórica en la misma transacción que confirma la nueva y guarda su criterio heredado. Un trigger impide modificar o borrar el contenido de versiones confirmadas. Los criterios, observaciones, evidencias, registros de ejecución y bloques programados mantienen el ID de la actividad original.

**Programación.** Los bloques futuros con fecha que aún no tengan ejecución se muestran como asociados a la versión histórica. La docente puede cambiar cada bloque a la nueva versión de forma explícita. Los bloques recurrentes o ya ejecutados no se reasignan automáticamente. La consulta de Hoy sigue leyendo una actividad histórica si está programada.

**Reversión.** Se puede retirar la acción de copia y el cambio explícito de programación sin alterar los documentos ni datos históricos. La migración de procedencia e inmutabilidad permanece; los esquemas local y Supabase son equivalentes.

## ADR 057 Versiones de criterio y lectura histórica

**Decisión.** Un criterio confirmado puede copiarse a un borrador V2 para edición o regeneración expresa. La nueva versión conserva `activity_id` y competencia; al confirmar, V1 pasa a histórica en la misma transacción. Un índice único permite solo un criterio activo y un borrador por actividad y competencia. Las evidencias existentes conservan exactamente su `criterion_id` y el criterio archivado es inmutable.

**Documento.** Cada observación del Word lee el texto del criterio al que está vinculada por ID. Para una actividad histórica, el encabezado usa su criterio de origen (versión 1); para una actividad vigente, usa el criterio activo. No se sustituye el significado de observaciones anteriores por un texto nuevo.

**Reversión.** Se puede retirar la acción de copia sin tocar las evidencias. La migración y las versiones históricas se conservan para proteger su procedencia.

## ADR 058 Borrador persistente de evaluación por período

**Decisión.** La misma fila `competency_assessments` en estado borrador guarda análisis de IA o docente, `suggested_level`, conclusión en trabajo, nivel provisional y justificación. `achievement_level` permanece nulo hasta la confirmación docente; una restricción de base lo protege. La sugerencia de IA se guarda con el snapshot de evidencias y se puede recuperar tras salir. La confirmación exige que la versión guardada coincida con los campos visibles y con el fingerprint actual; archiva el borrador y crea la valoración confirmada usando las tablas existentes.

**Insuficiencia.** La ausencia de evidencias o una sugerencia de información insuficiente mantiene un estado propio y nunca se convierte en C. Si cambian las fuentes, la docente debe revisar y guardar de nuevo; al hacerlo se descarta una sugerencia de IA desactualizada.

**Reversión.** Los campos de borrador son opcionales y las valoraciones confirmadas anteriores siguen legibles. La interfaz puede volver al flujo previo sin transformar niveles oficiales. La migración local y Supabase añade las mismas columnas y restricción.

## ADR 059 Manifiesto inmutable del cierre del período

**Decisión.** Cada cierre nuevo crea `period_closure_versions` con versión, período, fecha, docente, fingerprint y un manifiesto de IDs de evaluaciones y conclusiones confirmadas, niveles docentes y snapshots de las observaciones que sustentaron el cierre. `period_closures` conserva solo el puntero al cierre más reciente. Un trigger impide modificar o borrar manifiestos. Los cierres antiguos sin manifiesto permanecen legibles como cierre legacy, sin inventarles una versión retrospectiva.

**Documento.** Documentos muestra una proyección estructurada y explícitamente provisional de cada cierre histórico. No se genera Word de cierre hasta recibir una plantilla definitiva. El acceso se limita en servidor al aula y año de la docente; las evidencias visuales no se copian al manifiesto.

**Reversión.** Se puede retirar la vista provisional y mantener la tabla histórica. El puntero nullable conserva compatibilidad con cierres anteriores. Las migraciones local y Supabase son equivalentes.

## ADR 060 Informe familiar ligado al período formal

**Decisión.** `family_reports` reutiliza su flujo de borrador, edición y confirmación y agrega una referencia opcional a `evaluation_periods`. Los informes históricos solo reciben el vínculo si año escolar y fechas coinciden exactamente con un único período; los demás conservan el vínculo nulo. Un trigger valida la correspondencia de estudiante, año y fechas en cada escritura vinculada.

**Fuentes.** Cuando se usa un período formal, el informe toma solo conclusiones confirmadas con las fechas exactas del período. Las conclusiones fuente no se modifican. El acceso continúa comprobando en servidor que el estudiante pertenece al aula activa. La interfaz anterior basada en fechas sigue legible durante la integración con Evaluar.

## ADR 061 Informe familiar dentro de Evaluar

**Decisión.** Evaluar comparte el aula, período formal y estudiante seleccionados con el generador existente de informes familiares. La docente escoge conclusiones confirmadas, genera una propuesta, la edita, guarda un borrador y confirma. El Word conserva el nombre del período y la docente. Documentos muestra tanto las versiones vinculadas como los informes históricos sin período formal.

**Autorización.** El servicio puede resolver un aula concreta solo si pertenece a la docente y al año escolar de su cuenta; cada estudiante se comprueba dentro de esa aula. La descarga vuelve a verificar la propiedad del documento. El flujo heredado por fechas permanece para leer y editar informes antiguos.

## ADR 062 Cobertura pedagógica derivada

**Decisión.** La cobertura no guarda otra tabla de resultados. Se calcula para el aula y período autorizados desde estudiantes activos, competencias aplicables a su edad, alcance previsto, criterios de actividades, evidencias y valoraciones existentes. Muestra cada pareja niño–competencia, incluso sin registros. “Sin registro” y “pendiente de observar” describen el estado de documentación; nunca se transforman en un nivel C ni en una dificultad. Las acciones conducen a Planificar, donde la docente decide qué preparar.

## ADR 063 Hallazgos del período como contexto opcional de planificación

**Decisión.** Al preparar un proyecto, unidad o actividad, la docente puede marcar una opción inicialmente desactivada para usar hallazgos del período formal que elija. El servidor comprueba otra vez la propiedad del aula y el año, y construye un resumen grupal a partir de la cobertura derivada y las valoraciones confirmadas. Las necesidades y oportunidades aparecen como patrones compartidos únicamente cuando se repiten en al menos dos valoraciones y hay al menos tres valoraciones confirmadas de la competencia. Se suprimen nombres, identificadores y referencias a archivos; no se envían entrevistas, observaciones individuales ni evidencias visuales. La docente conserva la decisión de aceptar o editar lo generado.

**Recorrido.** Una vez confirmada una actividad, Planificar muestra el ciclo cotidiano y accesos al plan anual, proyecto o unidad y actividad. Los datos existentes no cambian por esta proyección. Retirar la opción de contexto restaura la generación anterior sin migración ni transformar planes confirmados.

## ADR 064 Acceso Supabase de solo lectura por docente

**Decisión.** La migración `202609240010_rls_hardening.sql` sustituye las políticas antiguas `FOR ALL` de las 40 tablas privadas por una política `SELECT` para `authenticated` limitada a la cuenta, aula o estudiante propio. En tablas con dos referencias de ámbito comprueba también que ambas pertenezcan al mismo árbol. Se revocan las escrituras directas de `anon` y `authenticated`; las reglas de negocio y la autorización de escritura siguen en el backend. Las tablas curriculares solo ofrecen lectura autenticada. `ai_pending_generations` no tiene acceso cliente.

**Funciones y archivos.** Las cinco funciones `SECURITY DEFINER` de pertenencia pasan de `public` a `private`, con `search_path` vacío, relaciones calificadas y `EXECUTE` solo para `authenticated`. Se revoca `EXECUTE` público de las funciones de `public` y la creación de objetos en ese esquema. Storage conserva lectura propia de logos, evidencias y entrevistas; se retiran sus políticas de escritura cliente.

**Verificación y reversión.** `scripts/test-supabase-rls.mjs` aplica todas las migraciones a PGlite con emulación mínima de los esquemas Auth y Storage, inspecciona el catálogo y prueba dos docentes, dos aulas y operaciones cruzadas. La migración no se ha aplicado a una instancia Supabase real ni se ha conectado Auth. Si hiciera falta restaurar escritura cliente, debe hacerse en otra migración específica y con las mismas pruebas de aislamiento; no se edita esta migración.

## ADR 065 Identidad verificada por petición

**Decisión.** La API usa un único límite de Auth antes de enrutar. En modo `supabase`, recibe un Bearer o una cookie HTTP-only de inicio de sesión por correo y contraseña y consulta `/auth/v1/user` en Supabase Auth en cada petición. Solo el ID de usuario confirmado por Auth se convierte en `teacherId`; cada petición recibe `{ teacherId, requestId, db }`. No se aceptan IDs docentes del cuerpo ni de cabeceras como identidad. Los servicios pedagógicos existentes siguen recibiendo el ID verificado y mantienen sus comprobaciones de pertenencia.

**Selectores y respuestas.** Una autorización reutilizable resuelve aula, niño, período y los principales IDs de documentos y evaluación hasta su docente propietaria antes de llamar a los servicios. Un aula ajena explícita devuelve 403; alumnos, períodos y recursos privados ajenos o inexistentes devuelven 404. Sin token o con token inválido/expirado se devuelve 401. Todas las rutas privadas, incluidos Word y adjuntos, pasan por el mismo límite; `/health`, configuración de Auth e inicio/cierre de sesión son públicos. El exportador local se deshabilita en modo Supabase.

**Cliente y alcance.** El navegador guarda el token solo en cookie HTTP-only con `SameSite=Lax`; todas las llamadas a la API incluyen credenciales. Staging debe servir interfaz y API bajo el mismo sitio HTTPS y configurar su origen exacto con `AYNI_ALLOWED_ORIGIN`; en modo Supabase no se admiten los orígenes locales por defecto. `AYNI_LOCAL_TEACHER_ID` se lee solo en modo `local` con PGlite, que escucha únicamente en loopback y se rechaza en producción. La opción de guardar Word directamente en las Descargas del servidor queda limitada al modo local; la descarga HTTP sigue protegida en ambos modos. Este commit usa PGlite como base incluso al probar el modo Auth Supabase con un servidor Auth simulado; aún no conecta PostgreSQL/Supabase real, Storage ni despliegue.

**Reversión.** No hay migración de datos. Desarrollo puede volver a `AYNI_AUTH_MODE=local`; las políticas RLS del commit anterior permanecen. Antes de conectar una base real deben repetirse estas pruebas contra staging, con datos ficticios y las variables privadas solo en servidor.

## ADR 066 Adaptador PostgreSQL para staging

**Decisión.** Una interfaz `query/exec/transaction` permite reutilizar los servicios actuales con PGlite en desarrollo y `pg.Pool` en staging. `AYNI_DB_MODE=local` exige Auth local; `AYNI_DB_MODE=postgres` exige Auth Supabase. La excepción Auth simulado + PGlite se habilita solo en pruebas. Cada petición usa un wrapper de DB propio y una transacción manual fija su conexión hasta terminar; `transaction()` conserva la conexión y soporta savepoints. El pool se cierra al apagar el servidor.

**Seguridad y migraciones.** La URL PostgreSQL es solo de servidor y debe pertenecer a una conexión backend con escritura; la identidad siempre procede de Auth verificado por petición y los servicios mantienen ownership. Las lecturas directas de Data API continúan bajo RLS y las escrituras cliente siguen revocadas. La migración `202609240011_staging_curriculum_version.sql` agrega metadatos curriculares activos que el seed local aportaba y un proyecto vacío no tenía. No crea competencias ni desempeños. Storage permanece desconectado: las rutas de fotos, logos y adjuntos devuelven 503 en staging.

**Validación y límite.** La suite aplica las migraciones Supabase desde cero en PGlite con Auth/Storage simulados, compara tablas y columnas con el esquema local y comprueba 40 tablas privadas con RLS. El adaptador se prueba con pool simulado; no se ha abierto una conexión PostgreSQL externa ni desplegado. Ver `docs/STAGING_POSTGRESQL.md` para variables, matriz de acceso, prueba posterior y rollback.

## ADR 067 Espacio docente móvil y Biblioteca de recursos

**Decisión.** La navegación principal del espacio docente tiene Hoy, Planificar, Aula, Evaluar y Biblioteca; Perfil se abre desde el avatar. Las nuevas portadas muestran avances derivados de los servicios existentes y abren los recorridos de planificación, diagnóstico, actividad y evaluación sin duplicar sus decisiones ni almacenar otro estado pedagógico. El número de estudiantes, registros y pendientes nunca se toma de los mockups.

**Biblioteca.** La primera colección lee recursos piloto versionados en `biblioteca-talleres/`: talleres para cada edad de 3 a 5 años y un material imprimible. Cada recurso conserva su edad, propósito, criterio y archivo; «Usar en actividad» propone el contexto y los materiales en el borrador, sujetos a revisión docente. «Mis documentos» reutiliza el módulo existente. La categoría Fichas muestra un estado vacío mientras no existan fichas reales. Los archivos se sirven solo tras el límite de Auth; la escritura en Descargas está limitada al modo local y la descarga HTTP usa la sesión autenticada.

**Reversión.** Se puede volver a la navegación anterior y retirar la portada Biblioteca sin migrar datos. No se alteran planes, actividades, evaluaciones ni recursos docentes guardados. Las rutas nuevas de recursos pueden retirarse sin tocar los documentos existentes.

## ADR 068 Modelos GPT-6 y registros multimedia docentes

**Estado.** La multimedia y privacidad siguen vigentes; el reparto de modelos fue sustituido por la política central de ADR 072.

**Modelos.** El router central usa GPT-6 Sol para el plan maestro anual, proyectos, unidades, análisis y conclusiones; GPT-6 Luna para redacción, diagnóstico, actividades, criterios, informes y desarrollo del plan. Las decisiones deterministas permanecen en código. El plan anual conserva dos llamadas y las Skill, contratos y plantillas existentes. La clasificación de observaciones espontáneas utiliza una llamada pequeña a GPT-6 Luna con el conjunto cerrado de competencias aplicables a la edad. La sugerencia nunca confirma una competencia ni asigna un nivel.

**Audio y privacidad.** Un archivo de audio de hasta 60 segundos y 8 MB se valida en servidor antes de guardarse o enviarse. Solo el botón explícito «Transcribir y mejorar texto» envía el audio a `gpt-4o-mini-transcribe`; GPT-6 Luna corrige la transcripción con un contexto breve sin añadir hechos. La docente revisa el texto editable. Las fotos no se envían a IA. Los nombres de niños se neutralizan en las llamadas de redacción y clasificación; el audio puede contener voz identificable, por lo que la interfaz informa claramente del envío antes del clic.

**Datos y autorización.** Una observación espontánea conserva una sola fuente con hasta varias competencias elegidas por la docente en `competency_v4_ids`; las sugerencias se almacenan aparte. Las vistas de diagnóstico, contexto del niño y Word expanden esa relación sin duplicar la observación. Las evidencias de actividad siguen vinculadas a niño, actividad y criterio; texto, foto y audio son formas de la misma evidencia, nunca evaluaciones individuales. Archivos y descargas pasan por propiedad docente y almacenamiento privado local. En PostgreSQL remoto la carga sigue bloqueada hasta conectar Storage privado.

**Migración y reversión.** Las migraciones nuevas `0045` y `202609250001` añaden columnas y conservan registros históricos. Se puede revertir el routing a la versión anterior sin alterar datos; desactivar la llamada del clasificador deja observaciones en revisión manual. No se despliega ni conecta Storage como parte de este cambio.
# ADR 069 Prioridades grupales confirmadas y cobertura separada de la valoración

**Decisión (2026-09-25).** La síntesis diagnóstica grupal conserva texto libre y añade `competency_priorities` con ID v4, énfasis y motivo. La IA solo propone; la docente confirma o modifica el borrador. `observe_more` expresa falta de información, no bajo logro. El Plan Anual reutiliza `annual_plans.source_diagnostic_review_id`, ya existente, y recibe únicamente prioridades confirmadas. La necesidad individual de observación se calcula por estudiante, competencia y período, independiente de la prioridad grupal. `CoverageState` y `AssessmentState` son proyecciones distintas; AD/A/B/C permanece exclusivamente en la valoración docente confirmada. Los parámetros de cobertura y alertas son heurísticas internas de Ayni, no reglas MINEDU.

**Heurísticas centralizadas.** `src/lib/ayni-heuristics.mjs` define 42 días para actualidad de registros, dos situaciones y dos fechas para cobertura variada, cuatro sugerencias visibles en «Podrías observar hoy», alerta de menos de dos oportunidades anuales, alerta de concentración en un período y solicitud de explicación docente cuando hay menos de dos registros. Estos números orientan la interfaz; no determinan suficiencia pedagógica ni nivel. Un único registro puede sustentar un análisis si su contenido lo permite, con justificación docente. El mapa y la matriz son proyecciones; no añaden competencias ni modifican planes o valoraciones confirmadas.

**Referente curricular.** Una competencia del ciclo puede planificarse aunque no exista desempeño específico publicado para la edad. La ficha distingue nombre y capacidades oficiales, síntesis identificada del estándar del ciclo y ausencia del desempeño de edad. Los criterios situados son construcción pedagógica; no se presentan como desempeños MINEDU ni se copian de otra edad.

## ADR 069 Diagnóstico confirmado por etapas y preplan editable

**Decisión.** La docente confirma por separado «Así está mi grupo» y «Prioridades del año». La segunda propuesta de IA se prepara solo a partir de la primera versión confirmada. Los comentarios individuales pueden recibir una sugerencia contextual de Luna; cuando no hay observaciones docentes se indica información insuficiente. La entrevista familiar es contexto y nunca evidencia de desempeño. `diagnostic_priority_reviews` guarda versiones, origen y la modificación docente; la tabla anterior de diagnóstico permanece intacta.

**Mi año.** Sol High recibe la visión grupal y prioridades confirmadas, intereses y contexto adicional, calendario y tarjetas CNEB que contienen solo la edad del aula. Devuelve exactamente doce propuestas iniciales breves. `annual_plans.proposal` es la fuente de verdad estructurada: cada fila tiene ID estable, título, tipo, bimestre, mes, duración, motivo, propósito y competencias. La docente puede editar, mover, agregar o eliminar antes de confirmar; el calendario calcula fechas y señala cuando no caben. La cobertura advierte, sin insertar competencias automáticamente. Solo existe un plan vigente por año escolar y un borrador nuevo puede reemplazarlo al confirmarse. Las versiones anteriores y las experiencias ya vinculadas conservan sus IDs.

**Word derivado.** Después de confirmar «Mi año», Luna recibe exactamente esa versión, su diagnóstico de origen, prioridades, CNEB de la edad, calendario, datos institucionales y la estructura real de la plantilla unificada. Solo desarrolla redacción y detalles formales. `annual_plan_formal_content` guarda esa derivación por ID del plan; no altera las filas confirmadas. Cronograma y fichas del Word parten del mismo arreglo y aceptan entre una y veinte propuestas, límite físico de la plantilla original. Si la llamada falla, el plan sigue confirmado y el Word puede reintentarse. La plantilla original no se modifica.

**Permisos y reversión.** Las rutas usan el `teacherId` verificado por petición y limitan cada lectura/escritura a su aula y año. Supabase concede al cliente solo lectura propia de las dos tablas nuevas, sin escrituras Data API. Las migraciones son aditivas. Volver a la pantalla anterior no borra planes ni prioridades; sus versiones confirmadas siguen disponibles. No se ha desplegado.

## ADR 070 Proyecto Master confirmado antes de desarrollar actividades

**Estado.** El flujo y sus dependencias siguen vigentes; todas las etapas generativas de Project/Unit usan Sol/medium y Actividad Luna/medium según ADR 072.

**Decisión.** El desarrollo de una propuesta anual se divide según sus dependencias. GPT-6 Luna prepara primero el contexto y dos o tres propósitos. Después de la elección o edición docente, otra llamada de Luna produce solo preguntas guía, recorrido flexible y criterios generales para las competencias elegidas. Cambiar contexto, propósito o competencias invalida y regenera esas secciones dependientes; las decisiones anuales confirmadas permanecen intactas.

**Project Master y mapa.** GPT-6 Sol recibe las decisiones revisadas, CNEB filtrado por edad, calendario lectivo y las dependencias. Devuelve fundamento, cierre, recursos y un mapa de actividades con fechas válidas. El servidor asigna IDs estables, valida competencias, fechas y duplicados, y registra modificaciones docentes. El proyecto sigue en borrador hasta que la profesora revisa el mapa y lo confirma. La versión confirmada es la única fuente para su Word y para crear actividades nuevas; las versiones anteriores se conservan.

**Actividad bajo demanda.** GPT-6 Luna desarrolla una sola actividad cuando la docente la solicita. El contexto incluye el Project Master confirmado, la fila seleccionada, sus vecinas anterior y siguiente, su posición y el contexto actualizado escrito por la profesora. La fila hereda propósito, competencia, criterio y evidencia esperada; la IA no replantea el proyecto ni genera todas las actividades por adelantado.

**Datos, permisos y reversión.** `source_proposal_id` enlaza plan, espacio de calendario y proyecto sin depender de títulos. `experience_formal_contents` guarda la redacción formal derivada. Las escrituras continúan detrás del servidor; Supabase solo concede lectura propia de la redacción formal mediante RLS. Los planes históricos sin IDs de propuesta usan el ID estable del espacio de calendario como compatibilidad. Las migraciones son aditivas y no modifican migraciones aplicadas.

## ADR 071 Calendario escolar versionado y fecha canónica de actividad

**Decisión.** Mantener una base oficial versionada por año y una capa independiente de excepciones por aula. Un feriado nacional, un fin de semana o una semana de gestión no se vuelve lectivo mediante una excepción ordinaria. El Plan Anual deriva sus rangos reales de esa fuente y cada Project Master se genera únicamente después de confirmar una lista explícita de días lectivos.

**Fecha canónica.** `activities.occurs_on` decide cuándo se ejecuta una actividad. `planned_date` conserva la fecha inicialmente heredada del blueprint y `schedule_status` expresa si fue reprogramada, cancelada o no realizada. `class_schedule_entries` se mantiene como proyección horaria sincronizada para Hoy; no compite como segunda fuente de fecha.

**Trazabilidad.** La reprogramación pasa por servidor, valida propiedad, calendario efectivo, intervalo del proyecto y conflictos. La operación actualiza actividad y horario en una transacción y crea `activity_schedule_changes`. Los registros confirmados continúan protegidos contra cambios pedagógicos; la excepción del trigger solo permite metadata de ejecución auditada.

**IA.** No cambia el routing. Sol recibe las fechas confirmadas como restricción y produce exactamente un blueprint por día. Luna desarrolla después una sola actividad y la fecha se asigna por código, no por decisión del modelo.

## ADR 072 Mapa acumulativo y cierre de evaluación por período

**Decisión.** El cierre de cada bimestre o trimestre parte de `period_evaluation_map_versions` y `period_evaluation_map_entries`, una proyección normalizada y versionada que se recalcula por código antes de preparar o revisar la evaluación. Conserva IDs y revisiones de proyecto/unidad, contenido formal, blueprint, actividad y criterio; cuenta evidencias reales y distingue `planned`, `completed`, `skipped` y `rescheduled`. Una competencia es `worked` solo cuando existe una actividad realizada y `evidenced` cuando existe evidencia real. Los textos pedagógicos permanecen en sus fuentes canónicas.

**Juicio docente e IA.** Assessment Master usa GPT-6 Sol/medium y solo competencias realmente trabajadas. El assessment individual usa GPT-6 Luna/medium únicamente si existe evidencia y devuelve análisis sin letras. El contrato rechaza cualquier `suggested_level`; AD/A/B/C se guarda solo desde la elección confirmada de la docente, con versión y snapshot de fuentes. La conclusión se genera después con GPT-6 Luna/medium y queda vinculada a esa valoración. Una evidencia nueva marca solo esa pareja niño–competencia y sus derivados como pendientes de revisión.

**Consolidado y salidas.** La matriz, short labels, distribución AD/A/B/C, cobertura, pendientes y Excel genérico se calculan por código, sin convertir letras a promedios. El informe global del aula usa GPT-6 Sol/medium con datos agregados y anónimos; la narración no puede introducir cifras, que se muestran desde estadísticas deterministas. El cierre se guía en ocho pasos y exige valoración y conclusión vigentes. SIAGIE permanece explícitamente pendiente hasta recibir el formato oficial.

**Seguridad y reversión.** Las tablas nuevas permiten lectura autenticada solo del aula propia mediante RLS y no admiten escrituras directas por Data API. Las migraciones son aditivas. Retirar la interfaz o el informe global no altera assessments, conclusiones, evidencias ni cierres históricos; el mapa puede reconstruirse desde las fuentes canónicas.

## ADR 073 Ampliación incremental de la KB a v4.1.0

**Decisión (2026-09-26).** La KB v4.1.0 se crea por copia y fusión por ID desde v4.0.0. Conserva las 14 competencias, referencias curriculares y contratos existentes; añade 14 fuentes, 9 claims y 129 unidades didácticas. La versión anterior queda intacta. El manifest determina los conteos y protege con SHA-256 todos los archivos compilados. El runtime continúa leyendo JSON/JSONL local, sin PDF, embeddings ni base vectorial.

**Autoridad y selección.** Las fuentes MINEDU de 2012–2015 aportan didáctica compatible; nunca se convierten en texto curricular canónico ni en `official_reference`. El backend filtra por workflow, edad, competencia confirmada, aplicabilidad explícita y dominio antes de ordenar por pertinencia. Los recursos concretos de Biblioteca siguen fuera de la KB. Los nuevos ámbitos y condiciones se validan al cargarla; el contexto curricular enviado a IA mantiene solo la edad solicitada.

**Jerarquía pedagógica.** El plan anual usa familias de situaciones para proponer clases de experiencias; Project/Unit Master las usa para construir situaciones auténticas y su mapa. La actividad recibe el Master y la fila confirmados: la KB aporta acciones infantiles, mediación, materiales y evidencia posible sin inventar otra situación. Taller aprovecha la didáctica del lenguaje o competencia. Criterio y captura reciben actuaciones observables. Assessment utiliza pautas interpretativas únicamente sobre evidencias reales.

**Compatibilidad y reversión.** Los 16 workflows vigentes, incluidos los añadidos después del paquete, conservan sus contratos y excepciones de competencias múltiples. El routing de modelos y los proveedores no cambian. Para revertir la KB activa basta pasar la raíz explícita de v4.0.0 al loader o restaurar su ruta predeterminada; no hay migración de datos. Ver `docs/KB_V4_1_AUDIT.md` para diferencias y verificaciones.

## ADR 074 Biblioteca visual estática e independiente del documento

**Decisión (2026-09-26).** Mantener un índice versionado de escenas reutilizables con metadatos validados, referencias de personajes, prompt común, PNG maestro y JPEG para documentos. Un selector determinista pondera conceptos, acciones, objetos, categoría, subcategoría y contexto; penaliza IDs ya usados y devuelve `null` cuando no hay coincidencia pertinente. La generación de imágenes ocurre fuera de la exportación de documentos.

**Alcance y reversión.** La primera colección tiene 61 escenas y ocho personajes. El selector no accede a datos de estudiantes ni cambia permisos de servidor o RLS. Esta etapa prepara la API para Word y otros documentos, sin alterar los exportadores vigentes. Retirar la biblioteca consiste en revertir sus archivos y futuras llamadas al selector; no hay migración.

## ADR 075 Sugerencia Jev revisable en el flujo docente

**Decisión (2026-09-27).** Tras la comparación exploratoria de dos conjuntos sin adjudicación experta, el clasificador Jev opt-in de observaciones espontáneas separa la elección de una competencia principal (`Choice` con criterios enfocados de la KB v4.1) de las candidatas adicionales (un `noul` independiente por competencia). Las dos solicitudes pueden ejecutarse concurrentemente, pero ninguna confirma una clasificación. La abstención o insuficiencia de `Choice` impide mostrar adicionales. La interfaz marca inicialmente solo la principal y permite que la docente confirme, cambie, amplíe o deje sin clasificar.

**Límites y seguridad.** El backend filtra IDs oficiales por edad y condiciones curriculares, anonimiza la nota y no envía multimedia. La docente conserva la decisión. No se modifican evidencias, niveles, rutas RLS ni el método de sugerencia para planificación emergente. La opción de imagen de proyecto y la ficha de taller son decisiones separadas por metadatos, no inspección visual de imágenes o PDF.

**Validación y reversión.** Tras reponer crédito, la composición se probó con 154 llamadas reales sobre dos conjuntos no expertos: 21/27 difíciles admisibles, 38/48 sintéticos exactos y 7/10 multicompetencia exactos. No se presenta como ganadora pedagógica. Las tres banderas Jev están en `1` solo en `.env.local` local ignorado por Git; el backend local carga la clave también desde el entorno ignorado del experimento, nunca el frontend. En otros entornos el ejemplo conserva `0`. `AYNI_JEV_ENABLED=0` revierte el uso del proveedor sin migración ni alteración de clasificaciones confirmadas. Antes de activarla por defecto en despliegues, se necesita un conjunto nuevo de observaciones anonimizadas y adjudicadas por especialistas.

## ADR 076 Alta inicial con calendario oficial y logo opcional

**Decisión (2026-09-27).** El formulario inicial usa la misma lista versionada de bloques del calendario nacional 2026 para sugerir los límites del año escolar completo (2 de marzo a 31 de diciembre), no solo las clases (16 de marzo a 18 de diciembre). Explica que hay 36 semanas lectivas y 8 de gestión, y permite corregir fechas conforme a DRE, UGEL o IE. Para otros años no se inventan fechas oficiales: la docente debe indicarlas. Fuente: [RM 501-2025-MINEDU, tabla 1](https://repositorio.minedu.gob.pe/handle/20.500.12799/11753).

**Opciones curriculares.** Castellano como segunda lengua se ofrece cuando el castellano se aprende como L2 en un contexto con lengua materna originaria. Educación Religiosa se incluye solo si corresponde al aula; la casilla no sustituye la atención individual a las exoneraciones solicitadas por familias. Ambas permanecen apagadas por defecto y sujetas a elección docente.

**Logo, permisos y reversión.** La carga opcional del logo en el alta reutiliza la validación institucional de PNG/JPG/WebP de hasta 2 MB, normalización a PNG sin EXIF, archivo local privado y `institution_assets` asociado al `teacherId` verificado por el servidor. Aula, perfil y logo se guardan juntos; un error revierte la transacción y retira el archivo nuevo. El backend PostgreSQL devuelve 503 para uploads mientras no exista Storage. No hay migración. Para revertir, retirar el campo opcional del alta y mantener la carga posterior desde el perfil; los logos ya guardados permanecen asociados al colegio.

## ADR 077 Campos y estados distinguibles en el flujo docente

**Decisión (2026-09-27).** Los controles de texto reutilizables usan superficie blanca y un borde azul grisáceo de contraste superior a 3:1 frente al blanco; los campos dentro de `ayni-workflow` y los controles nativos sin clase comparten ese borde, mientras los botones secundarios muestran un contorno propio. El estilo de reserva excluye checkboxes, radios, archivos, rangos y botones para no alterar su función. Se eliminó el fondo oscuro heredado de los componentes compartidos: el navegador del equipo puede preferir modo oscuro, pero Ayni tiene una paleta clara. Las etiquetas se mantienen visibles fuera del campo, sin depender de placeholders. «Mi aula» sustituye inputs sin estilo por componentes compartidos, asocia etiquetas e instrucciones a sus controles y admite Enter para añadir un niño. Las operaciones muestran un mensaje de carga visible además del indicador del botón; el esqueleto general también expresa la carga en texto.

**Alcance, permisos y reversión.** Es una mejora de presentación y semántica. No cambia los servicios de importación, autorización, datos de niños, RLS ni migraciones. La prueba de contrato protege la presencia de etiquetas y estados; la revisión visual debe repetirse en móvil y escritorio. Se puede revertir el estilo compartido y el formulario sin transformación de datos.

## ADR 078 Alta completa, nombres legibles y audio opcional en entrevista familiar

**Decisión (2026-09-27).** El alta inicial reúne los campos institucionales ya existentes en Perfil: institución, docente, sección, código modular, distrito, UGEL y dirección; conserva edad, calendario, opciones curriculares y logo opcional. Permite subir una imagen o crear el mismo logo de iniciales que Perfil, con una función compartida de SVG sanitizado. El guardado sigue siendo transaccional y revierte un archivo nuevo si falla. La carga de logos en PostgreSQL remoto continúa bloqueada hasta disponer de Storage privado.

**Alumnos.** La incorporación individual es la acción primaria; CSV queda plegado y secundario. `students.birth_date` se agrega mediante migraciones nuevas local y Supabase, nullable y sin derivar automáticamente edad, desempeño ni evaluación. La fecha se valida en servidor y se consulta solo en el perfil autorizado, no en snapshots pedagógicos ni paquetes de IA. El importador acepta el CSV anterior de tres columnas y, opcionalmente, `birth_date` como cuarta. Los nombres nuevos se guardan en caja legible con partículas españolas habituales; los nombres históricos se formatean en las vistas principales sin reescribir filas existentes. La forma original de un nombre excepcional puede necesitar corrección manual en una futura edición de alumno.

**Entrevista y audio.** Los tres bloques de preguntas permanecen visibles y se disponen una pregunta por fila; no hay grupos plegados que oculten preguntas antes del botón de guardado. «Guardar borrador» se distingue de «Confirmar entrevista» sin párrafos explicativos repetidos. Las preguntas siguen siendo opcionales. Junto a cada campo de texto hay un botón de micrófono para grabar directamente, sin selector de archivo. El navegador pide permiso solo al pulsarlo; la docente puede detener o descartar, escuchar la grabación local y pulsar «Transcribir grabación» si quiere enviarla a OpenAI. El temporizador detiene la captura a los 59 segundos para respetar el límite real del servidor de 60 segundos/8 MB; el servidor comprueba además la propiedad del alumno antes de transcribir. La grabación temporal se descarta al salir de la pregunta o tras transcribir. Para entrevista se usa solo la transcripción literal: no se llama al modelo de reescritura de observaciones ni se infiere competencia. El audio no se persiste; la docente revisa y guarda manualmente el texto en el borrador existente. Sin permiso, clave o ante fallo, permanece la respuesta escrita. No se modifican RLS ni las tablas de entrevistas.

**Reversión.** La migración de fecha puede permanecer nullable si se retira el campo. El importador sigue admitiendo entradas antiguas, el perfil institucional puede completarse después y la entrevista escrita funciona sin audio. No se despliega como parte de este cambio.

## ADR 079 Corrección docente acotada de la atribución de una evidencia

**Decisión (2026-09-28).** Una nota textual atribuida por error a un niño puede reasignarse desde su perfil a otro niño activo de la misma aula, con motivo y control de revisión. El servidor valida docente creadora, propiedad, aula, período abierto, ausencia de multimedia y ausencia de valoraciones confirmadas afectadas. No permite alterar el texto, la fecha ni el criterio por esta vía. Conserva la atribución anterior en `student_reassignment_history` y actualiza los contextos de ambos niños; los fingerprints mantienen la revisión de derivados.

**Justificación y límites.** H47 surgió por una captura incorrecta durante la auditoría UI, no por una clasificación de Jev: cuatro notas fueron guardadas para la niña seleccionada anteriormente. Se conciliaron y corrigieron por la interfaz antes de valorar P2. La recuperación es una capacidad normal y acotada para la docente; no es una excepción SQL para el aula ficticia. No amplía RLS ni permite trasladar archivos privados. Los fixtures y autorización pasaron; Supabase real no se validó.

**Migración y reversión.** Las migraciones local 0061 y Supabase 202609280001 son aditivas. La nueva columna puede permanecer al retirar la interfaz/ruta; su historia no debe borrarse. Solo el entorno QA local recibió la migración durante esta auditoría. No se desplegó.

## ADR 085 H34: alcance observado y pendientes explícitos en el cierre

**Decisión (2026-09-28).** El plan anual expresa intención, no una valoración individual obligatoria en cada período. El `scope` periódico se deriva de trabajo completado, evidencia o valoración real y de inclusiones docentes expresas. Por par alumno–competencia, la ausencia de registro o la información insuficiente permanece sin AD/A/B/C; la evidencia no valorada sigue pendiente de revisión. Una valoración vigente solo existe cuando la profesora confirma explícitamente su letra. A/B/C requieren una conclusión descriptiva vigente; AD no la exige.

**Cierre y salidas.** Los cierres intermedios pueden registrar pendientes como `pending_entries` separados de las valoraciones confirmadas del manifiesto; un borrador sin resolver, una conclusión obligatoria ausente o una valoración obsoleta impiden cerrar. El cierre anual exige al menos una valoración vigente para cada alumno y competencia aplicable durante el año, aunque no se haya trabajado en P4. Excel/CSV muestran el estado y dejan nivel/conclusión vacíos para pendientes. El seguimiento de actividades posteriores prioriza pendientes previos sin asignarles nivel. El resumen de reajuste usa el mismo `scope`, no una unión de competencias solo previstas.

**Seguridad, historia y reversión.** No hay migración, cambio de RLS ni envío adicional a IA. Los cierres anteriores conservan su manifiesto y huella; los nuevos añaden `pending_entries` y la huella cambia al variar un pendiente o su evidencia. El commit `2e7e04e` fija la base anterior para revertir únicamente los archivos de H34 sin tocar cambios preexistentes; no se deben borrar ni reescribir cierres históricos. QA se validó en un clon restaurado desde el último export, no en la base original de la usuaria.

## ADR 086 F1: identidad y proyección canónica de planificación

**Decisión (2026-09-28).** Una propuesta anual moderna se identifica por `proposal_id`; el ID del slot es solo un alias de entrada y el slot conserva su propio ID al recalcular un borrador. Para planes históricos sin `proposal_id`, el ID del slot sirve de identidad de lectura sin reescribir el plan. La búsqueda de proyectos ya iniciados se hace por plan e índice de propuesta, para que ambos alias recuperen el mismo proyecto. El proyecto conserva `source_proposal_id`, `annual_plan_id` e índice; cada actividad conserva `route_item_id`, que apunta al blueprint de la versión de proyecto asociada.

**Contrato y compatibilidad.** `activity_route` es el mapa canónico editable. `project_master.activity_blueprints` solo se consulta como respaldo de lectura histórica y no se vuelve a escribir en borradores nuevos. Los adaptadores `ProjectMasterV3`/`ActivityV3` marcan explícitamente `compatibility_adapter`; no pasan el validador estricto V3 ni convierten un proyecto V2 en V3 persistido. El validador V3 exige procedencia/versiones, huellas, criterios y referencias de evidencia/blueprints; puede recibir el calendario lectivo confirmado y competencias aplicables. La proyección API nueva está detrás de `AYNI_PLANNING_V3_READ=1`, apagada por defecto; la interfaz actual sigue sin cambios. Ninguna versión confirmada ni Word histórico se reescribe.

**Migración y reversión.** Las columnas e índices necesarios ya existen en local 0052/0053 y Supabase 202609260001/202609260002; F1 no agrega migración. Apagar el flag retira los DTO V3; revertir el commit F1 devuelve la lectura anterior sin transformación de datos. El mapa único de borradores nuevos evita divergencia entre dos copias, y los adaptadores históricos mantienen lectura de ambas formas anteriores.

## ADR 088 F2 reducida: A conservador y revisión del agente actual

La implementación posterior de F3 se registra en ADR 089; no cambia la regla ni el carácter provisional de F2.

**Decisión (2026-09-28).** La autorización de reducción por costo sustituye para esta decisión provisional tamaño/repeticiones/evaluadores de ADR 087, no pesos/umbrales. Solo dos A adicionales, 12 pares seleccionados por disponibilidad y dos pasadas enmascaradas del mismo agente sin API pagada. No se afirma independencia ni certificación curricular. Discrepancias se resuelven conservadoramente; edición es estimación, no medición docente. El gate completo original no se relaja: un evaluador específico reducido evita confundir los protocolos.

**Resultado.** A 3,9542/4 y B 3,6917/4, B−A −0,2625; B no reduce P95 ni mediana registrada ≥25 %, tiene cuatro intentos con facturación desconocida y más correcciones estimadas. Elegir A para F3; mantener B experimental. US$0,1416364 adicionales por dos A/sesenta y tres outputs originales preservados. Sin migración, escritura pedagógica ni despliegue. F2 cerrada provisionalmente; especialistas y medición docente quedan pendientes antes de piloto. Ver informe reproducible `docs/qa/f2-reduced-decision-2026-09-28.md`.

## ADR 089 F3: Proyecto sencillo sobre pipeline A y snapshot V3

**Decisión (2026-09-28).** Preparar desde propuesta por ID sin repetir propósito/competencias ni exigir contexto adicional. Mantener decisiones docentes al reanudar y el último checkpoint ante fallo. Preparar confirma la selección de fechas lectivas resueltas, nunca el proyecto: requiere otro gesto docente. Cambiar feedback/contexto actualiza dependencias. Detalle editable legacy opcional; sin rediseño de arquitectura.

**Persistencia.** Nuevos mapas `ProjectMasterV3` con criterios identificados, snapshot de propuesta, versión de plan/slot/KB y huellas idempotentes. `activity_route` sigue siendo mapa único. `starting_point` string mantiene compatibilidad con Word/copia; DTO estructurado derivado de decisiones/snapshot. Sucesor restaura íntegros blueprints pasados/con registros; refs V3 ausentes en legacy se proyectan al leer sin añadir campos a esa fila histórica. Actividades no se reasignan. H34 y notas finales intactos.

**Reversión.** UI `NEXT_PUBLIC_AYNI_PROJECT_SIMPLE=1`, servidor `AYNI_PROJECT_SIMPLE=1`, apagados por defecto. `AYNI_PLANNING_V3_READ` conserva flag DTO. Apagar flags devuelve UI previa sin borrar versiones; mapas preparados V3 siguen legibles/editables/confirmables, regeneración de dependencias V2 requiere flag. Sin migración. QA mediante clon/fixture local, nunca API pagada ni mock productivo. No sustituye staging RLS ni evaluación experta.

## ADR 090 F4: ActivityV3 heredada y criterios separados

**Decisión (2026-09-28).** Una actividad nueva de ProjectMasterV3 conserva ID y versión exactos del proyecto y blueprint, huella de fuente, fecha canónica y referencias de criterios generales. El propósito, competencia principal, criterio y evidencia esperada se heredan por servidor y se muestran sin exigir reescritura. Aporte docente y materiales son opcionales. Otra competencia solo se incorpora por decisión explícita con criterio y evidencia propios; no implica automáticamente valorar a cada niño. La profesora puede editar el texto del borrador y queda override trazable. El contrato viaja en `activities.details`, no en una segunda ruta de mapa.

**Confirmación e historia.** La actividad, sus criterios separados y su agenda se confirman en una transacción; talleres siguen emparejados en ella. Las actividades ya confirmadas no se modifican; copias futuras conservan `supersedes_activity_id`, y las evidencias previas apuntan al ID original. `ActivityV3` no permite que un JSON del cliente active por sí solo el flag. QA usa reloj de jornada explícito y aislado sin cambiar tiempo del sistema ni cierres H34. Ver `docs/qa/f4-inherited-activity-2026-09-28.md`.

**Reversión.** `NEXT_PUBLIC_AYNI_ACTIVITY_INHERITED` y `AYNI_ACTIVITY_INHERITED` apagados por defecto. Desactivarlos restaura UI/ruta de creación previa; borradores V3 existentes pueden terminarse y confirmarse sin reescribir historia. No se requieren nuevas FK/migraciones locales o Supabase en F4.
## ADR 097 F11: árbol documental y sincronización explícita por dispositivo

**Decisión (2026-09-28).** Documentos agrupa el catálogo existente por año/aula y relación proyecto→actividad; muestra confirmados por defecto y borradores solo a petición. El árbol no crea otra autoridad ni un Word ficticio. Solo los artefactos estables F10 de plan/proyecto pueden sincronizarse: el navegador compara el SHA-256 del archivo real con ID, versión y hash confirmado, escribe subcarpetas y manifiesto local, y nunca borra ni sobrescribe una edición local. El handle de carpeta en IndexedDB es comodidad revocable, no permiso persistente. ZIP es fallback explícito y exige IDs autorizados de una sola aula por paquete.

**Seguridad y reversión.** ZIP reautoriza cada artefacto y verifica bytes/hash antes de añadirlo. No incluye rutas internas de Storage, tokens ni archivos de niños; no se envían carpetas locales al backend. No hay migración ni IA. `AYNI_DOCUMENT_SYNC=1` y `NEXT_PUBLIC_AYNI_F11_DOCUMENTS=1` (además de flags F10) activan el flujo; apagarlos conserva descargas individuales y documentos históricos. QA de carpeta se hizo con filesystem simulado; la inspección visual local solo cubrió catálogo vacío, no picker nativo ni móvil. Ver `docs/qa/f11-document-sync-2026-09-28.md`.
## ADR 098: piloto supervisado de CURRENT_V2_4_RAW

**Decisión (2026-09-29).** Integrar la versión experimental congelada, con verificación SHA-256 del código y prompt, en la cola de observaciones diagnósticas espontáneas. Mostrar solo competencia principal y exigir acción docente para vincular currículo. Mantener sugerencia y confirmación en campos distintos. El flag `AYNI_OBSERVATION_CLASSIFIER_V24` controla las llamadas Jev de este flujo; sin él, la nota se guarda y se clasifica manualmente. No usar Luna ni fallback a otro clasificador en esta ruta. El filtro de privacidad corregido conserva referencias familiares normales y bloquea texto ambiguo antes de enviarlo. El contrato de Assessment de leer solo clasificación confirmada se conserva.

**Reversión.** Apagar el flag y reiniciar; las filas V2.4 pendientes pasan a revisión manual al cargar, sin tocar evidencias históricas. Migraciones aditivas 0066 / 202609290001 permanecen. Ver `docs/OBSERVATION_CLASSIFIER_V24_SUPERVISED.md`.
## ADR 099: eventos inmutables y tasas del piloto supervisado V2.4

**Decisión (2026-09-29).** Mantener `teacher_action` como estado vigente y añadir `diagnostic_spontaneous_observation_decision_events` para cada gesto docente, incluidos los posteriores. El servicio actualiza la vinculación confirmada e inserta el evento en una transacción con bloqueo por observación; trigger y RLS protegen integridad, lectura propia y ausencia de escritura directa desde cliente. No se hace backfill ni se altera Assessment.

**Medición.** Contar observaciones con intento y llamadas repetidas mediante contadores aditivos; conservar fallos técnicos aunque un reintento posterior funcione. Separar de respuestas válidas `completed = suggested + abstained`; calcular abstención sobre estas últimas. Confirmación/cambio/rechazo se miden entre sugerencias con revisión vigente; las pendientes se reportan aparte. La matriz presenta sugerencia original frente a competencia final vigente. El target 30 no cambia la clasificación. Ver `docs/OBSERVATION_CLASSIFIER_V24_SUPERVISED.md`.

## ADR 100: RAW íntegro hacia Jev en CURRENT_V2_4_RAW

**Decisión (2026-09-29).** Por decisión de producto, las observaciones diagnósticas espontáneas marcadas `CURRENT_V2_4_RAW` ya no pasan por detección de nombres, mayúsculas, identificadores ni anonimización antes de Jev. El texto introducido por la profesora se conserva byte a byte como texto Unicode en `observation_text` y ese mismo valor se entrega al clasificador. Se mantiene la validación estructural de nota no vacía y longitud máxima, y los archivos de foto/audio siguen fuera de la llamada Jev. La sugerencia sigue sin vincularse al currículo hasta la decisión docente. Prompt, modelo y umbrales congelados no cambian.

**Estado heredado y reversión.** Las migraciones 0068 / 202609290003 convierten bloqueos V2.4 históricos sin revisión en `pending` para clasificación bajo el flujo nuevo; si ya hubo decisión docente, conservan esa decisión y cambian el estado técnico a `disabled`. Se elimina `privacy_blocked` del constraint nuevo y del agregado V2.4. Apagar `AYNI_OBSERVATION_CLASSIFIER_V24` detiene llamadas posteriores; no se revierten migraciones aplicadas. Los otros clasificadores y su historial experimental no se modifican.

## ADR 101: documentos como guía práctica antes del respaldo curricular

**Decisión (2026-09-29).** La fuente sigue siendo Ayni y Word sigue siendo una exportación. Los documentos guardados muestran primero un resumen breve para la profesora y después el detalle curricular, sin editar nombres oficiales del CNEB. El plan anual conserva sus secciones por propuesta y añade «Así se podría vivir» desde el propósito ya confirmado, junto a la imagen cuando exista. No se agrega un campo libre ni se crea una secuencia diaria anticipada. Las plantillas anuales tienen un único cronograma con encabezado repetible, sin «CONTINUACIÓN».

**Reversión y alcance.** La presentación puede revertirse restaurando exportadores y DOCX; no hay migración ni cambio en datos confirmados, Jev, thresholds o routing. Los informes sin muestra guardada requieren QA visual posterior. Ver `docs/qa/planificacion-documentos-2026-09-29.md`.

## ADR 102: diagnóstico dentro de Planificar y consolidado visible en Evaluar

**Decisión (2026-09-30).** Diagnóstico deja de ser destino principal y se abre como primer paso de Planificar. Los accesos desde Hoy y Aula, la recomendación inicial y el enlace histórico `#diagnostico` siguen llegando a la misma pantalla y a sus datos. Calendario permanece como destino propio. Evaluar ofrece una entrada «Consolidado» por período con alumno, área, competencia, nivel, conclusión descriptiva y estado, además de filtros y enlace a la revisión docente.

**Fuente y límites.** La vista toma el endpoint autorizado `/api/period-evaluations/consolidated`: solo el estado `confirmed` muestra nivel y conclusión; los pendientes permanecen sin letra. La organización se inspira en el registro por competencias y conclusiones descriptivas de SIAGIE y del Informe de Progreso de las Competencias. El Excel genérico sigue siendo de Ayni y no se presenta como archivo de carga SIAGIE. No se altera CNEB, RLS, valoraciones ni conclusiones guardadas.

**Pruebas y reversión.** Typecheck, lint, build, 10 pruebas de navegación/planificación y 22 pruebas del servidor de evaluación pasaron. Se comprobó en navegador el acceso Diagnóstico dentro de Planificar y el acceso Consolidado desde Evaluar con el aula local; esta aula no tenía filas de valoración confirmada, por lo que la representación con datos se apoya en las pruebas del servidor. Revertir los componentes de navegación y consolidado restaura la interfaz anterior sin migración ni pérdida de datos.

## ADR 103: API y archivos privados de Ayni en staging Vercel/Supabase

**Decisión (2026-09-30).** La API HTTP existente conserva sus servicios y autorizaciones y se invoca desde rutas Next `/api/[...path]` y `/health` mediante un adaptador de Request/Response. No abre un puerto ni crea directorios locales en PostgreSQL. Cada petición usa una sesión PostgreSQL propia mediante AsyncLocalStorage para que las transacciones concurrentes no compartan cliente. La interfaz usa `/api` del mismo origen en producción. Next traza la base CNEB, plantillas y biblioteca de imágenes del checkout. Logos, adjuntos de entrevista y evidencias se escriben en buckets privados de Supabase tras comprobar pertenencia docente y del alumno en la API; las rutas rechazan archivos si falta Storage. La migración nueva `202609300001` permite los MIME y el límite de audio ya aceptados localmente.

**Validación y pendiente.** Typecheck, lint, build Next, pruebas de paridad de migraciones, onboarding local y adaptadores privados pasaron. La instancia nueva tiene 68 migraciones, 78 tablas públicas con RLS y cinco buckets privados. No se ha desplegado ni probado con credenciales reales. La sesión CLI global de Vercel corresponde a otra cuenta, por lo que no se usará. Antes de publicar se requieren secreto de conexión PostgreSQL del proyecto nuevo, claves Auth/Storage, dos docentes ficticias, verificación de aislamiento real y smoke test de documentos/media. La reversión del código restaura la API local; el ajuste de bucket requiere migración compensatoria si fuera necesario, sin editar las migraciones aplicadas.

**Empaquetado de recursos.** Las plantillas Word, guías internas, inventario de fichas, conocimiento CNEB e imágenes se leen desde la raíz del proyecto y se incluyen expresamente en el trace de la Function. `import.meta.url` dentro de módulos empaquetados no identifica la ruta original del archivo. El trace local de `/api/*` contiene 477 archivos (aprox. 170 MB sin comprimir); sigue pendiente comprobar el tamaño y ejecución reales en Vercel. Las fichas PDF externas del directorio personal local no están presentes en staging.

## ADR 104: contrato de personalización previo a Mi año

**Decisión (2026-10-01).** «Así entendí tu aula» reúne grupo, intereses, prioridades, contexto y condiciones en una sola pantalla. Ayni propone desde entrevistas y observaciones autorizadas; la docente confirma o corrige una versión única. La evidencia incompleta no genera dificultades ni prioridades artificiales. El plan nuevo exige la decisión confirmada, guarda el ID nullable del contrato y las decisiones citadas en cada propuesta. El motivo visible se construye desde esas referencias. El calendario fija fechas, pero no impone cuatro temas festivos en planes nuevos.

**Seguridad, historia y reversión.** La proyección familiar transmite al proveedor solo temas pertinentes; nunca entrevistas completas, nombres, medios o adjuntos. El servidor reconstruye referencias de fuente al confirmar. Los planes y diagnósticos anteriores permanecen legibles sin trazas fabricadas. La migración local 0069 y Supabase 202610010001 son aditivas; la última deja lectura propia con RLS y sin escritura directa del cliente. Las versiones confirmadas permanecen intactas al revisar evidencia nueva. Ver `docs/qa/annual-personalization-2026-10-01.md`.

## ADR 105: entrevista familiar como contexto reportado

**Decisión (2026-10-01).** La entrevista familiar pasa a nueve preguntas breves con opciones estructuradas v2 y ejemplos cortos opcionales. Reutiliza la tabla versionada `student_family_interviews` y el JSONB `details`; no altera esquema ni RLS. Las respuestas históricas v1 y de texto sin versión se mantienen legibles y no reciben respuestas v2 inventadas. La corrección crea una versión nueva por la ruta existente.

**Proyecciones y frontera.** El perfil individual indica explícitamente «Según la familia». El contexto de aula agrega intereses, experiencias comunitarias y lenguas sin nombres; en aulas pequeñas conserva temas sin conteos de celdas pequeñas. Plan Anual, proyecto, unidad y actividad consumen esa proyección, no la entrevista completa ni la expectativa familiar como prioridad. Assessment recibe un subconjunto acotado de la entrevista confirmada bajo `family_context`, separado de `evidence_history`, y la propuesta de observación puede sugerir situaciones donde comprobar una señal. Ninguna respuesta familiar asigna nivel, dificultad, logro o conclusión descriptiva.

**Permisos, reversión y pruebas.** La API existente comprueba docente, aula y alumno antes de leer o guardar; los adjuntos siguen privados y no se envían a IA. Revertir el código v2 restaura la interfaz anterior; los datos v2 permanecen en JSONB y las versiones históricas no se borran. Validación y QA local documentados en `docs/qa/family-interview-redesign-2026-10-01.md`. No se desplegó este cambio.

## ADR 107: recuperación funcional y preferencias docentes de preparación

**Decisión (2026-10-02).** La revisión del aula usa un snapshot de ID/estado/fuentes/detalles y escrituras condicionadas. Guardar borrador, revisar localmente y confirmar tienen estados diferentes. Actualizar evidencia reconstruye la propuesta y retiene los campos que la docente editó. La navegación usa el hash existente para módulo/subvista sin activar F7; Semana desplaza siete días. Conclusiones conserva sus dependencias y ofrece tareas o prerrequisitos concretos.

**Preferencias separadas.** `planning_preferences.teacher_ideas` es opcional y se almacena dentro del JSONB de la preparación versionada, como campo hermano del diagnóstico, con versión 1, IDs estables, título, explicación y mes opcional. No son registros de niños ni prioridades; no duplica los proyectos institucionales. El preplan guarda una copia inmutable de esas preferencias y feedback por idea; cada fila admite referencias a ideas y procedencia principal. El esquema anterior de IA permanece para cero ideas. Con ideas, el generador explica incorporación, alternativa u omisión, y usa únicamente posiciones del calendario autorizado y CNEB de la edad.

**Regeneración y permisos.** Requiere borrador propio seleccionado y revisión vigente, revalida preparación tras generar y persiste filas/slots en una transacción. Plan activo/historia no cambian hasta confirmación explícita. Se usan autorizaciones existentes de docente/aula/año; no hay migración ni modificación RLS. Los nombres conocidos de niños se neutralizan en las preferencias enviadas al proveedor, conservando el texto docente original guardado.

**Reversión.** Revertir componentes restituye la entrada anterior. Mantener lectura y conservación de campos opcionales ya persistidos al retroceder un validador; no borrar preferencias, referencias ni históricos. QA aislado y límites en `docs/qa/functional-stability-teacher-ideas-2026-10-02.md`. No se publicó en esta tarea.

## ADR 106: mapa anual como proyección del preplan

**Decisión (2026-10-01).** La vista principal de «Mi año» es una línea de tiempo marzo–diciembre. Los proyectos y unidades se ubican desde `project_slots` o fechas guardadas en planes vigentes e históricos, y desde el calendario autorizado del aula al editar un borrador. Los bloques de gestión del contexto anual ocupan su tramo lectivo; los feriados efectivos de `/api/school-calendar` se muestran como marcadores compactos con detalle accesible por clic. La tabla usa las mismas filas y queda como vista secundaria.

**Edición y persistencia.** «Reorganizar» reutiliza la ruta de nueva versión y conserva el plan vigente. Los movimientos intercambian las propuestas entre posiciones temporales; retirar envía la fila a `available_experiences` del mismo JSONB, y reincorporar o sustituir la devuelve tras validación. El servidor valida identidad, títulos y competencias de ambas colecciones antes de guardar. Guardar el borrador y confirmar la versión siguen siendo pasos distintos; no hay escritura por cada movimiento.

**Compatibilidad y reversión.** Los planes sin `available_experiences` se leen como bandeja vacía. No cambian tablas, RLS, rutas de autorización ni migraciones. Revertir los componentes y el validador devuelve la presentación anterior; antes de hacerlo, se debe conservar lectura de borradores que ya usen la propiedad opcional. QA local y límites se registran en `docs/qa/annual-year-map-2026-10-01.md`.


## ADR 108: recorrido inicial, snapshot y año pedagógico V2

**Decisión (2026-10-03).** Sustituir el trámite obligatorio de diagnóstico/síntesis/prioridades por Familias → Observar → Ayni → Mi año. Seis preguntas opcionales y doce propuestas son decisiones Ayni. Fuentes literales conservan negación, sujeto, fecha y alcance; se guarda copia privada y proyección anonimizada separada. Interpretaciones materiales son propuestas revisables, no niveles. Currículo aplicable, necesidades sustentadas y información desconocida son responsabilidades independientes.

**Contrato y pipeline.** journey_version=2 en JSONB existente, oportunidades completas y recurrentes; resolución global determinística del calendario efectivo; Sol high genera, código valida y Sol medium revisa. Luna low solo interpreta alcance global al aplicar un lote; reparación limitada a IDs autorizados y una oportunidad de reparación. ChangeSet se guarda sin IA, versiones/CAS/locks y protección de decisiones/pasado/proyectos en servidor. Confirmación congela el contenido y Word no agrega pedagogía. Nombres curriculares se capturan para que etiquetas del documento no dependan de futuros cambios de catálogo.

**Compatibilidad.** Lectores/exportadores anteriores permanecen para históricos, y el reajuste bimestral nominal se bloquea en V2. Proyectos derivados toman asignaciones efectivas V2 y comprueban divergencias. No cambian tablas ni RLS. Rollback de presentación con NEXT_PUBLIC_AYNI_ANNUAL_JOURNEY=0 preservando lectores/exportadores V2 y datos guardados. Detalle: docs/annual-journey-v2.md. Verificación local y limitaciones de piloto en docs/qa/annual-journey-v2-2026-10-03.md. No autoriza publicar.

## ADR 109: UX inicial, decisiones atómicas y conversación breve

**Decisión (2026-10-03).** Aplicar las cinco referencias a Familias/Observar/Matriz/Conversar/Preparando con el teal elegido, sin rediseñar Mi año generado. La sugerencia de competencia se solicita antes de guardar, es opcional y cacheada; el guardado valida y confirma cero a dos competencias en la misma transacción. Editar escribe un evento docente, no llama IA. El lector canónico conserva todas las competencias seleccionadas, no solo la primera.

**Conversación y recuperación.** Luna recibe un AnnualPlanningBrief de fuentes anonimizadas con sujetos, procedencia, negación, incertidumbre, cobertura e información institucional/calendario. Las ideas son decisiones docentes literales; normalmente inicio y respuesta bastan, con una sola aclaración material. Sesión privada persistida en ai_pending_generations, huella, revisión CAS y lease; provider IO fuera de transacciones y refresh sin nuevas llamadas. Los cinco estados visibles corresponden al pipeline ya recuperable, sin porcentajes inventados.

**Fotos y familias.** Nuevo path nullable en students con autorización docente/aula/alumno y Storage privado, normalización/retirada de metadatos y reemplazo CAS. No se envía media de menores a IA. El enlace familiar es una capacidad de 256 bits, hash almacenado, siete días y revocación al reemplazar; acceso únicamente a su propia respuesta. La incorporación/confirmación docente permanece separada. No se abren políticas anónimas RLS.

**Publicación y reversión.** Usuario autoriza únicamente staging QA V2 después de checks, commit y smoke; producción se conserva. Rollback por alias/code compatible, manteniendo columna nullable, datos y lectores históricos. Ver pruebas, límites y pasos en `docs/qa/initial-journey-ux-v2-2026-10-03.md`.
## ADR 110: captura explícita y correcciones de observación con historial

**Decisión (2026-10-03).** Refinar cinco superficies V2 con teal elegido, sin cambiar Mi año. Una profesora entrevista, autoguarda y confirma al finalizar. Texto de observación consulta Jev al pulsar OK; dictado consulta después de la transcripción literal. CURRENT_V2_4_RAW congelado usa dos decisiones HTTP, sin media; la selección docente confirma al guardar. Fotos hasta 1 MB, normalizadas y privadas. Corrección de texto/competencias y retirada no llaman IA: revisión append-only, CAS y autorización de servidor, vista efectiva security_invoker con RLS y lectores canónicos actualizados. Originales, evidencia y planes congelados conservados. Enlaces familiares históricos siguen compatibles. Solo staging autorizado tras commit/checks/smoke; rollback mantiene revisiones/lectores. Ver docs/qa/initial-journey-ux-refinement-2026-10-03.md.

## ADR 111: pictogramas ligeros por tema en la línea de tiempo

**Decisión (2026-10-03).** Usar una biblioteca pública versionada de 50 SVG pastel con metadatos JSON y IDs estables. Selección local por título, con propósito/situación de apoyo, sin nueva llamada IA ni escritura al abrir Mi año. IDs explícitos se limitan al catálogo y un tema desconocido usa idea neutral. Los iconos son decorativos; se conserva el texto accesible del proyecto. El Word mantiene su catálogo raster y Jev; únicamente se comparte el algoritmo de puntuación existente. No cambia la arquitectura de planificación, el calendario, los planes, los permisos ni las migraciones. Revertir la presentación no necesita migrar datos. Ver docs/qa/project-pictograms-2026-10-03.md.

## ADR 112: ilustraciones pequeñas y pertinencia curricular

**Decisión (2026-10-03).** Sustituir la presentación SVG de Mi año por 63 ilustraciones WebP infantiles cálidas, simples y transparentes de 160 px, hasta 6 KiB por archivo. Mantener los IDs anteriores y los SVG históricos. El catálogo JSON asocia temas y IDs curriculares existentes para relevancia visual; no modifica la pedagogía ni asigna niveles. Selección local: título primero, contexto y competencias para discriminar; alternativas curriculares explícitas cuando no hay tema, bombilla neutral al final. Personas/animales ficticios; plantas/objetos sin rostro. Maestros de generación fuera del deployment, hashes y límites comprobables en los artefactos finales. Word/Jev, calendario, versiones, autorización y arquitectura conservados. Solo staging QA tras commit limpio, checks y smoke; rollback por alias sin datos. Ver docs/qa/project-illustrations-competencies-2026-10-03.md.

## ADR 113: calendario primero y editor de quince tramos

**Decisión (2026-10-03).** Extender Mi año con quince posiciones fijas posteriores a Acogida: once de dos semanas y cuatro de tres, treinta y cuatro semanas derivadas de los bloques del calendario efectivo. Los feriados alteran los días lectivos, no la duración ni los límites de semana. Cada día lectivo pertenece exactamente una vez a Acogida o a un tramo. Gestión, Acogida, feriados y bloques oficiales no son propuestas movibles. Snap, swap, Biblioteca, duración, filtro y conteos/deltas curriculares son determinísticos y cuestan cero llamadas IA.

**Contrato y compatibilidad.** Mantener `journey_version = 2` y agregar `editor_version = 3`, `resolved_calendar.version = 3`, slots con ID estable y `proposal_id` nullable, y `available_experiences` en el JSONB existente. La generación nueva usa `annual-journey-slots-v3` con quince filas. Borradores incompletos pueden guardarse; confirmar exige quince ocupaciones y cobertura V2. No hay migración SQL: `project_slots.slot_index > 0` ya admite la cantidad nueva. Planes de doce y jobs antiguos mantienen lectura/recuperación original. Upgrade solo explícito sobre borrador sin trabajo protegido; nunca autoconvertir activos, históricos ni recuperación al abrir.

**Pedagogía, servidor y continuidad.** Luna recoge intención en un panel contextual con cobertura compacta; el pipeline pedagógico existente genera y revisa solo una fila. Preview completo y aprobación docente guardan la candidata exclusivamente en Biblioteca. ChangeSet y batching se conservan. Propiedad, CAS, calendario y protección de ambas propuestas afectadas se validan en servidor; el historial registra IDs entrante/desplazado y slots origen/destino. Pasado, decisiones mantenidas y desarrollo vinculado impiden movimientos incompatibles. Project Master conserva revisión/exclusión de días y una actividad por fecha confirmada: dos semanas con feriado pueden ser nueve actividades.

**Validación y reversión.** Suite final focal 65/65 PASS y HTTP local ficticio con 0→0 requests estructurales, 0→4 mock para nueva propuesta, cero API pagada. La recaptura final de móvil/Biblioteca/matriz/filtro/chat y drag genuino está pendiente por conectividad/política de navegador; no hay aprobación visual final. Solo staging QA autorizado. Una vez persistidos quince tramos, el rollback debe conservar lectores/exportadores de doce y quince; un deployment limitado a doce no es destino seguro. Checks finales, publicación y límites se registran en `docs/qa/annual-year-editor-v3-2026-10-03.md`.

## ADR 114: alcance contextual explícito y copia histórica identificada

**Decisión (2026-10-03).** «Cambiar propuesta con Ayni» muestra, envía, aplica y revisa solo pendientes del mismo `proposal_id`; el panel global envía `null` y selecciona únicamente pendientes anuales. Los pendientes ajenos permanecen y el historial contiene solo los aplicados. El servidor rechaza cambios/reparaciones fuera de alcance, incluso a momentos cotidianos o interpretaciones globales. `undefined` conserva únicamente la compatibilidad de la API batch anterior; la interfaz nueva usa ID/null explícitos. La proyección al proveedor omite pendientes ajenos/preferencias privadas/historial; la recarga limpia un alcance inexistente sin excepción de render. Indicaciones de propuestas retiradas siguen visibles por separado y se eliminan solo mediante «Quitar indicación», sin mezclarlas con el global.

**Contrato y presentación.** Los criterios de organización de quince proceden del calendario/contrato, sin copy generado de doce. La presentación histórica usa colores semánticos, triángulos de feriado, Hoy y banner que explica las doce propuestas guardadas; conserva sus criterios originales visibles, no muta el JSON literal ni convierte fechas. Upgrade explícito del borrador conserva criterios anteriores trazados, bloqueos y validación antes de confirmar.

**QA y continuidad.** Con autorización posterior del usuario para la misma aula QA ficticia, se preparó una copia recuperable de doce con tres alternativas QA y cero requests IA. Borrador original archivado; activo V1/otros planes conservados con hashes transaccionales. Copia V3 borrador visible por UI; upgrade y aprobación visual final pendientes tras deployment. Suite corregida final 68/68 PASS; typecheck/lint/Next (`npx next build`)/Vinext finales PASS, exit 0. Publicación en `docs/qa/annual-year-scope-closure-2026-10-03.md`. La fase integral del último archivo sigue en cola hasta estabilidad. Rollback conserva lectores de doce/quince y el borrador original recuperable, sin borrar datos ni revertir SQL.

## ADR 115: competencias elegidas conservadas en una candidata

**Decisión (2026-10-04).** La selección explícita de la docente antes de generar una propuesta es una preferencia curricular obligatoria, no evidencia ni nivel. Alias oficiales se comparten desde un mapa puro y el filtro privado solo admite términos del currículo efectivo. La UI ofrece corregir la selección; generación, revisión, reparación y aprobación exigen cada ID con una oportunidad real. La omisión bloquea aprobación y conserva el borrador de una fila para reintentar. Sesiones antiguas recuperan la intención literal guardada; la selección explícita, incluso vacía, prevalece.

**Implementación y alcance.** Campos opcionales en el JSONB existente, máximo cinco según el contrato actual, sin SQL/RLS nuevos ni reemplazo del pipeline. IDs validados en servidor; selección solo se modifica antes de generar y no al aprobar. GET y checkbox no llaman IA. La corrección de vocabulario se comparte con conversación, jobs y cambios globales/locales manteniendo privacidad de menores. Ver docs/qa/annual-proposal-competency-intent-2026-10-04.md y recibo posterior con QA real/publicación.

## ADR 116 — Turnos recuperables y captura contextual sin sustituir el recorrido (2026-10-04)

Se usa el JSONB de conversación existente para conservar el turno docente antes del IO y marcarlo pendiente; lease/CAS/ownership continúan. Solo GET/HEAD admiten retry automático; escrituras se recuperan leyendo el servidor y no reenviando una solicitud cuyo resultado se desconoce. Una nueva intención invalida candidata/draft/revisión anteriores. La presentación distingue mensaje enviado, respuesta en curso, interrupción retomable y candidata revisada. Mantener vocabulario curricular/temático acotado no autoriza enviar nombres conocidos ni identificadores privados. La foto de perfil opcional usa el mismo endpoint/Storage privado, máximo 100 KB, sin IA. Captura desde matriz utiliza el flujo de guardado confirmado existente con alumno/competencia preseleccionados; no sustituye IDs/nombres oficiales. Sin migraciones ni nuevo pipeline. Ver `docs/qa/initial-journey-recovery-2026-10-04.md`.


## ADR 117: experiencia cotidiana, preparación durable y horizonte restante (2026-10-05)

Mi año sigue siendo la única autoridad anual y conserva quince tramos; inicio tardío registra historia declarada opcional y prepara solo el horizonte restante. Conversación, contexto aprobado y snapshot son conceptos distintos. Navegación de cinco destinos y cuatro carpetas usan los flujos/fuentes existentes; diagnóstico no bloquea. Proyecto enriquece cómo, conserva propósito/competencias del año y congela su versión de origen. Discrepancia futura genera únicamente un sucesor explícito; el padre se conserva. Proyecto iniciado, pasado, evidencia, ejecución y talleres se protegen con lock del aula y comprobación al confirmar.

Preparation jobs durables privados separan IO de proveedor de transacciones, utilizan lease/fencing/huella e IDs únicos por actividad. Revisión completa y aprobación atómica del bloque; una respuesta incierta requiere aceptación explícita antes de repetir. Intercambios usan fechas efectivas, validación docente y cero IA. Revisión del período es opcional, cruza oportunidades/evidencia/futuro y usa el creador de una sola candidata. Exportación Word canónica de seis tipos y ZIP granular limitado a 100 archivos o 50 MiB sin comprimir por parte. El cierre exporta su manifiesto sin inventar una plantilla oficial adicional.

Nuevas migraciones 0072/0073 con equivalentes remotas y RLS; cron privado HMAC requiere activación externa explícita, cuentas nuevas y Vault. Implementación/verificación/rollback en docs/REDISENO_EXPERIENCIA_IMPLEMENTACION.md. 109 pruebas finales focales PASS y recorrido HTTP/UI ficticio sin IA pagada; no valida calidad del proveedor real ni permisos/integración remotos. No se publica esta ejecución.
