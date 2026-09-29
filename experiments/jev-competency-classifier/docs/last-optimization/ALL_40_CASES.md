# TEST2 — 40 casos completos

Gold congelado SHA-256 a206defd4c8f07b9d435e977f9e4894346f07aff1f05a771f5d91e79955f058d. Una repetición, sin reajuste posterior.

| ID | Expected | V1 RAW | V2.3 RAW | V2.4 RAW | V2.4 CLEAN | CLEAN vs RAW |
|---|---|---|---|---|---|---|
| TEST2_001 | MAT_CANTIDAD | MAT_CANTIDAD | MAT_CANTIDAD | MAT_CANTIDAD | MAT_CANTIDAD | SAME |
| TEST2_002 | COM_LECTURA | COM_LECTURA | COM_LECTURA | COM_LECTURA | COM_LECTURA | SAME |
| TEST2_003 | PS_CONVIVE | PS_CONVIVE | PS_CONVIVE | PS_CONVIVE | PS_CONVIVE | SAME |
| TEST2_004 | CYT_INDAGA | CYT_INDAGA | CYT_INDAGA | CYT_INDAGA | CYT_INDAGA | SAME |
| TEST2_005 | MAT_FORMA | MAT_FORMA | MAT_FORMA | MAT_FORMA | MAT_FORMA | SAME |
| TEST2_006 | COM_ESCRITURA | COM_ESCRITURA | COM_ESCRITURA | COM_ESCRITURA | COM_ESCRITURA | SAME |
| TEST2_007 | COM_ORAL | COM_ORAL | COM_ORAL | COM_ORAL | COM_ORAL | SAME |
| TEST2_008 | COM_ARTE | COM_ARTE | COM_ARTE | COM_ARTE | COM_ARTE | SAME |
| TEST2_009 | PSICO_MOTRICIDAD | PSICO_MOTRICIDAD | PSICO_MOTRICIDAD | PSICO_MOTRICIDAD | PSICO_MOTRICIDAD | SAME |
| TEST2_010 | ABSTAIN | ABSTAIN | ABSTAIN | ABSTAIN | ABSTAIN | SAME |
| TEST2_011 | MAT_CANTIDAD | MAT_CANTIDAD | MAT_CANTIDAD | MAT_CANTIDAD | MAT_CANTIDAD | SAME |
| TEST2_012 | MAT_FORMA | MAT_FORMA | MAT_FORMA | MAT_FORMA | MAT_FORMA | SAME |
| TEST2_013 | COM_ORAL | COM_ORAL | COM_ORAL | COM_ORAL | COM_ORAL | SAME |
| TEST2_014 | CYT_INDAGA | CYT_INDAGA | CYT_INDAGA | CYT_INDAGA | CYT_INDAGA | SAME |
| TEST2_015 | PS_CONVIVE | PS_CONVIVE | PS_CONVIVE | PS_CONVIVE | PS_CONVIVE | SAME |
| TEST2_016 | COM_ESCRITURA | COM_ESCRITURA | COM_ESCRITURA | COM_ESCRITURA | COM_ESCRITURA | SAME |
| TEST2_017 | COM_ARTE | PSICO_MOTRICIDAD + MAT_FORMA | COM_ARTE | COM_ARTE | ABSTAIN | WORSENED |
| TEST2_018 | PSICO_MOTRICIDAD | PSICO_MOTRICIDAD | PSICO_MOTRICIDAD | PSICO_MOTRICIDAD | PSICO_MOTRICIDAD | SAME |
| TEST2_019 | ABSTAIN | ABSTAIN | ABSTAIN | ABSTAIN | ABSTAIN | SAME |
| TEST2_020 | ABSTAIN | ABSTAIN | ABSTAIN | ABSTAIN | ABSTAIN | SAME |
| TEST2_021 | PRIVACY | PRIVACY | PRIVACY | PRIVACY | PRIVACY | SAME |
| TEST2_022 | MAT_CANTIDAD | MAT_CANTIDAD | MAT_CANTIDAD | MAT_CANTIDAD | MAT_CANTIDAD | SAME |
| TEST2_023 | COM_LECTURA | COM_LECTURA | COM_LECTURA | COM_LECTURA | COM_LECTURA | SAME |
| TEST2_024 | CYT_INDAGA | CYT_INDAGA | CYT_INDAGA | CYT_INDAGA | CYT_INDAGA | SAME |
| TEST2_025 | PS_CONVIVE | PS_CONVIVE | PS_CONVIVE | PS_CONVIVE | PS_CONVIVE | SAME |
| TEST2_026 | MAT_FORMA | MAT_FORMA | MAT_FORMA | MAT_FORMA | MAT_FORMA | SAME |
| TEST2_027 | COM_ESCRITURA | COM_LECTURA | COM_ESCRITURA | COM_ESCRITURA | COM_ESCRITURA | SAME |
| TEST2_028 | COM_ARTE | CYT_INDAGA | COM_ARTE | COM_ARTE | COM_ARTE | SAME |
| TEST2_029 | PSICO_MOTRICIDAD | PSICO_MOTRICIDAD | PSICO_MOTRICIDAD | PSICO_MOTRICIDAD | PSICO_MOTRICIDAD | SAME |
| TEST2_030 | ABSTAIN | ABSTAIN | ABSTAIN | ABSTAIN | ABSTAIN | SAME |
| TEST2_031 | ABSTAIN | ABSTAIN | ABSTAIN | ABSTAIN | ABSTAIN | SAME |
| TEST2_032 | ABSTAIN | ABSTAIN | ABSTAIN | ABSTAIN | ABSTAIN | SAME |
| TEST2_033 | ABSTAIN | ABSTAIN | ABSTAIN | ABSTAIN | ABSTAIN | SAME |
| TEST2_034 | ABSTAIN | ABSTAIN | ABSTAIN | ABSTAIN | ABSTAIN | SAME |
| TEST2_035 | PRIVACY | PRIVACY | PRIVACY | PRIVACY | PRIVACY | SAME |
| TEST2_036 | PRIVACY | PRIVACY | PRIVACY | PRIVACY | PRIVACY | SAME |
| TEST2_037 | PRIVACY | PRIVACY | PRIVACY | PRIVACY | PRIVACY | SAME |
| TEST2_038 | MAT_CANTIDAD + COM_ORAL | MAT_CANTIDAD | MAT_CANTIDAD + COM_ORAL | MAT_CANTIDAD | MAT_CANTIDAD | SAME |
| TEST2_039 | COM_ESCRITURA + PS_CONVIVE | PS_CONVIVE | ABSTAIN | COM_ESCRITURA + PS_CONVIVE | ABSTAIN | WORSENED |
| TEST2_040 | COM_ARTE | COM_ARTE + MAT_FORMA | MAT_FORMA | MAT_FORMA | MAT_FORMA | SAME |

## TEST2_001

Original: Eh, en la mesa de merienda de juego había platos, puso una tapita en cada uno y al final dijo falta acá. No recuerdo cuántos platos, el mantel estaba mojado.

Anonimizada: Eh, en la mesa de merienda de juego había platos, puso una tapita en cada uno y al final dijo falta acá. No recuerdo cuántos platos, el mantel estaba mojado.

CLEAN: En la mesa de merienda de juego había platos. Puso una tapita en cada uno y, al final, dijo: «Falta acá». No recuerdo cuántos platos había; el mantel estaba mojado.

