# Efectos Luna V2

Gold inmutable; análisis posterior de resultados DEV, sin juez adicional. IMPROVED/WORSENED/SAME compara primaria aceptable solo en casos clasificables; decisiones completas se muestran por separado y también incluyen abstención/privacidad. Fallos de proveedor son UNDETERMINED para comparaciones pareadas.

## CURRENT_V2_LUNA_CLEAN

Luna: 228 llamadas; interpretación presente 0; incertidumbre presente 0. Latencia etapa Luna: 1531 ms/registro de la mezcla DEV, 1612 ms/llamada permitida.

### DEV_051, r1: IMPROVED

Observación: Mezcló dos colores para pintar una tarde oscura; cambió el color cuando dijo que todavía parecía de día.

Gold: {"primary":"COM_ARTE","acceptable_primary":["COM_ARTE"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}

RAW: {"status":"unclassified","primary":null,"secondary":[],"success":false}

Luna: {"clean":"[persona]: dos colores para pintar una tarde oscura. Cambió el color cuando dijo que todavía parecía de día.","interpretation":null,"uncertainty":null}

Después: {"status":"review","primary":"COM_ARTE","secondary":[],"success":true,"evidence":"cambió el color cuando dijo que todavía parecía de día","reason":"Acción central observada: Crea proyectos desde los lenguajes artísticos. Secundarias solo con conducta independiente."}

### DEV_043, r3: IMPROVED

Observación: Escribió algunas letras junto a una semilla sembrada: "Es para acordarnos de cuál es".

Gold: {"primary":"COM_ESCRITURA","acceptable_primary":["COM_ESCRITURA"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}

RAW: {"status":"unclassified","primary":null,"secondary":[],"success":false}

Luna: {"clean":"[persona] escribió algunas letras junto a una semilla sembrada: «Es para acordarnos de cuál es».","interpretation":null,"uncertainty":null}

Después: {"status":"review","primary":"COM_ESCRITURA","secondary":[],"success":true,"evidence":"Escribió algunas letras junto a una semilla sembrada: \"Es para acordarnos de cuál es","reason":"Acción central observada: Escribe diversos tipos de textos en su lengua materna. Secundarias solo con conducta independiente."}

### DEV_051, r3: IMPROVED

Observación: Mezcló dos colores para pintar una tarde oscura; cambió el color cuando dijo que todavía parecía de día.

Gold: {"primary":"COM_ARTE","acceptable_primary":["COM_ARTE"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}

RAW: {"status":"unclassified","primary":null,"secondary":[],"success":false}

Luna: {"clean":"[persona] usó dos colores para pintar una tarde oscura. Cambió el color cuando dijo que todavía parecía de día.","interpretation":null,"uncertainty":null}

Después: {"status":"review","primary":"COM_ARTE","secondary":[],"success":true,"evidence":"cambió el color cuando dijo que todavía parecía de día","reason":"Acción central observada: Crea proyectos desde los lenguajes artísticos. Secundarias solo con conducta independiente."}

Conteos primaria aceptable: {"IMPROVED":3,"WORSENED":0,"SAME":201,"UNDETERMINED":0}.

## CURRENT_V2_LUNA_INTERPRET

Luna: 228 llamadas; interpretación presente 187; incertidumbre presente 27. Latencia etapa Luna: 1518 ms/registro de la mezcla DEV, 1598 ms/llamada permitida.

### DEV_043, r1: IMPROVED

Observación: Escribió algunas letras junto a una semilla sembrada: "Es para acordarnos de cuál es".

Gold: {"primary":"COM_ESCRITURA","acceptable_primary":["COM_ESCRITURA"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}

RAW: {"status":"unclassified","primary":null,"secondary":[],"success":false}

Luna: {"clean":"Escribió algunas letras junto a una semilla sembrada y dijo: «Es para acordarnos de cuál es».","interpretation":"Relacionó las letras con la identificación de la semilla.","uncertainty":null}

Después: {"status":"review","primary":"COM_ESCRITURA","secondary":[],"success":true,"evidence":"","reason":"Acción central observada: Escribe diversos tipos de textos en su lengua materna. Secundarias solo con conducta independiente. Evidencia literal no verificada: requiere revisión humana."}

### DEV_051, r1: IMPROVED

Observación: Mezcló dos colores para pintar una tarde oscura; cambió el color cuando dijo que todavía parecía de día.

Gold: {"primary":"COM_ARTE","acceptable_primary":["COM_ARTE"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}

RAW: {"status":"unclassified","primary":null,"secondary":[],"success":false}

Luna: {"clean":"Eligió dos colores para pintar una tarde oscura y cambió el color cuando dijo: «Todavía parecía de día».","interpretation":null,"uncertainty":"La transcripción no permite identificar quién eligió los colores."}

Después: {"status":"review","primary":"COM_ARTE","secondary":[],"success":true,"evidence":"","reason":"Acción central observada: Crea proyectos desde los lenguajes artísticos. Secundarias solo con conducta independiente. Evidencia literal no verificada: requiere revisión humana."}

### DEV_042, r2: IMPROVED

Observación: Preparó entradas para un teatro de juego. Puso marcas distintas y explicó cuál correspondía a cada visitante.

Gold: {"primary":"COM_ESCRITURA","acceptable_primary":["COM_ESCRITURA"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}

RAW: {"status":"unclassified","primary":null,"secondary":[],"success":false}

Luna: {"clean":"Preparó entradas para un teatro de juego, hizo marcas distintas y explicó cuál correspondía a cada visitante.","interpretation":"Diferenció las entradas mediante marcas y explicó a quién correspondía cada una.","uncertainty":null}

Después: {"status":"review","primary":"COM_ESCRITURA","secondary":[],"success":true,"evidence":"","reason":"Acción central observada: Escribe diversos tipos de textos en su lengua materna. Secundarias solo con conducta independiente. Evidencia literal no verificada: requiere revisión humana."}

### DEV_043, r2: IMPROVED

Observación: Escribió algunas letras junto a una semilla sembrada: "Es para acordarnos de cuál es".

Gold: {"primary":"COM_ESCRITURA","acceptable_primary":["COM_ESCRITURA"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}

RAW: {"status":"unclassified","primary":null,"secondary":[],"success":false}

Luna: {"clean":"Escribió algunas letras junto a una semilla sembrada y dijo: «Es para acordarnos de cuál es».","interpretation":"Escribió letras junto a la semilla y expresó que servirían para recordar cuál era.","uncertainty":null}

Después: {"status":"review","primary":"COM_ESCRITURA","secondary":[],"success":true,"evidence":"","reason":"Acción central observada: Escribe diversos tipos de textos en su lengua materna. Secundarias solo con conducta independiente. Evidencia literal no verificada: requiere revisión humana."}

### DEV_051, r2: IMPROVED

Observación: Mezcló dos colores para pintar una tarde oscura; cambió el color cuando dijo que todavía parecía de día.

Gold: {"primary":"COM_ARTE","acceptable_primary":["COM_ARTE"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}

RAW: {"status":"unclassified","primary":null,"secondary":[],"success":false}

Luna: {"clean":"Usó dos colores para pintar una tarde oscura. Cambió el color cuando dijo que todavía parecía de día.","interpretation":null,"uncertainty":null}

Después: {"status":"review","primary":"COM_ARTE","secondary":[],"success":true,"evidence":"cambió el color cuando dijo que todavía parecía de día","reason":"Acción central observada: Crea proyectos desde los lenguajes artísticos. Secundarias solo con conducta independiente."}

### DEV_042, r3: IMPROVED

Observación: Preparó entradas para un teatro de juego. Puso marcas distintas y explicó cuál correspondía a cada visitante.

Gold: {"primary":"COM_ESCRITURA","acceptable_primary":["COM_ESCRITURA"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}

RAW: {"status":"unclassified","primary":null,"secondary":[],"success":false}

Luna: {"clean":"Preparó entradas para un teatro de juego. Hizo marcas distintas y explicó cuál correspondía a cada visitante.","interpretation":"Diferenció las entradas mediante marcas y explicó a quién correspondía cada una.","uncertainty":null}

Después: {"status":"review","primary":"COM_ESCRITURA","secondary":[],"success":true,"evidence":"","reason":"Acción central observada: Escribe diversos tipos de textos en su lengua materna. Secundarias solo con conducta independiente. Evidencia literal no verificada: requiere revisión humana."}

### DEV_043, r3: IMPROVED

Observación: Escribió algunas letras junto a una semilla sembrada: "Es para acordarnos de cuál es".

Gold: {"primary":"COM_ESCRITURA","acceptable_primary":["COM_ESCRITURA"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}

RAW: {"status":"unclassified","primary":null,"secondary":[],"success":false}

Luna: {"clean":"Escribió algunas letras junto a una semilla sembrada y dijo: «Es para acordarnos de cuál es».","interpretation":"Registró algunas letras junto a la semilla para recordar cuál era.","uncertainty":null}

Después: {"status":"review","primary":"COM_ESCRITURA","secondary":[],"success":true,"evidence":"","reason":"Acción central observada: Escribe diversos tipos de textos en su lengua materna. Secundarias solo con conducta independiente. Evidencia literal no verificada: requiere revisión humana."}

### DEV_051, r3: IMPROVED

Observación: Mezcló dos colores para pintar una tarde oscura; cambió el color cuando dijo que todavía parecía de día.

Gold: {"primary":"COM_ARTE","acceptable_primary":["COM_ARTE"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}

RAW: {"status":"unclassified","primary":null,"secondary":[],"success":false}

Luna: {"clean":"Eligió dos colores para pintar una tarde oscura. Cambió uno de los colores y dijo que todavía parecía de día.","interpretation":"Relacionó los colores de su pintura con cómo quería representar la tarde.","uncertainty":null}

Después: {"status":"review","primary":"COM_ARTE","secondary":[],"success":true,"evidence":"","reason":"Acción central observada: Crea proyectos desde los lenguajes artísticos. Secundarias solo con conducta independiente. Evidencia literal no verificada: requiere revisión humana."}

### DEV_059, r3: IMPROVED

Observación: Giró un tornillo grande de juguete con los dedos mientras sostenía firme la base.

Gold: {"primary":"PSICO_MOTRICIDAD","acceptable_primary":["PSICO_MOTRICIDAD"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}

RAW: {"status":"unclassified","primary":null,"secondary":[],"success":false}

Luna: {"clean":"[persona] giró un tornillo grande de juguete con los dedos mientras sostenía firmemente la base.","interpretation":"Giró el tornillo con los dedos y sostuvo la base al mismo tiempo.","uncertainty":null}

Después: {"status":"review","primary":"PSICO_MOTRICIDAD","secondary":[],"success":true,"evidence":"","reason":"Acción central observada: Se desenvuelve de manera autónoma a través de su motricidad. Secundarias solo con conducta independiente. Evidencia literal no verificada: requiere revisión humana."}

Conteos primaria aceptable: {"IMPROVED":9,"WORSENED":0,"SAME":195,"UNDETERMINED":0}.
