# Botón en el chat y preparación de actividades — 2026-10-27

Petición: ofrecer Generar Mi año/Generar proyecto cuando haya contexto suficiente, conservando la posibilidad de conversar; extender a actividades la protección de las respuestas largas. Solo variante local. Sin migraciones, despliegue ni cambios al checkout original.

## Cambio mínimo y datos

La misma respuesta estructurada del chat documental añade `ready_to_generate`. Se calcula con todo el contexto y las reglas existentes de suficiencia, o al pedir expresamente continuar con lo disponible. No hay clasificador ni llamada adicional. El dato se guarda en el resultado privado existente del turno y se lee como `readyToGenerate`. El contrato cotidiano conserva sus dos campos originales. La versión conversacional es `ayni-documents-chat-v25`; la política de generación sigue v24 para conservar la posibilidad de retomar trabajos existentes.

Mi año coloca su único control durable en el pie del chat mediante un portal; el controlador permanece montado al pasar a la pantalla de progreso. El proyecto ofrece Generar proyecto dentro del chat y luego permite elegir días con el calendario original. El compositor permanece disponible. Si hay un mensaje sin enviar o una respuesta en curso, la generación se deshabilita para no omitir ese contexto. Los turnos históricos se leen sin reescribirlos: una invitación explícita sin sugerencias permite continuar; un año ya guardado acredita contexto anterior suficiente, salvo que un nuevo turno estructurado indique lo contrario. No se regenera automáticamente.

La propiedad visual de suficiencia no otorga permisos. Servidor, docente, aula, versión del año, snapshot del chat y comprobaciones curriculares siguen controlando las operaciones.

## Fallo de actividades y prevención

La tarea real estaba detenida después de la actividad 1, con un lote de cinco fallido y código genérico. El intento original no conservó su objeto de respuesta ni la excepción detallada; no puede afirmarse qué IDs devolvió originalmente. Una nueva llamada con la misma tarea en copia privada reprodujo el rechazo: tres variantes de indagación devolvieron otros referentes oficiales de la misma competencia y edad, distintos de los fijados por el maestro. La validación actuó correctamente y no guardó ese lote.

El esquema de generación documental se limita ahora al maestro guardado: cada alternativa fija competencia, edad y conjunto de referentes admitidos. Se aplica a actividades individuales posteriores y lotes. No se sustituyen IDs en resultados generados ni se relaja la validación de igualdad con el proyecto. La respuesta se valida completa antes de guardar. Un nuevo error de herencia utiliza un código conocido y un mensaje recuperable, sin registrar contenido ni excepciones arbitrarias.

El transporte con streaming interno y espera de la respuesta final se extiende del año documental a actividades y lotes documentales. `store:false`, cero reintentos automáticos y límites acotados; actividades documentales tienen hasta 300 segundos, año 600. El modo cotidiano conserva sus plazos. Un límite mayor no introduce una espera obligatoria ni elimina fallos de servicio o de contenido.

## Pruebas reales y recuperación

Cuatro llamadas reales en copia privada: reproducción del lote, lote corregido de cinco, lote final de cuatro y una respuesta de chat de proyecto. El primer lote tardó 71,8 s y el corregido 70,8 s; no es un benchmark general, pero no mostró un aumento apreciable. El chat de aprobación devolvió `ready_to_generate:true`, sin sugerencias, en 7,9 s. Los chats reales del usuario no se reescribieron.

La copia completó las diez actividades. Los dos resultados válidos se aplicaron al almacén activo por reintento explícito, cola, validadores y escritores existentes, cotejando esquema y contexto exactos. Cero llamadas pagadas adicionales al recuperarlos. No se escribió ready manualmente. Comparación exacta antes/después de todos los estudiantes, planes anuales, turnos conversacionales y maestros; todas las actividades anteriores permanecen idénticas. Se añadieron únicamente las nueve pendientes de P02. La interfaz activa muestra cuatro estudiantes y diez actividades del proyecto.

Recibos privados: `.local/chat-ready-v25-preservation.json`, `chat-ready-v25-clone-complete.json`, `chat-ready-v25-downloads.json`. El respaldo anterior está en `.local/backups/chat-ready-v25-20261027`. Ni las claves ni archivos de configuración se copiaron a los resultados.

## Validación y límites

Pruebas de suficiencia estructurada e histórica, conversación posterior a estar lista, esquema restringido por maestro, rechazo de referentes ajenos, preparación durable, conservación, autorización, Word y transporte SSE completo/incompleto. Gates y resultados finales se registran en los archivos locales `chat-ready-v25-final-tests.log`, `chat-ready-v25-types.log`, `chat-ready-v25-lint.log`, `chat-ready-v25-build.log`.

Verificación por clics en navegador de escritorio: abrir chat, botón Actualizar Mi año dentro de la conversación, escribir sin enviar, comprobar el botón de envío activo y la protección del mensaje pendiente, borrar únicamente ese borrador de prueba y abrir P02 con diez actividades listas. No se pulsó Actualizar Mi año. Capturas en `output/generador-documentos/chat-boton-disponible-v25.png` y `proyecto-diez-actividades-v25.png`. Detector de los cuatro componentes: sin hallazgos. No se declara una nueva revisión móvil ni generación de otro año. Descargas HTTP de proyecto, actividad 10 y ZIP correctas; ZIP con once Word.

La disponibilidad del botón es una valoración del contexto, no una garantía de calidad pedagógica. Continúan las validaciones y la recuperación explícita ante fallos. Streaming documentado en la [guía oficial de OpenAI](https://developers.openai.com/api/docs/guides/streaming-responses).

## Rollback

Retirar readiness/portal y volver a los controles previos; desactivar el opt-in de streaming de actividades y la especialización de su esquema si fuera necesario. Conservar turnos y resultados ya guardados; los lectores toleran la propiedad opcional en respuestas históricas. Mantener las actividades válidas añadidas: revertir código no requiere restaurar la base ni perder el año. El respaldo completo se reserva para una recuperación de datos explícita.

Cierre: 38 pruebas PASS (incluida conversación posterior a estar lista), typecheck y build PASS. Lint completo sin errores; se corrigió la importación de test que quedó sin uso al separar la versión conversacional y lint de los dieciséis archivos afectados termina sin avisos. Persiste el aviso React previo en diagnostic-generation-control. Variante activa tras reinicio local, launcher 12656; API y web HTTP 200.
