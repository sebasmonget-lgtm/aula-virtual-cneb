# Lotes reales de Comunicación y Matemática para 3, 4 y 5 años

## Resultado y alcance

Solicitud: probar con IA real lotes de Comunicación y Matemática, revisar variedad y criterios por edad, conservar Ayni, no afectar aulas actuales ni publicar. Resultado: dos lotes de tres actividades revisados y confirmados únicamente en el nuevo almacén ficticio `areas-smoke-1792781906336`. Dos proyectos con cuatro actividades cada uno: una inicial escrita para QA y tres de IA real. No presentar las ocho como generadas por IA.

Las competencias de esta muestra son **COM_ORAL — Se comunica oralmente en su lengua materna** y **MAT_CANTIDAD — Resuelve problemas de cantidad**. No cubre lectura, escritura, lenguajes artísticos ni forma/movimiento/localización; tampoco todos los referentes de cada competencia. Los dieciocho criterios de los lotes aprobados se revisan contra su edad, situación y referentes oficiales heredados.

El aula, tres niños, observaciones diagnósticas, lecturas iniciales, año y maestros son un fixture manual explícitamente ficticio, sin llamadas de IA para elaborarlos. Matemática queda pendiente de observación: el plan ofrece oportunidades, no inventa un diagnóstico matemático. Recursos supuestos de QA: doce bloques grandes seguros con colores/tamaños distintos, revisados por la profesora; no un inventario de aula real. Se conservan las aulas/almacenes de muestras anteriores y no se abren cuentas cloud.

## Primeras respuestas y ajuste

Las primeras dos llamadas completaron el contrato técnico, pero se rechazaron en la revisión de QA:

- Comunicación repetía la misma frase genérica de evidencia en sus nueve variantes. Sus situaciones eran próximas a construir y conversar, sin diferenciar suficientemente el propósito del intercambio.
- Matemática incluyó una actividad titulada «Construimos torres y comparamos su altura», centrando el propósito en una relación de medida pese a tener solo referentes de cantidad. Las demás variaciones seguían siendo construcciones con conteo eventual.

No se confirmaron esas propuestas, ni se cambiaron sus IDs para aparentar que pertenecían a otra competencia. Se conservan completas bajo `history-*`, `previousCandidates` y `review-first.json`. La revisión negativa distingue referencias formalmente válidas de pertinencia pedagógica real.

Se amplía únicamente el prompt de lote, versión `multi-age-batch-local-v2`, para exigir cambios en la situación/necesidad pedagógica, propósito/desarrollo/criterio dentro de la competencia recibida y evidencia concreta para esa edad y actividad. La construcción puede ser contexto; no se cambia el objetivo a medida o espacio sin referentes autorizados. Los rangos de conteo no son cuotas obligatorias. No se modifica schema, router, modelo, escritura de notas ni prompts de generación individual/V1.

La huella incluye las instrucciones: las propuestas pendientes del prompt anterior quedan obsoletas al consultarlas y sus resultados originales permanecen guardados. Una salida antigua confirmada conserva su contenido. No hay sustitución silenciosa ni reintento automático; se solicitan dos candidatos nuevos después de dejar revisión negativa explícita.

## Lotes aprobados tras revisión

| Área | Actividad real | Situación que cambia |
| --- | --- | --- |
| Comunicación | Pedimos los bloques que necesitamos | Pedir materiales y aclarar qué necesita otra persona. |
| Comunicación | Elegimos un juego y contamos qué preferimos | Expresar preferencias y preguntar por otra propuesta. |
| Comunicación | Acordamos cómo pedir un turno en el juego | Proponer cómo pedir un turno y aclarar una propuesta ajena, observando comunicación y no calificando autocontrol. |
| Matemática | Elegimos bloques parecidos para iniciar un juego | Comparar y agrupar por una característica perceptible para un fin. |
| Matemática | Averiguamos cuántos bloques queremos usar | Elegir una colección y averiguar su cantidad cuando resulte útil. |
| Matemática | Preparamos grupos de bloques y dejamos algunos aparte | Formar un grupo, separar elementos y comunicar el criterio; contar si hace falta. |

La variedad matemática es acotada: las actividades primera y tercera están próximas en agrupación. Hay un cambio de foco hacia decidir una cantidad en la segunda, pero no se afirma diversidad de toda el área. Se aceptan como variaciones dentro del maestro y sus únicos materiales confirmados, conservando esta limitación en la revisión.

| Edad | Comunicación oral | Cantidad |
| --- | --- | --- |
| 3 | Comunicar necesidades/intereses con palabras, gestos o acciones; preguntar o responder según sus posibilidades. No exigir relato extenso ni explicación obligatoria. | Agrupar semejantes para un fin; conteo espontáneo, admitiendo orden no convencional, sin exigir llegar a cinco. |
| 4 | Expresar una idea o experiencia y preguntar o responder para aclarar algo que quiere saber. | Agrupar semejantes y oportunidades de conteo hasta cinco con material concreto cuando lo necesite. |
| 5 | Desarrollar una idea y participar escuchando, preguntando o respondiendo para obtener información. | Comunicar el criterio de agrupación y oportunidades de conteo hasta diez cuando lo necesite; no exigir ambas actuaciones juntas. |

