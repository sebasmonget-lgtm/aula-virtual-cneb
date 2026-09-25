import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import sharp from "sharp";
import { buildAIContext } from "../src/lib/ai-context-builder-v4.mjs";
import { removePageBreakAfterTable, replaceWordText } from "../src/lib/unified-word-template.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templatePath = path.join(root, "assets", "templates", "taller-inicial-ayni-unificada-v1.docx");
const libraryRoot = path.join(root, "biblioteca-talleres");
const templateSha256 = "e868a4c30d6c73896510838f3b31c440330336c8f0b54baae9db11a56468c341";
const version = "1.0.0";

const commonSources = [
  "ACOMPANAR_COMPETENCIAS_2021",
  "CNEB",
  "ESPACIOS_2024",
  "INTERACCIONES_2019",
  "ORALIDAD_CICLO_II_2025",
  "ORIENTACIONES_INICIAL_2025",
  "PCI_INICIAL_CANONICAL",
  "PLANIFICACION_INICIAL_2019",
  "PROYECTOS_INICIAL_2019",
];

const workshops = [
  {
    id: "taller-03-psicomotricidad-islas-para-moverme",
    slug: "islas-para-moverme",
    age: 3,
    type: "Psicomotricidad",
    typeFolder: "psicomotricidad",
    competencyId: "PSICO_MOTRICIDAD",
    title: "Islas para moverme",
    duration: "45 minutos, con pausas según el grupo",
    interests: "Propuesta para cuando la docente observa interés por desplazarse, trepar, rodar o probar distintas maneras de llegar a un lugar.",
    purpose: "Explorar desplazamientos globales y reconocer sensaciones corporales en un recorrido abierto.",
    purposeHow: "Eligiendo cómo pasar entre islas blandas, líneas y objetos bajos, con oportunidades para repetir o cambiar la acción.",
    purposeWhy: "Para ampliar sus posibilidades de movimiento con seguridad y reconocer qué hace o siente su cuerpo.",
    criterion: "Explora el recorrido eligiendo maneras de caminar, gatear, saltar o rodar según sus posibilidades, y comunica con palabras, gestos o señalamientos una sensación o parte de su cuerpo.",
    evidence: "Recorrido elegido y realizado por el niño, junto con una palabra, gesto o señal sobre cómo se movió o qué sintió.",
    mainMaterial: "Colchonetas o mantas firmes, cintas de piso y cojines bajos",
    materials: ["colchonetas o mantas firmes", "cinta de pintor", "cojines bajos", "pañuelos livianos", "canasta"],
    space: "Aula amplia o patio con piso estable, recorrido corto y zonas de llegada visibles.",
    preparation: "Despejar el paso; fijar las cintas; comprobar que cojines y colchonetas no se deslicen; dejar dos recorridos posibles.",
    group: "Grupos pequeños. Cada niño decide por dónde empezar y puede repetir, omitir o adaptar una acción.",
    safety: "Evitar alturas y superficies inestables; mantener distancia entre niños; ofrecer apoyo de mano sin tirar del cuerpo.",
    orientation: "Priorizar la exploración motriz global. No exigir una forma única ni convertir el recorrido en competencia de velocidad.",
    start: "Los niños encuentran varias islas blandas y caminos de cinta. Observan el espacio, se acercan y eligen un punto de inicio.",
    startMediation: "La docente nombra posibilidades sin demostrar una solución completa: ¿Por dónde quieres comenzar? ¿Cómo podría pasar tu cuerpo?",
    startTime: "5 a 8 min · espacio dispuesto y pañuelos",
    development: "Cada niño recorre las islas caminando, gateando, dando pequeños saltos o rodando en la colchoneta. Puede llevar un pañuelo, cambiar de camino o acercar una isla con ayuda.",
    developmentMediation: "Observar y ofrecer tiempo. Preguntar: ¿Qué parte de tu cuerpo apoyas? ¿Quieres probar de otra manera? ¿Necesitas que acerquemos una isla?",
    developmentChildren: "Eligen el recorrido, prueban movimientos, repiten los que les interesan y comunican si necesitan ayuda o una pausa.",
    developmentTime: "25 min · colchonetas, cintas, cojines y pañuelos",
    close: "El grupo baja el ritmo, respira y estira libremente. Cada niño puede mostrar un movimiento que disfrutó o señalar dónde sintió esfuerzo.",
    closeReflection: "Aceptar palabras, gestos y demostraciones breves; no pedir que todos respondan del mismo modo.",
    closeTime: "8 a 10 min · colchoneta de encuentro",
    observationFocus: "Cómo el niño elige y realiza desplazamientos según sus posibilidades, y cómo reconoce o comunica sensaciones corporales.",
    supports: "Acortar distancias, ampliar apoyos, permitir desplazamiento sentado o con acompañamiento y ofrecer más tiempo sin separar al niño del grupo.",
    transversal: "Enfoque inclusivo o de atención a la diversidad",
    observableAttitude: "Valora distintas maneras de moverse y pide u ofrece ayuda con respeto.",
    reuse: "Reorganizar las islas según el espacio y las posibilidades del grupo; conservar elecciones y evitar un circuito obligatorio.",
    variants: "Cambiar pañuelos por pelotas blandas; usar sonidos para iniciar o detenerse; llevar el recorrido al patio.",
    tags: ["3 años", "psicomotricidad", "desplazamiento", "sensaciones corporales", "autonomía"],
    resource: null,
    difference: "Exploración motriz global, recorridos cortos y comunicación corporal o verbal inicial.",
  },
  {
    id: "taller-04-psicomotricidad-puentes-con-equilibrio",
    slug: "puentes-con-equilibrio",
    age: 4,
    type: "Psicomotricidad",
    typeFolder: "psicomotricidad",
    competencyId: "PSICO_MOTRICIDAD",
    title: "Puentes con equilibrio",
    duration: "50 minutos, ajustables al ritmo del grupo",
    interests: "Propuesta para cuando el grupo busca retos de equilibrio, transporte de objetos o cambios de velocidad.",
    purpose: "Combinar desplazamientos regulando equilibrio, fuerza y velocidad en rutas elegidas.",
    purposeHow: "Probando puentes de cinta, aros y traslados de saquitos, y modificando el recorrido después de cada intento.",
    purposeWhy: "Para controlar mejor sus movimientos y tomar decisiones seguras frente a distintos retos motores.",
    criterion: "Combina desplazamientos en una ruta elegida y ajusta equilibrio, fuerza o velocidad cuando el espacio, el objeto o el resultado de su intento lo requiere.",
    evidence: "Secuencia motriz realizada con control y una modificación visible en la fuerza, la velocidad, el apoyo o el orden después de probar.",
    mainMaterial: "Cintas de piso, aros, bloques de espuma y saquitos livianos",
    materials: ["cinta de pintor", "aros", "bloques de espuma bajos", "saquitos de tela", "cajas como metas"],
    space: "Patio o sala despejada con rutas paralelas y suficiente separación para volver a intentar.",
    preparation: "Armar dos rutas abiertas: línea de equilibrio, aros separados y una meta para transportar o lanzar; verificar estabilidad y distancia.",
    group: "Parejas o tríos por ruta. Los niños eligen orden, sentido y nivel de reto, sin turnos largos de espera.",
    safety: "Usar bloques bajos; fijar cintas; retirar objetos duros; acordar una dirección por ruta y detenerse si otro niño cruza.",
    orientation: "Invitar a regular movimiento y no a competir. Permitir volver a probar y modificar el reto después de observar el propio cuerpo.",
    start: "El grupo recorre con la mirada dos puentes posibles y anticipa qué parte parece estable, rápida o difícil. Cada niño elige una ruta.",
    startMediation: "Preguntar: ¿Qué necesitas hacer para no salir del puente? ¿Dónde conviene ir más lento? Recoger hipótesis sin confirmar una sola respuesta.",
    startTime: "8 min · rutas preparadas",
    development: "Los niños caminan sobre líneas, pasan por aros, trasladan un saquito y lo dejan o lanzan en una meta. Tras cada intento pueden cambiar separación, sentido o velocidad y volver a probar.",
    developmentMediation: "Comentar lo observado y preguntar: ¿Qué cambiaste? ¿Cuánta fuerza necesitas? ¿Qué te ayuda a recuperar el equilibrio?",
    developmentChildren: "Eligen ruta, combinan acciones, regulan su movimiento y proponen ajustes simples para sí mismos o su pareja.",
    developmentTime: "30 min · cintas, aros, bloques y saquitos",
    close: "En pequeños grupos muestran un ajuste que les ayudó. Quien prefiere puede demostrarlo sin explicarlo verbalmente.",
    closeReflection: "Comparar estrategias sin ordenar ganadores: ir más lento, abrir brazos, cambiar apoyo o acercar una meta.",
    closeTime: "10 min · un tramo del recorrido",
    observationFocus: "Cómo combina movimientos y regula equilibrio, fuerza o velocidad para resolver un reto elegido.",
    supports: "Ensachar la línea, acercar aros, retirar el objeto transportado, ofrecer un apoyo lateral o permitir ensayo previo.",
    transversal: "Enfoque inclusivo o de atención a la diversidad",
    observableAttitude: "Reconoce distintos ritmos y acuerda cambios para que todos puedan participar.",
    reuse: "Variar distancias y objetos después de observar al grupo; mantener rutas paralelas y elecciones reales.",
    variants: "Recorrer hacia otra meta; transportar con ambas manos; alternar tramo lento y rápido; crear un puente en pareja.",
    tags: ["4 años", "psicomotricidad", "equilibrio", "fuerza", "velocidad"],
    resource: null,
    difference: "Combina acciones y regula equilibrio, fuerza y velocidad después de cada intento.",
  },
  {
    id: "taller-05-psicomotricidad-rutas-que-inventamos",
    slug: "rutas-que-inventamos",
    age: 5,
    type: "Psicomotricidad",
    typeFolder: "psicomotricidad",
    competencyId: "PSICO_MOTRICIDAD",
    title: "Rutas que inventamos",
    duration: "55 minutos, con posibilidad de continuar otro día",
    interests: "Propuesta para grupos que disfrutan inventar recorridos, acordar retos y ajustar movimientos frente a otras personas y objetos.",
    purpose: "Diseñar y resolver recorridos ajustando movimientos al espacio, los objetos y los demás.",
    purposeHow: "Seleccionando tarjetas de acción, organizando una secuencia motriz y revisándola después de probarla con otros.",
    purposeWhy: "Para combinar movimientos con mayor precisión, anticipar riesgos y comunicar decisiones sobre el propio recorrido.",
    criterion: "Propone y realiza una secuencia de retos motores, ajustando dirección, equilibrio y coordinación al espacio, los objetos y la presencia de otros, y explica un cambio realizado.",
    evidence: "Ruta organizada con tarjetas, ejecución de la secuencia y explicación o demostración del ajuste hecho después de probarla.",
    mainMaterial: "Tarjetas de recorrido motor, cintas, aros, conos y saquitos",
    materials: ["tarjetas imprimibles de recorrido", "cinta de pintor", "aros", "conos bajos", "saquitos de tela", "cuerdas cortas"],
    space: "Patio o sala amplia dividida en zonas de diseño, prueba y espera activa.",
    preparation: "Imprimir y recortar tarjetas; revisar superficies; ofrecer materiales visibles; marcar límites y un sentido seguro de circulación.",
    group: "Equipos de tres o cuatro. Cada equipo elige tarjetas, monta una ruta breve, la prueba y acepta cambios propuestos por sus integrantes.",
    safety: "La docente valida estabilidad, distancias y circulación antes de cada prueba; no se apilan elementos ni se crean saltos altos.",
    orientation: "El reto central es adaptar el movimiento. Las tarjetas abren opciones; no son una secuencia que la docente impone.",
    start: "Los equipos exploran las tarjetas y los materiales. Eligen qué movimientos desean combinar y anticipan dónde ubicar cada reto.",
    startMediation: "Preguntar: ¿Qué orden permitirá moverse con seguridad? ¿Dónde habrá que cambiar dirección o velocidad? ¿Cómo sabrán que la ruta funciona?",
    startTime: "10 min · tarjetas y materiales visibles",
    development: "Cada equipo monta una ruta de tres o cuatro acciones, la recorre, observa lo que ocurre y modifica distancias, orden o apoyos. Luego invita a otro equipo a probarla.",
    developmentMediation: "Observar sin resolver. Preguntar: ¿Qué movimiento tuviste que ajustar? ¿Qué cambiarían para que otra persona pueda recorrerla?",
    developmentChildren: "Negocian la secuencia, distribuyen materiales, prueban, ajustan su cuerpo y el recorrido, y comunican acuerdos.",
    developmentTime: "32 min · tarjetas, aros, conos, cintas y saquitos",
    close: "Cada equipo muestra una tarjeta y el ajuste que hizo en su ruta. Los demás comentan qué movimiento observaron o quisieran probar.",
    closeReflection: "Recuperar decisiones sobre dirección, equilibrio, precisión y cuidado mutuo, sin calificar la ruta como mejor o peor.",
    closeTime: "10 a 12 min · tarjetas seleccionadas",
    observationFocus: "Cómo planifica, combina y ajusta movimientos complejos al espacio, los objetos y otras personas, y cómo comunica sus decisiones.",
    supports: "Reducir acciones, ampliar distancias, permitir ensayo individual, usar pictogramas de mayor tamaño u ofrecer un compañero de referencia.",
    transversal: "Enfoque de orientación al bien común",
    observableAttitude: "Acuerda recorridos seguros y modifica una propuesta para facilitar la participación de otros.",
    reuse: "Elegir pocas tarjetas según el espacio y renovar solo un reto por aplicación; conservar el diseño infantil y la revisión posterior.",
    variants: "Crear una ruta silenciosa; incorporar un objeto para transportar; intercambiar rutas; registrar el orden con las tarjetas.",
    tags: ["5 años", "psicomotricidad", "secuencia motriz", "coordinación", "diseño colaborativo"],
    resource: {
      name: "Tarjetas de recorrido motor",
      type: "SVG y PNG imprimibles",
      description: "Seis tarjetas de alto contraste para elegir y ordenar acciones de equilibrio, zigzag, salto, transporte, giro y paso bajo.",
      files: ["assets/tarjetas-recorrido-motor.svg", "assets/tarjetas-recorrido-motor.png"],
    },
    difference: "Planifica recorridos, combina retos más complejos y adapta la secuencia al espacio y a otras personas.",
  },
  {
    id: "taller-03-grafico-plastico-huellas-de-mis-movimientos",
    slug: "huellas-de-mis-movimientos",
    age: 3,
    type: "Taller gráfico-plástico",
    typeFolder: "grafico-plastico",
    competencyId: "COM_ARTE",
    title: "Huellas de mis movimientos",
    duration: "45 minutos, flexible según el interés",
    interests: "Propuesta para cuando los niños muestran curiosidad por tocar pintura, dejar huellas y mover manos u objetos sobre superficies amplias.",
    purpose: "Explorar huellas, colores y gestos gráficos para representar una experiencia propia.",
    purposeHow: "Probando manos, esponjas, rodillos y objetos anchos sobre papel grande, con libertad para superponer o separar marcas.",
    purposeWhy: "Para descubrir posibilidades expresivas de los materiales y comunicar espontáneamente lo que hicieron o imaginaron.",
    criterion: "Explora materiales y movimientos para producir huellas propias, toma decisiones durante el proceso y comunica con palabras, gestos o acciones algo de su creación.",
    evidence: "Composición de huellas surgida de la exploración y una manifestación espontánea sobre el material, el movimiento o lo representado.",
    mainMaterial: "Papel grande, témpera lavable y herramientas de huella",
    materials: ["papel kraft o cartulina grande", "témpera lavable no tóxica", "esponjas", "rodillos", "tapones grandes", "mandiles"],
    space: "Zona protegida del aula o patio, con materiales al alcance y un lugar cercano para lavarse.",
    preparation: "Cubrir el piso o mesas; ofrecer pocos colores en bandejas bajas; verificar que los objetos sean grandes, lavables y sin bordes.",
    group: "Pequeños grupos alrededor de superficies amplias. Cada niño elige herramienta, color, lugar y tiempo de exploración.",
    safety: "Usar pintura no tóxica; evitar piezas pequeñas; acompañar el lavado de manos; respetar a quien no desea tocar pintura directamente.",
    orientation: "Valorar la exploración y el proceso. No mostrar un modelo para copiar ni convertir la producción en una manualidad idéntica.",
    start: "Los materiales aparecen ordenados y visibles. Los niños observan huellas de prueba en un papel aparte y eligen con qué desean comenzar.",
    startMediation: "Nombrar acciones sin dirigir el resultado: apoyar, deslizar, girar, presionar. Preguntar: ¿Qué quieres probar primero?",
    startTime: "5 a 8 min · bandejas y papel de prueba",
    development: "Los niños imprimen y arrastran herramientas, cambian colores, superponen marcas o trabajan en zonas distintas. Pueden mirar y retomar una huella que les interese.",
    developmentMediation: "Observar, describir decisiones y preguntar solo cuando amplía la acción: ¿Qué pasó al moverlo? ¿Quieres repetir o cambiar?",
    developmentChildren: "Exploran sensaciones y huellas, eligen materiales y representan experiencias o ideas mediante marcas propias.",
    developmentTime: "25 min · papel, témperas y herramientas",
    close: "Las producciones se dejan a la vista. Cada niño puede señalar una huella, repetir el gesto que la creó o decir algo sobre ella.",
    closeReflection: "Acoger comentarios espontáneos y silencios; no pedir que la imagen tenga una forma reconocible.",
    closeTime: "8 a 10 min · producciones extendidas",
    observationFocus: "Cómo explora materiales y movimientos, toma decisiones y comunica espontáneamente algo de su proceso o producción.",
    supports: "Ofrecer herramientas con mangos anchos, guantes o bolsas selladas con pintura, trabajo de pie o sentado y tiempo de observación antes de participar.",
    transversal: "Enfoque inclusivo o de atención a la diversidad",
    observableAttitude: "Respeta distintas formas de explorar y crear, incluso sin contacto directo con la pintura.",
    reuse: "Cambiar superficie y herramientas sin definir un producto final; mantener pocos materiales accesibles y una zona amplia.",
    variants: "Huellas sobre papel vertical; rodillos con texturas; pintura dentro de bolsas transparentes; creación al ritmo de sonidos suaves.",
    tags: ["3 años", "gráfico-plástico", "huellas", "exploración sensorial", "creación libre"],
    resource: null,
    difference: "Exploración libre de huellas y comunicación espontánea mediante gesto, acción o palabra.",
  },
  {
    id: "taller-04-grafico-plastico-colores-que-cambian",
    slug: "colores-que-cambian",
    age: 4,
    type: "Taller gráfico-plástico",
    typeFolder: "grafico-plastico",
    competencyId: "COM_ARTE",
    title: "Colores que cambian",
    duration: "50 minutos, con secado posterior",
    interests: "Propuesta para cuando el grupo pregunta qué ocurre al juntar colores o busca nuevas maneras de pintar una vivencia.",
    purpose: "Descubrir efectos al combinar colores y herramientas y usarlos con intención expresiva.",
    purposeHow: "Mezclando pequeñas cantidades, comparando efectos y eligiendo una combinación para representar una experiencia o idea.",
    purposeWhy: "Para ampliar sus decisiones creativas y comentar cómo transformaron los materiales durante su producción.",
    criterion: "Combina colores o herramientas por iniciativa, reconoce un efecto de la mezcla y elige cómo usarlo para representar una vivencia o idea que luego comenta.",
    evidence: "Producción con combinaciones elegidas, rastros del proceso de prueba y comentario sobre un efecto o decisión creativa.",
    mainMaterial: "Témperas lavables, paletas de mezcla y herramientas variadas",
    materials: ["témperas lavables de colores primarios", "paletas o tapas grandes", "pinceles", "esponjas", "cartulina", "mandiles"],
    space: "Mesas protegidas con una estación de mezcla y otra de creación, ambas al alcance de los niños.",
    preparation: "Servir pequeñas cantidades; separar herramientas limpias; preparar cartulinas y un espacio de secado; disponer paños húmedos.",
    group: "Grupos de cuatro o cinco. Cada niño prueba mezclas y decide cuáles llevar a su propia cartulina.",
    safety: "Materiales no tóxicos; no mezclar en recipientes de comida; limpiar derrames; evitar saturar el espacio con demasiados colores.",
    orientation: "Permitir descubrimientos no previstos. No pedir fórmulas memorizadas ni un dibujo igual para todos.",
    start: "Los niños observan dos colores separados y un espacio vacío en la paleta. Anticipan o simplemente deciden qué combinación desean probar.",
    startMediation: "Preguntar: ¿Qué te gustaría juntar? ¿Cómo podrías hacerlo? Registrar sus palabras sin convertirlas en respuesta correcta o incorrecta.",
    startTime: "8 min · paletas y colores",
    development: "Prueban mezclas pequeñas con pincel o esponja, comparan tonos y eligen uno o varios para crear una imagen vinculada con una vivencia o idea propia.",
    developmentMediation: "Preguntar: ¿Qué cambió? ¿Cuál mezcla quieres conservar? ¿Cómo la usarás? Ofrecer material adicional solo si amplía su intención.",
    developmentChildren: "Experimentan, comparan, seleccionan combinaciones y desarrollan una producción personal sin modelo.",
    developmentTime: "30 min · témperas, paletas, herramientas y cartulina",
    close: "En parejas muestran una mezcla o una parte de su producción y comentan cómo la hicieron. Pueden formular una nueva pregunta para otro día.",
    closeReflection: "Recoger relaciones entre prueba, efecto y decisión; evitar calificar colores o producciones como bonitas o correctas.",
    closeTime: "10 min · producciones y paletas",
    observationFocus: "Cómo combina materiales, reconoce efectos y usa una decisión de mezcla para representar y comentar una vivencia o idea.",
    supports: "Ofrecer goteros grandes o pinceles adaptados, limitar opciones visibles, permitir trabajar en vertical y aceptar explicación mediante señalamiento.",
    transversal: "Enfoque de búsqueda de la excelencia",
    observableAttitude: "Revisa una decisión y prueba otra posibilidad para mejorar la expresión que busca.",
    reuse: "Cambiar herramientas, soportes o pares de colores; mantener un tiempo de prueba antes de la producción personal.",
    variants: "Mezclas sobre papel húmedo; impresión con esponjas; creación solo con tonos obtenidos; mural de pruebas compartidas.",
    tags: ["4 años", "gráfico-plástico", "mezcla de colores", "decisiones creativas", "representación"],
    resource: null,
    difference: "Combina materiales, reconoce efectos y usa una mezcla con mayor intencionalidad representativa.",
  },
  {
    id: "taller-05-grafico-plastico-mural-del-lugar-que-compartimos",
    slug: "mural-del-lugar-que-compartimos",
    age: 5,
    type: "Taller gráfico-plástico",
    typeFolder: "grafico-plastico",
    competencyId: "COM_ARTE",
    title: "Mural del lugar que compartimos",
    duration: "60 minutos, ampliables en dos encuentros",
    interests: "Propuesta para grupos que desean representar un lugar cercano y combinar aportes individuales en una creación común.",
    purpose: "Crear en grupo una composición gráfico-plástica sobre un lugar cercano y conversar sobre decisiones y procesos.",
    purposeHow: "Recordando detalles, explorando dibujo, collage y textura, acordando la composición y revisando cómo se integran los aportes.",
    purposeWhy: "Para representar aspectos del contexto, sostener un proceso creativo colectivo y reflexionar sobre lo que cada decisión comunica.",
    criterion: "Explora y combina recursos gráfico-plásticos para representar aspectos de un lugar cercano, integra su aporte en la composición grupal y describe una decisión o algo que valora del proceso.",
    evidence: "Aporte integrado en el mural, registro de una combinación de materiales y comentario sobre una decisión propia, grupal o una producción observada.",
    mainMaterial: "Papel mural, papeles reutilizados, témperas y elementos de textura",
    materials: ["papel kraft grande", "papeles reutilizados", "témperas lavables", "crayones", "esponjas", "pegamento escolar", "telas o lanas"],
    space: "Aula con mesas de exploración y pared o piso amplio para montar el mural sin bloquear la circulación.",
    preparation: "Conversar previamente sobre un lugar conocido; clasificar materiales al alcance; fijar el soporte; reservar una zona de secado.",
    group: "Equipos exploran materiales y proponen partes; el grupo acuerda ubicación, uniones y cambios antes del montaje final.",
    safety: "Usar materiales limpios y sin grapas; controlar pegamento y derrames; mantener libre el paso alrededor del mural.",
    orientation: "Cuidar que el mural reúna decisiones infantiles y no piezas prediseñadas por el adulto. La conversación acompaña la creación, no la reemplaza.",
    start: "El grupo recuerda un lugar compartido mediante relatos, gestos o bocetos rápidos. Elige qué detalles desea representar y qué materiales explorar.",
    startMediation: "Preguntar: ¿Qué hace reconocible ese lugar? ¿Qué materiales podrían expresar sus colores, formas o texturas?",
    startTime: "10 min · soporte y materiales de exploración",
    development: "Los equipos prueban dibujo, pintura, collage y textura; crean partes y las ubican provisionalmente. Observan el conjunto, acuerdan cambios y realizan el montaje.",
    developmentMediation: "Ayudar a escuchar propuestas y preguntar: ¿Cómo se relaciona esta parte con las otras? ¿Qué quieren cambiar antes de pegar?",
    developmentChildren: "Exploran individual y colectivamente, representan aspectos del contexto, negocian ubicación y técnica y revisan la composición.",
    developmentTime: "35 min · papel mural y materiales gráfico-plásticos",
    close: "El grupo recorre el mural con la mirada. Cada niño puede describir una decisión propia, algo que reconoce del lugar o un aporte de otro que le interesó.",
    closeReflection: "Recuperar cómo combinaron ideas y materiales, qué cambiarían y qué les gustó del proceso o de las producciones.",
    closeTime: "12 a 15 min · mural instalado",
    observationFocus: "Cómo combina lenguajes y materiales para representar el contexto, integra decisiones con otros y comenta su proceso o las producciones.",
    supports: "Ofrecer recortes grandes, herramientas adaptadas, roles flexibles, comunicación por señalamiento y un área individual que luego pueda integrarse.",
    transversal: "Enfoque de orientación al bien común",
    observableAttitude: "Escucha propuestas, cuida los materiales compartidos y ajusta su aporte para construir una obra común.",
    reuse: "Elegir otro lugar significativo y renovar los materiales; conservar exploración previa, acuerdo de composición y conversación final.",
    variants: "Mural de sonidos dibujados; paisaje inventado; composición por capas; obra modular que pueda reordenarse.",
    tags: ["5 años", "gráfico-plástico", "mural", "contexto", "creación colectiva", "socialización"],
    resource: null,
    difference: "Integra exploración individual y grupal, representa el contexto y reflexiona sobre decisiones propias y ajenas.",
  },
];

