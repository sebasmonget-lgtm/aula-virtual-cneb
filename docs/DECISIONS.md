# Decisiones de arquitectura

## ADR 028 Plan anual v4 como raíz de planificación

**Decisión.** nnual_plan usa Sol/medium desde el router, guarda propuesta y metadata en nnual_plans, y solo cambia a activo por confirmación docente. Las experiencias propuestas permanecen en el payload; no crean learning_experiences.

## ADR 027 Generación de activity desde Planificar

**Decisión.** La pantalla existente Planificar consume un endpoint del backend local para generar únicamente `activity`. El backend obtiene el aula y edad activa, crea el input v4, resuelve el plan, construye el provider con `createAIProviderForPlan` y devuelve solo la propuesta ya validada. La interfaz precarga datos disponibles, permite editar, descartar o regenerar, y no recibe claves, bundle, prompts ni metadata técnica.

**Consecuencia.** Una generación no crea ni confirma una actividad, competencia, criterio, evidencia o evaluación. La operación local actual no tiene un endpoint aprobado para crear actividades; por ello “Revisar y guardar” deja explícito que la propuesta sigue sin persistir hasta diseñar esa operación sobre la base existente. La metadata queda en el límite del backend para una futura auditoría, sin exponerla a la docente.
## ADR 026 Smoke controlado para OpenAI activity

**Decisión.** El único smoke real disponible usa `npm run smoke:openai-activity`, un input ficticio mínimo para `activity`, el plan central y `createAIProviderForPlan`. Si falta `OPENAI_API_KEY`, informa que no se ejecutó y termina sin invocar proveedor. El script muestra únicamente el resultado validado, el uso de tokens y el tiempo total.

**Consecuencia.** El equipo puede comprobar el camino completo con una llamada explícita y acotada, sin exponer claves, prompts, bundles completos, nombres, multimedia ni rutas privadas. Las pruebas automáticas inyectan factory y generador simulados, por lo que no consumen API ni generan costos.
## ADR 025 OpenAI aislado para generación v4 de actividades

**Decisión.** `OpenAIProvider` es una implementación intercambiable de `AIProvider` para el workflow `activity`. Recibe únicamente un `AIContextBundle` inmutable, el schema `activity-v1` y el execution plan producido por `resolveAIExecutionPlan`. Usa la Responses API con Structured Outputs strict y toma la clave solo de `OPENAI_API_KEY`; el modelo y `reasoning_effort` se obtienen del plan central y cualquier discrepancia se rechaza.

**Consecuencia.** La respuesta conserva validación local, provenance y metadata de uso, sin enviar fotos, rutas privadas, multimedia ni input crudo. Errores de clave, autenticación, rate limit, timeout, respuesta incompleta, rechazo, JSON inválido o modelo inesperado son estados estructurados. Las pruebas usan un cliente simulado y no realizan llamadas de pago.
## ADR 024 Política central de routing de modelos

**Decisión.** `resolveAIExecutionPlan` decide de forma determinista el tier, provider, modelo y posibilidad de escalamiento antes de cualquier generación. Code resuelve tareas deterministas; TypeSafe queda reservado para decisiones estructuradas; Luna, Terra y Sol se asignan según complejidad. Ningún modelo ni provider puede escoger su propio routing.

**Consecuencia.** Los nombres de modelo viven en una sola política versionada y la generación de `activity` consume el plan sin acoplarse a un modelo. El escalamiento Luna → Terra → Sol queda permitido solo donde la política lo declara y no se ejecuta automáticamente.

## ADR 023 Generación de actividades mediante provider neutral

**Decisión.** La primera generación vertical de IA usa `generateAIWorkflowV4(input, options)`: prepara el bundle v4, entrega al provider inyectado una copia inmutable del `AIContextBundle` y valida una salida estructurada de actividad antes de devolverla. El provider no recibe el input crudo ni puede seleccionar conocimiento fuera del bundle.

**Consecuencia.** La selección de proveedor/modelo queda desacoplada de la Knowledge Base y se podrá configurar externamente sin cambiar el constructor de contexto. Solo `activity` está habilitado; los otros workflows permanecen fuera de la capa generativa.

## ADR 022 Arquitectura vigente de IA: Knowledge Base v4

**Decisión.** La arquitectura vigente de IA para Inicial 3–5 es `knowledge/cneb-initial-3-5/v4.0.0/` y su pipeline `loadKnowledgeBaseV4` → `retrieveKnowledgeV4` → `buildAIContext` → `prepareAIRequestV4`. El runtime usa conocimiento versionado y no lee PDFs, no crea `official-corpus` y no depende de Jev ni del Knowledge Pack v2.

**Consecuencia.** Cualquier integración futura de modelo consume únicamente `AIContextBundle`. v3, Jev y los catálogos previos se mantienen como histórico, compatibilidad o pruebas legacy; no deben ser importados por integraciones nuevas.

