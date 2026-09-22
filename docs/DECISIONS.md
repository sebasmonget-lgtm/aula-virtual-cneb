# Decisiones de arquitectura

## ADR 013 Estadísticas con cobertura y señales separadas

**Decisión.** `StatisticsService` calcula conteos desde datos estructurados y clasifica por separado poca presencia en planificación, información insuficiente y necesidad observada con cobertura suficiente.

**Consecuencia.** El contrato podrá alimentar interfaz, informe o Excel sin guardar cifras manuales ni presentar porcentajes como dominio del aula. Ninguna señal modifica la planificación; una futura sugerencia requerirá confirmación docente.

La señal interna usa una cobertura mínima configurable de 50%, y requiere al menos tres estudiantes y 25% de la información suficiente para mostrar una necesidad grupal. Estas constantes no son un estándar CNEB ni una calificación.

## ADR 012 Memoria pedagógica como derivación estructurada

**Decisión.** El contexto pedagógico individual se construye en servidor desde estudiante, diagnóstico y evidencias; se conserva como `student_context_snapshots.structured_payload` para consultas posteriores. Los binarios multimedia y una síntesis generada no forman parte del payload actual.

**Consecuencia.** Niños puede mostrar trayectorias reales sin depender de un documento Word ni de IA. Los snapshots se regeneran cuando se registra evidencia o diagnóstico y no emiten una evaluación final automática.

## ADR 011 Marca observacional por evidencia, no nivel de competencia

**Decisión.** Las nuevas evidencias asociadas a un criterio guardan una marca docente obligatoria (`demonstrated`, `with_support`, `not_yet_demonstrated` o `insufficient_information`) y una nota opcional. La actividad entrega todos los criterios que planificó; la docente elige el observado cuando hay más de uno.

**Consecuencia.** Una evidencia puede guardarse sin texto, no equivale a una calificación CNEB y podrá acumularse como trayectoria sin interpretar archivos multimedia ni inferir un nivel final.

## ADR 014 Ejecución guiada con posición persistente

**Decisión.** La ejecución diaria conserva una referencia a la actividad planificada y solo persiste un índice de paso en `daily_execution_logs`; no duplica pasos ni crea una sesión independiente. Continuar actividad abre esa vista y `keep_current` queda reservado para extender manualmente un bloque.

**Consecuencia.** La docente puede avanzar, retroceder o cerrar la actividad sin quedar atrapada en un asistente obligatorio. Si la planificación reduce sus pasos, el índice se limita al último paso disponible.

## ADR 015 Evidencia fotográfica local y privada

**Decisión.** La primera evidencia multimedia es una foto opcional, reducida en el navegador antes de enviarla a la API local y almacenada bajo `.local/assets/evidences/` con un UUID no derivado de datos del niño. La futura equivalencia será el bucket privado `student-evidence`; no se crean recursos ni se aplican políticas en cuentas externas desde este repositorio.

**Consecuencia.** Las fotos no se incluyen en el contexto de IA ni se exponen por ruta pública. Las siguientes modalidades multimedia quedan fuera de esta fase.

## ADR 010 Resolvedor central para la jornada diaria

**Decisión.** La pantalla Hoy no calcula su estado con reglas dispersas. El servidor local usa `resolveDailyState` para decidir el bloque actual/siguiente, la acción primaria y los pendientes a partir de horario, asistencia, ejecución y excepción de calendario.

**Consecuencia.** La interfaz conserva una sola acción principal y puede manejar ingreso tarde, cierre posterior a una actividad, actividad extendida, feriados y ausencia de horario sin crear copias de la planificación. El mismo contrato se podrá portar al backend de Supabase.

## ADR 011 Doble revisión para propuestas curriculares de Jev

**Decisión.** Una tarjeta que Jev use para proponer competencia o desempeño debe tener `official_review_status: verified` y `semantic_review_status: verified`, además de todos sus campos obligatorios. Para desempeño, también debe coincidir con la edad y con la competencia ya confirmada por la docente.

