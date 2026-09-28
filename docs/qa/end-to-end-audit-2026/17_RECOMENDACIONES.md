# Recomendaciones después de la continuación autorizada

## Prioridad al término de P4

1. Resolver H34 con una decisión curricular y de producto explícita: qué puede confirmar una docente cuando un par alumno–competencia tiene información insuficiente, cómo se ve en consolidado/familia y qué condición habilita el cierre. Debe conservarse distinto de C, no inventar desempeño, ser auditable y volver a probar P1–P4 con datos nuevos. Sin esa decisión, no prometer reajuste formal ni año cerrado.
2. Instrumentar H49 sin exponer datos de menores: subcódigo de rechazo del informe familiar, intento, modelo, uso y resultado final por ID opaco. Mantener validación estricta y medir tasa de reintentos antes de reparar esquema/prompt. Dos fallos P4 se recuperaron al segundo intento, pero incrementaron costo y tiempo.
3. Revalidar H44/H48 en el flujo docente ordinario: unificar la fecha de negocio visible y bloquear/invalidar recargas de detalle al cambiar alumno durante confirmación. Los workarounds QA no son funcionalidad de la profesora.
4. Para piloto, cerrar los NO PROBADOS: Word render/paginación, grabación y transcripción real con voz ficticia controlada, RLS/autorización en cuentas nuevas, privacidad de multimedia y salida de progreso/SIAGIE si se ofrecerá. Los cuatro XLSX y catorce Word inspeccionados estructuralmente no prueban esas capacidades.
5. Recalibrar costos con factura y aulas reales: 187 invocaciones, USD 1.372454652 mixtos en esta auditoría; escenario anual API **$3.75/$7.95/$18.95** (bajo/realista/intensivo) sigue hipotético. Dos timeouts sin uso no son cero; audio no se ejecutó. Ver 15.

## Prioridades posteriores a los fixes localizados

H08 y los bloqueos técnicos posteriores tienen fixes locales, regresiones y comprobación de UI documentados en 18. La suite actual H47 tiene 495/495 PASS, typecheck/lint/build PASS. No se sembraron estados pedagógicos por SQL/API ni se alteró el aula original. Las recomendaciones históricas de abajo conservan el BEFORE.

1. **Decisión pedagógica/producto H34 antes del piloto anual:** definir una resolución docente explícita y auditable para información insuficiente, su efecto en cierre/reajuste y documentos; no equipararla a C ni declarar completa una evaluación sin sustento. Contrastar requisitos vigentes de Inicial y formatos de comunicación/registro antes de cambiar la guarda formal.
2. **Jev contextual pendiente:** transportar actividad, propósito, criterio y proyecto al flujo de clasificación cuando realmente se utilice; muestra nueva predefinida, salida original vs decisión docente, privacidad y probabilidades. Las notas ordinarias con criterio confirmado no demuestran mejora del clasificador. No bajar un umbral por intuición.
3. **Seguridad de publicación:** ejecutar RLS/autorización en cuentas nuevas, probar migración adicional H47 y evidencias privadas. Local PGlite y tests de contrato no certifican live Supabase. No reutilizar cuentas existentes.
4. **Fidelidad pendiente:** renderizar los Word reales, probar voz ficticia controlada y formatos finales/SIAGIE. La lectura de ZIP/XML y Excel celda por celda no verifica paginación ni audio.
5. **Medición comercial:** conciliar cargos con proveedor, correlación segura de operación/documento e intentos; separar costo informado, cálculo tarifario y escenarios. Dos timeouts sin uso registrado conservan cargo desconocido.
6. **UX sin refactor general:** aviso al salir con entrevista no guardada, navegación ocupada H48, contexto seleccionado antes de preview y mezcla de reloj client/server H44. Corregirlos después del flujo crítico con regresión focal, no alterar historia para esconderlos.

Las muestras deliberadas permiten detectar errores y contrastar trayectorias; no equivalen a validación experta independiente, prueba con docentes reales ni benchmark poblacional. No desplegar ni confundir suite verde con año completo validado.

## Recomendaciones históricas antes del fix

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
