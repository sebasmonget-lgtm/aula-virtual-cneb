> Nota posterior: esta auditoría describe un formato histórico con sugerencia de nota. La decisión vigente elimina toda sugerencia y limita el párrafo a 30–70 palabras; ver QA_EVALUAR_SOLO_ANALISIS_2026-10-20.md.

# Primera prueba de análisis breve del bimestre

20/10/2026. Implementación local; no publicada.

Una llamada por niño y competencia, Luna low, tres en paralelo y sin fallback oculto. La sugerencia AD/A/B/C se guarda como orientación separada; no selecciona ni confirma la valoración docente.

El contexto incluye nombre/edad, período, competencia/capacidades, un estándar completo del ciclo II y los desempeños oficiales de esa edad, criterios trabajados y observaciones originales fechadas. No envía imágenes, asistencia, entrevistas, proyectos completos ni el currículo completo. El estándar de ciclo II es el horizonte final, no una exigencia uniforme para tres y cuatro años.

El contraste de entrada representativo pasó de 7.267 a aproximadamente 1.800–1.950 tokens, sin resumir ni eliminar observaciones. Se conserva la distinción entre lo previsto y lo realmente observado. La ausencia de evidencia no equivale a C. No hay mínimos inventados de días ni conteo de desempeños para calcular letras.

## Resultados y límites

Diez casos distintos; once respuestas válidas contando una repetición dirigida. Cuatro pares proceden de observaciones de la cuenta QA y seis son casos controlados. Se probaron acciones de otro niño, datos irrelevantes, apoyo frecuente, actuaciones avanzadas y resultados contradictorios. Las dos evidencias ajenas/irrelevantes quedaron sin letra. Las propuestas válidas fueron A, B o sin sugerencia; AD/C aún requieren contraste con una profesora. No presentar esta muestra como calibración completa de la escala.

Se corrigió una regla que dejaba sin sugerencia un caso pertinente por estar observado en un único día. La repetición del mismo caso pasó de null a A. Es una mejora del criterio de suficiencia, también una señal de sensibilidad al prompt que exige supervisión docente.

Costo estimado de toda la ronda de desarrollo: USD 0.00753762 (18 llamadas, incluidas siete respuestas rechazadas al desarrollar el validador). Las seis primeras respuestas válidas costaron USD 0,002354175. Los casos válidos recientes rondan USD 0,00034–0,00055 por par; para 200 pares similares, aproximadamente USD 0,07–0,11, sin reintentos. Más observaciones pueden aumentar el costo. Son estimaciones por uso, no factura ni presupuesto garantizado.

## Implementación y seguridad

Preparar evaluación consulta primero lo guardado. Reutiliza análisis vigentes, conserva ediciones docentes y guarda cada resultado antes de continuar. Un reintento procesa lo pendiente; nuevas observaciones invalidan solo lo afectado. Antes del fin del bimestre, Cancelar y volver es la acción principal y Continuar espera cinco segundos reales. Se conserva revisión manual, enlaces y autorización de aula/cierre del servidor. Sin migración ni modificación de notas confirmadas.

Analizar evidencias sí llama a IA: el fallo observado era una revisión bigint que PostgreSQL devolvía como cadena y se comparaba con un número, provocando un falso conflicto después de generar. Se normaliza antes de guardar; regresión red/green y error visible junto al botón.

## Validación

87 regresiones PASS; repetición dirigida de cuatro pruebas de flujo PASS (subconjunto, no 91 únicas). Lint, npx tsc --noEmit, build Vinext y build Next webpack PASS. UI con componentes reales y API simulada local: escritorio y celular de 390px, cancelación, espera, avance, radios sin nota, sugerencia separada, desplegable oficial y error localizado. La IA real se probó mediante el pipeline común con texto de QA, sin escribir borradores/observaciones/valoraciones cloud; solo telemetría de uso. Cero notas confirmadas antes y después. El nuevo flujo no se probó desplegado ni se publicó.

Rollback: revertir conjuntamente perfil breve, catálogo acotado, preparación y rama analysis del lote; conservar contratos anteriores y borradores/historial. Sin restaurar datos ni deshacer migraciones.

