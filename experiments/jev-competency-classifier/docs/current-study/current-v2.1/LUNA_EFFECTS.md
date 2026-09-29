# Efectos Luna V2.1

Gold inmutable; análisis posterior de resultados DEV, sin juez adicional. IMPROVED/WORSENED/SAME compara primaria aceptable solo en casos clasificables; decisiones completas se muestran por separado y también incluyen abstención/privacidad. Fallos de proveedor son UNDETERMINED para comparaciones pareadas.

## CURRENT_V2_LUNA_CLEAN

Luna: 228 llamadas; interpretación presente 0; incertidumbre presente 0. Latencia etapa Luna: 1471 ms/registro de la mezcla DEV, 1548 ms/llamada permitida.

### DEV_035, r1: WORSENED

Observación: Vio el símbolo de manos bajo un grifo en un cartel y dijo que ahí avisaba dónde lavarse.

Gold: {"primary":"COM_LECTURA","acceptable_primary":["COM_LECTURA"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}

RAW: {"status":"review","primary":"COM_LECTURA","secondary":[],"success":true}

Luna: {"clean":"[persona] vio en un cartel el símbolo de unas manos bajo un grifo y dijo que ahí avisaba dónde lavarse.","interpretation":null,"uncertainty":null}

Después: {"status":"unclassified","primary":null,"secondary":[],"success":false,"evidence":"","reason":"Abstención: elección COM_LECTURA, confianza 0.99 (mínimo 0.50), suficiencia 0.69 (mínimo 0.70). Evidencia literal no verificada: requiere revisión humana."}

### DEV_028, r2: IMPROVED

Observación: Al escuchar una explicación dijo: "Eso pasó antes, no después", y relató el orden de lo ocurrido.

Gold: {"primary":"COM_ORAL","acceptable_primary":["COM_ORAL"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}

RAW: {"status":"unclassified","primary":null,"secondary":[],"success":false}

Luna: {"clean":"Al escuchar una explicación, dijo: «[persona] pasó antes, no después» y relató el orden de lo ocurrido.","interpretation":null,"uncertainty":null}

Después: {"status":"review","primary":"COM_ORAL","secondary":[],"success":true,"evidence":"Al escuchar una explicación dijo: \"Eso pasó antes, no después\", y relató el orden de lo ocurrido","reason":"Acción central: Se comunica oralmente en su lengua materna; confianza 0.94, suficiencia 0.70."}

### DEV_035, r2: WORSENED

Observación: Vio el símbolo de manos bajo un grifo en un cartel y dijo que ahí avisaba dónde lavarse.

Gold: {"primary":"COM_LECTURA","acceptable_primary":["COM_LECTURA"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}

RAW: {"status":"review","primary":"COM_LECTURA","secondary":[],"success":true}

Luna: {"clean":"En un cartel aparecía el símbolo de unas manos bajo un grifo. [Persona] dijo que ahí avisaba dónde lavarse.","interpretation":null,"uncertainty":null}

Después: {"status":"unclassified","primary":null,"secondary":[],"success":false,"evidence":"","reason":"Abstención: elección COM_LECTURA, confianza 0.90 (mínimo 0.50), suficiencia 0.65 (mínimo 0.70). Evidencia literal no verificada: requiere revisión humana."}

### DEV_005, r3: UNDETERMINED

Observación: A ver, eligió los lápices y los dejó del más cortito al más largo; cambió dos de lugar porque uno era más grande.

Gold: {"primary":"MAT_CANTIDAD","acceptable_primary":["MAT_CANTIDAD"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}

RAW: {"status":"classification_failed","primary":null,"secondary":[],"success":false}

Luna: {"clean":"Eligió los lápices y los ordenó del más corto al más largo. Cambió dos de lugar porque uno era más grande.","interpretation":null,"uncertainty":null}

Después: {"status":"review","primary":"MAT_CANTIDAD","secondary":[],"success":true,"evidence":"cambió dos de lugar porque uno era más grande","reason":"Acción central: Resuelve problemas de cantidad; confianza 1.00, suficiencia 0.91."}

### DEV_038, r3: WORSENED

Observación: Dijo que una tarjeta era una invitación porque tenía una torta y una fecha, aunque no podía leer todas las letras.

Gold: {"primary":"COM_LECTURA","acceptable_primary":["COM_LECTURA"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}

RAW: {"status":"review","primary":"COM_LECTURA","secondary":[],"success":true}

Luna: {"clean":"Dijo que una tarjeta era una invitación porque tenía una torta y una fecha, aunque no podía leer todas las letras.","interpretation":null,"uncertainty":null}

Después: {"status":"unclassified","primary":null,"secondary":[],"success":false,"evidence":"Dijo que una tarjeta era una invitación porque tenía una torta y una fecha, aunque no podía leer todas las letras.","reason":"Abstención: elección COM_LECTURA, confianza 0.98 (mínimo 0.50), suficiencia 0.68 (mínimo 0.70)."}

Conteos primaria aceptable: {"IMPROVED":1,"WORSENED":3,"SAME":199,"UNDETERMINED":1}.

## CURRENT_V2_LUNA_INTERPRET

Luna: 228 llamadas; interpretación presente 180; incertidumbre presente 29. Latencia etapa Luna: 1576 ms/registro de la mezcla DEV, 1659 ms/llamada permitida.

### DEV_028, r1: IMPROVED

Observación: Al escuchar una explicación dijo: "Eso pasó antes, no después", y relató el orden de lo ocurrido.

Gold: {"primary":"COM_ORAL","acceptable_primary":["COM_ORAL"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}

RAW: {"status":"unclassified","primary":null,"secondary":[],"success":false}

Luna: {"clean":"Al escuchar una explicación, dijo: «[persona] pasó antes, no después» y relató el orden de lo ocurrido.","interpretation":"Expresó una precisión sobre el orden de los hechos y luego los relató.","uncertainty":null}

Después: {"status":"review","primary":"COM_ORAL","secondary":[],"success":true,"evidence":"Al escuchar una explicación dijo: \"Eso pasó antes, no después\", y relató el orden de lo ocurrido","reason":"Acción central: Se comunica oralmente en su lengua materna; confianza 0.96, suficiencia 0.79."}

### DEV_063, r1: WORSENED

Observación: Vio que otra niña no alcanzaba las telas y le ofreció sostener la caja mientras ella escogía.

Gold: {"primary":"PS_CONVIVE","acceptable_primary":["PS_CONVIVE"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}

RAW: {"status":"review","primary":"PS_CONVIVE","secondary":[],"success":true}

Luna: {"clean":"Al notar que otra niña no alcanzaba las telas, le ofreció sostener la caja mientras ella escogía.","interpretation":"Ofreció sostener la caja mientras la otra niña escogía las telas.","uncertainty":null}

Después: {"status":"unclassified","primary":null,"secondary":[],"success":false,"evidence":"","reason":"Abstención: elección PS_CONVIVE, confianza 0.90 (mínimo 0.50), suficiencia 0.69 (mínimo 0.70). Evidencia literal no verificada: requiere revisión humana."}

### DEV_067, r1: IMPROVED

Observación: Dijo que necesitaban escuchar a quien todavía no había hablado y le dio espacio para proponer otra idea.

Gold: {"primary":"PS_CONVIVE","acceptable_primary":["PS_CONVIVE"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}

RAW: {"status":"unclassified","primary":null,"secondary":[],"success":false}

Luna: {"clean":"Dijo que necesitaban escuchar a quien todavía no había hablado y le dio espacio para proponer otra idea.","interpretation":"Propuso escuchar a quien aún no había hablado y le dio la oportunidad de compartir otra idea.","uncertainty":null}

Después: {"status":"review","primary":"PS_CONVIVE","secondary":[],"success":true,"evidence":"Dijo que necesitaban escuchar a quien todavía no había hablado y le dio espacio para proponer otra idea.","reason":"Acción central: Convive y participa democráticamente en la búsqueda del bien común; confianza 0.81, suficiencia 0.74."}

### DEV_028, r2: IMPROVED

Observación: Al escuchar una explicación dijo: "Eso pasó antes, no después", y relató el orden de lo ocurrido.

Gold: {"primary":"COM_ORAL","acceptable_primary":["COM_ORAL"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}

RAW: {"status":"unclassified","primary":null,"secondary":[],"success":false}

Luna: {"clean":"Al escuchar una explicación, dijo: «[persona] pasó antes, no después», y relató el orden de lo ocurrido.","interpretation":"Expresó una corrección sobre el orden de los hechos y luego los relató.","uncertainty":null}

Después: {"status":"review","primary":"COM_ORAL","secondary":[],"success":true,"evidence":"Al escuchar una explicación dijo: \"Eso pasó antes, no después\", y relató el orden de lo ocurrido","reason":"Acción central: Se comunica oralmente en su lengua materna; confianza 0.98, suficiencia 0.80."}

### DEV_065, r2: IMPROVED

Observación: Ante un desacuerdo sobre la música, sugirió escuchar una canción de cada uno y preguntó si estaban de acuerdo.

Gold: {"primary":"PS_CONVIVE","acceptable_primary":["PS_CONVIVE"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}

RAW: {"status":"unclassified","primary":null,"secondary":[],"success":false}

Luna: {"clean":"Ante un desacuerdo sobre la música, sugirió escuchar una canción de cada uno y preguntó si estaban de acuerdo.","interpretation":"Propuso una alternativa y consultó si los demás estaban de acuerdo.","uncertainty":null}

Después: {"status":"review","primary":"PS_CONVIVE","secondary":[],"success":true,"evidence":"Ante un desacuerdo sobre la música, sugirió escuchar una canción de cada uno y preguntó si estaban de acuerdo.","reason":"Acción central: Convive y participa democráticamente en la búsqueda del bien común; confianza 1.00, suficiencia 0.72."}

### DEV_067, r2: IMPROVED

Observación: Dijo que necesitaban escuchar a quien todavía no había hablado y le dio espacio para proponer otra idea.

Gold: {"primary":"PS_CONVIVE","acceptable_primary":["PS_CONVIVE"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}

RAW: {"status":"unclassified","primary":null,"secondary":[],"success":false}

Luna: {"clean":"Dijo que necesitaban escuchar a quien todavía no había hablado y le dio espacio para proponer otra idea.","interpretation":"Escuchó a una persona que aún no había intervenido y le dio espacio para compartir otra idea.","uncertainty":null}

Después: {"status":"review","primary":"PS_CONVIVE","secondary":[],"success":true,"evidence":"Dijo que necesitaban escuchar a quien todavía no había hablado y le dio espacio para proponer otra idea.","reason":"Acción central: Convive y participa democráticamente en la búsqueda del bien común; confianza 0.76, suficiencia 0.71."}

### DEV_005, r3: UNDETERMINED

Observación: A ver, eligió los lápices y los dejó del más cortito al más largo; cambió dos de lugar porque uno era más grande.

Gold: {"primary":"MAT_CANTIDAD","acceptable_primary":["MAT_CANTIDAD"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}

RAW: {"status":"classification_failed","primary":null,"secondary":[],"success":false}

Luna: {"clean":"Eligió los lápices y los ordenó del más corto al más largo. Cambió dos de lugar porque uno era más grande.","interpretation":"Ordenó los lápices según su longitud y ajustó la ubicación de dos de ellos.","uncertainty":null}

Después: {"status":"review","primary":"MAT_CANTIDAD","secondary":[],"success":true,"evidence":"cambió dos de lugar porque uno era más grande","reason":"Acción central: Resuelve problemas de cantidad; confianza 1.00, suficiencia 0.94."}

### DEV_028, r3: IMPROVED

Observación: Al escuchar una explicación dijo: "Eso pasó antes, no después", y relató el orden de lo ocurrido.

Gold: {"primary":"COM_ORAL","acceptable_primary":["COM_ORAL"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}

RAW: {"status":"unclassified","primary":null,"secondary":[],"success":false}

Luna: {"clean":"Al escuchar una explicación, dijo: «[persona] pasó antes, no después» y relató el orden de lo ocurrido.","interpretation":"Relató el orden de los hechos y precisó que [persona] pasó antes, no después.","uncertainty":null}

Después: {"status":"review","primary":"COM_ORAL","secondary":[],"success":true,"evidence":"Al escuchar una explicación dijo: \"Eso pasó antes, no después\", y relató el orden de lo ocurrido","reason":"Acción central: Se comunica oralmente en su lengua materna; confianza 0.97, suficiencia 0.74."}

### DEV_067, r3: IMPROVED

Observación: Dijo que necesitaban escuchar a quien todavía no había hablado y le dio espacio para proponer otra idea.

Gold: {"primary":"PS_CONVIVE","acceptable_primary":["PS_CONVIVE"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}

RAW: {"status":"unclassified","primary":null,"secondary":[],"success":false}

Luna: {"clean":"Dijo que necesitaban escuchar a quien todavía no había hablado y le dio espacio para proponer otra idea.","interpretation":"Propuso escuchar a quien aún no había hablado y le dio espacio para compartir otra idea.","uncertainty":null}

Después: {"status":"review","primary":"PS_CONVIVE","secondary":[],"success":true,"evidence":"Dijo que necesitaban escuchar a quien todavía no había hablado y le dio espacio para proponer otra idea.","reason":"Acción central: Convive y participa democráticamente en la búsqueda del bien común; confianza 0.84, suficiencia 0.76."}

### DEV_075, r3: decisión no curricular/privacidad

Observación: Tomó una masa, la apretó una vez y la dejó. No vi que preguntara, comparara o intentara comprobar algo.

Gold: {"primary":null,"acceptable_primary":[],"acceptable_secondary":[],"should_abstain":true,"should_privacy_block":false,"discussable":false}

RAW: {"status":"unclassified","primary":null,"secondary":[],"success":true}

Luna: {"clean":"Apretó una masa una vez y la dejó. No observé que preguntara, comparara o intentara comprobar algo.","interpretation":null,"uncertainty":null}

Después: {"status":"review","primary":"PSICO_MOTRICIDAD","secondary":[],"success":false,"evidence":"","reason":"Acción central: Se desenvuelve de manera autónoma a través de su motricidad; confianza 0.64, suficiencia 0.71. Evidencia literal no verificada: requiere revisión humana."}

Conteos primaria aceptable: {"IMPROVED":7,"WORSENED":1,"SAME":195,"UNDETERMINED":1}.
