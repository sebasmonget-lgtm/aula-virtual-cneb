# Implementación migración y pruebas de aulas multiedad

Este plan del 22 de octubre de 2026 organiza la implementación sin modificar automáticamente aulas existentes ni publicar la propuesta. La base es `ae38b2c1317ed3a7ea9e78caf0d48b71835c531a`. La entrega inicial comprendió solo cuatro documentos; la autorización posterior inicia fases locales. El alcance implementado y sus límites se registran en [Primer flujo local de matrícula a informe](05_AVANCE_LOCAL_FASES_0_A_2.md).

Son dependencias el [modelo y los criterios](01_MODELO_Y_CRITERIOS.md), el [recorrido docente](02_RECORRIDO_DOCENTE.md) y los [contratos y prompts](03_CONTRATOS_Y_PROMPTS.md). Las fases de código, SQL, generaciones y publicación siguientes están pendientes. Ninguna casilla es una validación ejecutada salvo el registro final explícito de esta entrega documental.

## Límites de la primera implementación

Se conserva la ruta V1 para aulas actuales. Multiedad V2 se prueba inicialmente en una base local desechable con niños ficticios. No hay conversión masiva, cambio de cuentas o variables cloud, migraciones remotas, importación de datos reales, cambio de proveedor ni despliegue por el hecho de aprobar esta documentación.

El primer alcance usa grupo curricular confirmado manualmente y nacimiento opcional. No automatiza la fecha legal de corte ni reglas de admisión sin verificarlas. Mantiene quince tramos, una jornada común, talleres opcionales, ausencia de ciclo manual de ejecución, valoración docente y cierre por aula y período. No incorpora dirección institucional, varias docentes por aula, modo offline completo, notas por edad para un mismo niño ni exportación oficial a SIAGIE.

## Secuencia de trabajo y gates

| Fase | Trabajo | Condición de salida |
| --- | --- | --- |
| 0 | Fijar baseline de aplicación, datos sintéticos V1, catálogo oficial, descargas y prompts vigentes. Inventariar todos los lectores de edad. | Fixtures reproducibles, huellas y matriz de consumidores; diferencias históricas documentadas. |
| 1 | Crear migraciones nuevas de expansión, repositorios y resolvedor curricular V1/V2; seguridad y lectores de historial. | Upgrade y base nueva equivalentes, aislamiento real por docente y V1 sin cambios semánticos. |
| 2 | Completar un flujo vertical local V2: aula y matrícula, proyecto mínimo, actividad compartida con tres variantes, observación de un niño de cada grupo, evaluación, conclusión e informe. | Todos los enlaces por ID, referentes por edad y documentos coinciden; reintentos no duplican. |
| 3 | Ampliar a experiencias iniciales, cobertura y diagnóstico opcional, chat y quince tramos de Mi año. | Alcance niño/grupo/aula correcto y oportunidades por edad sin cuotas de logro. |
| 4 | Ampliar Biblioteca, reemplazo de propuestas, cambios futuros, talleres y recursos. | Herencia y protección de historia completas; contenido faltante se declara. |
| 5 | Completar lotes, Consolidado, Excel, cierre, reapertura y documentos históricos V1/V2. | Elegibilidad canónica, manifiestos, huellas y correcciones consistentes. |
| 6 | Añadir transición explícita de una aula V1 a V2 y recuperación operativa; revisar UX y pedagogía. | Ninguna conversión por lectura; cancelación sin escrituras; retorno seguro y muestra docente aprobada. |
| 7 | Ejecutar gates de código, seguridad, integración, generación, documentos y preservación. | Recibo identificable, sin fallos pendientes que afecten integridad o currículo. |
| 8 | Solo por solicitud expresa posterior, preparar staging separado y candidata del commit limpio. | Smoke, datos conservados, versión servida verificada y rollback ensayado antes de considerar producción. |

La fase 2 cierra un recorrido completo antes de abrir módulos adicionales. El proyecto mínimo de esa fase usa un blueprint fixture validado y un adaptador de generación V2; la generación real y la cobertura anual se validan en sus fases, sin simularlas como IA aprobada. No se habilita una experiencia remota parcial al terminar una fase local.

Cada unidad de código modifica el mínimo conjunto vertical, actualiza la documentación pertinente, ejecuta typecheck, lint, build y su prueba funcional, y deja rollback identificable. La fase 8 no está autorizada por esta solicitud.

