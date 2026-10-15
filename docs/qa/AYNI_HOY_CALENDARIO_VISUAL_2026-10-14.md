# Hoy sin actividad y Calendario escolar — Preview

## Alcance
Base ca7a4bd / producto previo 185af9d, rama codex/mi-ano-simple-preview. Hoy adopta una bienvenida cálida, asistencia opcional, ilustración original de Ayni y accesos a Mi año, consulta de actividad, Calendario y observación libre. El saludo se calcula localmente con la hora de Perú y se actualiza cada minuto y al recuperar visibilidad; no usa IA.

Calendario conserva Mes, Semana, Año, fechas, excepciones escolares y operaciones protegidas. Presenta días redondeados con colores semánticos, proyecto actual o próximo, siguiente actividad, calendario oficial y detalle del día. Los accesos reutilizan Mi año y la consulta completa existentes. No se añaden pantallas ni motores de generación.

La proyección autorizada del calendario incluye la propuesta fuente, estado de la versión anual y última ejecución. Las tarjetas próximas omiten borradores, canceladas, no trabajadas y actividades terminadas. Los días históricos conservan el proyecto que efectivamente contiene sus actividades. Sin migraciones, cambios de RLS ni mutaciones pedagógicas cloud.

## Validación ejecutada
- Typecheck independiente PASS; ESLint de fuentes PASS; Next build --webpack PASS, repetido después del ajuste final.
- 32 pruebas distintas PASS: saludo/agenda, navegación y servicio de calendario, ejecución de Hoy y observación ordinaria. Repetición final de 15 pruebas de presentación/calendario PASS tras excluir ejecuciones terminadas.
- UI aislada PGlite: 35 estudiantes ficticios; escritorio 1440×1000 y móvil 390×844, sin desbordamiento horizontal. Una ronda de inspección, ajustes y una confirmación final.
- Hoy sin actividad muestra semana de gestión, próxima propuesta y actividad reales de la fixture. Asistencia abre 35 registros y conserva la falta previa. Observación libre abre la captura nominal con búsqueda/foto, sin guardar registros adicionales.
- Hoy → Calendario, Mes → Semana → Año → Mes PASS. Tarjeta del proyecto abre annualProposal ae15ac5b-382c-42f5-a0e2-0b49a0b94836; próxima actividad abre su guía completa en consulta con fecha 19 de octubre. No se pulsó iniciar, reprogramar ni guardar durante esa navegación.
- Preparación de siete fechas exclusivamente ficticias mediante el proveedor falso existente; publicación correcta y conservación de tres actividades históricas. Cero llamadas pagadas. Se cerró una ejecución ficticia previa para probar el estado vacío de Hoy.

Capturas locales (datos ficticios):
- [Hoy escritorio](../../.local/today-calendar-20261014/today-desktop.jpg)
- [Hoy móvil](../../.local/today-calendar-20261014/today-mobile.jpg)
- [Calendario escritorio](../../.local/today-calendar-20261014/calendar-desktop.jpg)
- [Calendario móvil](../../.local/today-calendar-20261014/calendar-mobile.jpg)

## Límites y rollback
No se verificaron IA real, cámara ni dictado en cloud. La validación autenticada se hizo únicamente en la fixture; el smoke cloud no escribe datos pedagógicos. No se modificó Producción. Rollback: volver al commit previo de producto y publicar otro Preview; no hay datos que migrar ni restaurar. El recibo del despliegue se añade después de comprobar READY, SHA y smoke.
