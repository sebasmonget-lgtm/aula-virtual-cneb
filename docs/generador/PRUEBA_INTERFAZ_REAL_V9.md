# Prueba funcional real de la variante documental

Fecha: 28 de octubre de 2026. Solo variante local, sin publicación ni cambios en el checkout original.

## Resultado y alcance

Se recorrió la interfaz con un aula ficticia aislada, cuatro alumnos de 3, 4 y 5 años y una profesora. La preparación, las conversaciones, la selección de fechas, la creación y la apertura se hicieron mediante clics. Solo la configuración inicial ficticia y la recogida de exportaciones se realizaron por API. No se enviaron datos del aula docente a IA durante estas pruebas.

Se completaron siete trabajos con IA real, un intento por trabajo: conversación anual, anual, conversación del proyecto, maestro con primera actividad, lote de cuatro actividades, nueva respuesta anual y actualización del anual. Las consultas periódicas reutilizaron la respuesta del proveedor; no son nuevas creaciones. Los trabajos consumidos pueden aparecer como stale después de avanzar sus fuentes: no significa que fallaran al crearse.

El primer anual y la actualización tienen quince propuestas. La actualización conserva exactamente las seis fuentes del proyecto y sus cinco actividades. El proyecto trabaja identidad, convivencia, comunicación y motricidad. La secuencia real fue:

1. Planificar el proyecto con los niños y construir el panel de preguntas, acciones y materiales.
2. Elegir dónde jugar e invitar a un compañero.
3. Retomar las invitaciones e inventar un juego corporal compartido.
4. Probar cómo compartir espacio entre propuestas diferentes.
5. Volver al plan, mostrar lo probado y decidir qué mantener o cambiar.

Se verificaron botones de generar junto al chat editable, ausencia de petición de diagnóstico, días lectivos sin feriados, carga visible, recuperación tras recargar, finalización 5/5, apertura de guía, cambio de edad, Inicio/Desarrollo y referentes curriculares. El chat recibió de entrada contexto suficiente; esta prueba no demuestra que todos los diálogos breves alcancen la misma calidad.

## Fallos encontrados y cambios generales

El reloj anual tomaba updatedAt: las consultas que devolvían el trabajo a espera reiniciaban el contador y la etapa. Ahora el resumen anual expone createdAt y la presentación conserva la etapa de generación una vez iniciada. En la prueba real el contador avanzó de 1:13 a 1:52 después de recargar, y siguió hasta completar. No se cambia el indicador de Hoy ni las conversaciones ordinarias.

El primer anual guardó una organización de exactamente 2400 caracteres terminada en «: no,». Era contenido fuente incompleto, no un recorte del preview. Solo el anual documental nuevo usa schema v12 y política anual v25: orientación de 80–120 palabras, límite de 1200 caracteres y cierre de oración validado, sin cortar o reescribir respuestas. El esquema de Ayni original sigue en 2400 sin ese patrón. La nueva generación real produjo 107 palabras y 721 caracteres, con final completo. Este control comprueba forma y longitud; no certifica automáticamente toda la coherencia pedagógica.

En el proyecto nuevo una cita quedaba en la página siguiente. Intentar unir la última fila no resolvió el salto en LibreOffice. La presentación 8 coloca ahora la cita debajo del nombre de la competencia y antes de su tabla. Todas las palabras, estilos e ilustraciones se conservan. Las presentaciones anteriores no cambian. La muestra final ocupa ocho páginas en lugar de siete, evitando citas aisladas y sin reducir la letra.

## Word y ZIP

Se obtuvieron los siete Word y el ZIP del servidor. El ZIP contiene proyecto y cinco actividades, en carpetas numeradas, y su XML coincide con cada Word individual. Tras el último ajuste de paginación se volvió a exportar la muestra desde la misma función productiva sobre la fuente congelada; se comprobó que conserva todas sus palabras y se actualizó su entrada en el ZIP de QA. No se editaron las fuentes ni documentos del aula docente.

Siete documentos finales y 46 páginas renderizadas e inspeccionadas: anual 13, proyecto 8 y cinco actividades de 5 páginas. Sin texto fuera de página; cada guía conserva Inicio, Desarrollo y Cierre completos en su segunda página. Las tablas de cada actividad incluyen los cuatro nombres y edades ficticios, con observaciones y apoyos vacíos. El cierre del proyecto usa el cierre existente del maestro. El mapa anual muestra las competencias, los proyectos por edad y las oportunidades cotidianas.

No se certifica la descarga completa desde Chrome: el navegador mostró ERR_BLOCKED_BY_CLIENT al abrir el Word local y no se pudo comprobar un archivo guardado mediante su botón ZIP. No se desactivaron protecciones ni se usó otro navegador para eludir el bloqueo. Las respuestas HTTP y los archivos Word/ZIP del servidor sí se verificaron. La interfaz interna se usó para continuar la generación y la lectura.

## Regresiones y conservación

- Doce pruebas finales de API aislada una edad/multiedad, generación, reloj, organización y fidelidad Word: PASS.
- Tres pruebas de ejecución y acciones de Hoy: PASS.
- Después del último ajuste de citas, las cuatro de fidelidad volvieron a pasar.
- Typecheck: PASS. Lint completo: cero errores, un aviso previo en diagnostic-generation-control.tsx:28. Lint de los dos archivos finales de citas: PASS. Build final: PASS; se mantiene el aviso informativo de clasificación estática de vinext.
- Servidor normal de la variante restaurado con el almacén docente original de la variante; PID final 37552. Web y API locales responden; pantalla vuelve a CELESTE.
- Comparación final completa: 75 cuerpos Word idénticos, cuatro alumnos, 36 turnos en dieciséis ámbitos de chat, workspace y planes exactamente iguales al respaldo. El checkout original no se modificó.

Evidencias locales: output/generador-documentos/prueba-ui-real-v9, verification.json, capturas 05/07/08 y render-audit.json. Los snapshots privados y los logs permanecen fuera de cualquier entrega. La primera versión anual incompleta se conserva solo como evidencia interna, fuera de las muestras finales.

## Rollback

Revertir los cambios de progreso y la política anual únicamente en la variante, manteniendo lectores de todas las presentaciones guardadas. Restaurar solo el respaldo propio del almacén si una comparación detectara diferencias. No copiar el almacén ficticio sobre el docente. Ninguna migración, despliegue, commit ni push se ejecutó.
