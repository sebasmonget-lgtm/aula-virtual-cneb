# Implementación de simplificación UX de Ayni · 11/10/2026

Autorizada por el propietario después de la auditoría. Rama aislada: `codex/ayni-ux-simplificacion-20261011`; base de producto `e3a107f`, auditoría conservada en `0fe1e4c`. Producción queda fuera de esta autorización. Las comprobaciones usan únicamente datos ficticios; no se reutilizan aulas reales.

## Etapa 1 · Observación confiable

- El diálogo protege texto, foto y corrección pendientes al cerrar, cambiar a un registro del historial, cancelar o registrar otra observación. Navegación del workspace y recarga tienen guardas; grabación, guardado y preparación de foto impiden salir mientras están activos.
- Segunda y siguientes correcciones parten de la versión vigente. La versión actual es principal; el original permanece consultable. Se conserva identidad, RAW, motivo, CAS e historial.
- Los errores de revisión se presentan como errores aunque exista un registro guardado. Texto y `clientRequestId` se conservan tras fallo para reintento; no se agregan llamadas IA ni escrituras de fondo.
- No se añadieron APIs, migraciones ni almacenamiento de datos pedagógicos en el navegador. El texto pendiente se conserva en memoria mientras la ventana está abierta; una salida deliberadamente confirmada lo descarta. No se promete recuperación de ese borrador después de cerrar el navegador.

Reproducción funcional: harness privado con los componentes real anterior y corregido, Chromium headless, viewport 390×844, transporte simulado y niña ficticia QA. Versión anterior: cierre sin guarda y segunda corrección desde RAW reproducidos; versión nueva: ambos PASS. Estas pruebas de interacción no certifican un backend remoto ni el diseño visual completo. Artefactos privados: `.local/ux-simplificacion/`.

Pruebas automatizadas: 15 casos iniciales PASS (helpers, captura y servicios PGlite de observación/atribución); nueva regresión de dos correcciones sucesivas comprueba RAW inmutable, revisión 3, historial de ambas correcciones y listado vigente. El primer intento de esa prueba asumió que la respuesta de revisión incluía `corrected_text`; ese campo se obtiene del listado y el cliente ya lo conserva. Se corrigió la expectativa de prueba, sin cambiar el servicio.

Typecheck y lint focal exit 0. Builds Next webpack y Vinext exit 0. Nueva regresión PGlite: 9/9 casos del servicio PASS, incluyendo dos correcciones sucesivas. En total se ejecutaron 16 casos focales distintos satisfactoriamente. Vinext conserva avisos del empaquetador sobre `eval` en PGlite y tamaño de chunks; no son fallos de compilación.

## Etapa 2 · Período y borradores

Selección compartida: período explícito, vigente o último terminado; antes del inicio se ofrece el primero futuro. La portada permite elegir período y persiste el mismo contexto en la URL; no muestra ceros durante carga/error. El selector del detalle respeta las guardas del trabajo pendiente.

La revisión moderna permite guardar un borrador mediante la API existente, sin confirmar nivel; conserva la revisión devuelta para posteriores confirmaciones. Cambiar niño/competencia, salir o pedir otro análisis protege ediciones. Una actualización de los contadores no vuelve a cargar encima de un análisis local. Los fallos de confirmación conservan campos y revisión en memoria. En lotes, ediciones manuales se distinguen del progreso durable y se protegen antes de salir o regenerar.

RED/GREEN de período de octubre y salidas de evaluación/lote mediante componentes reales y datos ficticios. GREEN incluye guardar borrador, recargar y recuperar texto sin nivel seleccionado; guardar lote y recargar conserva la edición. Transporte simulado: dos guardados explícitos, cero confirmaciones y cero generaciones IA.

35 pruebas focales PASS, 0 FAIL/0 SKIP: selección de períodos, drafts, evaluación y lotes PGlite, incluyendo autorización, fuentes obsoletas, cierre, historial, recuperación de trabajos y ausencia de evidencia sin C. Typecheck, lint focal y build Next webpack exit 0. Vinext se ejecutó en etapa 1 y se repetirá en el cierre integrado. Rollback: revertir el commit de cliente/selector; APIs y datos guardados siguen siendo compatibles.

## Plan y límites

Etapas de producto implementadas: observación; evaluación; contexto/chat anual; configuración/matrícula/diagnóstico; año/proyectos/Hoy/Calendario; informes/documentos. Se conservan cinco destinos, quince tramos, biblioteca, calendario, ejecución/confirmación docente y generación gradual de actividades.

