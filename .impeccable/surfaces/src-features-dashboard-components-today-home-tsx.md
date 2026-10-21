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

FIRST VIEWPORT: En Hoy, un bloque compacto después del saludo y antes de talleres, solo cuando hay cumpleaños hoy o mañana. Cada nombre queda junto a su referencia temporal. En Calendario, marca pequeña por día y nombres completos en el detalle seleccionado; no cambiar clases, feriados ni proyectos.

FORM: Extensión directa de la composición existente y petición precisa; no hay sorteo de conceptos ni comp de referencia. En móvil se permite envolver nombres y la marca del calendario conserva tortita y nombre.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Restricciones: proyección privada y determinista, sin IA ni migraciones, sin añadir datos de cumpleaños al contexto de planificación enviado a IA. El reloj servidor de Lima y QA determina hoy/mañana. Los retratos del recorrido son imágenes generadas solicitadas por el usuario; conservar procedencia fuera de Git.
