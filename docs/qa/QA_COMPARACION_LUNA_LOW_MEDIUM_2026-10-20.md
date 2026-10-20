> Nota posterior: esta auditoría describe un formato histórico con sugerencia de nota. La decisión vigente elimina toda sugerencia y limita el párrafo a 30–70 palabras; ver QA_EVALUAR_SOLO_ANALISIS_2026-10-20.md.

# Comparación Luna low y medium para Evaluar

20/10/2026. Ronda autorizada de comparación; no se cambia el modelo de la aplicación, no se hace commit/push ni publicación hasta decidir con la persona usuaria.

## Conclusión

Medium mejora algunos párrafos y selecciona referentes algo más pertinentes, pero esta muestra no demuestra que sus sugerencias de nota sean más fiables. Coinciden en 9 de los 10 pares iniciales. En lectura avanzada medium cambia A→AD frente a low, pero vuelve a A al repetir el mismo contexto. Ambos mantienen B en el caso de dificultad persistente para repartir. Recomendar low provisionalmente es razonable; no atribuir a medium una calibración AD/C que no se verificó. La elección queda pendiente de la persona usuaria.

## Método y alcance

Diez pares: cuatro procedentes de observaciones de QA y seis casos controlados; todos de cinco años. Se vuelven a generar los diez low con la instrucción final, evitando compararlos con un prompt anterior. Misma entrada, competencias, estándar/desempeños oficiales de edad, instrucciones y esquema: hash de solicitud idéntico en cada pareja, excluyendo solo el plan de ejecución. Modelo gpt-6-luna, effort low/medium, sin fallback ni reintentos automáticos; tres llamadas simultáneas como máximo y orden de los esfuerzos alternado entre pares.

Después se repiten una vez con ambos esfuerzos los dos casos que ponen a prueba AD y B/C, cuatro llamadas adicionales. Total de esta ronda: 24 llamadas; 24 respuestas cumplen el validador. No es ensayo estadístico, revisión ciega independiente ni evaluación por una profesora. No cubre otras edades, todas las competencias, notas extensas ni todo el bimestre. Los hashes de todas las filas de valoraciones/borradores del aula permanecen idénticos antes y después. No se guardan los análisis generados en los registros pedagógicos cloud, solo telemetría de uso.

## Tiempo y costo de la primera pasada emparejada

| Medida | Low | Medium |
|---|---:|---:|
| Casos válidos | 10/10 | 10/10 |
| Promedio por llamada | 5.87 s | 6.36 s |
| Mediana por llamada | 5.82 s | 6.46 s |
| Tokens de entrada totales | 19453 | 19453 |
| Tokens de salida totales (incluye razonamiento facturado) | 3780 | 6492 |
| Estimado observado, 10 llamadas | USD 0,003184 | USD 0,005677 |
| Normalizado, entrada ordinaria sin caché | USD 0,003835 | USD 0,005191 |
| Proyección 200 pares similares, entrada ordinaria | USD 0,076706 | USD 0,103826 |
| Proyección 200 pares similares, toda entrada como escritura de caché | USD 0,086432 | USD 0,113553 |

La caché fue desigual: low tuvo 9884 tokens leídos de caché y medium ninguno. Por eso el cociente de costos observados exagera la diferencia del esfuerzo; las filas normalizadas usan la misma tarifa de entrada para ambos. Las tarifas por token son las mismas: USD0,10/M entrada ordinaria, USD0,01/M lectura de caché, USD0,125/M escritura de caché y USD0,50/M salida. Medium consumió más salida, que incluye razonamiento además del texto visible. Las proyecciones suponen 2–3 notas por par como esta muestra, sin reintentos; no constituyen presupuesto garantizado ni factura. Latencia observada incluye red/caché y no prueba velocidad intrínseca estable.

Las 20 llamadas iniciales terminaron en 50.0 s con tres en paralelo; no confundir ese tiempo con generar todo el bimestre. Costo adicional de cuatro repeticiones: USD 0,001048. Total de esta ronda: USD 0,009909. Sumado al piloto previo USD0,00753762: USD 0,017446; sigue bajo el máximo total QA de USD6 con el acumulado previo conservador (~USD4,75).