## Mapa de implementación

Los archivos nuevos indicados son nombres propuestos. Antes de cada cambio se verifica su ubicación y las guías de la versión instalada en `node_modules/next/dist/docs/`; las convenciones aprendidas de Next no sustituyen esa lectura.

| Superficie | Archivos existentes principales | Cambio previsto |
| --- | --- | --- |
| Configuración y matrícula | `src/lib/pilot-onboarding-service.mjs`, `classroom-settings-service.mjs`, `student-import.mjs`, `scripts/local-db-server.mjs`; componentes `pilot-setup.tsx`, `students-screen.tsx`, `classroom-settings.tsx` | Resolver V1/V2, confirmar grupos, importar y corregir asignaciones sin mutaciones por GET. |
| Núcleo nuevo | `src/lib/classroom-curriculum-scope.mjs`, `student-curriculum-service.mjs`, `age-scoped-criteria.mjs` | Fuente única de grupos, revisión, destinatarios y selección inequívoca por IDs. |
| Catálogo y contexto | `knowledge-retrieval-v4.mjs`, `ai-focused-knowledge.mjs`, `ai-context-builder-v4.mjs`, `official-performance-references.mjs` | Adaptadores V2 por competencia y edad, preservando la ruta escalar V1. |
| Diagnóstico | `diagnostic-experiences-v4.mjs`, `diagnostic-assessment-v4.mjs`, `diagnostic-sources-v4.mjs`, `classroom-context-service.mjs`, `student-context-service.mjs` | Guías y síntesis por alcance; snapshots individuales con su asignación. |
| Año y conversación | `initial-journey-service.mjs`, `annual-classroom-snapshot.mjs`, `annual-journey-service.mjs`, `annual-journey-contract.mjs`, `annual-journey-jobs.mjs`, `project-conversation.mjs` | Composición explícita, fuentes por grupo, cobertura y cambios futuros conservados. |
| Proyecto y actividad | `project-flow-service.mjs`, `planning-contract-v3.mjs`, `project-v3-snapshot.mjs`, `activity-v3-snapshot.mjs`, `activity-observation-plan.mjs`, `pedagogical-blocks.mjs`, `ai-activity-ui-service.mjs` | Añadir dispatch V4, variantes y herencia por ID; quitar suposiciones de primera coincidencia solo en ruta nueva. |
| Criterios y evidencias | `criterion-version-service.mjs`, `ordinary-observation-service.mjs`, `ordinary-attribution-service.mjs`, `evidence-student-correction.mjs`, rutas de captura y revisiones | Edad en unicidad, asignación en captura, corrección con historia y RLS. |
| Jornada, talleres y calendario | `daily-state.mjs`, `school-calendar-service.mjs`, `workshop-ages.mjs`, `workshop-library-service.mjs`, `workshop-print.mjs` y componentes relacionados | Una jornada, destinatarios y variantes; asistencia filtrada con alcance explícito. |
| Evaluación y lotes | `period-evaluation-service.mjs`, `assessment-brief.mjs`, `assessment-master-service.mjs`, `scripts/period-evaluation-routes.mjs`, `period-batch-routes.mjs` | Grupo individual, contexto y huellas acotados; una valoración por niño y competencia. |
| Textos y cierre | `descriptive-conclusion-v4-service.mjs`, `family-report-v4-service.mjs`, `period-assessment-closure-service.mjs`, `period-closure-history.mjs` y handlers | Condiciones y manifiestos V2; notas, conclusiones e informes canónicos. |
| Exportación | `document-library-service.mjs`, `document-word-export.mjs`, `family-report-word.mjs`, renderers de anual/proyecto/actividad y Excel | Fuente curricular individual o multiedad y revisión de render separada. |
| Instrucciones | `skills/crear-plan-anual/`, `skills/crear-proyecto-unidad/`, `skills/crear-actividad/`, contratos en código y workflows directos | Paquetes V2 separados, incluidas reparación y realineación; V1 no cambia por accidente. |
| Esquemas y seguridad | `local-db/migrations/`, `supabase/migrations/`, `scripts/database-schema-parity.test.mjs` | Nuevas migraciones equivalentes, constraints, RLS, triggers y fixture de upgrade. |

El inventario de rutas incluye accesos históricos, consulta directa por URL, exportaciones y workers. Actualizar los componentes principales no basta si un endpoint secundario sigue tomando `classrooms.age_grade_id` como edad general de una aula multi.

