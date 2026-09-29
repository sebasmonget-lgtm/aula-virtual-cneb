# LAST OPTIMIZATION — V2.4

Informe: 2026-09-29T12:42:46.630Z.

**Recomendación: Hacer prueba supervisada; no integrar automáticamente.** Preferencia entre las dos V2.4: **CURRENT_V2_4_RAW**.

## 1. Alcance y congelación

Un único V2.4, un TEST2 nuevo, 40 casos, cuatro brazos, una repetición. A es V1 RAW con privacidad corregida; B es V2.3 RAW, el CURRENT_V2_RAW inmediatamente anterior, no el primer borrador V2. No se ejecutó INTERPRET, TEST1 ni otro ciclo DEV. No se modificó Ayni, BD ni routing. No se cambió prompt, threshold, gold o anonimizador después de ver TEST2.

Gold: 28 curriculares, 8 abstenciones, 4 Privacy ficticios. Edad null. SHA-256: **a206defd4c8f07b9d435e977f9e4894346f07aff1f05a771f5d91e79955f058d**. Congelación de gold anterior a prompt final y a llamadas. Prompt SHA-256: **271b4b8298a5b8c2132160f7514d69c45f8f59cf686aa2a2a2edd0892cbd0867**.

Respaldo: `06a61cb`. Configuración congelada y guardada antes de llamadas: `528cd35`. Todas las entradas oficiales se validaron contra KB v4.1 y sus IDs aplicables. El lock durable impide otra corrida; no hay retry ni uso de cache de clasificaciones.

**Límite de independencia:** TEST2 es nuevo, sintético y no evaluado antes, pero lo creó/adjudicó Codex, el mismo autor que conoce errores históricos y redacta V2.4. Jev/Luna no generaron gold. Esto reduce independencia respecto al diseño y no sustituye una adjudicación docente externa ni observaciones reales nuevas. No se afirma generalización a aulas reales.

## 2. Autopsia de los ocho errores anteriores

[Autopsia privada completa con originales, texto anonimizado, CLEAN real, dos cuerpos Jev reconstruidos, evidence, reason, final y gold](<C:/Users/ASUS/.codex/worktrees/jev-luna-benchmark/Asistente CNEB/experiments/jev-competency-classifier/LAST_OPTIMIZATION_ERROR_AUTOPSY.md>)

No hubo llamadas de autopsia. Se verificaron las nueve fuentes previas antes de reconstruir requests. Son cuerpos reconstruidos del código/prompt guardado, no capturas de tráfico histórico. Las respuestas son las realmente almacenadas.

