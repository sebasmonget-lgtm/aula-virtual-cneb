import { pilotWorkshops } from './workshop-pilot-content.mjs';
import { multiageWorkshops } from './workshop-multiage-content.mjs';

export const WORKSHOP_CATALOG_VERSION = '1.1.0';
const sources = ['CNEB', 'PCI_INICIAL_CANONICAL', 'PLANIFICACION_INICIAL_2019', 'INTERACCIONES_2019'];
const resources = {
  cuento: { id: 'cuento-la-semilla', title: 'La semilla de Lila · cuento Ayni', url: '/workshops/cuento-la-semilla.png' },
  cantidades: { id: 'tarjetas-cantidades', title: 'Tarjetas de cantidades', url: '/workshops/tarjetas-cantidades.png' },
  formas: { id: 'tarjetas-formas', title: 'Tarjetas de formas', url: '/workshops/tarjetas-formas.png' },
  registro: { id: 'registro-exploracion', title: 'Registro de lo que probamos', url: '/workshops/registro-exploracion.png' },
  mensajes: { id: 'tiras-de-mensajes', title: 'Tiras para nuestros mensajes', url: '/workshops/tiras-de-mensajes.png' },
  libros: { id: 'cuidamos-los-libros', title: 'Cuidamos los libros · guía Ayni', url: '/workshops/cuidamos-los-libros.png' },
};
// Each row is an authored age-specific challenge: purpose, observable criterion, child action and mediation.
const families = [
  { type:'Lectura', competency:'COM_LECTURA', minutes:30, resource:'cuento', materials:['Cuento impreso «La semilla de Lila»', 'Hojas', 'Crayones gruesos'],
    preparation:'Imprime el cuento y colócalo a la vista. Lee antes el texto; deja que los niños se acerquen a mirar. Ofrece escuchar o señalar sin obligarlos a hablar.',
    opening:'Muestra el título y las imágenes del cuento. Pregunta qué les llama la atención antes de leer.',
    closure:'Invita a volver a una parte favorita y a compartirla con palabras, un gesto o un dibujo.',
    ages:[
      ['Miramos el cuento de Lila','Anticipar de qué podría tratar un cuento a partir de las imágenes que mira.','Dice o señala qué podría ocurrir en el cuento apoyándose en una imagen.','Miran las imágenes, anticipan qué hará Lila y escuchan la lectura compartida.','Lee despacio y muestra las imágenes. Pregunta: ¿Qué crees que hará Lila? Acepta señalamientos y vuelve a la imagen elegida.'],
      ['¿Qué pasará con la semilla?','Anticipar hechos de un cuento y relacionar lo escuchado con sus ilustraciones.','Propone qué podría pasar con la semilla usando una pista del texto o una ilustración.','Eligen una pista de la imagen, anticipan lo que ocurrirá y contrastan su idea al escuchar el cuento.','Haz una pausa antes del desenlace: ¿Qué te hace pensar eso? Lee y vuelve a la pista sin calificar la anticipación como error.'],
      ['Leemos y buscamos pistas','Construir interpretaciones sobre un cuento relacionando pistas del texto y las ilustraciones.','Explica una anticipación o una característica de Lila apoyándose en información del cuento.','Relacionan el cuidado de Lila con lo que ocurre, explican una anticipación y vuelven al texto para comentarla.','Pregunta: ¿Qué parte del cuento te ayuda a pensarlo? Relee el fragmento que indiquen y permite que comparen interpretaciones.'],
    ] },
  { type:'Matemática · cantidades', competency:'MAT_CANTIDAD', minutes:35, resource:'cantidades', materials:['Tapas grandes limpias', 'Platos reutilizables', 'Tarjetas de cantidades impresas'],
    preparation:'Usa tapas que no quepan en la boca y platos bajos. Dispón pocos objetos para 3 años, hasta cinco para 4 y hasta diez para 5; no exijas escribir números.',
    opening:'Presenta platos y tapas para organizar una mesa de juego. Invita a decidir qué necesita cada comensal.',
    closure:'Pide que muestren cómo resolvieron el reparto y permitan que otro niño pruebe su idea.',
    ages:[
      ['Una tapa para cada plato','Establecer correspondencias en un reparto de objetos cercanos.','Relaciona un plato con una tapa al repartir y advierte si alguno queda sin objeto.','Reparten una tapa a cada plato, observan dónde falta y vuelven a distribuir.','Pregunta: ¿Todos tienen? Da tiempo para mover objetos, sin enseñar primero una solución ni exigir conteo.'],
      ['Preparamos cinco pedidos','Resolver pedidos sencillos usando correspondencia y conteo hasta cinco.','Usa conteo o correspondencia para reunir hasta cinco objetos de un pedido.','Eligen tarjetas de uno a cinco puntos y reúnen tapas para sus pedidos; verifican con un compañero.','Pregunta: ¿Cómo sabes que está completo? Permite tocar, mover y contar; ajusta la cantidad al grupo.'],
      ['¿Alcanza para la mesa?','Resolver situaciones de agregar o quitar hasta cinco objetos y comprobar el resultado.','Agrega o quita hasta cinco objetos para resolver un cambio en el pedido y explica su estrategia.','Arman un pedido, reciben un cambio pequeño y deciden qué agregar o quitar; comprueban con objetos.','Propón que llegue o se retire un comensal: ¿Qué cambió? Pide mostrar la estrategia con las tapas, sin operaciones escritas.'],
    ] },
  { type:'Matemática · formas', competency:'MAT_FORMA', minutes:35, resource:'formas', materials:['Tarjetas de formas impresas', 'Bloques grandes', 'Cinta de pintor'],
    preparation:'Prepara formas grandes y bloques sin bordes cortantes. Deja espacio en el suelo para construir y cambiar las posiciones.',
    opening:'Ofrece bloques y tarjetas para construir un lugar donde pueda entrar un muñeco del aula.',
    closure:'Invita a recorrer la construcción y a mostrar una decisión de forma o de ubicación.',
    ages:[
      ['Casitas de formas','Explorar formas al construir con objetos del entorno.','Relaciona la forma de un bloque con un objeto cercano al elegir cómo construir.','Exploran bloques, los comparan con las tarjetas y eligen cómo hacer una casita.','Pregunta: ¿A qué se parece? Deja girar y probar piezas; acepta gestos y nombres cotidianos de las formas.'],
      ['Un camino para llegar','Resolver un recorrido usando posiciones y formas cercanas.','Usa expresiones de ubicación o muestra cómo llegar a una construcción mediante un recorrido.','Construyen un camino y prueban cómo pasar por dentro, por fuera o cerca de las casitas.','Pregunta: ¿Por dónde pasará? Recupera sus palabras de ubicación y permite cambiar piezas cuando el camino no funciona.'],
      ['Construimos y explicamos rutas','Representar un recorrido y explicar relaciones de ubicación en una construcción.','Representa una ruta con objetos o dibujos y explica una ubicación usando sus propios referentes.','Diseñan un recorrido, lo representan con bloques o trazos y ayudan a otro niño a seguirlo.','Pregunta: ¿Cómo le explicarías dónde girar? Invita a verificar la ruta y cambiar la representación cuando sea necesario.'],
    ] },
  { type:'Ciencia', competency:'CYT_INDAGA', minutes:40, resource:'registro', materials:['Recipiente bajo con agua', 'Esponjas grandes', 'Cucharas plásticas', 'Tela', 'Toalla', 'Registro impreso de exploración', 'Crayones'],
    preparation:'Usa poca agua limpia, objetos grandes y un piso protegido. No beber el agua; seca los derrames. Prepara dos objetos por niño para poder comparar.',
    opening:'Presenta esponja, tela y cuchara junto al agua. Invita a preguntar qué ocurrirá si los mojan.',
    closure:'Vuelvan a lo que pensaban antes y compartan qué observaron; registren con dibujo o dictado sin exigir una conclusión idéntica.',
    ages:[
      ['¿Qué pasa cuando se moja?','Explorar cambios en materiales al ponerlos en contacto con agua.','Comunica con palabras, gestos o dibujos algo que descubrió al mojar un material.','Tocan, mojan y vuelven a mirar un objeto; muestran una diferencia que les llama la atención.','Pregunta: ¿Cómo está ahora? Acompaña la exploración sin dar una explicación anticipada; registra sus palabras literales.'],
      ['¿Cuál guarda más agua?','Proponer y probar ideas sobre materiales que retienen agua.','Propone una posible respuesta y describe lo que observó al comparar dos materiales mojados.','Eligen dos materiales, anticipan cuál retendrá agua, los prueban y comparan sus resultados.','Pregunta: ¿Cómo podríamos probarlo? Ayuda a usar cantidades parecidas de agua sin resolver la comparación por ellos.'],
      ['Probamos nuestras ideas con agua','Organizar una comparación y contrastar las ideas iniciales con lo observado.','Propone una forma de probar su idea, registra lo observado y lo compara con su respuesta inicial.','Acuerdan qué comparar y cómo, prueban con materiales, dibujan resultados y revisan su primera idea.','Pregunta: ¿Qué tendría que ser igual para comparar? Ayuda a registrar cambios y a distinguir lo observado de lo que todavía se preguntan.'],
    ] },
  { type:'Música', competency:'COM_ARTE', minutes:30, materials:['Pañuelos livianos', 'Tambores de mano', 'Maracas grandes cerradas'],
    preparation:'Comprueba que los instrumentos estén cerrados y no suelten piezas. Acuerda un volumen suave y ofrece un rincón de pausa para quien lo necesite.',
    opening:'Invita a escuchar los sonidos del aula y a probar sonidos suaves con el cuerpo y los instrumentos.',
    closure:'Escuchen una creación del grupo y compartan cómo eligieron los sonidos, sin buscar una interpretación correcta.',
    ages:[
      ['Sonidos que descubro','Explorar sonidos y movimientos como posibilidades de expresión.','Explora sonidos del cuerpo o instrumentos y muestra una manera propia de expresarse con ellos.','Prueban sonidos, silencios y movimientos con pañuelos; eligen uno que disfrutan y lo muestran.','Ofrece tiempo para repetir y variar. Pregunta: ¿Cómo quieres que suene? No exijas seguir una secuencia idéntica.'],
      ['La lluvia suena distinto','Combinar sonidos y movimientos para representar una idea propia.','Combina sonidos o movimientos para representar una lluvia imaginada y comenta algo de su creación.','Imaginan una lluvia, prueban sonidos y combinan los que expresan su idea en un pequeño grupo.','Pregunta: ¿Cómo harías una lluvia suave? Permite cambiar decisiones y valora propuestas distintas.'],
      ['Creamos un paisaje sonoro','Crear y compartir una producción sonora mediante decisiones propias.','Selecciona y combina sonidos para representar un lugar y explica una decisión de su creación.','Eligen un lugar imaginado, acuerdan sonidos, ensayan distintas combinaciones y comparten su paisaje sonoro.','Pregunta: ¿Qué quieres que escuchemos? Invita a revisar una combinación y a explicar la intención sin imponer una partitura.'],
    ] },
  { type:'Juego dramático', competency:'COM_ORAL', minutes:35, materials:['Telas cortas', 'Cajas sin grapas', 'Muñecos del aula', 'Canastas'],
    preparation:'Revisa telas y cajas. Prepara un espacio abierto de juego, sin roles obligatorios; permite participar mirando o usando un muñeco.',
    opening:'Presenta objetos para inventar un pequeño viaje. Escucha las propuestas y acuerden cómo cuidarse durante el juego.',
    closure:'Invita a contar un momento del juego y escuchar lo que otro compañero quiere compartir.',
    ages:[
      ['Nos vamos de paseo','Comunicar deseos e ideas durante un juego compartido.','Expresa una idea o necesidad con palabras, gestos o movimientos para participar en el paseo imaginado.','Eligen un objeto y comunican a dónde quieren ir; responden a las propuestas de sus compañeros con palabras o gestos.','Pregunta: ¿A dónde quieres llevarnos? Amplía lo que comunica sin corregir su forma de hablar ni obligarlo a representar un papel.'],
      ['Un viaje entre amigos','Intercambiar ideas y responder a otros en un juego de roles.','Participa en un intercambio sobre el viaje, propone una idea o responde a lo que dice otro niño.','Acuerdan un destino, asumen roles elegidos y conversan para resolver lo que ocurre durante el juego.','Pregunta: ¿Qué propone tu compañero? Facilita turnos breves y devuelve preguntas que permitan continuar el intercambio.'],
      ['Inventamos juntos una aventura','Organizar y comunicar ideas al crear una historia compartida.','Comunica una propuesta sobre la aventura, escucha otra y responde manteniendo el tema del intercambio.','Acuerdan una aventura, conversan sobre un problema del viaje y explican cómo quieren resolverlo en el juego.','Pregunta: ¿Cómo seguimos con las dos ideas? Ayuda a retomar el tema y a pedir aclaraciones sin escribir un guion que deban repetir.'],
    ] },
];

