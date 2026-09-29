# Diff literal de prompt V2.3 → V2.4

Cambios congelados antes de TEST2, sin edición posterior.

## version

Anterior:
```json
"current-v2.3"
```

V2.4:
```json
"current-v2.4"
```

## status

Anterior:
```json
"experimental_dev_iteration_3_final"
```

V2.4:
```json
"single_last_optimization_frozen"
```

## decision_rules

Anterior:
```json
[
  "Clasifica únicamente conductas, acciones, expresiones o producciones observables descritas en el registro. No infieras aprendizajes, intenciones o competencias solo por el contexto.",
  "Abstente si solo hay estado de ánimo, sueño, alimentación, distracción, presencia física, negativa puntual o conducta cotidiana sin evidencia de aprendizaje. No fuerces una competencia cuando la evidencia sea insuficiente.",
  "Información personal o familiar puede coexistir con evidencia pedagógica. Mencionar mamá, papá, familia, hermano, casa o nombres no es por sí mismo un motivo de privacy block. La privacidad se valida antes en el adaptador.",
  "Elige UNA competencia principal cuando exista evidencia suficiente: la que explique más directamente la acción central observada.",
  "Una competencia secundaria requiere OTRA conducta observable independiente. Hablar, estar con otros o usar materiales como medio de la acción central no basta. No infieras logro ni propósito docente.",
  "No exigir logro, ejecución perfecta, escritura convencional ni intención académica declarada. Una conducta curricular concreta basta. Separa la duda docente sobre comprensión/intención de los hechos efectivamente descritos; la duda no anula esas acciones. No reconstruyas palabras ocultadas por anonimización.",
  "Si existe INTERPRETACIÓN DESCRIPTIVA, úsala solo como apoyo lingüístico. La suficiencia y la competencia deben sustentarse en hechos de OBSERVACIÓN DOCENTE; una interpretación no agrega acciones, propósito ni control corporal que no estén observados."
]
```

V2.4:
```json
[
  "Clasifica únicamente conductas, acciones, expresiones o producciones observables descritas en el registro. No infieras aprendizajes, intenciones o competencias solo por el contexto.",
  "Abstente si solo hay estado de ánimo, sueño, alimentación, distracción, presencia física, negativa puntual o conducta cotidiana sin evidencia de aprendizaje. No fuerces una competencia cuando la evidencia sea insuficiente.",
  "Información personal o familiar puede coexistir con evidencia pedagógica. Mencionar mamá, papá, familia, hermano, casa o nombres no es por sí mismo un motivo de privacy block. La privacidad se valida antes en el adaptador.",
  "Elige UNA competencia principal cuando exista evidencia suficiente: la que explique más directamente la acción central observada. Decide por la fuente y función de la conducta, no por palabras sueltas, número de objetos, material o presencia de otras personas. Dos ámbitos posibles no equivalen a ausencia de evidencia: aplica las reglas de prioridad; no inventes certeza ni hechos para evitar abstención.",
  "Si la principal explica suficientemente la evidencia, secondary = []. Solo añadir secundaria por OTRA conducta observable independiente, no por describir la misma acción con otra etiqueta. La verbalización de la acción, su representación auxiliar, la disposición de materiales y la interacción instrumental no son otra actuación por sí solas.",
  "No exigir logro, ejecución perfecta, escritura convencional ni intención académica declarada. Una conducta curricular concreta basta. Separa la duda docente sobre comprensión/intención de los hechos efectivamente descritos; la duda no anula esas acciones. No reconstruyas palabras ocultadas por anonimización.",
  "Si existe INTERPRETACIÓN DESCRIPTIVA, úsala solo como apoyo lingüístico. La suficiencia y la competencia deben sustentarse en hechos de OBSERVACIÓN DOCENTE; una interpretación no agrega acciones, propósito ni control corporal que no estén observados.",
  "Una acción curricular observable clara más una verbalización que explica o acompaña esa acción puede ser suficiente. No exigir un paso adicional, resultado logrado, explicación larga ni confirmación de comprensión. La incertidumbre docente sobre el motivo no borra hechos observados. Esto no vuelve curricular el sueño, comida, distracción, proximidad pasiva, manipulación incidental o una negativa aislada."
]
```

## disambiguation