| Caso | Causas plausibles | Conclusión pedagógica y técnica |
|---|---|---|
| AG-01 | gold_ambiguous, jev_false_abstention, prompt_rule_conflict | Suficiencia 0.95 pero elección Indaga con confianza 0.41. El gate de confianza, no la falta de acción, causa la abstención. Cantidad supone comparación por tamaño sin seriación explícita; Forma/localización es defendible por construcción y grandes abajo. Cambiar la base tras caídas tampoco prueba por sí solo un proceso científico. No hay daño semántico sustancial en anonimización ni CLEAN. |
| AG-02 | gold_ambiguous, anonymizer_damage, prompt_rule_conflict | Arte principal correcto. Oral noul 0.61, menor que 0.80. También queda reemplazado por [persona], que introduce un falso sujeto antes de dibujó; CLEAN lo retira sin añadir acción. Nombrar figuras de la propia representación puede ser parte del mismo acto artístico, no otra conducta independiente. El gold exige Oral mientras el prompt conservador permite omitir habla instrumental. No aumentar secundarias para ajustar este caso. |
| MC-03 | gold_ambiguous, anonymizer_damage, luna_distortion, jev_false_abstention | Una se oculta como posible nombre y el nombre propio se neutraliza correctamente. CLEAN elimina el segundo sujeto y reúne tomar el pañuelo y molestarse en La niña: se pierde quién realizó cada acción. Elección Oral 0.47 y suficiencia 0.57 bloquean la sugerencia. La protesta y solución individual pueden relacionarse con Convivencia, Identidad u Oral, pero no describen un acuerdo ni negociación explícita. No afirmar que el error provenga únicamente de Jev. |
| MN-03 | gold_ambiguous, anonymizer_damage, luna_distortion, jev_wrong_primary, prompt_rule_conflict | Agarró queda oculto; No permanece intacto. CLEAN convierte [persona] un cuento... en [persona] contó un cuento: pierde la acción de tomar el soporte y reorganiza la narración, que sí estaba descrita. La narración mirando dibujos sostiene Lectura emergente, aunque el cuento conocido deja abierta memoria oral. Jev elige Oral 0.58 pese al soporte visual. La exigencia de Oral secundaria no siempre describe otra conducta independiente; si Oral es principal tampoco puede aparecer como secundaria. |
| RO-01 | anonymizer_damage, luna_distortion, jev_unnecessary_secondary, prompt_rule_conflict | Con se oculta, perdiendo una preposición; se conserva hizo y el cambio de inclinación con resultado. CLEAN reordena y sustituye singular no bajaba por plural no bajaban: resuelve el referente sin certeza. Indaga principal correcto; Forma noul 0.81 añade secundaria por la misma rampa/ajuste instrumental. Las instrucciones globales dicen conducta independiente, pero los criterios de Forma permiten activarla por relaciones espaciales sin hacer explícita esa subordinación. |
| SE-01 | gold_ambiguous, anonymizer_damage, jev_wrong_primary, prompt_rule_conflict | Encontró se oculta y CLEAN conserva la frase sin verbo. Oral 0.52 vence a Indaga. Explicar el origen de una pluma y mirar árboles puede iniciar indagación, pero no consta explícitamente que la mirada busque verificar la explicación. Bajo la regla nueva observa-explica-busca, Indaga es preferible solo si búsqueda/verificación está descrita. Oral es defendible con este registro; no inventar comprobación para satisfacer el gold. |
| TE-02 | gold_ambiguous, anonymizer_damage, jev_false_abstention, prompt_rule_conflict | Con se oculta y el nombre propio se neutraliza; CLEAN interpreta una coordinación de dos sujetos, plausible pero no textual. Suficiencia 0.94 y confianza 0.41 en Convivencia producen abstención por dispersión frente a Forma 0.41. El dibujo de la curva representa espacio para comunicar una propuesta de juego. Forma principal defendible; Convivencia también por propuesta ante desacuerdo. Usar el dibujo como solución compartida no exige completar el acuerdo. |
| TE-03 | gold_ambiguous, jev_false_abstention, prompt_rule_conflict | Sin daño de anonimizador; CLEAN conserva incertidumbre y secuencia. Suficiencia 0.95 pero Oral 0.44 bloquea la sugerencia. Leer la secuencia visual es preferible a contar cuatro dibujos: cuatro es detalle, no conteo observado. Oral y Lectura ya son aceptables en el gold histórico. Ese gold requiere Lectura secundaria incluso si Lectura resulta principal; el runtime excluye duplicar la principal, haciendo imposible exact decision para esa alternativa. |

Causas no aisladas experimentalmente: llamar a una salida jev_wrong_primary significa desacuerdo con el gold histórico, no que la etiqueta sea pedagógicamente imposible. AG-01 admite Forma; MN-03 admite Oral si predomina recuerdo; TE-03 ya admite Lectura. AG-02, MN-03 y TE-02 exigen secundarias que pueden describir la misma actuación. TE-03 exige Lectura secundaria incluso cuando Lectura es principal aceptable: el contrato histórico no permite exact decision en esa alternativa porque runtime excluye duplicados. Gold histórico intacto.

## 3. Efecto del anonimizador

Modificó seis de ocho: AG-02, MC-03, MN-03, RO-01, SE-01, TE-02. No cambió AG-01 ni TE-03. Ocultó Agarró y Encontró (verbos), También (conector), Con (preposición), Una (determinante), además de nombres correctamente neutralizados. No eliminó No en MN-03. Los placeholders pueden parecer sujetos y destruir relaciones; no tienen un único significado. No se cambió el anonimizador.

La distorsión más clara de CLEAN está en MC-03: convierte dos sujetos en uno, atribuyendo tomar el pañuelo y molestarse a la misma niña. En otros casos reconstruye/reordena relaciones o resuelve referente singular/plural. En SE-01 conserva una frase sin verbo. No afirmar que limpiar el schema conserve automáticamente el significado.

