# Recomendaciones para decidir mañana, sin implementación

No se hicieron arreglos ni despliegues. El producto no está validado para entregar a una profesora nueva el ciclo anual completo: falla antes de crear su primer proyecto. Las siguientes son decisiones propuestas, no un rediseño realizado.

## Las 10 cosas que corregiría antes del piloto

| Orden | Decisión / alcance mínimo | Criterio de aceptación |
| --- | --- | --- |
| 1 | H08: contrato del plan editable frente a calendario derivado | Docente nueva genera, refresca, edita, guarda y confirma; plan activo y proyecto accesible; no pérdida de versiones |
| 2 | H09/H10: cerrar ruta actividad/taller/observación cotidiana | Un taller independiente cuando corresponda y una observación del día llegan a criterio/período correcto, sin mezclar diagnóstico |
| 3 | H12: aplicabilidad curricular en toda descarga | Con flags desactivados, religión/L2 no aparecen como áreas pendientes ni en tablas; con flags activos y contexto válido sí |
| 4 | H13: historia reciente/contradictoria en resumen nominal | Valeria conserva línea base + avance; Bruno dos contextos; no se seleccionan solo primeras notas ni se inventa un nivel |
| 5 | H14/H11/H16: fidelidad de versión y unidad del documento | Preview permite revisar alcance real; prioridades identificadas por versión; fechas Lima; notas únicas vs asociaciones explícitas |
| 6 | H07: transportar intereses familiares anónimos | Naturaleza 11/15 aparece en propuesta automática cuando pertinente y se mantiene como contexto, no como evidencia de competencia |
| 7 | H03/H04: falsos positivos de privacidad y calibración Jev | Nota no identificable «para mamá» tratada según política aprobada; identidad explícita evaluada; muestra nueva ciega; no bajar umbral global a ciegas |
| 8 | H05/H19: observabilidad y costos recuperables | ID seguro de operación/documento/observación, probabilidades/abstención, intento/costo/latencia; export-import incluye ledger y remapea docente |
| 9 | H17: definir y verificar documentos finales del piloto | Informe de progreso/familia disponible en formato acordado y coincide con evaluación confirmada; SIAGIE no se promete sin formato validado |
| 10 | H01/H15/H18: recuperación y controles de prueba | Salida de entrevista no pierde texto sin aviso; tabla anual usable en celular; tests con reloj controlado y regresión de recorrido real |

Antes de un piloto completo también se necesita demostrar la seguridad en las cuentas nuevas que exige el proyecto: servidor autorizado por docente, RLS ejecutada en Supabase, evidencia privada y límites de IA. Los tests locales de autenticación no certifican el despliegue; no se reutilizaron cuentas existentes ni se hizo conexión de producción.

## Secuencia propuesta de verificación, no de grandes cambios

Primero resolver la ruta vertical del plan y repetir desde una docente sin datos. No tocar varios módulos a la vez para obtener resultados indistinguibles. Mantener el fixture y compararlo con una segunda muestra independiente; no reutilizar las 24 notas como único benchmark de ajuste.

Después recorrer un proyecto y un taller con dos actividades reales por UI, criterios confirmados y evidencia distribuida. Cerrar P1 con valoración docente, comprobar conclusiones/familias/consolidado matemático, y recién continuar reajustes/P2/P3/P4. Conservar versiones para probar frescura y evolución en vez de sobrescribir la historia.

El criterio de suficiencia no debe convertirse en un umbral universal de número de registros: una observación sustantiva puede sostener un juicio, varias ambiguas no. Mantener «sin evidencia» distinto de C, interés familiar distinto de actuación observada y recomendación de IA distinta de evaluación final.

## Costos y límites comerciales

No usar los US$0.0874 de este recorrido parcial para prometer un año. Los escenarios US$3.41/7.32/17.28 son sobres hipotéticos de API para 15 alumnos, no costos operativos comprobados. Medir todas las etapas tras el desbloqueo, incluyendo reintentos, audio y regeneración, antes de fijar un precio. Conservar el costo informado por gateway separado del cálculo tarifario.

## Rollback de un futuro arreglo

Identificar commit y pruebas de cada cambio; preservar borradores/versiones y datos confirmados; revertir código si falla, no borrar historia pedagógica para conseguir PASS. Migraciones ya aplicadas no se editan: nueva migración y validación separada. Publicación requiere solicitud expresa, commit identificable, árbol limpio, staging y smoke test; nada de eso se efectuó esta noche.

## Condiciones para declarar listo el piloto

Recorrido por UI nuevo completado; todos los eslabones críticos de la matriz demostrados con datos; sin BLOCKER/CRITICAL pendientes; tipos/lint/build y regresiones pasando; documentos renderizados y revisados; prueba de voz ficticia controlada; seguridad real autorizada; costos conciliados. Mientras falte lo bloqueado, el estado es «auditoría cerrada con pendientes», no «sistema anual listo».
