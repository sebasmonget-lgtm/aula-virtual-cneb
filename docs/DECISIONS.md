# Decisiones de arquitectura

## ADR 034 Diagnóstico inicial antes de la planificación nueva

**Decisión.** Para un aula sin plan anual, el siguiente paso docente se resuelve con el estado persistido del diagnóstico: la configuración de docente, institución, edad y aula precede al alta de niños; luego la docente revisa el diagnóstico y guarda explícitamente que examinó la información disponible. Solo entonces se recomienda preparar el plan anual. La revisión usa el estado `completed` y `completed_at` ya existentes en `diagnostic_sessions`; un endpoint de progreso devuelve solo conteos y el estado, sin datos personales. No se exige cobertura total ni se interpreta una observación aislada como evaluación terminada. Los planes existentes permanecen accesibles aunque no tengan esta marca histórica.

**Consecuencia.** La app abre la sección inicial apropiada en un aula nueva y Planificar muestra Diagnóstico como primer paso. La docente puede continuar con información insuficiente y observar después. La marca de revisión no genera niveles, no confirma interpretaciones pedagógicas y no altera datos CNEB.

## ADR 033 Conclusión descriptiva v4 dependiente de assessment confirmado

**Decisión.** `descriptive_conclusion` recibe una sola competencia y usa Sol/medium con el schema estricto `descriptive-conclusion-v1`. El servidor construye el `AIContextBundle` a partir del assessment activo confirmado y las evidencias v4 que lo sustentaron; entrega al proveedor solo identificador neutro, textos depurados y contexto curricular pertinente. La conclusión se guarda como draft versionado y conserva una huella del assessment confirmado. Antes de confirmar, se comprueba que el assessment siga activo e intacto y que sus evidencias no hayan cambiado. La confirmación archiva solo la conclusión activa del mismo estudiante, competencia y periodo dentro de una transacción.

**Consecuencia.** El texto es una propuesta contextual, no texto oficial ni valoración automática. La docente puede revisar, editar y regenerar sobre el mismo draft; una conclusión activa es de solo lectura. `StudentContextSnapshot` conserva un resumen seguro y `family_report` podrá consumirlo en una fase posterior. La metadata técnica permanece en servidor.

## ADR 032 Assessment v4 como síntesis pedagógica revisable

**Decisión.** `assessment` consume solo evidencias v4 del estudiante, competencia y periodo solicitados. El servidor anonimiza el contexto que llega al proveedor, conserva un snapshot de fingerprints SHA-256 de evidencias y criterios, y usa Sol/medium con `assessment-v1` estricto. La docente revisa el borrador y solo puede confirmarlo si las fuentes siguen iguales. La confirmación archiva únicamente la versión activa del mismo estudiante, competencia y periodo dentro de una transacción.

**Consecuencia.** Las marcas observacionales no son notas ni conclusiones finales. Una evidencia obliga a declarar información insuficiente; con más evidencias no se presume suficiencia. La versión confirmada alimenta `StudentContextSnapshot` sin metadata técnica ni multimedia. `descriptive_conclusion` será el siguiente workflow.

## ADR 029 Captura de evidencia v4 determinista

**Decisión.** `evidence_capture` se resuelve exclusivamente en código y reutiliza `evidences`. Cada registro requiere una Activity y un criterio activos, un estudiante del aula y una marca observacional explícita de la docente. Los criterios v4 se enlazan mediante `criterion_id` y conservan su `competency_v4_id`; los criterios legacy siguen usando su UUID propio. La foto queda en almacenamiento local privado y no se envía a proveedores.

**Consecuencia.** La evidencia esperada orienta la interfaz, pero no se transforma en observación ni assessment. `StudentContextService` conserva ambos catálogos con claves explícitas (`v4:<id>` y `legacy:<uuid>`), sin mappings inventados. La captura grupal sigue produciendo únicamente observaciones individuales que la docente decide registrar.

## ADR 028 Plan anual v4 como raíz de planificación

**Decisión.** `annual_plan` usa Sol/medium desde el router, guarda propuesta y metadata de auditoría reducida en `annual_plans`, y solo cambia a activo por confirmación docente. En local, el servidor retiene esa metadata tras un identificador opaco de generación hasta que se guarda el borrador; producción debe sustituir este handoff por auditoría durable y con control de acceso. Cada borrador nuevo usa `max(version)+1`; al confirmar se archiva el anterior activo dentro de la misma transacción. Las experiencias propuestas permanecen en el payload; no crean `learning_experiences`.

## ADR 027 Generación de activity desde Planificar