## Plan de migración

### Expansión sin activar multiedad

Crear migraciones nuevas con IDs únicos y orden correspondiente a las convenciones de cada directorio; no copiar automáticamente la numeración de Supabase a PGlite ni editar una aplicada.

La primera migración añade columnas con defaults V1, tablas de grupos, versiones y asignaciones, políticas y permisos. Añade a observaciones guiadas, `ordinary_observations` y `evidences` la referencia nullable a asignación y protege su coherencia para escrituras V2. No rellena esas columnas en evidencias históricas. Los metadatos de captura se guardan en los snapshots actuales cuando ya existe el campo apropiado.

La expansión conserva `classrooms.age_grade_id NOT NULL` mientras todas las aulas siguen en V1. Añadir contratos V2 al lector no crea aulas multi. Los campos de criterio nuevos admiten V1 con edad NULL. Se crean índices alternativos con predicados por contrato y edad, conservando la unicidad antigua hasta que pueda sustituirse de manera validada.

No se hace backfill global de asignaciones docentes ni se reescriben notas, conclusiones, observaciones, cierres o documentos. Para V1 se usa la proyección de grupo heredado. Si una futura optimización requiere backfill técnico, tendrá dry run, origen `legacy_inherited`, conciliación y aprobación separados; no contará como confirmación individual.

### Preparación de contratos y colas

Se implementan lectores capaces, guardas V1/V2 y executores de la misma versión antes de admitir escrituras V2. Los trabajos nuevos fijan revisión, contrato, schema, prompt y huellas.

Se proponen colas físicas `multi_age_preparation_jobs` y `multi_age_period_jobs`, con propiedad del aula, leases, solicitudes idempotentes y resultado por etapa. Reutilizan helpers existentes de recuperación, sin crear otra fuente de verdad pedagógica. La separación evita que un worker antiguo que reclama toda una tabla ejecute payloads V2; una etiqueta JSON por sí sola no ofrece esa protección.

La migración crea las tablas, pero no registra cron ni habilita dispatch remoto. Las consultas de los workers V1 no deben alcanzar las colas V2. La respuesta del proveedor puede quedar en checkpoint privado; ningún criterio ni actividad parcial aparece como publicado.

### Transición estructural

Una segunda migración nueva ajusta índices y nullabilidad después de comprobar duplicados, defaults, triggers e integridad en la copia local. No elimina las restricciones de linaje o versión. Mantiene índices parciales V1 para edad NULL y V2 para actividad, competencia y edad, tanto activos como borradores.

Se permite `classrooms.age_grade_id = NULL` exclusivamente para multi V2 y se comprueba modo, grupos y revisión. Single conserva un grado válido. Estas operaciones son cambios de restricciones, no una afirmación de migración puramente aditiva. El orden de despliegue y las guardas son obligatorios porque un lector antiguo con inner join podría ocultar una aula multi.

La coherencia entre criterios, actividad, estudiante, aula y contrato requiere triggers o funciones transaccionales además de RLS. Se prueban tanto endpoints como escrituras directas con JWT. Las filas de una actividad no pueden mezclar contratos activos para evitar duplicados semánticos entre índices parciales.

### Activación por aula

La disponibilidad se decide en servidor. Se proponen controles separados de creación/transición, generación y escrituras V2, apagados por defecto, y allowlist de aulas de prueba. La interfaz consume capacidades devueltas por servidor; un valor del navegador no autoriza una operación.

Activar una aula nueva o convertir una existente es una transacción: bloqueo del aula, revisión esperada, composición, asignaciones confirmadas, snapshot, contrato y registro de solicitud. Si falla un elemento, revierte toda la activación. Las actividades y documentos confirmados anteriores permanecen en su contrato. Una versión futura compatible se prepara aparte antes de nuevas capturas guiadas V2.

Desactivar creación o generación no envía las aulas existentes a V1. Los lectores V2 e historial permanecen disponibles. La política de captura durante una incidencia se especifica en el rollback.

### Verificación y conservación

Antes y después del ensayo se comparan filas fuente y huellas de todos los registros de fixtures V1, textos literales, niveles, asociaciones, archivos y manifiestos. Se distinguen columnas nuevas con default y tablas nuevas de una modificación de contenido pedagógico. Las cachés derivadas permitidas se registran por separado.

