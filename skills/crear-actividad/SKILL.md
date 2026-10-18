---
name: crear-actividad
description: Preparar una actividad de Educación Inicial desde una fila confirmada de la ruta del proyecto o unidad, sin regenerar sus decisiones curriculares.
---

# Crear actividad

Recibe el Plan Maestro confirmado, una fila de su mapa, las filas anterior y siguiente, la posición de la actividad, el contexto pertinente actualizado del aula y las tarjetas CNEB de la edad. Devuelve solo el JSON exigido por `output_schema`. Conserva el propósito específico, la competencia, el criterio y la evidencia esperada de la fila. Una actividad confirmada no se modifica individualmente; los cambios de un proyecto futuro se preparan como una nueva secuencia completa con aprobación docente e historia protegida. No reprogrames todo el proyecto ni desarrolles las otras actividades.

`curriculum.target_age` es la edad del aula. Si `curriculum.confirmed_competency_ids` contiene un ID, conserva exactamente ese ID y devuelve `competency_status: "confirmed"`; no lo reemplaces ni lo conviertas en pendiente.

1. Usa [herencia-y-curriculo.md](references/herencia-y-curriculo.md) para distinguir datos heredados, contexto y currículo.
2. Desarrolla inicio, desarrollo y cierre en lenguaje sencillo, con acciones posibles de los niños y preguntas de mediación.
3. En `evidence_opportunities`, explica de forma concreta «¿Qué observar?» durante esta actividad: una actuación visible del niño, ligada al criterio heredado, al propósito y a la edad del aula. No afirmes que ocurrió ni inventes registros individuales, logros, dificultades o reflexión posterior.

La actividad cotidiana es la unidad de trabajo. La plantilla DOCX y las fechas las controla la aplicación, no esta Skill.

En cada campo usa frases cortas, acciones concretas y una idea por oración. Separa con claridad lo que harán los niños, la intervención de la docente, las preguntas que puede usar, los materiales y lo que observará. Evita párrafos largos en inicio, desarrollo y cierre. Conserva literalmente los nombres oficiales del CNEB cuando correspondan.


## Guía para desarrollar la actividad en Hoy
En child_actions usa exactamente tres apartados rotulados «Inicio:», «Desarrollo:» y «Cierre:», con una o dos frases breves de acciones infantiles en cada uno. En mediation usa los mismos tres rótulos, con una o dos indicaciones prácticas para la profesora por momento: qué ofrecer, preguntar o hacer ahora. Una pregunta concreta es suficiente; evita listas de preguntas equivalentes, teoría y recordatorios repetidos.
Cada apartado corresponde a ese momento, no repitas Inicio/Desarrollo/Cierre dentro de otro apartado. Conserva la coherencia entre momentos y el propósito, criterio y evidencia heredados. meaningful_situation presenta la invitación inicial; closure_or_continuity conserva el cierre y la continuidad; teacher_preparation indica lo necesario antes de comenzar. evidence_opportunities explica brevemente qué podría observar, sin inventar registros ni logros. La aplicación presenta estas indicaciones en Hoy; Word conserva íntegros los campos formales de la actividad.

## Revisión de claridad antes de responder

- Cada indicación debe permitir actuar ahora: qué material ofrecer, qué intervención hacer o qué pregunta usar en esa situación concreta. Evita fórmulas vacías como «desarrollar la competencia» o «fomentar el aprendizaje significativo» como instrucciones.
- No encadenes dos paráfrasis de una misma acción: «dice qué hará el personaje; comenta qué podría hacer» expresa una sola idea. Escríbela una vez. Las acciones de la docente y las de los niños deben complementarse, no copiarse.
- En evidence_opportunities concreta qué actuación o expresión podría registrar la profesora y en qué situación. No copies el criterio ni lo reformules dos veces. Los ejemplos, si son necesarios, son posibilidades y no hechos ocurridos ni frases que el niño deba repetir.
- Comprueba que cada momento continúe el anterior, que los materiales y apoyos estén disponibles según el contexto confirmado y que las frases sean completas y naturales. No añadas recursos, competencias ni actuaciones para rellenar apartados.
- La revisión de redacción no autoriza alterar propósito, criterio ni evidencia heredados para hacerlos encajar con un texto nuevo.
- Una o dos intervenciones específicas por momento son suficientes. Concreta qué mostrar, acercar, comparar o registrar con los materiales confirmados. Si el reto es abierto, ofrece una ayuda opcional para quien no sepa cómo empezar; no una receta ni un resultado obligatorio. En indagación ayuda a decidir qué cambiar y qué mantener para poder comparar, cuando sea pertinente a la pregunta y a la edad.
- Mantén accesibles las distintas formas de participar. No repitas la misma lista de apoyos en todos los campos; ubica cada apoyo donde ayude a actuar. Las normas de seguridad y cuidado del cuerpo se mantienen aunque los acuerdos de organización se construyan con los niños.
- Si se retoma un texto o registro, explicita qué información se buscará ahora y para qué decisión se usará; la segunda lectura debe aportar algo distinto. La docente puede leer señalando el escrito y acoger las pistas infantiles, sin exigir decodificación convencional.
