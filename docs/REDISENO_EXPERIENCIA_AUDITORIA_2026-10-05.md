# Ayni: auditoría del recorrido y propuesta de transición

Fecha: 5 de octubre de 2026, America/Lima. Solicitud: ejecutar `ayni_rediseño_experiencia.md`. Este documento entrega la revisión previa y la propuesta que el adjunto exige antes de implementar cambios grandes. Las propuestas siguientes no son decisiones ya adoptadas ni funcionalidades implementadas.

## Base comprobada y alcance

- Checkout principal: `codex/annual-year-map`, inicialmente limpio, HEAD `26243480546e4d64fd5047e3ea0a12fc9ab4762b`.
- Se ejecutó `git fetch origin --prune`. HEAD coincide exactamente con `origin/codex/qa-ayni-v2`. `origin/codex/annual-year-map` sigue en `055c77e`; sus 18 commits posteriores están en la rama QA. No se confundió esa referencia atrasada con la versión actual ni se hizo merge/push.
- Se revisaron memoria, decisiones y errores, el Plan Maestro de transición, informes QA recientes y el código de navegación, diagnóstico/conversación, año/calendario, proyectos, actividades, evaluación, versiones, generación y documentos. Se contrastaron servicios, entradas HTTP, componentes y pruebas. Esto es una auditoría de código con integración local, no un nuevo recorrido anual completo en navegador ni una comprobación del deployment actualmente servido.
- No se modificó código de producto, bases docentes, cuentas, migraciones, modelos ni plantillas. No hubo llamadas pagadas ni publicación. Las verificaciones usan pruebas existentes con proveedores simulados y bases ficticias; el contraejemplo de calendario usa PGlite en memoria.

### Los 18 commits posteriores a la referencia consolidada

| Commits | Cambio revisado y consecuencia para esta solicitud |
| --- | --- |
| `ba92b39`, `78fb4a6`, `b142a90` | Recorrido anual V2, snapshot, contrato pedagógico, calendario, confirmación y Word; base que debe reutilizarse. |
| `18138c8` | Checkpoints privados y recuperación de preparación anual; patrón reutilizable para proyectos, sin worker autónomo. |
| `e09b16e`, `3d5f322`, `41752e6`, `f80e1a0` | Conversación breve, fotos privadas, observaciones revisables, matriz y bridge HTTP; conservar privacidad, revisiones e intención literal. |
| `1c8ed10`, `60f40a3`, `4b65004` | Restauración del mapa y recursos visuales; conservar la línea de tiempo y sus componentes. |
| `a76edda`, `1600b03` | Editor de quince slots, biblioteca, swaps y alcance local/global; fundamentos del nuevo recorrido y compatibilidad histórica. |
| `f7e3f89`, `071e8a8` | Recuperación de candidatas y conservación de competencias docentes; reutilizar creación de una sola propuesta. |
| `457fee6`, `6c5c32f`, `2624348` | Turnos persistidos, tema vigente, revisión recuperable, captura contextual y preguntas acotadas; no reintroducir pérdida de intención ni respuestas antiguas. |

Los informes de QA anteriores contienen resultados de otras fechas y autorizaciones de otras ejecuciones. No se trasladan sus autorizaciones de publicación ni sus resultados visuales a esta auditoría.

## Cómo funciona actualmente, en palabras simples

La profesora configura el aula y registra niños. Puede recoger entrevistas familiares y observaciones; esas fuentes conservan su origen. La entrada recomienda diagnóstico cuando falta un año y el diagnóstico no está revisado, aunque el nuevo recorrido anual permite preparar sin completar ese trámite.

En Mi año, Ayni toma un snapshot de lo disponible, conversa con la profesora y guarda sus respuestas. Prepara una propuesta anual completa, valida calendario/CNEB y la revisa. La profesora consulta el mapa, modifica propuestas, mueve, retira a Biblioteca o crea una alternativa. Guardar un borrador y confirmar el año son acciones diferentes. Confirmar activa una versión y conserva la anterior; el Word anual V2 representa el contenido congelado.

