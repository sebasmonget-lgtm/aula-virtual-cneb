# Modelo de datos y criterios para aulas multiedad

Este diseño permite atender 3, 4 y 5 años en una misma aula y mantener la relación entre cada niño, sus referentes curriculares, el criterio de la actividad y la evidencia observada. El diseño inicial del 22 de octubre de 2026 se basa en `ae38b2c1317ed3a7ea9e78caf0d48b71835c531a`. Su implementación local posterior y las partes pendientes se distinguen en [Primer flujo local de matrícula a informe](05_AVANCE_LOCAL_FASES_0_A_2.md); las aulas reales continúan sin activación multiedad.

Los otros entregables definen el [recorrido docente](02_RECORRIDO_DOCENTE.md), los [contratos y prompts](03_CONTRATOS_Y_PROMPTS.md) y la [implementación con migración y pruebas](04_IMPLEMENTACION_MIGRACION_Y_PRUEBAS.md). Las decisiones de estos documentos son el diseño objetivo; la arquitectura instalada sigue siendo la del código base hasta implementar y validar cada fase.

## Alcance pedagógico

Un aula multiedad reúne grupos curriculares distintos. La condición unidocente describe la atención a cargo de una profesora y puede incluir responsabilidades institucionales; activar multiedad no concede permisos administrativos nuevos. Ayni registrará edades atendidas y condiciones de acompañamiento por separado. No inferirá ruralidad, lengua, recursos, dificultades ni disponibilidad de auxiliares.

La organización conserva un año, proyectos y actividades compartidos, con oportunidades dirigidas a todos o a determinados grupos. Los apoyos individuales no se deducen solamente de la edad. La nota continúa correspondiendo a niño, competencia y período; las variantes de criterio no multiplican las notas.

## Restricciones actuales que deben cambiar

| Evidencia local | Restricción actual | Consecuencia para el diseño |
| --- | --- | --- |
| `src/lib/pilot-onboarding-service.mjs` y `classroom-settings-service.mjs` | Edad única 3, 4 o 5; un aula activa por docente. | Conservar el aula única y ampliar su composición. |
| `supabase/migrations/202609200001_initial_cneb.sql` | `classrooms.age_grade_id` obligatorio; el estudiante pertenece a un aula. | El grupo curricular individual debe quedar registrado dentro de esa matrícula anual. |
| `supabase/migrations/202609240005_criterion_versions.sql` | Un criterio activo y un borrador por actividad y competencia. | Incorporar edad y contrato a la unicidad sin eliminar las restricciones históricas. |
| `src/lib/project-flow-service.mjs` | Un criterio general por competencia y validación con edad única. | Agrupar variantes por competencia y validarlas individualmente por edad. |
| `src/lib/project-v3-snapshot.mjs`, `activity-v3-snapshot.mjs` y `pedagogical-blocks.mjs` | Algunos enlaces se resuelven buscando solo la competencia. | Resolver variantes por sus IDs y edad; nunca elegir la primera coincidencia. |
| `src/lib/period-evaluation-service.mjs` y `scripts/period-batch-routes.mjs` | Alcance común del aula y análisis con su edad general. | Calcular destinatarios, referentes y contexto individual explícitos. |

Estas son limitaciones para la ampliación, no defectos del contrato actual de una sola edad.

## Decisiones de compatibilidad

1. Las aulas actuales conservan contrato curricular 1, sus IDs, datos y ruta de servicios. No se convierten por abrir una pantalla, cumpleaños, lectura o despliegue.
2. El contrato curricular 2 requiere activación explícita por aula. En la primera entrega se habilita únicamente en fixtures locales; el acceso remoto permanece apagado.
3. El contrato 1 puede proyectar la edad del aula como grupo heredado, identificado como `legacy_inherited`; no crea una confirmación docente individual ficticia.
4. Multiedad no utiliza edad promedio, mínima, máxima ni un grado ficticio 6. En el contrato 2 se consulta la composición explícita.
5. Las fuentes CNEB y sus IDs se conservan. La ampliación agrega relaciones y contratos de aplicación, sin editar el texto oficial ni migraciones aplicadas.
6. Los registros históricos se leen con su contrato original. La adaptación para consulta no reescribe sus snapshots.

## Matrícula y edad curricular

