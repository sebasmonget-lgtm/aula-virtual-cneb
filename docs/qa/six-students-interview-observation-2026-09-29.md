# QA: seis alumnos ficticios en el aula local de 5 años

Fecha de carga: 2026-09-29. La instrucción posterior de la usuaria cambió el destino del dataset: se añadió al aula **existente de 5 años** (`92a0659e-ebdd-40da-9ab9-6a34542392fe`) del checkout `jev-luna-benchmark`. No se creó otra aula, no se inventaron fechas de nacimiento y no se utilizó una cuenta remota. Antes de la carga, el aula tenía cero alumnos. Su perfil institucional y su logo no se modificaron.

## Datos cargados

| Fuente real | Resultado |
| --- | --- |
| `students` | Valentina Rojas, Mateo Quispe, Camila Torres, Thiago Mendoza, Luciana Vargas y Diego Salazar; seis activos, cuatro observaciones cada uno. |
| `student_family_interviews` | Seis entrevistas de versión 1, `status='confirmed'`, con respuestas en campos existentes. |
| `student_context_snapshots` | Se refrescó cada perfil después de confirmar su entrevista; los seis tienen `family_interview_context`. |
| `ordinary_observations` | 24 notas RAW con `source_kind='spontaneous'`, fecha de ocurrencia en Lima y `context_snapshot.evaluation_period_id`. |
| `ordinary_observation_attributions` | Cero. Las 24 notas quedan en revisión curricular docente. |
| `evidences`, `competency_assessments` | Cero para estos alumnos; no se asignaron niveles AD/A/B/C ni se ejecutó Assessment. |

Las respuestas se adaptaron a las preguntas reales de entrevista: `interests`, `interest_tags`, `autonomy_context`, `communication_emotional_context`, `social_context` y `adaptation_context` según lo informado en cada caso. `safeFamilyContext` proyecta esos campos de entrevistas confirmadas en el contexto diagnóstico individual. No se rellenaron lengua, experiencia educativa previa, rutinas ni expectativas que la familia no había mencionado. La procedencia sigue identificada como entrevista familiar, no como observación docente.

| Observación de cada alumno | Fecha de ocurrencia | Período guardado |
| --- | --- | --- |
| O1 | 2026-09-30 | Bimestre 3 |
| O2 | 2026-10-07 | Bimestre 3 |
| O3 | 2026-10-19 | Bimestre 4 |
| O4 | 2026-11-09 | Bimestre 4 |

Son fechas simuladas de QA posteriores a la entrevista y posteriores al día de carga. O4 está tres semanas después de O3, como indica el caso de Valentina. Hay 12 notas vinculadas a cada uno de los bimestres 3 y 4. El RAW coincide con el texto suministrado. Los casos permiten observar cambios sin predeterminarlos: silencio y posterior narración de Valentina, frustración y nuevo intento de Mateo, explicación emocional posterior de Camila, atención distinta según actividad de Thiago, negociación posterior de Luciana y explicación oral posterior de Diego.

## Límite de la evaluación actual

La entrevista no crea filas en `evidences`, `ordinary_observations` ni `competency_assessments` por sí misma. Las 24 observaciones posteriores sí tienen fecha y período en el registro RAW. El contrato F8 convierte una observación ordinaria en fuente de Assessment **por competencia** únicamente después de una atribución confirmada por la docente; ninguna se confirmó durante esta carga. Así, el conjunto está preparado para revisar atribuciones y después evaluar, sin anticipar esa decisión.

Comportamiento de interfaz observado: «Conocer» marca **6/6 entrevistas**; «Observar» del diagnóstico inicial sigue en **0/6** porque las 24 notas son observaciones ordinarias posteriores, no registros de ese paso diagnóstico. Esto no se corrigió ni se maquilló como progreso de diagnóstico.

## Reproducción, verificación y reversión

- Datos: `scripts/qa/six-qa-students.dataset.json`.
- Carga: `scripts/qa/seed-six-qa-students.mjs`, ejecutado con la API local detenida. Exige un aula activa existente de 5 años y sin alumnos/evidencias previos; aborta si encuentra otros datos en esas tablas.
- Comprobación HTTP: `scripts/qa/verify-six-qa-students.mjs`. Confirmó edad 5, seis alumnos, seis entrevistas confirmadas, RAW y fechas de las 24 notas, período no nulo y 24 revisiones pendientes. La API quedó en `http://127.0.0.1:8788` y la interfaz en `http://localhost:5174/` con observación ordinaria, revisión curricular y lectura F8 habilitadas por flags locales.
- Respaldo anterior: `.local/qa-backups/before-six-qa-students-2026-09-29/` (ignorado por Git). Para revertir la carga, detener la API y restaurar ese directorio sobre `.local/pgdata`; no se ha hecho rollback del resultado final.
- Validación de código: typecheck, lint y build correctos; 53/53 pruebas focales de entrevista, contexto, observación ordinaria, atribución y períodos. No hubo llamadas pagadas a Jev en la carga.

No se cambiaron arquitectura, prompts, modelos, thresholds ni lógica pedagógica. No hubo despliegue.