Para preparar un proyecto hay dos presentaciones. La antigua expone contexto, propósito, competencias, preguntas, recorrido, evaluación y mapa. La sencilla reúne esos pasos detrás de una acción y reutiliza las mismas rutas. El backend genera un Plan Maestro con una fila prevista por fecha lectiva. La profesora confirma el proyecto. Luego desarrolla cada actividad completa a partir de su fila, la guarda y confirma; no se genera automáticamente todo el bloque de actividades completas.

Hoy organiza los bloques del día, asistencia, ejecución y captura. Evaluar reúne análisis, valoraciones docentes, conclusiones, informes familiares y consolidado. El cierre y el reajuste tienen sus propios controles. Documentos consulta las fuentes existentes y sus versiones; hay exportadores Word y un mecanismo de archivos estables/ZIP, aunque parte depende de flags y su cobertura es menor que el catálogo general.

## Qué existe frente a los veinte puntos del adjunto

| Punto | Estado comprobado | Cambio necesario |
| --- | --- | --- |
| 1. Cinco destinos | Parcial. Evaluar ya se llama así. Navegación normal y F7 son diferentes; móvil normal no incluye Calendario. Mi año es subvista de Planificar. | Unificar cinco accesos; Mi año y Planificación → Plan anual deben abrir el mismo estado/versionado. |
| 2. Carpetas/documentación completa | Parcial. Catálogo, árbol, Word y ZIP existen. Artefactos estables/paths/ZIP solo admiten anual y proyecto. | Cuatro carpetas como filtros del catálogo; ampliar tipos y paquete completo, sin otra biblioteca documental. |
| 3. Diagnóstico opcional | Sustancialmente resuelto en V2 y `canOpenPlanningStep`. Persisten recomendación inicial y flujos legacy con prerrequisitos. | Aviso breve y continuar; garantizar que el recorrido principal no caiga en un gate legacy. |
| 4. Inicio a mitad de año | Falta el contrato de historial declarado. Generación actual propone todo el año; no hay un tipo mínimo de proyecto realizado externamente. | Historial docente separado de previsión y sin generar maestros/actividades/evidencias retrospectivos. |
| 5. Conversación adaptativa | Existe: fuentes disponibles, una pregunta y como máximo tres respuestas; turnos recuperables. | Salida visible y permanente para generar con lo conocido, incluso ante fallo del chat. Hoy el botón principal aparece al estar `ready`. |
| 6. Contexto confirmado editable | Parcial. Conversación y snapshot están separados; preferencias literales se conservan. No existe la lista completa de elementos corregibles/quitable como autoridad confirmada independiente. | Contexto estructurado versionado, con procedencia y aprobación; snapshot exacto por versión anual. |
| 7. Mi año y quince slots | Existe en editor V3; históricos de doce siguen soportados. | Conservar esencia del mapa. No confundir versiones de editor, contrato y contenido. |
| 8. Trabajar ahora otro proyecto | Parcial. Editor anual intercambia slots; lista sencilla ordena proyectos. No hay acción integrada de confirmación desde proyectos. | Reutilizar la operación anual y mostrar actual/próximo. Resolver el caso del slot actual ya empezado. |
| 9. Advertencia de evento | No se identificó un guard específico de evento en el swap. | Metadatos explícitos de evento/período, aviso determinístico y confirmación; sin llamada IA adicional ni bloqueo. |
| 10. Crear/reemplazar desde Mi año | Existe creación de una sola candidata y Biblioteca dentro del año. Persisten ruta emergente y generadores anteriores. | Acción de proyectos conduce al editor anual; retirar entradas alternativas del recorrido normal. |
| 11. Entrada sencilla a proyecto | Existe bajo flags de proyecto sencillo, pero ofrece cambiar propósito/competencias/días desde detalle avanzado. Servidor acepta decisiones aplicables, no exige igualdad con las del año. | Heredar el qué desde Mi año en servidor; aporte corto solo enriquece el cómo. |
| 12. Congelación/inconsistencias | Versiones, snapshots, IDs de origen y protección existen. El año bloquea cualquier desarrollo vinculado, incluso borrador futuro. | Diferenciar preparado de ejecutado, detectar discrepancia y ofrecer sucesor explícito conservando anterior. |
| 13. Todas las actividades recuperables | Falta. Plan Maestro genera el mapa completo, pero confirmar no genera las actividades completas. Jobs anuales aportan un patrón, no esta funcionalidad. | Cola durable por blueprint, checkpoints, unicidad, retry pendiente y ejecutor backend. |
| 14. Hoy y otras actividades | Hoy y calendario existen; reprogramación individual existe. No hay swap atómico de dos actividades con las garantías solicitadas. | Acceso al proyecto completo y nueva operación de intercambio; endurecer primero protección de pasado. |
| 15. Evaluar | Gran parte existe: análisis, conclusiones, familias, cobertura y consolidado. Captura ordinaria/revisión dependen de flags. | Integrar evidencias y revisión en la misma entrada, mostrar tareas y conservar confirmación docente. |
| 16. Revisión opcional | Hay revisión/reajuste con confirmación. V2 rechaza el reajuste antiguo que agregaba IDs nominales. | Ofrecer revisar/mantener sin exigir cambiar el año para cerrar ni hacerlo automáticamente. |
| 17. Análisis del período | Parcial. Hay valoraciones, evidencia, cobertura y datos de actividades. El feedback no incluye los proyectos futuros y no usa todos los conteos de oportunidades. | Unir oportunidades previstas/realizadas, evidencia, necesidades confirmadas y cobertura futura, con categorías separadas. |
| 18. Una propuesta después del período | Creación de una propuesta y feedback de período existen por separado. | Pasar un snapshot autorizado del análisis a la misma creación de candidata; profesora elige reemplazo futuro. |
| 19. Confirmación explícita | Fuerte base: borrador/confirmación, CAS, historial, decisiones docentes y versiones. | Mantenerla en cada nuevo swap, reemplazo, revisión y regeneración. Generar no equivale a ejecutar ni valorar. |
| 20. Auditar antes de rediseñar | Entregado aquí. | Transición por flujos verticales y criterios de salida, sin habilitar de golpe todos los flags. |