## 4. Cambios exactos V2.3 → V2.4

- Prioridad por fuente/función de conducta; evitar número/material/tema como única señal.
- Acción curricular clara + verbalización acompañante puede bastar, sin exigir logro, paso adicional ni acuerdo completo; conservar abstención en estados/rutinas/manipulación incidental.
- Oral/Lectura: priorizar significado obtenido de soporte gráfico; relato sin uso del soporte sigue Oral. Secuencia visual no es Cantidad por número de imágenes.
- Indaga/Oral: observación → explicación/pregunta → comparación/búsqueda/prueba/verificación realmente descritas. No inventar finalidad de comprobar.
- Convivencia: propuesta/turno/ayuda/acción compartida observadas bastan sin exigir respuesta final; proximidad pasiva no basta.
- Secundarias: instrucción adicional conservadora solo en las preguntas adicionales. No etiquetar dos veces la misma actuación; sí reconocer otra independiente.
- Cantidad/Forma y representación espacial: distinguir seriación/comparación cuantitativa de ubicación/representación y de medios de una prueba de fenómeno.

No cambiaron modelos, anonimizador, Luna CLEAN, privacidad, cantidad de solicitudes ni thresholds. El builder acepta una instrucción adicional opcional; se probó que sin ella produce exactamente los requests V2.3 anteriores. El diff literal está en `docs/last-optimization/PROMPT_DIFF.md` y el prompt completo en `config/current-v2-4-prompt.json`.

## 5. Comprobación de THRESHOLD, antes de TEST2

Original **0.50**; probados offline **0.50 / 0.45 / 0.40**, escala de confianza 0–1 e inclusión `>=`. Suficiencia **0.70** y secundaria **0.80** fijas. Resultados completos de los cuatro ciclos: `docs/LAST_THRESHOLD_DEV.md`; datos/procedencia: `config/last-threshold-dev.json`. No nuevas llamadas, ni lectura de TEST2 en el analizador.

| Brazo DEV V2.3 | Threshold | Acceptable primary (204) | False abstentions | Overclassification | Wrong primary | Privacy FP/FN |
|---|---:|---:|---:|---:|---:|---:|
| CURRENT_V2_RAW | 0.50 | 98.53% | 3 | 0 | 0 | 0/0 |
| CURRENT_V2_RAW | 0.45 | 98.53% | 3 | 0 | 0 | 0/0 |
| CURRENT_V2_RAW | 0.40 | 98.53% | 3 | 0 | 0 | 0/0 |
| CURRENT_V2_LUNA_CLEAN | 0.50 | 99.51% | 1 | 0 | 0 | 0/0 |
| CURRENT_V2_LUNA_CLEAN | 0.45 | 99.51% | 1 | 0 | 0 | 0/0 |
| CURRENT_V2_LUNA_CLEAN | 0.40 | 99.51% | 1 | 0 | 0 | 0/0 |

**Finalmente congelado: 0.50.** En V2.3 RAW y CLEAN, .45 y .40 reproducen exactamente las decisiones de .50. Todas las falsas abstenciones restantes tienen confianza .95–.96 y suficiencia .61–.63: el gate activo es suficiencia .70, no confianza. No hay beneficio DEV que justifique bajar confianza. En V2 inicial reducir confidence también habilita primarias incorrectas; no usar TEST1 para contradecir la elección DEV.

Replay condicional a outputs ya guardados, no estima cómo cambiará la distribución de confianza al modificar el prompt V2.4. DEV reutilizado y próximo al techo; repeticiones no son casos independientes. No variar suficiencia porque no está autorizado en esta comprobación.

## 6. TEST2 — efectividad completa

