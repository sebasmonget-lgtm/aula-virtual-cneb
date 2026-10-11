# Ayni Aula: auditoría y propuesta de simplificación

**Fecha:** 11 de octubre de 2026. **Estado:** propuesta para revisión; implementación pendiente de aprobación del propietario.

Esta fase comprende análisis de código, comprobaciones acotadas y propuesta. El único archivo creado por esta auditoría es este informe. No se modificaron código del producto, bases de datos, variables, permisos ni despliegues; no se hicieron commits ni publicaciones.

## 1. Conclusión y alcance

La hipótesis del propietario se sostiene **en buena parte**: Ayni tiene una base funcional que merece conservarse y una interfaz que expone demasiada complejidad a la vez. Ya existen navegación moderna, entrevistas progresivas, calendario efectivo, preparación recuperable, editor anual protegido, evaluación con confirmación docente y documentos derivados de fuentes canónicas. Reconstruirlos sería innecesario y arriesgado.

La simplificación tampoco puede reducirse a quitar tarjetas. Hay problemas de **estado y confianza** en el cliente: cierre de una observación sin protección del texto pendiente, correcciones que vuelven a partir del texto original, selección de un bimestre antiguo cuando la fecha cae entre períodos y contexto anual que deja de incorporar decisiones del chat después de una edición manual. Algunos requieren correcciones pequeñas de lógica; otros necesitan un contrato de persistencia explícito antes de prometer guardado automático.

La recomendación es **evolucionar las pantallas actuales**, con una acción principal y detalles progresivos, conservando sus servicios, permisos, versiones y reglas pedagógicas. Empezar por un flujo vertical de observación confiable; después corregir el contexto de evaluación y simplificar la conversación anual. La unificación visual de observaciones puede reutilizar dos adaptadores, pero cambiar cuándo se guarda y cuándo interviene IA exige una fase técnica separada.

### Cómo leer la evidencia

- **C — Código:** comportamiento o riesgo observado en la implementación del commit auditado. No equivale a reproducción completa en servidor.
- **V — Ejecución actual:** comprobación en el dominio habitual, con una sesión docente existente, mediante navegación y lectura de interfaz.
- **H — Histórica:** registros o capturas de QA anteriores. Se señalan expresamente; no cuentan como pruebas repetidas hoy.
- **P — Pendiente:** reproducción, usabilidad, integración o condición que todavía no se verificó.

Se revisaron las memorias obligatorias del proyecto, decisiones recientes, errores relevantes, componentes de los recorridos y servicios que los soportan. Los documentos adjuntos se trataron como **antecedentes**, incluyendo sus etiquetas «APROBADO»; estas etiquetas no autorizan implementación en esta fase. No se certifica todo el backend ni toda la base remota.

La exploración actual cubrió diagnóstico de entrada, Hoy sin jornada lectiva, portada de Evaluar, portada moderna de Planificación y Calendario; Calendario y Evaluar también en un viewport móvil. No se guardaron cambios pedagógicos ni se pulsaron acciones de generación, confirmación, corrección, matrícula o cierre. No se incorporan a este informe nombres, respuestas familiares, imágenes o grabaciones de menores.

**Límite relevante:** abrir algunas vistas puede reanudar trabajos pendientes o crear una conversación por sus efectos actuales. No se abrieron esos flujos para obtener capturas nuevas. La lectura diagnóstica también tiene tratamiento de clasificación pendiente en servidor. Sin comparación de filas y libro de consumo no se afirma que toda lectura sea incapaz de producir efectos internos o llamadas IA.

## 2. Rama, commits, Preview y Producción

La rama más reciente y pertinente para este trabajo es `codex/ayni-qa-ia-ux-costos-20261009`, verificada contra el remoto. `origin/main` está en `1e049a080465cc3a5f3670ce2c33adf3b5576789` del 27 de septiembre; la rama auditada acumula 155 commits posteriores a ese punto. Tomar `main` como producto vigente produciría un diagnóstico desactualizado.