## Hallazgos que cambian el diseño

### A. Proteger el pasado todavía tiene una brecha comprobada

`src/lib/school-calendar-service.mjs:160` autoriza docente, valida fecha lectiva y evita conflictos, pero `reprogramActivity` no comprueba ejecución, evidencias ni fecha pasada. La ruta HTTP la invoca directamente (`scripts/local-db-server.mjs:1773`).

Contraejemplo ejecutado: actividad ficticia del 7 de abril con `daily_execution_logs.status = completed`; reprogramarla al 8 de abril fue aceptado. Cambiaron `activities.occurs_on` y `class_schedule_entries.scheduled_on`, mientras el registro de ejecución quedó el 7. No se borró el registro, pero se desalineó su calendario. Recibo: `.local/experience-audit-2026-10-05/probe-past-calendar.json`.

Las protecciones del mapa de proyecto no cubren esta ruta distinta. Antes de añadir «trabajar esta actividad hoy» hay que centralizar la comprobación de pasado/ejecución/evidencia en servidor y probarla también desde la ruta de calendario. No se corrigió en esta fase previa: reproducción validada, solución pendiente.

### B. Quince slots no significa quince proyectos ficticios obligatorios

El validador actual exige quince ocupaciones para confirmar, y cada propuesta exige contenido pedagógico y oportunidades. No admite un registro histórico mínimo de nombre y competencias opcionales. Insertar históricos en el esquema de propuestas generadas obligaría a inventar contenido o relajar controles de futuros.

Recomendación: conservar quince espacios del año completo, pero representar por separado `propuesta futura`, `histórico declarado` y `pasado sin registro`. Las dos últimas categorías no satisfacen ni simulan evidencia o enseñanza realizada. La cobertura debe distinguir lo previsto para el futuro de lo declarado sobre el pasado. La ubicación temporal permanece una proyección del año, no otro plan.

