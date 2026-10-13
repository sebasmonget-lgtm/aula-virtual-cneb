/** Teacher actions for existing criteria: no generated observations or new CNEB IDs. */
const actions = {
  getting_to_know_us: {
    choice: 'Presenta los espacios y materiales del juego. Invita a elegir por dónde comenzar y deja tiempo para explorar la elección.',
    conversation: 'Mientras juegan, invita a contar qué quieren hacer y a escuchar la propuesta de un compañero. Acompaña la conversación sin responder por ellos.',
    agreements: 'Cuando necesiten compartir materiales o turnarse, pregunta cómo podrían organizarse. Deja que propongan y prueben sus acuerdos.',
    joins_game: 'Deja abierta la posibilidad de sumarse al juego de otros. Acompaña a quien observe primero o quiera invitar a un compañero, sin forzar la participación.',
  },
  movement_and_art: {
    movement: 'Invita a explorar el espacio con movimientos que cada niño elija. Deja lugar suficiente para correr, girar o agacharse con seguridad.',
    creation: 'Ofrece papel, telas y otros materiales seguros. Invita a combinarlos para crear algo propio, sin mostrar un modelo único.',
    adjust_movement: 'Propón un recorrido con obstáculos bajos y seguros. Deja que prueben por dónde pasar y cambien sus movimientos cuando lo necesiten.',
    express_idea: 'Invita a representar una idea con el cuerpo o los materiales explorados. Da tiempo para mostrar la creación y contar qué quisieron expresar.',
  },
  count_and_locate: {
    quantity: 'Plantea una necesidad del juego, como reunir las piezas para construir o repartir objetos. Permite que decidan cuántos necesitan y cómo reunirlos.',
    space: 'Prepara un recorrido sencillo e invita a colocar objetos o explicar por dónde llegar. Escucha sus palabras y gestos sobre las posiciones.',
    compare_groups: 'Acerca dos grupos de objetos que usen en el juego. Pregunta si alcanzan o si falta algo y permite que comparen a su manera.',
    change_route: 'Si una parte del recorrido queda bloqueada, invita a buscar otra manera de llegar. Permite mover piezas o probar un camino diferente.',
  },
  explore_our_world: {
    question: 'Acerca hojas, agua u otros materiales seguros. Invita a mirar y explorar; escucha qué les llama la atención y las preguntas que surjan.',
    tell_discovery: 'Haz una pausa para compartir un hallazgo de la exploración. Invita a mostrarlo y explicarlo a otro niño o a la profesora.',
    compare_materials: 'Pon dos materiales seguros al alcance. Invita a mirarlos o tocarlos y conversar sobre sus semejanzas y diferencias.',
    tries_again: 'Si quieren seguir explorando, invita a cambiar un material o una cantidad. Deja que prueben y cuenten qué ocurrió, sin anticipar la respuesta.',
  },
  stories_and_marks: {
    reading: 'Antes o durante la lectura, muestra una imagen del cuento y pregunta qué creen que pasará. Escucha distintas ideas sin convertirlo en una prueba.',
    writing: 'Después del cuento, ofrece papel y colores para comunicar algo de la historia con dibujos, trazos o escrituras propias.',
    retelling: 'Invita a recordar una parte del cuento con sus propias palabras. Da tiempo y permite apoyarse en las imágenes.',
    shares_marks: 'Invita a mostrar sus producciones a un compañero y contar qué quisieron comunicar. Escucha el significado que cada niño les atribuye.',
  },
  spanish_second_language: {
    l2_oral: 'Propón el juego conocido con objetos cercanos. Usa invitaciones breves en castellano y tiempo para responder, aceptando también gestos o la lengua familiar.',
  },
  beliefs_and_care: {
    religion: 'Invita, solo a quien desee hacerlo, a compartir una acción de cuidado o una tradición familiar. Facilita una escucha respetuosa sin pedir detalles personales.',
  },
};
export function diagnosticMomentInstruction(experienceId, aspectId, fallback) {
  return actions[experienceId]?.[aspectId] ?? fallback;
}
