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

Siguientes etapas: contexto/chat anual; configuración/matrícula/diagnóstico; año/proyectos/Hoy/Calendario; informes/documentos; integración y Preview. Se conservan cinco destinos, quince tramos, biblioteca, calendario, ejecución/confirmación docente y generación gradual de actividades.

Pendientes generales: Preview de esta rama, recorrido integrado, capturas con estilos de escritorio/móvil, zoom 200 %, hardware físico y aislamiento remoto de dos docentes. Los resultados históricos no se heredan como resultados nuevos. No se hará publicación en Producción.

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
