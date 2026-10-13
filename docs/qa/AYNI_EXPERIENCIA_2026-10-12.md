# Preparación docente: simplificación y continuidad — 2026-10-12

Base 029080a; conserva la optimización de guardado 2fc3114. Publicación autorizada exclusivamente en Preview. Producción de referencia: dpl_2KDEnPFk7UqyvPa7At3t1RW7sLqy / d595ffebd05d50a1971c8389f4c3d758f22a39a7. Cuenta QA autorizada para recorrido de interfaz; credenciales no se registran.

## Cambios

- Cuatro etapas coherentes; resumen directo después de entrevistas/observaciones. Historial por enlace dentro de esa pantalla, mapa por acceso secundario y captura en modal.
- Colegio/aula siguen editables; se eliminan entradas repetidas de edad/año/fechas. Calendario, opciones curriculares, entrevistas y datos históricos se conservan.
- Intereses familiares agregados por niño, con plantas/naturaleza unificadas sin modificar respuestas originales. Conteo explícito, sin convertir contexto familiar en logro.
- Competencias visibles; sugerencia automática solamente después de confirmar el guardado y cuando no hubo decisión manual o solicitud previa. Respuesta de IA separada de confirmación docente; fallos conservan el registro y la foto privada no entra al clasificador.
- Tarjetas comunes para registros libres/guiados; guiada mantiene criterio, competencia, fotos y contenido al cambiar niño. Edición guiada transaccional con comparación del texto vigente y conservación del anterior en preferencias privadas; reintentos no duplican revisiones.
- Resumen con autosave serializado, recuperación, error/reintento y confirmación real antes de avanzar. Corrige callback de preparación ausente y estado de navegación residual; dashboard inicial incluye el ID del aula para continuar sin recarga.
- Fuentes del resumen leídas por aula en cuatro consultas agrupadas; resultado IA reutilizado por huella de fuentes, lease contra procesamiento concurrente. No se reduce el modelo ni se atribuye toda la espera al servidor: la generación externa conserva su plazo de 120 s.
- Costos de IA retirados de la interfaz docente y API restringida a administradores. Única migración autorizada: 202610130001, política SELECT de ai_usage_events restringida a app_metadata.ayni_role=admin. Aplicada y registrada; afecta la base compartida de Producción tal como autorizó el usuario. No cambia su despliegue ni otros permisos.

## Validación previa a publicación

Typecheck, lint de archivos modificados y Next webpack PASS. Suites focales de autorización HTTP, recorrido inicial, entrevistas/revisiones, contexto, idempotencia, intereses, IA y edición guiada PASS; no se ejecutó una nueva auditoría general. Detector de diseño: cero hallazgos.

Dos aulas locales ficticias creadas desde la interfaz. Recorrido nuevo completo sin recargar: crear aula → añadir niño → confirmar matrícula → resumen guardado/recuperado → doble clic en continuar → conversación de Mi año visible. Entrevistas parciales, siguiente niño, libre con/sin competencia, fecha anterior, guiada con cambio de niño conservando texto, edición, mapa con modal y recuperación del resumen comprobados. Error IA local por proveedor no configurado conserva datos; no equivale a una prueba de IA cloud.

RLS remoto: sesión authenticated con rol docente devuelve cero filas; rol administrador devuelve 53 filas. Prueba read-only con rollback de contexto de sesión. Sin cambiar datos pedagógicos remotos en esta fase.

## Rollback y límites

Revertir el commit de interfaz/servicios y publicar una Preview anterior conserva datos, fotos y versiones. La restricción RLS no se revierte automáticamente; restaurar lectura docente exige nueva autorización y migración. Correcciones guiadas anteriores se conservan en profiles.preferences.guided_observation_revisions por ID, dentro de la transacción del registro; no requieren tabla nueva.

Pendiente de registrar al cierre: URL/SHA exactos, smoke y recorrido autenticado de la Preview desde la interfaz. Cámara y micrófono físicos no se dan por validados a partir de escritura o subida de archivo.
