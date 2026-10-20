# Diseño de Ayni

## Evaluar: identidad de competencias · 2026-10-20

Modo Operate. Se conserva la identidad cálida de Ayni: las competencias reutilizan los colores y pictogramas existentes, con alias cortos en las filas y encabezados de matriz; el nombre oficial permanece accesible. La revisión muestra observaciones ya guardadas y valoraciones por revisar como conceptos diferentes. Los tres destinos tienen iconos, contenedor blanco, borde visible y selección teal con aria-current; cada encabezado separa título, bimestre y fechas. Fila de competencia con superficie suave, progreso real y una acción Revisar. Consolidado mantiene columnas compactas y nombres fijos. El estado vacío de informes usa una ilustración de cuidadores de 640px, mostrada a 176px; no se amplía el pictograma de 160px de Mi año.

## Experiencia cotidiana · modo Operate

La profesora necesita reconocer lo que aportó, observar una actuación y revisar decisiones con poco tiempo. Se conservan tipografía sans, azul oscuro #172b52, teal #087d96, superficies #edf5fa y texto secundario #526b87. Usar los componentes existentes y acciones de al menos 44 px, etiquetas explícitas, foco visible y mensajes de estado.

La navegación principal tiene cinco destinos: Mi año, Hoy, Calendario, Evaluar y Planificación. Mi aula es una entrada permanente independiente del avance de planificación. Mi año mantiene un timeline horizontal principal de 15 tramos temporales fijos y proyectos independientes. Pictogramas, ficha de proyecto, biblioteca, versiones y protección del pasado se conservan.

Diagnóstico muestra accesos paralelos a entrevistas, observación y revisión. Los editores conservan su estado al alternar caminos. La síntesis fundamentada es breve y editable; sus fuentes y versiones son detalles secundarios. Contexto familiar y aportes docentes se identifican y no representan automáticamente logros del grupo.

Hoy coloca la actividad y la observación contextual primero, sin acción de foto duplicada ni presión global por completar evidencia. En semana de gestión o fin de período permite Ir a Mi año. No ofrece un reajuste inteligente del período en esta versión.

Evaluar presenta únicamente Evaluación del bimestre, Informe a familias y Consolidado como espacios principales. La revisión avanza por competencia y niño, muestra fechas, actividad, criterio y texto original, permite decisión docente AD/A/B/C y Confirmar y siguiente. No selecciona nivel por defecto. Sin evidencia se muestra como pendiente, nunca C.

Los lotes muestran avance, textos listos y excepciones Conviene revisar en ámbar suave. Revisión individual, regeneración de un texto y guardado conjunto conservan las fuentes canónicas. La familia recibe las mismas conclusiones guardadas. Consolidado mantiene la matriz con scroll interno y encabezados fijos; mostrar conclusiones amplía las celdas, consultar evaluación vuelve al origen. Cierre y reapertura tienen acciones explícitas y motivo registrado.

Documentos usa carpetas familiares por año/aula, tipo y proyecto/versión. Conserva historial, Word y ubicación al volver. Mi año reúne la tarjeta esencial y las actividades cronológicas, con selección visible.

QA mínimo: escritorio 1366 y móvil 390 con datos ficticios. Las capturas describen el estado comprobado y no sustituyen la revisión humana ni certifican todo Ayni. Preview y Production deben compartir exactamente el mismo SHA y pasar sus verificaciones. La promoción queda bloqueada si falla un gate.


## Recorrido moderno de IA · 2026-10-07

La síntesis diagnóstica ofrece Preparar síntesis con Ayni, texto editable y fuentes por afirmación en un detalle secundario. Se distingue observación directa, según la familia y comentario docente. No se añade revisión individual ni confirmación de prioridades al recorrido principal.

Mi año conserva sus quince tramos y movimientos por código. El editor nuevo no ofrece intención global libre como acción principal. Biblioteca conversa antes de preparar una tarjeta. El proyecto ofrece conversación breve, calendario revisable y una preparación completa; aceptar los días prepara todas sus actividades con progreso debajo de la tarjeta. Loading conserva avance y permite salir y volver.

Dentro de una actividad se ofrece + Añadir taller. No hay pantalla obligatoria de talleres del proyecto. Actualizar qué observar requiere elegir un cambio del propósito o de lo que harán los niños y explicar el cambio; los ajustes de tiempo, lugar o materiales se editan normalmente.

