import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { EXPERIMENT_ROOT } from "../src/constants.mjs";
import { loadKnowledgeBaseV4 } from "../../../src/lib/knowledge-base-v4.mjs";

// Independently authored fictional records. Coverage intentions are not adjudicated gold.
const groups = {
  cantidad: [
    'Eh, sujetó cada pañuelo con un broche. Cuando sobraron dos broches dijo: "Estos no tienen pañuelo".',
    'En la tienda de juego contó seis fichas para pagar y volvió a contarlas, creo que para asegurarse.',
    'Comparó dos montones de semillas sin contarlas: "Acá hay más, este montón llega más lejos".',
    'Puso una cuchara por cada muñeco y al llegar al último dijo que faltaba una. Fue a buscarla.',
    'A ver, eligió los lápices y los dejó del más cortito al más largo; cambió dos de lugar porque uno era más grande.',
    'Dijo que necesitaban cuatro ruedas para el dibujo del autobús, dibujó tres y agregó una al volver a contar.',
    'Su papá aparece en su relato de mercado; mostró cinco monedas de cartón y separó dos: "Me quedan tres".',
    'Creo que comparaba cantidades: juntó dos collares, alineó una cuenta con otra y señaló las que quedaban sin pareja.',
  ],
  forma_localizacion: [
    'Indicó a la muñeca cómo llegar: "Pasa debajo de la silla y después gira hacia la puerta"; hizo el recorrido con ella.',
    'Probó una pieza triangular en un hueco, la giró y dijo que ahora sus puntas coincidían.',
    'Con una cuerda marcó un camino alrededor de la alfombra. Explicó que el coche no debía pasar por dentro.',
    'Miró la silueta de un círculo y buscó una tapa que encajara; rechazó una cuadrada porque tenía esquinas.',
    'Puso el conejo detrás del cojín y pidió a su hermano imaginario que lo buscara; después lo cambió delante.',
    'En el plano del patio señaló la zona de arena y siguió con el dedo la ruta hasta el lavadero.',
    'Acomodó tres figuras para repetir el dibujo de una ventana; dijo que el rectángulo iba arriba, no al lado.',
    'No sé si entendió la consigna, pero movió el aro lejos del banco y dijo: "Ahora queda más separado".',
  ],
  indagacion: [
    'Sacudió dos frascos cerrados y preguntó por qué sonaban distinto. Probó despacito y luego fuerte para comparar.',
    'Observó que la sombra del árbol había cambiado de sitio. Dibujó una marca y pidió volver a mirar después.',
    'Acercó un imán a una arandela y a un botón; repitió la prueba y dijo que solo una cosa se pegaba.',
    'Puso hojas grandes y pequeñas al viento del abanico y comparó cuáles se movían más. Cambió la distancia.',
    'Preguntó si el color del papel pasaba al agua. Mojó dos tiras diferentes y señaló que una soltaba más color.',
    'Creía que una tela absorbía más; echó la misma cucharadita de agua en dos telas y miró las manchas.',
    'Miró las huellas de dos caracoles con lupa y preguntó por qué una línea se veía más ancha. Las comparó.',
    'Probó tapar un vaso sonoro con cartón. Dijo que se oía menos y lo destapó para comprobar otra vez.',
  ],
  comunicacion_oral: [
    'Contó al grupo cómo había perdido su gorra y explicó en qué lugares la buscó, sin mirar ningún dibujo.',
    'Le preguntaron cómo preparar la masa; explicó primero qué mezclar y después cómo amasar, con sus propias palabras.',
    'Dijo que no entendía a qué juguete se refería su compañera y le preguntó: "¿Al rojo o al que tiene ruedas?".',
    'Al escuchar una explicación dijo: "Eso pasó antes, no después", y relató el orden de lo ocurrido.',
    'Le contó a un títere que su mamá tenía una bicicleta. Respondió dos preguntas y amplió lo que había dicho.',
    'Creo que quería explicarse mejor: repitió el pedido con otras palabras cuando la profesora no lo entendió.',
    'Describió un sonido que había escuchado en el patio y explicó por qué pensaba que venía de un pájaro.',
    'Contó una anécdota de su abuelo y preguntó a otra niña si a ella le había pasado algo parecido.',
  ],
  lectura: [
    'Miró la portada con nubes oscuras y dijo que quizá la historia empezaba con una lluvia; mostró la imagen que lo hacía pensar.',
    'En una secuencia de ilustraciones señaló un zapato perdido y explicó que el personaje lo buscaba en la página siguiente.',
    'Vio el símbolo de manos bajo un grifo en un cartel y dijo que ahí avisaba dónde lavarse.',
    'Comparó dos envases y buscó la imagen de avena para decidir cuál servía para la receta que miraban.',
    'Pasó páginas del libro para encontrar dónde se escondía el ratón; usó las ilustraciones y corrigió su primera respuesta.',
    'Dijo que una tarjeta era una invitación porque tenía una torta y una fecha, aunque no podía leer todas las letras.',
    'En el cuento señaló el dibujo del papá con paraguas: "Va a salir porque parece que está lloviendo".',
    'No sé si reconoció las palabras; miró el letrero y explicó su significado apoyándose en el dibujo de una flecha y una salida.',
  ],
  escritura_emergente: [
    'Hizo rayitas en un papel y se lo entregó al títere: "Aquí dice que vuelva mañana".',
    'Preparó entradas para un teatro de juego. Puso marcas distintas y explicó cuál correspondía a cada visitante.',
    'Escribió algunas letras junto a una semilla sembrada: "Es para acordarnos de cuál es".',
    'Pidió que la profesora escribiera lo que quería decir a su abuela y después añadió una marca para firmar.',
    'En el juego de veterinaria anotó garabatos y dijo que eran las indicaciones para cuidar al animal.',
    'Creo que quería dejar un mensaje: hizo dos líneas de signos, las señaló y dijo que avisaban que faltaba una pieza.',
    'Puso una etiqueta con letras sueltas en su caja: "Así saben que estos recortes son míos".',
  ],
  arte: [
    'Eligió golpes suaves y fuertes en un tambor para representar una tormenta; dijo cuándo empezaba la lluvia.',
    'Movió un pañuelo lento y después rápido para mostrar cómo volaba una mariposa; invitó a mirar su movimiento.',
    'Con recortes armó un animal que no existía y explicó por qué le había puesto alas grandes.',
    'Mezcló dos colores para pintar una tarde oscura; cambió el color cuando dijo que todavía parecía de día.',
    'Con un títere representó la voz de una señora y luego la de un perro, cambiando el tono y el gesto.',
    'Hizo huellas con esponjas para crear un paisaje. Escogió otras formas para representar las montañas.',
    'Cantó una melodía inventada para la casa de juego y repitió una parte que dijo que era para su familia.',
  ],
  motricidad: [
    'Saltó una cinta con los dos pies juntos y al caer abrió los brazos para recuperar el equilibrio.',
    'Se agachó para pasar por un túnel bajo y luego se levantó sin tocar el techo de tela.',
    'Llevó una bolsita sobre la cabeza hasta el cono; cuando se inclinaba redujo la velocidad.',
    'Enhebró un cordón por agujeros pequeños, sujetando la pieza con una mano y guiando la punta con la otra.',
    'Giró un tornillo grande de juguete con los dedos mientras sostenía firme la base.',
    'Lanzó una pelota de tela a un cesto; ajustó la fuerza y la posición del brazo en el intento siguiente.',
    'Parecía inseguro al comenzar, pero apoyó un pie delante del otro sobre una línea curva sin salirse.',
  ],
  convivencia: [
    'Dos querían ser vendedores; propuso que una atendiera primero y él después. Ambos aceptaron y cambiaron de papel.',
    'Vio que otra niña no alcanzaba las telas y le ofreció sostener la caja mientras ella escogía.',
    'Invitó a un compañero al juego y le explicó qué papel podía tener; esperó su respuesta antes de seguir.',
    'Ante un desacuerdo sobre la música, sugirió escuchar una canción de cada uno y preguntó si estaban de acuerdo.',
    'Organizó con otros dónde guardar las piezas: uno recogía y ella sostenía el recipiente. Se avisaban lo que faltaba.',
    'Dijo que necesitaban escuchar a quien todavía no había hablado y le dio espacio para proponer otra idea.',
    'Se acercó a un grupo, preguntó si podía ayudar a preparar la mesa y repartieron entre todos lo que harían.',
  ],
  abstencion_y_limites: [
    'Al terminar la bienvenida bostezó dos veces y pidió acostarse un ratito.',
    'Dejó medio plátano en el plato y dijo que ya no quería comer más.',
    'Se distrajo con el ruido de una moto y dejó de atender un momento; luego volvió a sentarse.',
    'Lloró cuando se cerró la puerta y al poco rato se calmó; no alcancé a conversar con ella.',
    'Hoy no quiso ponerse el mandil. Después se lavó las manos y siguió la rutina.',
    'Se sentó cerca de dos compañeros que construían, sin hablarles ni participar; solo miró un rato.',
    'Tomó una masa, la apretó una vez y la dejó. No vi que preguntara, comparara o intentara comprobar algo.',
    'Agarró un pincel seco, lo dejó en otro vaso y fue por su mochila. No registré dibujo ni exploración.',
  ],
  privacidad_real_ficticia: [
    'Mostró una tarjeta de juego para su papá y dijo que su teléfono era 987654321.',
    'Quiso copiar en una nota el correo ficticio persona@example.invalid para mandarla a su familia.',
    'Mientras dibujaba dijo: "Mi domicilio es calle Inventada 123"; después señaló su casa en el dibujo.',
    'Pegó un papel con https://ejemplo.invalid/contacto y dijo que ahí estaba el nombre de su hermano.',
  ],
};
const records = Object.entries(groups).flatMap(([group, observations]) => observations.map((observation) => ({
  observation, coverage_tags: [group, ...(observation.includes("Creo") || observation.includes("creo") || observation.includes("No sé") || observation.includes("No sé") || observation.includes("Parecía") ? ["incertidumbre"] : [])],
})) ).map((record, i) => ({ id: `DEV_${String(i + 1).padStart(3, "0")}`, age: null,
  type: i % 6 === 0 ? "guided" : "spontaneous", ...record,
  provenance: "fictional_proposal_authored_without_test_gold_or_llm_judge",
  adjudication: { status: "pending", reviewed_by: null, reviewed_at: null, notes: "" } }));
if (records.length !== 80) throw new Error(`Expected 80 records, got ${records.length}.`);
await mkdir(path.join(EXPERIMENT_ROOT, "datasets/current-dev"), { recursive: true });
await writeFile(path.join(EXPERIMENT_ROOT, "datasets/current-dev/dev_proposal_v1.jsonl"), records.map((record) => JSON.stringify(record)).join("\n") + "\n", { encoding: "utf8", flag: "wx" });
const kb = await loadKnowledgeBaseV4();
const competencies = kb.competencyCards.filter((card) => Object.values(card.runtime_selectable_by_age).some(Boolean) && !["PS_RELIGION", "CAST_L2_ORAL"].includes(card.id))
  .map((card) => ({ id: card.id, name: card.official_name }));
await writeFile(path.join(EXPERIMENT_ROOT, "public/current-dev-proposal.json"), JSON.stringify({ version: "dev-proposal-v1", fictional: true,
  gold_status: "pending_human_adjudication", cases: records, competencies, kb_version: kb.version }, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
console.log(JSON.stringify({ records: records.length, coverage: Object.fromEntries(Object.entries(groups).map(([key, list]) => [key, list.length])), gold_assigned: false }));
