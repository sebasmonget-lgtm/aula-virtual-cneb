# Mi año: mapa anual — QA local (2026-10-01)

## Alcance

La vista principal es un mapa horizontal de marzo a diciembre; lista como alternativa. Se usan `annual_preplan_v1`, fechas de `project_slots` o propuesta guardada, bloques del calendario anual y feriados efectivos del aula. No hubo migración ni llamada a IA para este cambio. Las pruebas de navegador usaron una base local aislada con una docente y doce propuestas ficticias; no son datos de estudiantes reales.

## Comprobaciones

- Doce propuestas aparecen sin superposición sobre fechas del calendario 2026. Los bloques de gestión quedan en sus tramos con borde marcado, calendario y «Sin clases»; el planificador impide colocar proyectos sobre ellos.
- Semana Santa, Fiestas Patrias y 8–9 de diciembre aparecen agrupados como marcadores pequeños. Clic en Fiestas Patrias expandió fecha y motivo; el botón conserva nombre accesible.
- Seleccionar «Las plantas crecen con cuidado» cambió la tarjeta inferior al mismo proyecto.
- «Reorganizar» creó versión 2 en borrador dejando la versión 1 vigente. Mover cambió el orden y las fechas del borrador. Retirar llevó una propuesta a la bandeja; reincorporar la ubicó al final. Guardar y recargar conservó el orden. Retirar y guardar conservó la propuesta en la bandeja tras recarga; sustituirla por una propuesta de la bandeja actualizó mapa y bandeja.
- Al volver a la versión 1, «Las plantas crecen con cuidado» conservó el tercer lugar original. La lista de esa versión mostró doce filas en el mismo orden y con las mismas fechas del mapa.
- `node --test src/lib/annual-year-map.test.mjs src/lib/annual-plan-hardening.test.mjs src/lib/annual-personalization-service.test.mjs`: 25 pruebas pasaron. `npx tsc --noEmit`, `npm run lint` y `npm run build`: pasaron.

## Límites

El mapa prioriza mostrar los diez meses a la vez. En ventanas estrechas ofrece desplazamiento horizontal y títulos cortos; el nombre completo y los datos críticos están en la tarjeta inferior y en el nombre accesible del bloque. La incorporación al final se rechaza con mensaje si ya no hay espacio lectivo; la sustitución de una posición existente permanece disponible. No se ejecutó confirmación ni generación Word en esta QA visual, ni despliegue externo.