Pendientes al cierre: smoke autenticado remoto entre dos docentes, zoom 200 %, hardware físico y aceptación visual conjunta. Preview READY y smoke público aprobados se registran abajo. Los resultados históricos no se heredan como resultados nuevos. No se hará publicación en Producción.

Rollback de etapa 1: revertir su commit de UI/hook/helper. Los registros y contratos existentes siguen siendo compatibles; no hay migración que revertir.

## Etapa 3 · Contexto anual y conversación

Un solo panel plegable reúne fuentes, ideas editables e historia. Se retiraron los cuatro resúmenes laterales y la repetición del texto docente completo junto al chat. La acción Crear Mi año espera la respuesta de Ayni y el guardado del contexto. Se mantienen dictado, conversación recuperable, fuentes, historia opcional y todas las decisiones antes de preparar.

Se corrigieron importación después de una edición, recuperación de contexto antes de preparar y pérdida al cambiar fuentes. Extensión compatible PUT de la API de conversación, sobre el JSON privado existente; sin migraciones. Autosave 900 ms, CAS/propiedad/fingerprint, exclusión durante turno IA pendiente, lectura tras respuesta incierta y error/reintento explícitos. El draft admite filas incompletas; la preparación mantiene su validación final. Retención del contexto hasta 31 días después del año escolar (mínimo siete días); sin datos pedagógicos en almacenamiento del navegador. ADR-124 documenta límites y rollback.

20 pruebas focales PASS/0 SKIP: contexto, servicio PGlite del recorrido inicial y generación por horizonte. RED/GREEN en navegador reproduce bloqueo de decisiones nuevas y pérdida de edición en recarga; la versión corregida conserva edición, eliminación e incorporación posterior, y recupera un guardado cuya respuesta se perdió. Transporte simulado: un envío explícito al chat, cero generaciones adicionales por guardar/recargar. La prueba privada adapta next/image al harness Vite; no modifica el componente de producto.

Etapa 3: lint focal, build Next webpack y typecheck independiente exit 0. Un primer typecheck simultáneo al build encontró archivos temporales .next/types eliminados por el compilador; no fue un error del producto. Se corrigió el orden de validación y se ejecutó nuevamente tras terminar el build. No volver a correr ambos sobre .next en paralelo.

## Etapa 4 · Aula, niños y diagnóstico

Configuración concentra los cinco datos básicos. Fechas oficiales revisables, logo y datos documentales permanecen disponibles en paneles secundarios; para años sin calendario precargado se abren las fechas. Edad sigue sin selección automática. Formularios protegen trabajo pendiente.

Mi aula usa un resumen breve y filas compactas con nombre completo. Nacimiento, nombre preferido y foto son opcionales plegables. El siguiente paso ya no depende de una marca efímera de aula lista. CSV permite pegar o abrir archivo, revisar todos los niños, retirar filas y reconocer posibles homónimos antes de una sola importación por API existente. No mezcla registros ni modifica niños anteriores. Parser/validador existente se extrajo a módulo compartido sin alterar validación del servidor. Se conserva retirada/reincorporación y foto privada.

Entrevista conserva seis preguntas, autosave, confirmación, papel y adjuntos; las opciones múltiples muestran marca visible. Diagnóstico ofrece una experiencia priorizada y todas las alternativas plegadas; la revisión opcional se distingue de los dos caminos de captura. La cobertura se consulta al abrir la matriz, evitando solicitudes desde pantallas que no la usan. Observación prioriza guardar; sugerir competencia es explícito/opcional y dictar ya no provoca esa consulta. Cambiar de niño o salir protege atribución y correcciones pendientes. Se conserva máximo de dos competencias, fecha, momento, apoyos y medios privados.

52 pruebas focales PASS/0 SKIP. Navegador con componentes reales y transporte ficticio: revisión CSV sin escritura, homónimo reconocido antes de una importación; captura protege cambio de niño, guarda sin competencia y sin consulta de sugerencias; campos opcionales plegados y edad vacía. Typecheck y lint focal exit 0; build final de la etapa pendiente de registrar. Las primeras comprobaciones detectaron tipos nullable y una condición del tercer tab retirado del encabezado; corregidos antes del cierre. Rollback revierte UI y extracción; formatos y datos del servidor permanecen compatibles.

Cierre etapa 4: build Next webpack exit 0 después de la última corrección. No se usaron aulas remotas ni proveedores IA reales.