El dato obligatorio para una matrícula nueva multiedad es el grupo curricular confirmado de 3, 4 o 5 años. La fecha de nacimiento es recomendable, pero no obligatoria cuando se conoce y confirma el grupo. La regla legal anual de corte se debe verificar antes de automatizar sugerencias desde nacimiento; el primer alcance usa selección docente explícita y no incorpora una fecha de corte supuesta.

Un cumpleaños cambia la edad cronológica y los avisos, no el grupo curricular. El año siguiente crea o utiliza la matrícula de ese año y solicita su grupo; no incrementa automáticamente el anterior ni fusiona estudiantes por nombre.

Para un aula aún sin nómina, las edades atendidas son una previsión confirmada de la profesora; los conteos de niños permanecen desconocidos o en cero según el estado real. Una edad atendida sin niños no genera notas ni informes ficticios.

### Entidades y campos propuestos

Los nombres siguientes son el contrato objetivo; el SQL ejecutable se creará después, en las migraciones nuevas descritas en el entregable 4.

| Entidad | Datos nuevos | Regla |
| --- | --- | --- |
| `classrooms` | `age_mode`, `curriculum_contract_version`, `curriculum_revision` | Por defecto `single`, 1 y 1 para filas existentes. Contrato 2 reconoce modo `single` o `multi`. |
| `classrooms.age_grade_id` | Nullabilidad controlada en la fase de transición | Contrato 1 y modo single mantienen el grado actual. Multi usa NULL una vez habilitados todos los lectores; no se mantiene una edad ficticia de compatibilidad. |
| `classroom_age_groups` | `id`, `classroom_id`, `age_grade_id`, `status`, fechas | Una relación por aula y grado de Inicial de 3, 4 o 5. Retirar un grupo conserva sus referencias históricas. |
| `classroom_curriculum_versions` | Aula, año, revisión, modo, grupos, contexto de acompañamiento, autor y fecha | Snapshot inmutable de cada configuración confirmada. La revisión de `classrooms` se actualiza en la misma transacción. |
| `student_curriculum_assignments` | ID, estudiante, aula, año, `age_grade_id`, revisión, estado, origen, vigencia, autor, fecha, motivo y versión anterior | Una asignación activa por matrícula; contenido confirmado inmutable y transición de estado auditada. |
| `activity_criteria` | `curriculum_contract_version`, `curricular_age`, `criterion_family_id` | Contrato 1 conserva edad NULL. Contrato 2 exige edad válida e identidad de familia. Cada variante tiene su propio `id`, `lineage_id` y versión. |
| JSON canónico del proyecto y actividad | Contrato V4, participantes, familias de criterios, variantes y referencias explícitas | No sustituye los DTO V3 actuales ni cambia registros confirmados. |
| Observaciones nuevas de contrato 2 | `curriculum_assignment_id` nullable por compatibilidad y snapshot de captura | Nuevos registros guiados V2 requieren asignación; la captura libre de un caso legado pendiente puede conservar el hecho sin interpretación por edad. |
| Evaluaciones y documentos | Snapshot curricular versionado dentro de sus detalles y manifiestos | Incluye asignación individual, edad, criterios y fuentes utilizados; no recalcula históricos desde la matrícula actual. |

`student_curriculum_assignments` amplía la matrícula que ya representa `students.classroom_id`; no introduce una segunda lista de alumnos. Toda FK debe comprobar coherencia de estudiante, aula y año, además de la existencia del ID.

### Restricciones de integridad

- Modo single tiene un grupo; multi tiene dos o tres grupos distintos. Solo se aceptan grados oficiales de Inicial de 3, 4 y 5 años.
- La asignación activa de un niño pertenece a un grupo activo de su aula y a su año escolar.
- La activación multiedad exige asignaciones confirmadas de todos los niños activos. Las inferencias legadas se presentan para confirmación, no se confirman por defecto.
- Para retirar un grupo con niños activos, se resuelve primero su matrícula. No se borran grupos con historia.
- Cada cambio compara `expectedRevision`, bloquea el aula en la transacción y es idempotente por solicitud y contenido.
- Los cambios retroactivos que afectan un cierre requieren su reapertura con motivo. Un retiro administrativo no elimina a un niño de manifiestos cerrados.
- Las escrituras nuevas V1 se rechazan si el aula o actividad ya requieren V2. Las escrituras nuevas V2 no pueden producir criterios sin edad ni volver a V1.

