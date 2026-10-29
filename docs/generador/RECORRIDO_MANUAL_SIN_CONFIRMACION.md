# Recorrido manual del generador sin confirmación — 25 de octubre de 2026

## Criterio y cambio

Petición: probar con clics el recorrido completo y retirar «Revisar y confirmar Mi año». Crear o actualizar Mi año es la acción de guardado del generador; no existe una aprobación adicional en su interfaz. Se conservan validadores de servidor, propiedad, fuentes, versiones, recibos y Word históricos. La aceptación no evalúa niños ni crea observaciones o niveles.

V2 usa `/document-year/use`: guarda y activa el resultado propio de la cola con recibos determinísticos, recupera borradores anteriores y conserva el año previo. La UI aplica el resultado al terminar y permite reintentar solo el guardado si falla, sin volver a consumir IA. V1 de una edad reutiliza la operación original de confirmación de planificación al terminar; el modo diario mantiene su revisión explícita. El generador no muestra el resumen diagnóstico ni sus pasos en el chat/carga.

## Prueba con clics: multiedad

Almacén nuevo `generador-qa-clicks-sin-confirmar`, asistencia simulada para probar navegación sin consumir IA. **No se crearon colegio, niños, conversación, años, proyectos o actividades por API ni scripts de semillas.** Todas esas acciones se hicieron con controles de la aplicación en el navegador.

1. Preparar mis documentos → Unidocencia → colegio ficticio, profesora, sección, edades 3/4/5 y logo de iniciales → Guardar aula.
2. Tres alumnos ficticios, uno por edad, mediante el formulario → Conversar con Ayni. Se probó una sugerencia del chat y el envío de mensajes.
3. Crear Mi año → carga visible → mapa guardado automáticamente, sin botón Revisar/Confirmar.
4. Filtros de bimestre, detalle original y volver. Quitar/reponer un día del calendario: el contador cambió 8 → 7 → 8; días sin clase deshabilitados.
5. Primer proyecto, ocho días: ocho actividades listas. Descarga del proyecto y de una actividad Word.
6. Segundo proyecto en otro bimestre, diez días: se inició sin reconfirmar el año. Se navegó a Documentos durante la preparación. Ambos proyectos terminaron con 18 actividades en total.
7. Carpetas → año → plan anual → lectura y descarga. Los formatos se probaron con bimestre y mes; informe individual para una alumna y siete formatos del grupo descargados con sus botones.
8. Biblioteca 3/4/5: búsqueda sin resultados y recuperación; catálogo distinto por edad; tres guías Word y dos PDF descargados.
9. Nuevo contexto en el chat → actualizar el año → dos proyectos y sus 18 actividades conservados. Abrir proyecto y Documentos siguió mostrando los archivos originales. Lectores de proyecto/actividad y criterios de 3/4/5 abiertos desde el índice.
10. Recarga de la página: Mi año sigue guardado, sin pedir confirmación.

16 descargas completadas con eventos reales del navegador: año, proyecto, actividad, siete formatos de aula, informe individual, tres guías de taller y dos PDF. La descarga confirma recepción del archivo, no sustituye la inspección de cada página en Microsoft Word. La calidad pedagógica de una simulación no se presenta como generación real personalizada.

## Problemas encontrados y corregidos con este recorrido

- El año requería guardar/revisar/confirmar: ahora se aplica al terminar de crear, conservando historial.
- Preparar proyecto tenía dos botones sucesivos con el mismo nombre: el calendario abre directamente al elegir un proyecto nuevo.
- Cambiar bimestre dejaba seleccionado un proyecto del anterior: ahora selecciona uno del bimestre mostrado.
- Volver desde el proyecto regresaba al chat por el estado de entrada inicial: ahora vuelve al mapa y conserva la selección.
- Mi año no mostraba cuántos proyectos se habían desarrollado: contador actualizado y «Abrir proyecto» para los guardados.
- La vista previa repetía 3 años y omitía 5 por el límite de tres acciones: muestra un resumen por edad; el detalle conserva todas las oportunidades.
- Ver en Documentos abría formatos: abre primero los planes guardados cuando existen. El proyecto precede a las actividades en su carpeta.
- El lector V2 enviaba situación/mediación a campos que el lector original no consumía: adaptados desde el contenido ya guardado, sin generar o reescribir el Word.
- Después de actualizar el año, un proyecto ya completo ofrecía preparar cero días: se ocultó esa acción.