**Decisión.** La pantalla existente Planificar consume un endpoint del backend local para generar únicamente `activity`. El backend obtiene el aula y edad activa, crea el input v4, resuelve el plan, construye el provider con `createAIProviderForPlan` y devuelve solo la propuesta ya validada. La interfaz precarga datos disponibles, permite editar, descartar o regenerar, y no recibe claves, bundle, prompts ni metadata técnica.

**Compatibilidad curricular.** `annual_plan_competencies.competency_id` referencia UUIDs del catálogo heredado. No existe un mapping explícito y seguro desde los IDs semánticos v4, por lo que esa tabla queda sin poblar. La alineación futura mínima requiere una tabla de correspondencias versionada, revisada y con claves v4 antes de persistir competencias estructuradas.

**Consecuencia.** Una generación no crea ni confirma una actividad, competencia, criterio, evidencia o evaluación. La operación local actual no tiene un endpoint aprobado para crear actividades; por ello “Revisar y guardar” deja explícito que la propuesta sigue sin persistir hasta diseñar esa operación sobre la base existente. La metadata queda en el límite del backend para una futura auditoría, sin exponerla a la docente.
## ADR 026 Smoke controlado para OpenAI activity

**Decisión.** El único smoke real disponible usa `npm run smoke:openai-activity`, un input ficticio mínimo para `activity`, el plan central y `createAIProviderForPlan`. Si falta `OPENAI_API_KEY`, informa que no se ejecutó y termina sin invocar proveedor. El script muestra únicamente el resultado validado, el uso de tokens y el tiempo total.

**Consecuencia.** El equipo puede comprobar el camino completo con una llamada explícita y acotada, sin exponer claves, prompts, bundles completos, nombres, multimedia ni rutas privadas. Las pruebas automáticas inyectan factory y generador simulados, por lo que no consumen API ni generan costos.
## ADR 025 OpenAI aislado para generación v4 de actividades

**Decisión.** `OpenAIProvider` es una implementación intercambiable de `AIProvider` para los workflows habilitados por el router. Recibe únicamente un `AIContextBundle` inmutable, el schema `activity-v1` y el execution plan producido por `resolveAIExecutionPlan`. Usa la Responses API con Structured Outputs strict y toma la clave solo de `OPENAI_API_KEY`; el modelo y `reasoning_effort` se obtienen del plan central y cualquier discrepancia se rechaza.

**Consecuencia.** La respuesta conserva validación local, provenance y metadata de uso, sin enviar fotos, rutas privadas, multimedia ni input crudo. Errores de clave, autenticación, rate limit, timeout, respuesta incompleta, rechazo, JSON inválido o modelo inesperado son estados estructurados. Las pruebas usan un cliente simulado y no realizan llamadas de pago.

**Estado.** Histórico: la misma arquitectura v4 también habilita `annual_plan` desde ADR 028.
## ADR 024 Política central de routing de modelos

**Decisión.** `resolveAIExecutionPlan` decide de forma determinista el tier, provider, modelo y posibilidad de escalamiento antes de cualquier generación. Code resuelve tareas deterministas; TypeSafe queda reservado para decisiones estructuradas; Luna, Terra y Sol se asignan según complejidad. Ningún modelo ni provider puede escoger su propio routing.

**Consecuencia.** Los nombres de modelo viven en una sola política versionada y la generación de `activity` consume el plan sin acoplarse a un modelo. El escalamiento Luna → Terra → Sol queda permitido solo donde la política lo declara y no se ejecuta automáticamente.

## ADR 023 Generación de actividades mediante provider neutral

**Decisión.** La primera generación vertical de IA usa `generateAIWorkflowV4(input, options)`: prepara el bundle v4, entrega al provider inyectado una copia inmutable del `AIContextBundle` y valida una salida estructurada de actividad antes de devolverla. El provider no recibe el input crudo ni puede seleccionar conocimiento fuera del bundle.

**Consecuencia.** La selección de proveedor/modelo queda desacoplada de la Knowledge Base y se podrá configurar externamente sin cambiar el constructor de contexto. `activity` y `annual_plan` están habilitados; los otros 11 workflows permanecen fuera de la capa generativa.


**Estado.** Histórico: ADR 028 extiende esta arquitectura a `annual_plan`; no describe ya el único workflow habilitado.
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


## ADR 029 Project y Unit como experiencias v4 derivadas

**Decisión.** `project` y `unit` usan schemas estrictos, routing Sol/medium y se materializan solamente tras confirmación docente como `learning_experiences`. Una propuesta del plan anual se identifica por `annual_plan_id` y su índice final; un índice único evita duplicados. Las experiencias emergentes usan `origin = emergent`. La metadata queda detrás de un identificador opaco de generación y nunca llega al navegador.

