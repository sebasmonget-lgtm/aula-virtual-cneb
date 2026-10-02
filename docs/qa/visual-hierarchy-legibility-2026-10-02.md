# I3 e I5: jerarquía, legibilidad y móvil

Fecha: 2026-10-02. Base: `407e833d121a980b1a2cccf279bc0c854701e91f`, rama `codex/annual-year-map`.

## Alcance y criterios

Implementación focal de la auditoría delta de Impeccable + Web Design Guidelines: tarea antes que orientación secundaria, legibilidad del mapa/calendario y adaptación móvil. Se mantiene la identidad visual de Ayni. No se modifican servicios, migraciones, prompts, permisos ni reglas pedagógicas o de confirmación.

Se usaron Impeccable (contexto, layout, craft-floor y adapt), revisión visual en navegador real y Web Interface Guidelines (jerarquía, controles táctiles, contenido adaptable y disclosures nativos). El detector mecánico de layout de Impeccable se ejecutó una vez sobre los diez componentes modificados: sin hallazgos (`[]`). Ese resultado no sustituye la revisión visual ni acredita accesibilidad completa.

## Cambios por pantalla

| Pantalla | Tarea y botones | Contexto conservado y compactado |
| --- | --- | --- |
| Así entendí tu aula | Acciones de guardar/revisar/crear el año antes de las cinco tarjetas; un encabezado propio sin duplicar Mi año. Estados, errores y aviso de evidencia nueva permanecen visibles. | Explicación de guardado en «Qué se guarda y qué confirmarás». Cobertura y diferencias posteriores a las tarjetas en «Evidencia utilizada y cambios desde la decisión anterior». |
| Ideas docentes | Generar/continuar al inicio, guardar y editar como secundarios; botones envueltos y generación a todo el ancho móvil. Volver a la revisión queda después de los campos. Entrada de título a 16 px y eliminación con objetivo de 44 px. | Introducción breve, opcionalidad explícita; explicación completa en «Cómo tendrá en cuenta Ayni tus ideas». Advertencia de regeneración y conservación del vigente visible. |
| Mi año | Guardar/confirmar antes del mapa; anterior como acción discreta. Regenerar después del mapa. Se elimina el botón redundante de volver al mapa, conservando el selector mapa/lista. | Procedencia de ideas y explicación de confirmación desplegables. Versiones y cobertura conservadas. El recorrido general se encuentra después de la tarea. |
| Mi año: legibilidad | Se elimina el recorte del título a dos palabras. Títulos, meses, fechas y etiquetas del mapa a 12 px; tarjetas más altas y lienzo horizontal más amplio. Feriados cercanos en dos filas visuales para separar sus objetivos táctiles. | Nombre completo en detalle y lista. Propósito/razón desplegables; competencias/información compactadas en móvil. Aviso de desplazamiento fuera del lienzo horizontal. Fechas y cálculo lectivo sin cambios. |
| Proyecto/Unidad | Actividades primero; «Desarrollar actividad» con altura cómoda y debajo del título en móvil. Encabezado «Tu proyecto o unidad», sin repetir el nombre largo en cada título de sección. | Propósito de cada actividad desplegable. Documento, imagen y versiones después de las actividades. Resultados anteriores y recorrido opcionales después de la tarea. |
| Actividad | Selección, fecha y «Preparar día» antes del contexto heredado. Guardar/confirmar antes de los campos del borrador; guardar secundario cuando corresponde confirmar. «Ver qué observar» antes del contenido confirmado. | Propósito del proyecto desplegable, sin bloque sticky; talleres después de la tarea. Criterio/evidencia/contexto de la ruta desplegables, conservando todos los campos y callbacks. |
| Evaluación | Período siempre visible; selección de niño/competencia precede la revisión normal. Requisitos de preparación del marco y acciones bloqueadas conservados. | Aula/año en disclosure con selección actual visible. Métricas, ocho pasos de cierre y otras vistas después de la tarea. El marco sigue montado y su disclosure se abre si requiere preparación/revisión. |
| Conclusiones | Título específico; entrada a cada conclusión envuelta y a ancho completo. En el detalle, niño/bimestre y conclusión antes del sustento y revisión de valoración. Selectores secundarios después del detalle también en el DOM. | Valoración confirmada conservada. Contexto de evidencia y revisión de valoración plegados cuando corresponde; advertencias o valoración pendiente no ocultas. Vacío con una instrucción breve y «Preparar actividad». |
| Calendario | Controles de vista envueltos, objetivos cómodos. Etiquetas desktop a 12 px y nombres con salto de línea. | En móvil, día, indicador de proyecto y contador de actividades. Nombres completos y motivo del día en el detalle. Leyenda de proyecto móvil visible. Navegación Semana y datos no cambian. |

Transversal: el recorrido de planificación, progreso y «Ir a» se conserva en «Tu recorrido y otras etapas», después de la tarea. «Resultados anteriores para planificar» es desplegable opcional y se abre automáticamente si contiene un error.