El esquema se prueba desde cero y mediante upgrade sobre baseline con versiones antiguas, criterios archivados y borradores, observaciones libres y guiadas y un bimestre cerrado. Se comprueba equivalencia funcional entre migraciones locales y Supabase en un entorno SQL aislado. PGlite no certifica por sí solo Auth, Storage ni RLS de Supabase real.

## Pruebas funcionales y de seguridad

Todos los casos siguientes son pruebas por implementar o ejecutar en sus fases. Los nombres son identificadores de aceptación, no resultados obtenidos.

| ID | Escenario | Comprobación requerida |
| --- | --- | --- |
| M01 | Aulas 3–4, 3–5, 4–5 y 3–4–5; single como control | Edades exactas sin promedio, edad faltante ni grupo adicional. |
| M02 | Nacimiento desconocido con grupo confirmado | Matrícula válida, sin fecha inventada ni análisis con edad adivinada. |
| M03 | Niño cumple años o reloj cambia de fecha | Grupo, criterios, huellas curriculares y notas conservados. |
| M04 | Matricular antes o después de planificar | Composición prevista y real diferenciadas; revisión futura acotada. |
| M05 | Importación, reenvío y pérdida de acuse | IDs y grupos correctos, atomicidad e idempotencia. |
| M06 | Ingreso tardío, retiro, recuperación y otro año | No borrar historia ni fusionar alumnos; nueva matrícula confirma grupo. |
| C01 | Tres variantes de una competencia | IDs distintos, unicidad por edad y ninguna primera coincidencia ambigua. |
| C02 | Dos competencias por tres edades | Conteos de familias y variantes correctos, momentos y evidencias propios. |
| C03 | Referente de otra competencia o edad; referencia inexistente | Rechazo en servidor sin guardar salida inválida. |
| C04 | Falta de desempeño específico | Referente de ciclo explícito, sin copiar otra edad ni excluir automáticamente competencia. |
| C05 | Igual texto pertinente para dos edades | Variantes trazables sin diferencia artificial ni deduplicación por texto. |
| C06 | Actividad dirigida solo a un grupo | Destinatarios y cobertura correctos sin eliminar la competencia del recorrido de los otros. |
| O01 | Captura de un niño por cada grupo | Criterio, asignación y momento exactos tras guardar y recargar. |
| O02 | Filtro, búsqueda y actualización asíncrona de cobertura | Niño seleccionado y posiciones estables; texto y grupo siempre visibles. |
| O03 | Corrección de niño entre edades | No cambiar solo `student_id` dejando criterio incompatible; conservar motivo y restricciones de medios y cierre. |
| O04 | Corrección retroactiva de grupo | Nueva revisión, huellas afectadas, texto original intacto y cierre protegido. |
| O05 | Observación libre y asociación docente | Conservar hecho sin inventar criterio; asociación por competencia no fabrica variante. |
| O06 | Nota que menciona compañero o familia | Actor correcto en análisis y conclusión; sin clonar evidencia grupal. |
| P01 | Aula con edades desiguales y pocos registros | No generalizar el grupo numeroso ni inventar interés o dificultad. |
| P02 | Año de quince tramos y sustitución de propuesta | Fechas y propuestas protegidas; cobertura por destinatarios. |
| P03 | Proyecto con profesora sola | Organización viable, recursos confirmados y oportunidades propias de todos. |
| P04 | Guía diaria heredada y realineación autorizada | Mismos IDs y referentes; cambios futuros no alteran lo trabajado. |
| P05 | Taller con una adaptación faltante | No sustituir por otra edad ni afirmar compatibilidad completa. |
| E01 | Análisis, nota, conclusión e informe de cada grupo | Un par niño/competencia, referente correcto y nivel solo docente. |
| E02 | Evidencia escasa suficiente o insuficiente | No exigir mínimos numéricos inventados ni convertir falta en C. |
| E03 | Cambia entrevista o grupo de otro niño | Invalidación limitada; no regeneración indiscriminada de notas. |
| E04 | Filtro en Informe a familias | Elegibilidad del servidor para el período completo, no solo de filas visibles. |
| E05 | Estadísticas de actividad y evaluación | Denominadores y estados definidos; sin confundir destinatarios con toda la matrícula. |
| H01 | Cierre, reapertura, corrección y recierre | Manifiestos versionados con grupos y fuentes; histórico anterior inmutable. |
| H02 | Documento histórico después de cumpleaños o corrección | Misma edad curricular y contenido del snapshot original. |
| J01 | Recarga, timeout y respuesta incierta | Consulta del mismo ID, sin generación paralela ni duplicados. |
| J02 | Contexto cambia durante generación | Rechazo de publicación obsoleta; resultados parciales conservados. |
| J03 | Worker antiguo y nuevo simultáneos | Aislamiento físico; ningún consumidor V1 reclama V2. |
| J04 | Reparación omite una edad o cambia referencia | Rechazo sin degradar contrato ni perder tarea original. |
| S01 | Dos docentes y IDs cruzados | RLS y API rechazan lectura, captura, cambio, exportación y FK cruzados. |
| S02 | Cliente falsea edad, contrato, capacidades o revisión | Servidor resuelve autoridad; conflicto sin escritura parcial. |
| S03 | Evidencias privadas y trazas | Cero envío automático de medios o nacimiento completo; sin secretos en logs. |
| D01 | Word anual, diagnóstico, proyecto, actividad, taller y familia | Pantalla y documento con mismas variantes, fuentes y textos confirmados. |
| D02 | Excel conjunto y por grupos | Niveles y conclusiones literales, filtros correctos, impresión legible. |
| U01 | Escritorio y móvil, nombres largos, aula grande y grupo vacío | Sin selección ambigua, pérdida de texto, desbordamiento ni controles inaccesibles. |
| R01 | Base V1, flags apagados y lectores nuevos | Misma conducta, fuentes, notas, documentos y número de llamadas IA ante las mismas acciones. |
| R02 | Upgrade y restauración | Sin pérdida de filas, medios, políticas, versiones o vínculos. |
| R03 | Desactivar multiedad después de escrituras V2 | Lectura e historia conservadas, trabajos pausados, captura libre segura y rechazo de fallback V1. |