Nombre y competencias no bastan para conocer las fechas reales del histórico. Sin una ubicación declarada, mostrar «período no precisado», en un bloque histórico; ofrecer ubicarlo de manera opcional. Nunca asignar fechas reales desde el tema, desde IA o por encajar en un hueco. El pasado sin datos queda explícito.

### C. Intercambiar un proyecto futuro con el actual tiene un límite real

`editAnnualStructure` bloquea también un destino cuyo inicio es hoy o anterior. El prompt pide trabajar ahora un proyecto futuro y, a la vez, no modificar pasado. Si el slot actual ya contiene días ejecutados, intercambiar todo su proyecto reescribiría la identidad de esos días; si ya pasaron semanas, tampoco quedan las dos/tres semanas originales.

Mantener swap simple para dos espacios íntegramente futuros y sin ejecución. Para el actual, permitir el intercambio completo solo si todavía no comenzó y no afecta fechas transcurridas. Cuando ya comenzó, mostrar la razón y ofrecer continuar lo preparado o revisar explícitamente la parte pendiente mediante una versión que conserve el pasado. No esconder este caso en un recálculo del año. Es una decisión de producto pendiente, no un permiso para quitar el guard actual.

### D. Preparado no debe confundirse con ejecutado

`protectedIds` del año consulta todos los `learning_experiences` vinculados; un borrador ya bloquea cambios. Eso previene incoherencia, pero impide el flujo solicitado para futuros preparados.

Recomendación: protección estricta para pasado/ejecución/evidencias/decisiones mantenidas; para futuros preparados, un cambio autorizado crea una discrepancia explícita. Comparar versión anual/propuesta/slot/calendario con el snapshot del Plan Maestro. Bloquear el uso de una preparación incompatible hasta que la docente decida conservar su planificación o generar sucesor. No reasignar silenciosamente actividades ni sus criterios.

Al resolver continuidad entre versiones anuales, buscar por IDs/procedencia y linaje completo. La lista sencilla hoy busca desarrollo del `annual_plan_id` exacto y algunos lectores asocian filas por índice (`resolveAnnualProposal`, `loadBimesterReplanPreview`). No convertir esa suposición en autoridad cuando aparezcan históricos o espacios libres; relacionar por `proposal_id` y slot, manteniendo adaptadores para antiguos.

### E. Recuperación no equivale a ejecución en segundo plano

Los jobs anuales guardan etapas, salida del proveedor, lease y revisión; permiten reanudar sin repetir salidas persistidas. El propio módulo documenta que no usa worker: el navegador realiza los POST `/run`. Cerrar la vista puede detener los siguientes pasos aunque el trabajo guardado siga recuperable.

Para que «salir y volver» permita continuar realmente preparando un proyecto sin la pantalla abierta, hace falta un ejecutor durable del servidor. Reutilizar protocolo, permisos y checkpoints, pero no afirmar que el job actual ya cumple esa garantía. No usar promesas sueltas en una función serverless.

Tampoco se puede prometer cero cobro duplicado absoluto: un proveedor puede terminar y cobrar antes de que una caída permita guardar su respuesta. Garantizar que no se regeneren resultados persistidos, guardar intento/response ID cuando sea posible y distinguir intentos de resultados. En el intervalo ambiguo, evitar reintentos automáticos ciegos y usar idempotencia/consulta del proveedor si está disponible.

### F. Cambiar el orden de actividades puede romper una progresión

Cada blueprint tiene continuidad con vecinas y papel en el proyecto. Un swap sin IA puede ser técnicamente válido y pedagógicamente inadecuado, por ejemplo observar crecimiento antes de sembrar. Mantener una advertencia con los propósitos/papel de ambas actividades y confirmación docente; bloquear si hay una dependencia explícita incumplida. No inventar un grafo enorme de dependencias. En la primera versión, limitar a actividades pendientes del mismo proyecto y conservar fechas realizadas.

### G. El calendario actual tiene restricciones concretas

