# Auditoría pedagógica de la biblioteca de fichas

Fecha: 26 de septiembre de 2026. Estado: **propuesta para revisión docente; no autoriza generar fichas**.

## 1. Alcance y método

Se revisaron los **389 JSON de recursos únicos** de `C:\Users\ASUS\Documents\plantillas ayni\Fichas_MINEDU_JSON_Ayni`. El [inventario por ficha](auditoria-biblioteca-fichas-inventario.json) registra edad, área y competencia principal, capacidades consignadas, intención, acción, evidencia posible, materiales, tipo de recurso, keywords, procedencia y si conviene una experiencia previa. Las evidencias son **posibles**, no observaciones reales. El requisito de experiencia previa es un juicio pedagógico inicial, no una propiedad de la fuente.

Se excluyeron del conteo las copias de `Fichas_MINEDU_Ordenadas`, los archivos de resumen y los PDF de origen. No se leyó ni modificó el contenido de esos PDF para esta auditoría; se usaron los JSON ya enriquecidos. Tampoco se modificó ninguna ficha ni se generó una nueva. El inventario no equivale a la colección publicada en la aplicación: según [ADR 067](DECISIONS.md), la categoría Fichas de la Biblioteca aún no integra estos recursos.

El nombre y los IDs de competencia proceden de la [KB operativa v4.1](../knowledge/cneb-initial-3-5/v4.1.0/03_semantic/competencies.json). Esta es una **referencia de trabajo versionada**, no una nueva transcripción oficial: el [maestro oficial local](../curriculum/official/initial-cycle-ii-master.json) todavía declara su transcripción en revisión. Los conteos de la matriz usan la competencia principal indicada o mapeada en cada JSON; no suman una segunda vez las competencias secundarias. Una etiqueta MINEDU que mezcla una competencia con su explicación se reconoció como `PSICO_MOTRICIDAD`; 13 recursos uruguayos quedan sin asignación CNEB directa, deliberadamente.

La cobertura se valora por cantidad **y** variedad de acciones, contextos y utilidad de la ficha después de una experiencia. «Alta» no significa que todos los recursos sean publicables o que sustituyan la observación docente. Una fila de cero significa cero fichas primarias en este inventario, no ausencia de experiencias de aprendizaje. En particular, los recursos de otra competencia pueden apoyar lectura, oralidad o escritura de forma secundaria.

## 2. Resumen del inventario

| Indicador | Resultado |
|---|---:|
| Recursos únicos con JSON | 389 |
| 3 años / 4 años / 5 años | 25 / 170 / 194 |
| MINEDU Perú | 117 (52 de 4 años, 65 de 5; ninguno de 3 en este corpus) |
| Otras fuentes | 272: Argentina 79, Chile 50, Sesame Workshop/UNICEF 71, UNICEF Bolivia 30, ANEP Uruguay 42 |
| Creados por Ayni | 0 |
| Con competencia principal mapeada / sin mapeo directo | 376 / 13 |
| Confianza alta / media / baja del análisis previo | 382 / 7 / 0 |
| Recursos ANEP marcados «fuera CNEB» o para rediseño | 15; no se usan tal como están para cubrir un hueco curricular |

Las 272 fuentes externas son repertorio pedagógico local, **no una autorización de redistribución**. Sus JSON incluyen avisos de revisión de derechos y, en varios casos, de adaptación curricular. Antes de servir PDF o páginas en Ayni habrá que confirmar permisos y pertinencia. Las siete fichas de confianza media mantienen una duda específica en `C:\Users\ASUS\Documents\plantillas ayni\Fichas_MINEDU_JSON_Ayni\_enriquecimiento\reporte_enriquecimiento_completo.json`; por prudencia no sirven como única prueba de una dimensión cubierta.

