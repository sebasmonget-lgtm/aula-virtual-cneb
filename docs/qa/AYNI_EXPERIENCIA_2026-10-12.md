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

## Primera pasada autenticada de Preview 9a85ace
Ingreso autorizado por UI. Cinco alumnos: tres anteriores conservados y dos nuevos ficticios Luna/Nico QA Recorrido 1210. Alta por doble clic única, entrevista parcial confirmada con siguiente niño, observación libre manual, libre sin competencia con sugerencia automática distinguida y confirmación posterior; guiada con foto sintética y cambio de niño conserva ambas entradas, doble clic único, edición y apertura real de fotografía privada PASS. Mapa modal y guardado PASS; cronología 12/10 antes de 11/10 PASS. Perfil sin costos ni bloque redundante, datos existentes intactos. Resumen corregido/reload y generación real validada; comprobación a 110144 ms del clic ya mostraba resultado (límite superior, no tiempo exacto del proveedor). Avance doble clic abre conversación Mi año, sin iniciar IA, y retorno PASS. Historial accesible.
La lista común termina de incorporar las guiadas cuando responde su lectura histórica; la aparente ausencia inicial fue carga tardía. Se mantienen registros/fotos. Retiro ficticio falló sin modificar el alumno por enum incompatible; corregido después de terminar esa pasada y revalidación focal obligatoria en nueva Preview. Sin alterar código durante la ejecución de la pasada.

## Cierre verificado
Código publicado b70cb3b6aa2fa4f84c8dc6b5c871187e8e738d5c; Preview https://ayni-aula-staging-5704x75jz-ayni4.vercel.app, dpl_HDK8GoVP7iQdbaMZPUi57B8AqbxK, READY. Typecheck/lint/build final PASS; seis pruebas adicionales de retiro/recuperación y compatibilidad PASS. Seis smoke HTTP PASS. Verificación posterior mantiene exactamente ID/SHA del despliegue de Producción indicado arriba.
Segunda pasada focal exclusivamente por interfaz sobre esta Preview: acceso QA, retiro de Luna (5→4 niños), recuperación (4→5), entrevista versión 1 y respuesta original preservadas, continuidad matrícula→resumen→doble clic Mi año PASS. Llegada visible a Conversar con Ayni y Comenzar conversación; no se inició generación del año. Dos fixtures nuevos se dejan activos e identificados para revisión, tres niños QA y registros anteriores sin edición/retiro. Reloj simulado, Storage y permisos pedagógicos conservados.
Visual comprobado a 1366×900 y 390×844; móvil sin desbordamiento horizontal (ancho de documento igual al viewport útil). Capturas: .local/experience-qa-20261012/summary-desktop.png, summary-mobile.png, annual-desktop.png, annual-mobile.png. Preview final queda abierta en el panel lateral. No se cambiaron archivos de código durante las pasadas de UI; la corrección del enum se hizo entre ambas, seguida de checks y republicación exclusivamente Preview.
Límites: captura física de cámara/micrófono no probada; IA del resumen todavía puede tardar cerca de dos minutos aunque se hayan eliminado consultas repetidas y generación duplicada. La lectura histórica adicional del listado tarda más que el guardado compacto; no debe interpretarse esa carga como pérdida de registros. Esta ronda no reemplaza un piloto docente general ni el benchmark anterior de siete operaciones.
