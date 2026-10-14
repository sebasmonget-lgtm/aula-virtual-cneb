# Mi año y preparación completa · Preview · 14/10/2026

## Alcance y resultado

Base funcional 508dfac, HEAD inicial c5a71fa, rama codex/mi-ano-simple-preview. Se atienden el texto adjunto de simplificación definitiva y su ampliación sobre actividades integradas/Documentos. Producción y datos existentes quedan fuera del alcance. Sin migraciones, cambios de modelos ni pruebas pagadas de IA.

Mi año conserva B1–B4, los 15 tramos, el calendario horizontal de Todo el año y la identidad visual. La ficha contiene propósito breve, hasta tres acciones representativas, materiales sugeridos y competencias. Debajo aparecen preparación/progreso y actividades guardadas por fecha, título y estado. Abrir una actividad muestra el documento completo en consulta y permite volver al año existente.

La confirmación breve del año acepta planificación, no interpretaciones ni evaluaciones. Su anotación durable conserva revisión pendiente; Word respeta esa anotación. La revisión explícita sigue disponible en las herramientas existentes del plan anual, accesibles desde su documento. No se marca ninguna casilla por código.

Cambiar con Ayni y Preparar comparten conversación persistente. Los mensajes guardados informan el candidato concreto, con competencias oficiales y decisiones acumuladas. Conversar no cambia la propuesta; aceptar exige candidato/revisión/hash vigentes, propietario y fuentes actuales. Tras comenzar el proyecto, el ajuste usa una versión de los días futuros sin registros, preservando propósito, competencias, fechas, días trabajados y evidencias.

Aceptar el proyecto autoriza Plan Maestro, secuencia, una actividad completa por día y publicación atómica al terminar las validaciones. Se conserva preparación durable, recuperación de respuesta guardada y advertencia de reintento cuando el resultado del proveedor es incierto. Los talleres continúan opcionales. El recorrido normal elimina confirmación manual de secuencia, edición de filas, generación por día y aprobación simulada por actividad.

Navegación principal: Mi año, Hoy, Calendario, Evaluar, Documentos. DocumentsScreen conserva exportación, fuentes, versiones y documentos históricos; agrupa por tipo/proyecto/año y ordena por fecha. No se agrega un sistema de documentos. Mi aula mantiene diagnóstico; Evaluar mantiene valoraciones. Los motores y accesos internos anteriores continúan disponibles para contratos anteriores.

## Validación ejecutada

- 65 pruebas distintas PASS en once archivos: confirmación anual, chat/candidato, preparación completa, jobs, versiones/mapa, V3 de actividad, contrato anual, navegación, biblioteca documental, Word y calendario. Fallo de segunda confirmación revierte todo el bloque; reintento reutiliza las diez respuestas. Pérdida de checkpoint/token recupera la actividad ya guardada sin duplicación. Replay de aceptación futura y entrada antigua recuperan el mismo job. Se comprueba propiedad/CAS y protección de registros.
- TypeScript PASS (`npx tsc --noEmit`). Lint de fuentes PASS (`npm run lint -- --ignore-pattern .local`); se excluyen harness/cachés generados ignorados de QA. El lint sin esa exclusión encuentra archivos compilados de .local, no se presenta como PASS. Build local Vinext PASS y `git diff --check` PASS.
- Aula nueva aislada en PGlite con 35 alumnos ficticios y proyecto de diez días lectivos (19–30 octubre). Primera generación: diez actividades con preparación docente, acciones de niños, mediación, oportunidades de evidencia y cierre completos. Proveedor HTTP fixture local: 15 solicitudes en la primera etapa, cero pagadas.
- Chat de dos turnos: materiales reciclados + patio/canales + cambio de lectura a cantidad. Se verifica candidato, aceptación, reentrada y recuperación de mensajes. No se modifican otros proyectos ni calendario.
- Hoy del 19/10 recupera la primera actividad completa sin generar de nuevo. Se guarda una observación ficticia asociada a alumno/criterio/actividad.
- Ajuste posterior: nueve actividades futuras completas, primera actividad y contenido documental/observación byte a byte conservados; mismo año y misma actividad en Hoy. Segunda etapa: doce respuestas fixture, incluida una generación fallida durante la corrección de criterios; cero pagadas. Las comprobaciones finales no añaden llamadas de proveedor.
- API pública rechaza generar por día o mover una actividad del bloque aceptado; la entrada antigua de preparación devuelve el job guardado. Calendario muestra una actividad por fecha, conserva la historia y abre consulta completa.
- Navegador integrado: escritorio y móvil 390×844. Lista cronológica, lectura completa, recarga de enlaces directos, regresar al mismo año y volver a documentos. Documentos descarga Word en ambos tamaños; se inspecciona XML real del ZIP: título, preparación, acciones, mediación, cierre, criterio y observación ficticia presentes. No se altera secuencia ni se confirma una evaluación en QA.
- Revisados acceso de Evaluar y acceso existente al diagnóstico desde Mi aula. Menú móvil dispone de cinco columnas y el elemento activo corresponde al destino. No desbordamiento horizontal de Mi año (scrollWidth=innerWidth=390).

Capturas (solo datos ficticios): [escritorio](assets/mi-ano-completo-2026-10-14/year-desktop.png), [móvil](assets/mi-ano-completo-2026-10-14/year-mobile.png), [chat móvil](assets/mi-ano-completo-2026-10-14/chat-mobile.png), [Word en móvil](assets/mi-ano-completo-2026-10-14/document-mobile.png), [Hoy](assets/mi-ano-completo-2026-10-14/today-desktop.png), [confirmación](assets/mi-ano-completo-2026-10-14/confirm-desktop.png).

## Límites y publicación

Los fixtures prueban contratos y persistencia, no calidad pedagógica de respuestas reales. Dictado/micrófono y recorrido autenticado completo en Preview quedan pendientes de QA manual. No se prueban modelos pagados ni se escriben datos pedagógicos cloud. Las capturas funcionales pertenecen al entorno aislado, no se presentan como capturas autenticadas cloud.

Publicación autorizada exclusivamente Preview, después de commit identificable, árbol limpio, build y smoke. Recibo de URL/SHA/estado se añadirá al terminar. Producción esperada intacta: dpl_H19YWzRdGjkgh8y72QAd1qBty7Mf / 9a0920230350cd6b9050f35683a1f35d459e78c7.

Rollback: volver al Preview anterior 508dfac; no ejecutar SQL inverso ni eliminar actividades, observaciones o versiones. Antes de volver a un ejecutor anterior, revisar y finalizar trabajos de preparación aceptada pendientes con este código: el ejecutor anterior no interpreta la política nueva. No promover ningún despliegue a Producción.
