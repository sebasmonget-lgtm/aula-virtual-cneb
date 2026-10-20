# Evaluación ágil: 12 análisis, ficha y guardado

## Alcance pedido y solución

1. Probar doce análisis simultáneos y medir tiempo, fallos y duplicados. Techo12, contexto por grupo, un escritor, checkpoints y recuperación acotada existentes conservados. No se regenera el lote canónico terminado.
2. Retirar «Analizar evidencias con Ayni». La ficha muestra «Análisis de Ayni» con icono, conserva edición docente y consulta de los textos preparados; sin botón que vuelva a consumir IA.
3. Sustituir la insignia de revisión por la identidad de la competencia junto al nombre: alias, imagen existente y color, manteniendo el nombre oficial en el contexto/título accesible.
4. Referencia del bimestre anterior y guía de edad en dos columnas, apiladas en móvil. AD/A/B/C con Destacado/Esperado/En proceso/En inicio y colores; sin párrafos repetidos. Se retira la nota «Guía orientativa…» de esta ficha. Desempeños oficiales siguen desplegables; las reglas de evidencia y sustento limitado permanecen.
5. Unificar Guardar y siguiente, quitar la recarga obligatoria del resumen y precargar el siguiente expediente, sin avanzar antes del guardado canónico.

## Causas de lentitud y cambio mínimo

El flujo anterior guardaba borrador, confirmaba, recargaba el resumen de aula y luego consultaba al siguiente niño. Cada contexto repetía mantenimiento del mapa e inserciones de etiquetas; cada guardado releía roster, valoraciones, alcance y evidencias de todo el salón.

Nuevo POST save-and-confirm confirma un borrador ya preparado con el texto/nivel docente en una transacción. Conserva revisión esperada, bloqueo de período, fuentes actuales, marco curricular, historial e invalidación del informe afectado. La ruta confirm anterior mantiene su contrato estricto. Si todavía no hay borrador, el cliente lo crea primero: el recorrido habitual con análisis preparado usa una sola acción.

La revalidación consulta la misma proyección de evidencias, restringida a niño/competencia; no sustituye revisiones por caché. Aplica a las notas legadas y a observaciones ordinarias atribuidas por la docente. Contexto individual evita mantenimiento global innecesario; etiquetas generales se escriben en una operación y solo cambian si difieren. No hay aumento de conexiones del pool ni omisión de permisos/RLS.

Después del acuse canónico, el cliente actualiza esa fila y avanza sin esperar una recarga completa. Precarga un siguiente expediente, lectura con caducidad60s y claves por aula/período/niño/competencia; el servidor vuelve a validar al guardar. Un error conserva texto, selección y alumno actual. No se utiliza un guardado optimista ni un fire-and-forget de la nota. El contexto derivado conserva su actualización antes del acuse.

## Medición de 12 con IA real

Caso:10 niños ×12 competencias,260 atribuciones, las notas existentes de QA, edad5, mismo perfil Luna low sin nota ni fallback. PostgreSQL real en la conexión QA, con tablas y funciones exclusivamente temporales (pg_temp) y search_path sin public. Funciones de aplicación y guardado reales; las escrituras pedagógicas se descartan al cerrar la conexión. Solo la telemetría de IA se añade a su tabla habitual.

| Medida | Resultado |
|---|---:|
| Pico de llamadas | 12 |
| Grupos | 10 |
| Análisis terminados/guardados únicos | 120/120 |
| Tiempo, desde crear lote hasta ready | 242619ms · 4min03s |
| Llamadas de generación | 120 |
| Respuestas inválidas/fallos | 0 |
| Duplicados guardados | 0 |
| Llamadas adicionales al retomar/crear el mismo lote | 0 |
| Notas oficiales escritas en QA | 0 |
| Costo estimado | USD0,047436 |

No equivale a garantizar cuatro minutos en cualquier aula o a un cronómetro de la pantalla Vercel: se ejecutan los handlers y PostgreSQL desde el equipo, sin HTTP del navegador. La muestra mantiene el modelo de datos reducido de la prueba y copia los textos/atribuciones pertinentes; no es una réplica completa de todos los proyectos. El incremento a12 se entrega junto con la reducción de consultas: no se atribuye toda la mejora al paralelismo. No es una prueba de muchas aulas simultáneas.

Una pasada previa con12 respuestas simuladas y las revalidaciones globales tardó297680ms,3007 consultas y cero IA pagada. La pasada real optimizada realizó2167 consultas. Ambas guardaron120 pares únicos. Son evidencia del costo del guardado, no una comparación aleatoria de modelos o latencias. El modelo temporal inicial y el de producción comparten las mismas funciones de proyección/revisión.

Presupuesto estimado antes USD4,846826 y después USD4,894262, por debajo del máximo QA6. Son estimaciones del registro de uso, no factura.

## Medición del guardado

Tres pares por variante en la misma conexión PostgreSQL, tablas temporales, seis confirmaciones controladas. Se compara el handler anterior de718a9df con el nuevo; textos/niveles proporcionados por el harness, sin IA.

| Recorrido del servidor | Media | Consultas por decisión | Acciones |
|---|---:|---:|---:|
| Borrador + confirmar anterior | 11943ms | 119 | 2 |
| Guardar y siguiente atómico | 3627ms | 38 | 1 |

Reducción aproximada70% en este tramo. Ambos excluyen el refresco del contexto derivado del alumno y el HTTP/navegador; el flujo anterior excluye además la recarga de overview y del siguiente detalle. No prometer este tiempo como latencia real exacta del botón en Vercel. La precarga y actualización local eliminan esas dos esperas del recorrido moderno. Las seis notas del benchmark son temporales; no son decisiones de la cuenta QA.

## Validación, datos y entrega

84 pruebas distintas PASS: períodos, recuperación/carga120, concurrencia12/un escritor, contrato sin nota, fuente ordinaria multicompetencia y lectura acotada equivalente, conflicto/cierre y guardado atómico. Confirmar dos veces no duplica; fallo durante la transacción conserva el borrador y no confirma a medias. Lint, TypeScript y builds Vinext/Next webpack se ejecutan para la entrega y sus logs quedan en .local/evaluar-12-20261020/.

UI local real con API simulada: ningún botón de regeneración; dos referencias en escritorio y apiladas390px; radios nativos sin nota inicial, selección/guardado único, bloqueo durante envío, avance al siguiente con análisis propio y nivel vacío. Se verifica también conflicto que conserva la ficha. Detector de diseño sin incidencias. Muestras en outputs/evaluar-agil-20261020/; no confundir este harness con escrituras de evaluación cloud.

La lectura de integridad antes/después conserva10 niños,140 observaciones,430 asistencias, el mismo lote canónico ready120/120 y sus análisis; ya había dos valoraciones confirmadas por la persona usuaria y se conservan. No se reinicia la cuenta, no se reasignan notas ni se envían imágenes a IA. Publicación efectiva Preview, SHA, smoke y acuse de alias se documentan en recibos locales de entrega y respuesta final. Producción permanece fuera del alcance.

Rollback: revertir como grupo el techo12 (a8), consulta acotada/hot path y las pantallas/acción nueva. El endpoint confirm previo sigue compatible. No migraciones, cambios a artefactos históricos ni restauración de datos. La ruta nueva solo produce la misma versión canónica/historial que el contrato previo.