El editor nuevo usa cuatro bloques de nueve semanas, acogida de dos, patrón 3/4/4/4 y once slots de dos semanas más cuatro de tres. Rechaza calendarios incompatibles; quince espacios no es una obligación curricular. Mantener el perfil actual para el calendario compatible y un error explicable si no encaja, sin comprimir fechas silenciosamente. El inicio a mitad de año conserva el calendario completo y prepara solo fechas futuras; una acogida pasada puede ser planificación histórica sin afirmar que se ejecutó.

## Arquitectura propuesta: reutilizar autoridades y simplificar entradas

| Autoridad | Qué conserva | Qué muestran las nuevas pantallas |
| --- | --- | --- |
| `annual_plans` confirmado y slots de su versión | Propuestas, ocupación temporal, biblioteca, fuentes y cambios aprobados. | Mi año, Plan anual en carpetas y orden de proyectos: mismo ID/versión. |
| Fuentes de aula actuales | Entrevistas, observaciones literales, recursos y decisiones con procedencia. | Diagnóstico opcional y resumen de información disponible. |
| Contexto docente confirmado, versionado | Elementos explícitos: recursos, espacios, eventos, ideas/prioridades; referencia al turno/fuente. | «Lo que Ayni tendrá en cuenta», con corregir/quitar. |
| Declaraciones históricas del año | Nombre y competencias opcionales, autor/fecha de declaración y período solo si lo aporta la docente. | Bloque histórico y Word anual; nunca crea un `learning_experience` preparado ficticio. |
| Plan Maestro de versión exacta | Decisiones heredadas, contexto adicional, criterios, blueprints, CNEB/KB/calendario y procedencia. | Resumen sencillo y detalles consultables. |
| `activities`, criterios, agenda y ejecución | Desarrollo del blueprint, versión, planificación y ejecución real separadas. | Hoy, otras actividades y calendario desde la misma proyección autorizada. |
| Evidencias/atribuciones y valoraciones | Hechos, decisiones docentes, conclusiones y cierres independientes. | Evaluar y revisión de período sin inferir niveles por vacíos. |
| Catálogo/artefactos documentales | Fuente, versión, plantilla y bytes/hash cuando corresponde. | Documentos dentro de carpetas y paquete de aula/año. |

Los dos conceptos nuevos —contexto confirmado editable e historial declarado— necesitan contratos durables propios; no usar la conversación temporal como su única persistencia. Recomendación de implementación: registros versionados privados con pertenencia a docente/aula/año y RLS, incorporados al año como snapshots inmutables con IDs de origen. Eso no crea dos autoridades editables: la fuente se modifica por una única ruta, la copia del plan explica exactamente qué se usó en esa versión. El esquema/migración aditiva se decide al implementar el primer flujo, sin alterar migraciones aplicadas.

La conversación queda como conversación, el contexto confirmado como decisiones, y el snapshot anual como historia de generación. Las sesiones temporales de conversación actuales expiran a los siete días y jobs a las 24 horas; se debe definir cuánto conservar el diálogo necesario para trazabilidad, sin usar expiración del job para borrar contexto aprobado.

### Navegación y carpetas

Barra inferior: Mi año · Hoy · Calendario · Evaluar · Planificación. Mi año es un alias que abre la subvista anual existente, con el mismo selector de versión y guard de cambios. El nombre de la pestaña no se convierte en una segunda instancia de almacenamiento.

Planificación ofrece cuatro carpetas: Evaluación diagnóstica, Plan anual, Proyectos y actividades, Evaluación. Sus estados son «por empezar», «en preparación», «listo» o «requiere revisión» según registros persistidos; abrir una pantalla no marca progreso. La carpeta Evaluación muestra documentos y enlace al mismo Evaluar cotidiano, sin duplicar valoraciones.

Niños, perfil institucional, familias y recursos siguen accesibles desde el aula/menú contextual y las actividades. Biblioteca de propuestas pertenece a Mi año; biblioteca de materiales es un recurso del trabajo cotidiano, no otra autoridad anual. Documentos deja de ser destino principal, pero su servicio y enlaces históricos se conservan.

