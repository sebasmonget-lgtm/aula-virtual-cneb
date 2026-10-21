# Revisión del documento de evaluación diagnóstica de Ayni

Fecha: 20 de octubre de 2026. Estado: propuesta para revisión conjunta, sin modificar el generador ni los registros docentes.

La estructura del diagnóstico de Ayni es aprovechable, pero debe dar más espacio al análisis pedagógico sustentado y menos a las frases generales. Un número de registros permite conocer cobertura; no explica por sí solo cómo está aprendiendo un niño ni qué acompañamiento necesita.

## Documento que se está revisando

Se usó `C:/Users/ASUS/Downloads/diagnostico-aula-2026-ef4197e7.docx`, descargado el 29 de septiembre de 2026: Jardín 428, CELESTE, cinco años, siete niños, 21 registros y siete entrevistas. Es una referencia histórica, con contenido familiar expresamente rotulado como prueba ficticia. No corresponde al aula actual de QA de diez niños, cuyo catálogo no tiene un diagnóstico guardado.

El archivo original se conservó. Se convirtió para lectura a PDF mediante `render_docx.py`: trece páginas. Se inspeccionó el conjunto con imágenes de página y se amplió la revisión de las páginas 5 y 9. La apertura del PDF en el panel lateral fue solicitada; la herramienta devolvió `queued`, por lo que no se certifica que el usuario lo haya visto.

Las observaciones sobre fechas y maquetación de este archivo no se atribuyen automáticamente a la versión actual. Para distinguirlas, también se revisaron `diagnostic-unified-word.mjs` y `diagnostic-report-word.mjs`.

## Base oficial y criterio de revisión