Anterior:
```json
{
  "MAT_CANTIDAD": "Conteo, correspondencia uno a uno, comparación de cantidades u ordenar/seriar objetos por tamaño sustentan Cantidad. No confundir con posición o recorrido.",
  "MAT_FORMA": "Ubicación, recorrido, desplazamiento, posiciones, formas geométricas y relaciones espaciales sustentan Forma, movimiento y localización. Ordenar por tamaño sustenta Cantidad. No clasifiques como Forma el mero ajuste corporal, fuerza del brazo o velocidad para controlar un gesto: eso corresponde a Motricidad. Forma exige que la relación/representación espacial o geométrica sea la acción central.",
  "COM_ORAL": "Conversar, relatar, explicar o responder verbalmente sin apoyarse principalmente en un texto sustentan Comunicación oral. Hablar solo como medio de otra acción no basta. Un relato breve, reformulación o aclaración del orden temporal de hechos puede bastar; no exigir discurso largo ni demostración de comprensión lograda.",
  "COM_LECTURA": "Construir significado a partir de cuentos, ilustraciones, imágenes, símbolos o indicios textuales sustenta Lectura, aunque todavía no lea convencionalmente. El solo hecho de hablar al mirar un texto no decide Oral. Atribuir significado a un símbolo o reconocer la función de un soporte por sus indicios gráficos es lectura emergente observable.",
  "PS_CONVIVE": "Exige interacción observable: acuerdo, turno, negociación, colaboración, incorporación al juego, resolución de desacuerdo o acción compartida. Estar cerca, observar a otros o jugar al costado no basta. Proponer un acuerdo, ofrecer ayuda concreta o abrir participación a otra persona ya son acciones de convivencia; no exigir que el acuerdo se complete o que todas las personas respondan.",
  "CYT_INDAGA": "Busca observación orientada a comprobar algo, pregunta, prueba, comparación de resultados, cambio de acción según el resultado o búsqueda de comprobación. Manipular sin ese propósito observable no basta. No inventes intención. Ajustar equilibrio, fuerza o posición para ejecutar un gesto corporal es Motricidad; revisar una decisión de representación es Arte. No convertir cada intento/cambio en experimento científico.",
  "COM_ESCRITURA": "Marcas, grafismos o letras sustentan Escritura cuando el niño les atribuye intención comunicativa. No exigir escritura convencional. Trazos sin intención comunicativa descrita no bastan. La función de mensaje, identificación, etiqueta, firma o registro para recordar hace suficiente la producción gráfica descrita. Marcas que identifican destinatarios/personas en un soporte comunicativo son escritura, no Cantidad por mera correspondencia. La producción puede ser dictada a un adulto o no convencional.",
  "COM_ARTE": "Busca creación, exploración o representación intencional mediante dibujo, música, movimiento u otro lenguaje artístico. El uso de lápices, pintura o materiales por sí solo no implica Arte. Elegir/cambiar colores, sonidos, formas o gestos para representar algo sigue siendo Arte; no es Indagación por modificar un resultado expresivo. Diferencia una representación artística de una prueba orientada a explicar/comprobar un fenómeno.",
  "PSICO_MOTRICIDAD": "Equilibrio, coordinación de manos/dedos, control postural, saltos, lanzamientos y ajustes de fuerza o velocidad sustentan Motricidad. Si la acción central es mantener/controlar el cuerpo o coordinar un gesto, prioriza Motricidad frente a Forma o Indagación. Un movimiento con propósito corporal observado no requiere verbalizar un aprendizaje. Sostener/estabilizar con una mano mientras la otra actúa muestra coordinación fina; solo tener un material no basta. Tocar, apretar o mover un material una vez sin coordinación, control, equilibrio o ajuste corporal específico descrito es manipulación incidental; no asumir coordinación fina solo por usar las manos. La coordinación fina también puede evidenciarse al usar dedos/mano mientras se mantiene firme o se estabiliza un soporte; el control manual simultáneo descrito no es mera presencia de material. No exigir desplazamiento del cuerpo, explicación verbal ni un producto final."
}
```

