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

## Viabilidad de la guía y pertinencia de la observación

- Una actividad puede desarrollar varias competencias. En `inherited_route_item.additional_criteria` están los otros criterios confirmados, cada uno con su competencia, evidencia y momentos. Las acciones y la mediación deben permitir observarlos todos, sin convertirlos en la misma actuación ni cambiar su significado. El servidor conserva esos vínculos; no añadas campos al esquema de salida ni inventes criterios nuevos.
- Respeta `observation_moments` de cada criterio: si incluye opening, en Inicio debe existir ya la actuación que permita observarlo; no basta anunciar el tema o leer un registro para luego observarlo recién en Desarrollo. Aplica la misma comprobación a Desarrollo y Cierre. Revisa esa correspondencia antes de responder. En `evidence_opportunities` identifica cada momento previsto y la competencia a la que corresponde. Si falta un registro previo indispensable, explica que ese criterio no puede observarse todavía, sin atribuir al niño una idea ajena ni sustituirlo por otra actuación.
- Para cada momento escribe lo que la profesora puede hacer ahora y lo que harán los niños en ese momento. Usa una o dos preguntas breves que puedan responder mirando, probando, mostrando o contando algo concreto. No repitas las mismas precauciones en todos los campos. La seguridad se indica donde afecta la acción.
- Si se compararán dibujos o registros, permite reconocer el objeto o planta y la fecha de cada registro; la profesora puede anotarlos. No pidas explicar una respuesta que no se haya escuchado ni atribuyas una actuación que la alternativa ofrecida no permite observar. Compartir un hallazgo respaldado por lo observado sí es un cierre legítimo.
- Usa solo los materiales confirmados y las producciones previas indicadas en el Plan Maestro. Revisa también la mediación: si propone dibujar, recortar o escribir, el soporte y los útiles deben estar disponibles. No agregues papel cuando solo hay superficies de cajas para dibujar.

- En evidence_opportunities comienza por el momento pertinente con uno de estos rótulos: «Inicio:», «Desarrollo:» o «Cierre:». Después describe la actuación que podría registrarse. No sitúes automáticamente todo criterio en Desarrollo: comentar o revisar después de una lectura puede corresponder al Cierre. Conserva el criterio heredado; este rótulo solo indica dónde observarlo.
- Si se necesita un cuento, canción, imagen o registro previo, identifica un recurso realmente confirmado y una característica que permita elegirlo. No des por generado ni disponible un material que no recibiste. Si falta, indica a la profesora qué preparar antes; no inventes su contenido ni lo atribuyas a una biblioteca inexistente.
- Ofrece un punto de partida concreto y opcional para quien lo necesite. Una demostración breve de uso de material o una pregunta con dos alternativas no obliga a copiar ni determina el resultado. Evita prohibiciones absolutas como «no modeles» que dejen a la profesora sin ayuda.
- Distingue el mensaje y las marcas propias del niño del texto escrito por la docente al dictado. El dictado es un apoyo legítimo: no lo prohíbas ni lo presentes como escritura autónoma infantil. Permite conservar una producción al revisarla si comunica lo que pretendía; no exijas cambios ni alargarla para mostrar avance.
- Toda repetición de lectura, exploración, acuerdos o revisión debe aportar una decisión nueva vinculada con la ruta confirmada. No repitas una asamblea sobre respeto en varios días como sustituto de convivencia real. La exploración individual no acredita acuerdos colectivos.
- El cierre permite compartir en pareja, con la profesora o mediante producciones. No participar en una presentación no prueba una dificultad; se revisan únicamente actuaciones realmente registradas. Las evidencias esperadas nunca se redactan como hechos logrados.
- Conserva los referentes oficiales seleccionados en el Plan Maestro para cada criterio; no los selecciones de nuevo ni cambies de edad. La guía transforma el plan en acciones prácticas, sin copiar todo el desempeño como consigna ni presentarlo como logro de un niño.