Cada caso se vinculará a un test automatizado, recorrido funcional, render o revisión pedagógica identificados. Se registran fixture, comando, fecha, resultado y límites de la prueba; no se marca un caso como aprobado por aparecer en esta tabla.

## Calidad de prompts y pruebas de generación

Primero se usan proveedores simulados y salidas adversas: referencia cruzada, variante ausente, campo adicional, ID inventado, texto truncado, grado sugerido y recursos inexistentes. Luego se ensayan proveedores reales con datos sintéticos y presupuesto expresamente establecido para esa campaña.

Se conservan los modelos, esfuerzo y rutas vigentes. Se mide una y tres edades para contexto, proyecto, actividad y evaluación individual, distinguiendo tiempo, tokens, reparaciones y costo desconocido. La calidad mínima exige cero cruces de edad o actor en la muestra aprobada y revisión docente de criterios y viabilidad; es un gate de la muestra, no una garantía estadística universal.

No se acepta una salida por JSON válido solamente. Se revisan también el contenido reparado, su herencia, pantalla y documento. La revisión pedagógica debe incluir a una docente con experiencia multiedad; no se sustituye por un porcentaje automático de semejanza textual.

## Comandos y recibos de validación

En cada fase de aplicación se ejecutan, desde un entorno local autorizado y sin comandos de publicación:

```powershell
node node_modules/typescript/bin/tsc --noEmit
npm run lint
npm run build
node --test scripts/database-schema-parity.test.mjs
```

La prueba de paridad aplica migraciones en motores temporales; no se apunta a una base de aula real. La suite funcional añade las pruebas existentes pertinentes de contexto, criterios, snapshots, diagnóstico, talleres, evaluación, documentos y cierre, además de los casos V2. Si se modifica la integración del framework se valida también la variante Next que el proyecto requiera, usando las guías instaladas y su script actual, sin asumir un comando heredado.

El recibo por fase contiene commit base y diff, archivos, comando y exit code, fixture, huellas antes/después, versiones de contrato/prompt, resultados reales y límites. El recibo de una futura candidata añade commit servido y smoke de su destino. Un push no equivale a despliegue y los recibos históricos no prueban la versión actual.

## Rollback y tratamiento de incidentes

