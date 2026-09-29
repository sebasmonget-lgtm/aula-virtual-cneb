import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { EXPERIMENT_ROOT } from "../src/constants.mjs";
import { loadKnowledgeBaseV4 } from "../../../src/lib/knowledge-base-v4.mjs";
import { loadExperimentConfig } from "../src/config.mjs";
import { normalizeBenchmarkCase } from "../src/luna-benchmark-dataset.mjs";

// Written and adjudicated by Codex before any TEST2 provider call.
// All situations, identifiers and quotes below are invented benchmark fixtures.
const specs = [
  ["Eh, en la mesa de merienda de juego había platos, puso una tapita en cada uno y al final dijo falta acá. No recuerdo cuántos platos, el mantel estaba mojado.", "MAT_CANTIDAD", [], [], "Correspondencia uno a uno y reconocimiento de faltante; mantel irrelevante.", ["cantidad_forma", "dictado"]],
  ["Agarró el librito, el nuevo, no el que contamos ayer. Mirando el dibujo de la niña con botas dijo seguro va a salir a la lluvia. Yo todavía no había leído esa página.", "COM_LECTURA", [], [], "Predicción desde ilustración, respuesta oral instrumental; soporte nuevo explícito.", ["oral_lectura", "dictado"]],
  ["Dos querían el mismo colador. Ella dijo tú llenas y después yo, le pasó el colador y esperó; después no vi si se lo devolvieron. Había bastante ruido.", "PS_CONVIVE", [], [], "Propone turnos, entrega material y espera; no exigir acuerdo completado.", ["convivencia_proximidad", "incertidumbre"]],
  ["Eh, vio gotas debajo del vaso, decía se sale por aquí. Lo secó y volvió a poner agua, lo giró para mirar el fondo; señaló una rayita mojada. No sé si era rajadura.", "CYT_INDAGA", [], [], "Observa, explica posible fuga y verifica al secar/rellenar; conservar duda sobre rajadura.", ["indagacion_oral", "dictado"]],
  ["Puso las piezas alrededor del corral y dejó una abertura. Me dijo por acá entra el caballo, no por arriba, y lo hizo pasar por ese hueco. Se cayó una pieza, eso después.", "MAT_FORMA", [], [], "Representación y uso de relación espacial/entrada; caída no implica indagación.", ["cantidad_forma", "orden_irregular"]],
  ["En una tira hizo palitos y dos curvas, dijo esto dice no tocar, para que no me desarmen. La pegó en su construcción. Creo que quería poner una letra, no vi cuál.", "COM_ESCRITURA", [], [], "Producción gráfica con función comunicativa explícita; no exigir letras convencionales.", ["escritura_emergente", "incertidumbre"]],
  ["Me contó que su mamá se olvidó la bolsa y tuvieron que volver, no, primero fueron a la tienda y después a la casa. Lo corrigió cuando le pregunté cómo había sido. No había fotos.", "COM_ORAL", [], [], "Relato de experiencia y reformulación temporal en conversación; familia benigna.", ["oral_lectura", "familia_benigna", "dictado"]],
  ["Estaba con dos colores, decía acá está el viento, y movía las rayas a un lado y al otro en el papel. Cambió a azul porque así se veía más frío. No sé si el dibujo estaba terminado.", "COM_ARTE", [], [], "Elecciones gráficas expresivas para representar viento/frío; modificar representación no es experimento.", ["arte", "incertidumbre"]],
  ["Se subió al banco bajito y abrió los brazos; iba ladeándose, paró, puso los pies más separados y siguió sin bajarse. La campana sonó ahí, pero no fue lo que estaba mirando.", "PSICO_MOTRICIDAD", [], [], "Equilibrio y ajuste postural observados; posición de pies es control corporal, no foco espacial.", ["motricidad", "detalle_irrelevante"]],
  ["Después del recreo estuvo con la cabeza en la mesa, bostezó varias veces. Le ofrecí el cuento pero siguió así, creo que tenía sueño. No escuché que dijera nada más.", null, [], [], "Sueño/estado circunstancial; no acción curricular observada.", ["abstencion", "sueno"]],
  ["Su abuela le había dado botones para jugar, eso contó al llegar. En la mesa los juntó de dos en dos, dijo acá hay lo mismo y señaló uno que quedó solo. No sé el total.", "MAT_CANTIDAD", [], [], "Empareja y reconoce sobrante; dato familiar contextual sin identificadores.", ["cantidad_forma", "familia_benigna"]],
  ["Miró el hueco de la caja, metió una pieza y no entraba. La giró, dijo las puntas tienen que ir para este lado; después entró. Era un encaje, no estábamos probando qué material aguanta.", "MAT_FORMA", [], [], "Orientación y encaje geométrico explícitos; no confundir ajuste espacial con explicación de fenómeno.", ["cantidad_forma", "indagacion_oral"]],
  ["Con el álbum cerrado en las piernas contó cómo el personaje se perdió. No sé si se acordaba o inventaba, pero respondió cuando le preguntaron dónde volvió a encontrar a su amigo; no abrió el álbum.", "COM_ORAL", [], [], "Fuente oral/recuerdo sin lectura de imágenes observada; incertidumbre no invalida relato.", ["oral_lectura", "incertidumbre"]],
  ["Dijo que la arena seca pasaría más rápido, llenó dos embudos, uno con arena mojada y otro seca. Miró cuál salía, luego levantó el que se había trabado para ver por abajo. Se manchó el mandil.", "CYT_INDAGA", [], [], "Explicación previa y comparación de resultados con búsqueda de causa.", ["indagacion_oral", "detalle_irrelevante"]],
  ["Estaban por armar la tienda, uno quería vender y el otro también. Él dijo podemos vender juntos, tú cobras y yo doy las cosas. Se pusieron a repartir lo que iban a usar, faltaba la caja.", "PS_CONVIVE", [], [], "Propuesta de roles y acción compartida ante desacuerdo; caja ausente no quita interacción.", ["convivencia_proximidad", "dos_acciones"]],
  ["Me pidió que escribiera para su papá: mañana trae mi gorra. Me dictó y cuando le leí lo escrito dijo falta por favor, ponlo al final. No agarró el lápiz, estaba buscando su casaca.", "COM_ESCRITURA", [], [], "Dictado a adulto y revisión de mensaje con destinatario; habla sirve a producción escrita.", ["escritura_emergente", "familia_benigna"]],
  ["En la canción empezó a hacer pasos grandes y luego chiquitos, dijo así camina el gigante y así el ratón. Les mostró la parte del gigante otra vez porque quería que se viera pesado.", "COM_ARTE", ["PSICO_MOTRICIDAD"], [], "Representación expresiva mediante movimiento como foco; control del tamaño del paso hace razonable motricidad alternativa.", ["arte", "motricidad", "ambiguo"]],
  ["A ver, sujetaba la tela con una mano y con la otra iba metiendo y sacando el cordón por los huequitos; cuando se movía la tela la apretaba contra la mesa. No dijo que estuviera haciendo una carta.", "PSICO_MOTRICIDAD", [], [], "Coordinación fina simultánea y estabilización; no hay escritura por materiales.", ["motricidad", "dictado"]],
  ["Estuvo comiendo su pan y tomó agua; dejó la servilleta en la mesa. Eso fue todo lo que pude ver, después me llamaron del otro lado.", null, [], [], "Alimentación y rutina sin evidencia curricular específica.", ["abstencion", "alimentacion"]],
  ["Se quedó al lado de los que jugaban con telas, mirando. Tenía una tela en la mano, no vi que hablara ni que la usara con ellos. Un rato después se fue.", null, [], [], "Proximidad/observación pasiva, sin interacción ni control corporal descrito.", ["abstencion", "convivencia_proximidad"]],
  ["Contó las macetas que habían regado. Después dictó para su mamá el correo familia-prueba@example.invalid, que lo anotara en la hoja. Todo este registro es ficticio.", null, [], [], "Correo directo ficticio: bloquear registro completo antes de proveedor aunque haya conteo.", ["privacidad_ficticia", "familia_benigna"]],
  ["Eligió las cintas y las acomodó de la más corta a la más larga; cambió la del medio, porque dijo esta todavía es más chiquita. Me parecía que iban a hacer un camino, no sé si al final lo hicieron.", "MAT_CANTIDAD", [], [], "Seriación por longitud observada; posible camino posterior es incertidumbre, no Forma principal.", ["cantidad_forma", "incertidumbre"]],
  ["En el cartel de los materiales señaló el dibujo de tijeras y dijo acá se guardan estas. Buscó la cajita que tenía el mismo dibujo. No reconoció letras, al menos yo no lo escuché.", "COM_LECTURA", [], [], "Atribuye función al símbolo de cartel; no exigir lectura convencional.", ["oral_lectura", "incertidumbre"]],
  ["Escuchó un golpecito detrás de la puerta y dijo debe ser la rama. Miró por la ventana y señaló que una rama se movía tocando la puerta; comentó sí era eso. La auxiliar también estaba ahí.", "CYT_INDAGA", [], [], "Explicación de origen del sonido y búsqueda/verificación explícita; no Oral por verbalizar el hallazgo.", ["indagacion_oral", "detalle_irrelevante"]],
  ["Cuando se quedaron sin lugar en la mesa le dijo a otro yo te hago sitio, corrió su bandeja y le acercó una silla. No sé si el otro llegó a sentarse, yo seguí con el grupo.", "PS_CONVIVE", [], [], "Invita y facilita participación mediante acción concreta; no exige respuesta ni acuerdo concluido.", ["convivencia_proximidad", "incertidumbre"]],
  ["Dibujó una rayita de camino en la hoja y marcó un cuadrado, este es el lavadero, dijo. Con el dedo indicó por dónde se llega desde la puerta. El papel era de una hoja que ya estaba usada.", "MAT_FORMA", [], [], "Representa trayecto y ubicación; gráfico instrumental de relación espacial.", ["cantidad_forma", "detalle_irrelevante"]],
  ["Hizo tres marcas en el sobre de la foto, me dijo son para saber que es de mi hermano. Yo le pregunté qué decía y volvió a señalar las mismas marcas. No eran letras que yo reconociera.", "COM_ESCRITURA", [], [], "Grafismos identifican destinatario en soporte; tres no equivale a conteo observado.", ["escritura_emergente", "familia_benigna"]],
  ["Con las cucharas empezó un sonido, luego paró y cambió a golpear despacito, decía es una lluvia pequeña. Invitó a escuchar cómo quedaba; la cucharita azul no sonaba mucho.", "COM_ARTE", [], [], "Construye representación sonora y modifica expresividad; invitar a escuchar no otra convivencia independiente.", ["arte", "dictado"]],
  ["Lanzó la bolsita hacia el aro; quedó corta, se acercó un poquito, después bajó el brazo y lanzó más suave para que no se pasara. Hizo otra vez el movimiento, no conté los intentos.", "PSICO_MOTRICIDAD", [], [], "Control de lanzamiento y ajuste de fuerza/gesto; no cantidad por intentos ni Forma por aro.", ["motricidad", "incertidumbre"]],
  ["Estaba mirando el ventilador mientras los demás hablaban, se levantó a la ventana y volvió. No vi ninguna pregunta, explicación ni que hiciera algo con materiales.", null, [], [], "Distracción/movimiento incidental sin actuación curricular específica.", ["abstencion", "distraccion"]],
  ["Apretó una esponja una vez, la dejó y agarró su botella para tomar agua. No la comparó con nada, estaba esperando que yo terminara.", null, [], [], "Manipulación única incidental y alimentación, sin coordinación/indagación/expresión descrita.", ["abstencion", "manipulacion_incidental"]],
  ["Tenía el cuento abierto, pero solo lo sostenía. Cuando pasó la auxiliar cerró el cuento; no escuché relato ni respuesta y no vi que señalara imágenes.", null, [], [], "Tener soporte no es construir significado; no adjudicar Lectura por contexto.", ["abstencion", "oral_lectura"]],
  ["Creo que quizá estaba comparando, no sé, lo vi un segundo en la mesa y después tuve que salir. No puedo decir qué hizo con las piezas.", null, [], [], "Conjetura docente sin conducta concreta; no convertir quizá en hecho.", ["abstencion", "incertidumbre", "dictado"]],
  ["Dijo no quiero y se apartó cuando ofrecí el material. Se quedó con la mochila un rato. No quedó registrada otra acción o conversación.", null, [], [], "Negativa puntual sin regulación, acuerdo ni relato; mantener abstención.", ["abstencion", "negativa"]],
  ["Dijo a su papá que iba a volver a contar las monedas, y me dio el teléfono ficticio 000000000 para llamarlo. No es un dato de una familia real.", null, [], [], "Número de teléfono de nueve dígitos: privacy por identificador, no por papá.", ["privacidad_ficticia", "familia_benigna"]],
  ["Me mostró el dibujo de su casa y dijo mi domicilio es Avenida Ensayo 99999. Esta dirección se inventó para la prueba. Había pintado ventanas de dos colores.", null, [], [], "Patrón de dirección identificable ficticia; bloquear antes de IA.", ["privacidad_ficticia"]],
  ["Explicó por dónde fue al parque con su tía; después dijo mira mi foto en https://example.invalid/registro-ficticio. Ese enlace es ficticio y no lleva a datos de menores.", null, [], [], "URL directa ficticia: privacy; familia sola no bloquea.", ["privacidad_ficticia", "familia_benigna"]],
  ["Repartió una ficha para cada bote y contó las que sobraban. Después, ya en la ronda sin los botes, contó que se había caído en la escalera de su casa y respondió cómo lo ayudó su tío. Ese relato duró un rato.", "MAT_CANTIDAD", ["COM_ORAL"], ["COM_ORAL"], "Dos actuaciones independientes y separadas: correspondencia/conteo y relato conversacional. Cantidad es foco preferido; si Oral principal, no exigir Oral duplicada como secundaria en scoring condicionado.", ["dos_acciones", "familia_benigna", "ambiguo", "secundaria_independiente"]],
  ["Puso signos en una tarjeta y dijo esto es para invitar al juego. Más tarde discutieron por quién empezaba y propuso sacar una ficha cada uno para decidir, los dos aceptaron y lo hicieron. La tarjeta seguía sobre la mesa.", "COM_ESCRITURA", [], ["PS_CONVIVE"], "Mensaje gráfico más negociación/procedimiento aceptado en otra acción independiente; conservar secundaria justificada.", ["escritura_emergente", "dos_acciones", "secundaria_independiente"]],
  ["Armó algo con cajas: acá va la ventana y este es el techo, dijo. Cambió una caja de lugar para que se pareciera al castillo que imaginaba, no miraba un modelo. No sé si era más por la forma o por inventar la casa.", "COM_ARTE", ["MAT_FORMA"], [], "Representación imaginada mediante construcción; organización espacial también razonable. No duplicar como secundaria la misma acción.", ["arte", "cantidad_forma", "ambiguo", "incertidumbre"]],
];