## Criterios por edad

Se propone extender `activity_criteria` con una fila por variante y conservar sus FK actuales. Esta opción permite que una evidencia continúe apuntando al ID exacto del criterio. Una tabla secundaria de variantes exigiría transportar un segundo ID por todos los consumidores; queda descartada para el primer alcance por esa duplicidad de identidad.

Una familia agrupa las variantes de una competencia dentro de un proyecto o actividad. La familia general del proyecto y la familia diaria son distintas; cada variante diaria conserva la referencia explícita a la variante general de la que procede. `competency_id` y `criterion_family_id` sirven para agrupar, nunca para reemplazar el ID de variante.

La regla de unicidad nueva será:

- V1 activo o borrador: una fila por actividad y competencia, con edad NULL.
- V2 activo o borrador: una fila por actividad, competencia y edad.
- Las restricciones de `lineage_id`, versión, inmutabilidad y borrador sucesor se conservan. Una variante de 3 años no puede suceder a una de 5.
- Una actividad no mezcla criterios activos V1 y V2. Los índices parciales y una guarda transaccional o trigger verifican esa coherencia.

Un criterio común con la misma redacción puede producir variantes de igual texto y diferentes IDs y referentes. Esto expresa la correspondencia curricular sin inventar diferencias. Una actividad dirigida a un grupo solo requiere variantes de los destinatarios de esa oportunidad; no obliga a evaluar todas las competencias en todas las edades cada día.

### Contenido de cada variante

| Campo | Contenido y validación |
| --- | --- |
| Identidad | ID, familia, competencia, edad, versión, linaje y variante fuente cuando es heredada. |
| Criterio | Actuación observable y pertinente al propósito; sin niveles ni hechos inventados. |
| Evidencia esperada | Qué podría registrarse, diferenciada de una observación efectivamente realizada. |
| Momentos | Inicio, desarrollo o cierre; la guía debe ofrecer la actuación en el momento indicado. |
| Referentes | IDs oficiales de la misma competencia y edad, versión del catálogo y página. |
| Referente de ciclo | Estado explícito cuando no hay desempeño específico para esa edad; no se toma otra edad. |
| Participación y apoyos | Formas posibles de participar; apoyos previstos separados de los realizados. |

La matriz curricular se obtiene del catálogo versionado y la KB, no de comparaciones de palabras. Distingue pertenencia al ciclo, existencia de desempeños y condiciones especiales como Castellano L2 o Religión. La ausencia de un desempeño específico no equivale a competencia no aplicable.

### Ejemplo de una actividad compartida

Actividad ilustrativa: conversar después de escuchar un relato oral realmente disponible. Los criterios siguientes son paráfrasis de planificación propuestas, no citas oficiales ni una progresión obligatoria para todos los niños. La profesora revisará su pertinencia antes de confirmarlos.

| Grupo | Criterio posible | Referente del catálogo local |
| --- | --- | --- |
| 3 años | Al conversar sobre el relato, menciona personajes o vuelve a contar una parte que recuerda con sus propias palabras. | `PCI2016.COM_ORAL.3.03`, página impresa 118. |
| 4 años | Al conversar sobre el relato, recupera personajes y algunos hechos, o cuenta una parte con sus propias palabras. | `PCI2016.COM_ORAL.4.03`, página impresa 119. |
| 5 años | Al conversar sobre el relato, recupera personajes, algunos hechos y lugares, o cuenta una parte con sus propias palabras. | `PCI2016.COM_ORAL.5.03`, página impresa 119. |

La guía compartida no se convierte en tres interrogatorios. No exige todas las alternativas a cada niño ni atribuye una dificultad a quien no intervino. Una actuación de otro niño no acredita la del seleccionado. Los apoyos de participación pueden variar individualmente sin cambiar su grupo de matrícula.

## Captura y correcciones

Al guardar una observación guiada V2, el servidor resuelve la asignación del niño y valida la variante exacta, sus destinatarios, estado y versión. Ignora la edad enviada como autoridad por el navegador. Conserva texto original, instante y día pedagógico, asignación, criterio y fuentes de captura.

