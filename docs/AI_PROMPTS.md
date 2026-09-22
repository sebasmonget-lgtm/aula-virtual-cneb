# Contratos de IA

No hay llamadas activas a modelos en la entrega inicial. Cuando se implementen, toda llamada será server-side y validará salida JSON.

## Selección curricular con Jev

El backend carga únicamente el runtime de la edad del aula. Jev recibe fichas semánticas completas y solo puede devolver IDs incluidos en `candidates`; una ficha debe estar `verified` y tener trazabilidad oficial antes de ser elegible. Si no hay candidatos completos o la confianza es baja, el resultado es selección manual, nunca una invención curricular.

## Contrato para sugerir una actividad

Entrada mínima: resumen del aula, ficha de experiencia, dos o tres actividades recientes, IDs CNEB pertinentes, intereses nuevos y restricciones.

Salida esperada: `title`, `purpose`, `competency_ids`, `criteria`, `expected_evidence`, `sequence`, `materials` y `teacher_questions`.

Reglas: no reescribir texto oficial, no inventar observaciones de estudiantes, no repetir actividades recientes y marcar toda sugerencia como pendiente de confirmación.

## Contrato para resumir diagnóstico

Entrada: observaciones confirmadas por la docente. Salida: fortalezas, necesidades, intereses y prioridades con referencias a los IDs de observación utilizados. Si no hay evidencia suficiente, devolver `insufficient_data: true`.