### Preparación completa del proyecto

1. La profesora abre una propuesta del año y consulta tema, propósito, competencias, fechas/duración y breve desarrollo.
2. Añade contexto opcional y solicita preparar. El servidor conserva propósito/competencias/naturaleza anual; contexto que los contradiga devuelve explicación y enlace a Mi año.
3. Generación de dependencias y Plan Maestro conserva checkpoints y revisión. La profesora confirma la preparación/proyecto desde un resumen legible.
4. El backend crea trabajo pendiente por blueprint de esa versión exacta. Cada unidad genera, valida y guarda una actividad completa con criterio heredado; nunca registra ejecución/evidencia.
5. La pantalla muestra etapas y conteos reales: 7 de 12 guardadas, fallo de cinco pendientes, reintento pendiente. GET de progreso es independiente de ejecutar trabajo.
6. Ofrecer revisión conjunta de las actividades generadas y una confirmación explícita del bloque exacto; evitar exigir doce formularios idénticos. La nueva redacción generada debe poder consultarse antes de declararla lista para usar. Esta confirmación no asigna niveles ni marca actividades realizadas.

Clave de trabajo/unicidad propuesta: versión de proyecto + blueprint + versión del generador + tipo de actividad. Guardar snapshot del maestro y huellas de calendario/contexto; un conflicto invalida pendientes y preserva salidas, no cambia el origen. Lease/token y commit condicionado excluyen workers simultáneos. IO fuera de transacciones largas. Un retry consulta primero la actividad/job persistidos. Talleres continúan opcionales y separados; fallo del taller no invalida una actividad principal ya guardada. Dimensionar timeout, cuota y cancelación antes de activar generación de todo el bloque.

### Revisión del período y una nueva propuesta

Proyección autorizada, sin escribir el año: competencias con oportunidades previstas, actividades efectivamente realizadas, participación/asistencia cuando exista, evidencia ordinaria y cobertura por niños, valoraciones confirmadas y necesidades sustentadas. Diagnóstico y declaraciones históricas permanecen separados de evidencia formativa real; ausencia de registro se describe como información desconocida.

Cruzar con oportunidades de los proyectos futuros del mismo año. Mostrar, por ejemplo, «Indaga tiene poca evidencia en este período y ya está prevista en Huerto y Científicos». No convertir un contador de proyectos en cantidad/calidad de oportunidades ni inferir dificultades por número de registros.

«Mantener Mi año» termina sin mutación. «Crear una propuesta con lo aprendido» reutiliza `annual-proposal-creation` con snapshot del período, contexto confirmado, realizados y cobertura futura. Devuelve UNA candidata a Biblioteca; revisar/aprobar y después elegir un reemplazo futuro. No invocar generación anual completa ni el reajuste legacy que agregaba competencias nominales.

### Documentos y paquete completo

Filtrar el catálogo autorizado por carpeta, aula/año y estado. Mostrar vigente primero e histórico consultable. Reutilizar las plantillas y exportadores actuales; el Word anual debe añadir una sección explícita «historial declarado por la profesora», sin desarrollar pedagogía inexistente. Los documentos de proyectos/actividades conservan su versión exacta y fuente.

Ampliar artefactos/paths a diagnóstico, actividades e informes y definir el cierre que actualmente no tiene descarga Word directa. Un único paquete con manifiesto de fuentes, versiones y hashes; mismo servicio por carpeta o paquete completo. No generar documentos de fuentes inexistentes ni inventar un informe para completar carpetas. Informar documentos pendientes/omitidos y ofrecer su preparación explícita cuando haga falta.

El ZIP actual limita a 100 documentos de una sola aula. Un año con actividades e informes puede superar ese límite: usar tarea de empaquetado con particiones/streaming y progreso según volumen, no quitar el límite sin controlar memoria. Mantener bytes estables de documentos confirmados; definir snapshots para registros vivos antes de exportarlos. La copia a una carpeta del dispositivo sigue siendo explícita y secundaria al ZIP compatible con móvil.

