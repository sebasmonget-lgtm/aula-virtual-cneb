# Errores y soluciones

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