**Consecuencia.** El plan anual sigue siendo una propuesta. Project y Unit conservan en `details` propósito, competencias v4, detonante o necesidad, caminos o situaciones, materiales, evidencia y flexibilidad para la futura creación de actividades. Esta fase no crea `activities`; workshop sigue pendiente.

## ADR 030 Activities v4 derivadas de experiencias confirmadas

**Decisión.** Las nuevas actividades docentes se crean únicamente como hijas de un `learning_experience` activo de tipo `project` o `unit`. El servidor vuelve a comprobar propiedad del aula, estado del parent, aplicabilidad y pertenencia de la competencia v4, fechas de experiencia y año escolar en generación, guardado, edición y confirmación. La salida `activity-v1` se persiste íntegra en `activities.details`; `generation_metadata` queda en servidor y se asocia mediante un identificador opaco de generación.

**Consecuencia.** La docente no vuelve a transcribir el contexto del Project o Unit. Los borradores se pueden reabrir y editar; las actividades activas son de solo lectura. `sequence` y `adaptations` se mantienen como arreglos vacíos y no se crean filas en `activity_criteria` ni evidencias: esos conceptos se resolverán en `criterion_and_evidence`, sin mapear IDs v4 al catálogo curricular legacy.

## ADR 031 Criterios v4 preparados desde actividades confirmadas

**Decisión.** `criterion_and_evidence` se genera solo para una Activity activa con competencia v4 confirmada. Su salida estricta se persiste en `activity_criteria.details`, con `competency_v4_id` y sin UUID artificial en `competency_id` ni `performance_id`. La docente confirma el criterio antes de que pueda usarse en un flujo posterior.

**Consecuencia.** El criterio y la evidencia esperada no registran una observación real ni crean filas en `evidences`. Las filas legacy siguen usando `competency_id` UUID; la migración permite ambos formatos. `evidence_capture` será el siguiente workflow.

## ADR 035 Informe familiar como comunicación derivada de conclusiones confirmadas

**Decisión.** `family_report` recibe solo las conclusiones descriptivas v4 activas y confirmadas del estudiante, completamente dentro del rango elegido y para las competencias seleccionadas por la docente. El servidor resuelve y anonimiza el contenido antes de crear el `AIContextBundle`; el proveedor recibe identidad neutral, sin UUID, fotos, rutas ni metadata técnica. La salida estricta `family-report-v1` conserva una sección por competencia y el estado de información suficiente o insuficiente.

**Persistencia.** `family_reports` guarda el contenido estructurado, periodo, versión y estado draft/active/archived. IDs de conclusiones, snapshot con huellas de contenido y metadata de generación permanecen en servidor. Guardado de nueva generación y confirmación revalidan fuentes; la confirmación archiva la versión anterior del mismo estudiante y periodo en una transacción. La edición manual conserva auditoría y fuentes; regenerar reemplaza ambas mediante un identificador válido. Migraciones local y Supabase preparan índices únicos parciales y RLS por estudiante.

**Consecuencia.** El informe confirmado queda inmutable y podrá alimentar un documento futuro sin regeneración. No se incorpora a `StudentContextSnapshot`: ya existen conclusiones confirmadas como fuente de continuidad y se evita que la comunicación familiar se convierta en nueva fuente de assessment. `material_generation`, PDF, despliegue y Supabase real siguen pendientes.

## ADR 036 Preparación local separada de autorización real

**Decisión.** El piloto local puede configurar un docente/aula nuevos y cargar niños sin SQL manual. `AYNI_LOCAL_TEACHER_ID` selecciona la identidad ficticia del proceso local; no se toma del navegador ni se considera Auth. Los datos pedagógicos se filtran por aula. El handoff de generación se guarda en PostgreSQL con TTL; fotos usan una interfaz de almacenamiento privado. La exportación de datos de menores exige habilitación explícita.

**Consecuencia.** RLS y Storage están definidos en migraciones, pero no probados contra Supabase. No se despliega el servidor local como backend real. Un API con Auth verificada por petición, aislamiento en staging, backups y prueba con dos docentes son condiciones para datos reales. Ver `docs/PRODUCTION_READINESS.md`.

## ADR 037 Recorrido docente guiado por estado persistido

