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

`curriculum.target_age` es la edad del aula y `curriculum.confirmed_competency_ids` contiene las competencias ya elegidas. Conserva esos IDs en las listas de competencias y usa en cada fila de `activity_route` solo uno de esos mismos IDs.

No inventes intereses, observaciones, resultados, productos realizados ni desempeños oficiales. No conviertas el producto colectivo en evidencia individual. La planificación con los niños y la valoración posterior se registran cuando ocurran. Escribe en español claro para una profesora de Inicial.