Referentes oficiales seleccionados del catálogo local versionado y validado por hash: COM_ORAL `.3.01/.3.02`, `.4.01/.4.02`, `.5.01/.5.02`; MAT_CANTIDAD `.3.01/.3.03`, `.4.01/.4.05`, `.5.01/.5.05`, todos con prefijo `PCI2016.`. Cada criterio hereda exactamente los dos referentes de su competencia/edad; no se convierte el máximo curricular en mínimo obligatorio. Los doce bloques disponibles no implican exigir contarlos todos. Una docente puede observar una subcolección pertinente si el niño reúne más objetos que el rango previsto.

Las evidencias aprobadas describen peticiones, preguntas, respuestas, acciones de agrupación o conteo vinculadas a cada situación, usando formulaciones posibles y registro de lo que efectivamente ocurra. No son observaciones ya realizadas. La profesora acompaña por turnos con el grupo a la vista; los mayores no cuidan a los pequeños. No se añaden fotos, audio, fichas ni recursos externos.

## Llamadas, persistencia y recibos

Recibo privado: `.local/multi-age-main-20261023/lotes-areas/live-1792781906336/receipt.json`, `status:passed`. Cuatro llamadas de `gpt-6-luna`, cada una en un intento completado, sin timeout ni reintento de transporte: dos candidatos iniciales rechazados y dos nuevos tras la revisión. No ocultar las primeras llamadas al informar costo.

| Candidato | Entrada / salida (tokens) | Duración | Estimación USD |
| --- | --- | --- | --- |
| Comunicación inicial, no aplicado | 6465 / 2568 | 25,6 s | 0,0020920500 |
| Matemática inicial, no aplicado | 6221 / 2123 | 20,3 s | 0,0018390500 |
| Comunicación v2, aprobado | 6798 / 3184 | 33,5 s | 0,0024416750 |
| Matemática v2, aprobado | 6554 / 4006 | 37,9 s | 0,0026847500 |

Total estimado de esta prueba: **USD 0,0090575250**, incluidos candidatos rechazados. Las dos propuestas finales suman USD 0,0051264250. Son estimaciones del ledger, no factura ni costo de fases anteriores. Una guarda inicial del fixture rechazó fechas no equivalentes al calendario nacional antes de crear aula o llamar a IA: se corrigió el helper para usar `pilotSchoolYearDefaults`, sin relajar la guarda ni consumir una llamada por ese fallo.

El script `scripts/multi-age-area-batch-smoke.mjs` usa una base propia registrada, selecciona expresamente la clave local de texto en memoria y limita las llamadas por tarea. No modifica `.env.local` ni activa claves en el preview. Separa preparar, revisión por hash, confirmar y verificar tras reabrir; la nueva propuesta posterior a rechazo exige una opción explícita y conserva archivos originales.

La preparación preserva todo el workspace. Tras la revisión se confirma cada lote con recibo propio y se repite la confirmación para comprobar los mismos IDs. Reabrir conserva los dos maestros, las dos actividades manuales anteriores y seis nuevas, con posiciones 1–4 por proyecto. Los candidatos rechazados quedan obsoletos, con salida original conservada y sin actividades vinculadas a sus tareas. Matrícula, valoraciones/informes disponibles permanecen iguales y no se agregan notas ficticias para validar el lote.

## Validación y límites

Después del cambio de prompt: **20 pruebas distintas PASS** (19 del lote/API persistente más una del fixture de áreas), typecheck, lint y build Vinext PASS. Lint mantiene una advertencia previa; build conserva avisos de PGlite/eval, chunks y clasificación estática. La prueba del fixture verifica referentes de las tres edades, dos maestros manuales y cero tareas IA al prepararlos; rechaza sembrar sobre un aula ya existente.

Se usa el frame, timeline y lector existentes de Ayni para consultar las propuestas guardadas. Se comprueban en pantalla «Pedimos los bloques que necesitamos» y «Averiguamos cuántos bloques queremos usar», con las tres variantes y posibles evidencias. Capturas privadas `comunicacion-criterios.png` y `matematica-criterios.png` en el directorio del recibo, escritorio 1366; no se añade una nueva observación ni se asigna nivel desde la UI. El preview cambia solo al nuevo almacén ficticio, con IA desactivada para no generar al consultar; los almacenes anteriores quedan conservados. No hay nueva migración, commit, push, despliegue ni publicación.

La revisión semántica de QA es necesaria: el validador automático comprueba contrato y referentes pero no garantiza variedad ni que una consigna no se desplace pedagógicamente. Mantener revisión docente antes de usar propuestas con niños reales. Siguen pendientes otras competencias de ambas áreas, lotes reales de cinco, muestras con otros materiales y contextos, staging con cuentas propias y los módulos pendientes del recibo 12.
