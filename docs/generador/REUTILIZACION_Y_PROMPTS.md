# Reutilización de Ayni y conversación para documentos — 2026-10-25

## Alcance

Solo worktree `ayni-generador-documentos`, rama `codex/ayni-documentos-pruebas`, web 5185/API 8805. No se modifica la carpeta del Ayni original ni se publica. Sin migraciones, altas públicas o nuevas llamadas a modelos de pago.

Se reutiliza `PilotSetup` con sus datos del colegio, logo privado, borrador y presentación original; el adaptador V2 cambia únicamente edades y calendario. La misma `EnrollmentWorkspace` ofrece búsqueda, tabla, fotos privadas, edición, importación CSV revisada y retiro/recuperación. La importación multiedad se hace por edad y en una transacción, con recibo y límite de matrícula. Las correcciones conservan la autorización, control de versión y motivo existentes. Los pasos visibles son 1, 2, 3; no hay entrevistas/diagnóstico como paso del generador. La matrícula conduce a la conversación.

La conversación original y V2 comparten ahora `AyniConversationSurface` y `AyniConversationComposer`, además de mensajes, mascota, estilos y estados originales. Los servicios siguen separados por contrato; no se transforma una aula V2 en una edad escalar. Mi año conserva el adaptador de timeline, tarjeta y progreso ya implementado. No se abren formularios de evaluación desde el generador.

## Prompts revisados

Política versionada `ayni-documents-v2` en `document-generator-prompts.mjs`, seleccionada por el servidor desde la modalidad guardada, nunca por un mensaje de chat.

- Conversación: pregunta de una en una por entorno/espacios, materiales, condiciones, ideas/prioridades y, solo cuando aporte algo, fechas o colaboración familiar. Usa lo ya conocido; ayuda si no hay ideas y permite continuar con lo disponible. No cierra forzosamente tras tres respuestas ni exige completar un cuestionario. No pide diagnóstico, entrevistas, observaciones, nombres, fotos, niveles ni evidencias individuales.
- Una edad: conserva el protocolo original de extracción/citas literales y contexto docente. No manda competencias sin registros como preguntas pendientes; se retira solo para documentos el cierre forzado a tres respuestas. El tamaño canónico del resumen sigue limitado a 2000 caracteres y cada respuesta a los límites existentes; no es un chat ilimitado.
- V2: el contexto de planificación aporta edades/cantidades y currículo, sin `diagnostic_groups`, `diagnostic_readings`, revisiones ni pendientes por niño. Los nombres de la matrícula no se añaden al prompt. El historial conversado se conserva.
- Año: conserva contratos curriculares, quince tramos, referentes, fechas y protección de versiones; exige variedad real de invitaciones, sin atribuir intereses ni diagnósticos inventados.
- Proyectos, actividades y lotes: propósitos y secuencias futuras, criterios y evidencias esperadas completos, sin resultados supuestos. La capa común del proveedor también usa la política de documentos, evitando instrucciones cotidianas contradictorias.

Al pulsar Crear, el servidor incorpora las respuestas docentes completadas al contexto, sin marcar cada mensaje. Esto no modifica observaciones, notas ni planes confirmados. No reincorpora una indicación que la profesora retiró previamente. Rechaza preparar mientras Ayni responde. Un borrador de mensaje sin enviar deshabilita la preparación. La IA sigue sin confirmar documentos automáticamente.

La versión de prompt forma parte de la huella de trabajos V2 de documentos: salidas anteriores se conservan, pero los candidatos anteriores pueden quedar obsoletos al revisarlos. No se genera ni cobra un reemplazo automáticamente. Los planes y documentos confirmados se conservan.

## Validación

112 pruebas distintas correctas: 19 del generador, 77 de regresión original/contratos, 14 de lotes y 2 del lector/normalización de logo. Las repeticiones de archivos no se suman de nuevo. Incluye alta HTTP desde vacío, borrador recuperable, alta V2 usando formulario original, logo, importación por edad, corrección, foto privada HTTP, retiro y recuperación, siete Word y talleres; proveedores simulados inspeccionan los prompts reales que recibiría el proveedor para chat/año/proyecto. Cuatro respuestas docentes no cierran el chat de una edad automáticamente. Recuperar no llama a IA. Cero diagnósticos/observaciones creados por esas conversaciones.

Typecheck y build finales correctos (también tras el ajuste de sugerencias móviles). Lint final correcto con el aviso previo descrito. Lint conserva únicamente el aviso anterior de `diagnostic-generation-control.tsx`; build mantiene avisos de PGlite/eval y tamaño de chunks. Ninguno representa una llamada real nueva.

QA visual: 1440×1000 y 390×844, formulario de colegio, matrícula y conversación. El formulario de inicio se revisó con un componente temporal sin guardarlo sobre el aula existente; esa ruta y pestaña se retiran. Ancho móvil del documento 375 px en viewport 390, sin desborde global. Se corrige el ancho intrínseco de sugerencias largas en el chat compartido para que se ajusten en móvil. Un mensaje sin enviar deshabilita Crear y al vaciarlo vuelve a habilitarlo, sin generación. Las capturas del inicio están en `output/generador-documentos/reutilizacion-original/`. La última recarga de la aplicación no registró errores de consola. Los cuatro alumnos, una actividad, tres documentos, plan activo e intentos de IA permanecen iguales tras reiniciar; recibo de conteos sin nombres en la misma carpeta de salida. Las fotos son opcionales y privadas; no se envían al chat ni a IA. La impresión de los instrumentos conserva sus plantillas existentes; esta revisión no rediseña Word.

## Errores encontrados y límites

La primera ejecución paralela agotó los 10 s de arranque del servidor de prueba; se usa espera acotada de 30 s y suite del generador secuencial. No se declara ese primer intento correcto.

El logo heredado asumía `.local/assets`: el almacén aislado no creaba su carpeta y la referencia apuntaba al árbol original. Se crean las carpetas locales y se pasa la raíz relativa del almacén al mismo escritor; el lector usa la carpeta de recursos autorizada. Alta y lectura privada comprobadas con datos ficticios.

Fotos y consulta de retirados del componente original estaban bloqueadas por la barrera V1/V2; además, el lector de foto exigía una edad escalar. Se comparten solo esos endpoints de matrícula con sus comprobaciones de propietario, y el lector de foto autoriza alumno/aula activos sin exigir edad escalar. Las rutas pedagógicas V1 siguen bloqueadas para V2. Prueba HTTP de foto, retiro y recuperación correcta.

La interfaz identifica cuando la última respuesta usa un prompt anterior y aclara que los mensajes siguientes usan el modo de documentos. Las conversaciones anteriores no se reescriben: sus respuestas históricas pueden mencionar el diagnóstico. Las siguientes solicitudes usan los prompts nuevos. No se volvió a evaluar semánticamente el modelo real; se preserva el límite de llamadas cortas autorizado por la usuaria.

## Rollback

Los cambios viven en la copia independiente. Detener su launcher conserva el almacén `generador-desde-cero`; no borrar ni reemplazarlo para probar una interfaz. Los componentes originales mantienen valores predeterminados del recorrido cotidiano. Para volver a una interfaz previa, revertir únicamente los cambios descritos en este recibo, conservando datos, historiales y archivos privados. No se requiere rollback de esquema ni despliegue.