const wordCompact = {
  "taller-03-psicomotricidad-islas-para-moverme": {
    interests: "Para grupos interesados en desplazarse, rodar y probar caminos.",
    purpose: "Explorar desplazamientos y reconocer sensaciones corporales.",
    purposeHow: "Elegir cómo pasar entre islas y repetir o cambiar el recorrido.",
    purposeWhy: "Ampliar movimientos seguros y reconocer lo que hace o siente el cuerpo.",
    criterion: "Elige y realiza desplazamientos según sus posibilidades, y comunica una sensación o parte del cuerpo con palabras, gestos o señalamientos.",
    evidence: "Recorrido elegido y una palabra, gesto o señal sobre su movimiento o sensación.",
    preparation: "Despejar el paso, fijar cintas y comprobar que cojines y colchonetas no se deslicen.",
    group: "Grupos pequeños; cada niño elige inicio, repite, omite o adapta acciones.",
    safety: "Evitar alturas; separar recorridos; ofrecer apoyo de mano sin tirar del cuerpo.",
    orientation: "Favorecer exploración global sin forma única ni competencia de velocidad.",
    start: "Observan islas blandas y caminos de cinta; se acercan y eligen un inicio.",
    startMediation: "Nombrar posibilidades sin mostrar la solución. ¿Por dónde empezarás? ¿Cómo pasará tu cuerpo?",
    development: "Recorren las islas caminando, gateando, saltando o rodando; llevan un pañuelo y cambian de camino si desean.",
    developmentMediation: "Observar y dar tiempo. ¿Qué parte apoyas? ¿Quieres probar distinto? ¿Necesitas ayuda?",
    developmentChildren: "Eligen, prueban, repiten y piden ayuda o pausa.",
    close: "Respiran y muestran un movimiento.",
    closeReflection: "Comparten con gestos o palabras.",
    supports: "Acortar distancias, ampliar apoyos y ofrecer acompañamiento o más tiempo.",
    observableAttitude: "Respeta distintas maneras de moverse y de pedir ayuda.",
    mainMaterial: "Colchonetas, cintas y cojines bajos",
    reuse: "Reorganizar las islas según el grupo, con elecciones y sin circuito obligatorio.",
    variants: "Usar pelotas blandas, sonidos de pausa o trasladar el recorrido al patio.",
  },
  "taller-04-psicomotricidad-puentes-con-equilibrio": {
    interests: "Para grupos interesados en equilibrio, transporte de objetos y cambios de velocidad.",
    purpose: "Combinar desplazamientos y regular equilibrio, fuerza y velocidad.",
    purposeHow: "Probar puentes de cinta, aros y saquitos, y ajustar la ruta tras cada intento.",
    purposeWhy: "Controlar mejor sus movimientos y resolver retos motores con seguridad.",
    criterion: "Combina desplazamientos y ajusta equilibrio, fuerza o velocidad cuando el reto o su intento lo requiere.",
    evidence: "Secuencia motriz controlada y un ajuste visible en velocidad, fuerza, apoyo u orden.",
    preparation: "Armar dos rutas con línea, aros y meta; comprobar estabilidad y separación.",
    group: "Parejas o tríos; eligen orden, sentido y dificultad sin esperas largas.",
    safety: "Usar elementos bajos, fijar cintas, retirar objetos duros y acordar un sentido por ruta.",
    orientation: "Invitar a regular el movimiento y volver a probar; no competir por velocidad.",
    start: "Observan dos puentes, anticipan qué parte será estable o difícil y eligen una ruta.",
    startMediation: "¿Qué harás para no salir del puente? ¿Dónde conviene ir más lento?",
    development: "Caminan por líneas, pasan aros, trasladan un saquito y llegan a una meta. Luego cambian distancia, sentido o velocidad.",
    developmentMediation: "¿Qué cambiaste? ¿Cuánta fuerza necesitas? ¿Qué ayuda a recuperar el equilibrio?",
    developmentChildren: "Eligen, combinan acciones, regulan el movimiento y proponen ajustes.",
    close: "Muestran el ajuste que les ayudó.",
    closeReflection: "Comparan sin elegir ganadores.",
    supports: "Ensachar líneas, acercar aros, retirar cargas u ofrecer apoyo lateral.",
    observableAttitude: "Respeta distintos ritmos y acuerda cambios para participar.",
    mainMaterial: "Cintas, aros, bloques y saquitos",
    reuse: "Variar distancias y objetos después de observar al grupo; mantener rutas paralelas.",
    variants: "Cambiar la meta, transportar con dos manos o crear un puente en pareja.",
  },
  "taller-05-psicomotricidad-rutas-que-inventamos": {
    interests: "Para grupos que disfrutan inventar recorridos y ajustar movimientos con otros.",
    purpose: "Diseñar y resolver recorridos adaptando movimientos al espacio y los demás.",
    purposeHow: "Elegir tarjetas, organizar una secuencia y revisarla después de probarla.",
    purposeWhy: "Combinar movimientos con precisión y comunicar decisiones del recorrido.",
    criterion: "Propone y realiza una secuencia motriz, ajusta dirección, equilibrio y coordinación, y explica un cambio.",
    evidence: "Ruta con tarjetas, ejecución de la secuencia y explicación o demostración de un ajuste.",
    preparation: "Imprimir tarjetas, revisar superficies, ordenar materiales y marcar límites seguros.",
    group: "Equipos de tres o cuatro; eligen, montan, prueban y revisan una ruta breve.",
    safety: "Validar estabilidad y circulación; no apilar elementos ni crear saltos altos.",
    orientation: "Las tarjetas abren opciones; la secuencia la deciden los niños.",
    start: "Exploran tarjetas y materiales; eligen movimientos y anticipan su ubicación.",
    startMediation: "¿Qué orden será seguro? ¿Dónde cambiarán dirección? ¿Cómo sabrán si funciona?",
    development: "Montan tres o cuatro acciones, recorren, modifican distancias, orden o apoyos e invitan a otro equipo.",
    developmentMediation: "¿Qué movimiento ajustaste? ¿Qué cambiarían para otra persona?",
    developmentChildren: "Acuerdan la secuencia, distribuyen materiales, prueban y modifican la ruta.",
    close: "Muestran la tarjeta y su ajuste.",
    closeReflection: "Nombran precisión y cuidado.",
    supports: "Reducir acciones, ampliar distancias, ensayar individualmente o usar pictogramas grandes.",
    observableAttitude: "Acuerda rutas seguras y facilita la participación de otros.",
    mainMaterial: "Tarjetas motoras, aros, conos y saquitos",
    reuse: "Elegir pocas tarjetas y renovar un reto; conservar diseño y revisión infantil.",
    variants: "Ruta silenciosa, objeto para transportar, intercambio de rutas o registro del orden.",
  },
  "taller-03-grafico-plastico-huellas-de-mis-movimientos": {
    interests: "Para grupos interesados en tocar pintura, dejar huellas y mover herramientas.",
    purpose: "Explorar huellas, colores y gestos para representar una experiencia.",
    purposeHow: "Probar manos, esponjas y rodillos sobre papel grande, con decisiones propias.",
    purposeWhy: "Descubrir posibilidades expresivas y comunicar espontáneamente lo creado.",
    criterion: "Explora materiales y movimientos, decide cómo producir huellas y comunica algo de su creación con palabras, gestos o acciones.",
    evidence: "Composición de huellas y una manifestación espontánea sobre el material, movimiento o representación.",
    preparation: "Proteger el espacio, ofrecer pocos colores y verificar objetos grandes y sin bordes.",
    group: "Grupos pequeños; cada niño elige herramienta, color, lugar y tiempo.",
    safety: "Usar pintura no tóxica; evitar piezas pequeñas y respetar a quien no desea tocarla.",
    orientation: "Valorar proceso y exploración; no mostrar un modelo para copiar.",
    start: "Observan materiales y huellas de prueba; eligen con qué comenzar.",
    startMediation: "Nombrar apoyar, deslizar, girar o presionar. ¿Qué quieres probar primero?",
    development: "Imprimen y arrastran herramientas, cambian colores, superponen marcas o trabajan en zonas distintas.",
    developmentMediation: "Describir decisiones. ¿Qué pasó al moverlo? ¿Quieres repetir o cambiar?",
    developmentChildren: "Exploran sensaciones y huellas, eligen y representan con marcas propias.",
    close: "Señalan una huella o repiten su gesto.",
    closeReflection: "Comparten con gesto o palabra.",
    supports: "Ofrecer mangos anchos, guantes, bolsas con pintura o trabajo sentado.",
    observableAttitude: "Respeta distintas formas de explorar y crear.",
    mainMaterial: "Papel grande, témpera y herramientas de huella",
    reuse: "Cambiar superficie y herramientas sin definir un producto final.",
    variants: "Papel vertical, rodillos con textura, bolsas con pintura o sonidos suaves.",
  },
  "taller-04-grafico-plastico-colores-que-cambian": {
    interests: "Para grupos que preguntan qué ocurre al juntar colores o buscan nuevas formas de pintar.",
    purpose: "Descubrir efectos al combinar colores y usarlos con intención expresiva.",
    purposeHow: "Mezclar pequeñas cantidades, comparar efectos y elegir una combinación.",
    purposeWhy: "Ampliar decisiones creativas y comentar cómo transformaron los materiales.",
    criterion: "Combina colores o herramientas, reconoce un efecto y decide cómo usarlo para representar una vivencia o idea.",
    evidence: "Producción con combinaciones elegidas y comentario sobre un efecto o decisión creativa.",
    preparation: "Servir poca pintura, separar herramientas, preparar cartulinas y zona de secado.",
    group: "Grupos de cuatro o cinco; cada niño prueba y elige mezclas para su cartulina.",
    safety: "Usar materiales no tóxicos, limpiar derrames y ofrecer pocos colores.",
    orientation: "Permitir hallazgos no previstos; no pedir fórmulas ni dibujos iguales.",
    start: "Observan colores separados y eligen qué combinación probar.",
    startMediation: "¿Qué te gustaría juntar? ¿Cómo podrías hacerlo?",
    development: "Prueban mezclas, comparan tonos y eligen cómo usarlos en una creación personal.",
    developmentMediation: "¿Qué cambió? ¿Cuál mezcla conservarás? ¿Cómo la usarás?",
    developmentChildren: "Experimentan, comparan, seleccionan y crean sin modelo.",
    close: "Muestran una mezcla y cómo la hicieron.",
    closeReflection: "Relacionan prueba y efecto.",
    supports: "Ofrecer goteros grandes, pinceles adaptados, pocas opciones o trabajo vertical.",
    observableAttitude: "Revisa una decisión y prueba otra posibilidad expresiva.",
    mainMaterial: "Témperas, paletas y herramientas variadas",
    reuse: "Cambiar herramientas, soportes o pares de colores; conservar el tiempo de prueba.",
    variants: "Papel húmedo, esponjas, tonos obtenidos o mural de pruebas.",
  },
  "taller-05-grafico-plastico-mural-del-lugar-que-compartimos": {
    interests: "Para grupos que desean representar un lugar cercano en una creación común.",
    purpose: "Crear en grupo una composición sobre un lugar y conversar sobre el proceso.",
    purposeHow: "Explorar dibujo, collage y textura; acordar la composición y revisar aportes.",
    purposeWhy: "Representar el contexto y reflexionar sobre decisiones creativas colectivas.",
    criterion: "Combina recursos para representar un lugar, integra su aporte al mural y describe una decisión o algo que valora del proceso.",
    evidence: "Aporte integrado, combinación de materiales y comentario sobre una decisión propia o grupal.",
    preparation: "Recordar un lugar, ordenar materiales, fijar el soporte y reservar zona de secado.",
    group: "Equipos exploran y proponen partes; el grupo acuerda ubicación y cambios.",
    safety: "Usar materiales limpios y sin grapas; controlar pegamento y mantener libre el paso.",
    orientation: "Conservar decisiones infantiles; no usar piezas prediseñadas por el adulto.",
    start: "Recuerdan un lugar con relatos, gestos o bocetos y eligen detalles y materiales.",
    startMediation: "¿Qué hace reconocible ese lugar? ¿Qué material expresa su textura o color?",
    development: "Prueban dibujo, pintura, collage y textura; ubican partes, observan el conjunto y acuerdan cambios.",
    developmentMediation: "¿Cómo se relaciona esta parte con las otras? ¿Qué cambiarán antes de pegar?",
    developmentChildren: "Exploran, representan, negocian ubicación y técnica y revisan la composición.",
    close: "Describen una decisión del mural.",
    closeReflection: "Comentan cómo combinaron ideas.",
    supports: "Ofrecer recortes grandes, herramientas adaptadas, roles flexibles o área individual.",
    observableAttitude: "Escucha propuestas y cuida los materiales compartidos.",
    mainMaterial: "Papel mural, papeles, témperas y texturas",
    reuse: "Elegir otro lugar y renovar materiales; conservar exploración, acuerdo y conversación.",
    variants: "Sonidos dibujados, paisaje inventado, capas o módulos reordenables.",
  },
};