Hay repetición conceptual aunque cambie el escenario: entre los 117 MINEDU, al menos 9 títulos corresponden a buscar diferencias o escenas iguales, 7 a rompecabezas/completar imagen, 6 a sudoku, 8 a poemas/adivinanzas y 8 a ordenar cuentos o secuencias. Los títulos repetidos no siempre son archivos duplicados; son variaciones de una mecánica. Asimismo, bajo `MAT_CANTIDAD` aparecen secuencias de cuentos, hábitos y actividades de atención visual: **105 es un conteo de mapeo, no 105 formas distintas de razonar cantidades**.

## 3. Matriz edad × área × competencia

Cada celda muestra **cantidad de fichas con esa competencia principal · juicio de cobertura del formato ficha**. Las áreas y competencias siguen los IDs de la KB. Las 13 uruguayas sin competencia principal no se atribuyen a una celda. «NP» significa que no se prioriza crear una ficha, aunque el inventario pueda contenerla. La aplicabilidad por edad se debe confirmar al planificar: `COM_ESCRITURA` no tiene desempeño de 3 años especificado en el programa de esta KB, y `CAST_L2_ORAL`, `TRANS_TIC` y `TRANS_AUTONOMO` solo tienen referencia específica de 5 años.

| Área | Competencia (ID) | 3 años | 4 años | 5 años | Nuevas propuestas |
|---|---|---:|---:|---:|---:|
| Personal Social | Construye su identidad (`PS_IDENTIDAD`) | 10 · adecuada/NP | 29 · adecuada/NP | 8 · adecuada/NP | 0 |
| Personal Social | Convive y participa democráticamente (`PS_CONVIVE`) | 0 · sin/NP | 5 · baja/NP | 5 · baja/NP | 0 |
| Personal Social | Identidad religiosa (`PS_RELIGION`) | 0 · sin/NP | 0 · sin/NP | 0 · sin/NP | 0 |
| Psicomotriz | Motricidad autónoma (`PSICO_MOTRICIDAD`) | 4 · baja/NP | 11 · adecuada/NP | 5 · baja/NP | 0 |
| Comunicación | Comunicación oral (`COM_ORAL`) | 0 · sin/NP | 14 · adecuada/NP | 16 · adecuada/NP | 0 |
| Comunicación | Lectura de diversos textos (`COM_LECTURA`) | 0 · sin/NP | 10 · adecuada | 16 · adecuada | 1, a los 4 |
| Comunicación | Escritura de diversos textos (`COM_ESCRITURA`) | 0 · sin/NP | 0 · sin | 6 · adecuada | 1, a los 4 |
| Comunicación | Creación artística (`COM_ARTE`) | 7 · baja/NP | 27 · adecuada/NP | 3 · baja/NP | 0 |
| Castellano como Segunda Lengua | Comunicación oral en castellano (`CAST_L2_ORAL`) | 0 · sin/NP | 0 · sin/NP | 0 · sin/NP | 0 |
| Matemática | Problemas de cantidad (`MAT_CANTIDAD`) | 2 · baja | 43 · adecuada | 60 · alta | 0; reutilizar/adaptar |
| Matemática | Forma, movimiento y localización (`MAT_FORMA`) | 0 · sin | 23 · adecuada | 42 · alta | 1, a los 3 |
| Ciencia y Tecnología | Indagación (`CYT_INDAGA`) | 2 · baja | 8 · adecuada | 20 · alta | 2: 3 y 4 años |
| Transversal | Entornos virtuales TIC (`TRANS_TIC`) | 0 · sin/NP | 0 · sin/NP | 0 · sin/NP | 0 |
| Transversal | Aprendizaje autónomo (`TRANS_AUTONOMO`) | 0 · sin/NP | 0 · sin/NP | 0 · sin/NP | 0 |

Totales por competencia principal: `PS_IDENTIDAD` 47, `PS_CONVIVE` 10, `PS_RELIGION` 0, `PSICO_MOTRICIDAD` 20, `COM_ORAL` 30, `COM_LECTURA` 26, `COM_ESCRITURA` 6, `COM_ARTE` 37, `CAST_L2_ORAL` 0, `MAT_CANTIDAD` 105, `MAT_FORMA` 65, `CYT_INDAGA` 30, `TRANS_TIC` 0 y `TRANS_AUTONOMO` 0. A estos 376 se suman 13 recursos ANEP sin mapeo directo para llegar a 389.