## Sugerencias iniciales

| Caso | Low | Medium |
|---|---|---|
| Emilia Cárdenas Ruiz · COM_LECTURA | A | A |
| Camila Huamán Castro · PS_CONVIVE | A | A |
| Diego Ramos Vega · CYT_INDAGA | A | A |
| Valentina Rojas Salazar · MAT_CANTIDAD | A | A |
| Diego Ramos Vega · COM_LECTURA | Sin sugerencia | Sin sugerencia |
| Luciana Torres Medina · MAT_CANTIDAD | Sin sugerencia | Sin sugerencia |
| Alma Flores Ruiz · COM_LECTURA | A | AD |
| Bruno Castro Ríos · COM_LECTURA | B | B |
| Daniel Vega Rojas · MAT_CANTIDAD | B | B |
| Emma Medina Silva · MAT_CANTIDAD | B | B |

Repetición de Alma: low A, medium A. Repetición de Daniel: low B, medium B. La lectura de una dificultad persistente y el límite B/C requieren una valoración docente de referencia; no basta elegir la letra que se esperaba encontrar en un caso sintético.

## Criterios de revisión

- Fidelidad: no inventa acciones, autonomía, apoyo ni progreso.
- Atribución: describe al niño correcto, nunca transfiere acciones de otra persona.
- Pertinencia: distingue competencias entre actuaciones integradas y contrasta con la edad.
- Suficiencia: no inventa mínimos de días o desempeños; evidencia ausente no es C.
- Apoyo y consistencia: diferencia acompañamiento habitual de dificultades persistentes; conserva resultados contradictorios.
- Utilidad: lenguaje sencillo, nombre, tres o cuatro oraciones, máximo cien palabras; próximo foco de observación concreto.
- Sugerencia: motivo comprensible ligado al registro; separar de la valoración docente. AD/C son hipótesis a contrastar, no respuestas patrón.

Revisión cualitativa realizada por el agente sobre notas y referentes. No es revisión ciega independiente ni revisión por una docente. Se publican ambos resultados para permitir contraste humano.

## Comparación de todos los textos

### Emilia Cárdenas Ruiz · COM_LECTURA

**Low · A**

Emilia relacionó imágenes y palabras de una adivinanza para explicar su respuesta y descartar el sol. También contó qué hizo un personaje después de una caída, usando dos imágenes, y anticipó información a partir de pistas, actuaciones acordes con la lectura de textos con ilustraciones. La evidencia permite sugerir un nivel para esta competencia, pero falta observar cómo revisa una interpretación y cómo opina sobre textos desde sus intereses y experiencia.

Motivo: Emilia explicó sus respuestas con pistas e imágenes, en actuaciones acordes con lo esperado para su edad.

**Medium · A**

Emilia relacionó imágenes y palabras con información de textos: vinculó “páginas” con un libro y usó pistas e imágenes para elegir la luna y descartar el sol. También contó lo que hizo un personaje a partir de dos imágenes. Estas actuaciones muestran que identifica información e interpreta pistas, acorde con lo esperado para su edad en las situaciones observadas. No se registra si revisó su interpretación ni qué apoyo necesitó; conviene observarlo en otras lecturas.

Motivo: Relacionó pistas e imágenes para explicar sus respuestas en las situaciones observadas.

**Revisión:** Ventaja leve de medium: describe vínculos e interpretación sin añadir anticipación como un hecho; cita dos desempeños, mientras low incluye también opinión por intereses sin un registro claro de ella. Ambos proponen A.

### Camila Huamán Castro · PS_CONVIVE

**Low · A**

Camila expresó qué le molestaba y acordó cómo compartir la canasta; al guardar los bloques, escuchó otra propuesta y acordó colaborar. En la actividad grupal, eligió acompañar con palmas y aceptó que un compañero participara mirando. Estas actuaciones se relacionan con expresar ideas, escuchar y llegar a acuerdos, como se espera para su edad. Conviene seguir observando cómo participa en la creación de acuerdos y en el cuidado de espacios y materiales compartidos.