| Momento | Acción segura | Acción excluida |
| --- | --- | --- |
| Solo documentación | Retirar o revisar estos documentos y sus entradas de propuesta. | Presentarlo como rollback de una implementación inexistente. |
| Esquema expandido, sin escrituras V2 | Apagar controles V2 y volver al código V1 compatible tras verificar datos y defaults; conservar tablas añadidas. | Borrar datos o editar migraciones ya aplicadas. |
| Ya existen matrículas, criterios o jobs V2 | Volver a una versión compatible con lectores V2; bloquear transición y generación, pausar jobs y conciliar resultados. | Desplegar un lector V1 que oculte el aula o usar una edad ficticia de fallback. |
| Fallo de generación | Conservar checkpoints y fuentes, detener la publicación afectada y retomar desde resultado identificado. | Repetir a ciegas solicitudes de resultado incierto o publicar variantes incompletas. |
| Error de asociación o grupo | Preservar RAW, revisar versión, motivo y dependencias; reabrir si afecta cierre. | Reasignar evidencia o sobrescribir notas confirmadas silenciosamente. |

La versión de recuperación V2 debe permitir consulta e historial. Durante un bloqueo de interpretación se puede conservar captura libre con su contexto conocido; no se habilita captura guiada con criterio dudoso ni nuevas valoraciones con fuentes incompatibles. El servidor indica las capacidades disponibles en lugar de hacer fallback V1.

Se prueba restauración en copia aislada antes de activar. Se conserva un respaldo consistente de datos y medios y el manifiesto de migraciones; restaurar una copia local no certifica recuperación cloud. Los incidentes reales se registrarán en `docs/ERRORS_AND_FIXES.md` con síntoma, causa, solución validada y prevención; las restricciones actuales de diseño no se presentan como fallos ya corregidos.

## Gates para una publicación futura

- [ ] Implementación completa del recorrido V2 y conservación de V1, con árbol limpio y commit identificable.
- [ ] Migraciones nuevas revisadas, paridad y upgrade comprobados, RLS real con dos docentes en staging aislado.
- [ ] Matriz funcional aplicable aprobada, revisión pedagógica de muestra y límites identificados.
- [ ] Typecheck, lint, build y regresiones pertinentes correctos.
- [ ] Word y Excel renderizados, comparados y revisados en escritorio y móvil.
- [ ] Trabajos y consumidores aislados, recuperación y rollback compatibles ensayados.
- [ ] Huellas de fuentes y archivos de aulas de control conservadas; sin datos de menores en trazas de ensayo.
- [ ] Presupuesto y condiciones de cualquier ensayo real de IA explícitos.
- [ ] Solicitud expresa nueva para publicar; candidata del commit limpio, staging y smoke antes de cualquier promoción.

## Registro de la entrega documental inicial

Estado inicial: base `ae38b2c`; sin diferencias tracked y con `.impeccable/critique/` y `output/` no versionados preexistentes, fuera del alcance. Se crean cuatro documentos de diseño y se registra la propuesta en memoria y decisiones. No se añaden migraciones, prompts activos, flags, cuentas, datos ni cambios de aplicación.

Comprobaciones locales ejecutadas el 22 de octubre de 2026:

| Comprobación | Resultado observado |
| --- | --- |
| Entregables y enlaces | Cuatro documentos; 14 enlaces locales resueltos. |
| Ejemplo estructurado | Un bloque JSON válido; tres variantes sin edad duplicada. Los tres IDs de desempeño coinciden con edad y competencia en el catálogo local. |
| Plan de aceptación | 43 casos identificados y pendientes de implementación; no se presentan como pruebas V2 aprobadas. |
| `node node_modules/typescript/bin/tsc --noEmit` | Exit 0. |
| `npm run lint` | Exit 0; cero errores y una advertencia preexistente de dependencia de `useEffect` en `diagnostic-generation-control.tsx`. |
| `npm run build` | Exit 0; build Vinext completo. Avisos del bundler por `eval` en PGlite, tamaño de chunks y clasificación estática de rutas; sin modificar dependencias ni configuración. |
| Revisión de alcance | Solo cuatro documentos nuevos y entradas de propuesta en memoria y decisiones; aplicación, SQL, prompts activos y configuración conservados. |

La prueba funcional aplicable a esta entrega es la integridad documental y de los ejemplos. No se ejecutan migraciones, generaciones, recorridos V2 ni validación cloud, porque todavía no existe implementación V2 y la solicitud excluye afectar aulas y publicar. La revisión de Git incluye comprobar que los elementos no versionados preexistentes permanecen fuera del alcance.
