# Observaciones y Jev real

## Corte posterior P4: 138 evidencias de período y límite Jev

P4 añadió 24 notas desde la UI, cotejadas una a una por alumno/fecha/texto con exportación QA de solo lectura. Total de la continuación: P1 74 + P2 20 + P3 20 + P4 24 = **138** evidencias ordinarias de período, además de las notas diagnósticas iniciales. En P4, Elena tiene un registro de lectura vago («estuvo atenta») que permanece sin letra; la falta de dato no se llamó C. Se conservaron contextos contradictorios de Bruno y Alma y el uso de apoyos de acceso de Mateo.

**La hipótesis Jev con actividad + propósito + criterio + proyecto + contexto continúa NO PROBADA.** Estas 138 notas se vinculan al criterio curricular confirmado por la profesora, sin pasar por el clasificador Jev. Los cinco usos reales de Jev para imagen y uno para ficha son tareas distintas basadas en metadatos. No se agregan a los 24 casos de clasificación diagnóstica ni se anuncia mejora de accuracy.

## DESPUÉS DEL FIX — distinguir decisiones Jev de notas de actividad

La muestra diagnóstica original se conserva íntegra debajo: 24 casos predefinidos, 46 llamadas, tres intervenciones docentes. No se reetiquetó retrospectivamente para mejorar el resultado. En la continuación hasta lectura P4 hay 119 evidencias ordinarias de período (P1 74/P2 20/P3 20/P4 5): su competencia procede del criterio confirmado de actividad/taller, **sin llamada clasificadora Jev**. Por tanto la prueba de mejora por añadir propósito/criterio/proyecto es **NO PROBADA**, no 119 aciertos de Jev.

Jev sí se ejecutó cinco veces para imágenes de experiencias y una para ficha de taller (abstención). Decisiones sobre descripciones/metadatos, no análisis de píxeles de imágenes o PDF. La quinta recomendó «Sofía y Mateo eligen libros» para cuentos P4, se eligió en UI y se confirmó en el proyecto. Estas llamadas aparecen por separado en el ledger acumulativo; no certifican precisión curricular del clasificador de observaciones.

Las notas ambiguas del período se conservaron como registros, no se convirtieron en niveles: Camila P2 recibió análisis IA explícitamente insuficiente; Elena P3/P4 no tiene letra desde «se divirtió/estuvo atenta». H47 corrige cuatro atribuciones de alumno de captura automatizada por UI antes del assessment; no fue fallo Jev ni se borró la historia.

Se fijaron 24 casos antes de ejecutarlos (`jev-casos-previos.json`) y se ingresaron por la pantalla Observación espontánea. Se conservaron notas imperfectas, tildes, nombres ficticios, dos competencias, fortalezas, dificultades contextuales y hechos no clasificables. Resultados UI originales: `jev-resultados-ui.json`. No se cambiaron umbrales ni prompts para esta auditoría.

La implementación existente ejecuta una Choice para competencia principal y Noul independientes para candidatos adicionales, en dos llamadas concurrentes por observación. Jev efectivo comprobado en logs: `typesafe/jev-1.13-20260917`, KB 4.1.0. No equivale a comparar los dos métodos por separado: se auditó el híbrido del flujo docente.

## Resultado del conjunto inicial

| Casos | Esperado | Resultado observado | Juicio |
| --- | --- | --- | --- |
| J01–J09 | Convivencia, incluidos conflictos y mediación | Convivencia en todos | Correcto |
| J10 | Indagación con propuesta de comprobación | Indagación | Correcto |
| J11 | Cantidad mediante reparto y verificación | Cantidad | Correcto |
| J12 | Arte mediante creación musical | Arte | Correcto |
| J13 | Lectura de indicios de portada | Lectura | Correcto |
| J14 | Oralidad en pareja, sin diagnóstico | Oralidad | Correcto |
| J15 | Ninguna, información escasa | Solicita más detalle | Correcto |
| J16 | Convivencia principal y cantidad secundaria | Cantidad principal y convivencia adicional | Discutible en el orden; conjunto correcto. Usar recomendación adoptó solo cantidad y hubo que agregar convivencia manualmente. |
| J17 | Convivencia lograda en contexto pequeño | Convivencia | Correcto; no elimina contradicción J02 |
| J18 | Escritura emergente con propósito | Bloqueo `privacy_blocked`, sin llamada a Jev | Incorrecto como resultado del sistema; no es un error de Jev |
| J19 | Forma, movimiento y localización | Misma competencia | Correcto |
| J20 | Ninguna, «portándose bien» no describe aprendizaje | Solicita más detalle | Correcto |
| J21 | Oralidad, no ciencia por mencionar mariposa | Oralidad | Correcto |
| J22 | Arte, no ciencia por tema de mariposa | Arte | Correcto |
| J23 | Motricidad | Motricidad | Correcto |
| J24 | Identidad, preferencia y expresión de incomodidad | Solicita más detalle, fuente Jev | Omisión; requiere docente |

21 correctos, 1 discutible y 2 fallos/omisiones del sistema en estos 24 casos diseñados. No es una estimación de precisión poblacional, no tiene revisión independiente ni muestra aleatoria y no se extrapola a todas las observaciones. Entre 22 notas clasificables, se obtuvo principal esperado en 19; J16 aporta el conjunto esperado con orden distinto.

Se realizaron tres intervenciones por UI para continuar: agregar convivencia en J16, elegir escritura en J18 y elegir identidad en J24. Se conservaron tanto el ground truth como la salida anterior a la corrección. J15 y J20 permanecen sin competencia.

## Costos y observabilidad

Checkpoint tras las 24 notas: 46 llamadas reales de OpenRouter, costo informado por proveedor US$0.006730752, 23 pares de llamadas; J18 no salió al proveedor. Son los costos de esta fase, no el total anual ni factura de OpenAI.

