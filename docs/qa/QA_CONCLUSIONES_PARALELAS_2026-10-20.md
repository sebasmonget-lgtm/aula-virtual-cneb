# Conclusiones, informes y colores de valoración · 20/10/2026

## Recorrido

La evaluación muestra arriba un acceso visible a Conclusiones descriptivas. Se puede preparar antes de completar las notas: Cancelar recibe el foco y Continuar permanece deshabilitado cinco segundos. El servidor exige `acknowledgeIncomplete` y selecciona exclusivamente valoraciones docentes confirmadas y vigentes. No completa ni modifica notas pendientes.

Informe a familias sigue requiriendo todas las notas y conclusiones actuales de los pares con fuentes, sin exigir cierre formal. Si solo faltan conclusiones, presenta directamente su preparación y guardado. Sin evidencia no se exige inventar una nota.

Las conclusiones tienen cuatro recuadros que filtran: Preparadas, Por revisar, Listas para guardar y Guardadas; diez textos por página, identidad compacta de competencia y barra de guardado visible. Guardada significa escritura canónica por una acción docente; preparar no confirma conclusiones ni informes. Una conclusión guardada no vuelve a contarse como pendiente de revisión.

## Paralelismo y recuperación

Cada POST de avance ejecuta hasta doce conclusiones o seis informes simultáneos, con un único escritor de checkpoints y un contexto de aula compartido por grupo. Los grupos HTTP avanzan secuencialmente. Cada tarea se identifica por niño y competencia (o informe), mantiene su snapshot y se excluye cuando ya tiene resultado. La adquisición de lease conserva el bloqueo del período y la comprobación de fuentes; el guardado canónico vuelve a validar revisión, fuentes y apertura. GET concilia respuestas interrumpidas; no hay tareas huérfanas ni reintentos ciegos de llamadas inciertas.

Un fallo no elimina resultados independientes. Se reutiliza la recuperación acotada del análisis: una regeneración automática de respuesta recibida inválida; cuota, autenticación, límite, timeout o conflicto requieren recuperación explícita. Las respuestas ya guardadas no se vuelven a pedir al proveedor.

## Advertencias y notas en informes

Se elimina el criterio automático de menos de tres registros para conclusiones e informes. Una valoración suficiente ya revisada y sustentada por la docente puede producir una conclusión lista para guardar. La información declarada insuficiente sigue dando una advertencia concreta. No se impone una proporción artificial de aprobaciones. Se recalculan estos avisos al leer lotes antiguos, sin reescribir sus textos.

El prompt de conclusión solicita un párrafo sencillo de unas 30–70 palabras, sin Markdown ni repetición del nombre oficial completo; el rango orienta, no rechaza respuestas por conteo. Se mantienen las validaciones de identidad, fuentes, información insuficiente y ausencia de notas inventadas.

El input familiar incorpora la nota exclusivamente de la valoración confirmada vinculada por `assessment_id` a cada conclusión. La IA adapta ideas para casa según esa nota y los hechos, sin cambiar ni parafrasear conclusiones canónicas, asignar niveles o inferir dificultades por una letra. La interfaz imprime la nota fuera de la prosa generada. Word ya recuperaba la valoración desde el assessment vinculado a la conclusión; se conserva esa asociación histórica.

Los borradores familiares anteriores se conservan. El botón «Actualizar ideas con las notas» permite crear otra preparación con el nuevo contexto, sin guardar ni enviar informes automáticamente. La metadata identifica nuevas recomendaciones elaboradas con notas; los textos antiguos no se presentan como regenerados.

Una misma paleta CSS sirve al selector, consolidado e informe: AD azul, A verde, B amarillo oscuro y C rojo. Las letras y descripciones siguen presentes; el color no comunica por sí solo el nivel.

## Validación y publicación

121 pruebas funcionales PASS: evaluación, conclusión, informe, contexto de IA y exportación Word; incluye carga de 120 conclusiones y diez informes, picos de 12/6 proveedores, unicidad de resultados, reanudación sin llamadas duplicadas, aceptación explícita de preparación parcial y nota vinculada en el bundle real. Son proveedores simulados: la prueba demuestra concurrencia e integridad, no una duración garantizada de OpenAI. Typecheck, lint y build Vinext PASS; el build Next de Vercel y el smoke de la entrega deben verificarse antes de mover el alias.

Revisión visual de componentes reales en escritorio y 390px: filtros, paginación, aviso con cuenta atrás/foco en Cancelar, progreso junto al informe y paleta de valoración. Detector Impeccable sin hallazgos. Recibos locales en `.local/evaluar-conclusiones-20261020`, excluidos de Git.

Baseline QA preservado: diez niños, 140 observaciones, 430 asistencias, 120 notas, 120 análisis, 120 conclusiones guardadas y diez borradores familiares preparados por la persona usuaria. Esta entrega no necesita regenerarlos, confirmar informes ni realizar llamadas pagadas. Comparar hashes de datos pedagógicos y payloads antes/después del smoke.

Sin migración ni cambios de permisos/RLS. Publicar únicamente Preview con funciones `gru1`, SHA limpio y pushed, smoke autenticado y verificación de Producción intacta. Rollback: devolver alias QA a `dpl_7SawfHsxTPpGer7RQLcnh9a5n5KH` y código `0e34c3e`; conservar datos y versiones. No revertir datos docentes.