## 4. Diversidad real y huecos

| Competencia y edad | Acciones y contextos ya presentes | Hueco o cautela | Respuesta |
|---|---|---|---|
| Cantidad, 3 | Clasificar objetos cotidianos; memoria de números 1–4. | Poco reparto/comprobación a esta edad y ninguna fuente MINEDU de 3 años en el corpus. | **No crear todavía** una ficha equivalente a «Ayudamos a repartir platos y cubiertos» (4 años): probar su adaptación con menos elementos y objetos reales. |
| Cantidad, 4 | Conteo de frutas/animales/ropa, agrupación, seriación, ordinales, correspondencia plato-persona y gallina-huevo; juegos y registro. | Muchas barras de conteo con contexto cambiado; menor variedad de decisiones reales que el número bruto sugiere. | 0 nuevas. Usar primero las de repartir, completar y decidir; no otra lámina de contar dibujos. |
| Cantidad, 5 | Además de conteo: cartas, dados, completar diez sandías, decidir asientos de una combi, repartir anchovetas, comparar y registrar resultados. | Sudokus, cuentos ordenados y búsqueda de diferencias inflan el mapeo sin ampliar razonamiento de cantidades. | 0 nuevas; curar selección y contexto previo. |
| Forma/localización, 3 | Ninguna ficha principal. | Falta un registro espacial muy simple nacido del movimiento real, no otro laberinto impreso. | 1 nueva, B1. |
| Forma/localización, 4–5 | Rompecabezas, sombras, recorridos, cuadros de doble entrada, figuras, medición y construcción; varios escenarios. | Rompecabezas y sudoku se repiten, pero hay diversidad suficiente. | 0 nuevas. |
| Lectura, 4–5 | Cuentos, poemas, adivinanzas, recetas e instructivos de plegado. | Predominan textos literarios e instructivos; escasea lectura situada de avisos auténticos del aula. Las seis recetas argentinas de 5 años no son seis géneros. | 1 nueva a los 4, reutilizable con mediación más compleja a los 5 (B4). |
| Escritura, 4 | Sin ficha de competencia principal; una tarjeta afectiva de otra área permite dibujar, pero no es una lista para un destinatario y fin reales. | Falta producir escritura emergente funcional, sin exigir letras convencionales ni planas. | 1 nueva, B3. |
| Escritura, 5 | Nombre propio, reglas, cuento y letras/objetos; seis recursos. | La variedad es razonable si se usan como escritura con propósito, no copia de grafías. | 0 nuevas; ampliar oportunidades dentro de las actividades. |
| Indagación, 3 | Buscar animales y registro general de los sentidos. | Falta representar un **cambio observado** en dos momentos tras manipular. | 1 nueva, B2. |
| Indagación, 4 | Huellas, cielo, lentejas, seres vivos y aves. | Falta una comparación breve de predicción y observación sobre el mismo fenómeno cercano; las sombras existentes son principalmente artísticas. | 1 nueva, B5. |
| Indagación, 5 | Viento, insectos, mezclas, germinación, cielo y flotación; acciones de observar, anticipar, probar y comunicar. | Hay amplitud suficiente; fortalecer mediación y preguntas antes de imprimir. | 0 nuevas. |

La clasificación primaria existente no siempre refleja el foco de la acción. Por ejemplo, algunas secuencias de cuentos figuran en cantidad; una ficha MINEDU combina en el título un cruce del río y sombras de animales, pero el texto disponible solo describe sombras. El inventario conserva la procedencia y no corrige los JSON fuente. Antes de importar a la app se necesita una curaduría editorial de competencia principal/secundaria por ficha.

## 5. Competencias con «NO PRIORIZAR FICHA»