## Qué ocultar o retirar del recorrido normal

- Secuencia manual contexto → propósito → competencias → preguntas → recorrido → evaluación → mapa: convertirla en etapas internas/detalle consultable.
- Editor de competencias/propósito del proyecto: remitir a Mi año; no basta ocultar el botón, validar herencia en servidor.
- Generación individual obligatoria de cada actividad: reemplazarla por preparación recuperable del bloque, conservando lector/generador heredado como motor.
- Documentos como gran módulo separado: acceso contextual a los mismos servicios y compatibilidad con enlaces antiguos.
- Entrada del generador anual antiguo, proyecto emergente paralelo y reajuste nominal para contratos nuevos: evitar exposición concurrente; lectores/exportadores históricos permanecen.
- Rutas antiguas de doce y adaptadores V1/V2: conservar para lectura/recuperación. No borrar por parecer duplicados ni autoconvertir al abrir.

Flags principales revisados: `NEXT_PUBLIC_AYNI_ANNUAL_JOURNEY`, `NEXT_PUBLIC_AYNI_PROJECT_SIMPLE`/`AYNI_PROJECT_SIMPLE`, `NEXT_PUBLIC_AYNI_ACTIVITY_INHERITED`/`AYNI_ACTIVITY_INHERITED`, F7 navegación, observaciones ordinarias/revisión curricular, F8 trayectoria/evaluación, F9 reajuste, F10 artefactos y F11 documentos/sync, más `AYNI_PLANNING_V3_READ`. Existen combinaciones frontend/backend con comportamientos diferentes. No se comprobaron valores efectivos de un deployment. Definir un perfil coherente por versión; no activar todos indiscriminadamente ni retirar flags antes de cerrar el flujo y la compatibilidad.

README, PRODUCT y DESIGN todavía describen estados iniciales/doce tarjetas que ya no reflejan todo HEAD. La memoria mezcla checkpoints históricos y estado reciente. Esta auditoría usa código/ADR más reciente; actualizar esos briefs junto a la transición aprobada, evitando presentar la arquitectura propuesta como ya implementada.

## Recorrido completo propuesto para la profesora

Configura aula y niños → puede aportar diagnóstico o continuar → si empezó tarde, declara brevemente lo trabajado o deja pasado sin registro → conversa unas pocas veces o elige crear con lo conocido → revisa «lo que Ayni tendrá en cuenta» → prepara y confirma Mi año en la línea de tiempo → abre el proyecto actual/próximo → agrega contexto opcional → revisa/confirma preparación → Ayni prepara el bloque y permite retomar pendientes → usa Hoy y consulta otras actividades → registra actuaciones reales → revisa valoraciones/conclusiones en Evaluar → descarga en la carpeta correspondiente → después del período decide mantener el año o pedir una sola nueva propuesta.

El diagnóstico puede continuar durante el año sin reescribir snapshots ya usados. Los cambios futuros crean revisión, explicación y confirmación. Nada presupone que la profesora haya usado Ayni desde marzo.

## Transición mínima, pruebas y rollback

| Entrega vertical | Resultado y condición de salida | Reversión |
| --- | --- | --- |
| 0. Integridad | Cerrar brecha de reprogramación; centralizar protección y probar rutas alternativas, ejecución y evidencia. | Revertir cambio de código si hiciera falta, conservando registros; no publicar swaps hasta cerrar. |
| 1. Entrada única al año | Cinco destinos/carpeta anual, diagnóstico opcional, salida del chat, contexto confirmado e historial declarado hasta Word. Prueba de profesora sin diagnóstico y de alta a mitad de año. | Revertir presentación conservando lectores del contrato ampliado y fuentes/snapshots nuevos. |
| 2. Año → proyecto | Orden actual/próximo, contexto limitado, herencia en servidor, evento/swap y discrepancia de futuro preparado con sucesor explícito. | Mantener versión previa como consultable y detener nuevas mutaciones; sin borrar maestros. |
| 3. Proyecto → bloque → Hoy | Worker durable, unicidad por blueprint, cortes/retry y confirmación del bloque; consulta/intercambio pendiente seguro. | Pausar el ejecutor de forma explícita, conservar salidas/jobs y permitir lectura; no regresar a un código que ignore versiones nuevas. |
| 4. Evaluar → propuesta | Analizar oportunidades/evidencia/futuros, mantener sin escribir o candidata única/reemplazo confirmado. | Revertir entrada nueva conservando snapshots y candidatos; no volver al reajuste nominal para V2. |
| 5. Carpetas → descarga completa | Ampliación de artefactos y paquete, documentos ausentes y volumen anual, permisos y hash. | Mantener lectores de artefactos/tipos nuevos y ZIP descargados; sin reescribir fuentes. |