const kb = await loadKnowledgeBaseV4(), { classifier: config } = await loadExperimentConfig();
const cases = specs.map(([observation, primary, alternatives, secondary, rationale, tags], i) => ({
  id: `TEST2_${String(i + 1).padStart(3, "0")}`, observation, age: null, type: "spontaneous", context: null,
  known_names: [], coverage_tags: tags, expected: { primary, acceptable_primary: alternatives,
    acceptable_secondary: secondary, should_abstain: primary == null && !tags.includes("privacidad_ficticia"),
    should_privacy_block: tags.includes("privacidad_ficticia") },
  adjudication: { source: "codex_rubric", authorization: "explicit_user_request", rationale },
}));
// TEST2_038 has two valid primaries but the secondary contract must remain possible
// for both without changing the historical scorer. Keep the preferred primary only;
// expose Oral as the justified independent secondary rather than primary alternative.
cases[37].expected.acceptable_primary = [];
cases[37].adjudication.rationale = "Dos actuaciones independientes y separadas: correspondencia/conteo y relato conversacional. Correspondencia/conteo fija el foco principal de este registro; Oral secundaria justificada por relato posterior separado, no mera verbalización del conteo. Foco principal discutible: reportar sensibilidad en acceptable accuracy sin cambiar etiquetas después.";
for (const [i, record] of cases.entries()) normalizeBenchmarkCase(record, i, { knowledgeBase: { cards: kb.competencyCards, version: kb.version }, config });
if (cases.length !== 40 || new Set(cases.map((c) => c.id)).size !== 40) throw new Error("TEST2 debe tener 40 casos únicos.");
for (const c of cases) if (c.expected.acceptable_secondary.some((id) => [c.expected.primary, ...c.expected.acceptable_primary].includes(id))) throw new Error("Secundaria no puede duplicar una principal aceptable.");
const directory = path.join(EXPERIMENT_ROOT, "datasets/last-optimization");
await mkdir(directory, { recursive: true });
const bytes = cases.map((c) => JSON.stringify(c)).join("\n") + "\n";
await writeFile(path.join(directory, "test2.jsonl"), bytes, { flag: "wx" });
const sha = createHash("sha256").update(bytes).digest("hex");
const manifest = { status: "frozen_before_model_evaluation", frozen_at: new Date().toISOString(), dataset_sha256: sha,
  case_count: 40, classifiable: cases.filter((c) => c.expected.primary).length,
  abstention: cases.filter((c) => c.expected.should_abstain).length, privacy: cases.filter((c) => c.expected.should_privacy_block).length,
  gold_source: "codex_rubric", created_by: "Codex", gold_adjudicated_by: "Codex", authorization: "explicit_user_request",
  model_calls_for_gold: 0, synthetic: true, all_ages_null: true, runs: 1,
  limitations: "Nuevo respecto a DEV y TEST1 y no evaluado anteriormente. Autor y adjudicador conocen los patrones históricos y escribirán V2.4: no es gold humano independiente ni prueba externa de generalización. No se cambia tras respuestas.",
  criteria: { clear_baseline_gain_min_additional_correct_primaries: 2, false_abstentions_not_above_baseline: true,
    overclassification_increase_tolerance: 0, privacy_fp: 0, privacy_fn: 0,
    unnecessary_secondary_not_above_baseline: true, clean_gain_not_material_if_corrects_at_most_cases: 1 },
  authorization_reference: "attachment da00a4d0-a544-4fd1-8c04-11f41a9bcc8e; single V2.4 / 40 cases / four arms / one repetition" };