La [cartilla MINEDU sobre evaluación diagnóstica en Inicial](https://repositorio.minedu.gob.pe/handle/20.500.12799/12683), pp. 4–7, 13–16 y 19–27, orienta a conocer competencias, intereses, formas de aprender y condiciones de familia y comunidad; consolidar información individual y grupal; analizarla con referentes curriculares y usarla para decidir. Sus matrices son ejemplos de organización, no la única plantilla posible.

El [Programa Curricular de Educación Inicial](https://www.minedu.gob.pe/curriculo/pdf/programa-curricular-educacion-inicial.pdf), apartado III, relaciona propósito, evidencia, criterios y condiciones de aprendizaje. El [CNEB](https://www.minedu.gob.pe/curriculo/pdf/curriculo-nacional-de-la-educacion-basica.pdf), pp. 177–182, fundamenta el análisis y la retroalimentación. Las [orientaciones de inicio de 2026 para Inicial](https://repositorio.minedu.gob.pe/handle/20.500.12799/12678), pp. 5 y 10, vinculan diagnóstico, características de los niños, fortalezas, necesidades y barreras con apoyos y planificación.

Se consultaron los PDF oficiales descargados, no únicamente resultados de búsqueda. No se encontró en esos apartados una obligación de usar la portada, las nueve secciones o las trece páginas del archivo de Ayni. La organización propuesta debajo es una recomendación de diseño basada en esos propósitos, no una plantilla nacional obligatoria.

## Información que conviene reunir y comunicar

| Contenido | Qué debería permitir comprender |
| --- | --- |
| Identificación y alcance | Aula, edad, docente, período real del corte, población y fecha de elaboración. Diferenciar diagnóstico de entrada y actualización posterior. |
| Fuentes y condiciones | Qué observaciones, producciones, entrevistas o antecedentes se revisaron; cuándo y en qué situaciones. Distinguir observación directa y relato familiar. |
| Caracterización pertinente | Intereses, formas de participación y aprendizaje, lenguas, bienestar y oportunidades o barreras del contexto, cuando están sustentados. |
| Análisis individual por competencia | Actuación observada, referente utilizado, interpretación docente delimitada y apoyo o información pendiente. No llenar casillas con suposiciones. |
| Síntesis grupal | Patrones y diferencias respaldados por registros; no generalizar desde uno o dos casos ni convertir el porcentaje de cobertura en logro. |
| Decisiones pedagógicas | Qué se priorizará y qué se ajustará en experiencias, interacciones, espacios, materiales y trabajo con familias. |
| Seguimiento | Qué se observará de nuevo, en qué oportunidad o fecha y quién revisará la información. |
| Procedencia consultable | Referencias al respaldo individual, disponibles para la docente sin imprimir todo el expediente en el informe grupal. |

No es necesario repetir íntegro todo el CNEB ni transcribir todas las entrevistas. Tampoco basta con una lista de observaciones sin interpretación. La ausencia de información debe quedar visible y no convertirse en una dificultad atribuida al niño. Cuando la evidencia permita una interpretación acotada, corresponde hacerla con revisión docente, en lugar de posponer indefinidamente toda decisión.

## Qué está bien y conservaría

- El propósito de conocer al grupo para orientar el acompañamiento, en lugar de aplicar una prueba aislada.
- La distinción entre entrevista familiar y observación de aula, y la atribución de los intereses reportados a las familias.
- Las actuaciones concretas incluidas como respaldo y el reconocimiento de información insuficiente.
- La conexión entre fortalezas, prioridades y primeras experiencias, especialmente en las páginas 4 y 9.
- La posibilidad de seguimiento individual y la conservación de fuentes para revisión docente.
- La ausencia de una nota asignada automáticamente por haber participado o por acumular registros. Esto no elimina la necesidad de describir el desarrollo que la evidencia sí permite reconocer.

## Qué corregir

| Ubicación | Hallazgo | Cambio que conviene discutir | Situación en el código actual |
| --- | --- | --- | --- |
| Portada y p. 2 | Se presenta marzo como período del diagnóstico, pero se analizan registros de septiembre. | Identificar el corte real y si es diagnóstico de entrada, incorporación tardía o actualización; no cambiar fechas de las fuentes para hacerlas coincidir. | El renderer actual distingue período previsto y fechas observadas y agrega una advertencia. Esa mejora no está en este Word anterior; una advertencia todavía no decide qué tipo de corte corresponde. |
| Pp. 5–8, lectura diagnóstica | Repite la cantidad de niños con registros y una cautela general. No describe lo que esas actuaciones permiten comprender. | Presentar análisis cualitativo validado por la docente, con alcance individual o grupal y referente identificado. Mantener el conteo como dato de cobertura. | Confirmado vigente: `transformDiagnostic` construye `reading` a partir de `notes.length` y del número de niños. No consulta allí una interpretación por competencia. |
| Pp. 5–8, decisión inicial | Se repite una misma recomendación en competencias con actuaciones distintas. | Decidir a partir del análisis: oportunidad concreta, apoyo o pregunta pendiente. No afirmar una dificultad ni inventar apoyos ya realizados. | Confirmado vigente: `decision` utiliza una de dos frases fijas según existan registros. |
| P. 5, evidencias de convivencia | Aparece una actuación sobre saltar bloques y modificar la distancia, sin un hecho de interacción o acuerdo que explique su vínculo con convivencia. | Revisar el vínculo en la fuente y su criterio, con decisión docente. No corregir solamente el rótulo del Word ni deducir otra competencia por una palabra. | Hallazgo del archivo histórico; no demuestra por sí solo que el clasificador o la atribución actual reproduzcan ese error. |
| Pp. 9–11, apoyos | Se ofrece el mismo siguiente paso para todos, aunque las fuentes familiares contienen condiciones de acogida diferentes. | Mostrar un apoyo provisional pertinente y su procedencia, y observar si resulta útil. El relato familiar puede orientar esa propuesta sin presentarse como actuación directamente observada. | El código actual conserva respuestas generales cuando el estado es información insuficiente y otras fórmulas basadas en intereses o competencias observadas; no equivale a una individualización pedagógica revisada. |
| Seguimiento individual | Los extractos pueden terminar a mitad de una oración sin aclarar el recorte. | Conservar el sentido, marcar el extracto y permitir consultar el original. | Confirmado vigente: recorte con `slice(0, 180)` dentro de comillas. |
| P. 4, adaptación y apoyos | Son orientaciones generales, aunque los títulos parecen prometer hallazgos del grupo. | Separar hallazgos sustentados, hipótesis de apoyo y aspectos aún no conocidos. | Ambos campos siguen definidos como textos fijos en `valuesFor`. |
| P. 12, próxima revisión | No queda claro qué se revisará ni en qué oportunidad concreta. | Registrar una fecha u oportunidad acordada y la señal que se observará. | Se mantiene una frase fija en `FECHA_REVISION_DIAGNOSTICO`. |

El problema principal no se resuelve añadiendo más títulos. Hay que conservar o producir una interpretación pedagógica revisable y usarla coherentemente en la vista del diagnóstico, el documento y las decisiones de planificación.

## Qué agregar

1. Un referente curricular identificable para el análisis pertinente a la edad, sin copiar todas las capacidades y desempeños en cada fila. El referente y el criterio contextualizado deben distinguirse.
2. Una conclusión individual por competencia cuando exista sustento: qué muestra el niño, en qué situación y con qué ayuda. Si falta información, precisar qué se necesita observar.
3. Una síntesis grupal que explique patrones y diferencias; el nombre de la competencia y el número de registros no bastan.
4. Decisiones concretas sobre la organización del aula y el trabajo con familias, además de una lista de actividades futuras. Incorporar oportunidades y barreras comunitarias cuando se conozcan.
5. Un seguimiento verificable. La cantidad de prioridades debe responder a los hallazgos, sin imponer tres por la estructura de la plantilla.

## Qué quitar o reducir

- Las explicaciones de plantilla dirigidas a quien la rellena, una vez que el informe está terminado. Por ejemplo, la instrucción de omitir el seguimiento si no hay casos no es un hallazgo diagnóstico.
- La repetición del mismo aviso de insuficiencia y de la misma decisión en cada competencia. Puede conservarse una sección compacta de pendientes con su alcance claro.
- La reproducción doble de observaciones extensas en análisis por competencias y seguimiento individual. Mantener respaldo consultable y los ejemplos necesarios.
- La reiteración de la síntesis y las prioridades en varias secciones cuando no aporta una decisión nueva.
- La página 13 casi vacía, reservada a firmas en esta conversión. La firma de dirección debe ser una opción institucional, no una exigencia atribuida al CNEB.

No quitaría la portada únicamente para alcanzar un número de páginas. Tampoco eliminaría información insuficiente, las diferencias individuales o la trazabilidad: conviene expresarlas con menos repetición y mayor precisión.

## Estructura propuesta para revisar juntos

1. Identificación, propósito y corte real.
2. Fuentes y caracterización pertinente del grupo.
3. Síntesis diagnóstica por competencias, con respaldo y límites.
4. Prioridades, apoyos y decisiones de organización y planificación.
5. Seguimiento y pendientes.
6. Anexo individual privado, separado del informe grupal cuando resulte útil.

Esta es una propuesta de organización. No se implementó ni se reescribieron conclusiones. La siguiente decisión es acordar qué análisis y qué respaldo debe mostrar el informe; después corresponderá modificar el flujo compartido y validarlo con muestras actuales, sin arreglar solamente este archivo histórico.
