# Proyectos claros y dos competencias — 2026-10-25

Alcance autorizado: mejorar próximas generaciones, hasta cinco rondas reales aisladas, sin modificar el año ya creado por la usuaria. Trabajo únicamente en el checkout del generador. No hay publicación ni migración de datos.

## Cambio

Política `ayni-documents-v10`: propósito integrado centrado en los niños, justificación vinculada al contexto, invitación abierta, organización viable y ayudas concretas por competencia/edad. Observación directa, sin repetir encabezados ni convertir previsiones en logros. Continúa sin pedir diagnóstico. Se mantienen referentes oficiales y al menos dos competencias por edad/proyecto; una actividad desarrolla las competencias expresamente seleccionadas, sin imponerle una cuota distinta.

Parte de la repetición provenía del adaptador: usaba organización como justificación y apoyo de todas las competencias, y mostraba solo la primera actuación por edad. Las nuevas propuestas llevan `summary`, `rationale` y `supports` por oportunidad; el lector original recibe esos campos y las acciones de ambas competencias. La sinopsis y el propósito tienen lugares diferentes. Las filas antiguas mantienen exactamente la adaptación anterior; no se recalculan, enriquecen ni guardan al abrirlas. Word añade los nuevos apartados solo si ya existen en el documento guardado.

El esquema de generación de documentos acota la extensión por campo. Las oportunidades cotidianas cubren únicamente pares competencia/edad ausentes del recorrido. La petición anual envía instrucciones una vez, fuera del contexto de datos. El contrato diario mantiene su esquema anterior. En nuevas actualizaciones, los tramos protegidos por proyectos preparados o periodos cerrados se recuperan íntegros del original autorizado antes de validar; la comprobación de conservación al guardar sigue vigente.

## Evidencia

Rondas en bases nuevas en memoria, siempre con datos ficticios, una llamada por ronda y ningún plan guardado. El servidor de la usuaria no recibe las pruebas.

1. v8, tres proyectos: integración, agua y relatos. Pasan campos distintos, acciones por edad, dos competencias y referentes; revisión detecta observaciones verbosas y turnos fijos por edad.
2. v9, los mismos tres casos: observaciones directas, ayudas específicas y agrupamientos flexibles; pasan las comprobaciones estructurales.
3. v9, año completo: timeout del proveedor a los 300 segundos. No se acepta salida ni se guarda un año. Motivó acotar campos, evitar oportunidades cotidianas redundantes y quitar instrucciones duplicadas.
4. v9, actividad del primer proyecto de la segunda ronda: identidad y convivencia, tres edades, acciones en inicio/desarrollo/cierre y criterios diferentes de sus evidencias. Referentes validados. 45.6 segundos.
5. v10, año completo con campos acotados y petición sin instrucciones repetidas: vuelve a alcanzar el timeout de 300 segundos, sin salida aceptada ni año guardado. No se hacen más llamadas.

Recibos y textos: `output/generador-documentos/prompts-claros/round-01` a `round-05`. Cinco rondas reales realizadas, tres respuestas completas y dos timeouts. No se presenta una validación anual completa como aprobada. Tras agotar esas rondas, el timeout del año del generador pasa a 600 segundos y su reserva durable a 660; la modalidad diaria conserva 300/360 y otras tareas sus límites. No se cambia modelo ni se reintenta automáticamente una llamada incierta. Pruebas sin proveedor verifican ambos plazos y la reserva efectiva del año documental; el plazo ampliado no se probó con una sexta llamada real. Queda esa limitación de validación.

Pruebas funcionales del generador: 27 PASS. Regresión anual, persistencia, permisos y conservación de proyectos: 36 PASS. Los nuevos casos verifican lectura antigua idéntica, resúmenes con ambas competencias, rechazo de apoyo ausente, compatibilidad de filas mixtas, Word y conservación exacta de un tramo preparado al proponer con política nueva.

Tipos, lint y build completados con salida 0; advertencias anteriores de hooks, PGlite, tamaño de chunks y clasificación vinext. Verificación HTTP 200 de página y manifest después de reiniciar. El año existente `4743a0f6-8129-4396-85bb-a75cdc5b8040`, versión 1/revisión 2 activa, sus textos/contexto, matrícula, proyectos y actividades conservan el mismo SHA-256 antes/después: `926ae8be77148f9b60f37ed613af14ee99990d01ad75ea8ae385a3b95c2abdc4`. Recibo mínimo: `output/generador-documentos/prompts-claros/preservation.json`. UI abierta muestra el año anterior, sin aplicar cambios editoriales retrospectivos. Cero trabajos creados por estas pruebas en el almacén de la usuaria.

Metodología: casos representativos y revisión de resultados, conforme a la [documentación oficial de OpenAI sobre prompts](https://developers.openai.com/api/docs/guides/prompt-engineering). No se cambian modelos ni permisos cloud.

## Rollback

No borrar ni transformar documentos. Para revertir futuras generaciones, restaurar las reglas previas y seleccionar el esquema anual anterior en la generación, manteniendo lectores/validadores compatibles con los campos nuevos que pudieran haberse guardado. Conservar la protección de proyectos y el historial. Los datos actuales de la usuaria permanecen en `generador-prueba-chat-20261025`.
