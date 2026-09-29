# Corrección QA: observaciones del Diagnóstico inicial, aula de 5 años

> **Seguimiento de sugerencias, 2026-09-29:** La primera importación dejó las 12 notas con `classifier_status='disabled'`, por lo que la interfaz no mostró recomendaciones. Se corrigió únicamente el estado de esas 12 filas a `CURRENT_V2_4_RAW` pendiente y el flujo existente de Jev las procesó. Resultado: 8 `suggested`, 4 `abstained`, 0 decisiones docentes. Las seis entrevistas, los 12 textos originales, el 6/6 de Observar y el 0 de ordinarias permanecen. Ver sección final.

Fecha: 2026-09-29. Aula local CELESTE, ID `92a0659e-ebdd-40da-9ab9-6a34542392fe`. Se corrigió el destino de las observaciones ficticias sin cambiar lógica, prompts, modelos ni migraciones.

## Investigación previa

La vista `GuidedDiagnostic` muestra `step_progress.observed_student_count` para «2. Observar». `diagnosticStepProgressForTeacher` cuenta cada alumno activo del aula que tenga **al menos una** fila en `diagnostic_experience_observations`, `diagnostic_spontaneous_observations` o `student_observations` vinculado a una sesión diagnóstica. El conteo es por alumno, no por número de notas. `ordinary_observations` no participa. «Conocer» cuenta entrevistas confirmadas; «Resumir» depende de una revisión grupal confirmada. Antes de la corrección: seis entrevistas confirmadas, cero alumnos observados, 24 notas ordinarias.

Las observaciones espontáneas del diagnóstico se guardan en `diagnostic_spontaneous_observations`; tienen `student_id`, `classroom_id`, `context_label`, `observation_text`, `observed_at` y estado de clasificación. En esta carga se usó el servicio `recordSpontaneousObservation` con `classifierEnabled=false`: guarda hechos sin llamar a Jev ni elegir competencia, con `classification_status='needs_review'`. `ordinary_observations` es el registro RAW posterior que puede vincularse a períodos y atribuciones curriculares; era el destino incorrecto para este QA.

## Carga final

Se seleccionaron O1 y O2 de cada caso ficticio. O3 y O4 describen evolución posterior, por lo que no se incorporaron al diagnóstico inicial. Las notas quedaron fechadas al momento de esta carga local, sin fechas simuladas futuras ni período. No se alteró el texto de las notas ni las entrevistas.

| Alumno | O1 | O2 |
| --- | --- | --- |
| Valentina Rojas | Narró un viaje de su muñeca durante juego libre. | Permaneció callada ante una pregunta al grupo. |
| Mateo Quispe | Agrupó tapas por color y tamaño. | Mostró frustración tras caerse su torre. |
| Camila Torres | Guardó materiales y limpió su mesa sin recordatorio. | Expresó tristeza y su motivo ante una compañera. |
| Thiago Mendoza | Preguntó por el cambio de color de una hoja. | Comparó hojas y altura de dos plantas. |
| Luciana Vargas | Dibujó a su familia y escribió letras. | Repartió roles en el juego de tienda. |
| Diego Salazar | Ensanchó la base de un puente de bloques. | Indicó dónde estaban guardadas unas tijeras. |

Cada alumno tiene dos filas diagnósticas, por eso los seis cumplen el predicado `exists` del contador. Las seis entrevistas permanecen confirmadas con los mismos IDs. Ninguna nota tiene atribución curricular, nivel AD/A/B/C o resultado de Assessment. No se confirmó ni abrió la etapa «Resumir».

## Retiro del error y recuperación

Se hizo un respaldo de PGlite con la API detenida en `.local/qa-backups/before-diagnostic-correction-2026-09-29/` (1431 archivos, 62 464 095 bytes). Antes de cambiar datos se cotejaron los 24 IDs originales con `.local/qa-six-students/seed-result.json`, alumno y texto RAW, y se verificó que no existían revisiones ni atribuciones. En una transacción se añadieron las 12 notas diagnósticas, se desactivó temporalmente **solo** el trigger local `ordinary_observation_no_delete`, se borraron exactamente esas 24 filas y se reactivó el trigger. La transacción comprobó 0 ordinarias restantes y los mismos seis IDs de entrevistas confirmadas. El trigger quedó activo tras el commit. El respaldo permite restaurar la base anterior si hiciera falta; restaurarlo también revertiría esta corrección.

El script de corrección y su manifiesto de 12 IDs quedan en `.local/qa-six-students/` (ignorados por Git). Los scripts `scripts/qa/seed-six-qa-students.mjs` y `verify-six-qa-students.mjs` documentan la carga histórica equivocada y **no deben ejecutarse** para este diagnóstico.

## Verificación

- API: `GET /api/diagnostics` devolvió `observed_student_count=6`, `group_review_confirmed=false`; estado de entrevistas 6 confirmadas; lista de espontáneas 12 (dos por alumno); lista de ordinarias 0; ninguna clasificación docente.
- UI local en `http://localhost:5174/`: «Conocer 6/6 entrevistas», «Observar 6/6 niños», «Resumir Pendiente». En «Observación espontánea» se ven las 12 notas recientes.
- No se llamó a Jev, Assessment ni generación de síntesis durante la corrección.
- Pruebas automatizadas relacionadas: 20/20 PASS (`diagnostic-review-service`, `diagnostic-review-progress`, `diagnostic-sources-v4`). `npx tsc --noEmit`, `npm run lint` y `npm run build`: PASS. Build emitió solo avisos de tamaño de chunk y clasificación dinámica de ruta.

## Seguimiento: sugerencias V2.4

La ausencia inicial de recomendaciones fue causada por la opción `classifierEnabled=false` usada en el script de importación, no por un fallo de Jev. Se respaldó de nuevo PGlite en `.local/qa-backups/before-jev-suggestions-2026-09-29/` (1431 archivos, 62 505 055 bytes). Se verificaron los 12 IDs del manifiesto y que ninguno tenía clasificación docente; una transacción marcó solo esas 12 filas como pendientes para `CURRENT_V2_4_RAW`. Al reiniciar la API con el clasificador V2.4 activo, su cola existente produjo las sugerencias. No se cambió el texto RAW, el modelo, prompt ni umbrales.

| Alumno | O1 | O2 |
| --- | --- | --- |
| Valentina | `COM_ORAL` sugerida | Abstención |
| Mateo | `MAT_CANTIDAD` sugerida | Abstención |
| Camila | Abstención | Abstención |
| Thiago | `CYT_INDAGA` sugerida | `MAT_CANTIDAD` sugerida |
| Luciana | `COM_ESCRITURA` sugerida | `PS_CONVIVE` sugerida |
| Diego | `MAT_FORMA` sugerida | `MAT_FORMA` sugerida |

Comprobación por API y UI: 12 notas, 8 sugerencias visibles, 4 mensajes de evidencia insuficiente, 0 confirmaciones docentes, Conocer 6/6, Observar 6/6, Resumir pendiente y 0 observaciones ordinarias. Las sugerencias requieren revisión de la docente; no son evaluaciones ni niveles de logro.
