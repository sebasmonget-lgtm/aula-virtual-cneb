# Errores y soluciones

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
