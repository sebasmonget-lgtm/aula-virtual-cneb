# Auditoría: actividad sin inicio ni cierre manual · 22 de octubre de 2026

## Resultado

La decisión es viable, pero no está implementada íntegramente. El cambio local anterior quitó un clic: TodayHome abre con start=true la actividad prevista, TeacherWorkspace persiste start y ActivityRunView todavía ofrece Terminar actividad. No equivale a retirar el ciclo de ejecución. No publicar esa interpretación como si cumpliera la aclaración posterior.

Esta auditoría no cambia código de producto ni datos. Distingue dependencias comprobadas de correcciones propuestas. La maqueta local anterior conserva su apariencia aprobada; su comportamiento necesita otra implementación vertical antes de publicarse.

## Dependencias comprobadas

| Área | Comportamiento actual y efecto de retirar solo los controles | Referencias |
| --- | --- | --- |
| Hoy / guía | set_step exige status active. Sin start, avanzar falla. Sin complete, el estado diario puede seguir pidiendo cierre. El inicio se guarda al abrir, incluso si solo se lee. | today-home.tsx:114; teacher-workspace.tsx:310; activity-run-view.tsx:29/59; activity-runner.mjs:14; daily-state.mjs |
| Calendario | active se presenta En curso y ya no permite Marcar como no realizada. Sin cierre puede quedar así en históricos. Abrir no debe ser prueba de realización. | daily-dashboard-display.mjs:21; school-calendar-screen.tsx:88 |
| Mi año | La lista de actividades convierte completed en Realizada, active en En curso y una fecha pasada sin ejecución en Sin realizar. Con el modelo nuevo, falta de registro no permite esa última afirmación. | scripts/preparation-routes.mjs:74 |
| Reprogramación y reemplazos | Un log distinto de planned o con marcas de inicio/fin ya protege actividad, proyecto y fecha. Abrir la guía hoy puede bloquear cambios aunque no se haya guardado ninguna observación. No retirar las protecciones de observaciones ni del pasado. | activity-schedule-integrity.mjs:13; project-slot-replacement.mjs:14; project-rebase-service.mjs:22; scripts/annual-journey-routes.mjs:60 |
| Evaluar / consolidado | El mapa considera completed o evidencia asociada como trabajo; active sin evidencia sigue planned. El alcance también incorpora observaciones, valoraciones y borradores. Sin cierre manual, no se pierde una observación real, pero desaparece la señal de actividad trabajada sin evidencia. No sustituirla por una realización supuesta. | period-assessment-closure-service.mjs:27/93; period-evaluation-service.mjs:93 |
| Revisión del período y talleres | Ambos cuentan active/completed como oportunidades trabajadas/desarrolladas. Así, leer puede contar en estas áreas mientras el mapa de Evaluar aún dice planned. Hay una discrepancia semántica comprobada entre lectores. | period-future-review.mjs:32; workshop-library-service.mjs:26 |
| Documentos / Word | actual_execution_date viene de un log con actual_started_at. Trabajar otra fecha requiere hoy start_today; limita repetir ejecución en otra jornada. Eliminar start sin reemplazar el contrato deja sin esa fuente de fecha real; mantener inicio al abrir atribuye fecha de ejecución a una lectura. | document-library-service.mjs:193; activity-unified-word.mjs:240; activity-today-execution.mjs:23 |
| Observaciones | El guardado no exige daily_execution_logs ni complete: valida docente, aula, alumno, actividad/criterio/momento, fecha e idempotencia. El nuevo requisito puede apoyarse en este flujo. El bloqueo visual por preview del cambio anterior deberá adaptarse para que la guía cotidiana permita registrar sin start. | ordinary-observation-service.mjs:27; activity-run-view.tsx:52 |
| Notas e informes | Las notas siguen siendo decisiones docentes; las observaciones reales incorporan competencias al alcance. Historial y textos no se borran por retirar botones. Los conteos, alcance de actividad sin evidencia y huellas de contexto sí requieren revisión al cambiar el modelo. No automatizar niveles ni cierres de período. | period-evaluation-service.mjs:93; pruebas de período e integración |