Motivo: Las observaciones muestran que Camila expresa sus ideas, escucha otras propuestas y acuerda cómo participar y colaborar.

**Medium · A**

Camila expresó qué le molestó, escuchó a su compañera y acordó cómo seguir jugando. Al recoger, aceptó hacer la tarea junto con otro niño; en la actividad grupal, propuso escuchar distintas formas de participar y aceptó que un compañero mirara. Estas actuaciones muestran acuerdos y respeto por las elecciones de los demás, acorde con lo esperado para su edad. Conviene seguir observando cómo participa en otros acuerdos y en el cuidado de los espacios y materiales comunes.

Motivo: Camila escuchó, tomó acuerdos y respetó distintas formas de participar en las situaciones observadas.

**Revisión:** Resultado equivalente: ambos explican escucha, acuerdos y respeto por otras maneras de participar. Medium evita concretar el acuerdo como compartir una canasta, cuando se registró una para cada niña. Ambos A.

### Diego Ramos Vega · CYT_INDAGA

**Low · A**

Diego agrupó semillas por tamaño, contó hasta cinco y dijo que las grandes podrían crecer más. Propuso observarlas varios días y luego separó las que tenían raíz; dijo que no todas cambiaban al mismo tiempo. Estas acciones muestran curiosidad, una posible explicación y propuestas para observar; falta observar cómo compara lo que predijo con los cambios y qué comunica sobre lo aprendido.

Motivo: Agrupó y contó semillas, propuso observarlas y reconoció diferencias entre ellas.

**Medium · A**

Diego agrupó semillas por tamaño, las contó y dijo que las grandes podrían crecer más; propuso volver a mirarlas. Al encontrar dos con raíz, las separó y contó, y comentó que no todas cambiaban al mismo tiempo. Estas acciones muestran que observa cambios, plantea una posible explicación y propone observar durante varios días. Aún falta observar cómo registra lo que encuentra y cómo compara su idea inicial con lo observado.

Motivo: La sugerencia de A se apoya en sus observaciones de las semillas, su explicación sobre los cambios y su propuesta de volver a mirarlas.

**Revisión:** Ventaja leve de medium: el motivo de la sugerencia prioriza observación, explicación y propuesta de indagación. Low incluye agrupar y contar como parte de ese motivo. Ambos A y reconocen que falta contrastar la idea inicial con cambios.

### Valentina Rojas Salazar · MAT_CANTIDAD

**Low · A**

Valentina preparó cuatro semillas para cada recipiente y comparó las cantidades. Luego organizó los recipientes según cuántas semillas habían abierto y comparó ese resultado con lo que había pensado. Estas acciones muestran que relaciona y organiza cantidades en una situación concreta. En otros mensajes cotidianos, conviene observar cómo cuenta y explica sus agrupaciones.

Motivo: La preparación de cuatro semillas por recipiente y la organización según la cantidad observada muestran aprendizajes esperados para su edad.

**Medium · A**

En la competencia Resuelve problemas de cantidad, Valentina preparó cuatro semillas para cada recipiente y comparó las cantidades. Luego organizó los recipientes según cuántas semillas habían abierto y comparó el resultado con lo que había pensado. Falta observar cómo explica el criterio que usó y cómo comunica o representa las cantidades.

Motivo: La comparación de cantidades y la organización según una cantidad observada respaldan provisionalmente el nivel esperado en estas situaciones.

**Revisión:** Ventaja de redacción y pertinencia de medium: low introduce «en otros mensajes cotidianos», expresión ajena a la actividad, y cita correspondencia/expresiones de cantidad sin sustento explícito. Medium mantiene cantidad, comparación y agrupación, sin atribuir los logros de indagación a matemática. Ambos A; no demuestra dominio de todos los desempeños.

### Diego Ramos Vega · COM_LECTURA

**Low · Sin sugerencia**

Diego estuvo sentado junto a una compañera y sonrió mientras ella explicó qué podría pasar en el cuento. En otra lectura, escuchó sin que se registrara una intervención suya. Estas observaciones no permiten saber qué comprende o interpreta Diego ni qué pistas usa; hace falta observar sus comentarios o predicciones sobre un texto.

