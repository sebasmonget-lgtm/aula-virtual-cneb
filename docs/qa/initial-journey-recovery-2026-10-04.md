# Ajustes de QA del recorrido inicial y conversaciones

Base: último `origin/codex/qa-ayni-v2`, `071e8a89a420225ee31098ed99782d9a87a724f6`. Cambios mínimos sobre el recorrido existente, sin migraciones, cambios de RLS ni sustitución del pipeline de quince tramos.

## Cambios

- Foto opcional al inscribir: cámara/archivo, preview, preparación hasta 100 KB. Servidor autoriza alumno/aula, normaliza a JPEG de hasta 320 × 320 y 100 KB; Storage privado, sin envío de fotos a IA. Si falla la foto después de inscribir, se reintenta solo la foto.
- Momento requerido: check/Guardar muestra campo y mensaje rojo con foco; validación del preview también en servidor. Check consulta, no guarda; bloque de revisión resalta explícitamente que falta Guardar.
- Matriz transmite alumno y competencia y abre una captura contextual, conserva la competencia sin reclasificar. Celda vacía abre directamente el registro; una celda con registros permite consultarlos y añadir otro. Alias visual `Lenguajes artísticos`, ID/nombre CNEB sin cambios y compatibilidad con `Crea` en intención histórica.
- Lecturas recuperan hasta dos errores transitorios de conexión/gateway. No hay replay automático de POST/PUT/PATCH/DELETE. Guardado y refresco de resumen se separan; cortes de refresco no anuncian pérdida de la observación.
- Conversaciones guardan el turno docente antes de llamar al proveedor, muestran mensaje inmediato y escritura animada; recuperan sesión por GET y reanudan el turno guardado sin duplicarlo. Estado interrumpido prevalece sobre una respuesta `ready` anterior. Cierre por decisiones y condiciones, normalmente dos/tres respuestas útiles y como máximo tres; permite continuar sin ideas.
- Nueva intención invalida candidata, borrador, revisión y procedencia anteriores. Texto literal preservado sirve para recuperar vocabulario ocultado por el filtro antiguo. Tema/enfoque reciente prevalece; revisor comprueba su correspondencia. `Navidad`, `Perú` y vocabulario acotado de proyectos se conservan sin liberar nombres conocidos/contactos.
- Revisión de candidata fallida conserva incidencias privadas y borrador; reintento repara esas incidencias antes de volver a revisar, sin aprobar mientras existan. Mostrar motivos pedagógicos legibles no muestra telemetría. La alternativa puede mantener un tema ya presente con otras acciones; no se exige cambiarlo ni cubrir todo el año en una fila sin fechas.
- Nueva propuesta aprobada puede recuperarse sin repetir aprobación. Mascota visible en móvil en mensajes y en panel de modificaciones. Este último sigue reuniendo indicaciones antes de aplicar; no cambia la arquitectura del panel.
- Preparación: puntos animados y checkpoint actual giratorio; checks solo desde checkpoints persistidos. Poll secuencial, recuperación de preparación ya guardada y de trabajo terminado incluso si falla la primera lectura del borrador. No detiene el poll antes de recuperar el plan.

## Verificación

Suite focal 60/60 PASS: transporte, turnos, intención, fotos/observaciones, creación de propuesta, año y recuperación de jobs, fuentes diagnósticas. Incluye proveedor fallido entre dos temas (mercado → Navidad), candidata anterior descartada, intención literal recuperable y año intacto; fotografía sintética 1024 × 1024 reducida a 320 × 320 y menos de 100 KB, aislamiento de otra docente, momento vacío sin IA, CAS e idempotencia.

Typecheck, lint, Vinext y Next webpack PASS antes de publicar. QA real en staging: preview de foto sintética 512 × 512 de 2298 bytes (sin inscribir un alumno adicional), validación roja/foco del momento, sugerencia real de Lenguajes artísticos, guardado único, conteo actualizado de 1 registro y captura contextual Indaga. Abrir la matriz limpia el conteo anterior mientras consulta los registros actuales; evita mostrar una celda antigua vacía después de guardar. Mascota móvil y turno optimista comprobados en conversación real de Navidad. Recibo de comandos, conteos y deployment posterior en `.local/qa-fixes-*`; no equiparar integración con proveedor simulado a revisión semántica de IA real. Los errores históricos `Failed to fetch` no aportaron un evento recuperable en los logs de Vercel consultados; se corrigen huecos de recuperación reproducibles, sin atribuir una causa de infraestructura no demostrada.

## Publicación y rollback

Commit identificable y limpio → push a rama QA → preview Vercel con origen del alias QA → smoke → alias staging. Producción conserva el deployment anterior durante esta pasada de QA. No borrar los datos nuevos de la cuenta de prueba.

Rollback de código al SHA base conserva lectores de quince y datos existentes. No revertir sesiones con respuestas pendientes al comportamiento anterior sin resolverlas: el turno ya guardado debe retomarse antes de volver al código anterior. No hay rollback de base de datos ni de fotos necesario.
