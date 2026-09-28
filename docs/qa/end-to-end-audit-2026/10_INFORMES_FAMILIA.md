# Conclusiones e informes a familias

## Corte P4 posterior — dos informes contrastantes

Alma y Omar recorrieron conclusión confirmada → selección de competencia → IA real → revisión docente → borrador → confirmación → descarga Word. Alma conserva la autonomía en grupos pequeños y la pregunta docente necesaria en grupo de cinco; Omar comunica los acuerdos sostenidos en tres fechas sin trasladar la insuficiencia histórica P1. Las introducciones se personalizaron con nombre y se quitó de los próximos pasos de Omar un apoyo visual genérico no observado. Sus textos reales están en `evidencias/familia-{alma,omar}-p4.docx.txt`; los Word ZIP/XML no contienen marcadores sin resolver y sí institución, docente, fecha y contenido confirmado. Visual/paginación NO PROBADO.

**Dos de dos primeros intentos P4 devolvieron `family_report_schema_mismatch`; ambos segundos intentos dieron una propuesta válida.** Son cuatro invocaciones facturables para dos informes. El guardado seguro evitó confirmar contenido inválido, pero este patrón es H49 MEDIUM de confiabilidad/costo que requiere captura diagnóstica segura del tipo de fallo —sin prompts ni datos de menores en logs— y regresión, antes de considerarlo UX robusta. No se conoce la subcausa exacta del rechazo desde la UI; no se atribuye a un campo específico del modelo. En total P1–P4: nueve informes finales, trece invocaciones de informe, cuatro rechazos conocidos. Informe de progreso Word/PDF sigue sin probar/disponible.

## ANTES DEL FIX — auditoría original

Estado: barrera sin conclusiones PASS; generación/personalización/exportación del informe familiar NO PROBADAS.

En Evaluación del período → Informe a familias, Bimestre 4 y Joaquín seleccionado, se muestra «Sin conclusiones para este período» y se indica confirmar valoraciones/conclusiones primero. No hay salida inventada ni llamada a IA. La lista de niños permite selección, pero no una generación sin prerrequisitos.

Informe de progreso anuncia: «Se preparan desde las valoraciones confirmadas; el Word y PDF se añadirán con una plantilla posterior». También exige confirmar valoraciones y cerrar el período. Es una funcionalidad expresamente incompleta, H17; no se ha encontrado un archivo final de progreso descargable en este recorrido.

No se puede comparar tono, personalización, recomendaciones o diferencias entre dos familias sin salidas. El Word diagnóstico sí incluye seguimiento por niño, pero NO se confunde con un informe familiar de evaluación del período.

Para una nueva prueba, seleccionar Mateo y Thiago con trayectorias distintas, y Valeria/Bruno con evolución/contradicción. Confirmar hechos recientes y apoyos, no etiquetas ni diagnóstico clínico; lenguaje comprensible, sin nombres de otros niños, sin duplicar conclusiones de todo el grupo. Verificar versión confirmada frente a descarga completa y estados obsoletos después de una nueva evidencia.

Evidencias: `family-report-no-conclusions-dom.txt`, `progress-report-unavailable-dom.txt`, snapshot final `family_reports=[]` y `competency_descriptive_conclusions=[]`.

## DESPUÉS DEL FIX — cinco informes P1 confirmados y descargados

Thiago, Bruno, Valeria, Mateo e Inés recorrieron selección de conclusiones vigentes → IA real → revisión docente → guardar → confirmar → descargar Word, exclusivamente desde UI. Son cinco informes personalizados, no salida idéntica de aula:

- Thiago: reparto y conteo como fortaleza cuantitativa, convivencia con apoyo contextual; nombre de compañera retirado antes de confirmar.
- Bruno: conserva autonomía en pareja/grupo pequeño y mediación en grupo numeroso, sin etiqueta simplista.
- Valeria: progreso entre primer registro y acuerdos conocidos posteriores; apoyo ante desacuerdos nuevos.
- Mateo: pareja, anticipación visual y tarjetas, sin trasladar resultados a grupo grande ni presentar apoyo de acceso como déficit.
- Inés: propuesta de comparación, dibujos/registros y límites de inferencia sobre otras semillas; participación en acuerdos con autonomía en situaciones documentadas.

No se generó informe de Omar desde conclusiones inexistentes. Recomendaciones familiares se presentan como oportunidades cotidianas/condicionales, no como hechos ocurridos, tratamiento o logros nuevos. Dos propuestas (Thiago y Mateo) fueron rechazadas por `family_report_schema_mismatch`; sus reintentos desde UI fueron válidos, revisados y confirmados. No se relajó el validador ni se atribuye una causa interna sin evidencia. Se contabilizan siete llamadas, cinco informes finales y dos rechazos, además del rework de privacidad previo a H43.

Archivos reales: `evidencias/familia-{thiago,bruno,valeria,mateo,ines}-p1.docx`. Inspección XML/ZIP PASS para campos, institución/docente, logo y ausencia de marcadores sin resolver; no es render visual. LibreOffice no está disponible: render Word NO PROBADO. Informe de progreso con plantilla/cierre completo sigue pendiente; no se confunde con estos cinco informes familiares disponibles.

## DESPUÉS DEL FIX — primer informe de Omar en P2

Con sus tres notas de convivencia, valoración B y conclusión confirmadas, el informe de Omar se generó realmente en P2, se revisó, guardó, confirmó y descargó como `familia-omar-p2.docx`. Comunica pedir/esperar turnos y devolver fichas, conservando preguntas docentes cuando se incorpora un compañero nuevo. No afirma un nivel P1 ni llama dificultad al vacío anterior. Los marcadores `[estudiante]` se reemplazaron por el nombre mediante edición docente antes de confirmar. Una llamada, sin rechazo de schema. Seis informes familiares finales a esta altura y ocho llamadas (incluidos dos rechazos P1); el audio y envío directo a familias no se simularon como comprobados.

La inspección ZIP/XML del décimo Word descargado confirma institución/docente y logo, sin marcadores de plantilla `{{…}}`; no prueba maquetación visual. El contenido leído en la UI coincide con las actuaciones de junio y su conclusión fuente.

## DESPUÉS DEL FIX — comunicación de Valeria en P3

Una generación IA real, edición de introducción genérica a «Familia de Valeria», guardado, confirmación y descarga UI: `familia-valeria-p3.docx`. Describe separar aros, escuchar otra propuesta y organizar entrada/salida, recogida sin indicación individual y límites a esos dos días. No inventa dificultad correctiva ni afirma observación de todo el bimestre. Difiere del informe P1 con mediación ante cambios. Se revisó la fidelidad a fuente actual, no se afirma que el prompt haya recibido una comparación histórica individual P1–P3. Siete informes finales, nueve llamadas acumulativas y once Word descargados en este checkpoint; visual Word NO PROBADO.