Motivo: Los registros describen acciones de Diego, pero no muestran su comprensión del texto.

**Medium · Sin sugerencia**

En las dos situaciones, Diego estuvo sentado junto a Camila y sonrió; después escuchó sin intervención registrada. No hay una actuación suya que muestre qué comprendió del cuento ni que explique una idea con pistas, aspectos relacionados con los desempeños de lectura de su edad. Hace falta observar qué dice o señala sobre las ilustraciones, qué anticipa y qué razones da.

Motivo: Lo registrado muestra que Diego escuchó, pero no permite valorar qué comprendió ni cómo usó pistas del cuento.

**Revisión:** Ambos dejan la letra vacía y no trasladan a Diego la interpretación de Camila. Medium generaliza sentarse y sonreír a «las dos situaciones», aunque solo aparece en la primera: pequeña imprecisión de fidelidad, sin afectar la prudencia de la conclusión. Low distingue mejor los dos registros.

### Luciana Torres Medina · MAT_CANTIDAD

**Low · Sin sugerencia**

En «La tienda», Luciana eligió la bolsa roja y pidió sentarse junto a su amiga. No se registró qué hizo al contar o repartir objetos, por lo que no hay evidencia para comparar sus cantidades con lo esperado para su edad. Hace falta observar qué hace y dice al repartir objetos.

Motivo: La observación registra su elección de bolsa y dónde pidió sentarse, pero no cómo comparó cantidades al repartir.

**Medium · Sin sugerencia**

En “La tienda”, Luciana eligió la bolsa roja y pidió sentarse junto a su amiga. No se registró qué hizo al contar o repartir objetos, por lo que no hay evidencia de que comparara cantidades o estableciera correspondencia uno a uno. Con esta observación no es posible valorar su avance en “Resuelve problemas de cantidad” respecto de los referentes de su edad.

Motivo: La observación solo registra la elección de una bolsa y dónde pidió sentarse, no cómo contó o repartió.

**Revisión:** Ambos dejan la letra vacía y no convierten la falta de evidencia matemática en C. Low propone observar un reparto y medium explica mejor qué no se puede valorar; ninguno es una mejora concluyente.

### Alma Flores Ruiz · COM_LECTURA

**Low · A**

Alma comparó dos versiones del cuento, señaló imágenes y pidió releer una frase para comprobar la diferencia. Explicó lo que buscaba el personaje, relacionó la ilustración con sus palabras y justificó cómo cambiaría el final con partes del cuento. Estas acciones muestran que interpreta y opina apoyándose en información del texto; conviene observar cómo lo hace con otros textos y situaciones.

Motivo: Alma explicó sus interpretaciones con imágenes y partes del cuento, de acuerdo con lo esperado para su edad.

**Medium · AD**

En Lee diversos tipos de textos escritos en su lengua materna, Alma comparó versiones de un cuento, explicó las intenciones de un personaje y señaló partes para apoyar sus ideas. También revisó su interpretación al escuchar otra y anticipó cómo cambiaría el final. En estas lecturas mostró interpretaciones más elaboradas que las previstas para su edad. Conviene observar cómo lo hace con otros textos y en otras situaciones; estos registros no permiten afirmar que lo haga siempre.

Motivo: La comparación de versiones, la justificación con partes del cuento y la revisión de sus ideas muestran actuaciones que van más allá de lo esperado para su edad.

**Revisión:** Primera pasada: low A, medium AD, con motivo ligado a comparar versiones, justificar y revisar interpretaciones. Repetición idéntica: low A y medium A. La mayor diferenciación inicial de medium no es estable. Sin respuesta patrón docente, no se puede declarar AD como nota correcta ni medium como más preciso.

### Bruno Castro Ríos · COM_LECTURA

**Low · B**