La observación libre puede carecer de criterio. Su atribución posterior a una competencia sigue siendo revisable y no inventa una variante. La falta de un criterio no impide conservar un hecho ni lo convierte en evidencia de todas las edades.

Corregir el grupo crea una nueva revisión de matrícula. El registro antiguo conserva su asignación original. Los borradores dependientes quedan pendientes de revisión; las notas y textos confirmados no se sobrescriben. Una evidencia vinculada a una variante de otra edad no se religa automáticamente. La docente podrá revisar su pertinencia por un flujo explícito que conserva el hecho y la atribución anterior; hasta resolverlo no alimenta automáticamente un análisis con un referente incompatible.

Al corregir el alumno de una observación se comprueban ambas matrículas, edades, variantes y cierres. El flujo actual de corrección de alumno debe conservar sus restricciones de medios privados y valoraciones confirmadas. Nunca se clona el mismo hecho como actuación individual de toda el aula.

## Evaluación y vigencia

La clave de valoración sigue siendo niño, competencia y período. Se separan oportunidad prevista, participación observada, evidencia disponible y valoración docente. Una actividad para 5 años no crea por sí sola un criterio pendiente para 3; la competencia puede seguir correspondiendo al ciclo y tener otras oportunidades pertinentes para ese niño.

Las estadísticas distinguen conteos de participantes destinatarios de una actividad, niños matriculados y pares evaluativos relevantes. No usan el total del aula como denominador de una oportunidad destinada a un subgrupo. La falta de registro, ausencia o falta de oportunidad no produce una nota C ni una dificultad.

| Cambio | Derivaciones que deben revisarse | Datos preservados |
| --- | --- | --- |
| Grupo curricular de un niño | Borradores de ese niño, pertinencia de criterios, análisis, conclusión e informe dependientes. | Hechos originales, fuentes, notas confirmadas y cierres. |
| Composición del aula | Snapshot y propuestas futuras dependientes, talleres pendientes y cobertura por edad. | Actividades trabajadas y análisis de otros niños cuyo contexto individual no cambió. |
| Variante de un criterio | Versiones futuras y borradores que citan esa variante. | Observaciones y documentos que citan la versión anterior. |
| Cumpleaños o preferencia visual | Edad cronológica o vista; sin cambio curricular. | Referentes, criterios y evaluaciones. |
| Entrevista familiar | Contexto de planificación o recomendaciones familiares dependientes. | Evidencias y notas. |

Las huellas deben incluir asignación y revisión, variante, catálogo curricular, contrato y versión de prompts cuando corresponda. La composición completa del aula no invalida indiscriminadamente cada análisis individual. La huella documental añade revisión de render y conserva descargas históricas.

## Seguridad y condiciones de aceptación

RLS y servidor comprueban propietario del aula, matrícula, año, actividad, variante y documento. Las tablas nuevas reciben políticas de lectura y escritura equivalentes a la propiedad existente y triggers para relaciones e inmutabilidad que RLS no resuelve por sí sola. Conocer un ID o modificar un filtro no concede acceso. Se prueba también escritura directa con JWT de otra docente y el rol de backend.

Antes de usar V2 deben estar implementados lectores V1 y V2, selección inequívoca de variantes, historial, correcciones, huellas y exportación. Una edad desconocida no toma silenciosamente la del aula multiedad. No se envían fotos, audio ni fecha completa de nacimiento a IA por activar este contrato.

## Fuentes

- [Programa Curricular de Educación Inicial](https://www.minedu.gob.pe/curriculo/pdf/programa-curricular-educacion-inicial.pdf). El catálogo local `curriculum/official/initial-performances-v1.json` fija la versión `pci-inicial-2016-performances-v1`, IDs, páginas y hash de fuente.
- [Guía de orientación para desarrollar proyectos de aprendizaje en Educación Inicial](https://repositorio.minedu.gob.pe/handle/20.500.12799/6517). Referencia de proyectos en aulas de una edad y multiedad; las decisiones de datos y software de este documento son propias de Ayni.
- [Memoria vigente](../PROJECT_MEMORY.md) y [decisiones del proyecto](../DECISIONS.md). Los documentos históricos como `DATA_MODEL.md` se usan como antecedentes, no para restituir ciclos de inicio y cierre retirados posteriormente.