| Competencia | Motivo y experiencia/evidencia más apropiada |
|---|---|
| `PS_IDENTIDAD` | Emociones, pertenencia y autonomía se comprenden mejor en elección real, conversación y rutinas; evidencia: lo que el niño dice o hace en contexto, registrado por la docente. Las láminas emocionales son apoyos, no sustitutos. |
| `PS_CONVIVE` | Conocer oficios no demuestra convivencia democrática. Priorizar acuerdos, turnos, ayuda mutua y resolución de un conflicto durante juego o proyecto; evidencia observada, no respuesta marcada. |
| `PS_RELIGION` | No fabricar fichas para cubrir un cero; depende del contexto, opción institucional y experiencias de diálogo/participación pertinentes. |
| `PSICO_MOTRICIDAD` | El movimiento, equilibrio y coordinación requieren juego corporal y observación; un papel puede documentar después, pero no demostrar la competencia por sí solo. |
| `COM_ORAL` | Narrar, conversar, escuchar e intercambiar turnos ocurre en situaciones comunicativas reales. Una imagen puede provocar conversación, no reemplazarla. |
| `COM_ARTE` | Colorear láminas no equivale a crear proyectos artísticos. Priorizar taller gráfico-plástico, juego dramático, música y elección de materiales; conservar producciones y relato del proceso. |
| `CAST_L2_ORAL` | Solo si corresponde al perfil lingüístico: interacción oral situada, juegos y escucha en castellano como segunda lengua; no hoja de vocabulario para llenar el cero. |
| `TRANS_TIC` | Si hay dispositivos disponibles y pertinencia: acción segura en un entorno digital y observación docente; una ficha impresa no evidencia desempeño en TIC. |
| `TRANS_AUTONOMO` | Planificar, probar, pedir apoyo y revisar una tarea a lo largo del tiempo; evidencia del proceso y reflexión, no hoja aislada. |
| `COM_LECTURA` a los 3 y `COM_ESCRITURA` a los 3 | En lectura, priorizar libros compartidos y conversación. Para escritura, la KB no publica desempeño específico de 3 años; ofrecer marcas y juego gráfico con sentido, sin ficha para forzar letras. |

## 6. Priorización y cantidad propuesta

**Prioridad 1 — tres fichas nuevas:** B1 (forma/localización, 3), B2 (indagación, 3) y B3 (escritura, 4). Son edades/acciones poco representadas y el formato ofrece un registro útil **después** de actuar.

**Prioridad 2 — dos fichas nuevas:** B4 (lectura de aviso funcional, 4, adaptable a 5) y B5 (cambio de sombra observado, 4). Añaden un género o una secuencia de indagación, no otra ilustración decorativa.

**Prioridad 3 — cero fichas nuevas por ahora:** seleccionar mejor las existentes, adaptar para 3 años la correspondencia plato-persona y verificar las siete dudas del análisis. Estas tareas pueden aumentar cobertura útil sin un PDF nuevo.

**No priorizar — cero fichas nuevas** para las competencias de la sección anterior. La ausencia numérica se atiende con mejores experiencias y observación, no con una cuota de impresos.

**Total recomendado ahora: 5 fichas nuevas**, sujeto a revisión docente de estos blueprints. No se propone una cantidad fija por competencia ni se pretende cubrir las 42 celdas con impresos.

## 7. Blueprints previos a cualquier diseño visual

En los cinco casos, la secuencia didáctica es **explorar/manipular → conversar → resolver → representar o registrar**. El PDF futuro sería el último apoyo, nunca la experiencia completa. Ningún personaje oficial de Ayni se coloca como adorno: si más tarde se usa Leo, Luna, Mateo, Sofía, Maestra Rosa o Inti, tendrá una necesidad o decisión real en la situación. Estos bocetos no requieren personaje.

### B1 · Prioridad 1 · recorrido vivido, no laberinto de papel

