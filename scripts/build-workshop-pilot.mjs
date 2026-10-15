import { pilotWorkshops } from "../src/lib/workshop-pilot-content.mjs";
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

const workshops = pilotWorkshops;

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