**Decisión.** La interfaz responde a la próxima decisión de la docente con una acción principal y una continuación clara. Planificar ordena Plan Anual → Project/Unit → Activity → criterio; Evaluar orienta desde evidencias hacia análisis, conclusión e informe. Los estados del recorrido se derivan de registros del servidor, nunca de pestañas visitadas. Los formularios muestran primero preguntas esenciales y dejan detalles complementarios bajo demanda. La IA permanece como ayuda para preparar propuestas que la docente revisa y confirma.

**Consecuencia.** Al recargar, la docente puede retomar el borrador existente sin crear otro. Un borrador nuevo no oculta la versión confirmada aún válida. La navegación y las tarjetas de siguiente paso no alteran estados pedagógicos ni sustituyen la validación del servidor. Hoy sigue siendo la entrada cotidiana; el perfil del niño elige el paso válido según evidencias v4, análisis y conclusiones confirmados, sin ofrecer análisis v4 desde registros legacy. Las continuaciones de criterio, análisis y conclusión se muestran desde registros recargados, no solo tras hacer clic en Confirmar.

## ADR 038 Experiencias diagnósticas con elección libre de niños

**Decisión.** Una experiencia diagnóstica presenta una oportunidad de juego/observación, aspectos sencillos y competencias aplicables provenientes de la KB v4. El app muestra siempre a toda el aula por defecto; la docente elige libremente a quién observó. Se permiten cero, una o varias observaciones por niño y aspecto, también en días distintos. Los registros son acumulativos y usan los mismos estados conceptuales de `evidence_capture`, con fuente y competencia v4 explícitas. Los filtros y conteos de cobertura son orientativos, nunca niveles de logro. No se crea automáticamente un registro negativo para niños sin observación.

**Persistencia y seguridad.** `diagnostic_experience_observations` conserva la fuente diagnóstica sin fingir una Activity ni un criterio confirmado. El servidor valida docente, aula, niño, edad, experiencia, aspecto, aplicabilidad L2/Religión y estado; Supabase prepara RLS equivalente. StudentContext incorpora las observaciones, mientras valoración y revisión docente siguen separadas. El sistema legacy continúa disponible para lectura/compatibilidad. La reversión de la nueva UI consiste en volver a importar `GuidedDiagnostic` desde `profile-and-diagnostic.tsx`; los registros nuevos permanecen intactos.

## ADR 039 Síntesis diagnóstica versionada y distinta del assessment formativo

**Decisión.** La observación de una experiencia diagnóstica es un hecho docente append-only con catálogo versionado, competencia v4 y procedencia visible. No se inserta en `evidences`, que exige Activity y criterio confirmados y representa evaluación formativa posterior. Ambas fuentes comparten estados observacionales, pero conservan tablas, procedencia y usos distintos. “Aún no se observó” indica que hubo oportunidad sin la actuación descrita; “información insuficiente” indica que el registro no permite interpretación. No hay registro significa solamente falta de información.

**Revisión individual.** `diagnostic_competency_reviews` almacena un borrador editable y versiones confirmadas inmutables por niño y competencia. Preparar la propuesta organiza únicamente conteos y notas reales en código local; no llama a IA. La docente decide el estado informativo y redacta la interpretación. El servidor calcula el snapshot de fuentes y exige que permanezca igual al confirmar. Un cambio posterior requiere preparar una versión nueva; nunca altera la confirmada. `StudentContext` incluye solo la última síntesis confirmada como diagnóstico y conserva las observaciones por separado; un borrador no se convierte en hecho del niño. El assessment formativo sigue leyendo exclusivamente evidencias de Activity/criterio.

**Revisión grupal y planificación.** La vista grupal muestra cobertura por niños distintos y competencias aplicables, sin umbrales de logro ni ranking. Una revisión grupal requiere al menos una síntesis individual confirmada y conserva su propio snapshot. La docente escribe y confirma fortalezas, necesidades y prioridades; solo esa versión confirmada se ofrece como `diagnostic_summary` a la planificación, con nombres conocidos depurados. No se crean proyectos o niveles por porcentajes. Se puede seguir observando después de confirmar. El periodo diagnóstico carece de plazo automático. La información inicial opcional del niño es contexto, no evidencia ni fuente de la síntesis.

**Seguridad y reversión.** El servidor valida docente, aula, niño, competencia aplicable y fuentes en cada operación. Supabase habilita lectura RLS por aula, pero revoca escrituras directas autenticadas sobre tablas diagnósticas: la futura API con Auth verificada debe ser la única autoridad de escritura. Las migraciones y políticas requieren prueba de aislamiento en staging antes de usar datos reales. Para revertir la navegación, se puede volver a la UI diagnóstica anterior; las tablas y versiones permanecen para lectura histórica. Ninguna migración aplicada se edita.
