---
name: crear-proyecto-unidad
description: Desarrollar un proyecto o unidad de Educación Inicial desde una propuesta anual y el contexto autorizado del aula; devolver decisiones y una ruta de actividades estructuradas para revisión docente.
---

# Crear proyecto o unidad

Recibe **una** propuesta anual o un motivo emergente, el diagnóstico grupal pertinente, recursos y tarjetas CNEB filtradas para la edad del aula. Devuelve únicamente el JSON del `output_schema` de la aplicación. La docente revisa y confirma; el servidor asigna IDs, fechas y llena el DOCX.

1. Lee [fuentes-cneb.md](references/fuentes-cneb.md) para distinguir contexto, decisiones previas y currículo oficial.
2. Para la vista previa, propón contexto y propósitos sin fijar preguntas ni evaluación. Cuando la docente elija o modifique contexto, propósito y competencias, deriva de esas decisiones las preguntas, el recorrido y los criterios generales. No recuperes una decisión anterior que ya cambió.
3. Para el Plan Maestro, conserva las decisiones confirmadas y lee [contrato-ruta.md](references/contrato-ruta.md). Usa solo los días lectivos que entregue Ayni; propone el mapa completo sin desarrollar todavía las actividades. La docente revisará el mapa antes de confirmar el proyecto.
4. Para redactar el documento formal, usa únicamente el Plan Maestro confirmado. La aplicación controla las fechas, los IDs y la plantilla DOCX.

Cada proyecto incluye `meaningful_situation`: un párrafo que relaciona su origen sustentado, la oportunidad de aprendizaje y una pregunta o reto abierto adecuado a la edad. Usa el contexto confirmado, incluidos los aportes adicionales de la docente. No inventes intereses infantiles ni disponibilidad de recursos; distingue observación, reporte familiar e invitación docente. Sin interés registrado, puedes proponer una oportunidad curricular, explicándola como propuesta docente. Las preguntas, competencias y actividades deben responder a esa situación. No repitas la situación en el fundamento pedagógico ni anticipes resultados.

Escribe para la profesora, sin mostrar identificadores como `child_N`, claves de fuentes ni etiquetas del sistema en la prosa. Puedes decir «según un registro del aula» conservando el alcance individual. Cada encuentro debe aportar una acción, comparación, decisión o uso de información diferente del anterior. Las relecturas y las nuevas pruebas tienen un propósito nuevo explícito; no rellenes la ruta repitiendo una exploración. En mediación concreta una ayuda viable con los recursos confirmados y mantén las condiciones de seguridad. No exijas un producto uniforme ni conviertas la flexibilidad en ausencia de intención pedagógica.

En lectura de un cuento breve, ofrece preferentemente el relato completo en el primer encuentro, con tiempo para disfrutarlo. No distribuyas unas pocas páginas entre varios días solo para llenar el recorrido. Una lectura por entregas requiere una razón vinculada con la extensión, las condiciones o una decisión docente explícita. Después de conocer el relato, las relecturas deben buscar nuevas relaciones, pistas o interpretaciones; no trates el desenlace conocido como una sorpresa ni conviertas las preguntas en una prueba de memoria.

`curriculum.target_age` es la edad del aula y `curriculum.confirmed_competency_ids` contiene las competencias ya elegidas. Conserva esos IDs en las listas de competencias y usa en cada fila de `activity_route` uno o varios de esos mismos IDs pertinentes a lo que se hará. Cada competencia declarada debe tener su propio criterio y evidencia: la principal en los campos principales y las demás en `additional_criteria`. Asigna a cada criterio sus `observation_moments` (opening, development, closure), sin agrupar todos automáticamente en Desarrollo. No es obligatorio trabajar todas las competencias del proyecto en cada actividad.

No inventes intereses, observaciones, resultados, productos realizados ni desempeños oficiales. No conviertas el producto colectivo en evidencia individual. La planificación con los niños y la valoración posterior se registran cuando ocurran. Escribe en español claro para una profesora de Inicial.

En situación, propósito, recorrido, mediación, criterios y evidencias usa frases cortas, verbos concretos y una idea por oración. Explica qué podrían hacer los niños y qué acompañaría la docente; evita lenguaje burocrático. Mantén literalmente los nombres oficiales de competencias y capacidades. La ruta anticipa posibilidades, no predice lo que ocurrirá cada día.

Cuando recibas el catálogo oficial por edad, enlaza cada criterio general y diario con los IDs pertinentes en `official_performance_refs`, también para los criterios adicionales. Lee el sentido completo de cada desempeño: no elijas por coincidencias de palabras. El criterio contextualiza la actuación sin exigir todo el desempeño en un día. Si el catálogo no publica desempeños para esa competencia y edad, usa una lista vacía y el referente de ciclo; no copies otra edad ni inventes citas. Los ejemplos oficiales no son observaciones del aula. En mediación da dos o tres acciones concretas y termina las frases; sintetiza con holgura antes del límite de longitud.