## Etapa 5 · Mi año, proyecto, Hoy y Calendario

Editor conserva sus quince tramos y drag/drop; abre alrededor de la fecha del servidor y añade flechas/Ir a hoy. Biblioteca y oportunidades por competencia son plegables; la biblioteca se abre al arrastrar. Mover/retirar/sustituir conserva CAS, confirmación, delta curricular y protecciones. Vista Lista disponible. Proyectos reutilizan mensajes del chat y agrupan ajustes/dictado opcionales; preparar y la siguiente actividad destacan, mapa/criterios siguen disponibles. Generación gradual y ejecución docente intactas.

Hoy reduce duplicaciones de captura en cabecera/acciones rápidas; asistencia secundaria aparece en días lectivos y se conserva la captura cotidiana alternativa cuando la evidencia principal pertenece a una actividad. Calendario mantiene Mes/Semana/Año, excepción, reprogramación y fuente oficial; agrupa calendario oficial, mejora controles táctiles y usa Dialog existente para foco/Escape. Reprogramación/excepción pendiente y cierre de actividad se protegen; escrituras evitan doble envío mientras están activas.

42 pruebas focales PASS/0 SKIP; navegador ficticio PASS para foco/Escape del taller, guarda de reprogramación/cambio de mes, guardado explícito y nota de cierre sin finalización automática. Typecheck y lint focal exit 0. Build Next webpack exit 0. Revisión vercel:react-best-practices aplicada sin nuevos frameworks o dependencias. Rollback: revertir UI; ninguna API, migración ni dato mutado por esta etapa.

## Etapa 6 · Informes, documentos e integración

Descarga completa y sincronización pasan a detalles secundarios. Se mantienen cuatro carpetas, árbol, versiones, progreso recuperable, Word/ZIP y conflictos de archivos. El consolidado se llama Registro de evaluaciones; conserva filtros, conclusiones y Excel, con región desplazable por teclado. Informes preparados indican «falta guardar» hasta persistirse; preparar no equivale a guardar o confirmar. Errores de conexión usan una indicación docente, sin pedir iniciar infraestructura.

La prueba vertical con navegador, servidor HTTP real y PGlite nueva detectó un bloqueo después de configurar el aula: la guarda busy del formulario interceptaba su propia transición de éxito. Se permite esa transición únicamente después de la respuesta de guardado. Reproducción inicial fallida y comprobación posterior PASS para configuración → niño → observación → dos correcciones → recarga. Datos exclusivamente ficticios; entorno hijo sin credenciales de proveedores, cero IA. Las guardas de las otras salidas se mantienen.

Suite completa fresca: 768 PASS, 0 FAIL/0 SKIP, incluidos servicios PGlite, rutas HTTP, autorización, IA simulada y suite evals. Primer pase: 762/765 PASS; tres expectativas de textos retirados se actualizaron preservando comprobaciones de guardado/confirmación. Reejecución focal posterior a la transición de configuración: 24/24 PASS. Typecheck, Next webpack y Vinext exit 0. Lint global: exit 0, cero errores, dos avisos preexistentes en fixtures privados ajenos. Rollback: revertir este commit de cliente/tests; sin migración ni cambio de formato.

Capturas e integración ampliada registradas en la etapa 7. Producción fuera del alcance.

## Etapa 7 · Validación integrada y detalles táctiles

Acciones de preparar/cambiar proyecto separadas, con altura mínima de 44 px y texto adaptable. Selección de rutinas en entrevista tiene marca visible y objetivo de 44 px, igual que las otras opciones. Sin cambios de datos, reglas o confirmación. 27 pruebas focales PASS/0 SKIP; typecheck, lint focal y builds Next/Vinext exit 0 después de estos ajustes.

Recorrido vertical real: configurar aula nueva, añadir niño, recargar, guardar observación, dos correcciones, recargar historial y recuperar la segunda; escribir respuesta de entrevista y recuperar su autosave después de recargar. Servidor HTTP real y PGlite nueva en directorio privado aislado, docente/niña ficticias. Proceso hijo con lista explícita de variables del sistema, sin secretos de IA/Supabase. Cero solicitudes de generación/sugerencia/transcripción y cero confirmaciones de evaluación. Todas las mutaciones corresponden a acciones de la prueba o autosave existente de entrevista; no se modificaron aulas remotas.