Bruno nombró al perro y la casa en la ilustración, recordó quién salió de casa y dijo que le gustó el conejo porque saltaba. Para anticipar qué pasaría, explicar por qué volvió el personaje y relacionar su opinión con la historia, necesitó opciones, preguntas o que la docente volviera a mostrar y leer una parte. Está próximo a explicar sus ideas apoyándose en pistas del texto y requiere acompañamiento. Falta observar cómo lo hace en otras lecturas con distintos apoyos.

Motivo: Las observaciones muestran identificación y opinión, pero para anticipar y explicar necesitó apoyo de la docente.

**Medium · B**

Bruno nombró al perro y la casa en la ilustración, recordó quién salió y, tras releer el cuento, dijo que el personaje volvió a buscar su pelota. También expresó que le gustó el conejo porque saltaba, pero necesitó preguntas y volver a mirar la escena para relacionarlo con la historia. Al anticipar lo que podía pasar, no explicó una pista y eligió solo después de que la docente ofreció opciones; conviene observar si explica sus ideas con menos ayuda.

Motivo: Sugiero B porque Bruno expresa algunas ideas sobre el texto, pero necesita apoyo para explicar sus interpretaciones con información de la historia.

**Revisión:** Ambos B. Medium sitúa mejor la dificultad específica en explicar con pistas y en las opciones ofrecidas, sin considerar la relectura del adulto una dificultad por sí sola. La letra sigue siendo provisional.

### Daniel Vega Rojas · MAT_CANTIDAD

**Low · B**

Daniel repartió un objeto por persona después de recibir apoyo o un modelo, y en una ocasión reconoció quién no tenía vaso cuando la docente se lo señaló. Al repetir el reparto y cuando la ayuda se retiró, volvió a juntar varios objetos para una persona y dejó a otros sin recibirlos. Aún falta observar que reparta y compruebe por sí mismo si alcanza en situaciones cotidianas, como plantea el desempeño de correspondencia uno a uno.

Motivo: La correspondencia uno a uno apareció con apoyo, pero Daniel no la sostuvo al repetir el reparto o al retirarse la ayuda.

**Medium · B**

En Resuelve problemas de cantidad, Daniel aún no reparte un objeto a cada persona de forma consistente: en varias ocasiones dejó a alguien sin objeto o puso varios junto a una sola persona. Con apoyo de la docente logró repartir uno por persona, pero al retirarlo volvió a necesitar ayuda. Esto muestra que requiere acompañamiento para establecer correspondencia uno a uno; falta observar otras situaciones de cantidad.

Motivo: Las observaciones muestran que Daniel requiere apoyo para repartir un objeto por persona de forma consistente.

**Revisión:** Ambos B en las dos pasadas. Describen logro con modelo/apoyo y falta de continuidad al retirarlo. No prueban distinguir con fiabilidad entre proceso y avance inicial; se necesita un juicio docente de referencia para B/C.

### Emma Medina Silva · MAT_CANTIDAD

**Low · B**

En “Resuelve problemas de cantidad”, Emma repartió una cuchara a cada uno de cuatro muñecos y comprobó que todos tenían una. En otra ocasión dejó a un niño sin hoja y dijo que alcanzaba sin revisar; después repartió servilletas con un recordatorio y completó los lugares vacíos. Esto muestra que puede hacer correspondencia uno a uno, pero aún necesita apoyo para revisar que todos reciban un objeto. Falta observar si lo hace de manera constante sin recordatorio.

Motivo: Las actuaciones muestran que está próxima a establecer correspondencia uno a uno, pero aún requiere un recordatorio para revisar el reparto.

**Medium · B**

Emma Medina Silva repartió una cuchara a cada uno de cuatro muñecos y comprobó que todos tenían una. En otra ocasión dejó a un compañero sin hoja y dijo que alcanzaba, sin revisar. Luego repartió servilletas con un recordatorio y añadió las que faltaban al revisar los lugares vacíos. Estas actuaciones muestran que puede repartir uno a uno, aunque falta observar si revisa y completa el reparto en distintas situaciones sin recordatorio.

Motivo: Se acerca al reparto uno a uno esperado para su edad: lo logró, pero también dejó a un niño sin hoja y luego necesitó un recordatorio para revisar.

