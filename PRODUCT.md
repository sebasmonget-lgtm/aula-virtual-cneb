# Ayni Aula

Ayni ayuda a docentes de Inicial (3, 4 y 5 años) a conocer su aula, planificar actividades y acompañar aprendizajes con el CNEB oficial versionado. La actividad es la unidad cotidiana.

La navegación principal ofrece Mi año, Hoy, Calendario, Evaluar y Planificación. Mi aula permanece accesible para matrícula, fotos privadas opcionales, entrevistas y seguimiento.

Diagnóstico permite alternar entrevistas familiares, observación espontánea o guiada y revisión sin orden obligatorio. La síntesis breve cita registros concretos, diferencia contexto familiar de evidencia y se confirma en una versión con sus fuentes. Puede crearse el año con diagnóstico incompleto.

Mi año conserva 15 tramos temporales fijos, proyectos independientes y timeline horizontal como vista principal. Los lectores históricos conservan versiones de doce propuestas. La conversación docente plantea una pregunta breve cada vez, reutiliza lo ya respondido y diferencia aportes docentes de fuentes observadas.

Hoy prioriza la actividad y la observación contextual. La foto pertenece a la observación. En semana de gestión o al terminar un período ofrece Ir a Mi año; esta versión no propone reajuste inteligente desde Hoy.

Evaluar tiene tres espacios: Evaluación del bimestre (revisión por competencia y conclusiones), Informe a familias y Consolidado. Cada valoración corresponde a niño × competencia y la docente confirma AD/A/B/C. Ausencia de evidencia no equivale a C. Textos preparados por lotes tienen avance recuperable, revisión de excepciones y guardado conjunto; una corrección invalida únicamente las fuentes y el informe afectados. Un período cerrado exige reapertura explícita con motivo antes de modificar y recerrar en otra versión.

Los informes familiares conservan literalmente las conclusiones guardadas. El Word usa la plantilla existente con identificación del niño, docente, aula, período, edad y foto privada cuando existe. Consolidado es una matriz de consulta con conclusiones opcionales y Excel de Ayni; no promete un importador oficial de SIAGIE.

Planificación presenta cuatro carpetas: Evaluación diagnóstica, Plan anual, Proyectos y actividades, Evaluación. Documentos mantiene sus versiones y descargas existentes.

El objeto pedagógico estructurado es la fuente de verdad. Servidor y RLS controlan acceso; las evidencias privadas de menores no se envían a IA por defecto. La IA no inventa hechos ni confirma niveles. El paquete corregido del 7 de octubre autoriza Preview y después Production con el mismo SHA, únicamente tras superar los gates funcionales, visuales y de IA. Una validación fallida impide promover.

Fuente: solicitud y handoff del 7 de octubre de 2026; contratos e historia en docs/PROJECT_MEMORY.md y docs/DECISIONS.md.


## Arquitectura de IA vigente · paquete corregido 2026-10-07

Diagnóstico reúne actuaciones observadas, reportes familiares confirmados y comentarios docentes opcionales. Una síntesis GPT-6.1 Sol high conserva alias estables y referencias por afirmación; diferencia niño, subgrupo, falta de información y decisión de planificación. Las revisiones individuales y de prioridades pertenecen a contratos históricos, no al recorrido moderno.

Mi año conversa con Luna y prepara una vez con GPT-6.1 Sol high. Los quince tramos, fechas, movimientos, cobertura y validación son código. Una reparación se permite solo al fallar la validación. Las tarjetas son breves; el detalle se desarrolla en el proyecto. La generación larga guarda su response ID en el job privado y lo consulta, sin repetir generación al recargar. Biblioteca conversa con Luna y genera una tarjeta con GPT-6.1 Sol medium.

El proyecto conversa con Luna y registra los aportes docentes con su turno y texto de apoyo. Una sola generación GPT-6.1 Sol high prepara preguntas, criterios por competencia, recorrido y un blueprint por fecha confirmada. Confirmarlo no genera automáticamente todas las actividades. La actividad se desarrolla a pedido con Luna medium; su criterio se hereda. Solo un cambio docente confirmado del propósito o de las acciones infantiles permite realinearlo. Tiempo, materiales, lugar y redacción no disparan esa IA.

El taller es opcional dentro del día: una generación Luna medium y fallback GPT-6.1 Sol low únicamente por validación. No se prepara un Workshop Master moderno. El contenedor persistente es estructural; cada taller y su criterio se guardan por separado, sin modificar padres confirmados.

Evaluar calcula por código el contexto de actividades realizadas, criterios vigentes y referencias CNEB. Luna analiza observaciones originales del niño y competencia; el contexto familiar queda fuera. La docente decide y confirma AD/A/B/C. La conclusión usa las observaciones, la valoración docente y ese contexto calculado; el análisis previo de IA es auxiliar. Lotes durables conservan fuentes, versiones y huellas.

El informe familiar conserva por código las conclusiones confirmadas. El contexto familiar solo ayuda a redactar recomendaciones y tiene una huella propia; cambiarlo no altera evidencias ni notas. Los acuerdos los escribe la docente y desaparecen del Word cuando están vacíos. Consolidado, cierre y exportación son código. La observación contextual no clasifica; Jev raw exige flags, aceptación de privacidad y benchmark, con salida manual disponible.
