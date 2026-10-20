# Concurrencia del análisis de bimestre

## Resultado y alcance

Se aumenta de 3 a **8 análisis simultáneos por grupo**. Las fuentes comunes del aula se leen una vez por grupo y cada resultado se guarda individualmente mediante un escritor ordenado. No se cambian modelo, esfuerzo low, prompt, esquema de 30–70 palabras, permisos, cierres ni decisión docente. No se reinicia el trabajo existente ni se borran sus resultados; el formato persistido sigue siendo compatible.

No hay un número universal de llamadas que garantice ausencia de fallos. Los límites son propios de la cuenta/modelo y del tráfico compartido; la [documentación oficial de OpenAI](https://developers.openai.com/api/docs/guides/rate-limits) indica límites por peticiones/tokens y cabeceras de capacidad y recuperación. Esta prueba cubre una cuenta y carga controlada, no muchas aulas simultáneas ni todos los incidentes del proveedor.

## Cuello de botella corregido

Antes cada uno de los tres hijos volvía a ejecutar context() y loadAssessmentMasterSources(), con una conexión PostgreSQL por instancia serverless. Subir solo el número multiplicaría consultas redundantes. Ahora se comparte la preparación únicamente dentro de la petición; no se conserva una caché entre grupos. El contexto por niño conserva sus fuentes, identidad, criterios y snapshot. Al guardar se vuelven a comprobar período abierto, revisión y evidencias actuales. La exclusión mutua del período permanece.

Las llamadas al proveedor se solapan, pero guardar/checkpoint usa una cola de un escritor. Un conflicto individual no contamina la cola: los demás resultados se conservan. Si falla la lectura común, no se llama a IA y el trabajo pasa a pausa recuperable. No se añaden reintentos automáticos ni fallback que duplique gasto. Timeout del proveedor 30 s; límite de función 300 s y lease actual 210 s, sin ampliar estos topes.

## Prueba real de API

Mismo conjunto rotatorio de entradas congeladas del QA, perfil breve vigente, Luna low, sin fallback ni reintentos; doce llamadas por ronda, agrupadas según la concurrencia. Sin guardar análisis ni notas en la base cloud; solo telemetría de uso. Cabeceras de la cuenta observadas: 5.000 peticiones/minuto y 2.000.000 tokens/minuto; son lecturas de esta prueba, no compromisos ni valores fijos del producto.

| Concurrencia | Peticiones | Tiempo API de las 12 | Fallos de API/timeout | Salidas válidas |
| --- | --- | --- | --- | --- |
| 3 | 12 | 25,02 s | 0 | 12 |
| 6 | 12 | 12,36 s | 0 | 11 |
| 8 | 12 | 15,46 s | 0 | 12 |
| 12 | 12 | 5,61 s | 0 | 12 |

La ronda de seis tuvo una respuesta que no cumplió el requisito de nombre/párrafo y fue rechazada por el validador. No se atribuye causalmente a concurrencia ni se elimina el validador para hacer pasar la prueba. Los tiempos contienen variación del proveedor y caché desigual: no son una comparación estadística ni una promesa del tiempo total del bimestre. La ronda de ocho necesita dos grupos (8+4), la de doce uno. Coste incremental estimado registrado: USD 0,01299834 por 48 llamadas. Se verificó margen dentro del máximo acumulado de QA de USD 6 antes de iniciarlas.

Doce pasó la prueba del proveedor, pero se mantiene ocho como techo actual para dejar margen a persistencia, contención y otros usuarios. No se declara que nueve o doce sean inviables.

## Regresión de aplicación

57 pruebas PASS: evaluación/cierres/aislamiento, borradores, referentes, proveedor de base de datos y preparación. Nueva carga de 20 niños × 6 competencias: 120 resultados, 15 grupos, pico de ocho proveedores, un escritor, 15 lecturas de fuente común en lugar de 120, cero duplicados y cero notas confirmadas. El proveedor está simulado y la base es PGlite local: los 5,05 s de esta prueba no representan latencia real de OpenAI/Supabase.

Además, conflicto durante una de ocho escrituras conserva siete resultados y recupera solo el afectado; fallo de fuente común no genera IA ni deja ejecución bloqueada. Dedupe, trabajo ya terminado y cambios de evidencia conservan sus regresiones. Lint, TypeScript y builds Vinext/Next webpack PASS. Los cambios permanecen locales, sin commit, push ni despliegue en esta ronda. No modificar trabajos activos para medir; no resetear la cuenta QA.

## Publicación y rollback

Publicar únicamente en Preview cuando se solicite, después de commit limpio y smoke autenticado, conservando Producción. Esta ronda verifica y prepara el cambio; no modifica la Preview que está usando la profesora. Sin migración. Rollback: revertir el cambio de estas rutas y el parámetro opcional de fuentes preparadas; los trabajos y análisis guardados no necesitan conversión ni restauración.

## Estado de la cuenta QA observado al terminar

El trabajo existente 1dcc1fce-c9eb-4b25-8207-b641f8aaa9a1 estaba pausado con41/120 antes de aplicar esta versión en cloud (que no se publica en esta ronda). La carga previa es d101bb2, con tres llamadas por grupo. El payload no conserva la causa individual del fallo; no atribuir esa pausa al límite de API ni al formato por analogía con la prueba sintética. No se reintenta ni resetea el trabajo durante la medición. Observaciones y asistencias se comparan por hash y los análisis guardados se conservan.