## ADR 021 Preservación explícita de entradas de workflow

**Decisión.** El bundle v4 conserva los campos presentes requeridos o preferidos por el workflow en `context.workflow_inputs`, además de los subconjuntos de aula, estudiante y evidencia ya definidos. Las tarjetas sin competencia confirmada provienen únicamente de unidades semánticas recuperadas; no se completan por orden alfabético.

**Consecuencia.** Un futuro modelo recibirá el propósito, detonante, situación, material o bloque horario como dato estructurado y no deberá deducirlos de la solicitud libre. Contextos vacíos no satisfacen requisitos obligatorios.

## ADR 020 Contexto obligatorio y aplicabilidad antes de IA

**Decisión.** Un bundle solo se construye cuando el contexto obligatorio declarado por su workflow está presente en campos estructurados. Las tarjetas candidatas respetan las condiciones de L2 y Religión, y los atajos prohibidos forman parte de las restricciones duras.

**Consecuencia.** El backend no aparenta disponer de información que falta ni expone contexto estructurado que el workflow no necesita. Las integraciones de modelos deberán manejar el error estructurado de contexto incompleto antes de solicitar una generación.

## ADR 019 Constructor de contexto acotado por workflow

**Decisión.** `buildAIContext` compone loader, retrieval, tarjetas completas, referencia curricular de una sola edad, módulos pedagógicos, reglas de generación y guardrails en un bundle trazable por workflow. Una competencia confirmada restringe el bundle a esa tarjeta; sin confirmación se entregan pocas candidatas sin declarar una ganadora.

**Consecuencia.** La futura capa de IA recibirá solamente conocimiento pertinente y una procedencia completa. L2, Religión y los overlays de 2026 exigen aplicabilidad explícita antes de entrar al bundle.

## ADR 018 Retrieval local determinista para Knowledge Base v4

**Decisión.** El retrieval v4 filtra unidades por workflow, edad, dominios permitidos, competencia confirmada y aplicabilidad contextual. Excluye por defecto las reglas temporales de 2026 y las unidades de Castellano L2 o Religión sin contexto explícito. Luego ordena de forma estable según la política versionada y aplica los límites de unidades semánticas y reclamos de fuente.

**Consecuencia.** La selección es repetible, trazable y local. La construcción de contexto de IA, cualquier proveedor de modelos y los embeddings siguen fuera de esta fase.

## ADR 017 Runtime de carga para Knowledge Base v4

**Decisión.** Cargar la Knowledge Base v4 desde sus JSON y JSONL versionados, validando versión, huellas SHA-256, cardinalidades, IDs, referencias de fuente, edades y requisitos de workflow al iniciar su consumo. El loader no realiza retrieval ni construye contextos de IA.

**Consecuencia.** Las futuras llamadas de IA podrán depender de una base comprobada y trazable sin releer PDFs en runtime. La selección de unidades y `buildAIContext` quedan en una fase posterior.

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

**Estado.** Superada para la arquitectura de IA vigente por ADR 017–022, en particular ADR 022. La condición `official_review_status === verified` y `semantic_review_status === verified` permanece solo en Jev legacy y no bloquea Knowledge Base v4.

**Decisión.** Una tarjeta que Jev use para proponer competencia o desempeño debe tener `official_review_status: verified` y `semantic_review_status: verified`, además de todos sus campos obligatorios. Para desempeño, también debe coincidir con la edad y con la competencia ya confirmada por la docente.

**Consecuencia.** La ausencia de catálogo oficial trazado obliga el modo de selección manual. Los bancos de casos sirven para medir el enrutamiento y el fallback, pero no convierten hipótesis semánticas en contenido oficial ni activan una integración de IA.

## ADR 016 Knowledge Pack semántico importado con cuarentena curricular

**Estado.** Superada como ruta principal de IA por ADR 022. `CNEB_Inicial_AI_KnowledgePack_v2` permanece como histórico/compatibilidad; v4 es la fuente vigente y no requiere transcribir ni extraer PDFs para completar su runtime.

**Decisión.** El paquete CNEB Inicial AI Knowledge Pack v2 enriquece las fichas semánticas existentes y conserva sus 140 candidatos de desempeño en un catálogo separado. La importación mantiene ambos estados de revisión en `pending`; no escribe sobre `curriculum/official` ni agrega candidatos semánticos como desempeños del runtime.

**Consecuencia.** Jev obtiene mejores explicaciones, ejemplos y distinciones cuando exista una ficha doblemente validada, pero el estado actual sigue exigiendo selección manual. La siguiente ingestión oficial debe transcribir PDF MINEDU, guardar página/sección/hash y recién mapear estos candidatos a IDs oficiales.

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

