# Diagnóstico

Ejecutado: 15 entrevistas confirmadas, 5 notas guiadas y 24 espontáneas. No se ingresaron datos por SQL ni endpoints de escritura. Se usó la misma pantalla de una docente y la clasificación automática real. Los cinco registros guiados fueron de cinco niños en una experiencia, no una fila rellenada para todos.

El mapa muestra 12 competencias aplicables al escenario de 5 años, sin castellano L2 ni religión. Tiene 15 filas. Las notas de convivencia llegan a 9 niños. El caso de Omar queda sin competencia y las celdas dicen sin observaciones, no C. Valeria tiene cantidad y convivencia tras la intervención docente. Ver `evidencias/diagnostic-map-dom.txt`.

Se guardó un único comentario individual, el apoyo de Mateo. Los otros catorce no fueron obligatorios y el sistema permitió preparar el grupo. Guardar ese comentario lo confirmó automáticamente. No se usó IA para el comentario de un niño.

## Grupo y propuesta de IA

La pantalla Así está mi grupo mostró correctamente Naturaleza en 11 familias, 9 niños con registros de convivencia y la advertencia de que ausencia de registro no significa dificultad.

Se ejecutó Sugerir resumen con Ayni. Llamada comprobada: OpenAI, gpt-6-sol, workflow `diagnostic_group_synthesis`, 4,052 tokens de entrada y 412 de salida, costo estimado por tarifa US$0.012224. No es costo facturado devuelto por proveedor.

La propuesta sostuvo la necesidad de acuerdos, escucha de propuestas y turnos, reconoció iniciativas generales de exploración/creación/comunicación y evitó interpretar ausencia como dificultad. No incluyó el interés por naturaleza ni la distinción concreta de dos fortalezas. El contexto de esa llamada incorpora notas por alias y comentarios vigentes, pero no los intereses agregados de las entrevistas. La pantalla sí los tenía.

Se conserva la propuesta original en `evidencias/group-original-ai-dom.txt` y en el snapshot anterior a la confirmación. La docente simulada revisó las tres respuestas por UI, explicitó 9/15, 11/15, apoyo individual y falta de información del recién incorporado, y confirmó. Este aporte humano no se adjudica como acierto automático de Ayni.

## Evaluación de los enlaces comprobados

| Enlace | Estado | Evidencia |
| --- | --- | --- |
| Entrevistas a patrones del grupo | PASS | Naturaleza 11/15 correctamente agregada |
| Hechos a mapa por competencia | PASS con intervención docente | Correcciones J16/J18/J24 necesarias |
| Falta de notas a insuficiencia, no dificultad | PASS en mapa y resumen | Omar sin competencia; sin niveles asignados |
| Necesidad de convivencia a resumen automático | PASS | Acordar materiales y turnos |
| Interés familiar a propuesta automática del grupo | FAIL | Dato visible omitido del contexto de esa llamada |
| Apoyo individual a grupo | PARTIAL | No lo generaliza como déficit grupal, pero el plan de apoyo concreto lo añadió la docente |
| Confirmación pedagógica del grupo | PASS | Solo se confirmó tras revisión docente |

## Prioridades y exportación

Se generaron y confirmaron sin modificar tres prioridades: «Acuerdos y uso compartido de materiales», «Exploración y cuidado del huerto» y «Observar desafíos de cantidad en distintos contextos». Representan necesidad, interés y fortaleza/oportunidad; no convierten todos los casos en déficits. Llamada real OpenAI gpt-6-sol: 2,215 tokens de entrada, 555 de salida, US$0.009980 estimados. El plan borrador utiliza estas prioridades: ver `05_PLAN_ANUAL.md`.

El diagnóstico del grupo quedó confirmado, versión 1; los comentarios individuales no se volvieron obligatorios. La descarga real `evidencias/diagnostico-confirmado.docx` contiene exactamente los tres textos del grupo confirmados y los datos correctos de institución/docente. Sin embargo, no todo el contenido exportado está en la vista previa: las secciones derivadas tienen fallos de aplicabilidad y selección de evidencias, H11–H14 y H16. Su estructura ZIP/XML se inspeccionó, pero NO se validaron paginación ni aspecto visual: el renderizador LibreOffice no está disponible en el runtime autorizado.

El diagnóstico no equivale a evaluación del período. Las notas aquí registradas no produjeron valoraciones ni informes familiares del bimestre. El ciclo anual NO quedó cerrado.