V2.4:
```json
{
  "MAT_CANTIDAD": "Conteo, correspondencia uno a uno, comparación de cantidades y seriación por tamaño/longitud sustentan Cantidad cuando esas relaciones se observan. Un número mencionado en una narración o construcción no es conteo observado. Tamaño para ordenar/comparar sustenta Cantidad; ubicación/distribución para representar espacio sustenta Forma. Construir o reparar una estructura no prueba por sí solo comparación cuantitativa ni indagación.",
  "MAT_FORMA": "Ubicación, recorrido, desplazamiento, posiciones, formas geométricas y relaciones espaciales sustentan Forma, movimiento y localización. Ordenar por tamaño sustenta Cantidad. No clasifiques como Forma el mero ajuste corporal, fuerza del brazo o velocidad para controlar un gesto: eso corresponde a Motricidad. Forma exige que la relación/representación espacial o geométrica sea la acción central. Representar cómo se ubica, conecta o recorre una construcción mediante trazos/dibujo puede ser actuación espacial, aunque sirva para comunicar una propuesta. No etiquetar Arte solo por dibujar una relación espacial. Una posición o inclinación usada únicamente como variable de una prueba de fenómeno es medio de Indagación, no otra actuación espacial independiente.",
  "COM_ORAL": "Clasifica según la fuente principal de construcción de significado. Si el niño obtiene significado de imágenes, ilustraciones, símbolos, carteles, secuencias visuales o texto, prioriza LECTURA aunque responda oralmente. Si la información proviene principalmente de su propia experiencia, conversación o explicación sin apoyo textual/visual, prioriza COMUNICACIÓN ORAL. Tener un libro cerca o cerrado no convierte un relato de memoria en Lectura. Si habla para comunicar un conteo, lectura, hallazgo, dibujo, mensaje dictado o acuerdo, esa verbalización es medio de esa actuación; no elegir Oral automáticamente ni agregarla como secundaria. Un relato breve, aclaración, reformulación o respuesta significativa puede bastar sin discurso largo ni logro demostrado.",
  "COM_LECTURA": "Clasifica según la fuente principal de construcción de significado. Si el niño obtiene significado de imágenes, ilustraciones, símbolos, carteles, secuencias visuales o texto, prioriza LECTURA aunque responda oralmente. Construir significado, anticipar, interpretar o reconstruir secuencias a partir de indicios gráficos es Lectura emergente, sin exigir lectura convencional. Ordenar ilustraciones para reconstruir sentido narrativo no es Cantidad por cuántas ilustraciones hay. Un cuento conocido puede leerse desde imágenes: conocerlo no anula la evidencia visual; si solo relata de memoria y no usa el soporte, prioriza Oral. Tener un libro, mirarlo sin atribuir significado descrito o nombrar material no basta.",
  "PS_CONVIVE": "Negociación, propuesta de acuerdo, turno, resolución de desacuerdo, incorporación al juego, ayuda concreta o acción compartida observadas sustentan Convivencia. No exigir una secuencia larga, acuerdo terminado, participación de todo el grupo ni respuesta final del otro. Una propuesta dirigida a otra persona más una acción concreta para compartir o resolver el desacuerdo puede bastar. Estar cerca, observar pasivamente, jugar en paralelo sin interacción, emoción aislada o negativa puntual sin resolución/interacción descrita no bastan. Si un dibujo/explicación comunica una propuesta conjunta, evaluar la interacción efectivamente descrita sin asumir acuerdo inexistente.",
  "CYT_INDAGA": "Prioriza INDAGACIÓN cuando exista un proceso observable: observa un hecho → plantea una explicación/pregunta → compara, busca, prueba o verifica. La búsqueda de indicios o comprobación visual descrita también cuenta; no exigir experimento formal ni explicación lograda. No elegir Oral solo porque verbaliza lo que observa/hace. Una explicación aislada de conocimiento previo, mirar alrededor sin búsqueda descrita, manipular incidentalmente o reparar una construcción sin comparación/comprobación de fenómeno no bastan. No inventes intención de verificar. Ajustar equilibrio, fuerza o posición para ejecutar un gesto corporal es Motricidad; modificar una representación expresiva es Arte. Inclinación, cantidades o conversación que sirven a la misma comprobación no son secundarias independientes.",
  "COM_ESCRITURA": "Marcas, grafismos o letras sustentan Escritura cuando el niño les atribuye intención comunicativa. No exigir escritura convencional. Trazos sin intención comunicativa descrita no bastan. La función de mensaje, identificación, etiqueta, firma o registro para recordar hace suficiente la producción gráfica descrita. Marcas que identifican destinatarios/personas en un soporte comunicativo son escritura, no Cantidad por mera correspondencia. La producción puede ser dictada a un adulto o no convencional.",
  "COM_ARTE": "Busca creación, exploración o representación intencional mediante dibujo, música, movimiento u otro lenguaje artístico. El uso de lápices, pintura o materiales por sí solo no implica Arte. Elegir/cambiar colores, sonidos, formas o gestos para representar algo sigue siendo Arte; no es Indagación por modificar un resultado expresivo. Diferencia una representación artística de una prueba orientada a explicar/comprobar un fenómeno.",
  "PSICO_MOTRICIDAD": "Equilibrio, coordinación de manos/dedos, control postural, saltos, lanzamientos y ajustes de fuerza o velocidad sustentan Motricidad. Si la acción central es mantener/controlar el cuerpo o coordinar un gesto, prioriza Motricidad frente a Forma o Indagación. Un movimiento con propósito corporal observado no requiere verbalizar un aprendizaje. Sostener/estabilizar con una mano mientras la otra actúa muestra coordinación fina; solo tener un material no basta. Tocar, apretar o mover un material una vez sin coordinación, control, equilibrio o ajuste corporal específico descrito es manipulación incidental; no asumir coordinación fina solo por usar las manos. La coordinación fina también puede evidenciarse al usar dedos/mano mientras se mantiene firme o se estabiliza un soporte; el control manual simultáneo descrito no es mera presencia de material. No exigir desplazamiento del cuerpo, explicación verbal ni un producto final."
}
```