## Otra modalidad y entrega

Prueba adicional, también con formularios y clics, en `generador-qa-clicks-una-edad-real`: aula de cuatro años y una alumna ficticia → chat real → Crear Mi año → quince proyectos y Word anual guardados sin confirmación adicional. Se eligieron únicamente dos días de un proyecto para limitar el consumo; el maestro y las dos actividades reales terminaron y se abrieron/descargaron sus tres Word. La cola aceptada se recuperó tras reiniciar el servidor, sin solicitar otra generación del año.

Esta prueba encontró que el procesador local original estaba desactivado globalmente al habilitar la integración multiedad. Se habilitó solo para el aula V1 local y con filtro de la identidad local al reclamar trabajos. La prueba de cola verifica que otra identidad deja el trabajo intacto. El modo V2 conserva su coordinador propio. También se ocultaron accesos a Hoy y captura de observaciones en el lector del generador; los defaults diarios se conservan.

La generación real volvió transitoriamente al chat porque conservaba `mode=conversation`; el guardado ahora limpia esa entrada. Abrir Mi año y volver desde Documentos recuperó el mapa sin confirmaciones. Se ocultaron los botones técnicos de versión estable/sincronización en el generador.

La fase real registró seis eventos de uso, USD 0.243177875 estimados; no factura. Un año, un proyecto y dos actividades reales, además de la conversación. Cero datos del almacén del usuario enviados en esta prueba. Cuatro descargas reales adicionales: total **20 descargas por clic** entre las dos modalidades.

Gates: 24 pruebas del generador, 20 de regresión anual y 10 de cola/preparación originales PASS; tsc, lint y build con salida cero en sus últimas ejecuciones. Advertencias previas de efecto diagnóstico/PGlite/chunks/vinext conservadas. La validación funcional principal es el recorrido del navegador anterior, no una sustitución por llamadas directas a servicios.

Recibo de conteos/consumo, leído al cerrar las bases de QA: `output/generador-documentos/clicks-sin-confirmar/receipt.json`. No contiene claves, tokens ni conversaciones de usuarios.

Evidencias de navegador: `output/generador-documentos/clicks-sin-confirmar/`. El almacén de usuario es `generador-prueba-limpia` y no recibe estos proyectos de QA. Todo sigue local y separado del Ayni original; sin publicación, commit ni push.


## Rollback

Solo en la variante `codex/ayni-documentos-pruebas`. Retirar los adaptadores de guardado automático y banderas de presentación restaura la revisión del año; conservar los planes/recibos y los lectores para descargar las versiones ya guardadas. El filtro de identidad del procesador local y las guardas de servidor se mantienen. No borrar almacenes ni reescribir documentos confirmados. No se modificó el checkout original ni se aplicaron migraciones.

## Estado final del preview del usuario

Restaurado en 5185/API 8805, IA real, almacén generador-prueba-limpia. Cuatro alumnos conservados; cero proyectos/actividades de QA. Al abrir Mi año se recuperó el borrador anterior sin pedir confirmación: versión 2 activa, versión 1 archivada y descargable. No se crearon más versiones ni se hicieron llamadas de IA para esta recuperación. Captura 12 muestra el aula real de prueba sin los controles eliminados. Últimos typecheck, lint y build terminaron con salida cero; advertencias previas conservadas. La pestaña entregada queda en Mi año.
