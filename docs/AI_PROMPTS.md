# Contratos de IA

No hay llamadas activas a modelos en la entrega inicial. Cuando se implementen, toda llamada será server-side y validará salida JSON.

## Contrato para sugerir una actividad

Entrada mínima: resumen del aula, ficha de experiencia, dos o tres actividades recientes, IDs CNEB pertinentes, intereses nuevos y restricciones.

Salida esperada: `title`, `purpose`, `competency_ids`, `criteria`, `expected_evidence`, `sequence`, `materials` y `teacher_questions`.

Reglas: no reescribir texto oficial, no inventar observaciones de estudiantes, no repetir actividades recientes y marcar toda sugerencia como pendiente de confirmación.

## Contrato para resumir diagnóstico

Entrada: observaciones confirmadas por la docente. Salida: fortalezas, necesidades, intereses y prioridades con referencias a los IDs de observación utilizados. Si no hay evidencia suficiente, devolver `insufficient_data: true`.