| Entorno | Identificación verificada | Qué significa |
|---|---|---|
| Checkout y rama remota | `e3a107ffc9d8d83f1cbd73c4b68129a8a03d854f`, 11/10, 08:47 Lima | Registra publicación interna y corrige el harness RLS; es la base de lectura de código. |
| Producto publicado | `ea206bf179841f6a85f43dbec95c391a47b12674`, 11/10, 07:56 Lima | Código del producto compartido por Preview y Producción. |
| Preview más reciente | `dpl_DUGacBLSUGJb38Wc5CRGD6ezt63b`, READY, `ea206bf` | [Preview preservado](https://ayni-aula-staging-nurdgna70-ayni4.vercel.app). |
| Producción actual | `dpl_EgekhWXwVjaM9iCcRc8mpJn2Eoc4`, READY, `ea206bf` | [Dominio habitual](https://project-0w0pq.vercel.app); el alias se verificó contra ese deployment. |

La metadata se consultó de forma independiente, mediante API de Vercel, el 11/10/2026 a las 18:52 UTC, sin cambiar configuración. El proyecto identificado es `ayni4/ayni-aula-staging`, de las cuentas nuevas de Ayni. No se reutilizaron otros proyectos.

Entre `ea206bf` y `e3a107f` cambian únicamente cuatro documentos y `scripts/test-supabase-rls.mjs`; **no cambia código del producto**. Esta equivalencia permite contrastar el código auditado con la interfaz actual. No demuestra igualdad de todos los datos, trabajos pendientes o condiciones de ejecución entre entornos.

Se verificó valor `1` en Preview y Producción para las banderas pública y privada de observaciones ordinarias y F8 de evaluación. Otras banderas modernas ausentes no significan automáticamente «apagadas»: la función vigente `newAyniFeatureEnabled` utiliza activación salvo valor `0`. Las descripciones históricas de valores por defecto deben leerse con esa diferencia. No se hizo una auditoría exhaustiva de todo el entorno ni del bundle compilado.

Producción fue autorizada anteriormente para **pruebas internas**. Su registro conserva pendientes de zoom al 200 %, dispositivos físicos, aislamiento remoto entre dos docentes y recorrido autenticado completo en Preview. Esta auditoría no convierte esa publicación en aceptación general para docentes ni solicita otra publicación. Véase [registro de la publicación interna](qa/AYNI_PRODUCTION_INTERNA_2026-10-11.md).

## 3. Diagnóstico fundamentado

### Lo que ya está bien resuelto

1. **La actividad ya organiza el trabajo cotidiano.** `ActivityRunView` y `PedagogicalBlock` presentan instrucciones, acciones infantiles esperadas y momentos de observación sin un asistente de pasos obligatorio. Fichas y materiales pueden seguir dentro de la actividad.
2. **La navegación moderna ya tiene cinco destinos.** Mi año, Hoy, Calendario, Evaluar y Planificación; Mi aula permanece en el encabezado. No hace falta crear otra arquitectura de navegación ni otro módulo de recursos [E01].
3. **Las entrevistas ya avanzan una pregunta por vez**, admiten selección múltiple, dictado y guardado progresivo, y distinguen borrador de confirmación. Rehacer su cuestionario o sus contratos no es necesario [E04].
4. **Mi año ya dispone de mapa y lista**, biblioteca, propuestas nuevas mediante chat, alternativa al arrastre y protecciones del servidor. La matriz masiva que preocupaba a versiones anteriores ya no es la pantalla principal del editor moderno [E09].
5. **La preparación tiene trabajos durables y recuperación.** Proyectos usan Plan Maestro y actividades preparadas cuando se necesitan. Reintentar no debe equivaler a generar todo otra vez [E10].
6. **Evaluar ya tiene tres entradas claras** y niveles sin selección automática. El consolidado y los documentos usan valoraciones y versiones existentes [E13], [E15], [E16].
7. **Retirar y recuperar matrícula ya existe en código.** El handoff lo trataba como pendiente de comprobación; `student-enrollment.tsx` sí ofrece ambas operaciones preservando historial. Falta reproducirlas con fixtures, no construirlas desde cero [E03].

### Problemas principales y prioridad

Las prioridades siguientes son de producto y regresión: **P1** primero por confianza o contexto; **P2** simplificación de alto valor; **P3** mejoras posteriores. Dificultad y riesgo son estimaciones relativas, no presupuestos ni plazos. No se reprodujo un bloqueo crítico que justifique reconstrucción.

| ID / prioridad | Hallazgo y evidencia | Cambio recomendado | Impacto / dificultad / riesgo |
|---|---|---|---|
| F01 · P1 | El diálogo ordinario permite cerrar cuando no está guardando/grabando, sin comprobar texto pendiente. `onOpenChange` y cierre del pie no protegen el borrador. **C; reproducción P** [E06]. | Guardar el borrador de forma recuperable o impedir una salida silenciosa. Mostrar estado real de guardado. Una advertencia temporal puede proteger mientras se valida persistencia segura. | Alto / media / medio; lógica cliente y privacidad del borrador. |
| F02 · P1 | «Corregir o anular» inicia `correctedText` con `raw_text`, incluso si existe una corrección vigente; la tarjeta recién guardada también presenta el original. **C; segunda corrección P** [E06], línea 161. | Editar y presentar la versión vigente; mantener original consultable. Conservar `expectedRevision`, motivo e historial. No se afirma que se haya perdido un registro remoto. | Alto / baja / bajo; cliente. |
| F03 · P1 | El 11 de octubre Evaluar abrió Bimestre 1, 16/03–15/05. En el intervalo entre períodos el código cae en `periods[0]`; se repite en la pantalla de evaluación. **V+C** [E13], [E14]. | Respetar período explícito; si no existe uno vigente, ofrecer el último terminado con etiqueta clara y acceso al siguiente. Compartir la regla entre portada y detalle, con fecha autoritativa del aula. No modificar calendarios ni evaluaciones. | Alto / baja / bajo; selección cliente. |
| F04 · P1 | Después de editar manualmente el contexto anual, `contextEdited` impide incorporar nuevos `contextItems` del chat. Hay protección de salida, pero las ediciones del panel no tienen autosave propio comprobado. **C; escenario completo P** [E08], líneas 83–85. | Definir unión por identidad y tratamiento de eliminaciones; mostrar qué se guardó y qué falta. Verificar persistencia antes de prometer recuperación. No regenerar contexto con otra llamada IA. | Alto / media-alta / medio-alto; estado y posible contrato de persistencia. |
| F15 · P1 | En la revisión moderna, análisis/nivel/motivo viven en estado local y se reemplazan al elegir otro niño; las ediciones del lote también son locales hasta guardar. No se encontró protección propia de esos borradores en los componentes. **C; pérdida por navegación y recuperación P** [E15], [E24]. | Proteger cambio de niño, competencia, período y salida. Separar guardar borrador de confirmar nivel; reutilizar los contratos existentes antes de crear otro autosave. No presentar persistencia del job como guardado de toda edición manual. | Alto / media / medio; estado cliente y control de revisiones. |
| F05 · P2 | El chat anual queda precedido por pasos, tarjetas «Información para el plan» y otro formulario de contexto; se repiten decisiones. **C+H**, no sesión anual nueva [E07], [E08]. | Un único panel editable, plegado, «Lo que Ayni tendrá en cuenta»; chat y creación del año protagonistas. Conservar fuentes, decisiones, recursos e ingreso tardío. | Alto / media / medio por F04; presentación primero. |
| F06 · P2 | Diagnóstico tiene tres entradas, revisión del conocimiento y panel de preparación que parecen otra obligación. **V+C** [E05]. | Dos caminos: Entrevistas y Observaciones. Revisión/síntesis opcional bajo detalle; crear Mi año con contexto disponible. No borrar revisiones históricas ni sus utilidades documentales. | Alto / baja-media / bajo. |
| F07 · P2 | Observación diagnóstica sugiere competencias antes de guardar; el registro ordinario guarda primero y puede recibir sugerencia después. La iconografía no revela la diferencia. **C** [E06], [E17], [E18]. | Vocabulario y captura comunes con adaptadores existentes; primero texto observado, después relación curricular opcional. Cambiar la secuencia diagnóstica exige análisis de API, colas e idempotencia separado. | Alto / alta para flujo unificado / alto si se mezclan datos. |
| F08 · P2 | El catálogo guiado muestra muchas experiencias y varias recomendaciones. **C** [E05]. | Una sugerencia inicial basada en oportunidades de observación, pocas alternativas y «Ver todas». Reutilizar catálogo y bloque pedagógico. No llamarlo diagnóstico de capacidades del niño. | Alto / baja-media / bajo. |
| F09 · P2 | Registro de niños antepone estadísticas y tarjetas altas; importación pide CSV con cabeceras técnicas y guarda inmediatamente. No existe carga Excel ni revisión editable previa. **C** [E02], [E19]. | Nombres y apellidos primero; foto y otros datos opcionales. Lista compacta. Mantener CSV secundario y honesto; revisión previa/importación de archivo requiere trabajo adicional acotado. | Alto / baja para formulario, media para importación / medio por identidad. |
| F10 · P2 | Hoy repite accesos a observar y abrir actividad. En domingo muestra «no hay jornada» y conserva Asistencia entre acciones rápidas. **V+C** [E11]. | Actividad principal con una acción de apertura y observación contextual; observación espontánea secundaria. En día no lectivo priorizar Mi año/Calendario y acceso voluntario a observar. | Alto / baja / bajo. |
| F11 · P2 | El mapa anual contiene una región interna de 3060 px, biblioteca y oportunidades extensas. El scroll interno es deliberado, no prueba por sí solo un fallo responsive. **C; móvil anual actual P** [E09]. | Preservar mapa, lista y tramos. Foco en tramo actual/próximo, pistas de desplazamiento, acciones sobre selección y detalles progresivos. Probar navegación completa en móvil antes de cambiar medidas. | Alto / media / medio. |
| F12 · P2 | Configuración combina datos básicos, fechas, explicación normativa y logo prominente. **C** [E20]. | Cinco datos principales; resumen del calendario validado. Documentos/logo plegados y opcionales. Castellano L2/Religión explícitos y breves; no deducirlos de la lengua familiar. | Medio-alto / baja-media / bajo si se conserva payload. |
| F13 · P2 | Evaluar muestra ceros mientras falta `overview`; mensajes de fallo general dicen «Inicia la base local» en producto cloud. **C** [E01], línea 272, y [E13]. | Carga identificable y ausencia de datos diferenciadas de cero real; error humano con reintento, sin instrucciones de infraestructura para la profesora. | Medio-alto / baja / bajo. |
| F14 · P3 | Calendario cabe en el viewport móvil medido, pero flechas son 40×36 px; modal propio de taller necesita revisión de foco/Escape. **V para medidas; C/P para diálogo** [E12]. | Objetivos táctiles de al menos 44×44, reutilizar `Dialog`, foco restaurado. Fuente y bloques del calendario bajo detalle accesible. | Medio / baja / bajo. |

No se recomienda una nueva tipografía, paleta, mascota o biblioteca UI como primera medida. El problema dominante es la jerarquía de decisiones, estados y recuperación. Las animaciones detectadas ya tienen `motion-safe`; no hay evidencia suficiente para priorizar su eliminación.

## 4. Recorrido recomendado: qué ve y hace la profesora

El recorrido admite saltos, vuelta atrás, entrada a mitad del año y trabajo incompleto. «Continuar» no debe significar que todas las entrevistas, observaciones o tarjetas deban completarse. La confirmación se reserva para decisiones con consecuencias reales.

| Momento | Primera vista y acción principal | Capacidad secundaria conservada |
|---|---|---|
| Ingresar o volver | Retomar contexto guardado; Hoy como regreso cotidiano cuando corresponde. Si falta aula, configurar. | Mi aula siempre accesible. No repetir una bienvenida de «aula lista» en cada visita. |
| Configurar aula | Colegio, docente, sección, edad sin preselección y año. «Guardar y añadir niños». Calendario disponible resumido. | Datos de documentos, logo y excepciones; para un año sin fuente validada, explicar la falta y pedir fechas reales, sin inventarlas. |
| Registrar niños | Nombres y apellidos, foto opcional, lista visible. Tras guardar se puede añadir otro o «Conocer a mi grupo». | Más datos, importación revisable cuando exista, foto, matrícula y recuperación. «Crear Mi año» disponible sin declarar matrícula cerrada. |
| Conocer al grupo | Dos opciones: «Entrevistas a familias» y «Observaciones». | Revisar fuentes/síntesis como ayuda opcional; crear el año sin diagnóstico completo. |
| Entrevistar | Elegir niño en lista, una pregunta por vez, selecciones con check y texto/dictado. «Siguiente» o «Volver a la lista» según contexto. | Resumen, entrevista en papel y adjuntos. «Respuestas guardadas» no equivale a «Entrevista confirmada». |
| Observar | Desde actividad: niño y «¿Qué observaste?», criterio heredado. Fuera de actividad: niño y hecho observado. «Guardar». | Dictado, foto privada opcional, relación curricular, historial, corrección/anulación trazable. La fecha editable solo donde el contrato la admite. |
| Crear Mi año | Chat visible; panel de contexto plegado y editable. «Crear Mi año con lo que ya sabes» en estado seguro. | Dictado, sugerencias, decisiones, recursos e historia declarada. No exigir llegar a `ready` ni cierto número de respuestas. |
| Revisar Mi año | Mapa existente con estado Borrador/Confirmado, propuesta seleccionada y «Qué buscamos». Confirmar después de revisión y avisos vigentes. | Lista, mover sin arrastrar, biblioteca, oportunidades, chat de nuevas propuestas y revisión versionada. |
| Preparar proyecto | Intención y fechas reales. Una pregunta libre opcional. «Preparar proyecto». | Calendario y contexto. Cambios de alcance regresan al flujo de revisión de Mi año. Progreso recuperable y actividades cuando se necesitan. |
| Trabajar hoy | Una actividad destacada y «Abrir actividad». Materiales plegados. En la actividad: guía y momentos para observar. | Asistencia contextual, otra actividad, recursos y taller opcional. Registrar ejecución por decisión docente, no por reloj. |
| Consultar Calendario | Mes actual y fecha seleccionada; mes/semana/año disponibles. | Fuente, gestión, feriados y excepciones; ajustes futuros con reglas y trazabilidad. Abrir actividad no cambia fecha. |
| Evaluar | Período correcto y tres entradas: evaluación, informes, consolidado. «Continuar revisión» sobre lo pendiente. | Evidencias y fuentes; IA solicitada cuando ayude; niveles y conclusiones confirmados por la docente. Ausencia de evidencia nunca se convierte en C. |
| Preparar informes | Preparar/revisar desde valoraciones confirmadas, progreso durable y excepciones visibles. | Editar y regenerar solo lo necesario, versiones y Word. No imponer abrir cada documento si no requiere atención. |
| Consultar/descargar | Las cuatro carpetas de Planificación. Documentos disponibles y acción de descarga. | Paquete completo y fuentes/versiones. No un segundo formulario para transcribir lo ya registrado. |

**Navegación:** conservar los cinco destinos actuales en esta primera evolución. Mi año significa organizar el trabajo; Planificación significa consultar y descargar documentos. Una descripción breve en cada portada aclara la diferencia. Sus dos accesos al año deben abrir el mismo estado, no crear otro plan. Mi aula reúne niños, familias y configuración. El selector de aula y los enlaces profundos existentes siguen funcionando.

## 5. Ayni actual, Ayni Ideal 2.0 y decisión recomendada

| Área | Implementación actual | Antecedente Ideal 2.0 | Recomendación y decisión |
|---|---|---|---|
| Acceso/navegación | Sesión, cinco destinos modernos, Mi aula; orientación inicial según estado. | Regreso a Hoy y acceso permanente al aula. | **Conservar/mejorar:** retomar trabajo cuando exista, evitar que falta de síntesis haga repetir diagnóstico. No eliminar guardas ni rutas antiguas. |
| Configuración | Datos principales y opcionales; fechas y logo con peso visual. | Logo y datos documentales siempre visibles; calendario automático. | **Simplificar:** plegar datos opcionales. Conservar calendario validado y contingencia para años sin fuente. Mostrar todo el formulario aumenta esfuerzo sin aportar a la primera tarea. |
| Niños | Alta, CSV pegado, foto; retiro/restauración en código. | Archivo/pegado, revisión y edición de nombres en modal. | **Conservar/mejorar:** no reconstruir matrícula. La revisión de importación sí aporta. No prometer Excel ni edición de nombre antes de implementar/validar sus contratos; no se encontró editor de nombre equivalente en el perfil revisado. |
| Aula lista | Paso «Terminé de cargar mi aula» y continuación contextual. | Pantalla especial de confirmación. | **No añadir otro paso:** continuación visible en la misma lista, con diagnóstico y año disponibles. |
| Diagnóstico | Entrevistas, observaciones y revisión/síntesis. | Eliminar pantalla de síntesis y su IA. | **Simplificar, sin borrar capacidad:** quitar protagonismo y requisito aparente; mantener revisión histórica y preparación explícita opcional cuando aporte al documento o a la planificación. Nunca generar síntesis al plegar el panel. |
| Entrevistas | Seis preguntas, chips, autosave; parcial ámbar/confirmada verde. | Recuadros con checks; verde con cualquier respuesta. | **Conservar/simplificar:** checks y estado textual claro. No equiparar respuesta guardada con confirmación ni usar solo color para comunicarlo. No cambiar cuestionario por estética. |
| Observación espontánea | Diagnóstico y ordinaria tienen distinta secuencia, fechas, atribución y tablas. | Guardar primero y sugerencia IA automática posterior. | **Mejorar por etapas:** misma gramática visual y guardado confiable; sugerencia opcional según política vigente. **No imponer IA automática universal**, ni fusionar tablas, ni convertir clasificación en evaluación. |
| Experiencia guiada | Catálogo, recomendaciones y criterio de observación. | Una recomendación y alternativas plegadas. | **Simplificar:** reutilizar contenido, una sugerencia explicable; abrir alternativas sin otra pantalla o IA. |
| Chat anual | Conversación real y contexto editable; duplicación y riesgo de unión/persistencia. | Un panel plegado, actualización progresiva y CTA existente. | **Conservar/mejorar:** esta dirección es adecuada. Separar cambio visual de persistencia; conservar origen de cada dato y las capacidades de edición. |
| Mi año | Quince tramos modernos, mapa/lista, biblioteca y protección. | Timeline horizontal, tarjeta breve y detalles progresivos. | **Conservar/simplificar:** mantener exactitud de fechas y alternativa vertical. No declarar validado todo el móvil ni comprimir artificialmente 15 tramos en una pantalla. |
| Preparación | Plan Maestro + blueprints, actividades al necesitarlas; trabajos recuperables. | Preparar Plan Maestro y todas las actividades de una vez. | **No implementar esa sustitución:** mantener preparación gradual actual; evita material que se descarte tras cambios y conserva la arquitectura reciente. Medir costos antes de proponer otra estrategia. |
| Hoy/actividad | Guía por bloques y ejecución explícita; accesos repetidos. | Menos botones; «Finalizada» automáticamente por horario. | **Simplificar accesos; no adoptar cierre por reloj.** Si se muestra tiempo transcurrido, llamarlo «Terminó el horario previsto», sin cambiar ejecución ni inferir evidencias. |
| Calendario | Mes/semana/año, reglas efectivas y excepciones. | Conservar calendario real y ajustes futuros. | **Conservar/pulir:** tacto, foco y detalle progresivo; no recalcular fechas con IA. |
| Evaluación | Tres entradas, selección de nivel explícita, revisión por competencia y niño. | Conservar flujo moderno. | **Conservar/corregir:** período correcto, carga honesta y protección del trabajo pendiente. No rehacer evaluación por completo. |
| Informes/consolidado | Lotes, versiones, matriz y Excel. | Revisar excepciones y cierre protegido. | **Conservar/simplificar:** resaltar pendientes reales y descarga. No prometer importación SIAGIE ni confirmación masiva de niveles. |
| Documentos/Mi aula | Cuatro carpetas modernas, descarga completa y datos institucionales. | Mismos accesos y fuentes canónicas. | **Conservar:** no duplicar formularios; hacer secundaria la preparación del paquete completo y aclarar disponibilidad. |
| Revisión de período | Revisión futura opcional y propuestas reutilizables. | Mantener o revisar año sin obligación. | **Conservar opcionalidad:** no otro cierre obligatorio ni regeneración del año completo. |

## 6. Componentes que se reutilizan

Los cambios deben partir de estos componentes y servicios. No se propone reemplazar componentes modernos por equivalentes nuevos ni modificar lectores históricos incidentalmente.

| Necesidad | Reutilización concreta |
|---|---|
| Shell y continuidad | `TeacherWorkspace`, `workspace-location.ts`, `teacher-navigation.mjs`, guardas de navegación y parámetros actuales. La portada moderna de Planificación está en `teacher-workspace.tsx`; `PlanningHome` corresponde a otro recorrido y no debe confundirse con ella. |
| Aula y niños | `PilotSetup`, `StudentsScreen`, `StudentPhotoEditor`, `StudentEnrollment`, `ProfileAndDiagnostic`; validación/alta existentes de `pilot-onboarding-service.mjs`. |
| Grupo y entrevistas | `GuidedDiagnosticV4`, `FamilyInterviewV4`, `DiagnosticBriefReview`; seis preguntas y contrato actuales, dictado y adjuntos opcionales. |
| Captura de observación | `SpontaneousDiagnosticV4`, `OrdinaryObservationDialog`, `EvidenceDialog`, `DictationRecorder`, selección de estudiantes y controles de medios privados. Dos adaptadores, sin fusión de identidad ni historial. |
| Conversación y contexto | `AnnualPlanningConversation`, `AyniChatMessage`, `ExperienceContextForm`, `AnnualJourneyWorkspace`; fuentes/decisiones separadas, `contextItems`, conversación y recursos existentes. |
| Año | `AnnualSlotEditor`, `NewAnnualProposal`, mapa/lista y `annual-year-editor.mjs`; tramos, protecciones, biblioteca e historia. |
| Preparación y actividad | `AnnualPreparationProgress`, `PreparationProgress`, `SimpleProjectWorkspace`, `NextActivity`, `ActivityRunView`, `PedagogicalBlock`; jobs y Plan Maestro actuales. |
| Uso cotidiano | `TodayHome`, `SchoolCalendarScreen`, `AttendanceDialog`; calendario y ejecución autoritativos. |
| Evaluación/documentos | `EvaluationHome`, `PeriodEvaluation`, `CompetencyPeriodReview`, `PeriodBatchPanel`, `FamilyReportGenerator`, `PeriodConsolidated`, `DocumentsScreen`, `PlanningDownload`; servicios de fuentes, versiones y exportación. |
| Interacción consistente | `Button`, `AsyncButton`, `Dialog`, `Sheet`, formularios y estados existentes. Adoptar el diálogo compartido antes de construir otro modal. |

## 7. Funcionalidades, contratos y permisos que se protegen

| Contrato o dato | Protección exigida durante cualquier cambio |
|---|---|
| Propiedad del aula/estudiante | Autorización en servidor y RLS, autenticación, Origin y Storage privado. Una pantalla más simple no reduce verificación ni permite leer otra aula. |
| Alta y matrícula | IDs internos e historial, estados y comprobación `expectedStatus`, límites de aula e importación. No eliminar físicamente por «Retirar», ni fusionar homónimos automáticamente. |
| Entrevistas | Identidad de preguntas, estructura de respuestas, autosave y estado borrador/confirmado, nuevas versiones y fuente familiar. Una entrevista no demuestra desempeño observado. |
| Diagnóstico | Rutas `/api/diagnostic-v4/...`, origen espontáneo/guiado, fecha, momento y `competencyIds`. Hoy la atribución diagnóstica y la ordinaria tienen límites y semánticas diferentes; no normalizarlas silenciosamente. |
| Observación ordinaria | `/api/ordinary-observations`, `clientRequestId`, `raw_text` original, `corrected_text` vigente, `source_revision`, motivo, anulación e invalidación de fuentes. Esta ruta fija fecha en servidor; permitir elegir otra exige contrato nuevo validado. |
| Medios | Foto/grabación opcional, permisos del dispositivo y propiedad del archivo. No enviarlos a IA por defecto ni copiarlos a una caché pública para recuperar borradores. |
| CNEB | Referencia versionada e IDs estables; competencia, criterio y evidencia esperada diferenciados de hecho observado y nivel final. No cambiar catálogo ni prompts por necesidad visual. |
| Año y calendario | IDs, versión del editor, 15 tramos modernos y lectores antiguos, fechas efectivas, protecciones pasadas/vinculadas, confirmación docente e historial. Biblioteca conserva propuestas retiradas. |
| Conversación/contexto | Historial, mensajes, procedencia y versión usada para generar, recursos y pasado declarado. Eliminaciones manuales no reaparecen; nuevas decisiones no se pierden por una edición anterior. |
| Preparación IA | Job durable, lease, idempotencia, estados inciertos, dispatch receipts, reintento parcial, Plan Maestro y actividades graduales. Recuperar un trabajo no autoriza crear otro duplicado. |
| Ejecución | Estado realizado/parcial/no realizado confirmado por la docente. La hora y la planificación no son prueba de ejecución. |
| Evaluación | Período/aula/niño/competencia correctos; niveles AD/A/B/C sin valor por defecto; insuficiencia de evidencia explícita; decisiones y conclusiones docentes confirmadas. |
| Informes/cierre | Conclusiones canónicas, versiones, huella de fuentes, invalidación selectiva, lote recuperable, exportaciones. Cierre y reapertura con motivo; no pisar documentos históricos. |

Los cambios de presentación no necesitan cuentas nuevas, secretos nuevos, migraciones o nuevos permisos. Si se detecta una necesidad real de persistencia —por ejemplo, autosave del contexto anual o importación revisable— se diseña y revisa ese contrato por separado. Un cambio de base usaría migración nueva; nunca edición de una aplicada.

## 8. Implementación propuesta: etapas pequeñas y reversibles

**Este plan no inicia trabajo.** Cada etapa termina un flujo vertical, tiene commit identificable y validación, y se revisa antes de abrir la siguiente. La implementación no incluye autorización implícita de despliegue.

| Etapa | Alcance y motivo | Validación específica | Rollback |
|---|---|---|---|
| 0 · Baseline | Reproducir F01/F02/F04 con datos sintéticos en entorno de prueba autorizado; registrar fechas, fuentes, versiones y consumo. Confirmar qué acciones reanudan jobs. | Comparación de registros/versiones antes y después; capturas sin datos reales; fixture con observación ya corregida y chat con contexto editado. | Ningún cambio de producto; retirar solo fixtures identificados si se autoriza. |
| 1 · Observación confiable | Completar abrir → escribir → guardar → ver vigente → corregir → salir/volver. F01/F02, estados de carga y protección durante preparación de medios. Mantener ruta, atribución y jobs actuales. | Cerrar por X, fuera, Escape, navegación y recarga; segunda corrección; red lenta/fallo/respuesta incierta; un registro por `clientRequestId`. | Revertir commit de UI. Persistencias nuevas, si se necesitaran, aisladas y compatibles con versión anterior. |
| 2 · Período y borrador | Abrir Evaluar → elegir período → editar → guardar borrador o confirmar → volver conservando trabajo. F03/F13 y reproducción/protección de F15, incluyendo lote antes de pulirlo. | Fecha dentro/entre/antes/después de períodos; bimestres/trimestres; enlace explícito; carga sin ceros ficticios; cambiar niño/competencia/período con texto pendiente no lo descarta silenciosamente ni confirma un nivel. | Revertir selección y guardas cliente; no cambiar valoraciones confirmadas. Persistencia de borrador solo por contrato existente validado. |
| 3 · Chat anual claro | Abrir/retomar conversación → revisar contexto → crear borrador → recuperar preparación. Unificar panel visual. Resolver F04 solo tras validar persistencia/identidad; no prometerla con un plegado. | Contexto corregido/eliminado y turno nuevo; reload; borrador sin enviar; `ready` opcional; creación única; fuentes de generación coinciden con contexto mostrado. | Revertir UI; contrato de persistencia separado, versionado y compatible, si fuese necesario. |
| 4 · Grupo y matrícula | Configurar → registrar niño → entrevista/observación → continuar al año. Formularios progresivos, lista compacta, diagnóstico con dos caminos y guiada breve. | Aula vacía, matrícula incompleta, familias sin entrevista, nombres iguales, retiro/restauración con historia. Importación de archivo y edición de nombre solo en subetapa explícita. | Revertir presentación; conservar altas, entrevistas y matrícula. No cambios destructivos de datos. |
| 5 · Organizar y trabajar | Elegir propuesta → preparar proyecto → abrir actividad en Hoy → observar. Pulir mapa/lista, biblioteca plegada y accesos repetidos; calendario táctil. | 15 tramos y versión antigua; mover futuro/protegido; móvil sin arrastre; días no lectivos; reapertura del job y actividad JIT sin duplicación. | Revertir UI por flujo; servicios de fechas, protecciones y preparación intactos. |
| 6 · Cerrar y descargar | Revisión docente → informe por lote → consolidado → exportación. Resaltar excepciones, trabajo pendiente y documentos disponibles; mantener revisión futura opcional. | Evidencia insuficiente, fuentes cambiadas, editar/reintentar un informe, cierre/reapertura, valores exactos en Word/Excel y retorno desde Planificación al mismo año. | Revertir UI; conservar versiones y cierres existentes. |

**Subetapa posterior condicionada:** si se aprueba que diagnóstico guarde antes de sugerir, estudiar el adaptador de guardado y la cola con sus revisiones e idempotencia. No incluir esa modificación de backend en un commit de «menos botones». Un historial conjunto empezaría como proyección de lectura de ambas fuentes, sin migrar ni copiar registros.

Para cada etapa: typecheck, lint, build y prueba funcional aplicable, tal como exige el proyecto. Cambios relevantes de arquitectura y errores reproducidos se documentan con síntoma, causa, solución validada y prevención. Un despliegue futuro requiere solicitud expresa, commit identificable, árbol limpio, staging y smoke; nada de ello se ejecuta en esta fase.

## 9. Criterios de aceptación y regresión

### Claridad y continuidad

- La primera vista muestra una acción principal acorde con su tarea; controles equivalentes no compiten en encabezado, tarjeta y acciones rápidas. Si una revisión bloquea confirmación, su aviso permanece visible aunque el detalle esté plegado.
- Niños, diagnóstico, chat y año admiten trabajo incompleto. No se añaden mínimos de entrevistas, observaciones, turnos o lectura de todas las tarjetas. Se conservan las validaciones pedagógicas y de interpretación que realmente exige confirmar.
- «Guardado», «Pendiente» y «Error» reflejan persistencia real. Salir y volver recupera el borrador donde se promete autosave; en otro caso se protege y explica la salida. Un toast optimista no sustituye confirmación de guardado.
- Editar una observación usa la corrección vigente; el original sigue accesible. Dos correcciones consecutivas no restauran silenciosamente texto anterior. Anular conserva historia y actualiza solo las fuentes futuras afectadas.
- Corregir/quitar contexto, conversar de nuevo y generar utiliza el contexto vigente completo; lo eliminado no reaparece. La prueba compara datos guardados y payload, además de lo visible.
- Escribir análisis o motivo, cambiar niño y regresar conserva el borrador o pide una decisión antes de descartarlo. Editar una conclusión/informe y salir del lote aplica la misma protección; guardar borrador no confirma niveles ni cierra períodos.
- Hoy, Mi año y Planificación retoman la misma aula/versión; los botones Atrás/Adelante y enlaces existentes conservan destino y selección. No perder guardas al adoptar enlaces semánticos.

### Datos y dominio

- Dos docentes y dos aulas sintéticas no pueden leer ni modificar datos, medios o documentos ajenos; comprobar servidor y RLS remotos, además del cliente. Una revisión local de políticas no reemplaza esta prueba.
- Listas e informes distinguen activo/retirado y conservan historial. Importación no duplica por reintento ni fusiona automáticamente niños con igual nombre; revisión previa muestra errores sin crear registros aún.
- Entrevista familiar, observación directa, oportunidad planificada y valoración final mantienen procedencias distintas. Sin evidencia no aparece una dificultad inventada ni un C automático.
- Proyectos viejos, año antiguo, año moderno, ingreso tardío, datos incompletos y aulas de 3/4/5 años siguen abiertos; el pasado sin registro no se completa ficticiamente.
- Fecha entre períodos no abre Bimestre 1 por defecto; período explícito permanece. Calendario, feriados, gestión y excepciones producen las mismas fechas antes/después de una simplificación.
- Mover una propuesta respeta el tramo, carga protecciones antes de habilitar cambios y conserva biblioteca e historial. El servidor rechaza movimiento protegido aunque se intente fuera de la UI.
- Confirmar nivel, año y cierre sigue siendo una decisión docente. Cambiar una fuente marca la revisión necesaria sin sobrescribir silenciosamente una conclusión o documento confirmado.

### Recuperación, IA y costos

- Doble clic, timeout tras guardado y reload no duplican observaciones ni jobs. Estados inciertos consultan estado antes de reintentar; un lote recupera únicamente lo pendiente.
- Plegar paneles, seleccionar propuestas, filtrar, mover propuestas permitidas y exportar documentos no añaden generación IA. La prueba usa registros de llamadas; no lo deduce solo de la cantidad de botones.
- Retomar una preparación existente distingue continuar ese job de crear uno nuevo. Abrir chat nuevo tiene hoy posibles efectos de creación; cualquier cambio de ese comportamiento conserva el contrato y se mide por separado.
- El panel de contexto reutiliza datos de la conversación; no hace una segunda síntesis por turno. Clasificación opcional y análisis pedagógico solicitado no se convierten en IA automática universal.
- Texto/dictado y medios conservan sus reglas. Denegar micrófono/cámara no impide guardar texto; foto o audio de menores no se envían a IA por defecto.

No se calcula un ahorro monetario sin una medición por operación y modelo. El objetivo estructural es conservar la generación gradual y evitar llamadas nuevas por navegación, decoración o duplicación de resumen. La comparación de costos debe separar llamadas nuevas, recuperación de trabajos existentes y reintentos.

### Móvil, accesibilidad y usabilidad

- Verificar 360/390 px y escritorio, zoom real al 200 %, textos largos y teclado. Sin scroll horizontal del documento; el scroll **interno** del mapa/matriz es válido si se entiende y se controla.
- Controles táctiles de al menos 44×44 px, foco visible, nombres accesibles, estado sin depender de color, diálogo con foco contenido/Escape/retorno y anuncios de guardado/carga. Respetar reducción de movimiento y espacio de navegación inferior.
- Mapa anual seleccionable y reorganizable con teclado/botones sin arrastrar; lista alternativa conserva selección y todas las capacidades. Consolidado móvil permite filtrado útil sin perder la matriz ni su exportación.
- Probar con 3–5 docentes con poca familiaridad tecnológica y datos ficticios: registrar niño, retomar entrevista, guardar/corregir observación, crear año con contexto incompleto, abrir actividad y ubicar el período correcto. Registrar tiempo, errores, intervenciones y confianza en lo guardado.
- Meta inicial propuesta, no resultado obtenido: al menos 80 % de tareas completadas sin intervención; cero pérdida/duplicación de trabajo; todas las participantes distinguen guardado de confirmación y evidencia de valoración. Repetir tareas de retorno después de una interrupción. Ajustar las metas con el baseline observado.

## 10. Validación realizada y límites

| Comprobación de esta auditoría | Resultado y alcance |
|---|---|
| Rama remota, HEAD y diff de commits | Verificados. Árbol limpio antes de crear este informe. Producto idéntico entre SHA de despliegue y checkout auditado. |
| Metadata Vercel y alias | Preview/Producción READY y `ea206bf`, consultados en vivo; bandera y proyecto comprobados. Sin cambios remotos. |
| Navegación actual | Diagnóstico, Hoy, Evaluar, Planificación y Calendario en sesión existente. Se verificó duplicación/contexto de domingo y fallback a Bimestre 1. Sin mutaciones pedagógicas voluntarias. |
| Viewport móvil | Solicitado 390×844; ancho útil medido 375 px, `scrollWidth` 375 en Calendario. También se revisó portada Evaluar. Flechas de calendario 40×36 px. No equivale a certificar todas las pantallas ni teclado/zoom. |
| Evidencia visual histórica | Captura móvil del chat del 09/10 apoya que el contexto desplaza la conversación. La captura anual pequeña/comprimida no se tomó como prueba fiable de layout móvil. No se incorporan capturas con datos identificables al informe. |
| Pruebas focales | **47 PASS, 0 FAIL, 0 SKIP**, en ocho archivos de navegación, selección UX, año, recorrido, entrevista, calendario y diálogo de evidencia. Son helpers y contratos de fuente; no E2E integral ni validación remota. |
| Typecheck | `tsc --noEmit --incremental false`, exit 0. |
| Lint | Exit 0, dos warnings de imports sin uso en scripts privados `.local`; sin errores. |
| Detector Impeccable | Tres avisos revisados manualmente: dos `animate-bounce` ya condicionados a `motion-safe`; el borde del marcador Hoy es funcional. No se elevaron automáticamente a fallos de accesibilidad. |
| Build y suite integral | **No repetidos en esta fase**, sin cambios de producto. Los 775 PASS y builds Next/Vinext constan en QA histórica del release; no se presentan como ejecuciones nuevas. |
| Flujo autenticado completo, consumo IA y datos | Pendientes. No se generaron planes/informes ni se ejercieron mutaciones para auditarlos. Sin comparación exhaustiva de filas o ledger de costos. |
| Dispositivos y autorización remota | Micrófono/cámara físicos, zoom 200 % y aislamiento autenticado remoto entre dos docentes siguen pendientes. |

Comandos ejecutados para validación estática/focal, usando el Node instalado:

```text
node --test --test-reporter=spec src/lib/teacher-navigation.test.mjs src/lib/workspace-ux-selection.test.mjs src/lib/annual-year-editor.test.mjs src/lib/annual-year-map.test.mjs src/lib/planning-journey.test.mjs src/lib/family-interview-redesign.test.mjs src/lib/school-calendar-navigation.test.mjs src/lib/evidence-dialog-layout.test.mjs
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/eslint/bin/eslint.js . --ignore-pattern dist --ignore-pattern .next --ignore-pattern .local/qa-tools
```

Warnings identificados: import `readFile` sin uso en `.local/integral-age-fixture.mjs`; `fileURLToPath` sin uso en `.local/internal-rls-regression.mjs`. No se corrigieron como efecto lateral de una auditoría.

## 11. Referencias de código y antecedentes

Los enlaces siguientes fijan la lectura al commit `e3a107f`; las líneas son puntos de entrada para verificar cada hallazgo. Los componentes completos y sus servicios deben leerse antes de implementar.

| Evidencia | Archivo / punto de entrada |
|---|---|
| [E01] | `teacher-workspace.tsx`: navegación moderna en 72, error cloud en 272, encabezado/acciones en 315–324, portada moderna Planificación en 441. |
| [E02] | `students-screen.tsx`: estadísticas/formulario/importación/continuación, 87–124. |
| [E03] | `student-enrollment.tsx`: matrícula, retiro y recuperación con estado esperado. |
| [E04] | `family-interview-v4.tsx`: estados, autosave y guardas en 36–110; opciones en 117–134; pregunta/cierre/resumen en 204–270. |
| [E05] | `guided-diagnostic-v4.tsx`: entradas en 139–144, modalidades/catálogo y avance en 166–228. |
| [E06] | `ordinary-observation-dialog.tsx`: guardado/corrección en 47–77; salida en 100; presentación/corrección en 158–173. |
| [E07] | `annual-planning-conversation.tsx`: apertura/resume en 19; contexto, chat y CTA en 27–32. |
| [E08] | `annual-journey-workspace.tsx`: edición/contexto en 83–85, guarda en 121, generación y contexto en 204–208, formulario/conversación en 253. |
| [E09] | `annual-slot-editor.tsx`: mapa/tramos/3060 px en 81–100; biblioteca, oportunidades y diálogos en 106–115. |
| [E10] | `simple-project-workspace.tsx`: carga y preparación, contexto/calendario, siguiente actividad y confirmación. |
| [E11] | `today-home.tsx`: actividad destacada, día no lectivo y acciones rápidas. |
| [E12] | `school-calendar-screen.tsx`: navegación, vistas, fuentes, excepciones y modal de taller. |
| [E13] | `evaluation-home.tsx`: fallback de período en 40 y contadores de portada en 50–53. |
| [E14] | `period-evaluation.tsx`: selección de período en 98 y recorridos modernos de revisión/cierre. |
| [E15] | `competency-period-review.tsx`: evidencias, estado local de análisis, nivel y confirmación docente. |
| [E16] | `period-consolidated.tsx`: matriz, filtros, conclusiones y Excel. |
| [E17] | `spontaneous-diagnostic-v4.tsx`: fecha/momento, sugerencia previa y persistencia/atribución. |
| [E18] | `scripts/local-db-server.mjs`: diagnóstico alrededor de 1053–1100 y ordinarias alrededor de 2659–2690. |
| [E19] | `pilot-onboarding-service.mjs`: validación del aula, CSV y límites de matrícula. |
| [E20] | `pilot-setup.tsx`: formulario, calendario, opciones curriculares, campos documentales y logo. |
| [E21] | `experience-context-form.tsx`: contexto editable, recursos y registros de ingreso tardío. |
| [E22] | `annual-year-editor.mjs`: validaciones estructurales, fechas/protecciones e historia. |
| [E23] | `ordinary-attribution-service.mjs`: revisiones, atribución, permisos y estado explícito sin clasificación. |
| [E24] | `period-batch-panel.tsx` y servicio de informes: lote recuperable, versiones e invalidación. |
| [E25] | `planning-download.tsx`: preparación y descarga del paquete de documentos. |

Antecedentes locales contrastados:

- `HANDOFF_ASTRA_MEDIUM_AYNI_UX_SIMPLIFICACION_2026-10-11.md`, entregado en Downloads: hipótesis, orientación de simplificación y precauciones de conservación.
- `AYNI_IDEAL_2_0_ESPECIFICACION_VIVA.md`, entregado en Downloads: principios y pantallas P00–P21; se contrastaron especialmente configuración, matrícula, diagnóstico, P08/P09 y preparación/cierre.
- `docs/PROJECT_MEMORY.md`, `docs/DECISIONS.md`, `docs/ERRORS_AND_FIXES.md`, `PRODUCT.md`, `DESIGN.md` y QA reciente: arquitectura y correcciones existentes. Las decisiones recientes de Plan Maestro/actividades graduales prevalecen como descripción de implementación sobre propuestas antiguas.
- [Guía de interfaces de Vercel](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), consultada para criterios de teclado, foco, semántica, estados y tacto. No sustituye verificación de accesibilidad en el producto.

**Decisión pendiente del propietario:** aprobar esta dirección y el inicio de la etapa 0/1. Hasta esa aprobación no se inicia implementación. La propuesta conserva capacidades y concentra el esfuerzo en recuperar trabajo, comprender el contexto y presentar una decisión a la vez.

[E01]: https://github.com/sebasmonget-lgtm/aula-virtual-cneb/blob/e3a107ffc9d8d83f1cbd73c4b68129a8a03d854f/src/features/dashboard/components/teacher-workspace.tsx#L72
[E02]: https://github.com/sebasmonget-lgtm/aula-virtual-cneb/blob/e3a107ffc9d8d83f1cbd73c4b68129a8a03d854f/src/features/dashboard/components/students-screen.tsx#L87
[E03]: https://github.com/sebasmonget-lgtm/aula-virtual-cneb/blob/e3a107ffc9d8d83f1cbd73c4b68129a8a03d854f/src/features/dashboard/components/student-enrollment.tsx
[E04]: https://github.com/sebasmonget-lgtm/aula-virtual-cneb/blob/e3a107ffc9d8d83f1cbd73c4b68129a8a03d854f/src/features/dashboard/components/family-interview-v4.tsx#L36
[E05]: https://github.com/sebasmonget-lgtm/aula-virtual-cneb/blob/e3a107ffc9d8d83f1cbd73c4b68129a8a03d854f/src/features/dashboard/components/guided-diagnostic-v4.tsx#L139
[E06]: https://github.com/sebasmonget-lgtm/aula-virtual-cneb/blob/e3a107ffc9d8d83f1cbd73c4b68129a8a03d854f/src/features/dashboard/components/ordinary-observation-dialog.tsx#L100
[E07]: https://github.com/sebasmonget-lgtm/aula-virtual-cneb/blob/e3a107ffc9d8d83f1cbd73c4b68129a8a03d854f/src/features/dashboard/components/annual-planning-conversation.tsx#L19
[E08]: https://github.com/sebasmonget-lgtm/aula-virtual-cneb/blob/e3a107ffc9d8d83f1cbd73c4b68129a8a03d854f/src/features/dashboard/components/annual-journey-workspace.tsx#L83
[E09]: https://github.com/sebasmonget-lgtm/aula-virtual-cneb/blob/e3a107ffc9d8d83f1cbd73c4b68129a8a03d854f/src/features/dashboard/components/annual-slot-editor.tsx#L81
[E10]: https://github.com/sebasmonget-lgtm/aula-virtual-cneb/blob/e3a107ffc9d8d83f1cbd73c4b68129a8a03d854f/src/features/dashboard/components/simple-project-workspace.tsx
[E11]: https://github.com/sebasmonget-lgtm/aula-virtual-cneb/blob/e3a107ffc9d8d83f1cbd73c4b68129a8a03d854f/src/features/dashboard/components/today-home.tsx
[E12]: https://github.com/sebasmonget-lgtm/aula-virtual-cneb/blob/e3a107ffc9d8d83f1cbd73c4b68129a8a03d854f/src/features/dashboard/components/school-calendar-screen.tsx
[E13]: https://github.com/sebasmonget-lgtm/aula-virtual-cneb/blob/e3a107ffc9d8d83f1cbd73c4b68129a8a03d854f/src/features/dashboard/components/evaluation-home.tsx#L40
[E14]: https://github.com/sebasmonget-lgtm/aula-virtual-cneb/blob/e3a107ffc9d8d83f1cbd73c4b68129a8a03d854f/src/features/dashboard/components/period-evaluation.tsx#L98
[E15]: https://github.com/sebasmonget-lgtm/aula-virtual-cneb/blob/e3a107ffc9d8d83f1cbd73c4b68129a8a03d854f/src/features/dashboard/components/competency-period-review.tsx
[E16]: https://github.com/sebasmonget-lgtm/aula-virtual-cneb/blob/e3a107ffc9d8d83f1cbd73c4b68129a8a03d854f/src/features/dashboard/components/period-consolidated.tsx
[E17]: https://github.com/sebasmonget-lgtm/aula-virtual-cneb/blob/e3a107ffc9d8d83f1cbd73c4b68129a8a03d854f/src/features/dashboard/components/spontaneous-diagnostic-v4.tsx
[E18]: https://github.com/sebasmonget-lgtm/aula-virtual-cneb/blob/e3a107ffc9d8d83f1cbd73c4b68129a8a03d854f/scripts/local-db-server.mjs#L1053
[E19]: https://github.com/sebasmonget-lgtm/aula-virtual-cneb/blob/e3a107ffc9d8d83f1cbd73c4b68129a8a03d854f/src/lib/pilot-onboarding-service.mjs
[E20]: https://github.com/sebasmonget-lgtm/aula-virtual-cneb/blob/e3a107ffc9d8d83f1cbd73c4b68129a8a03d854f/src/features/dashboard/components/pilot-setup.tsx
[E21]: https://github.com/sebasmonget-lgtm/aula-virtual-cneb/blob/e3a107ffc9d8d83f1cbd73c4b68129a8a03d854f/src/features/dashboard/components/experience-context-form.tsx
[E22]: https://github.com/sebasmonget-lgtm/aula-virtual-cneb/blob/e3a107ffc9d8d83f1cbd73c4b68129a8a03d854f/src/lib/annual-year-editor.mjs
[E23]: https://github.com/sebasmonget-lgtm/aula-virtual-cneb/blob/e3a107ffc9d8d83f1cbd73c4b68129a8a03d854f/src/lib/ordinary-attribution-service.mjs
[E24]: https://github.com/sebasmonget-lgtm/aula-virtual-cneb/blob/e3a107ffc9d8d83f1cbd73c4b68129a8a03d854f/src/features/dashboard/components/period-batch-panel.tsx
[E25]: https://github.com/sebasmonget-lgtm/aula-virtual-cneb/blob/e3a107ffc9d8d83f1cbd73c4b68129a8a03d854f/src/features/dashboard/components/planning-download.tsx