## Reproducciones ejecutadas

Harness .local/auditoria-actividad-sin-ciclo-20261022/reproduce.mjs, usando funciones reales, con ocho aserciones y salida reproducciones.json:

- planned sin evidencia: Calendario Confirmada, mapa planned, permite marcar no realizada.
- active sin evidencia: Calendario En curso, mapa planned, ya no permite marcar no realizada.
- completed sin evidencia: mapa completed.
- observación asociada: el mapa puede contar trabajo aunque no haya cierre; no implica que toda la actividad se realizó ni asigna nivel.
- set_step sin estado active: rechazo.
- estado active después del horario: acción close_block.

Estas reproducciones verifican contratos actuales; no certifican la futura implementación sin ciclo.

## Ruta mínima propuesta para aplicar la decisión

1. Abrir/leer/navegar momentos no escribe ejecución pedagógica. Si se conserva el último momento, tratarlo como progreso de lectura separado de realización.
2. Retirar inicio y cierre de la guía cotidiana junto con sus dependencias; observaciones libres/guiadas usan el guardado canónico existente. Elegir taller permanece independiente al final de Hoy.
3. Unificar etiquetas y proyecciones de Calendario, Mi año, talleres y revisión: distinguir actividad prevista, observaciones registradas y ausencia de registros. No afirmar realizada/no realizada por abrir, avanzar o pasar la fecha. Una actividad sin observaciones queda sin constancia, no se clasifica automáticamente como no realizada.
4. Conservar registros históricos de ejecución y cierres anteriores; permisos/RLS, contexto nominal, fechas previstas/reales de observaciones y protecciones de trabajo real permanecen. No migrar históricos a supuestas realizaciones ni borrar logs.
5. Ajustar alcance y fechas de Evaluar/Word sin inventar trabajo sin evidencia; notas, conclusiones e informes conservan confirmaciones docentes y huellas. El cierre del período/año es distinto del cierre de una actividad y no se elimina.
6. Probar verticalmente hoy/otra fecha/recarga/cambio de día/observación/corrección/evaluación/reprogramación antes de publicar, con compatibilidad para históricos y rollback.

El único dato que el sistema no puede deducir automáticamente es si se realizó una actividad sin dejar ninguna constancia. No resolverlo con una confirmación obligatoria nueva, ya que contradice el objetivo cotidiano solicitado; mostrar la ausencia de constancia con lenguaje preciso.

## Validación y límites

Primera batería: 65 pruebas PASS en nueve archivos: activity-runner, activity-today-execution, daily-state, school-calendar-service, school-calendar-navigation, ordinary-observation-service, period-assessment-closure, workshop-library-service y document-library-service. Prueban comportamiento vigente, propiedad y consistencia, no un modelo nuevo.

Segunda batería: 56 pruebas PASS en project-slot-replacement, integrated-period-workflow y period-evaluation. Total: 121 pruebas PASS, cero fallos, más las ocho aserciones de reproducción. Incluye cambio de contexto trabajado sin nuevas observaciones, notas/conclusiones, informes, versiones, aislamiento y protección de reemplazos.

Solo código/pruebas locales y bases PGlite aisladas; sin conexión de escritura a QA, sin IA real ni despliegue. No se repiten typecheck/lint/build porque esta revisión no modifica código fuente. Las verificaciones de la implementación visual anterior siguen documentadas en QA_HOY_SIMPLE_2026-10-22.md.


Actualización posterior: objetivo completo implementado y publicado solo en QA en 63ea015. Esta entrada conserva el estado histórico del análisis/prototipo; consultar QA_ACTIVIDAD_SIN_CICLO_2026-10-22.md para el resultado vigente y sus comprobaciones.
