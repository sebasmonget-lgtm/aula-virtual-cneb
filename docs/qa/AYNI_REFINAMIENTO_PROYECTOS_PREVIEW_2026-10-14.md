# Refinamiento de proyectos — Preview · 14/10/2026

Base: 7d52aae/542e706. Rama: codex/mi-ano-simple-preview. Solicitud posterior conserva Preview únicamente; Production y datos reales excluidos.

## Cambios comprobables
- Mensaje docente inmediato, compositor vacío y puntos de escritura mientras llega respuesta; recuperación del turno persistido ante error.
- Ajustar este proyecto y Crear otro proyecto usan un mismo diálogo y contratos existentes. Biblioteca lateral reutiliza available_experiences. Crear otro conserva el anterior y asigna solo el mismo tramo; no genera otro año.
- Conversación de una o dos preguntas relevantes, sin repetir lo informado; materiales concretos y breves. No se certifica inventario ni pertinencia curricular mediante el proveedor ficticio.
- Preparar abre calendario existente dentro de Mi año. Preparar N actividades acepta ese proyecto/bloque, sin segunda pantalla de aceptación; límites del tramo, feriados, gestión y fines de semana se conservan.
- Progreso con Ayni, animación respetando reducción de movimiento, etapa real y conteo guardado. No promete porcentaje temporal, duración exacta o notificación fuera de la aplicación.
- Next after activa el worker que antes solo tenía temporizador standalone. Checkpoints, lease, publicación atómica y recuperación siguen existentes; continuación privada firmada al mismo deployment.
- Igualdad estructural evita falsos errores por orden JSONB; baseline focal y revisión propia permiten sustituir una tarjeta sin autorizar cambios ajenos.
- Carpetas por año/aula, tipo y proyecto/versión; consulta/Word existentes, breadcrumb y retorno/recarga conservan carpeta.
- Proyecto seleccionado tiene borde, énfasis y Seleccionado. Desde consulta, iniciar/continuar la actividad de hoy abre Hoy con el mismo ID; una futura no ofrece inicio ni se reprograma.

## Validación ejecutada
100 pruebas distintas PASS: annual-journey, annual-year-editor, proposal-preview, proposal-intent, project-conversation, complete-project-preparation, preparation-jobs, preparation-background, document-library, document-word, school-calendar, project-flow, activity-runner, preparation-navigation, project-proposal-navigation y auth-http. Repetición focal de 18 tras ajuste final de texto; no se suma al total.
Typecheck y lint de fuentes PASS; Next build PASS (advertencias de tracing dinámico existentes, sin error). Detector Impeccable una ejecución sin hallazgos; revisión visual acotada, sin rediseñar identidad.

QA UI/HTTP solo con PGlite aislado y 35 niños ficticios, proveedor HTTP local que no conecta a IA externa:
1. Crear otro proyecto mediante dos mensajes; el mensaje se ve antes de la respuesta retardada. Abrir el nuevo chat no llama al proveedor.
2. Nuevo proyecto en tramo 13, anterior en Biblioteca, nueve días elegidos; excluye 2 nov. y publica nueve actividades completas.
3. Ajustar proyecto 14, revisar/aplicar y preparar nueve días; excluye 16 nov. Otros proyectos y fechas se conservan.
4. Proyecto 15 prepara 13 actividades; 8/9 dic. son feriados deshabilitados. Estado real observado durante carga: Creando actividades: 5 de 13; después lista completa de 13.
5. Bridge real en modo serverless, temporizador local desactivado, invoca after y publica. Lectura final verifica 31 actividades de estos tres proyectos con preparación docente, acciones, mediación, evidencia y cierre completos. No es un benchmark del proveedor real ni prueba de continuidad multibatch con Vercel autenticado.
6. Replay de preparación publicada no llama al proveedor. Primer día/actividad/observación previos preservados; inicio de hoy verificado por HTTP y continuar desde UI abre el mismo ActivityRunView; ejecución de futura rechazada.
7. Documentos recorre carpetas, consulta completa y vuelta/recarga en la misma carpeta. Word descargado desde escritorio y móvil, ZIP/XML con contenido completo verificado.
8. Móvil 390 px: calendario, chat, consulta y documentos utilizables; ancho de página 375 px con scrollbar, sin desbordamiento horizontal. Escritorio 1280 px: ancho 1265 px. Lectura de actividad futura muestra consulta sin edición ni inicio.

Los errores al generar un ajuste durante QA fueron del proveedor ficticio: no emulaba el bundle de reparación y repetía un título ya usado. Se corrigió únicamente el harness ignorado; no se relajaron validadores del producto.

## Evidencia privada local
.local/project-refinement-20261014 contiene tests-final.log, annual-tests-final.log, typecheck-final.log, lint-final.log, next-build-final.log, functional.json, functional-final.json y serverless-receipt.json. Capturas: chat-desktop.png, chat-mobile.png, calendar-desktop.png, calendar-mobile.png, documents-desktop.png, documents-mobile.png, activity-mobile.png y project-ready-desktop.png. No se incorporan secretos ni datos pedagógicos reales al repositorio.

## Límites y rollback
Cero llamadas pagadas y cero escrituras pedagógicas cloud en esta QA. Sin migraciones, cambio de modelos/cuentas/RLS o promoción de Production. Pendientes: recorrido docente autenticado con proveedor real, duración/continuación en cloud bajo carga y hardware de dictado. No declarar esos controles ejecutados por el smoke público.
Rollback de código: 7d52aae, conservando versiones, propuestas, actividades y jobs guardados. No borrar la base ni el historial.

## Publicación
Pendiente registrar commit, READY, SHA, smoke y Production intacta después del despliegue Preview.