```json
{
  "edad": 3,
  "area": "Matemática",
  "competencia": "Resuelve problemas de forma, movimiento y localización",
  "capacidades": ["Usa estrategias y procedimientos para orientarse en el espacio", "Comunica su comprensión sobre las formas y relaciones geométricas"],
  "titulo_provisional": "Así llevé el muñeco a su lugar",
  "situacion": "Después de trasladar un muñeco entre dos lugares reales del aula y probar rutas con el cuerpo, el niño reconoce en una lámina simple los dos hitos de su propio trayecto.",
  "accion_del_nino": ["recorrer físicamente el trayecto", "señalar inicio y destino", "trazar o marcar cómo llegó y contarlo"],
  "proposito": "Representar una relación espacial vivida usando referencias cercanas, sin exigir lectura de plano.",
  "evidencia": "Trazo o marcas del recorrido y explicación oral del niño; la docente observa también el desplazamiento real.",
  "materiales": ["muñeco del aula", "dos referencias espaciales reales", "hoja con espacios amplios", "crayón"],
  "keywords": ["recorrido vivido", "inicio", "destino", "orientación espacial"],
  "tipo_ficha": "registro espacial posterior al juego",
  "requiere_experiencia_previa": true
}
```

No duplica «Camino del gato al tazón» (4 años), que es un laberinto ya dibujado: aquí se representa un trayecto corporal propio con pocos hitos. Si la docente puede reutilizar el recurso de 4 años sin rediseño de la demanda, B1 se cancela.

### B2 · Prioridad 1 · cambio concreto, no inventario sensorial

```json
{
  "edad": 3,
  "area": "Ciencia y Tecnología",
  "competencia": "Indaga mediante métodos científicos para construir sus conocimientos",
  "capacidades": ["Problematiza situaciones para hacer indagación", "Genera y registra datos o información"],
  "titulo_provisional": "La tela antes y después del agua",
  "situacion": "El niño toca y observa un trozo de tela seco; anticipa qué pasará y, después de que un adulto lo humedezca con poca agua, vuelve a observarlo y conversa sobre el cambio.",
  "accion_del_nino": ["observar y representar la tela seca", "anticipar qué sentirá o verá después", "explorar con seguridad la misma tela húmeda, registrar el segundo momento y contar qué cambió"],
  "proposito": "Distinguir y comunicar un cambio observable en un material cercano.",
  "evidencia": "Dos representaciones sencillas y explicación oral; la docente registra la exploración efectiva.",
  "materiales": ["un trozo grande de tela", "poca agua", "bandeja", "hoja con dos espacios", "crayones"],
  "keywords": ["seco", "mojado", "antes", "después", "cambio observado"],
  "tipo_ficha": "registro de exploración en dos momentos",
  "requiere_experiencia_previa": true
}
```

No duplica «A explorar con mis sentidos» (3 años), que registra una exploración general de cinco sentidos, ni las mezclas de 5 años: observa un solo cambio material accesible a los 3.

### B3 · Prioridad 1 · escritura con destinatario y uso real

```json
{
  "edad": 4,
  "area": "Comunicación",
  "competencia": "Escribe diversos tipos de textos en su lengua materna",
  "capacidades": ["Adecúa el texto a la situación comunicativa", "Organiza y desarrolla las ideas de forma coherente y cohesionada"],
  "titulo_provisional": "Nuestra lista para preparar el taller",
  "situacion": "El grupo decide qué objetos necesitará para un taller ya elegido y entrega su lista a quien ayudará a prepararlo.",
  "accion_del_nino": ["elegir materiales necesarios entre objetos reales", "representarlos con dibujos, marcas o escritura emergente", "usar la lista para comprobar lo reunido"],
  "proposito": "Producir una lista con intención comunicativa, sin exigir escritura convencional.",
  "evidencia": "Lista elaborada por el niño y su explicación de qué falta o ya se reunió.",
  "materiales": ["materiales reales del taller", "papel con espacio libre", "lápices o plumones"],
  "keywords": ["lista", "escritura emergente", "destinatario", "taller", "comprobación"],
  "tipo_ficha": "soporte de escritura funcional",
  "requiere_experiencia_previa": true
}
```

No duplica la tarjeta afectiva de 4 años ni el nombre propio/reglas/cuentos de 5: el género lista se usa para preparar y comprobar una acción del grupo. Si una lista ya existe en otro recurso no catalogado, retirar B3.