Componentes restantes con estilos reales y transporte ficticio: contexto/chat, editor 15 tramos (foco por fecha, flechas, desplazamiento interno), proyecto, actividad, revisión de competencia, lote, registro y documentos. Diez estados en 1366×900 y 390×844: sin error JS ni desbordamiento de página. Una ronda visual y otra de confirmación; se conserva la identidad visual. Las fechas del mock de calendario se ajustaron a from/to del contrato para no mostrar días ajenos al proyecto. Next Image se adapta únicamente en el harness privado; su aviso inicial sobre unoptimized no es un fallo del producto.

Las capturas de workspace esperan datos específicos, no solo la presencia del contenedor: un primer intento fotografió cargas transitorias y no se considera validación visual de contenido. Los resultados aprobados y fuentes de transporte se distinguen en `.local/ux-simplificacion/`; no se mezclan mocks con pruebas de backend real.

Validadores ejecutados: catálogo diagnostic-v4.4 válido, siete experiencias con estado development_fixture y revisión editorial aún necesaria. Validador curricular legado exit 0, pero informa 0/0 transcripciones oficiales verificadas; no se declara completitud curricular a partir de ese resultado. No se cambió el contenido pedagógico.

## Comparación de experiencia

| Antes | Implementación actual |
|---|---|
| Observación podía desaparecer al cerrar; segunda corrección desde RAW | Guardas de trabajo pendiente; corrección desde versión vigente y original consultable |
| Octubre abría Bimestre 1 fuera de período | Período explícito/vigente/último terminado, selector y contexto en URL |
| Análisis y ediciones de informes podían salir sin aviso | Guardar borrador separado de confirmar; ediciones protegidas y recuperación de lo guardado |
| Contexto anual local bloqueaba nuevas decisiones del chat | Contexto durable con CAS, importación por turno, borrados respetados y recuperación de respuesta incierta |
| Pasos/tarjetas/contexto repetidos delante del chat | Chat y creación principales; un panel de contexto plegable |
| Configuración y matrícula con opcionales prominentes | Datos principales primero; opcionales plegados, lista compacta y CSV revisado antes de guardar |
| Tres entradas diagnósticas y catálogo completo al inicio | Dos caminos; revisión opcional y experiencia priorizada con alternativas disponibles |
| Sugerencia curricular/dictado confundidos con guardar | Guardar observación principal; sugerir competencia opcional/expreso, sin consulta automática al dictar |
| Mapa comenzaba al inicio; biblioteca extensa | Foco en fecha del servidor, flechas/Ir a hoy, biblioteca plegable; quince tramos intactos |
| Hoy duplicaba captura y mostraba asistencia en día no lectivo | Acción cotidiana priorizada; asistencia contextual y observación alternativa conservada |
| Reprogramación/cierre podían descartar notas | Salidas protegidas; guardado/ejecución siempre por acción docente |
| Preparado parecía guardado; sincronización competía con documentos | Estado «falta guardar» y funciones completas de descarga/sincronización bajo detalle |

## Commits y publicación

Base: `e3a107ffc9d8d83f1cbd73c4b68129a8a03d854f`. Rama: `codex/ayni-ux-simplificacion-20261011`.

| Commit | Entrega |
|---|---|
| `0fe1e4c` | Auditoría base preservada |
| `5968ce0` | Observación y correcciones |
| `ca8026d` | Períodos y borradores de evaluación |
| `9c0a40d` | Contexto anual durable sin generación extra |
| `1f9da5d` | Aula, matrícula y diagnóstico |
| `cfa173e` | Mi año, proyecto, Hoy y Calendario |
| `b597913` | Documentos, estados de informe y transición de aula |
| `5bafbd8` | Acciones táctiles, entrevista y validación integrada |

La siguiente revisión visual del propietario se realiza sobre esta implementación, sin reconstruir flujos ni añadir generación anticipada.

### Recibo de Preview · 2026-10-11

