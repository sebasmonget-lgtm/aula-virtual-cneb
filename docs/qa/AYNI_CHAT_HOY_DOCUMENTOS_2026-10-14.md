# QA — Chat de proyectos, Hoy y Documentos · 14/10/2026

Entorno aislado: PGlite local y proveedor HTTP fixture explícito. Base de trabajo 678ebbb (producto previo 50ea956). Ningún dato real se cambió y no se hicieron llamadas pagadas. Producción queda fuera del alcance; publicación solo Preview.

## Resultado funcional

- Cambiar con Ayni y Crear otro proyecto muestran saludo nominal, compositor y modos sin esperar las recuperaciones. Contador de proveedor al abrir ambos: 0. El primer envío muestra inmediatamente el mensaje docente y Ayni está escribiendo; generación y recuperación conservan CAS/idempotencia.
- Saludo explica cuándo se habilita Crear el nuevo proyecto. Fuente rotulada Se reemplazará; candidato con imagen propia. Dos competencias distintas con oportunidades completas y materiales sin marcadores técnicos. Creaciones de tramos distintos no recuperan la conversación del otro.
- Proyecto preparado sin historia conserva cambio/creación y Biblioteca; restauración tiene revisión explícita. Con ejecución/evidencia no se reemplaza el trabajo: se conserva su historia. La prueba de publicación rechaza la ejecución concurrente sin cambiar actividad/calendario/aprobación, y verifica snapshot, tramo, archivo, auditoría y replay.
- Vertical HTTP: crea propuesta con dos competencias, reemplaza el proyecto anterior de agua, confirma ocho días y publica ocho actividades. Los nueve documentos anteriores quedan archivados, incluido un día omitido de la nueva selección; no se altera su contenido ni se borra su historial. Las cancelaciones auditadas evitan duplicación en Hoy/calendario.
- Mi año → actividad futura → Desarrollar en Hoy abre consulta. Dentro, Desarrollar hoy inicia la guía, con criterio y registro nominal. Se comprobó actividad prevista para 20/10/2026 desarrollada el 14/10/2026: fecha del plan y secuencia intactas. Una observación ficticia de Alumno 01 se guarda para ese alumno y aparece en Word con fecha real y prevista. Exportación 399436 bytes. Captura por momento válida; sin inferir evaluaciones ni datos del niño.
- Los adaptadores existentes conservan observaciones en trayectoria/evaluación según confirmación docente; pruebas de pertenencia, corrección, anulación, contexto y ausencia de niveles inventados PASS. No se introduce un segundo sistema de documentos personales.
- Documentos abre versión 3 desde carpetas y mantiene número original de tramo (12–15 en fixture). Lectura visual de actividad/proyecto y Word unificado; consulta histórica autorizada preserva contenido formal. Catálogo muestra fecha civil de Lima.
- Navegación principal vuelve al año vigente y evita Volver/seguir a Planificación redundantes. Activo de Hoy solo se muestra dentro de Hoy; retorno y enlaces directos conservan contexto.

## Verificación

68 pruebas distintas focales PASS en conjunto. Reejecuciones de lectura/ejecución, conversación anual y preview tras los cambios correspondientes PASS; no sumarlas como pruebas diferentes. Typecheck, lint de fuentes, Vinext y Next build ejecutados; recibos en .local/chat-document-20261014. Se reejecutan las comprobaciones finales antes de publicar.

Navegador integrado: escritorio 1365/1366 y móvil 390; en lectura móvil clientWidth=375 y scrollWidth=375, sin desbordamiento horizontal. Guía de Hoy, selección de alumno con 35 nombres, envío/guardado, vuelta a Mi año, Biblioteca y carpetas/versión 3 comprobados. Capturas privadas chat-desktop.png, chat-mobile.png, hoy-desktop.png, hoy-mobile.png y annual-v3-desktop/mobile.png. La pestaña perdió conexión durante un reinicio local; la usuaria la recargó antes de continuar. No se atribuye al producto una prueba visual no ejecutada.

El proveedor es ficticio: estas pruebas validan flujos/contratos y preservación, no calidad pedagógica de una nueva salida de IA real. No se regeneraron proyectos o actividades del aula real.

## Publicación y rollback

Pendiente registrar commit/URL/deployment/READY y smoke de Preview. Sin migraciones. Rollback de código al Preview anterior 50ea956; ninguna reversión de contenido histórico o de base de datos. No promover ni usar --prod. El cambio crea registros solo por una acción docente autorizada en la aplicación.