**Consecuencia.** La ausencia de catálogo oficial trazado obliga el modo de selección manual. Los bancos de casos sirven para medir el enrutamiento y el fallback, pero no convierten hipótesis semánticas en contenido oficial ni activan una integración de IA.

## ADR 009 Horario derivado para la pantalla Hoy

**Decisión.** Guardar bloques de horario que referencian actividades existentes y registrar su ejecución diaria de forma separada. La pantalla Hoy consulta esos bloques en la zona horaria America/Lima; no crea una copia diaria de actividades ni talleres.

**Consecuencia.** Reprogramar una hora conserva la actividad original y las evidencias siguen vinculadas a su criterio.

## ADR 008 Referencia visual del diagnóstico

**Decisión.** Adaptar la interfaz a la referencia visual proporcionada (azul marino, turquesa y acentos pastel, navegación lateral clara, tarjetas y lista de competencias con progreso), conservando el nombre Ayni Aula, la estructura de datos y los flujos reales existentes. La imagen es una guía estética; sus nombres, conteos y estados no son datos del proyecto.

**Consecuencia.** El diseño se aplica al tema global, perfil y diagnóstico sin introducir dependencias externas ni cambiar el modelo pedagógico.

## ADR 001 Servicios externos aislados

**Problema.** El equipo dispone de conexiones existentes de Vercel y Supabase que no pertenecen a este proyecto.

**Decisión.** No usar, enlazar ni modificar esas cuentas. El repositorio solo incluye contratos, migraciones y variables vacías. La conexión se hará más adelante con cuentas nuevas y primero en staging.

**Consecuencia.** El desarrollo persiste datos en PostgreSQL embebido local y no está desplegado.

## ADR 005 PostgreSQL local sin Docker

**Problema.** Docker Desktop falló en el equipo por sockets locales; se necesitaba continuidad de desarrollo sin depender del daemon.

**Opciones consideradas.** Supabase CLI local con Docker; SQLite; PostgreSQL embebido con PGlite.

**Decisión.** Usar PGlite para el desarrollo local. Conserva semántica PostgreSQL, funciona sin daemon y persiste en una carpeta ignorada por Git. Mantener migraciones Supabase separadas para Auth, RLS y Storage, con nombres e IDs de dominio equivalentes.

**Consecuencia.** El flujo puede desarrollarse y probarse localmente; la seguridad real de Supabase debe validarse después en staging.

## ADR 006 Diagnóstico basado en referentes revisados

**Decisión.** Cada marca observacional se vincula a un referente de competencia y edad, y cada referente a uno o más `performance_ids`. Los estados son operativos, no niveles oficiales. El catálogo de muestra se identifica como tal y no se exporta a producción por defecto. Notas y archivos son opcionales.

**Consecuencia.** Una observación aislada nunca determina una conclusión ni actualiza el plan anual automáticamente. La síntesis requiere revisión y confirmación docente.

## ADR 007 Importación Supabase offline primero

**Decisión.** La exportación local pasa por validación curricular y genera un paquete SQL/manifiesto revisable. El importador no toma credenciales ni escribe en cuentas externas. El UUID de Auth del proyecto nuevo se indica explícitamente al generar el paquete.

**Consecuencia.** La aplicación de migraciones, subida privada de logos y pruebas RLS quedan para un proyecto nuevo de staging.

## ADR 002 Fuente de verdad estructurada

**Decisión.** Currículo, aula, planificación, actividad, criterio y evidencia viven como datos relacionados. Los textos de IA y los DOCX/PDF son resultados derivados y regenerables.

## ADR 003 IA con confirmación docente

**Decisión.** La IA propone y organiza. No inventa hechos sobre estudiantes ni confirma niveles finales. Toda conclusión o valoración queda asociada a confirmación docente.

## ADR 004 Currículo versionado

**Decisión.** Los textos oficiales se almacenan por versión y se referencian por ID estable. Una experiencia o actividad no guarda una reformulación libre de la competencia como sustituto del dato oficial.