La primera implementación de UX debe cerrar entrada → contexto/historial → Mi año → Word antes de abrir varios módulos. La corrección de integridad de calendario es un cambio previo acotado y revisable.

Pruebas de aceptación: sin diagnóstico/parcial/sin alumnos cuando permita el dominio; inicio en marzo/agosto/octubre y slot actual parcial; históricos sin competencias/fecha; versiones de doce/quince; intercambio 2↔3 y feriados; ambos IDs del swap y evento confirmado; proyecto futuro preparado frente a ejecutado; contexto que intenta cambiar competencias; cortes en cada etapa, concurrencia y respuesta perdida; no generación retrospectiva ni duplicados; aislamiento entre dos docentes/RLS/Storage en staging nuevo; Word/XML/hash/fidelidad visual; móvil, foco, navegación y descarga completa. Cada entrega ejecuta typecheck/lint/build y funcional pertinente.

## Decisiones de producto todavía por cerrar

1. Año completo al iniciar tarde: recomendación de quince espacios con pasado declarado/sin registro y generación únicamente futura. Se consultó de forma opcional; hasta respuesta es propuesta, no decisión confirmada.
2. Ubicación histórica: permitir período aproximado opcional o dejar «no precisado»; no exigir fechas para continuar.
3. Slot actual ya empezado: elegir la alternativa explícita para parte pendiente; no prometer swap completo que cambie pasado.
4. Confirmación del bloque generado: recomendación de revisión conjunta de actividades exactas, sin doce confirmaciones repetitivas ni aprobación de textos que todavía no existen.
5. Durabilidad/costo: ejecutor, presupuesto y estado ambiguo de un request cobrado sin respuesta persistida. Mantener modelos/routing actuales hasta medir.
6. Documentación completa: vigentes primero, históricos seleccionables y cierre sin documento descargable todavía; retención de diálogo y archivos vivos.
7. Calendarios distintos del perfil 2026: mantener quince como diseño del producto compatible, sin presentarlo como mandato curricular ni redistribuir históricos.

## Validación ejecutada en esta auditoría

- `npx tsc --noEmit`: PASS, exit 0.
- `npm run lint`: PASS, exit 0.
- `npm run build` (Vinext): PASS, exit 0. El build informa la limitación de clasificación estática de rutas de Vinext; no se interpreta como una prueba HTTP.
- Regresión seleccionada de 26 archivos: **161 pruebas, 161 PASS, 0 fallos, 0 omitidas**, aproximadamente 73 segundos. Incluye integración anual → confirmación → Word, quince slots, recuperación, permisos/CAS, proyectos, actividades heredadas, calendario, feedback/evaluación y documentos. Los modelos son simulados.
- Contraejemplo de actividad completada reprogramable: ejecutado en memoria, confirmó la brecha descrita; no acredita una corrección.
- `npx next build --webpack`: PASS, exit 0; compilación, TypeScript y generación de páginas completadas.
- La revisión final de whitespace/diff se registra en el recibo local de cierre.

Recibos locales: `.local/experience-audit-2026-10-05/`. No se ejecutó nueva validación visual en navegador, calidad pedagógica del proveedor real, RLS remoto ni smoke de staging/producción. Los 161 tests pasan y, aun así, no cubrían la brecha de pasado: no equivalen a aceptación completa de esta visión.