### Biblioteca de talleres en Hoy · 2026-10-15

Hoy ofrece Elegir taller, sin un sexto destino principal. La biblioteca hereda colores y pictogramas de competencias, tipografía y tarjetas de Ayni. Edad del aula seleccionada de entrada, filtros por tipo/competencia y búsqueda. Primero aparecen competencias sin ejecución registrada y después menor cobertura de niños; esas señales nunca son niveles. La docente revisa propósito, materiales, preparación, guía de tres momentos y criterio antes de añadir a un día lectivo. La ficha mantiene ancho legible y pasa de tres columnas a una en móvil. La ejecución abre la misma guía de Hoy: preparación visible, acciones docentes, acciones infantiles, observación junto al criterio, captura libre independiente y Word existente. La selección no llama a IA ni inicia la actividad.

Los talleres compartidos muestran «3, 4 y 5 años» o «4 y 5 años» en una sola tarjeta. La revisión aclara qué guía por edad se está mostrando; cambiar el filtro de edad cambia consignas y criterio. No hay un formulario adicional ni una selección pedagógica obligatoria extra: al guardar, el servidor usa la edad del aula.

Con cien talleres, los mismos filtros y búsqueda muestran una cantidad de resultados breve y accesible. La cantidad se calcula sobre identidades visibles, no suma adaptaciones. No se añaden submenús, otro navegador de biblioteca ni un paso de generación al elegir.

Evaluar abre sin generar IA y muestra observaciones originales junto a la revisión docente. El contexto calculado no requiere confirmar un Assessment Master de IA. Informe a familias conserva las conclusiones guardadas y permite escribir acuerdos opcionales. Consolidado muestra información calculada; la generación de informe narrativo del aula queda fuera del recorrido moderno. Los históricos conservan consulta y Word.

### Contraste de superficies y sombras · 2026-10-17

Refinamiento aprobado a partir del mockup de matrícula: fondo azul grisáceo `#eaf2f8`, tarjetas blancas, borde neutral `#b8ccde` y sombra compartida `0 5px 16px rgba(23,43,82,.065)`. Las tarjetas principales reutilizan `--ayni-panel-border` y `--ayni-panel-shadow`; los estados y las superficies de competencias conservan sus colores. No aplicar sombras nuevas a cada tarjeta interna, fila ni control.

Campos editables con fondo suave `#f0f5fa`, borde `#748da4` y placeholder `#526b87`: contraste borde/fondo 3.14:1 y placeholder/fondo 5.02:1. Las búsquedas con iconos y los compositores envueltos pintan el contenedor, manteniendo transparente su campo interior. Archivo, checkbox, radio y color conservan su presentación específica. Foco, error y deshabilitado siguen diferenciados. Matrícula separa sus dos paneles por 24 px en escritorio y conserva el apilado móvil. No cambia texto, tipografía, tamaño, contenido pedagógico ni reglas funcionales.

### Corrección de controles activos · 2026-10-17

El feedback posterior sustituye el fondo gris azulado del campo editable por blanco `#ffffff`: el gris `#e7edf3` se reserva a campos deshabilitados o de solo lectura. Bordes, foco y sombras de tarjetas se mantienen. Contraste del borde sobre blanco 3.45:1 y del placeholder 5.51:1. Las opciones de entrevista disponibles usan celeste `#f3fcff`, borde `#62869c`, texto `#234b63` y casilla bien visible; seleccionadas usan turquesa suave `#dcf4ef`, borde/indicador `#087d96` y marca de verificación. Hover distingue la acción sin reemplazar la selección. No se alteran etiquetas, tamaños, respuestas ni reglas de confirmación. Esta corrección prevalece sobre el fondo editable descrito en el apartado anterior.


### Lenguaje sencillo en informes · 2026-10-20

Se conserva el diseño actual. La versión familiar dice «Lo que observamos», «Apoyos en el aula» y «Qué seguiremos trabajando». El resumen es editable al revisar una nueva propuesta y la conclusión original se consulta en un detalle desplegable. Las versiones anteriores se actualizan solo con una acción explícita. Palabras cotidianas y recomendaciones breves, sin atribuir apoyos futuros al pasado ni añadir trámites.
