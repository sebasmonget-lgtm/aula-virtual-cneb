import { officialPerformances, OFFICIAL_PERFORMANCE_SOURCE } from './official-performance-references.mjs';
import { EVALUATION_LEVELS } from './assessment-display.mjs';

// Ayuda editorial, no una rúbrica oficial ni umbrales automáticos de calificación.

const focusByAge = {
  PS_IDENTIDAD: {
    3:'Reconoce sus gustos y necesidades, participa en su cuidado y expresa cómo se siente.',
    4:'Expresa qué lo distingue, actúa por iniciativa y reconoce sus emociones con acompañamiento.',
    5:'Explica sus preferencias, toma decisiones de cuidado y reconoce sus emociones y sus causas.',
  },
  PS_CONVIVE: {
    3:'Juega con otros, practica reglas conocidas y ayuda a cuidar los materiales.',
    4:'Se integra al juego, participa en acuerdos y cuida lo que comparte con otros.',
    5:'Propone acuerdos y formas de organizarse, asume responsabilidades y cuida el bienestar del grupo.',
  },
  PS_RELIGION: {
    3:'Reconoce el cuidado de su familia y participa en acciones sencillas de ayuda y agradecimiento.',
    4:'Expresa gratitud y participa con respeto en las prácticas de su familia y en acciones de ayuda.',
    5:'Relaciona las enseñanzas de su tradición con acciones de ayuda y respeta las creencias de los demás.',
  },
  PSICO_MOTRICIDAD: {
    3:'Explora movimientos y objetos, reconoce sensaciones y partes de su cuerpo.',
    4:'Combina movimientos, ajusta su fuerza y equilibrio y reconoce cambios en su cuerpo.',
    5:'Combina movimientos con control, se ajusta al espacio y los objetos y reconoce sensaciones de su cuerpo.',
  },
  COM_ORAL: {
    3:'Expresa lo que necesita, conversa y pregunta o responde sobre lo que escucha.',
    4:'Cuenta experiencias, hace preguntas y comenta hechos o personajes de lo que escucha.',
    5:'Cuenta con detalle, escucha a otros y explica sus ideas sobre experiencias y relatos.',
  },
  COM_LECTURA: {
    3:'Reconoce personajes en las imágenes, dice de qué podría tratar el texto y comenta lo que le gusta.',
    4:'Usa imágenes y otras pistas para anticipar el contenido y comentar lo que comprende.',
    5:'Usa imágenes y pistas del texto para anticipar qué ocurre y explicar sus ideas sobre lo leído.',
  },
  COM_ESCRITURA: {
    4:'Escribe a su manera, con líneas, trazos o letras, para comunicar algo.',
    5:'Escribe a su manera para alguien y con un propósito; revisa con ayuda si comunica lo que quería.',
  },
  COM_ARTE: {
    3:'Explora materiales, sonidos o movimientos para representar sus experiencias y comparte lo que hace.',
    4:'Combina materiales, representa sus vivencias y muestra o comenta su creación.',
    5:'Prueba combinaciones, representa sus ideas y comparte cómo creó y qué le gustó.',
  },
  CAST_L2_ORAL: {5:'Comprende mensajes cotidianos en castellano y responde con palabras, frases o gestos, usando apoyos cuando los necesita.'},
  MAT_CANTIDAD: {
    3:'Agrupa objetos, compara cantidades y cuenta por iniciativa durante el juego.',
    4:'Agrupa, ordena y cuenta objetos; relaciona uno con uno al repartir o comparar.',
    5:'Cuenta y compara colecciones, resuelve situaciones de agregar o quitar y explica sus acciones con objetos.',
  },
  MAT_FORMA: {
    3:'Relaciona formas y tamaños, se ubica y prueba cómo moverse o construir.',
    4:'Relaciona formas, describe dónde están los objetos y prueba recorridos o construcciones.',
    5:'Compara formas y longitudes, comunica posiciones y ajusta recorridos o construcciones para resolver un reto.',
  },
  CYT_INDAGA: {
    3:'Pregunta por lo que le da curiosidad, explora y cuenta lo que descubre.',
    4:'Plantea preguntas e ideas, prueba cómo averiguar y compara sus hallazgos con lo que pensaba.',
    5:'Propone cómo averiguar, recoge información, compara con sus ideas y comunica lo que descubrió.',
  },
  TRANS_TIC: {5:'Explora dispositivos con acompañamiento y crea imágenes, audios o videos para comunicar o registrar algo.'},
  TRANS_AUTONOMO: {5:'Con ayuda, decide qué necesita hacer, propone cómo hacerlo y revisa qué funcionó o debe cambiar.'},
};

export function evaluationLevelGuidance(competencyId, age) {
  const performances=officialPerformances(competencyId,age);
  return { age, levels:EVALUATION_LEVELS, focus:performances.length?focusByAge[competencyId]?.[age]??null:null,
    kind:performances.length?'age_reference':'no_age_specific_performance',
    source:OFFICIAL_PERFORMANCE_SOURCE,
    performances:performances.map(({id,text,printed_page})=>({id,text,page:printed_page})),
    note:'Guía orientativa: valora las evidencias y los criterios trabajados. No se cuentan desempeños ni se compara con otra edad.' };
}
