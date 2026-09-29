# Fidelidad de Luna: hallazgos observados en DEV

Análisis descriptivo posterior; no cambia gold ni prompts. No usa Jev/Luna como jueces.

## DEV057 / V2.3 / repetición 1

Original: «Llevó una bolsita sobre la cabeza hasta el cono; cuando se inclinaba redujo la velocidad.»

Entrada efectiva de Luna/Jev RAW tras el filtro común: «[persona] una bolsita sobre la cabeza hasta el cono; cuando se inclinaba redujo la velocidad.» El verbo inicial no llega a Luna.

CLEAN devolvió «[persona] llevó una bolsita sobre la cabeza hasta el cono. Cuando se inclinaba, reducía la velocidad.» Añadió un verbo inferido a partir del contexto. Coincide con la acción del original, pero ese original completo no estaba disponible para Luna. RAW se abstuvo (suficiencia 0.62), CLEAN eligió Motricidad (0.81). Su evidencia literal no se pudo alinear por la reformulación.

INTERPRET devolvió «Con una bolsita sobre la cabeza, avanzó hasta el cono; cuando se inclinaba, redujo la velocidad.» También agregó un verbo de acción y `brief_interpretation=null`. Eligió Motricidad (0.84). No atribuir la corrección de este caso a una interpretación breve que no existió.

Este caso muestra una interacción entre anonimización y reformulación. No permite concluir que limpiar dictado fiel baste, ni que toda reconstrucción sea correcta en datos reales. El benchmark conserva la clasificación acertada contra gold y registra el riesgo textual por separado; no altera etiquetas ni scores.

## DEV075 / V2.1 / repetición 3

La modalidad INTERPRET clasificó una sola manipulación de masa como Motricidad; el gold pedía abstención. `brief_interpretation=null`. El error apareció tras limpieza y envoltorio de la modalidad, sin frase interpretativa agregada. No identifica causalmente un sesgo de interpretación breve.

## Límite de verificación

Schema JSON estricto verifica estructura, no fidelidad semántica. `groundEvidence` verifica alineación de una cita con el original, no que la limpieza preserve todos los hechos ni que la cita justifique la competencia. No es un juez pedagógico. Los fallos de alineación se informan como evidencia vacía/revisión pendiente, sin corregir decisiones después del benchmark.

Prompts Luna y filtro siguen intactos. Cualquier corrección futura requiere una fase nueva; esta evaluación no modifica ninguno después de TEST.