Tiempo UI guardar→resultado observado en J02–J14 y J16–J24: aproximadamente 2.2 segundos por caso; incluye el sondeo de la pantalla, no es latencia pura del modelo. La latencia del proveedor está en los eventos `jev_decision` del log y se consolidará aparte.

La API devuelve probabilidades, pero el flujo no las conserva ni muestra. `classification_confidence` quedó null incluso en decisiones sugeridas; el método descarta `decision_metadata` antes de persistir. No se inventan porcentajes de confianza. Esto impide auditar la calibración y distinguir qué umbral causó J24.

## Tabla por observación, antes de corregir

Los textos íntegros esperados y las tarjetas UI originales están en los JSON. En esta tabla se abrevia la nota sin cambiar su sentido. «Confianza no guardada» significa dato ausente, NO 0% ni baja confianza. Conv=convivencia; Ind=indagación; Cant=cantidad; Art=arte; Lec=lectura; Ora=oralidad; Esc=escritura; Forma=forma/movimiento/localización; Mot=motricidad; Id=identidad.

| Caso y observación | Esperado | Elegido por sistema | Confianza | Juicio y explicación |
| --- | --- | --- | --- | --- |
| J01 Alma toma lupa y vuelve a cogerla antes del acuerdo | Conv | Conv | No guardada | Correcto: turnos y materiales |
| J02 Bruno quita pieza; acepta reparto con recordatorio | Conv | Conv | No guardada | Correcto: actuación contextual, no etiqueta |
| J03 Camila no presta palita; con ayuda eligen una cada una | Conv | Conv | No guardada | Correcto: compartir, no ciencia por estar sembrando |
| J04 Diego toma carro, se va ante turnos y vuelve con apoyo visual | Conv | Conv | No guardada | Correcto: acuerdo con mediación |
| J05 Elena exige mismo rol; acepta cambios con ayuda | Conv | Conv | No guardada | Correcto: decisiones comunes |
| J06 Fabio toma bloques de otro puente; requiere recordatorios | Conv | Conv | No guardada | Correcto: acuerdo y respeto del trabajo común |
| J07 Gabi propone turno de colores, pero los retiene | Conv | Conv | No guardada | Correcto: diferencia propuesta de cumplimiento |
| J08 Hugo deja a dos sin material; acompaño reparto acordado | Conv | Conv | No guardada | Correcto: participación de todos, no cantidad sin conteo |
| J09 Valeria espera con recordatorio tras jalar pala | Conv | Conv | No guardada | Correcto: línea base con apoyo |
| J10 Inés propone comprobar semillas con/sin luz y dibujar cambios | Ind | Ind | No guardada | Correcto: pregunta y comprobación explícitas |
| J11 Thiago reparte 8 semillas en 4 macetas y verifica | Cant | Cant | No guardada | Correcto: solución de reparto/conteo |
| J12 Joaquín inventa canción y ajusta ritmo para expresar | Art | Art | No guardada | Correcto: producción expresiva |
| J13 Kiara anticipa historia desde portada y explica indicio | Lec | Lec | No guardada | Correcto: lectura de indicios, no oralidad por solo hablar |
| J14 Mateo se aleja en grupo; en pareja narra y responde | Ora | Ora | No guardada | Correcto: evidencia situada sin diagnóstico clínico |
| J15 Omar llegó tarde y miró; no alcancé a registrar más | Ninguna | Ninguna, pedir detalle | No guardada | Correcto: no inventa competencia |
| J16 Valeria cuenta 6, reparte tres y negocia alternar palita | Conv + Cant | Cant + Conv adicional | No guardada | Discutible solo orden; ambas defendibles. Adopción automática no incluyó secundaria |
| J17 Bruno propone y cambia roles de riego sin recordatorio | Conv | Conv | No guardada | Correcto: progreso contextual, no niega J02 |
| J18 Elena hace lista con marcas/letras para recordar semillas a mamá | Esc | Bloqueo local, no Jev | No aplica | Incorrecto del sistema: filtro de palabra familiar |
| J19 Hugo explica recorrido, lo prueba y corrige giro | Forma | Forma | No guardada | Correcto: ubicación/recorrido explícitos |
| J20 Fabio polo rojo y «portándose bien» | Ninguna | Ninguna, pedir detalle | No guardada | Correcto: juicio vago no evidencia |
| J21 Camila explica mariposa, escucha y añade información | Ora | Ora | No guardada | Correcto: no indagación por tema insectos |
| J22 Gabi dobla/pinta mariposa y cambia alas para expresar vuelo | Art | Art | No guardada | Correcto: creación, no ciencia por tema |
| J23 Alma ajusta distancia de salto y equilibrio | Mot | Mot | No guardada | Correcto: acción corporal y ajuste |
| J24 Mateo expresa gusto, molestia con ruido y pide lugar tranquilo | Id | Ninguna, pedir detalle | No guardada | Omisión defendible como alerta prudente, pero pierde evidencia explícita de identidad |

No se probó el efecto de añadir un criterio de actividad: estos casos son diagnósticos y el contexto disponible es el de la pantalla, con sus categorías de juego/exploración/rutina. No tienen actividad/Project Master confirmados. Las frases incompletas y errores leves no impidieron los aciertos claros; esto no es un estudio controlado de sensibilidad lingüística.

Fuentes de contraste: [Jev 1.13 y tarifa pública](https://openrouter.ai/typesafe/jev-1.13), [probabilidades y decisiones según OpenRouter](https://openrouter.ai/blog/insights/what-is-jev/). Una probabilidad o confianza alta no demuestra por sí sola un acierto curricular.
