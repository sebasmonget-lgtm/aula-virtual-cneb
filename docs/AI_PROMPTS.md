# Contratos de IA

El contrato inicial de este documento se conserva como referencia histórica. Los flujos activos llaman a modelos desde el servidor y validan salidas JSON antes de presentarlas a la docente.

## Selección curricular con Jev

El backend carga únicamente el runtime de la edad del aula. Jev recibe fichas semánticas completas y solo puede devolver IDs incluidos en `candidates`; una ficha debe estar `verified` y tener trazabilidad oficial antes de ser elegible. Si no hay candidatos completos o la confianza es baja, el resultado es selección manual, nunca una invención curricular.

## Contrato para sugerir una actividad

Entrada mínima: resumen del aula, ficha de experiencia, dos o tres actividades recientes, IDs CNEB pertinentes, intereses nuevos y restricciones.

Salida esperada: `title`, `purpose`, `competency_ids`, `criteria`, `expected_evidence`, `sequence`, `materials` y `teacher_questions`.

Reglas: no reescribir texto oficial, no inventar observaciones de estudiantes, no repetir actividades recientes y marcar toda sugerencia como pendiente de confirmación.

## Contrato para resumir diagnóstico

Entrada: observaciones confirmadas por la docente. Salida: fortalezas, necesidades, intereses y prioridades con referencias a los IDs de observación utilizados. Si no hay evidencia suficiente, devolver `insufficient_data: true`.

### Flujo grupal vigente

La sugerencia opcional de «Revisar aula» usa `skills/crear-evaluacion-diagnostica/` como instrucciones del modelo. Recibe solo comentarios individuales confirmados, sin nombres conocidos, y devuelve `strengths`, `needs` y `planning_priorities` mediante un esquema JSON estricto. La profesora revisa y confirma el texto. Los IDs de observación y las entrevistas completas no salen al modelo ni se copian al informe Word; la estructura histórica descrita arriba no corresponde a este flujo.