## evidence_sufficiency

Anterior:
```json
{
  "instructions": "¿Hay al menos una acción, expresión o producción curricular específica realmente descrita? Valora todas las áreas con la misma regla. No exigir logro final, edad, ejecución perfecta, extensión del relato ni intención académica declarada. Si hay interpretación auxiliar, no usarla para inventar hechos o propósitos ausentes del registro observado. No reconstruir verbos ocultados. El control/coordinación fina explícito con objetos cotidianos o de juego tiene valor curricular, aunque no haya recorrido corporal ni logro final. Distingue estabilización/control manual descritos de una manipulación incidental sin ajuste.",
  "true": "Se describe conducta curricular concreta: contar/comparar cantidades/seriar; establecer o representar relación espacial; observar/preguntar/probar para comprobar; relatar/explicar/reformular oralmente; atribuir significado a indicios gráficos; marcas/letras con función comunicativa; elección o representación expresiva; equilibrio/coordinación/control o ajuste corporal específico, incluida coordinación fina de manos/dedos con estabilización firme simultánea de un soporte; ayuda, propuesta de acuerdo, negociación, turno o participación compartida. Una acción basta, aunque su resultado no se complete; también puede ser conducta observable suficiente de otra competencia.",
  "false": "Solo estado circunstancial, sueño, comida, emoción aislada, negativa puntual, presencia/proximidad, manipulación incidental o materiales/contexto sin conducta curricular específica. Tocar/apretar una vez no demuestra por sí solo indagación, arte o coordinación motora. Un propósito o aprendizaje agregado únicamente por una interpretación no vuelve suficiente la observación. No aplicar esta opción negativa cuando el registro sí describe estabilización firme o coordinación manual específica: la rutina/material cotidiano no anula ese hecho observable."
}
```

V2.4:
```json
{
  "instructions": "¿Hay al menos una acción, expresión o producción curricular específica realmente descrita? Valora todas las áreas con la misma regla. No exigir logro final, edad, ejecución perfecta, extensión del relato ni intención académica declarada. Si hay interpretación auxiliar, no usarla para inventar hechos o propósitos ausentes del registro observado. No reconstruir verbos ocultados. El control/coordinación fina explícito con objetos cotidianos o de juego tiene valor curricular, aunque no haya recorrido corporal ni logro final. Distingue estabilización/control manual descritos de una manipulación incidental sin ajuste. Una acción curricular clara acompañada de su explicación/verbalización ya puede bastar; no exigir que se complete o repita. Leer indicios visuales, representar espacio, proponer un turno o buscar un indicio para comprobar una explicación son acciones específicas, no mero hablar o usar material.",
  "true": "Se describe conducta curricular concreta: contar/comparar cantidades/seriar; establecer o representar relación espacial; observar/preguntar/probar para comprobar; relatar/explicar/reformular oralmente; atribuir significado a indicios gráficos; marcas/letras con función comunicativa; elección o representación expresiva; equilibrio/coordinación/control o ajuste corporal específico, incluida coordinación fina de manos/dedos con estabilización firme simultánea de un soporte; ayuda, propuesta de acuerdo, negociación, turno o participación compartida. Una acción basta, aunque su resultado no se complete; también puede ser conducta observable suficiente de otra competencia.",
  "false": "Solo estado circunstancial, sueño, comida, emoción aislada, negativa puntual, presencia/proximidad, manipulación incidental o materiales/contexto sin conducta curricular específica. Tocar/apretar una vez no demuestra por sí solo indagación, arte o coordinación motora. Un propósito o aprendizaje agregado únicamente por una interpretación no vuelve suficiente la observación. No aplicar esta opción negativa cuando el registro sí describe estabilización firme o coordinación manual específica: la rutina/material cotidiano no anula ese hecho observable."
}
```

## additional_instruction

Anterior:
```json
null
```

V2.4:
```json
"Evaluación adicional conservadora: si una competencia principal explica toda la actuación y esta competencia solo describe un medio, contexto o una faceta de esa MISMA acción, responder false. Para true debe describirse otra conducta independiente y con sustento propio, no inferirla del material, palabras dichas o tema. Si hay dos acciones separadas con sustento, sí puede haber secundaria; no vaciarla por defecto cuando esa otra acción está observada. Priorizar no añadir etiquetas redundantes."
```

