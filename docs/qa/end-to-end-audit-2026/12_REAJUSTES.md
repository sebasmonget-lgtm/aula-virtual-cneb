# Reajustes, gestión y cierre anual

Estado: ciclo P1→P2→P3→P4→cierre anual BLOQUEADO. No se confirmó ningún período, reajuste ni cierre del año.

Los cuatro períodos se pueden seleccionar y sus fechas encajan entre bloques de gestión. Esto demuestra calendarización y acceso, no ahorro de trabajo real en cierre/reflexión/replanificación. No hay tiempo observado de esos procesos porque los prerrequisitos nunca se alcanzaron.

## Revisión de implementación, no prueba de usuario

`bimester-replan-service.mjs` usa estadísticas/valoraciones confirmadas, recomendaciones deterministas y decisiones docentes. Diferencia niños sin evidencia de niveles B/C; requiere cierre vigente y plan activo, preserva versiones y limita cambios a propuestas futuras no desarrolladas. La confirmación copia/ajusta datos mediante código; NO es una llamada gpt-6-sol. Su etiqueta de metadata `bimester_replan` no implica IA ni costo de proveedor.

Esto corrige una posible lectura errónea del routing: no se contabiliza un modelo para el reajuste actual. Regenerar luego un documento por otro flujo tendría su propio costo y debe medirse por separado.

## Limitaciones de la simulación acelerada

El sistema mantiene el reloj real, septiembre de 2026. El código toma el mayor entre fin del período y fecha actual para elegir propuestas futuras. Aun con un plan válido, simular un reajuste P1 ocurrido en mayo desde septiembre no equivale a comprobar qué habría permitido en mayo. No se alteró el reloj ni se modificaron estados para fingir una cronología.

Las trayectorias B→A previstas en el ground truth son hipótesis de datos futuros, no evaluaciones producidas. Valeria sí tuvo una nota posterior positiva en diagnóstico y Bruno dos contextos contradictorios, pero no una historia de cuatro períodos ni cierre anual. Las pruebas posteriores deben recorrer cada período con actividad/criterio/evidencia real y comprobar que decisiones de reajuste cambian el siguiente plan conservando el histórico.

## Fuente y resultado

Los bloques oficiales de gestión están en `05_PLAN_ANUAL.md`. No se evaluó una carga humana completa en esas semanas. `period_closures`, `period_closure_versions`, `period_closure_workflows` y `classroom_period_reports` permanecen vacíos; la propuesta anual continúa draft. No existe una salida de cierre anual auditada.