| Métrica | V1 RAW | V2.3 RAW (CURRENT_V2_RAW) | V2.4 RAW | V2.4 CLEAN |
|---|---:|---:|---:|---:|
| Primary accuracy (28) | 85.71% | 92.86% | 96.43% | 89.29% |
| Acceptable primary accuracy (28) | 89.29% (25/28) | 96.43% (27/28) | 100.00% (28/28) | 92.86% (26/28) |
| Exact decision (40) | 85.00% (34/40) | 97.50% (39/40) | 97.50% (39/40) | 92.50% (37/40) |
| False abstentions (28) | 0 | 1 | 0 | 2 |
| Overclassification (8) | 0 | 0 | 0 | 0 |
| Wrong primary (28) | 3 | 0 | 0 | 0 |
| Privacy FP / FN (36 negativos / 4 positivos) | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |
| Unnecessary secondary (etiquetas) | 2 | 0 | 0 | 0 |
| Casos con unnecessary secondary | 2 | 0 | 0 | 0 |
| Casos con missed secondary | 2 | 1 | 1 | 2 |
| Provider failures | 0 | 0 | 0 | 0 |
| Cost / observation | US$0.00020151 | US$0.00029455 | US$0.00041346 | US$0.00048814 |
| Cost / 100 observations | US$0.02015139 | US$0.02945460 | US$0.04134648 | US$0.04881396 |
| Cost / 1000 observations | US$0.20151390 | US$0.29454600 | US$0.41346480 | US$0.48813960 |
| Average latency (ms; 40 casos) | 338.32 | 319.70 | 357.07 | 2324.78 |
| Average latency (ms; solo 36 permitidos) | 375.92 | 355.22 | 396.75 | 2583.08 |
| Llamadas promedio / observación | 1.80 | 1.80 | 1.80 | 2.70 |

Accuracy solo sobre 28 casos curriculares; exact decision sobre 40, incluyendo Privacy y abstención. Exact decision exige primaria aceptable, ninguna secundaria innecesaria y todas las secundarias requeridas. Primaria equivocada, abstención falsa y Privacy se informan separadamente. Las repeticiones fueron una, no evidencia de estabilidad. Latencia/costo por observación incluyen cuatro Privacy de costo/latencia de proveedor cero.

TEST2_017 y TEST2_040 tienen dos principales aceptables por ambigüedad. TEST2_038 fija Cantidad principal y Oral secundaria por acciones separadas, pero el foco global de la nota larga es discutible: no usar ese único caso para afirmar mejora robusta. TEST2_039 también exige una secundaria por una negociación posterior independiente. Gold se mantiene congelado.

### Comparaciones emparejadas

- **CURRENT_V1_RAW → CURRENT_V2_RAW:** acceptable 7.14% de diferencia; corrige 2 primarias (TEST2_027, TEST2_028), introduce 0 (ninguna); mejora 5 decisiones completas e introduce 0 errores completos. Costo incremental US$0.00372128, por 1,000 US$0.09303210, latencia -18.63 ms.
- **CURRENT_V2_RAW → CURRENT_V2_4_RAW:** acceptable 3.57% de diferencia; corrige 1 primarias (TEST2_039), introduce 0 (ninguna); mejora 1 decisiones completas e introduce 1 errores completos. Costo incremental US$0.00475675, por 1,000 US$0.11891880, latencia 37.38 ms.
- **CURRENT_V1_RAW → CURRENT_V2_4_RAW:** acceptable 10.71% de diferencia; corrige 3 primarias (TEST2_027, TEST2_028, TEST2_039), introduce 0 (ninguna); mejora 5 decisiones completas e introduce 0 errores completos. Costo incremental US$0.00847804, por 1,000 US$0.21195090, latencia 18.75 ms.
- **CURRENT_V2_4_RAW → CURRENT_V2_4_LUNA_CLEAN:** acceptable -7.14% de diferencia; corrige 0 primarias (ninguna), introduce 2 (TEST2_017, TEST2_039); mejora 0 decisiones completas e introduce 2 errores completos. Costo incremental US$0.00298699, por 1,000 US$0.07467480, latencia 1967.70 ms.

Las diferencias de accuracy anteriores son puntos porcentuales, no incremento relativo. V2.4 frente a V2.3 corrige una abstención de primaria, pero pierde una secundaria en otro caso: exact decision queda empatado en 39/40. La mejora específica de V2.4 depende de un único caso y no establece superioridad robusta sobre V2.3. V2.3 conserva una relación costo/efectividad competitiva. El 28/28 de V2.4 es un resultado de esta muestra, no promesa de 100% en uso real.