Gold:
```json
{
  "primary": "MAT_CANTIDAD",
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": false,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: MAT_CANTIDAD (review). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 0.95; suficiencia: 0.83. Costo US$0.00022344; latencia 632 ms.

### CURRENT_V2_RAW

Final: MAT_CANTIDAD (review). Errores: ninguno.

Evidence seleccionada: Eh, en la mesa de merienda de juego había platos, puso una tapita en cada uno y al final dijo falta acá.

Evidence grounded: Eh, en la mesa de merienda de juego había platos, puso una tapita en cada uno y al final dijo falta acá.. Reason: Acción central: Resuelve problemas de cantidad; confianza 0.97, suficiencia 0.87.

Confianza: 0.97; suficiencia: 0.87. Costo US$0.00032605; latencia 359 ms.

### CURRENT_V2_4_RAW

Final: MAT_CANTIDAD (review). Errores: ninguno.

Evidence seleccionada: Eh, en la mesa de merienda de juego había platos, puso una tapita en cada uno y al final dijo falta acá.

Evidence grounded: Eh, en la mesa de merienda de juego había platos, puso una tapita en cada uno y al final dijo falta acá.. Reason: Acción central: Resuelve problemas de cantidad; confianza 0.97, suficiencia 0.86.

Confianza: 0.97; suficiencia: 0.86. Costo US$0.00045818; latencia 409 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: MAT_CANTIDAD (review). Errores: ninguno.

Evidence seleccionada: Puso una tapita en cada uno y, al final, dijo: «Falta acá».

Evidence grounded: Eh, en la mesa de merienda de juego había platos, puso una tapita en cada uno y al final dijo falta acá. Reason: Acción central: Resuelve problemas de cantidad; confianza 0.91, suficiencia 0.84.

Confianza: 0.91; suficiencia: 0.84. Costo US$0.00055082; latencia 3994 ms.

## TEST2_002

Original: Agarró el librito, el nuevo, no el que contamos ayer. Mirando el dibujo de la niña con botas dijo seguro va a salir a la lluvia. Yo todavía no había leído esa página.

Anonimizada: [persona] el librito, el nuevo, no el que contamos ayer. [persona] el dibujo de la niña con botas dijo seguro va a salir a la lluvia. Yo todavía no había leído esa página.

CLEAN: [persona]: «El librito, el nuevo, no el que contamos ayer». [persona] dijo: «Seguro va a salir a la lluvia», sobre el dibujo de la niña con botas. Yo todavía no había leído esa página.

Gold:
```json
{
  "primary": "COM_LECTURA",
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": false,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: COM_LECTURA (review). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 0.92; suficiencia: 0.74. Costo US$0.00022361; latencia 323 ms.

### CURRENT_V2_RAW

Final: COM_LECTURA (review). Errores: ninguno.

Evidence seleccionada: [persona] el dibujo de la niña con botas dijo seguro va a salir a la lluvia.

Evidence grounded: Mirando el dibujo de la niña con botas dijo seguro va a salir a la lluvia. Reason: Acción central: Lee diversos tipos de textos escritos en su lengua materna; confianza 0.95, suficiencia 0.84.

Confianza: 0.95; suficiencia: 0.84. Costo US$0.00032689; latencia 478 ms.

### CURRENT_V2_4_RAW

Final: COM_LECTURA (review). Errores: ninguno.

Evidence seleccionada: [persona] el dibujo de la niña con botas dijo seguro va a salir a la lluvia.

Evidence grounded: Mirando el dibujo de la niña con botas dijo seguro va a salir a la lluvia. Reason: Acción central: Lee diversos tipos de textos escritos en su lengua materna; confianza 0.97, suficiencia 0.83.

Confianza: 0.97; suficiencia: 0.83. Costo US$0.00045902; latencia 406 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: COM_LECTURA (review). Errores: ninguno.

Evidence seleccionada: [persona] dijo: «Seguro va a salir a la lluvia», sobre el dibujo de la niña con botas.

Evidence grounded: . Reason: Acción central: Lee diversos tipos de textos escritos en su lengua materna; confianza 0.94, suficiencia 0.78.

Confianza: 0.94; suficiencia: 0.78. Costo US$0.00062407; latencia 4184 ms.

## TEST2_003

Original: Dos querían el mismo colador. Ella dijo tú llenas y después yo, le pasó el colador y esperó; después no vi si se lo devolvieron. Había bastante ruido.

Anonimizada: [persona] querían el mismo colador. [persona] dijo tú llenas y después yo, le pasó el colador y esperó; después no vi si se lo devolvieron. [persona] bastante ruido.

CLEAN: [persona] quería el mismo colador. [persona] dijo: «Tú llenas y después yo», le pasó el colador y esperó. Después no vi si se lo devolvieron. [persona] hizo bastante ruido.

Gold:
```json
{
  "primary": "PS_CONVIVE",
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": false,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: PS_CONVIVE (review). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 0.87; suficiencia: 0.77. Costo US$0.00022403; latencia 364 ms.

### CURRENT_V2_RAW

Final: PS_CONVIVE (review). Errores: ninguno.

Evidence seleccionada: [persona] dijo tú llenas y después yo, le pasó el colador y esperó;

Evidence grounded: Ella dijo tú llenas y después yo, le pasó el colador y esperó. Reason: Acción central: Convive y participa democráticamente en la búsqueda del bien común; confianza 0.97, suficiencia 0.89.

Confianza: 0.97; suficiencia: 0.89. Costo US$0.00032815; latencia 341 ms.

### CURRENT_V2_4_RAW

Final: PS_CONVIVE (review). Errores: ninguno.

Evidence seleccionada: [persona] dijo tú llenas y después yo, le pasó el colador y esperó;

Evidence grounded: Ella dijo tú llenas y después yo, le pasó el colador y esperó. Reason: Acción central: Convive y participa democráticamente en la búsqueda del bien común; confianza 0.99, suficiencia 0.86.

Confianza: 0.99; suficiencia: 0.86. Costo US$0.00046028; latencia 377 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: PS_CONVIVE (review). Errores: ninguno.

Evidence seleccionada: [persona] dijo: «Tú llenas y después yo», le pasó el colador y esperó.

Evidence grounded: Ella dijo tú llenas y después yo, le pasó el colador y esperó. Reason: Acción central: Convive y participa democráticamente en la búsqueda del bien común; confianza 0.98, suficiencia 0.88.

Confianza: 0.98; suficiencia: 0.88. Costo US$0.00058513; latencia 3344 ms.

## TEST2_004

Original: Eh, vio gotas debajo del vaso, decía se sale por aquí. Lo secó y volvió a poner agua, lo giró para mirar el fondo; señaló una rayita mojada. No sé si era rajadura.

Anonimizada: Eh, vio gotas debajo del vaso, decía se sale por aquí. Lo secó y volvió a poner agua, lo giró para mirar el fondo; señaló una rayita mojada. No sé si era rajadura.

CLEAN: Vio gotas debajo del vaso y dijo: «Se sale por aquí». Lo secó y volvió a poner agua. Giró el vaso para mirar el fondo y señaló una rayita mojada. No sé si era una rajadura.

Gold:
```json
{
  "primary": "CYT_INDAGA",
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": false,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: CYT_INDAGA (review). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 0.99; suficiencia: 0.88. Costo US$0.00022386; latencia 351 ms.

### CURRENT_V2_RAW

Final: CYT_INDAGA (review). Errores: ninguno.

Evidence seleccionada: Lo secó y volvió a poner agua, lo giró para mirar el fondo;

Evidence grounded: Lo secó y volvió a poner agua, lo giró para mirar el fondo;. Reason: Acción central: Indaga mediante métodos científicos para construir sus conocimientos; confianza 0.96, suficiencia 0.92.

Confianza: 0.96; suficiencia: 0.92. Costo US$0.00032781; latencia 329 ms.

### CURRENT_V2_4_RAW

Final: CYT_INDAGA (review). Errores: ninguno.

Evidence seleccionada: Lo secó y volvió a poner agua, lo giró para mirar el fondo;

Evidence grounded: Lo secó y volvió a poner agua, lo giró para mirar el fondo;. Reason: Acción central: Indaga mediante métodos científicos para construir sus conocimientos; confianza 1.00, suficiencia 0.94.

Confianza: 1; suficiencia: 0.94. Costo US$0.00045994; latencia 338 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: CYT_INDAGA (review). Errores: ninguno.

Evidence seleccionada: Vio gotas debajo del vaso y dijo: «Se sale por aquí».

Evidence grounded: . Reason: Acción central: Indaga mediante métodos científicos para construir sus conocimientos; confianza 1.00, suficiencia 0.95.

Confianza: 1; suficiencia: 0.95. Costo US$0.00051619; latencia 2473 ms.

## TEST2_005

Original: Puso las piezas alrededor del corral y dejó una abertura. Me dijo por acá entra el caballo, no por arriba, y lo hizo pasar por ese hueco. Se cayó una pieza, eso después.

Anonimizada: Puso las piezas alrededor del corral y dejó una abertura. Me dijo por acá entra el caballo, no por arriba, y lo hizo pasar por ese hueco. Se cayó una pieza, eso después.

CLEAN: Puso las piezas alrededor del corral y dejó una abertura. Me dijo: «Por acá entra el caballo, no por arriba», y lo hizo pasar por ese hueco. Después, se cayó una pieza.

Gold:
```json
{
  "primary": "MAT_FORMA",
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": false,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: MAT_FORMA (review). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 0.99; suficiencia: 0.92. Costo US$0.00022344; latencia 397 ms.

### CURRENT_V2_RAW

Final: MAT_FORMA (review). Errores: ninguno.

Evidence seleccionada: Me dijo por acá entra el caballo, no por arriba, y lo hizo pasar por ese hueco.

Evidence grounded: Me dijo por acá entra el caballo, no por arriba, y lo hizo pasar por ese hueco.. Reason: Acción central: Resuelve problemas de forma, movimiento y localización; confianza 0.99, suficiencia 0.93.

Confianza: 0.99; suficiencia: 0.93. Costo US$0.00032655; latencia 372 ms.

### CURRENT_V2_4_RAW

Final: MAT_FORMA (review). Errores: ninguno.

Evidence seleccionada: Me dijo por acá entra el caballo, no por arriba, y lo hizo pasar por ese hueco.

Evidence grounded: Me dijo por acá entra el caballo, no por arriba, y lo hizo pasar por ese hueco.. Reason: Acción central: Resuelve problemas de forma, movimiento y localización; confianza 0.99, suficiencia 0.94.

Confianza: 0.99; suficiencia: 0.94. Costo US$0.00045868; latencia 378 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: MAT_FORMA (review). Errores: ninguno.

Evidence seleccionada: Me dijo: «Por acá entra el caballo, no por arriba», y lo hizo pasar por ese hueco.

Evidence grounded: Me dijo por acá entra el caballo, no por arriba, y lo hizo pasar por ese hueco. Reason: Acción central: Resuelve problemas de forma, movimiento y localización; confianza 0.99, suficiencia 0.95.

Confianza: 0.99; suficiencia: 0.95. Costo US$0.00055759; latencia 3704 ms.

## TEST2_006

Original: En una tira hizo palitos y dos curvas, dijo esto dice no tocar, para que no me desarmen. La pegó en su construcción. Creo que quería poner una letra, no vi cuál.

Anonimizada: En una tira hizo palitos y dos curvas, dijo esto dice no tocar, para que no me desarmen. La pegó en su construcción. Creo que quería poner una letra, no vi cuál.

CLEAN: En una tira hizo palitos y dos curvas. Dijo: «Esto dice “no tocar”, para que no me desarmen». La pegó en su construcción. Creo que quería poner una letra; no vi cuál.

Gold:
```json
{
  "primary": "COM_ESCRITURA",
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": false,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: COM_ESCRITURA (review). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 0.74; suficiencia: 0.84. Costo US$0.00022352; latencia 366 ms.

### CURRENT_V2_RAW

Final: COM_ESCRITURA (review). Errores: ninguno.

Evidence seleccionada: En una tira hizo palitos y dos curvas, dijo esto dice no tocar, para que no me desarmen.

Evidence grounded: En una tira hizo palitos y dos curvas, dijo esto dice no tocar, para que no me desarmen.. Reason: Acción central: Escribe diversos tipos de textos en su lengua materna; confianza 0.94, suficiencia 0.93.

Confianza: 0.94; suficiencia: 0.93. Costo US$0.00032668; latencia 295 ms.

### CURRENT_V2_4_RAW

Final: COM_ESCRITURA (review). Errores: ninguno.

Evidence seleccionada: En una tira hizo palitos y dos curvas, dijo esto dice no tocar, para que no me desarmen.

Evidence grounded: En una tira hizo palitos y dos curvas, dijo esto dice no tocar, para que no me desarmen.. Reason: Acción central: Escribe diversos tipos de textos en su lengua materna; confianza 0.95, suficiencia 0.92.

Confianza: 0.95; suficiencia: 0.92. Costo US$0.00045881; latencia 363 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: COM_ESCRITURA (review). Errores: ninguno.

Evidence seleccionada: Dijo: «Esto dice “no tocar”, para que no me desarmen».

Evidence grounded: En una tira hizo palitos y dos curvas, dijo esto dice no tocar, para que no me desarmen. Reason: Acción central: Escribe diversos tipos de textos en su lengua materna; confianza 0.99, suficiencia 0.94.

Confianza: 0.99; suficiencia: 0.94. Costo US$0.00051442; latencia 2349 ms.

## TEST2_007

Original: Me contó que su mamá se olvidó la bolsa y tuvieron que volver, no, primero fueron a la tienda y después a la casa. Lo corrigió cuando le pregunté cómo había sido. No había fotos.

Anonimizada: Me contó que su mamá se olvidó la bolsa y tuvieron que volver, no, primero fueron a la tienda y después a la casa. Lo corrigió cuando le pregunté cómo había sido. No había fotos.

CLEAN: Me contó que su mamá se olvidó la bolsa y tuvieron que volver. Cuando le pregunté cómo había sido, corrigió el relato: primero fueron a la tienda y después a la casa. No había fotos.

Gold:
```json
{
  "primary": "COM_ORAL",
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": false,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: COM_ORAL (review). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 0.96; suficiencia: 0.77. Costo US$0.00022378; latencia 354 ms.

### CURRENT_V2_RAW

Final: COM_ORAL (review). Errores: ninguno.

Evidence seleccionada: Me contó que su mamá se olvidó la bolsa y tuvieron que volver, no, primero fueron a la tienda y después a la casa.

Evidence grounded: Me contó que su mamá se olvidó la bolsa y tuvieron que volver, no, primero fueron a la tienda y después a la casa.. Reason: Acción central: Se comunica oralmente en su lengua materna; confianza 0.99, suficiencia 0.85.

Confianza: 0.99; suficiencia: 0.85. Costo US$0.00032705; latencia 360 ms.

### CURRENT_V2_4_RAW

Final: COM_ORAL (review). Errores: ninguno.

Evidence seleccionada: Me contó que su mamá se olvidó la bolsa y tuvieron que volver, no, primero fueron a la tienda y después a la casa.

Evidence grounded: Me contó que su mamá se olvidó la bolsa y tuvieron que volver, no, primero fueron a la tienda y después a la casa.. Reason: Acción central: Se comunica oralmente en su lengua materna; confianza 0.99, suficiencia 0.79.

Confianza: 0.99; suficiencia: 0.79. Costo US$0.00045919; latencia 375 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: COM_ORAL (review). Errores: ninguno.

Evidence seleccionada: Cuando le pregunté cómo había sido, corrigió el relato: primero fueron a la tienda y después a la casa.

Evidence grounded: . Reason: Acción central: Se comunica oralmente en su lengua materna; confianza 0.99, suficiencia 0.83.

Confianza: 0.99; suficiencia: 0.83. Costo US$0.00057649; latencia 3125 ms.

## TEST2_008

Original: Estaba con dos colores, decía acá está el viento, y movía las rayas a un lado y al otro en el papel. Cambió a azul porque así se veía más frío. No sé si el dibujo estaba terminado.

Anonimizada: [persona] con dos colores, decía acá está el viento, y movía las rayas a un lado y al otro en el papel. [persona] a azul porque así se veía más frío. No sé si el dibujo estaba terminado.

CLEAN: [persona] usó dos colores y decía: «Acá está el viento», mientras movía las rayas de un lado al otro en el papel. [persona] a azul porque así se veía más frío. No sé si el dibujo estaba terminado.

Gold:
```json
{
  "primary": "COM_ARTE",
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": false,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: COM_ARTE (review). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 0.97; suficiencia: 0.84. Costo US$0.00022411; latencia 291 ms.

### CURRENT_V2_RAW

Final: COM_ARTE (review). Errores: ninguno.

Evidence seleccionada: [persona] con dos colores, decía acá está el viento, y movía las rayas a un lado y al otro en el papel.

Evidence grounded: Estaba con dos colores, decía acá está el viento, y movía las rayas a un lado y al otro en el papel. Reason: Acción central: Crea proyectos desde los lenguajes artísticos; confianza 0.99, suficiencia 0.92.

Confianza: 0.99; suficiencia: 0.92. Costo US$0.00032764; latencia 355 ms.

### CURRENT_V2_4_RAW

Final: COM_ARTE (review). Errores: ninguno.

Evidence seleccionada: [persona] con dos colores, decía acá está el viento, y movía las rayas a un lado y al otro en el papel.

Evidence grounded: Estaba con dos colores, decía acá está el viento, y movía las rayas a un lado y al otro en el papel. Reason: Acción central: Crea proyectos desde los lenguajes artísticos; confianza 0.95, suficiencia 0.92.

Confianza: 0.95; suficiencia: 0.92. Costo US$0.00045977; latencia 311 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: COM_ARTE (review). Errores: ninguno.

Evidence seleccionada: [persona] usó dos colores y decía: «Acá está el viento», mientras movía las rayas de un lado al otro en el papel.

Evidence grounded: . Reason: Acción central: Crea proyectos desde los lenguajes artísticos; confianza 1.00, suficiencia 0.94.

Confianza: 1; suficiencia: 0.94. Costo US$0.00061055; latencia 3616 ms.

## TEST2_009

Original: Se subió al banco bajito y abrió los brazos; iba ladeándose, paró, puso los pies más separados y siguió sin bajarse. La campana sonó ahí, pero no fue lo que estaba mirando.

Anonimizada: Se subió al banco bajito y abrió los brazos; iba ladeándose, paró, puso los pies más separados y siguió sin bajarse. La campana sonó ahí, pero no fue lo que estaba mirando.

CLEAN: Se subió al banco bajito y abrió los brazos. Iba ladeándose, se detuvo, separó más los pies y siguió sin bajarse. La campana sonó en ese momento, pero no era lo que estaba mirando.

Gold:
```json
{
  "primary": "PSICO_MOTRICIDAD",
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": false,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: PSICO_MOTRICIDAD (review). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 0.95; suficiencia: 0.91. Costo US$0.00022428; latencia 427 ms.

### CURRENT_V2_RAW

Final: PSICO_MOTRICIDAD (review). Errores: ninguno.

Evidence seleccionada: iba ladeándose, paró, puso los pies más separados y siguió sin bajarse.

Evidence grounded: iba ladeándose, paró, puso los pies más separados y siguió sin bajarse.. Reason: Acción central: Se desenvuelve de manera autónoma a través de su motricidad; confianza 1.00, suficiencia 0.93.

Confianza: 1; suficiencia: 0.93. Costo US$0.00032781; latencia 335 ms.

### CURRENT_V2_4_RAW

Final: PSICO_MOTRICIDAD (review). Errores: ninguno.

Evidence seleccionada: iba ladeándose, paró, puso los pies más separados y siguió sin bajarse.

Evidence grounded: iba ladeándose, paró, puso los pies más separados y siguió sin bajarse.. Reason: Acción central: Se desenvuelve de manera autónoma a través de su motricidad; confianza 1.00, suficiencia 0.92.

Confianza: 1; suficiencia: 0.92. Costo US$0.00045994; latencia 491 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: PSICO_MOTRICIDAD (review). Errores: ninguno.

Evidence seleccionada: Iba ladeándose, se detuvo, separó más los pies y siguió sin bajarse.

Evidence grounded: . Reason: Acción central: Se desenvuelve de manera autónoma a través de su motricidad; confianza 1.00, suficiencia 0.91.

Confianza: 1; suficiencia: 0.91. Costo US$0.00051742; latencia 1840 ms.

## TEST2_010

Original: Después del recreo estuvo con la cabeza en la mesa, bostezó varias veces. Le ofrecí el cuento pero siguió así, creo que tenía sueño. No escuché que dijera nada más.

Anonimizada: Después del recreo estuvo con la cabeza en la mesa, bostezó varias veces. Le ofrecí el cuento pero siguió así, creo que tenía sueño. No escuché que dijera nada más.

CLEAN: Después del recreo, estuvo con la cabeza sobre la mesa y bostezó varias veces. Le ofrecí el cuento, pero siguió así. Creo que tenía sueño. No escuché que dijera nada más.

Gold:
```json
{
  "primary": null,
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": true,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: ABSTAIN (unclassified). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 0.92; suficiencia: 0.76. Costo US$0.00022378; latencia 343 ms.

### CURRENT_V2_RAW

Final: ABSTAIN (unclassified). Errores: ninguno.

Evidence seleccionada: Después del recreo estuvo con la cabeza en la mesa, bostezó varias veces.

Evidence grounded: Después del recreo estuvo con la cabeza en la mesa, bostezó varias veces.. Reason: Abstención: elección NO_CLASIFICABLE, confianza 1.00 (mínimo 0.50), suficiencia 0.09 (mínimo 0.70).

Confianza: 1; suficiencia: 0.09. Costo US$0.00032714; latencia 330 ms.

### CURRENT_V2_4_RAW

Final: ABSTAIN (unclassified). Errores: ninguno.

Evidence seleccionada: Después del recreo estuvo con la cabeza en la mesa, bostezó varias veces.

Evidence grounded: Después del recreo estuvo con la cabeza en la mesa, bostezó varias veces.. Reason: Abstención: elección NO_CLASIFICABLE, confianza 1.00 (mínimo 0.50), suficiencia 0.09 (mínimo 0.70).

Confianza: 1; suficiencia: 0.09. Costo US$0.00045927; latencia 309 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: ABSTAIN (unclassified). Errores: ninguno.

Evidence seleccionada: Después del recreo, estuvo con la cabeza sobre la mesa y bostezó varias veces.

Evidence grounded: . Reason: Abstención: elección NO_CLASIFICABLE, confianza 1.00 (mínimo 0.50), suficiencia 0.09 (mínimo 0.70).

Confianza: 1; suficiencia: 0.09. Costo US$0.00053723; latencia 3372 ms.

## TEST2_011

Original: Su abuela le había dado botones para jugar, eso contó al llegar. En la mesa los juntó de dos en dos, dijo acá hay lo mismo y señaló uno que quedó solo. No sé el total.

Anonimizada: Su abuela le había dado botones para jugar, eso contó al llegar. En la mesa los juntó de dos en dos, dijo acá hay lo mismo y señaló uno que quedó solo. No sé el total.

CLEAN: Al llegar, contó que su abuela le había dado botones para jugar. En la mesa, los juntó de dos en dos, dijo: «Acá hay lo mismo» y señaló uno que quedó solo. No sé el total.

Gold:
```json
{
  "primary": "MAT_CANTIDAD",
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": false,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: MAT_CANTIDAD (review). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 1; suficiencia: 0.9. Costo US$0.00022361; latencia 337 ms.

### CURRENT_V2_RAW

Final: MAT_CANTIDAD (review). Errores: ninguno.

Evidence seleccionada: En la mesa los juntó de dos en dos, dijo acá hay lo mismo y señaló uno que quedó solo.

Evidence grounded: En la mesa los juntó de dos en dos, dijo acá hay lo mismo y señaló uno que quedó solo.. Reason: Acción central: Resuelve problemas de cantidad; confianza 0.99, suficiencia 0.94.

Confianza: 0.99; suficiencia: 0.94. Costo US$0.00032680; latencia 398 ms.

### CURRENT_V2_4_RAW

Final: MAT_CANTIDAD (review). Errores: ninguno.

Evidence seleccionada: En la mesa los juntó de dos en dos, dijo acá hay lo mismo y señaló uno que quedó solo.

Evidence grounded: En la mesa los juntó de dos en dos, dijo acá hay lo mismo y señaló uno que quedó solo.. Reason: Acción central: Resuelve problemas de cantidad; confianza 0.99, suficiencia 0.94.

Confianza: 0.99; suficiencia: 0.94. Costo US$0.00045893; latencia 413 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: MAT_CANTIDAD (review). Errores: ninguno.

Evidence seleccionada: En la mesa, los juntó de dos en dos, dijo: «Acá hay lo mismo» y señaló uno que quedó solo.

Evidence grounded: En la mesa los juntó de dos en dos, dijo acá hay lo mismo y señaló uno que quedó solo. Reason: Acción central: Resuelve problemas de cantidad; confianza 0.99, suficiencia 0.95.

Confianza: 0.99; suficiencia: 0.95. Costo US$0.00051536; latencia 3089 ms.

## TEST2_012

Original: Miró el hueco de la caja, metió una pieza y no entraba. La giró, dijo las puntas tienen que ir para este lado; después entró. Era un encaje, no estábamos probando qué material aguanta.

Anonimizada: Miró el hueco de la caja, metió una pieza y no entraba. La giró, dijo las puntas tienen que ir para este lado; después entró. [persona] un encaje, no estábamos probando qué material aguanta.

CLEAN: Miró el hueco de la caja, metió una pieza y no entraba. La giró y dijo: «Las puntas tienen que ir para este lado». Después entró. [Persona] un encaje; no estábamos probando qué material aguanta.

Gold:
```json
{
  "primary": "MAT_FORMA",
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": false,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: MAT_FORMA (review). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 0.99; suficiencia: 0.91. Costo US$0.00022462; latencia 333 ms.

### CURRENT_V2_RAW

Final: MAT_FORMA (review). Errores: ninguno.

Evidence seleccionada: La giró, dijo las puntas tienen que ir para este lado;

Evidence grounded: La giró, dijo las puntas tienen que ir para este lado;. Reason: Acción central: Resuelve problemas de forma, movimiento y localización; confianza 0.95, suficiencia 0.94.

Confianza: 0.95; suficiencia: 0.94. Costo US$0.00032894; latencia 311 ms.

### CURRENT_V2_4_RAW

Final: MAT_FORMA (review). Errores: ninguno.

Evidence seleccionada: La giró, dijo las puntas tienen que ir para este lado;

Evidence grounded: La giró, dijo las puntas tienen que ir para este lado;. Reason: Acción central: Resuelve problemas de forma, movimiento y localización; confianza 0.91, suficiencia 0.95.

Confianza: 0.91; suficiencia: 0.95. Costo US$0.00046108; latencia 359 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: MAT_FORMA (review). Errores: ninguno.

Evidence seleccionada: La giró y dijo: «Las puntas tienen que ir para este lado».

Evidence grounded: La giró, dijo las puntas tienen que ir para este lado. Reason: Acción central: Resuelve problemas de forma, movimiento y localización; confianza 0.87, suficiencia 0.95.

Confianza: 0.87; suficiencia: 0.95. Costo US$0.00052273; latencia 2097 ms.

## TEST2_013

Original: Con el álbum cerrado en las piernas contó cómo el personaje se perdió. No sé si se acordaba o inventaba, pero respondió cuando le preguntaron dónde volvió a encontrar a su amigo; no abrió el álbum.

Anonimizada: [persona] el álbum cerrado en las piernas contó cómo el personaje se perdió. No sé si se acordaba o inventaba, pero respondió cuando le preguntaron dónde volvió a encontrar a su amigo; no abrió el álbum.

CLEAN: Con el álbum cerrado en las piernas, contó cómo el personaje se perdió. No sé si se acordaba o inventaba, pero respondió cuando le preguntaron dónde volvió a encontrar a su amigo. No abrió el álbum.

Gold:
```json
{
  "primary": "COM_ORAL",
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": false,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: COM_ORAL (review). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 0.92; suficiencia: 0.79. Costo US$0.00022394; latencia 313 ms.

### CURRENT_V2_RAW

Final: COM_ORAL (review). Errores: ninguno.

Evidence seleccionada: [persona] el álbum cerrado en las piernas contó cómo el personaje se perdió.

Evidence grounded: Con el álbum cerrado en las piernas contó cómo el personaje se perdió. Reason: Acción central: Se comunica oralmente en su lengua materna; confianza 0.96, suficiencia 0.88.

Confianza: 0.96; suficiencia: 0.88. Costo US$0.00032735; latencia 365 ms.

### CURRENT_V2_4_RAW

Final: COM_ORAL (review). Errores: ninguno.

Evidence seleccionada: [persona] el álbum cerrado en las piernas contó cómo el personaje se perdió.

Evidence grounded: Con el álbum cerrado en las piernas contó cómo el personaje se perdió. Reason: Acción central: Se comunica oralmente en su lengua materna; confianza 0.98, suficiencia 0.84.

Confianza: 0.98; suficiencia: 0.84. Costo US$0.00045948; latencia 501 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: COM_ORAL (review). Errores: ninguno.

Evidence seleccionada: Con el álbum cerrado en las piernas, contó cómo el personaje se perdió.

Evidence grounded: Con el álbum cerrado en las piernas contó cómo el personaje se perdió. Reason: Acción central: Se comunica oralmente en su lengua materna; confianza 0.99, suficiencia 0.88.

Confianza: 0.99; suficiencia: 0.88. Costo US$0.00051331; latencia 2075 ms.

## TEST2_014

Original: Dijo que la arena seca pasaría más rápido, llenó dos embudos, uno con arena mojada y otro seca. Miró cuál salía, luego levantó el que se había trabado para ver por abajo. Se manchó el mandil.

Anonimizada: Dijo que la arena seca pasaría más rápido, llenó dos embudos, uno con arena mojada y otro seca. Miró cuál salía, luego levantó el que se había trabado para ver por abajo. Se manchó el mandil.

CLEAN: Dijo que la arena seca pasaría más rápido. Llenó dos embudos, uno con arena mojada y otro con arena seca. Miró cuál salía y luego levantó el embudo que se había trabado para mirar por debajo. Se manchó el mandil.

Gold:
```json
{
  "primary": "CYT_INDAGA",
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": false,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: CYT_INDAGA (review). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 1; suficiencia: 0.91. Costo US$0.00022462; latencia 352 ms.

### CURRENT_V2_RAW

Final: CYT_INDAGA (review). Errores: ninguno.

Evidence seleccionada: Miró cuál salía, luego levantó el que se había trabado para ver por abajo.

Evidence grounded: Miró cuál salía, luego levantó el que se había trabado para ver por abajo.. Reason: Acción central: Indaga mediante métodos científicos para construir sus conocimientos; confianza 1.00, suficiencia 0.95.

Confianza: 1; suficiencia: 0.95. Costo US$0.00032831; latencia 371 ms.

### CURRENT_V2_4_RAW

Final: CYT_INDAGA (review). Errores: ninguno.

Evidence seleccionada: Miró cuál salía, luego levantó el que se había trabado para ver por abajo.

Evidence grounded: Miró cuál salía, luego levantó el que se había trabado para ver por abajo.. Reason: Acción central: Indaga mediante métodos científicos para construir sus conocimientos; confianza 1.00, suficiencia 0.96.

Confianza: 1; suficiencia: 0.96. Costo US$0.00046045; latencia 324 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: CYT_INDAGA (review). Errores: ninguno.

Evidence seleccionada: Miró cuál salía y luego levantó el embudo que se había trabado para mirar por debajo.

Evidence grounded: . Reason: Acción central: Indaga mediante métodos científicos para construir sus conocimientos; confianza 1.00, suficiencia 0.96.

Confianza: 1; suficiencia: 0.96. Costo US$0.00052398; latencia 2685 ms.

## TEST2_015

Original: Estaban por armar la tienda, uno quería vender y el otro también. Él dijo podemos vender juntos, tú cobras y yo doy las cosas. Se pusieron a repartir lo que iban a usar, faltaba la caja.

Anonimizada: [persona] por armar la tienda, uno quería vender y el otro también. Él dijo podemos vender juntos, tú cobras y yo doy las cosas. Se pusieron a repartir lo que iban a usar, faltaba la caja.

CLEAN: Al armar la tienda, uno quería vender y el otro también. Él dijo: «Podemos vender juntos, tú cobras y yo doy las cosas». Se pusieron a repartir lo que iban a usar; faltaba la caja.

Gold:
```json
{
  "primary": "PS_CONVIVE",
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": false,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: PS_CONVIVE (review). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 0.93; suficiencia: 0.78. Costo US$0.00022411; latencia 430 ms.

### CURRENT_V2_RAW

Final: PS_CONVIVE (review). Errores: ninguno.

Evidence seleccionada: Él dijo podemos vender juntos, tú cobras y yo doy las cosas.

Evidence grounded: Él dijo podemos vender juntos, tú cobras y yo doy las cosas.. Reason: Acción central: Convive y participa democráticamente en la búsqueda del bien común; confianza 0.98, suficiencia 0.91.

Confianza: 0.98; suficiencia: 0.91. Costo US$0.00032764; latencia 323 ms.

### CURRENT_V2_4_RAW

Final: PS_CONVIVE (review). Errores: ninguno.

Evidence seleccionada: Él dijo podemos vender juntos, tú cobras y yo doy las cosas.

Evidence grounded: Él dijo podemos vender juntos, tú cobras y yo doy las cosas.. Reason: Acción central: Convive y participa democráticamente en la búsqueda del bien común; confianza 0.99, suficiencia 0.89.

Confianza: 0.99; suficiencia: 0.89. Costo US$0.00045977; latencia 367 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: PS_CONVIVE (review). Errores: ninguno.

Evidence seleccionada: Él dijo: «Podemos vender juntos, tú cobras y yo doy las cosas».

Evidence grounded: Él dijo podemos vender juntos, tú cobras y yo doy las cosas. Reason: Acción central: Convive y participa democráticamente en la búsqueda del bien común; confianza 0.99, suficiencia 0.89.

Confianza: 0.99; suficiencia: 0.89. Costo US$0.00051654; latencia 2172 ms.

## TEST2_016

Original: Me pidió que escribiera para su papá: mañana trae mi gorra. Me dictó y cuando le leí lo escrito dijo falta por favor, ponlo al final. No agarró el lápiz, estaba buscando su casaca.

Anonimizada: Me pidió que escribiera para su papá: mañana trae mi gorra. Me dictó y cuando le leí lo escrito dijo falta por favor, ponlo al final. No agarró el lápiz, estaba buscando su casaca.

CLEAN: Me pidió que escribiera para su papá: «Mañana trae mi gorra». Me dictó el mensaje y, cuando le leí lo escrito, dijo: «Falta “por favor”; ponlo al final». No agarró el lápiz; estaba buscando su casaca.

Gold:
```json
{
  "primary": "COM_ESCRITURA",
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": false,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: COM_ESCRITURA (review). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 0.74; suficiencia: 0.88. Costo US$0.00022420; latencia 405 ms.

### CURRENT_V2_RAW

Final: COM_ESCRITURA (review). Errores: ninguno.

Evidence seleccionada: Me dictó y cuando le leí lo escrito dijo falta por favor, ponlo al final.

Evidence grounded: Me dictó y cuando le leí lo escrito dijo falta por favor, ponlo al final.. Reason: Acción central: Escribe diversos tipos de textos en su lengua materna; confianza 0.93, suficiencia 0.86.

Confianza: 0.93; suficiencia: 0.86. Costo US$0.00032768; latencia 330 ms.

### CURRENT_V2_4_RAW

Final: COM_ESCRITURA (review). Errores: ninguno.

Evidence seleccionada: Me dictó y cuando le leí lo escrito dijo falta por favor, ponlo al final.

Evidence grounded: Me dictó y cuando le leí lo escrito dijo falta por favor, ponlo al final.. Reason: Acción central: Escribe diversos tipos de textos en su lengua materna; confianza 0.91, suficiencia 0.85.

Confianza: 0.91; suficiencia: 0.85. Costo US$0.00045982; latencia 430 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: COM_ESCRITURA (review). Errores: ninguno.

Evidence seleccionada: Me dictó el mensaje y, cuando le leí lo escrito, dijo: «Falta “por favor”;

Evidence grounded: . Reason: Acción central: Escribe diversos tipos de textos en su lengua materna; confianza 0.79, suficiencia 0.86.

Confianza: 0.79; suficiencia: 0.86. Costo US$0.00052465; latencia 1571 ms.

## TEST2_017

Original: En la canción empezó a hacer pasos grandes y luego chiquitos, dijo así camina el gigante y así el ratón. Les mostró la parte del gigante otra vez porque quería que se viera pesado.

Anonimizada: En la canción empezó a hacer pasos grandes y luego chiquitos, dijo así camina el gigante y así el ratón. [persona] mostró la parte del gigante otra vez porque quería que se viera pesado.

CLEAN: Durante la canción, empezó a dar pasos grandes y luego pequeños. Dijo: «Así camina el gigante y así el ratón». Mostró nuevamente la parte del gigante porque quería que se viera pesado.

Gold:
```json
{
  "primary": "COM_ARTE",
  "acceptable_primary": [
    "PSICO_MOTRICIDAD"
  ],
  "acceptable_secondary": [],
  "should_abstain": false,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: PSICO_MOTRICIDAD + MAT_FORMA (review). Errores: unnecessary_secondary.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 0.6; suficiencia: 0.91. Costo US$0.00022361; latencia 347 ms.

### CURRENT_V2_RAW

Final: COM_ARTE (review). Errores: ninguno.

Evidence seleccionada: En la canción empezó a hacer pasos grandes y luego chiquitos, dijo así camina el gigante y así el ratón.

Evidence grounded: En la canción empezó a hacer pasos grandes y luego chiquitos, dijo así camina el gigante y así el ratón.. Reason: Acción central: Crea proyectos desde los lenguajes artísticos; confianza 0.68, suficiencia 0.94.

Confianza: 0.68; suficiencia: 0.94. Costo US$0.00032634; latencia 390 ms.

### CURRENT_V2_4_RAW

Final: COM_ARTE (review). Errores: ninguno.

Evidence seleccionada: En la canción empezó a hacer pasos grandes y luego chiquitos, dijo así camina el gigante y así el ratón.

Evidence grounded: En la canción empezó a hacer pasos grandes y luego chiquitos, dijo así camina el gigante y así el ratón.. Reason: Acción central: Crea proyectos desde los lenguajes artísticos; confianza 0.62, suficiencia 0.94.

Confianza: 0.62; suficiencia: 0.94. Costo US$0.00045847; latencia 360 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: ABSTAIN (unclassified). Errores: false_abstention.

Evidence seleccionada: Durante la canción, empezó a dar pasos grandes y luego pequeños.

Evidence grounded: . Reason: Abstención: elección PSICO_MOTRICIDAD, confianza 0.48 (mínimo 0.50), suficiencia 0.94 (mínimo 0.70).

Confianza: 0.48; suficiencia: 0.94. Costo US$0.00051250; latencia 1926 ms.

## TEST2_018

Original: A ver, sujetaba la tela con una mano y con la otra iba metiendo y sacando el cordón por los huequitos; cuando se movía la tela la apretaba contra la mesa. No dijo que estuviera haciendo una carta.

Anonimizada: A ver, sujetaba la tela con una mano y con la otra iba metiendo y sacando el cordón por los huequitos; cuando se movía la tela la apretaba contra la mesa. No dijo que estuviera haciendo una carta.

CLEAN: Sujetaba la tela con una mano y con la otra iba metiendo y sacando el cordón por los huequitos. Cuando la tela se movía, la apretaba contra la mesa. No dijo que estuviera haciendo una carta.

Gold:
```json
{
  "primary": "PSICO_MOTRICIDAD",
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": false,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: PSICO_MOTRICIDAD (review). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 0.6; suficiencia: 0.9. Costo US$0.00022445; latencia 689 ms.

### CURRENT_V2_RAW

Final: PSICO_MOTRICIDAD (review). Errores: ninguno.

Evidence seleccionada: A ver, sujetaba la tela con una mano y con la otra iba metiendo y sacando el cordón por los huequitos;

Evidence grounded: A ver, sujetaba la tela con una mano y con la otra iba metiendo y sacando el cordón por los huequitos;. Reason: Acción central: Se desenvuelve de manera autónoma a través de su motricidad; confianza 0.99, suficiencia 0.94.

Confianza: 0.99; suficiencia: 0.94. Costo US$0.00032810; latencia 327 ms.

### CURRENT_V2_4_RAW

Final: PSICO_MOTRICIDAD (review). Errores: ninguno.

Evidence seleccionada: A ver, sujetaba la tela con una mano y con la otra iba metiendo y sacando el cordón por los huequitos;

Evidence grounded: A ver, sujetaba la tela con una mano y con la otra iba metiendo y sacando el cordón por los huequitos;. Reason: Acción central: Se desenvuelve de manera autónoma a través de su motricidad; confianza 0.99, suficiencia 0.93.

Confianza: 0.99; suficiencia: 0.93. Costo US$0.00046024; latencia 346 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: PSICO_MOTRICIDAD (review). Errores: ninguno.

Evidence seleccionada: Sujetaba la tela con una mano y con la otra iba metiendo y sacando el cordón por los huequitos.

Evidence grounded: A ver, sujetaba la tela con una mano y con la otra iba metiendo y sacando el cordón por los huequitos. Reason: Acción central: Se desenvuelve de manera autónoma a través de su motricidad; confianza 0.99, suficiencia 0.93.

Confianza: 0.99; suficiencia: 0.93. Costo US$0.00051704; latencia 1538 ms.

## TEST2_019

Original: Estuvo comiendo su pan y tomó agua; dejó la servilleta en la mesa. Eso fue todo lo que pude ver, después me llamaron del otro lado.

Anonimizada: Estuvo comiendo su pan y tomó agua; dejó la servilleta en la mesa. [persona] fue todo lo que pude ver, después me llamaron del otro lado.

CLEAN: Estuvo comiendo su pan y tomó agua. Dejó la servilleta en la mesa. [persona] fue todo lo que pude ver; después me llamaron del otro lado.

Gold:
```json
{
  "primary": null,
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": true,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: ABSTAIN (unclassified). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 0.82; suficiencia: 0.73. Costo US$0.00022319; latencia 337 ms.

### CURRENT_V2_RAW

Final: ABSTAIN (unclassified). Errores: ninguno.

Evidence seleccionada: Estuvo comiendo su pan y tomó agua;

Evidence grounded: Estuvo comiendo su pan y tomó agua;. Reason: Abstención: elección NO_CLASIFICABLE, confianza 1.00 (mínimo 0.50), suficiencia 0.18 (mínimo 0.70).

Confianza: 1; suficiencia: 0.18. Costo US$0.00032626; latencia 344 ms.

### CURRENT_V2_4_RAW

Final: ABSTAIN (unclassified). Errores: ninguno.

Evidence seleccionada: Estuvo comiendo su pan y tomó agua;

Evidence grounded: Estuvo comiendo su pan y tomó agua;. Reason: Abstención: elección NO_CLASIFICABLE, confianza 1.00 (mínimo 0.50), suficiencia 0.15 (mínimo 0.70).

Confianza: 1; suficiencia: 0.15. Costo US$0.00045839; latencia 485 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: ABSTAIN (unclassified). Errores: ninguno.

Evidence seleccionada: Estuvo comiendo su pan y tomó agua.

Evidence grounded: Estuvo comiendo su pan y tomó agua. Reason: Abstención: elección NO_CLASIFICABLE, confianza 1.00 (mínimo 0.50), suficiencia 0.14 (mínimo 0.70).

Confianza: 1; suficiencia: 0.14. Costo US$0.00055330; latencia 3072 ms.

## TEST2_020

Original: Se quedó al lado de los que jugaban con telas, mirando. Tenía una tela en la mano, no vi que hablara ni que la usara con ellos. Un rato después se fue.

Anonimizada: Se quedó al lado de los que jugaban con telas, mirando. [persona] una tela en la mano, no vi que hablara ni que la usara con ellos. Un rato después se fue.

CLEAN: Se quedó al lado de quienes jugaban con telas, mirando. [Persona] tenía una tela en la mano; no vi que hablara ni que la usara con ellos. Un rato después, se fue.

Gold:
```json
{
  "primary": null,
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": true,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: ABSTAIN (unclassified). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 0.92; suficiencia: 0.35. Costo US$0.00022361; latencia 317 ms.

### CURRENT_V2_RAW

Final: ABSTAIN (unclassified). Errores: ninguno.

Evidence seleccionada: Se quedó al lado de los que jugaban con telas, mirando.

Evidence grounded: Se quedó al lado de los que jugaban con telas, mirando.. Reason: Abstención: elección NO_CLASIFICABLE, confianza 1.00 (mínimo 0.50), suficiencia 0.29 (mínimo 0.70).

Confianza: 1; suficiencia: 0.29. Costo US$0.00032684; latencia 344 ms.

### CURRENT_V2_4_RAW

Final: ABSTAIN (unclassified). Errores: ninguno.

Evidence seleccionada: Se quedó al lado de los que jugaban con telas, mirando.

Evidence grounded: Se quedó al lado de los que jugaban con telas, mirando.. Reason: Abstención: elección NO_CLASIFICABLE, confianza 0.99 (mínimo 0.50), suficiencia 0.26 (mínimo 0.70).

Confianza: 0.99; suficiencia: 0.26. Costo US$0.00045898; latencia 453 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: ABSTAIN (unclassified). Errores: ninguno.

Evidence seleccionada: Se quedó al lado de quienes jugaban con telas, mirando.

Evidence grounded: . Reason: Abstención: elección NO_CLASIFICABLE, confianza 0.99 (mínimo 0.50), suficiencia 0.25 (mínimo 0.70).

Confianza: 0.99; suficiencia: 0.25. Costo US$0.00051281; latencia 1729 ms.

## TEST2_021

Original: Contó las macetas que habían regado. Después dictó para su mamá el correo familia-prueba@example.invalid, que lo anotara en la hoja. Todo este registro es ficticio.

Anonimizada: bloqueada

CLEAN: no se llama: Privacy

Gold:
```json
{
  "primary": null,
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": false,
  "should_privacy_block": true,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: PRIVACY (privacy_blocked). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: . Reason: direct_identifier

Confianza: —; suficiencia: —. Costo US$0.00000000; latencia 0 ms.

### CURRENT_V2_RAW

Final: PRIVACY (privacy_blocked). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: . Reason: direct_identifier

Confianza: —; suficiencia: —. Costo US$0.00000000; latencia 0 ms.

### CURRENT_V2_4_RAW

Final: PRIVACY (privacy_blocked). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: . Reason: direct_identifier

Confianza: —; suficiencia: —. Costo US$0.00000000; latencia 0 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: PRIVACY (privacy_blocked). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: . Reason: direct_identifier

Confianza: —; suficiencia: —. Costo US$0.00000000; latencia 0 ms.

## TEST2_022

Original: Eligió las cintas y las acomodó de la más corta a la más larga; cambió la del medio, porque dijo esta todavía es más chiquita. Me parecía que iban a hacer un camino, no sé si al final lo hicieron.

Anonimizada: Eligió las cintas y las acomodó de la más corta a la más larga; cambió la del medio, porque dijo esta todavía es más chiquita. Me parecía que iban a hacer un camino, no sé si al final lo hicieron.

CLEAN: Eligió las cintas y las acomodó de la más corta a la más larga. Cambió la del medio porque dijo: «Esta todavía es más chiquita». Me parecía que iban a hacer un camino; no sé si al final lo hicieron.

Gold:
```json
{
  "primary": "MAT_CANTIDAD",
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": false,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: MAT_CANTIDAD (review). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 0.65; suficiencia: 0.9. Costo US$0.00022445; latencia 362 ms.

### CURRENT_V2_RAW

Final: MAT_CANTIDAD (review). Errores: ninguno.

Evidence seleccionada: cambió la del medio, porque dijo esta todavía es más chiquita.

Evidence grounded: cambió la del medio, porque dijo esta todavía es más chiquita.. Reason: Acción central: Resuelve problemas de cantidad; confianza 1.00, suficiencia 0.95.

Confianza: 1; suficiencia: 0.95. Costo US$0.00032806; latencia 395 ms.

### CURRENT_V2_4_RAW

Final: MAT_CANTIDAD (review). Errores: ninguno.

Evidence seleccionada: cambió la del medio, porque dijo esta todavía es más chiquita.

Evidence grounded: cambió la del medio, porque dijo esta todavía es más chiquita.. Reason: Acción central: Resuelve problemas de cantidad; confianza 1.00, suficiencia 0.96.

Confianza: 1; suficiencia: 0.96. Costo US$0.00046019; latencia 367 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: MAT_CANTIDAD (review). Errores: ninguno.

Evidence seleccionada: Cambió la del medio porque dijo: «Esta todavía es más chiquita».

Evidence grounded: cambió la del medio, porque dijo esta todavía es más chiquita. Reason: Acción central: Resuelve problemas de cantidad; confianza 1.00, suficiencia 0.96.

Confianza: 1; suficiencia: 0.96. Costo US$0.00051942; latencia 1758 ms.

## TEST2_023

Original: En el cartel de los materiales señaló el dibujo de tijeras y dijo acá se guardan estas. Buscó la cajita que tenía el mismo dibujo. No reconoció letras, al menos yo no lo escuché.

Anonimizada: En el cartel de los materiales señaló el dibujo de tijeras y dijo acá se guardan estas. [persona] la cajita que tenía el mismo dibujo. No reconoció letras, al menos yo no lo escuché.

CLEAN: En el cartel de los materiales señaló el dibujo de unas tijeras y dijo: «Acá se guardan estas». [persona] la cajita que tenía el mismo dibujo. No reconoció letras, al menos yo no lo escuché.

Gold:
```json
{
  "primary": "COM_LECTURA",
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": false,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: COM_LECTURA (review). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 0.85; suficiencia: 0.86. Costo US$0.00022403; latencia 473 ms.

### CURRENT_V2_RAW

Final: COM_LECTURA (review). Errores: ninguno.

Evidence seleccionada: En el cartel de los materiales señaló el dibujo de tijeras y dijo acá se guardan estas.

Evidence grounded: En el cartel de los materiales señaló el dibujo de tijeras y dijo acá se guardan estas.. Reason: Acción central: Lee diversos tipos de textos escritos en su lengua materna; confianza 0.97, suficiencia 0.86.

Confianza: 0.97; suficiencia: 0.86. Costo US$0.00032747; latencia 346 ms.

### CURRENT_V2_4_RAW

Final: COM_LECTURA (review). Errores: ninguno.

Evidence seleccionada: En el cartel de los materiales señaló el dibujo de tijeras y dijo acá se guardan estas.

Evidence grounded: En el cartel de los materiales señaló el dibujo de tijeras y dijo acá se guardan estas.. Reason: Acción central: Lee diversos tipos de textos escritos en su lengua materna; confianza 0.98, suficiencia 0.88.

Confianza: 0.98; suficiencia: 0.88. Costo US$0.00045961; latencia 357 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: COM_LECTURA (review). Errores: ninguno.

Evidence seleccionada: En el cartel de los materiales señaló el dibujo de unas tijeras y dijo: «Acá se guardan estas».

Evidence grounded: . Reason: Acción central: Lee diversos tipos de textos escritos en su lengua materna; confianza 0.98, suficiencia 0.88.

Confianza: 0.98; suficiencia: 0.88. Costo US$0.00063611; latencia 4177 ms.

## TEST2_024

Original: Escuchó un golpecito detrás de la puerta y dijo debe ser la rama. Miró por la ventana y señaló que una rama se movía tocando la puerta; comentó sí era eso. La auxiliar también estaba ahí.

Anonimizada: [persona] un golpecito detrás de la puerta y dijo debe ser la rama. Miró por la ventana y señaló que una rama se movía tocando la puerta; comentó sí era eso. La auxiliar también estaba ahí.

CLEAN: Escuchó un golpecito detrás de la puerta y dijo: «Debe ser la rama». Miró por la ventana y señaló que una rama se movía y tocaba la puerta. Comentó: «Sí, era eso». La auxiliar también estaba ahí.

Gold:
```json
{
  "primary": "CYT_INDAGA",
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": false,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: CYT_INDAGA (review). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 0.84; suficiencia: 0.82. Costo US$0.00022386; latencia 386 ms.

### CURRENT_V2_RAW

Final: CYT_INDAGA (review). Errores: ninguno.

Evidence seleccionada: Miró por la ventana y señaló que una rama se movía tocando la puerta;

Evidence grounded: Miró por la ventana y señaló que una rama se movía tocando la puerta;. Reason: Acción central: Indaga mediante métodos científicos para construir sus conocimientos; confianza 0.58, suficiencia 0.86.

Confianza: 0.58; suficiencia: 0.86. Costo US$0.00032781; latencia 364 ms.

### CURRENT_V2_4_RAW

Final: CYT_INDAGA (review). Errores: ninguno.

Evidence seleccionada: Miró por la ventana y señaló que una rama se movía tocando la puerta;

Evidence grounded: Miró por la ventana y señaló que una rama se movía tocando la puerta;. Reason: Acción central: Indaga mediante métodos científicos para construir sus conocimientos; confianza 0.98, suficiencia 0.91.

Confianza: 0.98; suficiencia: 0.91. Costo US$0.00045994; latencia 400 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: CYT_INDAGA (review). Errores: ninguno.

Evidence seleccionada: Miró por la ventana y señaló que una rama se movía y tocaba la puerta.

Evidence grounded: . Reason: Acción central: Indaga mediante métodos científicos para construir sus conocimientos; confianza 0.99, suficiencia 0.91.

Confianza: 0.99; suficiencia: 0.91. Costo US$0.00052002; latencia 1902 ms.

## TEST2_025

Original: Cuando se quedaron sin lugar en la mesa le dijo a otro yo te hago sitio, corrió su bandeja y le acercó una silla. No sé si el otro llegó a sentarse, yo seguí con el grupo.

Anonimizada: [persona] se quedaron sin lugar en la mesa le dijo a otro yo te hago sitio, corrió su bandeja y le acercó una silla. No sé si el otro llegó a sentarse, yo seguí con el grupo.

CLEAN: Se quedaron sin lugar en la mesa. [Persona] le dijo a otro: «Yo te hago sitio», corrió su bandeja y le acercó una silla. No sé si el otro llegó a sentarse; yo seguí con el grupo.

Gold:
```json
{
  "primary": "PS_CONVIVE",
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": false,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: PS_CONVIVE (review). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 0.98; suficiencia: 0.91. Costo US$0.00022403; latencia 313 ms.

### CURRENT_V2_RAW

Final: PS_CONVIVE (review). Errores: ninguno.

Evidence seleccionada: [persona] se quedaron sin lugar en la mesa le dijo a otro yo te hago sitio, corrió su bandeja y le acercó una silla.

Evidence grounded: Cuando se quedaron sin lugar en la mesa le dijo a otro yo te hago sitio, corrió su bandeja y le acercó una silla. Reason: Acción central: Convive y participa democráticamente en la búsqueda del bien común; confianza 1.00, suficiencia 0.92.

Confianza: 1; suficiencia: 0.92. Costo US$0.00032697; latencia 374 ms.

### CURRENT_V2_4_RAW

Final: PS_CONVIVE (review). Errores: ninguno.

Evidence seleccionada: [persona] se quedaron sin lugar en la mesa le dijo a otro yo te hago sitio, corrió su bandeja y le acercó una silla.

Evidence grounded: Cuando se quedaron sin lugar en la mesa le dijo a otro yo te hago sitio, corrió su bandeja y le acercó una silla. Reason: Acción central: Convive y participa democráticamente en la búsqueda del bien común; confianza 1.00, suficiencia 0.91.

Confianza: 1; suficiencia: 0.91. Costo US$0.00045910; latencia 395 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: PS_CONVIVE (review). Errores: ninguno.

Evidence seleccionada: [Persona] le dijo a otro: «Yo te hago sitio», corrió su bandeja y le acercó una silla.

Evidence grounded: Cuando se quedaron sin lugar en la mesa le dijo a otro yo te hago sitio, corrió su bandeja y le acercó una silla. Reason: Acción central: Convive y participa democráticamente en la búsqueda del bien común; confianza 1.00, suficiencia 0.92.

Confianza: 1; suficiencia: 0.92. Costo US$0.00051829; latencia 1772 ms.

## TEST2_026

Original: Dibujó una rayita de camino en la hoja y marcó un cuadrado, este es el lavadero, dijo. Con el dedo indicó por dónde se llega desde la puerta. El papel era de una hoja que ya estaba usada.

Anonimizada: Dibujó una rayita de camino en la hoja y marcó un cuadrado, este es el lavadero, dijo. [persona] el dedo indicó por dónde se llega desde la puerta. El papel era de una hoja que ya estaba usada.

CLEAN: Dibujó una rayita a modo de camino en la hoja y marcó un cuadrado. «Este es el lavadero», dijo. [persona] indicó con el dedo por dónde se llega desde la puerta. El papel era una hoja que ya estaba usada.

Gold:
```json
{
  "primary": "MAT_FORMA",
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": false,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: MAT_FORMA (review). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 0.63; suficiencia: 0.9. Costo US$0.00022428; latencia 333 ms.

### CURRENT_V2_RAW

Final: MAT_FORMA (review). Errores: ninguno.

Evidence seleccionada: Dibujó una rayita de camino en la hoja y marcó un cuadrado, este es el lavadero, dijo.

Evidence grounded: Dibujó una rayita de camino en la hoja y marcó un cuadrado, este es el lavadero, dijo.. Reason: Acción central: Resuelve problemas de forma, movimiento y localización; confianza 0.76, suficiencia 0.94.

Confianza: 0.76; suficiencia: 0.94. Costo US$0.00032789; latencia 326 ms.

### CURRENT_V2_4_RAW

Final: MAT_FORMA (review). Errores: ninguno.

Evidence seleccionada: Dibujó una rayita de camino en la hoja y marcó un cuadrado, este es el lavadero, dijo.

Evidence grounded: Dibujó una rayita de camino en la hoja y marcó un cuadrado, este es el lavadero, dijo.. Reason: Acción central: Resuelve problemas de forma, movimiento y localización; confianza 0.97, suficiencia 0.95.

Confianza: 0.97; suficiencia: 0.95. Costo US$0.00046003; latencia 372 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: MAT_FORMA (review). Errores: ninguno.

Evidence seleccionada: Dibujó una rayita a modo de camino en la hoja y marcó un cuadrado.

Evidence grounded: . Reason: Acción central: Resuelve problemas de forma, movimiento y localización; confianza 0.96, suficiencia 0.96.

Confianza: 0.96; suficiencia: 0.96. Costo US$0.00057061; latencia 2823 ms.

## TEST2_027

Original: Hizo tres marcas en el sobre de la foto, me dijo son para saber que es de mi hermano. Yo le pregunté qué decía y volvió a señalar las mismas marcas. No eran letras que yo reconociera.

Anonimizada: Hizo tres marcas en el sobre de la foto, me dijo son para saber que es de mi hermano. Yo le pregunté qué decía y volvió a señalar las mismas marcas. No eran letras que yo reconociera.

CLEAN: Hizo tres marcas en el sobre de la foto y me dijo: «Son para saber que es de mi hermano». Le pregunté qué decía y volvió a señalar las mismas marcas. No eran letras que yo reconociera.

Gold:
```json
{
  "primary": "COM_ESCRITURA",
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": false,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: COM_LECTURA (review). Errores: wrong_primary.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 0.54; suficiencia: 0.85. Costo US$0.00022386; latencia 442 ms.

### CURRENT_V2_RAW

Final: COM_ESCRITURA (review). Errores: ninguno.

Evidence seleccionada: Hizo tres marcas en el sobre de la foto, me dijo son para saber que es de mi hermano.

Evidence grounded: Hizo tres marcas en el sobre de la foto, me dijo son para saber que es de mi hermano.. Reason: Acción central: Escribe diversos tipos de textos en su lengua materna; confianza 1.00, suficiencia 0.91.

Confianza: 1; suficiencia: 0.91. Costo US$0.00032718; latencia 326 ms.

### CURRENT_V2_4_RAW

Final: COM_ESCRITURA (review). Errores: ninguno.

Evidence seleccionada: Hizo tres marcas en el sobre de la foto, me dijo son para saber que es de mi hermano.

Evidence grounded: Hizo tres marcas en el sobre de la foto, me dijo son para saber que es de mi hermano.. Reason: Acción central: Escribe diversos tipos de textos en su lengua materna; confianza 1.00, suficiencia 0.92.

Confianza: 1; suficiencia: 0.92. Costo US$0.00045931; latencia 382 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: COM_ESCRITURA (review). Errores: ninguno.

Evidence seleccionada: Hizo tres marcas en el sobre de la foto y me dijo: «Son para saber que es de mi hermano».

Evidence grounded: Hizo tres marcas en el sobre de la foto, me dijo son para saber que es de mi hermano. Reason: Acción central: Escribe diversos tipos de textos en su lengua materna; confianza 1.00, suficiencia 0.93.

Confianza: 1; suficiencia: 0.93. Costo US$0.00051384; latencia 1765 ms.

## TEST2_028

Original: Con las cucharas empezó un sonido, luego paró y cambió a golpear despacito, decía es una lluvia pequeña. Invitó a escuchar cómo quedaba; la cucharita azul no sonaba mucho.

Anonimizada: [persona] las cucharas empezó un sonido, luego paró y cambió a golpear despacito, decía es una lluvia pequeña. [persona] a escuchar cómo quedaba; la cucharita azul no sonaba mucho.

CLEAN: [persona] empezó a hacer un sonido con las cucharas, luego paró y cambió a golpear despacito. Decía: «Es una lluvia pequeña». [persona] escuchó cómo quedaba; la cucharita azul no sonaba mucho.

Gold:
```json
{
  "primary": "COM_ARTE",
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": false,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: CYT_INDAGA (review). Errores: wrong_primary.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 0.65; suficiencia: 0.89. Costo US$0.00022420; latencia 397 ms.

### CURRENT_V2_RAW

Final: COM_ARTE (review). Errores: ninguno.

Evidence seleccionada: [persona] las cucharas empezó un sonido, luego paró y cambió a golpear despacito, decía es una lluvia pequeña.

Evidence grounded: Con las cucharas empezó un sonido, luego paró y cambió a golpear despacito, decía es una lluvia pequeña. Reason: Acción central: Crea proyectos desde los lenguajes artísticos; confianza 0.91, suficiencia 0.87.

Confianza: 0.91; suficiencia: 0.87. Costo US$0.00032777; latencia 340 ms.

### CURRENT_V2_4_RAW

Final: COM_ARTE (review). Errores: ninguno.

Evidence seleccionada: [persona] las cucharas empezó un sonido, luego paró y cambió a golpear despacito, decía es una lluvia pequeña.

Evidence grounded: Con las cucharas empezó un sonido, luego paró y cambió a golpear despacito, decía es una lluvia pequeña. Reason: Acción central: Crea proyectos desde los lenguajes artísticos; confianza 0.78, suficiencia 0.87.

Confianza: 0.78; suficiencia: 0.87. Costo US$0.00045990; latencia 328 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: COM_ARTE (review). Errores: ninguno.

Evidence seleccionada: [persona] empezó a hacer un sonido con las cucharas, luego paró y cambió a golpear despacito.

Evidence grounded: . Reason: Acción central: Crea proyectos desde los lenguajes artísticos; confianza 0.93, suficiencia 0.91.

Confianza: 0.93; suficiencia: 0.91. Costo US$0.00051999; latencia 2035 ms.

## TEST2_029

Original: Lanzó la bolsita hacia el aro; quedó corta, se acercó un poquito, después bajó el brazo y lanzó más suave para que no se pasara. Hizo otra vez el movimiento, no conté los intentos.

Anonimizada: [persona] la bolsita hacia el aro; quedó corta, se acercó un poquito, después bajó el brazo y lanzó más suave para que no se pasara. Hizo otra vez el movimiento, no conté los intentos.

CLEAN: [persona] lanzó la bolsita hacia el aro; quedó corta. Se acercó un poquito, después bajó el brazo y lanzó más suave para que no se pasara. Hizo otra vez el movimiento. No conté los intentos.

Gold:
```json
{
  "primary": "PSICO_MOTRICIDAD",
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": false,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: PSICO_MOTRICIDAD (review). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 0.66; suficiencia: 0.91. Costo US$0.00022411; latencia 317 ms.

### CURRENT_V2_RAW

Final: PSICO_MOTRICIDAD (review). Errores: ninguno.

Evidence seleccionada: quedó corta, se acercó un poquito, después bajó el brazo y lanzó más suave para que no se pasara.

Evidence grounded: quedó corta, se acercó un poquito, después bajó el brazo y lanzó más suave para que no se pasara.. Reason: Acción central: Se desenvuelve de manera autónoma a través de su motricidad; confianza 1.00, suficiencia 0.92.

Confianza: 1; suficiencia: 0.92. Costo US$0.00032768; latencia 343 ms.

### CURRENT_V2_4_RAW

Final: PSICO_MOTRICIDAD (review). Errores: ninguno.

Evidence seleccionada: quedó corta, se acercó un poquito, después bajó el brazo y lanzó más suave para que no se pasara.

Evidence grounded: quedó corta, se acercó un poquito, después bajó el brazo y lanzó más suave para que no se pasara.. Reason: Acción central: Se desenvuelve de manera autónoma a través de su motricidad; confianza 1.00, suficiencia 0.92.

Confianza: 1; suficiencia: 0.92. Costo US$0.00045982; latencia 392 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: PSICO_MOTRICIDAD (review). Errores: ninguno.

Evidence seleccionada: Se acercó un poquito, después bajó el brazo y lanzó más suave para que no se pasara.

Evidence grounded: quedó corta, se acercó un poquito, después bajó el brazo y lanzó más suave para que no se pasara. Reason: Acción central: Se desenvuelve de manera autónoma a través de su motricidad; confianza 1.00, suficiencia 0.93.

Confianza: 1; suficiencia: 0.93. Costo US$0.00058385; latencia 2996 ms.

## TEST2_030

Original: Estaba mirando el ventilador mientras los demás hablaban, se levantó a la ventana y volvió. No vi ninguna pregunta, explicación ni que hiciera algo con materiales.

Anonimizada: [persona] mirando el ventilador mientras los demás hablaban, se levantó a la ventana y volvió. No vi ninguna pregunta, explicación ni que hiciera algo con materiales.

CLEAN: Mientras los demás hablaban, [persona] miró el ventilador, se levantó, fue a la ventana y volvió. No vi que le hicieran ninguna pregunta ni que hubiera una explicación o que hiciera algo con materiales.

Gold:
```json
{
  "primary": null,
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": true,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: ABSTAIN (unclassified). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 0.96; suficiencia: 0.52. Costo US$0.00022344; latencia 301 ms.

### CURRENT_V2_RAW

Final: ABSTAIN (unclassified). Errores: ninguno.

Evidence seleccionada: [persona] mirando el ventilador mientras los demás hablaban, se levantó a la ventana y volvió.

Evidence grounded: Estaba mirando el ventilador mientras los demás hablaban, se levantó a la ventana y volvió. Reason: Abstención: elección NO_CLASIFICABLE, confianza 0.98 (mínimo 0.50), suficiencia 0.26 (mínimo 0.70).

Confianza: 0.98; suficiencia: 0.26. Costo US$0.00032609; latencia 315 ms.

### CURRENT_V2_4_RAW

Final: ABSTAIN (unclassified). Errores: ninguno.

Evidence seleccionada: [persona] mirando el ventilador mientras los demás hablaban, se levantó a la ventana y volvió.

Evidence grounded: Estaba mirando el ventilador mientras los demás hablaban, se levantó a la ventana y volvió. Reason: Abstención: elección NO_CLASIFICABLE, confianza 0.97 (mínimo 0.50), suficiencia 0.23 (mínimo 0.70).

Confianza: 0.97; suficiencia: 0.23. Costo US$0.00045822; latencia 540 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: ABSTAIN (unclassified). Errores: ninguno.

Evidence seleccionada: Mientras los demás hablaban, [persona] miró el ventilador, se levantó, fue a la ventana y volvió.

Evidence grounded: . Reason: Abstención: elección NO_CLASIFICABLE, confianza 0.95 (mínimo 0.50), suficiencia 0.18 (mínimo 0.70).

Confianza: 0.95; suficiencia: 0.18. Costo US$0.00051412; latencia 2300 ms.

## TEST2_031

Original: Apretó una esponja una vez, la dejó y agarró su botella para tomar agua. No la comparó con nada, estaba esperando que yo terminara.

Anonimizada: [persona] una esponja una vez, la dejó y agarró su botella para tomar agua. No la comparó con nada, estaba esperando que yo terminara.

CLEAN: Usó una esponja una vez, la dejó y agarró su botella para tomar agua. No la comparó con nada; estaba esperando que yo terminara.

Gold:
```json
{
  "primary": null,
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": true,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: ABSTAIN (unclassified). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 0.41; suficiencia: 0.78. Costo US$0.00022310; latencia 394 ms.

### CURRENT_V2_RAW

Final: ABSTAIN (unclassified). Errores: ninguno.

Evidence seleccionada: [persona] una esponja una vez, la dejó y agarró su botella para tomar agua.

Evidence grounded: Apretó una esponja una vez, la dejó y agarró su botella para tomar agua. Reason: Abstención: elección NO_CLASIFICABLE, confianza 0.77 (mínimo 0.50), suficiencia 0.52 (mínimo 0.70).

Confianza: 0.77; suficiencia: 0.52. Costo US$0.00032558; latencia 366 ms.

### CURRENT_V2_4_RAW

Final: ABSTAIN (unclassified). Errores: ninguno.

Evidence seleccionada: [persona] una esponja una vez, la dejó y agarró su botella para tomar agua.

Evidence grounded: Apretó una esponja una vez, la dejó y agarró su botella para tomar agua. Reason: Abstención: elección NO_CLASIFICABLE, confianza 0.77 (mínimo 0.50), suficiencia 0.46 (mínimo 0.70).

Confianza: 0.77; suficiencia: 0.46. Costo US$0.00045772; latencia 519 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: ABSTAIN (unclassified). Errores: ninguno.

Evidence seleccionada: Usó una esponja una vez, la dejó y agarró su botella para tomar agua.

Evidence grounded: . Reason: Abstención: elección NO_CLASIFICABLE, confianza 0.94 (mínimo 0.50), suficiencia 0.37 (mínimo 0.70).

Confianza: 0.94; suficiencia: 0.37. Costo US$0.00050609; latencia 1665 ms.

## TEST2_032

Original: Tenía el cuento abierto, pero solo lo sostenía. Cuando pasó la auxiliar cerró el cuento; no escuché relato ni respuesta y no vi que señalara imágenes.

Anonimizada: [persona] el cuento abierto, pero solo lo sostenía. [persona] pasó la auxiliar cerró el cuento; no escuché relato ni respuesta y no vi que señalara imágenes.

CLEAN: [persona] tenía el cuento abierto, pero solo lo sostenía. La auxiliar pasó y cerró el cuento. No escuché un relato ni una respuesta, y no vi que señalara imágenes.

Gold:
```json
{
  "primary": null,
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": true,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: ABSTAIN (unclassified). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 0.67; suficiencia: 0.5. Costo US$0.00022336; latencia 316 ms.

### CURRENT_V2_RAW

Final: ABSTAIN (unclassified). Errores: ninguno.

Evidence seleccionada: [persona] el cuento abierto, pero solo lo sostenía.

Evidence grounded: Tenía el cuento abierto, pero solo lo sostenía. Reason: Abstención: elección NO_CLASIFICABLE, confianza 0.88 (mínimo 0.50), suficiencia 0.43 (mínimo 0.70).

Confianza: 0.88; suficiencia: 0.43. Costo US$0.00032651; latencia 419 ms.

### CURRENT_V2_4_RAW

Final: ABSTAIN (unclassified). Errores: ninguno.

Evidence seleccionada: [persona] el cuento abierto, pero solo lo sostenía.

Evidence grounded: Tenía el cuento abierto, pero solo lo sostenía. Reason: Abstención: elección NO_CLASIFICABLE, confianza 0.88 (mínimo 0.50), suficiencia 0.33 (mínimo 0.70).

Confianza: 0.88; suficiencia: 0.33. Costo US$0.00045864; latencia 465 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: ABSTAIN (unclassified). Errores: ninguno.

Evidence seleccionada: [persona] tenía el cuento abierto, pero solo lo sostenía.

Evidence grounded: Tenía el cuento abierto, pero solo lo sostenía. Reason: Abstención: elección NO_CLASIFICABLE, confianza 0.97 (mínimo 0.50), suficiencia 0.18 (mínimo 0.70).

Confianza: 0.97; suficiencia: 0.18. Costo US$0.00063365; latencia 3763 ms.

## TEST2_033

Original: Creo que quizá estaba comparando, no sé, lo vi un segundo en la mesa y después tuve que salir. No puedo decir qué hizo con las piezas.

Anonimizada: Creo que quizá estaba comparando, no sé, lo vi un segundo en la mesa y después tuve que salir. No puedo decir qué hizo con las piezas.

CLEAN: Creo que quizá estaba comparando. Lo vi un segundo en la mesa y después tuve que salir. No puedo decir qué hizo con las piezas.

Gold:
```json
{
  "primary": null,
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": true,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: ABSTAIN (unclassified). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 0.96; suficiencia: 0.07. Costo US$0.00022268; latencia 419 ms.

### CURRENT_V2_RAW

Final: ABSTAIN (unclassified). Errores: ninguno.

Evidence seleccionada: Creo que quizá estaba comparando, no sé, lo vi un segundo en la mesa y después tuve que salir.

Evidence grounded: Creo que quizá estaba comparando, no sé, lo vi un segundo en la mesa y después tuve que salir.. Reason: Abstención: elección NO_CLASIFICABLE, confianza 0.98 (mínimo 0.50), suficiencia 0.18 (mínimo 0.70).

Confianza: 0.98; suficiencia: 0.18. Costo US$0.00032491; latencia 384 ms.

### CURRENT_V2_4_RAW

Final: ABSTAIN (unclassified). Errores: ninguno.

Evidence seleccionada: Creo que quizá estaba comparando, no sé, lo vi un segundo en la mesa y después tuve que salir.

Evidence grounded: Creo que quizá estaba comparando, no sé, lo vi un segundo en la mesa y después tuve que salir.. Reason: Abstención: elección NO_CLASIFICABLE, confianza 0.98 (mínimo 0.50), suficiencia 0.16 (mínimo 0.70).

Confianza: 0.98; suficiencia: 0.16. Costo US$0.00045704; latencia 376 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: ABSTAIN (unclassified). Errores: ninguno.

Evidence seleccionada: 

Evidence grounded: . Reason: Abstención: elección NO_CLASIFICABLE, confianza 0.98 (mínimo 0.50), suficiencia 0.17 (mínimo 0.70).

Confianza: 0.98; suficiencia: 0.17. Costo US$0.00050237; latencia 1939 ms.

## TEST2_034

Original: Dijo no quiero y se apartó cuando ofrecí el material. Se quedó con la mochila un rato. No quedó registrada otra acción o conversación.

Anonimizada: Dijo no quiero y se apartó cuando ofrecí el material. Se quedó con la mochila un rato. No quedó registrada otra acción o conversación.

CLEAN: Dijo: «No quiero» y se apartó cuando ofrecí el material. Se quedó con la mochila un rato. No quedó registrada otra acción ni conversación.

Gold:
```json
{
  "primary": null,
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": true,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: ABSTAIN (unclassified). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 0.42; suficiencia: 0.8. Costo US$0.00022260; latencia 305 ms.

### CURRENT_V2_RAW

Final: ABSTAIN (unclassified). Errores: ninguno.

Evidence seleccionada: Dijo no quiero y se apartó cuando ofrecí el material.

Evidence grounded: Dijo no quiero y se apartó cuando ofrecí el material.. Reason: Abstención: elección NO_CLASIFICABLE, confianza 0.93 (mínimo 0.50), suficiencia 0.18 (mínimo 0.70).

Confianza: 0.93; suficiencia: 0.18. Costo US$0.00032529; latencia 317 ms.

### CURRENT_V2_4_RAW

Final: ABSTAIN (unclassified). Errores: ninguno.

Evidence seleccionada: Dijo no quiero y se apartó cuando ofrecí el material.

Evidence grounded: Dijo no quiero y se apartó cuando ofrecí el material.. Reason: Abstención: elección NO_CLASIFICABLE, confianza 0.95 (mínimo 0.50), suficiencia 0.14 (mínimo 0.70).

Confianza: 0.95; suficiencia: 0.14. Costo US$0.00045742; latencia 466 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: ABSTAIN (unclassified). Errores: ninguno.

Evidence seleccionada: Dijo: «No quiero» y se apartó cuando ofrecí el material.

Evidence grounded: Dijo no quiero y se apartó cuando ofrecí el material. Reason: Abstención: elección NO_CLASIFICABLE, confianza 0.94 (mínimo 0.50), suficiencia 0.15 (mínimo 0.70).

Confianza: 0.94; suficiencia: 0.15. Costo US$0.00050480; latencia 1676 ms.

## TEST2_035

Original: Dijo a su papá que iba a volver a contar las monedas, y me dio el teléfono ficticio 000000000 para llamarlo. No es un dato de una familia real.

Anonimizada: bloqueada

CLEAN: no se llama: Privacy

Gold:
```json
{
  "primary": null,
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": false,
  "should_privacy_block": true,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: PRIVACY (privacy_blocked). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: . Reason: direct_identifier

Confianza: —; suficiencia: —. Costo US$0.00000000; latencia 0 ms.

### CURRENT_V2_RAW

Final: PRIVACY (privacy_blocked). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: . Reason: direct_identifier

Confianza: —; suficiencia: —. Costo US$0.00000000; latencia 0 ms.

### CURRENT_V2_4_RAW

Final: PRIVACY (privacy_blocked). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: . Reason: direct_identifier

Confianza: —; suficiencia: —. Costo US$0.00000000; latencia 0 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: PRIVACY (privacy_blocked). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: . Reason: direct_identifier

Confianza: —; suficiencia: —. Costo US$0.00000000; latencia 0 ms.

## TEST2_036

Original: Me mostró el dibujo de su casa y dijo mi domicilio es Avenida Ensayo 99999. Esta dirección se inventó para la prueba. Había pintado ventanas de dos colores.

Anonimizada: bloqueada

CLEAN: no se llama: Privacy

Gold:
```json
{
  "primary": null,
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": false,
  "should_privacy_block": true,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: PRIVACY (privacy_blocked). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: . Reason: identifiable_address

Confianza: —; suficiencia: —. Costo US$0.00000000; latencia 0 ms.

### CURRENT_V2_RAW

Final: PRIVACY (privacy_blocked). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: . Reason: identifiable_address

Confianza: —; suficiencia: —. Costo US$0.00000000; latencia 0 ms.

### CURRENT_V2_4_RAW

Final: PRIVACY (privacy_blocked). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: . Reason: identifiable_address

Confianza: —; suficiencia: —. Costo US$0.00000000; latencia 0 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: PRIVACY (privacy_blocked). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: . Reason: identifiable_address

Confianza: —; suficiencia: —. Costo US$0.00000000; latencia 0 ms.

## TEST2_037

Original: Explicó por dónde fue al parque con su tía; después dijo mira mi foto en https://example.invalid/registro-ficticio. Ese enlace es ficticio y no lleva a datos de menores.

Anonimizada: bloqueada

CLEAN: no se llama: Privacy

Gold:
```json
{
  "primary": null,
  "acceptable_primary": [],
  "acceptable_secondary": [],
  "should_abstain": false,
  "should_privacy_block": true,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: PRIVACY (privacy_blocked). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: . Reason: direct_identifier

Confianza: —; suficiencia: —. Costo US$0.00000000; latencia 0 ms.

### CURRENT_V2_RAW

Final: PRIVACY (privacy_blocked). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: . Reason: direct_identifier

Confianza: —; suficiencia: —. Costo US$0.00000000; latencia 0 ms.

### CURRENT_V2_4_RAW

Final: PRIVACY (privacy_blocked). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: . Reason: direct_identifier

Confianza: —; suficiencia: —. Costo US$0.00000000; latencia 0 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: PRIVACY (privacy_blocked). Errores: ninguno.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: . Reason: direct_identifier

Confianza: —; suficiencia: —. Costo US$0.00000000; latencia 0 ms.

## TEST2_038

Original: Repartió una ficha para cada bote y contó las que sobraban. Después, ya en la ronda sin los botes, contó que se había caído en la escalera de su casa y respondió cómo lo ayudó su tío. Ese relato duró un rato.

Anonimizada: Repartió una ficha para cada bote y contó las que sobraban. Después, ya en la ronda sin los botes, contó que se había caído en la escalera de su casa y respondió cómo lo ayudó su tío. [persona] relato duró un rato.

CLEAN: Repartió una ficha para cada bote y contó las que sobraban. Después, durante la ronda, sin los botes, contó que se había caído en la escalera de su casa y respondió cómo lo ayudó su tío. El relato de [persona] duró un rato.

Gold:
```json
{
  "primary": "MAT_CANTIDAD",
  "acceptable_primary": [],
  "acceptable_secondary": [
    "COM_ORAL"
  ],
  "should_abstain": false,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: MAT_CANTIDAD (review). Errores: missed_secondary.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 0.94; suficiencia: 0.9. Costo US$0.00022512; latencia 410 ms.

### CURRENT_V2_RAW

Final: MAT_CANTIDAD + COM_ORAL (review). Errores: ninguno.

Evidence seleccionada: Repartió una ficha para cada bote y contó las que sobraban.

Evidence grounded: Repartió una ficha para cada bote y contó las que sobraban.. Reason: Acción central: Resuelve problemas de cantidad; confianza 0.98, suficiencia 0.96.

Confianza: 0.98; suficiencia: 0.96. Costo US$0.00032920; latencia 401 ms.

### CURRENT_V2_4_RAW

Final: MAT_CANTIDAD (review). Errores: missed_secondary.

Evidence seleccionada: Repartió una ficha para cada bote y contó las que sobraban.

Evidence grounded: Repartió una ficha para cada bote y contó las que sobraban.. Reason: Acción central: Resuelve problemas de cantidad; confianza 0.97, suficiencia 0.95.

Confianza: 0.97; suficiencia: 0.95. Costo US$0.00046133; latencia 334 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: MAT_CANTIDAD (review). Errores: missed_secondary.

Evidence seleccionada: Repartió una ficha para cada bote y contó las que sobraban.

Evidence grounded: Repartió una ficha para cada bote y contó las que sobraban.. Reason: Acción central: Resuelve problemas de cantidad; confianza 0.97, suficiencia 0.96.

Confianza: 0.97; suficiencia: 0.96. Costo US$0.00052484; latencia 1772 ms.

## TEST2_039

Original: Puso signos en una tarjeta y dijo esto es para invitar al juego. Más tarde discutieron por quién empezaba y propuso sacar una ficha cada uno para decidir, los dos aceptaron y lo hicieron. La tarjeta seguía sobre la mesa.

Anonimizada: Puso signos en una tarjeta y dijo esto es para invitar al juego. [persona] tarde discutieron por quién empezaba y propuso sacar una ficha cada uno para decidir, los dos aceptaron y lo hicieron. La tarjeta seguía sobre la mesa.

CLEAN: Puso signos en una tarjeta y dijo: «Esto es para invitar al juego». Más tarde, discutieron sobre quién empezaba y propuso que cada uno sacara una ficha para decidir. Los dos aceptaron y lo hicieron. La tarjeta seguía sobre la mesa.

Gold:
```json
{
  "primary": "COM_ESCRITURA",
  "acceptable_primary": [],
  "acceptable_secondary": [
    "PS_CONVIVE"
  ],
  "should_abstain": false,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: PS_CONVIVE (review). Errores: wrong_primary, missed_secondary.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 0.59; suficiencia: 0.86. Costo US$0.00022462; latencia 343 ms.

### CURRENT_V2_RAW

Final: ABSTAIN (unclassified). Errores: false_abstention, missed_secondary.

Evidence seleccionada: [persona] tarde discutieron por quién empezaba y propuso sacar una ficha cada uno para decidir, los dos aceptaron y lo hicieron.

Evidence grounded: Más tarde discutieron por quién empezaba y propuso sacar una ficha cada uno para decidir, los dos aceptaron y lo hicieron. Reason: Abstención: elección PS_CONVIVE, confianza 0.49 (mínimo 0.50), suficiencia 0.95 (mínimo 0.70).

Confianza: 0.49; suficiencia: 0.95. Costo US$0.00032836; latencia 375 ms.

### CURRENT_V2_4_RAW

Final: COM_ESCRITURA + PS_CONVIVE (review). Errores: ninguno.

Evidence seleccionada: [persona] tarde discutieron por quién empezaba y propuso sacar una ficha cada uno para decidir, los dos aceptaron y lo hicieron.

Evidence grounded: Más tarde discutieron por quién empezaba y propuso sacar una ficha cada uno para decidir, los dos aceptaron y lo hicieron. Reason: Acción central: Escribe diversos tipos de textos en su lengua materna; confianza 0.53, suficiencia 0.96.

Confianza: 0.53; suficiencia: 0.96. Costo US$0.00046049; latencia 420 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: ABSTAIN (unclassified). Errores: false_abstention, missed_secondary.

Evidence seleccionada: Más tarde, discutieron sobre quién empezaba y propuso que cada uno sacara una ficha para decidir.

Evidence grounded: . Reason: Abstención: elección PS_CONVIVE, confianza 0.46 (mínimo 0.50), suficiencia 0.96 (mínimo 0.70).

Confianza: 0.46; suficiencia: 0.96. Costo US$0.00052163; latencia 2614 ms.

## TEST2_040

Original: Armó algo con cajas: acá va la ventana y este es el techo, dijo. Cambió una caja de lugar para que se pareciera al castillo que imaginaba, no miraba un modelo. No sé si era más por la forma o por inventar la casa.

Anonimizada: [persona] algo con cajas: acá va la ventana y este es el techo, dijo. [persona] una caja de lugar para que se pareciera al castillo que imaginaba, no miraba un modelo. No sé si era más por la forma o por inventar la casa.

CLEAN: [persona] algo con cajas: «Acá va la ventana y este es el techo», dijo. [persona] una caja de lugar para que se pareciera al castillo que imaginaba; no miraba un modelo. No sé si era más por la forma o por inventar la casa.

Gold:
```json
{
  "primary": "COM_ARTE",
  "acceptable_primary": [
    "MAT_FORMA"
  ],
  "acceptable_secondary": [],
  "should_abstain": false,
  "should_privacy_block": false,
  "discussable": false
}
```

### CURRENT_V1_RAW

Final: COM_ARTE + MAT_FORMA (review). Errores: unnecessary_secondary.

Evidence seleccionada: V1 no genera evidencia

Evidence grounded: —. Reason: V1 no genera reason; ver probabilidades guardadas

Confianza: 0.51; suficiencia: 0.83. Costo US$0.00022504; latencia 314 ms.

### CURRENT_V2_RAW

Final: MAT_FORMA (review). Errores: ninguno.

Evidence seleccionada: [persona] algo con cajas: acá va la ventana y este es el techo, dijo.

Evidence grounded: Armó algo con cajas: acá va la ventana y este es el techo, dijo. Reason: Acción central: Resuelve problemas de forma, movimiento y localización; confianza 0.59, suficiencia 0.87.

Confianza: 0.59; suficiencia: 0.87. Costo US$0.00032903; latencia 340 ms.

### CURRENT_V2_4_RAW

Final: MAT_FORMA (review). Errores: ninguno.

Evidence seleccionada: [persona] algo con cajas: acá va la ventana y este es el techo, dijo.

Evidence grounded: Armó algo con cajas: acá va la ventana y este es el techo, dijo. Reason: Acción central: Resuelve problemas de forma, movimiento y localización; confianza 0.95, suficiencia 0.89.

Confianza: 0.95; suficiencia: 0.89. Costo US$0.00046116; latencia 375 ms.

### CURRENT_V2_4_LUNA_CLEAN

Final: MAT_FORMA (review). Errores: ninguno.

Evidence seleccionada: [persona] algo con cajas: «Acá va la ventana y este es el techo», dijo.

Evidence grounded: Armó algo con cajas: acá va la ventana y este es el techo, dijo. Reason: Acción central: Resuelve problemas de forma, movimiento y localización; confianza 0.94, suficiencia 0.89.

Confianza: 0.94; suficiencia: 0.89. Costo US$0.00063382; latencia 4079 ms.

