# Logo vigente y consulta documental coherente

## Cambio de logo comprobado

La usuaria prefiere un logo genérico para la demostración. Se reutiliza el pictograma escolar existente, exportado a PNG y subido por la interfaz. Carga correctamente en la aplicación y en el Word diagnóstico; no se modifica el generador de iniciales ni se usa IA para crear esta imagen.

Síntoma adicional: después de cambiar el logo, Descargar Word del anual devuelve exactamente el hash anterior, con el logo antiguo. Causa: la identidad del archivo estable considera fuente y plantilla, pero omite el logo recibido por el render. Corrección general: añadir una huella del logo, o ausencia de logo, a la revisión de render. La fuente pedagógica y los archivos anteriores permanecen inmutables. Repetir la descarga con el mismo logo reutiliza bytes; cambiarlo o retirarlo permite otro archivo. La descarga del acceso estable de proyectos vuelve a resolver el archivo vigente en servidor. Sin migración ni reemplazo de archivos históricos.

Prevención: prueba de logo A → A → B → sin logo, aislamiento entre docentes, fuente idéntica y lectura de los bytes históricos. Reversión: retirar la nueva huella y conservar los archivos ya preparados; no borrar evidencia ni fuentes.

## Seguimiento diagnóstico

Cuando no existe comentario individual opcional, el lector mostraba únicamente los nombres. El Word ya mostraba el primer y último registro distinto con procedencia, recuento y señal de extracto. Se comparte esa proyección en diagnostic-report-reading, manteniendo literalmente los hechos y comentarios confirmados. Ambos lectores muestran ahora la misma información. No se genera una recomendación ni se interpreta una competencia por palabras clave. El guardado para después refresca la lista al volver.

## Preparación pausada

La primera preparación completa del proyecto se pausa al generar actividades. Dos respuestas se conservan; al retomar por UI se guardan dos actividades y otras dos respuestas, sin repetir las primeras. Se detiene de nuevo en otra actividad. No atribuir todavía la causa a concurrencia, proveedor o contenido: el recibo anterior solo conservaba una causa genérica. Se añaden códigos privados acotados y estado HTTP para la siguiente comprobación, excluyendo texto de excepción, prompts y credenciales. El mensaje público no expone esos códigos. No hay reintentos nuevos automáticos ni cambios de límites, modelos o contenido. Los códigos se limpian al retomar para no atribuir una causa anterior a una etapa posterior.

## Validación registrada

41 pruebas documentales y diez de preparación/aislamiento PASS. Comprobación final del cambio completo: typecheck y build PASS; lint sin errores y con una advertencia histórica. La comprobación UI del nuevo archivo con logo, seguimiento y códigos privados continúa después de publicar en QA. No declarar terminado el proyecto, sus actividades ni el QA end to end por haber recuperado el diagnóstico.