## 7. Costos, usage y latencia

Desembolso medido/calculado combinado de esta única corrida: **US$0.05590657**. Subtotal conocido US$0.05590657; **0** llamadas sin costo. **324** intentos físicos, máximo congelado 360; cuatro Privacy ahorran 36 intentos. Sin pruebas pagadas extra ni doble conteo de Luna.

Jev: preferencia por `usage.cost` real; fallback tarifario queda identificado por separado. Luna: usage real × tarifa congelada, costo estimado tarifario, no factura confirmada. Tarifas centralizadas sin cambios: Luna entrada US$0.10/M, cache US$0.01/M, cache-write US$0.125/M, salida US$0.50/M; Jev fallback entrada US$0.042/M y salida US$0/M. Tarifas consultadas en septiembre, no verificación de precio actual. Tokens de reasoning incluidos en salida, no se facturan dos veces.

| Método | Jev proveedor | Jev tarifa fallback | Luna tarifa/usage real | Total | Costo/obs | Costo/1000 | Latencia ms |
|---|---:|---:|---:|---:|---:|---:|---:|
| CURRENT_V1_RAW | US$0.00806056 | US$0.00000000 | US$0.00000000 | US$0.00806056 | US$0.00020151 | US$0.20151390 | 338.32 |
| CURRENT_V2_RAW | US$0.01178184 | US$0.00000000 | US$0.00000000 | US$0.01178184 | US$0.00029455 | US$0.29454600 | 319.70 |
| CURRENT_V2_4_RAW | US$0.01653859 | US$0.00000000 | US$0.00000000 | US$0.01653859 | US$0.00041346 | US$0.41346480 | 357.07 |
| CURRENT_V2_4_LUNA_CLEAN | US$0.01656278 | US$0.00000000 | US$0.00296280 | US$0.01952558 | US$0.00048814 | US$0.48813960 | 2324.78 |

| Método | Llamadas Jev | Jev tokens entrada/salida | Llamadas Luna | Luna entrada/salida/reasoning/cache | Costo por primaria aceptable | Costo por clasificación completa correcta |
|---|---:|---:|---:|---:|---:|---:|
| CURRENT_V1_RAW | 72 | 191918/15565 | 0 | 0/0/0/0 | US$0.00032242 | US$0.00036639 |
| CURRENT_V2_RAW | 72 | 280520/17276 | 0 | 0/0/0/0 | US$0.00043636 | US$0.00043636 |
| CURRENT_V2_4_RAW | 72 | 393776/17277 | 0 | 0/0/0/0 | US$0.00059066 | US$0.00061254 |
| CURRENT_V2_4_LUNA_CLEAN | 72 | 394352/17470 | 36 | 8468/4232/1871/0 | US$0.00075098 | US$0.00078102 |

Añadir CLEAN a V2.4: costo 18.06%, incremento US$0.07467480/1,000 y 1967.70 ms/obs. Costo incremental por primaria corregida no definido: ninguna primaria corregida o costo desconocido. Ganancia de accuracy por US$1 incremental en lote de 1,000: -95.65 puntos porcentuales; normalización descriptiva, no promesa de mejora lineal al gastar.

### Extrapolación mensual

Proyección de consumo, no factura mensual. Mantiene mezcla TEST2 (10% Privacy) y costo Luna tarifario; no incluye hosting, BD, almacenamiento, impuestos ni operaciones ajenas al clasificador.