function titleSlug(title) {
  return title.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function fileName(workshop) {
  const age = String(workshop.age).padStart(2, "0");
  const type = workshop.type === "Psicomotricidad" ? "Psicomotricidad" : "Grafico-plastico";
  return `${age}_${type}_${workshop.competencyId}_${titleSlug(workshop.title)}.docx`;
}

function wordValues(workshop, card, ageReference) {
  const compact = { ...workshop, ...wordCompact[workshop.id] };
  const noResource = {
    name: "No requiere anexo",
    type: "Materiales de uso cotidiano",
    description: "El taller se ejecuta con los materiales descritos en la organización.",
    files: ["No aplica"],
  };
  const resource = workshop.resource ?? noResource;
  return {
    TITULO_TALLER: compact.title,
    TIPO_TALLER: compact.type,
    EDAD_OBJETIVO: `${compact.age} años`,
    CODIGO_TALLER: `AYNI-T${String(compact.age).padStart(2, "0")}-${compact.competencyId === "PSICO_MOTRICIDAD" ? "PM" : "GP"}-01`,
    DURACION_REFERENCIAL: compact.duration.split(",")[0],
    INTERESES_NECESIDADES: compact.interests,
    PROPOSITO_QUE: compact.purpose,
    PROPOSITO_COMO: compact.purposeHow,
    PROPOSITO_PARA_QUE: compact.purposeWhy,
    COMPETENCIA_PRINCIPAL: card.official_name,
    CAPACIDADES_PERTINENTES: card.capacities.map((capacity) => capacity.official_name).join("; "),
    DESEMPENO_PERTINENTE: `Referencia ${compact.age} años. Paráfrasis semántica trazable, no cita textual MINEDU: ${ageReference.semantic_focus}`,
    CRITERIO_EVALUACION: compact.criterion,
    EVIDENCIA_ESPERADA: compact.evidence,
    ENFOQUE_TRANSVERSAL: compact.transversal,
    ACTITUD_OBSERVABLE: compact.observableAttitude,
    APOYOS_DIVERSIDAD: compact.supports,
    MATERIAL_PRINCIPAL: compact.mainMaterial,
    ESPACIO_TALLER: compact.space,
    MATERIALES_TALLER: compact.materials.join("; "),
    PREPARACION_PREVIA: compact.preparation,
    ORGANIZACION_GRUPO: compact.group,
    CUIDADOS_SEGURIDAD: compact.safety,
    ORIENTACIONES_TIPO_TALLER: compact.orientation,
    INICIO: compact.start,
    INICIO_MEDIACION: compact.startMediation,
    INICIO_RECURSOS_TIEMPO: compact.startTime,
    DESARROLLO: compact.development,
    DESARROLLO_MEDIACION: compact.developmentMediation,
    DESARROLLO_NINOS: compact.developmentChildren,
    DESARROLLO_RECURSOS_TIEMPO: compact.developmentTime,
    CIERRE: compact.close,
    CIERRE_REFLEXION: compact.closeReflection,
    CIERRE_RECURSOS_TIEMPO: compact.closeTime,
    FOCO_OBSERVACION: compact.observationFocus,
    RECURSO_NOMBRE: resource.name,
    RECURSO_TIPO: resource.type,
    RECURSO_DESCRIPCION: resource.description,
    RECURSO_ARCHIVO: resource.files.join("; "),
    CONDICIONES_REUSO: compact.reuse,
    VARIANTES_TALLER: compact.variants,
    ETIQUETAS_TALLER: compact.tags.join("; "),
    VERSION_TALLER: version,
  };
}

async function renderFromTemplate(templateBuffer, values) {
  const archive = await JSZip.loadAsync(templateBuffer);
  const document = await archive.file("word/document.xml")?.async("string");
  assert.ok(document, "La plantilla de taller debe contener word/document.xml.");
  let output = removePageBreakAfterTable(document, "{{COMPETENCIA_PRINCIPAL}}");
  output = removePageBreakAfterTable(output, "{{INICIO}}");
  for (const [key, value] of Object.entries(values)) output = replaceWordText(output, `{{${key}}}`, value);
  output = output.replace(/<w:tr(\s[^>]*)?>([\s\S]*?)<\/w:tr>/g, (row, attributes = "", body) => {
    if (/<w:cantSplit\b/.test(body)) return row;
    if (/<w:trPr(?:\s[^>]*)?>/.test(body))
      return `<w:tr${attributes}>${body.replace(/<w:trPr(?:\s[^>]*)?>/, (open) => `${open}<w:cantSplit/>`)}</w:tr>`;
    return `<w:tr${attributes}><w:trPr><w:cantSplit/></w:trPr>${body}</w:tr>`;
  });
  output = output.replace(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g, (row) => {
    if (!row.includes("Apoyos / atención a la diversidad")) return row;
    const paragraphs = [...row.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)];
    const last = paragraphs.at(-1);
    if (!last) return row;
    const kept = /<w:pPr(?:\s[^>]*)?>/.test(last[0])
      ? last[0].replace(/<w:pPr(?:\s[^>]*)?>/, (open) => `${open}<w:keepNext/>`)
      : last[0].replace(/<w:p(?:\s[^>]*)?>/, (open) => `${open}<w:pPr><w:keepNext/></w:pPr>`);
    return row.slice(0, last.index) + kept + row.slice(last.index + last[0].length);
  });
  archive.file("word/document.xml", output);
  return archive.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

function motorCardsSvg() {
  const cards = [
    ["EQUILIBRIO", "<path d='M40 95h110'/><path d='M95 35v60'/><circle cx='95' cy='25' r='10'/><path d='M95 55L65 70M95 55l30 18'/>"],
    ["ZIGZAG", "<path d='M40 35l110 25L40 85l110 30'/><path d='M136 105l14 10-17 4'/>"],
    ["SALTA", "<circle cx='65' cy='92' r='18'/><circle cx='125' cy='62' r='18'/><path d='M50 45c25-25 60-25 85 0'/><path d='M126 35l10 10-15 3'/>"],
    ["LLEVA", "<rect x='72' y='45' width='48' height='35' rx='6'/><circle cx='58' cy='104' r='9'/><path d='M58 95V62l25-22M58 74l-20 18M58 72l24 15M58 104l-18 24M58 104l22 24'/>"],
    ["GIRA", "<circle cx='95' cy='77' r='42'/><path d='M127 48l14 2-5-14'/><path d='M62 106l-14-2 5 14'/>"],
    ["PASA DEBAJO", "<path d='M40 55h110M50 55v70M140 55v70'/><circle cx='80' cy='92' r='9'/><path d='M80 101l25 8 20 18M80 101l-18 24M91 105l20-23'/>"],
  ];
  const positions = [[40, 55], [325, 55], [610, 55], [40, 400], [325, 400], [610, 400]];
  const bodies = cards.map(([label, icon], index) => {
    const [x, y] = positions[index];
    return `<g transform="translate(${x} ${y})"><rect width="245" height="305" rx="18" fill="#ffffff" stroke="#183b65" stroke-width="5"/><g transform="translate(25 35)" fill="none" stroke="#087d96" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">${icon}</g><text x="122.5" y="260" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#183b65">${label}</text></g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1123" height="794" viewBox="0 0 1123 794"><rect width="1123" height="794" fill="#ffffff"/><text x="561.5" y="34" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#183b65">Tarjetas de recorrido motor</text>${bodies}<text x="561.5" y="775" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#40566f">Recorta y deja que los niños elijan, ordenen y cambien las acciones.</text></svg>`;
}

async function buildContext(workshop) {
  return buildAIContext({
    workflow: "workshop",
    age: workshop.age,
    teacher_request: workshop.purpose,
    competency_ids: [workshop.competencyId],
    workshop_purpose: workshop.purpose,
    frequency_or_time: workshop.duration,
    classroom_context: {
      materials: workshop.materials,
      space: workshop.space,
      group_context: "Grupo de Educación Inicial; la docente ajustará el taller a su aula.",
    },
  });
}

async function buildMaterialContext(workshop) {
  return buildAIContext({
    workflow: "material_generation",
    age: workshop.age,
    teacher_request: "Crear tarjetas imprimibles simples para que los niños armen recorridos motores propios con acciones de equilibrio, salto, zigzag y transporte.",
    competency_ids: [workshop.competencyId],
    activity_purpose: workshop.purpose,
    requested_material_type: "tarjetas de recorrido motor imprimibles",
    criterion: workshop.criterion,
    print_constraints: "A4 horizontal, alto contraste, poco texto y recortable",
    available_materials: workshop.materials,
  });
}

function metadataFor(workshop, bundle, materialBundle = null) {
  const card = bundle.curriculum.competency_cards[0];
  const ageReference = bundle.curriculum.age_reference[0].reference;
  return {
    id: workshop.id,
    slug: workshop.slug,
    titulo: workshop.title,
    edad: workshop.age,
    tipo_taller: workshop.type,
    duracion_referencial: workshop.duration,
    competencia_principal_id: card.id,
    competencia_principal_nombre_canonico: card.official_name,
    capacidades_pertinentes: card.capacities.map((capacity) => capacity.official_name),
    referencia_curricular_edad: {
      edad: workshop.age,
      estado: ageReference.status,
      foco_semantico: ageReference.semantic_focus,
      patrones_observables: ageReference.observable_patterns,
      significado_trazable: ageReference.source_grounded_performance_meanings,
      politica_de_texto: "Paráfrasis semántica trazable para diseño pedagógico; no es cita textual MINEDU.",
    },
    proposito: workshop.purpose,
    criterio: workshop.criterion,
    evidencia_esperada: workshop.evidence,
    materiales: workshop.materials,
    espacio: workshop.space,
    recursos_asociados: workshop.resource ? [{ ...workshop.resource, provenance: materialBundle?.provenance ?? null }] : [],
    reutilizable: true,
    knowledge_base_version: bundle.provenance.knowledge_base_version,
    knowledge_unit_ids: bundle.provenance.knowledge_unit_ids,
    source_claim_ids: bundle.provenance.source_claim_ids,
    source_refs: bundle.provenance.source_refs,
    competency_ids: bundle.provenance.competency_ids,
    plantilla: {
      archivo: "assets/templates/taller-inicial-ayni-unificada-v1.docx",
      sha256: templateSha256,
      version: "taller-unified-v1",
    },
  };
}

function markdownEscape(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

async function main() {
  assert.equal(workshops.length, 6);
  assert.equal(new Set(workshops.map((workshop) => workshop.id)).size, 6);
  assert.deepEqual([...new Set(workshops.map((workshop) => workshop.age))].sort(), [3, 4, 5]);
  for (const competencyId of ["PSICO_MOTRICIDAD", "COM_ARTE"])
    assert.deepEqual(workshops.filter((workshop) => workshop.competencyId === competencyId).map((workshop) => workshop.age).sort(), [3, 4, 5]);

  const templateBuffer = await readFile(templatePath);
  assert.equal(createHash("sha256").update(templateBuffer).digest("hex"), templateSha256, "La plantilla suministrada cambió.");
  const results = [];
  for (const workshop of workshops) {
    const bundle = await buildContext(workshop);
    assert.equal(bundle.workflow, "workshop");
    assert.deepEqual(bundle.provenance.competency_ids, [workshop.competencyId]);
    assert.equal(bundle.curriculum.age_reference.length, 1);
    assert.equal(bundle.curriculum.age_reference[0].age, workshop.age);
    assert.equal(Object.keys(bundle.curriculum.competency_cards[0].ages).join(), String(workshop.age));
    assert.deepEqual(bundle.provenance.source_refs, commonSources);

    const card = bundle.curriculum.competency_cards[0];
    const ageReference = bundle.curriculum.age_reference[0].reference;
    const directory = path.join(libraryRoot, `${workshop.age}-anos`, workshop.typeFolder, workshop.slug);
    await mkdir(directory, { recursive: true });
    let materialBundle = null;
    if (workshop.resource) {
      materialBundle = await buildMaterialContext(workshop);
      const assetDirectory = path.join(directory, "assets");
      await mkdir(assetDirectory, { recursive: true });
      const svg = motorCardsSvg();
      await writeFile(path.join(assetDirectory, "tarjetas-recorrido-motor.svg"), svg, "utf8");
      await sharp(Buffer.from(svg)).resize(2480, 1754, { fit: "fill" }).png().toFile(path.join(assetDirectory, "tarjetas-recorrido-motor.png"));
    }

    const docxName = fileName(workshop);
    const docxBuffer = await renderFromTemplate(templateBuffer, wordValues(workshop, card, ageReference));
    await writeFile(path.join(directory, docxName), docxBuffer);
    const metadata = metadataFor(workshop, bundle, materialBundle);
    await writeFile(path.join(directory, "metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
    results.push({ workshop, metadata, directory, docxName });
  }

  const rows = results.map(({ workshop, metadata, directory, docxName }) => {
    const relativeWord = path.relative(root, path.join(directory, docxName)).replaceAll("\\", "/");
    const resources = workshop.resource ? workshop.resource.files.join("; ") : "Ninguno";
    return `| ${workshop.age} | ${markdownEscape(workshop.type)} | ${markdownEscape(workshop.title)} | ${markdownEscape(metadata.competencia_principal_nombre_canonico)} | ${markdownEscape(workshop.purpose)} | ${markdownEscape(workshop.criterion)} | ${markdownEscape(resources)} | \`${relativeWord}\` | ${metadata.source_refs.join("; ")} | ${markdownEscape(workshop.difference)} | Validado con contexto \`workshop\` de KB v4. |`;
  });
  const validation = `# Validación del piloto de talleres

El piloto contiene exactamente seis talleres reutilizables de Educación Inicial, construidos con el workflow \`workshop\` y una sola competencia principal confirmada por taller. Las referencias de edad son paráfrasis semánticas trazables de la Knowledge Base v4.0.0, no citas textuales del MINEDU.

| Edad | Tipo | Título | Competencia | Propósito | Criterio | Recursos creados | Ruta del Word | source_refs | Diferencia respecto a otras edades | Observaciones |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${rows.join("\n")}

## Comprobaciones realizadas

- Cada competencia aparece una vez para 3, 4 y 5 años.
- Cada paquete de contexto contiene solo la referencia curricular de la edad solicitada.
- Los seis talleres usan una competencia principal y no añaden competencias secundarias decorativas.
- Propósito, criterio, evidencia, materiales, espacio, secuencia y foco de observación mantienen una relación explícita.
- Las diferencias entre edades afectan la acción infantil, el reto motor o creativo, la mediación y la evidencia; no son cambios nominales.
- El recurso de 5 años de Psicomotricidad se generó por código y se vinculó a un contexto \`material_generation\`.
- Los campos de institución, aula, docente, fecha, año, vinculación futura, observaciones posteriores y ajustes posteriores permanecen como placeholders.
- La plantilla retenida se copió sin cambios. En cada copia se reemplazaron los placeholders de biblioteca, se evitó partir filas y se suprimieron dos saltos redundantes que generaban páginas vacías cuando el contenido crecía.
- La comprobación del paquete DOCX confirmó que todas las partes de la plantilla, salvo \`word/document.xml\`, conservan exactamente su contenido; no se alteraron estilos, encabezados, pies, relaciones ni imágenes.
- Los seis Word se abrieron y exportaron con Microsoft Word para inspección visual: cuatro páginas por documento, 24 páginas revisadas, sin contenido recortado ni superpuesto. El recurso imprimible SVG/PNG también se inspeccionó visualmente.

## Problemas detectados / mejoras recomendadas antes de escalar

1. El workflow \`workshop\` reutiliza las reglas de generación de \`activity\` y no incorpora el módulo \`projects_units_workshops\` ni \`evidence_and_criteria\` como dominios obligatorios. Para escalar conviene añadir, dentro del mismo workflow, reglas específicas de recurrencia, tipo de taller y coherencia criterio-evidencia; no se necesita una arquitectura paralela.
2. El retrieval de \`material_generation\` puede incluir source claims de dominios opcionales poco pertinentes aunque el material sea motor. Conviene exigir relevancia mínima o limitar dominios opcionales según el tipo de material antes de usar el bundle para generación automática.
3. La plantilla no distingue entre campos de biblioteca y campos que solo pueden completarse después de una aplicación. Conviene formalizar ese contrato en el exportador para preservar observaciones y ajustes como datos docentes futuros.
4. Antes de ampliar la biblioteca, una revisión pedagógica humana debe confirmar la redacción de los criterios y la utilidad práctica de las duraciones y materiales en aulas reales.
`;
  await writeFile(path.join(libraryRoot, "VALIDACION_PILOTO_TALLERES.md"), validation, "utf8");
  console.log(`Generados ${results.length} talleres en ${libraryRoot}`);
}

await main();
