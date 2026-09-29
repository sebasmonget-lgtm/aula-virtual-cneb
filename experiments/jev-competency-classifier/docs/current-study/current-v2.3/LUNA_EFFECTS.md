# Efectos Luna V2.3

Gold inmutable; análisis posterior de resultados DEV, sin juez adicional. IMPROVED/WORSENED/SAME compara primaria aceptable solo en casos clasificables; decisiones completas se muestran por separado y también incluyen abstención/privacidad. Fallos de proveedor son UNDETERMINED para comparaciones pareadas.

## CURRENT_V2_LUNA_CLEAN

Luna: 228 llamadas; interpretación presente 0; incertidumbre presente 0. Latencia etapa Luna: 1684 ms/registro de la mezcla DEV, 1772 ms/llamada permitida.

### DEV_057, r1: IMPROVED

Observación: Llevó una bolsita sobre la cabeza hasta el cono; cuando se inclinaba redujo la velocidad.

Gold: {"primary":"PSICO_MOTRICIDAD","acceptable_primary":["PSICO_MOTRICIDAD"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}

RAW: {"status":"unclassified","primary":null,"secondary":[],"success":false}

Luna: {"clean":"[persona] llevó una bolsita sobre la cabeza hasta el cono. Cuando se inclinaba, reducía la velocidad.","interpretation":null,"uncertainty":null}

Después: {"status":"review","primary":"PSICO_MOTRICIDAD","secondary":[],"success":true,"evidence":"","reason":"Acción central: Se desenvuelve de manera autónoma a través de su motricidad; confianza 0.98, suficiencia 0.81. Evidencia literal no verificada: requiere revisión humana."}

### DEV_057, r3: IMPROVED

Observación: Llevó una bolsita sobre la cabeza hasta el cono; cuando se inclinaba redujo la velocidad.

Gold: {"primary":"PSICO_MOTRICIDAD","acceptable_primary":["PSICO_MOTRICIDAD"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}

RAW: {"status":"unclassified","primary":null,"secondary":[],"success":false}

Luna: {"clean":"Llevó una bolsita sobre la cabeza hasta el cono; cuando se inclinaba, redujo la velocidad.","interpretation":null,"uncertainty":null}

Después: {"status":"review","primary":"PSICO_MOTRICIDAD","secondary":[],"success":true,"evidence":"cuando se inclinaba redujo la velocidad","reason":"Acción central: Se desenvuelve de manera autónoma a través de su motricidad; confianza 0.98, suficiencia 0.84."}

Conteos primaria aceptable: {"IMPROVED":2,"WORSENED":0,"SAME":202,"UNDETERMINED":0}.

## CURRENT_V2_LUNA_INTERPRET

Luna: 228 llamadas; interpretación presente 193; incertidumbre presente 24. Latencia etapa Luna: 1549 ms/registro de la mezcla DEV, 1630 ms/llamada permitida.

### DEV_049, r1: WORSENED

Observación: Movió un pañuelo lento y después rápido para mostrar cómo volaba una mariposa; invitó a mirar su movimiento.

Gold: {"primary":"COM_ARTE","acceptable_primary":["COM_ARTE"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}

RAW: {"status":"review","primary":"COM_ARTE","secondary":[],"success":true}

Luna: {"clean":"Movió un pañuelo lentamente y después rápido para mostrar cómo volaba una mariposa; invitó a mirar su movimiento.","interpretation":"Mostró con el pañuelo dos ritmos de movimiento e invitó a observarlos.","uncertainty":null}

Después: {"status":"unclassified","primary":null,"secondary":[],"success":false,"evidence":"","reason":"Abstención: elección PSICO_MOTRICIDAD, confianza 0.46 (mínimo 0.50), suficiencia 0.89 (mínimo 0.70). Evidencia literal no verificada: requiere revisión humana."}

### DEV_057, r1: IMPROVED

Observación: Llevó una bolsita sobre la cabeza hasta el cono; cuando se inclinaba redujo la velocidad.

Gold: {"primary":"PSICO_MOTRICIDAD","acceptable_primary":["PSICO_MOTRICIDAD"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}

RAW: {"status":"unclassified","primary":null,"secondary":[],"success":false}

Luna: {"clean":"Con una bolsita sobre la cabeza, avanzó hasta el cono; cuando se inclinaba, redujo la velocidad.","interpretation":null,"uncertainty":null}

Después: {"status":"review","primary":"PSICO_MOTRICIDAD","secondary":[],"success":true,"evidence":"cuando se inclinaba redujo la velocidad","reason":"Acción central: Se desenvuelve de manera autónoma a través de su motricidad; confianza 0.98, suficiencia 0.84."}

### DEV_057, r2: IMPROVED

Observación: Llevó una bolsita sobre la cabeza hasta el cono; cuando se inclinaba redujo la velocidad.

Gold: {"primary":"PSICO_MOTRICIDAD","acceptable_primary":["PSICO_MOTRICIDAD"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}

RAW: {"status":"unclassified","primary":null,"secondary":[],"success":false}

Luna: {"clean":"Avanzó hasta el cono con una bolsita sobre la cabeza; cuando se inclinaba, redujo la velocidad.","interpretation":null,"uncertainty":null}

Después: {"status":"review","primary":"PSICO_MOTRICIDAD","secondary":[],"success":true,"evidence":"cuando se inclinaba redujo la velocidad","reason":"Acción central: Se desenvuelve de manera autónoma a través de su motricidad; confianza 0.97, suficiencia 0.81."}

### DEV_049, r3: WORSENED

Observación: Movió un pañuelo lento y después rápido para mostrar cómo volaba una mariposa; invitó a mirar su movimiento.

Gold: {"primary":"COM_ARTE","acceptable_primary":["COM_ARTE"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}

RAW: {"status":"review","primary":"COM_ARTE","secondary":[],"success":true}

Luna: {"clean":"Movió un pañuelo primero lento y después rápido para mostrar cómo volaba una mariposa e invitó a mirar su movimiento.","interpretation":"Mostró el movimiento de la mariposa variando la velocidad del pañuelo.","uncertainty":null}

Después: {"status":"review","primary":"PSICO_MOTRICIDAD","secondary":[],"success":false,"evidence":"","reason":"Acción central: Se desenvuelve de manera autónoma a través de su motricidad; confianza 0.51, suficiencia 0.88. Evidencia literal no verificada: requiere revisión humana."}

### DEV_057, r3: IMPROVED

Observación: Llevó una bolsita sobre la cabeza hasta el cono; cuando se inclinaba redujo la velocidad.

Gold: {"primary":"PSICO_MOTRICIDAD","acceptable_primary":["PSICO_MOTRICIDAD"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}

RAW: {"status":"unclassified","primary":null,"secondary":[],"success":false}

Luna: {"clean":"Llevó una bolsita sobre la cabeza hasta el cono; cuando se inclinaba, redujo la velocidad.","interpretation":"Ajustó la velocidad mientras llevaba la bolsita sobre la cabeza.","uncertainty":null}

Después: {"status":"review","primary":"PSICO_MOTRICIDAD","secondary":[],"success":true,"evidence":"cuando se inclinaba redujo la velocidad","reason":"Acción central: Se desenvuelve de manera autónoma a través de su motricidad; confianza 1.00, suficiencia 0.86."}

Conteos primaria aceptable: {"IMPROVED":3,"WORSENED":2,"SAME":199,"UNDETERMINED":0}.
