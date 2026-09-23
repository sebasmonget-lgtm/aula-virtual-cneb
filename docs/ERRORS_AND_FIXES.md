# Errores y soluciones

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
