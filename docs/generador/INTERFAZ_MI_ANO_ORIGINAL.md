# Mi año: conservar la interfaz de Ayni

La usuaria señaló que el año aparecía de inmediato y que la variante se había desordenado. La revisión encontró una versión confirmada sin `document_context.generation_job_id`, procedente del ejemplo editorial, y una generación real distinta en curso. No se inició otra generación, se cambió la modalidad ni se alteró la versión confirmada para resolver la presentación.

## Corrección del recorrido

La adaptación de datos multiedad ahora reutiliza los componentes originales `AnnualCompactTimeline`, `AnnualProjectPreview`, `MultiAgeConversation` (burbujas y estilos del chat original), `AyniMascot`, `AnnualPreparationProgress`, `PageIntro`, `LoadingState` y `WorkflowFeedback`. No se añade una hoja de estilos ni se cambian paleta o tipografía.

- Sin un año guardado, Mi año abre la conversación y **Crear Mi año**. El fixture editorial ya no aparece como año creado o borrador implícito.
- La consulta de trabajos guardados se resuelve antes de habilitar el botón de generación. Un error de consulta ofrece actualización y no habilita otro envío a ciegas.
- Durante una tarea en cola o en ejecución, la misma pantalla de preparación del Ayni original ocupa el contenido principal; la línea de tiempo, el chat y los editores no compiten con ella.
- Se omiten en esa pantalla los pasos de familias/observación/revisión mediante una prop opcional; el componente original conserva esos pasos por defecto para el recorrido cotidiano.
- El anillo es un avance **estimado** del componente original. La finalización se toma exclusivamente del estado guardado `ready`; el porcentaje visual no confirma ni reemplaza el resultado de la IA.
- Una respuesta lista ofrece **Revisar Mi año** y no guarda o confirma automáticamente. Una versión manual anterior queda identificada como tal.
- Las tarjetas muestran el proyecto con pictograma, fechas, propósito, acciones por edad y competencias. Los campos editables quedan dentro de **Ver detalle y ajustar la propuesta**.
- **Preparar proyecto** abre su propio paso y **Volver a Mi año** conserva el recorrido. En el generador no se muestran formularios de actividad prellenados antes de recibir/revisar una propuesta; el recorrido cotidiano mantiene su comportamiento.

La preparación real existente terminó correctamente en un intento mientras se hacía este ajuste. Se abrió para consulta, sin guardarla ni confirmarla. La proyección conserva los tramos que ya tienen actividades y usa la nueva propuesta en los restantes, sin mutar el resultado guardado del proveedor.

## Validación y alcance

16 pruebas PASS: contratos y API del generador, separación del inicio limpio, exclusión del ejemplo implícito, distinción de origen manual/preparado y conservación de proyectos protegidos al revisar una propuesta. Tipos, lint y build correctos con avisos anteriores. Detector Impeccable sin hallazgos en los componentes cambiados.

Navegador: revisión del resultado real, tarjeta del segundo proyecto, detalle cerrado por defecto, escritorio 1440×900 y móvil emulado 390×844 sin desborde de página. Se comprobó que Preparar proyecto navega a su paso sin mostrar campos de confirmación anticipados. Consola sin errores nuevos después de una recarga limpia; las advertencias de dependencias de hooks durante la recarga de desarrollo se resolvieron al remontar. Evidencia en `output/generador-documentos/interfaz-original/`.

La tarea real ya había terminado al cerrar la validación visual; no se consumió otra llamada para obtener una captura en curso. El indicador original se renderizó con un estado ficticio aislado en una ruta temporal de QA, comprobando escritorio/móvil, etapas y mensaje en curso. Esa ruta se retiró al terminar; no es otra preparación ni una respuesta real. El indicador se adapta al estado consultado de la tarea. Esta revisión no acredita cada posible respuesta pedagógica ni una comparación de todos los módulos con el Ayni original.

Se conservaron cuatro alumnos, la versión anual activa, una actividad y tres documentos existentes. El trabajo real continúa guardado para revisión. No hay migración, cambio de autorización, nueva llamada de IA ni publicación; la carpeta original de Ayni no se editó. Rollback: revertir solo la adaptación de interfaz de esta revisión, conservando datos y trabajos de la base.
