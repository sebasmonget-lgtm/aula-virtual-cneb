# Actividades sin inicio ni cierre manual · 22 de octubre de 2026

## Resultado local

Implementado por solicitud expresa de la usuaria. Abrir una actividad, navegar momentos y volver no escribe daily_execution_logs, no acredita realización y no cambia fechas. Se retiran inicio, cierre y transición obligatoria a taller. Elegir taller permanece al final de Hoy. El último momento consultado se conserva solo en sessionStorage, separado del progreso pedagógico y con lectura SSR estable; si ese almacenamiento falla, la navegación sigue funcionando.

La guía permite guardar observaciones libres/guiadas por el servicio canónico, incluso al consultar otra actividad del proyecto vigente, sin crear ejecución ni cambiar su fecha prevista. Los proyectos pasados siguen consultables. Se conserva el contexto de alumno/actividad/criterio/momento y la fecha real de cada observación. Los cierres de período/año y las confirmaciones de notas no cambian.

## Otras pantallas e históricos

- Hoy, Calendario y Mi año comparten señales de observaciones existentes. Sin registros no significa no realizada; no se infiere realización al abrir o pasar la fecha. Realizadas/no realizadas históricas conservan su referencia explícita; un active antiguo se presenta como Registro anterior.
- El lector agregado valida la pertenencia del alumno y actividad al aula, excluye observaciones anuladas y reúne fuentes ordinarias/anteriores. No clasifica competencias ni asigna niveles.
- Talleres y revisión de período usan el mismo mapa de evaluación: observaciones atribuidas al criterio y realizaciones históricas completadas; un inicio antiguo aislado no cuenta como oportunidad realizada. La biblioteca usa una proyección de solo lectura, sin crear versiones del mapa anual.
- Reprogramación/reemplazos conservan la protección del pasado, observaciones y ejecución histórica. Leer una guía nueva no crea un bloqueo.
- Las notas anteriores se muestran en la guía y en la consulta completa. Word conserva nota docente, fecha de ejecución histórica y fechas propias de las observaciones; guardar una observación no fabrica una fecha de ejecución. Datos, notas AD/A/B/C, conclusiones, informes y logs no se migran ni borran.
- APIs antiguas de ejecución se conservan para compatibilidad; ningún componente del recorrido docente emite start/complete/set_step ni ofrece esos controles.

## Validación ejecutada

- Typecheck PASS; lint sin errores, una advertencia previa en diagnostic-generation-control.tsx:28.
- Build Vinext PASS; advertencias previas de PGlite eval/tamaño de bundle. Nuevo build después del ajuste final del lector.
- 153 pruebas distintas PASS: batería principal de 149 y cuatro de integridad/rediseño. Repeticiones focales posteriores no se suman a ese total.
- Nueva integración PGlite: consulta/reprogramación antes de observar; observación sin ejecución e idempotencia; otro día con fecha prevista intacta; conteo en calendario/mapa/revisión/talleres; Word/lectura con texto exacto; notas anteriores intactas; anulación sin borrar raw; aislamiento entre aulas y cero notas inventadas.
- Regresiones de evaluación, conclusiones, informes, exportaciones, cambios de contexto, reemplazos, propiedad y cierres formales.
- Corrección del arnés temporal de redesign-integrity: la prueba de rebase usa un reloj pedagógico de octubre 19; el reloj real ya había dejado su proyecto en el pasado. Se conserva el bloqueo correcto del producto.
- UI local de componentes reales: computadora 1440×900 y móvil 390×844; abrir, llegar al último momento sin terminar, volver, continuar y recargar conserva lectura; siguiente actividad ofrece observación sin inicio ni cambio de fecha. No se registró ejecución. Área móvil medida sin desbordamiento horizontal. Capturas en outputs/hoy-simple-20261022/Guia-sin-inicio-cierre-*.png.
- Detector Impeccable sobre los ocho componentes principales: sin hallazgos. Puente estático cloud PASS. No IA real durante estas comprobaciones.

## Publicación

Autorizada únicamente en QA. Pendiente al crear este documento: commit, checkout limpio de publicación, Preview en la base QA aislada, smoke autenticado/no autenticado, comparación de huellas y promoción del alias solo después de las comprobaciones. El recibo final se añadirá tras ejecutarlas; no acreditar publicación por el build local.

## Rollback

Restaurar el alias QA a su deployment previo o revertir el commit de código. Sin migraciones ni conversión de históricos. La posición de lectura del navegador no equivale a ejecución y puede ignorarse al volver al lector anterior. Mantener archivos y registros existentes. No cambiar Producción.


### Primer staging y corrección final

Primer Preview b40179d respondió todos los endpoints, pero la comparación detectó refresco de las dos tablas derivadas del mapa. Inspección de versiones 3→4: una entrada cambia solo actual_on y source_fingerprint; estado planned y cero evidencias intactos. La fuente es un log active de la actividad del 1 de abril que ya existía desde 2026-10-22T11:42:05Z, antes del baseline y del nuevo flujo. Las otras 64 tablas, incluidas observaciones, notas, conclusiones, informes y logs, son idénticas. Se conserva el historial de versiones; no se revierte ni se modifica ese log. Se guarda el primer baseline y se toma uno nuevo para comprobar estabilidad del staging definitivo.

Se retiró además el display_status ready_to_close y el texto Por cerrar de la compatibilidad visual; el smoke definitivo consulta también a las 15:00 para comprobar que no se solicite cierre después del horario. No se promovió el primer Preview.


## Publicación y verificación final: PASS

Código 63ea0153727b9b0310ee87f049b5fa48ca12795f (incluye b40179d), Preview dpl_7wKLPEYG4DNVRqNAAXaqC8sZgWpv: https://ayni-aula-staging-1lkv36qhd-ayni4.vercel.app. Publicado solo en https://ayni-aula-qa-20261019.vercel.app. Checkout de publicación limpio y commit identificado. 26 comprobaciones staging y 26 del alias PASS, con autenticación, rechazos sin sesión, reloj a las 09:00 y 15:00, Hoy, Calendario, Mi año, talleres, evaluación, revisión futura, informes familiares y descargas Word/Excel válidas. Producción conserva el deployment del primer baseline.

Después del refresco derivado descrito arriba, las 66 huellas del baseline final permanecen idénticas tanto tras staging y publicación como después del navegador. Permanecen 118 observaciones ordinarias vigentes, 30 valoraciones activas, 30 conclusiones, 10 informes y los tres logs anteriores: ningún inicio/cierre nuevo al recorrer las guías. No hubo IA real ni cambios de notas.

Verificación visible sobre el alias real: apertura directa, libre/guiada disponibles sin iniciar (diálogos abiertos y cerrados sin guardar), navegación hasta momento 3 sin botón de terminar, regreso/recarga/reapertura conservando lectura y navegación a la actividad 1 con Nota guardada anteriormente visible. Capturas de computadora y móvil 390×844; veredicto: flujo publicado y comprobado, sin desbordamiento horizontal nuevo observado. QA queda abierto. Evidencia: outputs/hoy-simple-20261022/QA-guia-sin-inicio-cierre.png y QA-Hoy-movil.png.

Límites: en QA se consultaron las observaciones/notas existentes y se probaron los diálogos sin añadir datos. Los guardados, anulación, idempotencia y protecciones nuevas se probaron en integración PGlite; no se hicieron fotos/audio ni pruebas en un teléfono físico. La ausencia de observaciones sigue siendo ausencia de constancia; no se interpreta como no realización.