### B4 · Prioridad 2 · texto funcional del entorno

```json
{
  "edad": 4,
  "area": "Comunicación",
  "competencia": "Lee diversos tipos de textos escritos en su lengua materna",
  "capacidades": ["Obtiene información del texto escrito", "Infiere e interpreta información del texto escrito"],
  "titulo_provisional": "¿Qué nos pide este aviso?",
  "situacion": "Tras encontrar y comentar avisos auténticos en el aula, el niño observa dos avisos breves con texto e imagen y decide cuál corresponde a una situación real de cuidado del espacio.",
  "accion_del_nino": ["observar el aviso en su lugar de uso", "anticipar qué comunica apoyándose en imagen, palabras conocidas y contexto", "seleccionar el aviso pertinente y explicar por qué"],
  "proposito": "Interpretar un texto funcional sin exigir decodificación convencional.",
  "evidencia": "Selección justificada oralmente y marcas opcionales en el soporte.",
  "materiales": ["dos avisos originales o creados para el aula", "fotografías de sus lugares de uso", "hoja de comparación", "crayón"],
  "keywords": ["aviso", "texto funcional", "contexto", "inferencia"],
  "tipo_ficha": "lectura situada de avisos",
  "requiere_experiencia_previa": true
}
```

No duplica poemas, adivinanzas, recetas ni instructivos existentes. Una sola ficha puede reutilizarse a los 5 años con conversación más compleja; no se propone otra que cambie únicamente la edad.

### B5 · Prioridad 2 · observación del mismo fenómeno en dos momentos

```json
{
  "edad": 4,
  "area": "Ciencia y Tecnología",
  "competencia": "Indaga mediante métodos científicos para construir sus conocimientos",
  "capacidades": ["Problematiza situaciones para hacer indagación", "Genera y registra datos o información", "Analiza datos e información"],
  "titulo_provisional": "La sombra cambió de lugar",
  "situacion": "Con acompañamiento, el grupo marca la sombra de un objeto fijo en un espacio seguro y vuelve a observarla más tarde el mismo día.",
  "accion_del_nino": ["decir dónde cree que estará la sombra después", "comparar las dos marcas reales", "representar ambos momentos y explicar qué notó"],
  "proposito": "Comparar una predicción sencilla con una observación posterior del mismo fenómeno.",
  "evidencia": "Registro de dos posiciones y explicación oral; la docente conserva la predicción inicial y la comparación real.",
  "materiales": ["objeto fijo", "espacio exterior seguro", "tiza", "hoja de dos momentos", "crayones"],
  "keywords": ["sombra", "predicción", "dos momentos", "cambio", "observación"],
  "tipo_ficha": "registro de indagación posterior a exploración",
  "requiere_experiencia_previa": true
}
```

No duplica las fichas chilenas de 4 años sobre **crear figuras artísticas** con sombras; aquí se observa, anticipa y contrasta el desplazamiento de la sombra de un mismo objeto. Si el aula no dispone de un lugar seguro y dos momentos comparables, no usar la ficha.

## 8. Condiciones antes de generar

1. La docente confirma o elimina cada blueprint; no hay generación automática por déficit numérico.
2. Antes de diseñar una página, se confirma que la actividad previa sea factible para la edad y el aula y que la ficha registre una decisión/observación real.
3. Se verifica si la selección o adaptación de un recurso ya existente resuelve el mismo propósito. En particular, probar primero los recursos de reparto de 4 años para cantidad a los 3.
4. Cualquier personaje de Ayni deberá actuar dentro del problema, no decorar la página. No se copian ilustraciones ni diseños de las fuentes externas.
5. Se curan mapeo curricular, siete fichas dudosas, permisos de distribución y recursos ANEP fuera de CNEB antes de publicar el inventario en la aplicación.

La reversión de esta etapa consiste únicamente en retirar estos dos archivos de auditoría. Los JSON y PDF de origen permanecen intactos.