Fuentes: [Programa Curricular de Educación Inicial](https://www.minedu.gob.pe/curriculo/pdf/programa-curricular-educacion-inicial.pdf), [CNEB](https://www.minedu.gob.pe/curriculo/pdf/curriculo-nacional-de-la-educacion-basica.pdf), [modelo y precios](https://developers.openai.com/api/docs/models/gpt-6-luna). Extractos oficiales versionados con páginas y hashes; guías y escala breve son paráfrasis orientativas, no rúbricas oficiales por letra.

## Muestras generadas

### Emilia Cárdenas Ruiz · COM_LECTURA

Emilia relacionó imágenes con información de los textos: explicó que el personaje volvió a construir y vinculó “páginas” con la imagen de un libro. En la adivinanza, señaló la forma curva de la luna, la relacionó con la pista de la sonrisa y explicó por qué descartaba el sol. Estas actuaciones se relacionan con la interpretación de indicios y la explicación de una respuesta; falta observar cómo opina sobre otros textos y si revisa su interpretación en más situaciones.

Sugerencia: **A**. Las evidencias muestran interpretación de pistas e imágenes y una explicación coherente con lo esperado para su edad.

### Camila Huamán Castro · PS_CONVIVE

Camila expresó que le molestó que tomaran su canasta y acordó usar una cada una para continuar el juego. Al guardar los bloques, escuchó la preferencia de otro niño y acordaron hacerlo juntos. En la actividad grupal, propuso escuchar a quienes querían cantar y aceptó que un compañero participara mirando. Estas actuaciones muestran que toma acuerdos y considera distintas formas de participar; falta observar cómo participa en otras situaciones de cuidado de los espacios y materiales comunes.

Sugerencia: **A**. De manera provisional, se sugiere A porque Camila escuchó a sus compañeros, tomó acuerdos y aceptó distintas formas de participar.

### Diego Ramos Vega · CYT_INDAGA

Diego agrupó y contó semillas, propuso que las grandes podrían crecer más y sugirió mirarlas varios días. Al encontrar raíces, notó que no todas cambiaban al mismo tiempo y pidió volver a observarlas. Estas acciones muestran curiosidad, una posible explicación y una propuesta para buscar información; falta observar qué descubre al volver a mirarlas y cómo compara y comunica lo aprendido.

Sugerencia: **A**. Sus agrupaciones, explicaciones y propuestas de observación muestran actuaciones acordes con lo esperado para su edad en estas situaciones.

### Luciana Torres Medina · MAT_CANTIDAD

En “La tienda”, Luciana eligió la bolsa roja y pidió sentarse junto a su amiga. No se registró qué hizo al contar o repartir objetos, así que estas acciones no permiten valorar cómo compara cantidades. Falta observar cómo reparte y qué hace o dice al comparar las cantidades.

Sugerencia: **Sin sustento suficiente**. La observación registra la elección de una bolsa y una petición, pero no una actuación sobre cantidades.

### Valentina Rojas Salazar · MAT_CANTIDAD

Valentina preparó cuatro semillas para cada recipiente y comparó las cantidades. También organizó los recipientes según cuántas semillas se abrieron, comparó el resultado con lo que había pensado y propuso repetir la observación. Estas acciones muestran el uso de cantidades y comparaciones en una situación concreta, en línea con lo esperado para su edad. Falta observar otras situaciones de conteo, agrupación y uso de expresiones de cantidad.

Sugerencia: **A**. La preparación de cuatro semillas por recipiente y la comparación de cantidades aportan evidencia pertinente, aunque acotada, del nivel esperado.

### Diego Ramos Vega · COM_LECTURA

Diego estuvo sentado junto a una compañera y sonrió mientras ella explicó una idea; en otra lectura, escuchó sin intervención registrada. Estas observaciones no muestran qué comprendió ni si explicó sus ideas con pistas del cuento. Falta observar qué dice Diego sobre el texto, sus ilustraciones o cómo podría continuar.

Sugerencia: **Sin sustento suficiente**. Lo registrado muestra que escuchó, pero no permite valorar su comprensión del texto.

### Alma Flores Ruiz · COM_LECTURA

Alma explicó diferencias entre dos versiones del cuento y apoyó sus ideas señalando imágenes, pidiendo releer una frase y buscando partes del texto. También relacionó lo que decía el personaje con la ilustración y explicó cómo cambiaría el final si cambiara su intención. Estas actuaciones muestran que interpreta textos usando información de ellos; en otras lecturas conviene observar cómo anticipa lo que ocurrirá y qué aspectos prefiere.

Sugerencia: **A**. Las evidencias muestran que Alma explica sus interpretaciones apoyándose en imágenes y partes del cuento.

### Bruno Castro Ríos · COM_LECTURA

Bruno nombró al perro y la casa en una ilustración y recordó quién había salido de casa. Para anticipar lo que podría pasar no explicó una pista, y necesitó que la docente volviera a leer una parte para decir por qué el personaje regresó. Dijo que le gustó el conejo porque saltaba, pero necesitó preguntas y que le mostraran la escena para relacionar el salto con la historia. Falta observar cómo explica sus ideas con pistas del texto en otras situaciones.

Sugerencia: **B**. La interpretación y las razones sobre el texto aparecieron con preguntas, relectura o apoyo en la escena.

### Daniel Vega Rojas · MAT_CANTIDAD

En “Resuelve problemas de cantidad”, Daniel logró repartir un objeto por persona cuando la docente lo acompañó o modeló la acción. Sin esa ayuda, entregó varias cucharas u hojas a una sola persona y dejó a otras sin recibir; en una ocasión reconoció a quien no tenía vaso cuando la docente se lo señaló. Falta observar si puede repartir y comprobar por sí mismo que todos recibieron en distintas situaciones cotidianas.

Sugerencia: **B**. Las observaciones muestran que Daniel se acerca a la correspondencia uno a uno, pero aún requiere apoyo para sostenerla.

### Emma Medina Silva · MAT_CANTIDAD

Emma repartió una cuchara a cada uno de cuatro muñecos y comprobó que todos tenían una. En otra ocasión dejó a un niño sin hoja y dijo que alcanzaba sin revisar; después repartió servilletas y completó los lugares vacíos con un recordatorio inicial. Esto muestra correspondencia uno a uno, aunque todavía necesita apoyo para revisar si todos recibieron un objeto; falta observar otras situaciones de cantidad.

Sugerencia: **B**. Las actuaciones muestran que Emma puede repartir y comprobar, pero en otra ocasión no revisó y luego necesitó un recordatorio.