## Validación focal en navegador

Entorno local aislado: copia desechable de PGlite en `.local/visual-ux-2026-10-02/pgdata`. Datos QA reutilizados; sin datos reales, nuevas generaciones, llamadas al proveedor real ni cambios a planes vigentes.

Desktop aproximadamente 1280 × 720 y viewport móvil 390 × 844. Comprobados:

- Revisión del aula y entrada de ideas: acciones, advertencias y campos visibles; contexto secundario accesible mediante disclosures.
- Mi año: mapa de versión vigente y borrador, detalle con nombre completo, lista móvil con el mismo orden y títulos legibles. Editor original abierto desde lista; Escape cierra y devuelve foco a Editar.
- Proyecto: ruta, título completo, fecha y botón apilados en móvil; entrada a Actividad existente.
- Actividad: selección/fecha/Preparar día, borrador y contenido confirmado; contexto compacto.
- Calendario: celdas móviles breves, nombre completo de proyecto en detalle y controles desktop.
- Conclusiones: vacío de Bimestre 3 y detalle QA confirmado de Bimestre 4; texto y valoración B conservados. «Completar valoraciones» lleva a evaluación con `focus=none`.
- Evaluación: período, selectores y requisitos del marco conservados en ambos tamaños. Medición DOM móvil: viewport 390 px, ancho del documento 375 px (scrollbar); sin overflow de página en esta vista.
- Disclosure con teclado Return; editor de lista con Escape y retorno del foco. No se declara una auditoría integral de teclado o lector de pantalla.

No se encontraron bloqueos que exigieran modificar lógica. No se repitió el E2E completo ni la generación de Word.

## Pruebas

- `node --test src/lib/annual-version-navigation.test.mjs src/lib/annual-year-map.test.mjs src/lib/school-calendar-navigation.test.mjs src/lib/workflow-ui-continuity.test.mjs`: PASS, 29/29. Incluye Cancelar/Descartar de P1, proyección del mapa, navegación Semana y continuidad.
- `npx tsc --noEmit`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS. Avisos existentes de PGlite/eval, tamaño de chunk y clasificación de rutas de vinext; fuera del alcance visual.
- `git diff --check`: PASS.
- Diff revisado: diez componentes de presentación y este informe. El bloque AGENTS.md generado por Next durante QA se excluye/restaura.

## Capturas

Archivos locales de evidencia, excluidos del repositorio, en `C:/Users/ASUS/Documents/ChatGPT/Asistente CNEB/.local/visual-ux-2026-10-02/`.

Comparaciones del mismo estado QA:

- `antes-mi-ano-desktop.jpg` / `despues-mi-ano-desktop.jpg`.
- `antes-mi-ano-mobile.jpg` / `despues-mi-ano-mobile.jpg`.
- `antes-conclusiones-desktop.jpg` / `despues-conclusiones-desktop.jpg` (Bimestre 3 vacío).
- `antes-conclusiones-mobile.jpg` / `despues-conclusiones-mobile.jpg` (Bimestre 3 vacío).

Otras evidencias después: `despues-aula-entendida-{desktop,mobile}.jpg`, `despues-ideas-{desktop,mobile}.jpg`, `despues-mi-ano-lista-mobile.jpg`, `despues-proyecto-{desktop,mobile}.jpg`, `despues-actividad-{desktop,mobile}.jpg`, `despues-evaluacion-{desktop,mobile}.jpg`, `despues-conclusion-detalle-{desktop,mobile}.jpg`, `despues-calendario-{desktop,mobile}.jpg`, `despues-calendario-detalle-mobile.jpg`. Las capturas de Calendario preceden al ajuste final menor de su punto de leyenda (emoji sustituido por círculo CSS).

## Límites y pendientes fuera de alcance

- El mapa mantiene desplazamiento horizontal; lista móvil y detalle ofrecen lectura completa. Títulos excepcionalmente largos deben consultarse allí. No se rediseñó el calendario o el mapa completos.
- Requisitos y advertencias pueden empujar acciones debajo del primer viewport; se mantienen por prevención de errores. Se compactó orientación secundaria, no requisitos de la tarea.
- No se validó teléfono físico, Safari, lector de pantalla real ni zoom integral en esta fase.
- Se dejan para sus fases los restantes P2/P3: navegación global, landmarks/tabs, textos internos de otros módulos y revisión integral de formularios.
- Observación de navegación fuera de alcance: tras abrir un detalle de conclusión, volver al inicio y entrar por «Analizar evidencias» conserva `focus=conclusion` en la URL. «Completar valoraciones» restablece `focus=none` y permitió continuar. Los handlers de navegación son anteriores a esta fase; no se modificaron para este trabajo visual. Recomendada una comprobación focal posterior de ese cambio de tarea.

Cambios locales listos para revisión. No se crea commit ni se hace push/despliegue en esta fase.
