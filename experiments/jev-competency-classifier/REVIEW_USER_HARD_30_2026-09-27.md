# Jev: 30 situaciones difíciles × 2 métodos × 3 perfiles

Conjunto anonimizado: `datasets/user-hard-30-v1.jsonl`; SHA-256 bcfcfef2eacae52b86d546223143842823fccdb10f1f84ac374f319c8fd1cf87. Etiquetas entregadas por el usuario y **no adjudicadas de forma independiente por especialistas**. El texto enviado a Jev no incluyó las etiquetas. Modelo efectivo: typesafe/jev-1.13-20260917.

Se intentaron 180 combinaciones de caso y configuración: 180 llamadas sin caché, 0 aciertos de caché, 0 fallos; costo total aproximado US$0.03056. Las seis configuraciones reciben las mismas notas anonimizadas, sin contexto adicional ni condiciones especiales de Castellano L2 o Religión. Cada combinación se ejecutó una sola vez; no se midió variación entre repeticiones.

## Regla de comparación

Hay 25 casos con primaria indicada y 5 donde se espera abstención. En dos casos de 4 años (`hard_001` y `hard_007`) la primaria indicada `TRANS_AUTONOMO` no es seleccionable en la KB v4 para esa edad; se muestran sus respuestas, pero se excluyen de los denominadores. Así quedan 23 casos con primaria y 5 de abstención (28 evaluables). En `abstain_028`, una secundaria indicada también está fuera de edad y no se usa como verdad positiva.

Un caso con primaria cuenta como *admisible* si la propuesta contiene la primaria y ninguna etiqueta fuera del conjunto {primaria + secundarias aceptables}. No se exige proponer todas las secundarias: son plausibles, no necesariamente obligatorias ni exhaustivas. Una abstención cuenta si la propuesta está vacía. En paralelo esto significa sin propuestas ≥ umbral, aunque la interfaz puede mostrar opciones *para revisar* ≥0.50. `Top-1` usa la mayor puntuación cruda; `incluida` usa la propuesta operativa. `Extra` es propuesta fuera del conjunto permitido, no un falso positivo clínico/pedagógico confirmado.

## Seis combinaciones con política actual

Choice usa su propuesta según la política vigente; paralelo usa puntuación ≥0.80. `C` = Choice; `P` = paralelo; perfiles compact = resumen anterior, enriched = KB enriquecida y focused = criterios enfocados + suficiencia.

| Combinación | Primaria top-1 | Primaria incluida | Abstenciones correctas | Casos admisibles | Etiquetas extra | Etiquetas propuestas | Costo real aprox. |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| C-compact | 19/23 | 16/23 | 4/5 | 20/28 | 0 | 20 | $0.00325 |
| C-enriched | 19/23 | 17/23 | 4/5 | 21/28 | 0 | 21 | $0.00650 |
| C-focused | 18/23 | 17/23 | 4/5 | 21/28 | 0 | 22 | $0.00566 |
| P-compact | 13/23 | 5/23 | 5/5 | 10/28 | 0 | 7 | $0.00337 |
| P-enriched | 15/23 | 9/23 | 5/5 | 14/28 | 0 | 12 | $0.00616 |
| P-focused | 13/23 | 9/23 | 5/5 | 13/28 | 1 | 14 | $0.00564 |

## Umbrales simulados sin nuevas llamadas

Para paralelo se prueban umbrales de propuesta; para Choice se agrega la segunda candidata solo cuando la diferencia entre top-1 y top-2 es como máximo Δ. No son umbrales validados para producción.