| Profesoras | Obs/día | Obs/mes (20 días) | V1 RAW | V2.3 RAW | V2.4 RAW | V2.4 CLEAN |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10 | 200 | US$0.04030278 | US$0.05890920 | US$0.08269296 | US$0.09762792 |
| 10 | 10 | 2000 | US$0.40302780 | US$0.58909200 | US$0.82692960 | US$0.97627920 |
| 50 | 10 | 10000 | US$2.01513900 | US$2.94546000 | US$4.13464800 | US$4.88139600 |
| 100 | 10 | 20000 | US$4.03027800 | US$5.89092000 | US$8.26929600 | US$9.76279200 |
| 1 | 20 | 400 | US$0.08060556 | US$0.11781840 | US$0.16538592 | US$0.19525584 |
| 10 | 20 | 4000 | US$0.80605560 | US$1.17818400 | US$1.65385920 | US$1.95255840 |
| 50 | 20 | 20000 | US$4.03027800 | US$5.89092000 | US$8.26929600 | US$9.76279200 |
| 100 | 20 | 40000 | US$8.06055600 | US$11.78184000 | US$16.53859200 | US$19.52558400 |
| 1 | 40 | 800 | US$0.16121112 | US$0.23563680 | US$0.33077184 | US$0.39051168 |
| 10 | 40 | 8000 | US$1.61211120 | US$2.35636800 | US$3.30771840 | US$3.90511680 |
| 50 | 40 | 40000 | US$8.06055600 | US$11.78184000 | US$16.53859200 | US$19.52558400 |
| 100 | 40 | 80000 | US$16.12111200 | US$23.56368000 | US$33.07718400 | US$39.05116800 |

## 8. Errores restantes

### CURRENT_V1_RAW