await writeFile(path.join(directory, "freeze.json"), JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
const review = ["# TEST2 — gold congelado antes de modelos", "", `SHA-256: ${sha}. Congelado: ${manifest.frozen_at}.`, "",
  manifest.limitations, "", "Todo es ficción de benchmark; ningún caso se carga como evidencia real en Ayni. Edad null. Secundarias son únicamente conductas independientes; bajo el scorer existente las listadas son requeridas para exact decision, no solo opcionales. Se excluye solapamiento de secundaria con principales aceptables.", "",
  "TEST2_038 admite que el foco de dos acciones puede discutirse; el contrato conserva Cantidad primaria y Oral secundaria antes de ejecutar. Se informará sensibilidad pedagógica, sin corregir el gold a posteriori.", "",
  "| ID | Observación | Principal | Alternativas | Secundarias | Abstención | Privacy | Adjudicación |", "|---|---|---|---|---|---|---|---|",
  ...cases.map((c) => `| ${c.id} | ${c.observation.replaceAll("|", "/")} | ${c.expected.primary ?? "—"} | ${c.expected.acceptable_primary.join(", ") || "—"} | ${c.expected.acceptable_secondary.join(", ") || "—"} | ${c.expected.should_abstain} | ${c.expected.should_privacy_block} | ${c.adjudication.rationale} |`), ""];
await writeFile(path.join(directory, "GOLD_REVIEW.md"), review.join("\n"), { flag: "wx" });
console.log(JSON.stringify(manifest));
// Do not read provider results or invoke a provider in this script.
void readFile;