| Combinación | Variante | Primaria incluida | Abstenciones correctas | Casos admisibles | Etiquetas extra | Etiquetas propuestas |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| P-compact | p ≥ 0.5 | 19/23 | 4/5 | 19/28 | 7 | 42 |
| P-compact | p ≥ 0.6 | 17/23 | 5/5 | 21/28 | 3 | 32 |
| P-compact | p ≥ 0.65 | 16/23 | 5/5 | 21/28 | 0 | 26 |
| P-compact | p ≥ 0.7 | 11/23 | 5/5 | 16/28 | 0 | 19 |
| P-compact | p ≥ 0.75 | 8/23 | 5/5 | 13/28 | 0 | 13 |
| P-compact | p ≥ 0.8 | 5/23 | 5/5 | 10/28 | 0 | 7 |
| P-compact | p ≥ 0.85 | 2/23 | 5/5 | 7/28 | 0 | 2 |
| P-compact | p ≥ 0.9 | 1/23 | 5/5 | 6/28 | 0 | 1 |
| P-compact | p ≥ 0.95 | 0/23 | 5/5 | 5/28 | 0 | 0 |
| P-enriched | p ≥ 0.5 | 21/23 | 4/5 | 20/28 | 9 | 48 |
| P-enriched | p ≥ 0.6 | 19/23 | 4/5 | 20/28 | 6 | 41 |
| P-enriched | p ≥ 0.65 | 19/23 | 4/5 | 20/28 | 4 | 35 |
| P-enriched | p ≥ 0.7 | 14/23 | 5/5 | 17/28 | 2 | 25 |
| P-enriched | p ≥ 0.75 | 13/23 | 5/5 | 18/28 | 0 | 21 |
| P-enriched | p ≥ 0.8 | 9/23 | 5/5 | 14/28 | 0 | 12 |
| P-enriched | p ≥ 0.85 | 7/23 | 5/5 | 12/28 | 0 | 8 |
| P-enriched | p ≥ 0.9 | 2/23 | 5/5 | 7/28 | 0 | 2 |
| P-enriched | p ≥ 0.95 | 0/23 | 5/5 | 5/28 | 0 | 0 |
| P-focused | p ≥ 0.5 | 20/23 | 4/5 | 16/28 | 13 | 53 |
| P-focused | p ≥ 0.6 | 19/23 | 4/5 | 20/28 | 7 | 43 |
| P-focused | p ≥ 0.65 | 18/23 | 4/5 | 20/28 | 5 | 34 |
| P-focused | p ≥ 0.7 | 18/23 | 4/5 | 20/28 | 4 | 32 |
| P-focused | p ≥ 0.75 | 12/23 | 4/5 | 15/28 | 2 | 23 |
| P-focused | p ≥ 0.8 | 9/23 | 5/5 | 13/28 | 1 | 14 |
| P-focused | p ≥ 0.85 | 8/23 | 5/5 | 13/28 | 0 | 9 |
| P-focused | p ≥ 0.9 | 1/23 | 5/5 | 6/28 | 0 | 1 |
| P-focused | p ≥ 0.95 | 0/23 | 5/5 | 5/28 | 0 | 0 |
| C-compact | Δ ≤ 0.05 | 16/23 | 4/5 | 20/28 | 0 | 20 |
| C-compact | Δ ≤ 0.1 | 16/23 | 4/5 | 20/28 | 0 | 20 |
| C-compact | Δ ≤ 0.15 | 16/23 | 4/5 | 20/28 | 0 | 20 |
| C-compact | Δ ≤ 0.2 | 17/23 | 4/5 | 21/28 | 0 | 21 |
| C-compact | Δ ≤ 0.25 | 17/23 | 4/5 | 21/28 | 0 | 21 |
| C-compact | Δ ≤ 0.3 | 17/23 | 4/5 | 21/28 | 0 | 21 |
| C-enriched | Δ ≤ 0.05 | 17/23 | 4/5 | 21/28 | 0 | 21 |
| C-enriched | Δ ≤ 0.1 | 17/23 | 4/5 | 21/28 | 0 | 21 |
| C-enriched | Δ ≤ 0.15 | 17/23 | 4/5 | 21/28 | 0 | 21 |
| C-enriched | Δ ≤ 0.2 | 17/23 | 4/5 | 21/28 | 0 | 22 |
| C-enriched | Δ ≤ 0.25 | 17/23 | 4/5 | 21/28 | 0 | 22 |
| C-enriched | Δ ≤ 0.3 | 17/23 | 4/5 | 21/28 | 0 | 22 |
| C-focused | Δ ≤ 0.05 | 17/23 | 4/5 | 21/28 | 0 | 22 |
| C-focused | Δ ≤ 0.1 | 17/23 | 4/5 | 21/28 | 0 | 22 |
| C-focused | Δ ≤ 0.15 | 17/23 | 4/5 | 21/28 | 0 | 22 |
| C-focused | Δ ≤ 0.2 | 17/23 | 4/5 | 21/28 | 0 | 22 |
| C-focused | Δ ≤ 0.25 | 17/23 | 4/5 | 21/28 | 0 | 22 |
| C-focused | Δ ≤ 0.3 | 17/23 | 4/5 | 21/28 | 0 | 22 |