- URL única: https://ayni-aula-staging-2wy9l0jb4-ayni4.vercel.app
- Deployment: `dpl_JEKHFdGe8mRzTH3744vfwccMct69`; estado `READY`; target `preview`.
- Commit de producto y documentación enviada: `5bafbd802ff892f14280fc9181a77dce900bbf0f`, rama `codex/ayni-ux-simplificacion-20261011`; origin coincide. Fuente: CLI desde checkout limpio; SHA/ref agregados explícitamente a metadata. No es un build Git automático.
- Proyecto permitido `ayni-aula-staging`, `prj_3GOhE5KykLKbhuULD5rAeXpfbEko`, equipo `ayni4`/`team_NBNhb7GhppqLvEnxRxrVk9kl`. El conector conectado a otra cuenta no se usó para este despliegue. Sesión CLI existente renovada automáticamente; sin exponer credenciales.
- Smoke HTTP real: 22/22 PASS. Inicio, entrevista, salud y configuración de Auth responden 200; sesión y rutas pedagógicas privadas responden 401 sin sesión, incluido PUT de contexto anual. No se escribieron datos docentes ni se solicitó IA remota.
- Navegador sobre el Preview desplegado: acceso por DNI/contraseña, recursos y estilos en 1366×900 y 390×844; cero errores JS, cero desbordamiento y cero mutaciones. Este resultado no es un login docente autenticado.
- Protección Vercel preservada. `vercel curl` 62.7.0 reenvió `--global-config` al curl nativo en dos formas de invocación y no completó la petición. Se utilizó el acceso de automatización ya existente del mismo proyecto, solo en memoria y limitado a su URL/origen. No se creó credencial ni se desactivó protección. No considerar aprobados esos dos intentos fallidos.
- Producción conservada: `dpl_EgekhWXwVjaM9iCcRc8mpJn2Eoc4`, SHA `ea206bf179841f6a85f43dbec95c391a47b12674`; verificada por lectura antes y después. Sin promoción, migración o modificación remota de datos.

### Matriz de validación final

| Comprobación ejecutada | Resultado y alcance |
|---|---|
| Node tests de src/lib, scripts y evals/ai-routing-v4/suite | 768 PASS, 0 FAIL/0 SKIP; ejecución fresca completa |
| Pruebas después de los últimos ajustes táctiles | 27 PASS/0 SKIP; subconjunto, no se suma a 768 |
| Typecheck independiente | Exit 0 después del build, sin carrera sobre .next/types |
| ESLint global + focal posterior | Exit 0; cero errores, dos warnings previos en fixtures privados ajenos |
| Next webpack y Vinext | Exit 0 tras últimos cambios; avisos existentes de PGlite/eval, chunks y clasificación de rutas Vinext |
| Browser → HTTP → PGlite nueva → respuesta/recarga | PASS para aula/niño/observación/dos correcciones/entrevista autosave; cero IA pagada |
| RED/GREEN de cinco problemas prioritarios | Observación/salidas, correcciones sucesivas, bimestre, contexto y borradores reproducidos y corregidos; límites de transporte en cada etapa |
| Componentes con estilos, escritorio/móvil | 20 capturas de diez estados, sin errores JS/desbordamiento; editor conserva 15 tramos y foco por fecha |
| Workspace con backend local real, escritorio/móvil | Ocho estados en ambos tamaños; sin desbordamiento. La conversación anual inicial muestra api_key_missing porque se excluyeron credenciales; no se declara generación real aprobada |
| Preview HTTP público y navegador de acceso | 22 checks PASS y ambos tamaños; sin sesión docente, sin mutaciones |

Artefactos de QA privados: `.local/ux-simplificacion/` (logs, recibo, capturas y datasets ficticios); fuera de Git y del despliegue. El recibo/documentación posterior no modifica el producto publicado en el SHA indicado.

## Límites y rollback

- Pendiente aceptación visual conjunta pantalla por pantalla, hardware de cámara/micrófono y zoom 200 %.
- Pendiente smoke autenticado de dos docentes ficticias en Preview, incluidos medios privados y aislamiento remoto. Las pruebas PGlite/HTTP de autorización pasaron; no sustituyen esa comprobación remota.
- El trabajo pendiente de observación sin guardar vive en memoria y tiene guardas; una salida deliberada lo descarta. Contexto anual y borradores guardados sí se recuperan del servidor. No se guardan datos pedagógicos en localStorage.
- Contexto con cambios simultáneos/conflicto CAS exige reintento o recargar conscientemente; no mezcla ciegamente escrituras ajenas. Se importan turnos nuevos una vez; no se resuelven contradicciones semánticas automáticamente.
- Importación admite CSV, no XLSX; homónimos requieren revisión, sin fusiones automáticas ni edición masiva de identidades.
- Sin migraciones, prompts/modelos nuevos, reemplazo del backend o publicación en Producción. PUT de contexto usa JSON privado existente y mantiene control de propiedad/revisión.
- Rollback por commits independientes; los datos guardados siguen compatibles. Revertir UI no borra evidencias, versiones, períodos, trabajos ni contexto. No ejecutar limpieza de datos reales como rollback.