**Revisión:** Ambos B y mantienen la alternancia entre logro, dificultad y respuesta a un recordatorio, sin inventar progreso lineal. Medium conserva más fielmente la secuencia de hechos. Diferencia leve de redacción, no de nivel.

## Repeticiones dirigidas

### Alma Flores Ruiz · low

Alma explicó diferencias entre dos versiones del cuento, infirió la intención del personaje y apoyó sus ideas señalando imágenes y partes del texto. También revisó su propuesta después de escuchar otra interpretación; en estos registros no se observa qué apoyo necesitó. Conviene seguir observando cómo explica sus ideas en otros textos y situaciones de lectura.

Sugerencia: A. Sus explicaciones se apoyan en indicios del texto y muestran comprensión acorde con lo esperado para su edad.

### Alma Flores Ruiz · medium

Alma compara versiones de un cuento y explica diferencias apoyándose en imágenes y frases; también relaciona lo que dice un personaje con lo que muestra la ilustración. Al proponer otro final, busca partes del cuento para justificar su idea y la revisa al escuchar otra interpretación. Estas acciones muestran que interpreta textos con pistas, en línea con lo esperado para su edad. Conviene seguir observando cómo identifica palabras conocidas y expresa sus gustos sobre distintos textos; no se registra un apoyo específico que necesite.

Sugerencia: A. Alma sustenta sus interpretaciones con imágenes y partes del cuento, como se espera para su edad.

### Daniel Vega Rojas · medium

Al repartir vasos, Daniel dijo que todos tenían uno, aunque faltó un vaso; reconoció quién no tenía cuando la docente se lo señaló. Con un modelo, repartió una cuchara a cada muñeco, pero luego volvió a poner ambas junto a uno. Al repartir hojas, necesitó apoyo y, al retirarlo, entregó varias a un niño y dejó a otros sin hoja. Esto muestra que aún necesita acompañamiento para establecer correspondencia uno a uno y comprobar si alcanza; falta observar cómo lo hace de manera autónoma.

Sugerencia: B. Las observaciones muestran que Daniel logra repartir uno a cada persona con apoyo, pero no lo mantiene al retirar la ayuda.

### Daniel Vega Rojas · low

Daniel repartió materiales, pero no dio por sí solo un objeto a cada persona ni comprobó si alcanzaba. En una ocasión reconoció que faltaba un vaso cuando la docente se lo señaló; con modelo y apoyo directo logró repartir uno por persona. Al repetir la tarea, volvió a entregar varios objetos a una persona y dejó a otros sin material. Falta observar si puede hacerlo y comprobarlo con menor ayuda en otras situaciones cotidianas.

Sugerencia: B. La correspondencia uno a uno aún requiere modelo o apoyo directo, como muestran los repartos observados.

## Validación y próximos pasos

Comparación de hashes de contexto, validación de esquema/nombre/competencia/referencias/3–4 oraciones/máximo cien palabras en los 24 resultados y comprobación de integridad de valoraciones/borradores. Se conservan los 87 tests y compilaciones de la implementación previa; no se vuelven a atribuir como ejecutados en esta ronda, que solo añade scripts locales y documentación. No hay cambios a IA, permisos, notas ni interfaz de la aplicación. Sin commit/push/despliegue en esta ronda.

Para mejorar la confianza, revisar AD/A y B/C con una profesora y un pequeño conjunto de respuestas justificadas de referencia. Ambos esfuerzos deben conservar nota vacía cuando falte evidencia, no sustituir el juicio docente ni confirmar una nota. Una elección de medium no soluciona por sí misma las variaciones de interpretación.

Fuentes: [modelo y precios](https://developers.openai.com/api/docs/models/gpt-6-luna), [Programa Curricular de Educación Inicial](https://www.minedu.gob.pe/curriculo/pdf/programa-curricular-educacion-inicial.pdf), [CNEB](https://www.minedu.gob.pe/curriculo/pdf/curriculo-nacional-de-la-educacion-basica.pdf). Los resultados completos, uso y hashes se conservan en el JSON compañero; las notas originales y snapshots permanecen en la carpeta local privada.