Con la política actual empatan C-enriched y C-focused en 21/28 casos admisibles. C-enriched queda primera solo por el desempate de primarias incluidas, etiquetas extra y número total de propuestas; no hay una superioridad estadística demostrada. En el barrido, C-enriched mantiene la política actual. Varias variantes empatan en 21/28: bajar el umbral paralelo o agregar top-2 no aporta una mejora neta inequívoca aquí. Todo ajuste es retrospectivo sobre este mismo conjunto y necesita prueba con casos nuevos antes de cambiar la política.

## Resultado caso por caso con política actual

`✓` cumple la regla admisible; `×` no; `NC` no comparable por primaria no aplicable; `∅` no propone ninguna. Los códigos son IDs estables de la KB.

| Caso | Primaria de referencia | Secundarias aceptables | C-compact | C-enriched | C-focused | P-compact | P-enriched | P-focused |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hard_001 | TRANS_AUTONOMO † | PS_CONVIVE + MAT_FORMA | NC MAT_FORMA | NC MAT_FORMA | NC MAT_FORMA | NC MAT_FORMA | NC MAT_FORMA | NC MAT_FORMA |
| hard_002 | MAT_CANTIDAD | PS_CONVIVE | ✓ MAT_CANTIDAD | ✓ MAT_CANTIDAD | ✓ MAT_CANTIDAD | ✓ MAT_CANTIDAD | ✓ MAT_CANTIDAD | ✓ MAT_CANTIDAD |
| hard_003 | COM_LECTURA | COM_ESCRITURA | ✓ COM_LECTURA | ✓ COM_LECTURA | ✓ COM_LECTURA | × ∅ | ✓ COM_LECTURA | ✓ COM_LECTURA |
| hard_004 | COM_ARTE | PS_IDENTIDAD + MAT_FORMA | × ∅ | × ∅ | × ∅ | × ∅ | × ∅ | × ∅ |
| hard_005 | MAT_CANTIDAD | COM_ORAL + PS_CONVIVE | ✓ MAT_CANTIDAD | ✓ MAT_CANTIDAD | ✓ MAT_CANTIDAD | × ∅ | × COM_ORAL | × COM_ORAL |
| hard_006 | CYT_INDAGA | COM_ORAL | ✓ CYT_INDAGA | ✓ CYT_INDAGA | ✓ CYT_INDAGA | × ∅ | × ∅ | × ∅ |
| hard_007 | TRANS_AUTONOMO † | PSICO_MOTRICIDAD + PS_CONVIVE | NC PSICO_MOTRICIDAD | NC ∅ | NC PSICO_MOTRICIDAD | NC ∅ | NC ∅ | NC ∅ |
| hard_008 | MAT_FORMA | TRANS_AUTONOMO | ✓ MAT_FORMA | ✓ MAT_FORMA | ✓ MAT_FORMA | ✓ MAT_FORMA | ✓ MAT_FORMA | × MAT_FORMA + COM_ORAL |
| hard_009 | COM_LECTURA | COM_ORAL | × ∅ | × COM_ORAL | × COM_ORAL | × ∅ | × ∅ | × COM_ORAL |
| hard_010 | PS_CONVIVE | PS_IDENTIDAD + COM_ORAL | ✓ PS_CONVIVE | ✓ PS_CONVIVE | ✓ PS_CONVIVE | × COM_ORAL | ✓ COM_ORAL + PS_CONVIVE | ✓ COM_ORAL + PS_CONVIVE |
| hard_011 | CYT_INDAGA | MAT_FORMA | ✓ CYT_INDAGA | ✓ CYT_INDAGA | ✓ CYT_INDAGA | × ∅ | × ∅ | × ∅ |
| hard_012 | COM_ESCRITURA | COM_ORAL | ✓ COM_ESCRITURA | ✓ COM_ESCRITURA | ✓ COM_ESCRITURA | × ∅ | ✓ COM_ESCRITURA | × ∅ |
| hard_013 | PSICO_MOTRICIDAD | COM_ARTE | ✓ PSICO_MOTRICIDAD | ✓ PSICO_MOTRICIDAD | ✓ PSICO_MOTRICIDAD | × ∅ | × ∅ | × ∅ |
| hard_014 | TRANS_TIC | TRANS_AUTONOMO + COM_ARTE | × ∅ | × ∅ | × ∅ | × ∅ | × ∅ | × ∅ |
| hard_015 | PS_IDENTIDAD | PS_CONVIVE | × PS_CONVIVE | ✓ PS_IDENTIDAD | × PS_CONVIVE | × ∅ | × ∅ | × ∅ |
| hard_016 | COM_LECTURA | COM_ORAL + TRANS_AUTONOMO | ✓ COM_LECTURA | × ∅ | ✓ COM_LECTURA | × ∅ | × ∅ | × ∅ |
| hard_017 | MAT_CANTIDAD | CYT_INDAGA | ✓ MAT_CANTIDAD | ✓ MAT_CANTIDAD | ✓ MAT_CANTIDAD | ✓ MAT_CANTIDAD | ✓ MAT_CANTIDAD | ✓ MAT_CANTIDAD |
| hard_018 | PS_CONVIVE | MAT_FORMA + TRANS_AUTONOMO | × ∅ | ✓ PS_CONVIVE | ✓ PS_CONVIVE | × ∅ | × ∅ | × ∅ |
| hard_019 | MAT_CANTIDAD | MAT_FORMA + TRANS_AUTONOMO | × MAT_FORMA | × MAT_FORMA | × MAT_FORMA | × ∅ | × ∅ | × ∅ |
| hard_020 | COM_ARTE | TRANS_AUTONOMO | ✓ COM_ARTE | ✓ COM_ARTE | ✓ COM_ARTE | × ∅ | ✓ COM_ARTE | ✓ COM_ARTE |
| hard_021 | PS_CONVIVE | COM_ORAL | ✓ PS_CONVIVE | ✓ PS_CONVIVE | ✓ PS_CONVIVE | × ∅ | × COM_ORAL | × COM_ORAL |
| hard_022 | CYT_INDAGA | MAT_CANTIDAD | ✓ CYT_INDAGA | ✓ CYT_INDAGA | ✓ CYT_INDAGA | ✓ CYT_INDAGA | ✓ CYT_INDAGA | ✓ CYT_INDAGA |
| hard_023 | COM_ESCRITURA | MAT_CANTIDAD + TRANS_AUTONOMO | ✓ COM_ESCRITURA | ✓ COM_ESCRITURA | ✓ COM_ESCRITURA | ✓ COM_ESCRITURA | ✓ COM_ESCRITURA | ✓ COM_ESCRITURA |
| hard_024 | PSICO_MOTRICIDAD | MAT_FORMA | × MAT_FORMA | × MAT_FORMA | × MAT_FORMA | × MAT_FORMA | × ∅ | × ∅ |
| hard_025 | COM_LECTURA | COM_ESCRITURA | ✓ COM_LECTURA | ✓ COM_LECTURA | ✓ COM_LECTURA | × ∅ | × ∅ | ✓ COM_LECTURA |
| abstain_026 | ∅ | — | ✓ ∅ | ✓ ∅ | ✓ ∅ | ✓ ∅ | ✓ ∅ | ✓ ∅ |
| abstain_027 | ∅ | — | ✓ ∅ | ✓ ∅ | ✓ ∅ | ✓ ∅ | ✓ ∅ | ✓ ∅ |
| abstain_028 | ∅ | MAT_FORMA + TRANS_AUTONOMO | × MAT_FORMA | × MAT_FORMA | × MAT_FORMA | ✓ ∅ | ✓ ∅ | ✓ ∅ |
| abstain_029 | ∅ | — | ✓ ∅ | ✓ ∅ | ✓ ∅ | ✓ ∅ | ✓ ∅ | ✓ ∅ |
| abstain_030 | ∅ | — | ✓ ∅ | ✓ ∅ | ✓ ∅ | ✓ ∅ | ✓ ∅ | ✓ ∅ |

## Límites y decisión operativa

No se modificó la KB, la política de umbrales ni Ayni principal. No se debe convertir este resultado en asignación automática: las etiquetas y la completitud de las secundarias necesitan revisión docente independiente; los umbrales escogidos con estos mismos casos pueden sobreajustarse. La IA solo sugiere competencias y la docente confirma.