const slug = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const evidenceByType = {
  'Lectura': ['Una anticipación del niño y la imagen que señala al escuchar el cuento.','La posible respuesta del niño y la pista del texto o imagen que usa para explicarla.','La interpretación del niño y el fragmento o ilustración que elige para sostenerla.'],
  'Matemática · cantidades': ['El reparto realizado por el niño y su gesto o explicación al advertir un plato sin tapa.','La colección que reúne y la estrategia que muestra para verificar un pedido de hasta cinco.','El cambio que hace en la colección y su explicación al agregar o quitar objetos del pedido.'],
  'Matemática · formas': ['La elección de un bloque y la relación que establece con una forma cercana.','El recorrido que realiza y una expresión o gesto que use para ubicar las construcciones.','La representación de una ruta y las indicaciones que da para que un compañero la siga.'],
  'Ciencia': ['Un gesto, una palabra o un dibujo del niño sobre un cambio que observó al mojar el material.','La respuesta inicial del niño y lo que dice o muestra al comparar los materiales después de probar.','La propuesta de prueba, su dibujo o dictado de resultados y lo que cambia o conserva de su idea inicial.'],
  'Música': ['Un sonido o movimiento que el niño elige, repite o varía durante su exploración.','La combinación sonora que propone para representar la lluvia y su comentario sobre esa elección.','La combinación que aporta al paisaje sonoro y la explicación de lo que quiso representar.'],
  'Juego dramático': ['Una palabra, gesto o acción con la que comunica a dónde quiere ir o qué necesita en el juego.','Una propuesta del niño y su respuesta a lo que otro compañero dice durante el viaje.','Un intercambio en el que explica su propuesta, responde a otro niño y retoma el tema de la aventura.'],
};
const pilots = pilotWorkshops.map(w => ({id:w.id,age:w.age,type:w.type,title:w.title,competency_id:w.competencyId,
  duration_minutes:Number.parseInt(w.duration,10)||45,purpose:w.purpose,criterion:w.criterion,evidence:w.evidence,
  materials:w.materials,preparation:[w.preparation,w.safety,w.supports].join('\n'),
  opening:{teacher:w.startMediation,children:w.start},development:{teacher:w.developmentMediation,children:w.developmentChildren||w.development},
  closure:{teacher:w.closeReflection,children:w.close},resources:w.resource?[{id:'tarjetas-recorrido-motor',title:'Tarjetas de recorrido motor',url:'/api/library/resources/'+w.id+'-material/download'}]:[],
  version:WORKSHOP_CATALOG_VERSION,source_refs:sources,authorship:'Ayni · propuesta pedagógica basada en CNEB'}));

