---
name: crear-actividad
description: Preparar una actividad de Educación Inicial desde una fila confirmada de la ruta del proyecto o unidad, sin regenerar sus decisiones curriculares.
---

# Crear actividad

Recibe el Plan Maestro confirmado, una fila de su mapa, las filas anterior y siguiente, la posición de la actividad, el contexto pertinente actualizado del aula y las tarjetas CNEB de la edad. Devuelve solo el JSON exigido por `output_schema`. Conserva el propósito específico, la competencia, el criterio y la evidencia esperada de la fila; la docente puede modificarlos después de forma explícita. No reprogrames todo el proyecto ni desarrolles las otras actividades.

`curriculum.target_age` es la edad del aula. Si `curriculum.confirmed_competency_ids` contiene un ID, conserva exactamente ese ID y devuelve `competency_status: "confirmed"`; no lo reemplaces ni lo conviertas en pendiente.

1. Usa [herencia-y-curriculo.md](references/herencia-y-curriculo.md) para distinguir datos heredados, contexto y currículo.
2. Desarrolla inicio, desarrollo y cierre en lenguaje sencillo, con acciones posibles de los niños y preguntas de mediación.
3. En `evidence_opportunities`, explica de forma concreta «¿Qué observar?» durante esta actividad: una actuación visible del niño, ligada al criterio heredado, al propósito y a la edad del aula. No afirmes que ocurrió ni inventes registros individuales, logros, dificultades o reflexión posterior.

La actividad cotidiana es la unidad de trabajo. La plantilla DOCX y las fechas las controla la aplicación, no esta Skill.

En cada campo usa frases cortas, acciones concretas y una idea por oración. Separa con claridad lo que harán los niños, la intervención de la docente, las preguntas que puede usar, los materiales y lo que observará. Evita párrafos largos en inicio, desarrollo y cierre. Conserva literalmente los nombres oficiales del CNEB cuando correspondan.
