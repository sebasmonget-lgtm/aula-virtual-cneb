---
version: 1
slug: "src-features-dashboard-components-today-home-tsx"
primary_target: "src/features/dashboard/components/today-home.tsx"
related_targets: ["src/features/dashboard/components/school-calendar-screen.tsx"]
---

# Cumpleaños en Hoy y Calendario

Modo Operate. Extensión de dos superficies existentes, sin rediseño ni cambio de identidad.

## Direction contract

THESIS: La profesora reconoce de inmediato a quién saludar hoy y qué cumpleaños recordar para mañana, usando las fechas ya guardadas en matrícula.

OWN-WORLD: Conservar tipografía, azul oscuro y teal de Ayni, con una superficie lavanda suave y pictogramas Cake y CalendarClock de Lucide. Texto de alto contraste, sin confeti, animaciones ni elementos decorativos repetidos.

STORY: Registrar o editar una fecha actualiza automáticamente el aviso y el calendario; no hay otro formulario ni eventos duplicados que gestionar. Los niños sin fecha o retirados no aparecen.

FIRST VIEWPORT: En Hoy, un bloque compacto después del saludo y antes de la actividad, solo cuando hay cumpleaños hoy o mañana. Cada nombre queda junto a su referencia temporal. En Calendario, marca pequeña por día y nombres completos en el detalle seleccionado; no cambiar clases, feriados ni proyectos.

FORM: Extensión directa de la composición existente y petición precisa; no hay sorteo de conceptos ni comp de referencia. En móvil se permite envolver nombres y la marca del calendario conserva tortita y nombre.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Restricciones: proyección privada y determinista, sin IA ni migraciones, sin añadir datos de cumpleaños al contexto de planificación enviado a IA. El reloj servidor de Lima y QA determina hoy/mañana. Los retratos del recorrido son imágenes generadas solicitadas por el usuario; conservar procedencia fuera de Git.


## Refinamiento cotidiano · 2026-10-22

Modo Operate conservado. La actividad y su apertura directa son el foco; el botón principal mide al menos 56 px y ocupa el ancho disponible en móvil. Asistencia/cumpleaños conservan contexto. Observación libre comparte identidad NotebookPen desde diagnóstico; talleres cierra el contenido visible. Se retiran de Hoy los accesos redundantes a otro día, pendientes anteriores y otras preparadas; las flechas siguen consultando sin iniciar. La guía en consulta no muestra captura.

Revisión: 1440×900 y 390×844, una ronda visual; prueba funcional adicional tras corregir solo el adaptador next/image del harness. Sin cambios visuales posteriores. Detector de seis componentes sin hallazgos. Veredicto local listo, sin publicación ni raster nuevo. Evidencia y límites en docs/QA_HOY_SIMPLE_2026-10-22.md.


## Decisión posterior sin ciclo manual · 2026-10-22

Abrir/navegar deja de iniciar o completar. Observaciones disponibles en la guía cotidiana, posición solo de lectura conservada localmente, notas históricas legibles y talleres independientes al final de Hoy. Prevista/Con observaciones/Sin registros no confunden lectura con realización. Veredicto local listo; publicación QA autorizada y su recibo se documenta en QA_ACTIVIDAD_SIN_CICLO_2026-10-22.md.