- **TEST2_017**: unnecessary_secondary. Gold {"primary":"COM_ARTE","acceptable_primary":["PSICO_MOTRICIDAD"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}; salida {"status":"review","primary":"PSICO_MOTRICIDAD","secondary":["MAT_FORMA"]}. V1 no genera reason; revisar payload y probabilidades.
- **TEST2_027**: wrong_primary. Gold {"primary":"COM_ESCRITURA","acceptable_primary":[],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}; salida {"status":"review","primary":"COM_LECTURA","secondary":[]}. V1 no genera reason; revisar payload y probabilidades.
- **TEST2_028**: wrong_primary. Gold {"primary":"COM_ARTE","acceptable_primary":[],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}; salida {"status":"review","primary":"CYT_INDAGA","secondary":[]}. V1 no genera reason; revisar payload y probabilidades.
- **TEST2_038**: missed_secondary. Gold {"primary":"MAT_CANTIDAD","acceptable_primary":[],"acceptable_secondary":["COM_ORAL"],"should_abstain":false,"should_privacy_block":false,"discussable":false}; salida {"status":"review","primary":"MAT_CANTIDAD","secondary":[]}. V1 no genera reason; revisar payload y probabilidades.
- **TEST2_039**: wrong_primary, missed_secondary. Gold {"primary":"COM_ESCRITURA","acceptable_primary":[],"acceptable_secondary":["PS_CONVIVE"],"should_abstain":false,"should_privacy_block":false,"discussable":false}; salida {"status":"review","primary":"PS_CONVIVE","secondary":[]}. V1 no genera reason; revisar payload y probabilidades.
- **TEST2_040**: unnecessary_secondary. Gold {"primary":"COM_ARTE","acceptable_primary":["MAT_FORMA"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}; salida {"status":"review","primary":"COM_ARTE","secondary":["MAT_FORMA"]}. V1 no genera reason; revisar payload y probabilidades.

### CURRENT_V2_RAW

- **TEST2_039**: false_abstention, missed_secondary. Gold {"primary":"COM_ESCRITURA","acceptable_primary":[],"acceptable_secondary":["PS_CONVIVE"],"should_abstain":false,"should_privacy_block":false,"discussable":false}; salida {"status":"unclassified","primary":null,"secondary":[]}. Abstención: elección PS_CONVIVE, confianza 0.49 (mínimo 0.50), suficiencia 0.95 (mínimo 0.70).

### CURRENT_V2_4_RAW

- **TEST2_038**: missed_secondary. Gold {"primary":"MAT_CANTIDAD","acceptable_primary":[],"acceptable_secondary":["COM_ORAL"],"should_abstain":false,"should_privacy_block":false,"discussable":false}; salida {"status":"review","primary":"MAT_CANTIDAD","secondary":[]}. Acción central: Resuelve problemas de cantidad; confianza 0.97, suficiencia 0.95.

### CURRENT_V2_4_LUNA_CLEAN

- **TEST2_017**: false_abstention. Gold {"primary":"COM_ARTE","acceptable_primary":["PSICO_MOTRICIDAD"],"acceptable_secondary":[],"should_abstain":false,"should_privacy_block":false,"discussable":false}; salida {"status":"unclassified","primary":null,"secondary":[]}. Abstención: elección PSICO_MOTRICIDAD, confianza 0.48 (mínimo 0.50), suficiencia 0.94 (mínimo 0.70).
- **TEST2_038**: missed_secondary. Gold {"primary":"MAT_CANTIDAD","acceptable_primary":[],"acceptable_secondary":["COM_ORAL"],"should_abstain":false,"should_privacy_block":false,"discussable":false}; salida {"status":"review","primary":"MAT_CANTIDAD","secondary":[]}. Acción central: Resuelve problemas de cantidad; confianza 0.97, suficiencia 0.96.
- **TEST2_039**: false_abstention, missed_secondary. Gold {"primary":"COM_ESCRITURA","acceptable_primary":[],"acceptable_secondary":["PS_CONVIVE"],"should_abstain":false,"should_privacy_block":false,"discussable":false}; salida {"status":"unclassified","primary":null,"secondary":[]}. Abstención: elección PS_CONVIVE, confianza 0.46 (mínimo 0.50), suficiencia 0.96 (mínimo 0.70).

Cada error conserva la observación original/anonimizada/CLEAN y las solicitudes completas en resultados locales. Tabla de 40 y fichas completas: `docs/last-optimization/ALL_40_CASES.md`. No se repararon errores después de la corrida.

## 9. ¿Vale la pena Luna?

RAW es preferible entre V2.4: CLEAN no demuestra ganancia material bajo el criterio previo, o introduce regresiones. Una corrección aislada no justifica seleccionar automáticamente CLEAN por un porcentaje que depende de pocos casos.

En TEST2_017 CLEAN deja alta suficiencia (0.94), pero reparte la elección entre Arte y Motricidad; Motricidad también está aceptada en gold, y confianza 0.48 produce abstención. TEST2_039 enfrenta Escritura/Convivencia, con suficiencia 0.96 y confianza 0.46; CLEAN restituye el conector temporal, pero la salida vuelve a abstenerse. Es una sola respuesta por brazo: no se puede separar efecto del texto de variación del proveedor ni convertirlo en una ley general sobre Luna. No se simulan nuevos thresholds sobre TEST2 para escoger otro valor.

Grounding literal falló en 11 sugerencias CLEAN frente a 0 RAW. Esto mide alineación lexical de la cita, no fidelidad semántica: reescrituras correctas también pueden fallar. El campo evidence queda vacío cuando no se alinea; no cambia la clasificación.

Primarias corregidas por CLEAN: ninguna; introducidas: TEST2_017, TEST2_039. Decisiones completas mejoradas: ninguna; empeoradas: TEST2_017, TEST2_039. SAME significa misma corrección global, no necesariamente etiquetas idénticas.

## 10. Recomendación final

**Hacer prueba supervisada; no integrar automáticamente.**

Criterio previamente congelado: al menos dos primarias aceptables más que V1, falsas abstenciones no superiores, sin aumento de sobreclasificación ni secundarias incorrectas, Privacy FP/FN cero y sin fallos de proveedor. V2.4 RAW: **cumple**; V2.4 CLEAN: **no cumple**. Criterio exploratorio de decisión, no significancia estadística ni validación oficial MINEDU.

La recomendación considera efectividad, errores, ambigüedad del gold y fidelidad del input antes del costo. No se propone otra versión ni ajuste de threshold. El programa queda para revisión manual. Para integrar se necesitaría autorización posterior y validación docente; no se realizó integración.

## 11. Trazabilidad y validación

324 cuerpos guardados y verificados sin expected/gold/acceptable/ID del caso; etiquetas solo en scoring offline. Cuatro Privacy ficticios bloqueados antes de proveedores en los cuatro brazos. La validación cubre estos formatos de identificador, no sensibilidad universal. Fuentes, prompt, tarifas, gold y threshold verificadas por SHA después de TEST2.

Antes de la corrida pasaron 62/62 pruebas, lint, build y syntax/typecheck de 76 archivos JavaScript. Typecheck local es comprobación de sintaxis, no análisis TypeScript. La suite usa fetch simulado: no agrega llamadas pagadas. Los archivos nuevos quedan solo en el experimento. Commit final y comprobación de working tree se registran al cerrar.