export const workshopCatalog = Object.freeze([...pilots,...families.flatMap(f => f.ages.map((row,index) => {
  const [title,purpose,criterion,children,teacher] = row;
  return {id:`taller-${index+3}-${slug(title)}`,age:index+3,type:f.type,title,competency_id:f.competency,
    duration_minutes:f.minutes,purpose,criterion,evidence:evidenceByType[f.type][index],
    materials:f.materials,preparation:f.preparation,opening:{teacher:f.opening,children:'Exploran los materiales, comunican lo que les interesa y eligen cómo participar.'},
    development:{teacher,children},closure:{teacher:f.closure,children:'Comparten una decisión o un descubrimiento con palabras, gestos, una demostración o un dibujo.'},
    resources:f.resource?[resources[f.resource]]:[],version:WORKSHOP_CATALOG_VERSION,source_refs:sources,
    authorship:'Ayni · propuesta pedagógica basada en CNEB'};
})),...multiageWorkshops.map(w=>({...w,resources:w.resource_key?[resources[w.resource_key]]:[],
  version:WORKSHOP_CATALOG_VERSION,source_refs:sources,authorship:'Ayni · propuesta pedagógica basada en CNEB'}))]);

export function workshopActivityDetails(w) {
  const stages = field => ['opening','development','closure'].map((key,i)=>`${['Inicio','Desarrollo','Cierre'][i]}: ${w[key][field]}`).join('\n\n');
  return {title:w.title,purpose:w.purpose,workshop_type:w.type,competency_id:w.competency_id,
    meaningful_situation:w.opening.teacher,teacher_preparation:w.preparation,child_actions:stages('children'),mediation:stages('teacher'),
    closure_or_continuity:w.closure.teacher,opening:w.opening.children,development:w.development.children,closure:w.closure.children,
    evaluation_criterion:w.criterion,criterion_or_observation_focus:w.criterion,expected_evidence:w.evidence,evidence_expected:w.evidence,
    evidence_opportunities:w.evidence,materials:w.materials,resources:w.resources,document_template_version:'activity-unified-v1',
    workshop_catalog:{id:w.id,version:w.version,age:w.age,source_refs:w.source_refs,authorship:w.authorship}};
}

export function rankWorkshopCatalog(catalog, coverage) {
  return [...catalog].sort((a,b)=>{
    const x=coverage[a.competency_id]??{},y=coverage[b.competency_id]??{};
    return Number((x.developed??0)>0)-Number((y.developed??0)>0)
      || (x.observed_students??0)-(y.observed_students??0)
      || String(x.last_developed??'').localeCompare(String(y.last_developed??''))
      || a.title.localeCompare(b.title,'es');
  });
}
