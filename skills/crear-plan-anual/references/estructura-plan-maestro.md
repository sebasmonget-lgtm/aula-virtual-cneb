# Estructura del Plan Maestro

Devuelve un único objeto compatible con `annual-plan-v2`. El esquema entregado por la aplicación es la autoridad para nombres y tipos de campos.

## Síntesis anual

- `title` y `school_year`: corresponden al aula y año recibidos.
- `general_context_summary`: describe el grupo y el contexto que realmente constan, en lenguaje sencillo.
- `planning_priorities`: oportunidades priorizadas a partir de los hallazgos y comentarios docentes; evita juicios categóricos.
- `competency_overview`: explica la selección y distribución de competencias aplicables, sin inventar referentes oficiales.
- `annual_purposes`, `teaching_strategies`, `assessment_followup`, `family_collaboration` e `inclusive_supports`: expresan decisiones útiles y sustentadas. En `assessment_followup`, contempla cómo recoger y revisar actuaciones individuales en los distintos ámbitos presentes a lo largo de los doce proyectos; no reduzcas la evaluación a los primeros proyectos ni llames «instrumento» a un criterio. Las listas pueden quedar vacías cuando el dato no esté disponible y el esquema lo permita.
- `review_checkpoints` y `flexibility_notes`: indican cómo revisar y ajustar las propuestas durante el año.

## Secuencia de propuestas

Entrega exactamente **12 proyectos iniciales**, tres en cada uno de los cuatro periodos, en orden: `Bimestre 1` a `Bimestre 4`. Usa `experience_type: "project"`. La acogida, adaptación y evaluación diagnóstica es una etapa independiente: no es P01 y no requiere producto final.

Cada proyecto necesita título propio, situación o punto de partida concreto, motivo vinculado al diagnóstico o contexto, al menos una competencia principal aplicable, posibles secundarias solo si aportan, categorías de evidencia y una nota de flexibilidad. La primera categoría de `expected_evidence_categories` debe describir brevemente una actuación observable vinculada a la competencia principal: el Word recoge esta evidencia principal de **cada uno de los doce proyectos**. Reparte oportunidades de observación entre las competencias pertinentes de toda la secuencia, incluyendo comunicación, matemática, indagación, movimiento y otras áreas cuando el contexto y las tarjetas curriculares lo sustenten. Un producto colectivo no demuestra por sí solo el aprendizaje individual. Varía temas, situaciones, propósitos curriculares y títulos: nunca diferencies proyectos repitiendo un título y añadiendo un número. Las doce propuestas son una previsión modificable, no una obligación de ejecutarlas todas sin cambios.

No fijes fechas, duración, número de sesiones, productos finales ni materiales detallados en esta etapa. El servidor calcula las semanas lectivas; el modelo de redacción desarrolla los detalles después de validar el Plan Maestro. Usa frases cortas y palabras comunes.
