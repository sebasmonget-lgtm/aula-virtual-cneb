// New proposals built around reviewed, downloaded resources. No AI generation.
// These complement the existing catalogue; confirmed activities keep their snapshots.
const shared = {ages:[4,5],duration_minutes:35,resources:[]};
const readingEvidence='Las palabras del niño y la parte del texto o la imagen que señala para explicar su idea.';
const poem = age => ({
  purpose:'Disfrutar poemas y comentar qué imaginamos al escuchar sus palabras y mirar sus imágenes.',
  criterion:age===4?'Comenta una imagen o una idea del poema leído por la profesora.':'Explica qué interpreta de una parte del poema apoyándose en sus palabras o imágenes.',
  evidence:readingEvidence,materials:['Un poema MINEDU elegido entre las fichas del taller','Papel','Crayones'],
  preparation:'Elige un solo poema de las fichas para la edad del aula y léelo antes. Tenlo visible para volver a sus palabras e imágenes. No se necesita memorizarlo ni responder todos lo mismo.',
  opening:{teacher:'Muestra el poema y sus imágenes. Pregunta: ¿Qué te llama la atención? Escucha sin adelantar de qué trata.',children:'Miran las imágenes y cuentan qué les gustaría descubrir del poema.'},
  development:{teacher:'Lee el poema con pausas. Invita a elegir una parte: ¿Qué imaginaste al escuchar esto? Vuelve a leer la parte que señalan; acepta gestos, palabras o dibujos.',children:age===4?'Escuchan, señalan una imagen y cuentan o dibujan algo que imaginaron.':'Eligen una parte del poema y explican qué les hizo imaginar usando una palabra o una imagen como pista.'},
  closure:{teacher:'Vuelvan a escuchar la parte que el grupo quiera. Comparte interpretaciones diferentes sin elegir una como la única correcta.',children:'Comparten la parte que quieren volver a escuchar y escuchan lo que eligieron otros.'},
});
const folds = age => ({
  purpose:'Usar un instructivo leído por la profesora y sus imágenes para decidir cómo doblar el papel.',
  criterion:age===4?'Señala una imagen del instructivo y la relaciona con un doblez que quiere hacer.':'Explica un paso del instructivo apoyándose en sus imágenes o en lo que escuchó leer.',
  evidence:readingEvidence,materials:['Un instructivo MINEDU para la edad del aula','Papel del tamaño indicado en la ficha','Crayones','Tijeras de punta redonda si la ficha requiere recortar'],
  preparation:'Elige un solo instructivo entre las fichas disponibles y prueba sus pasos antes. Imprime también su hoja de papel o recortables. Trabaja en grupos pequeños; acompaña los dobleces y ofrece ayuda para recortar. No se busca que todos terminen una figura idéntica.',
  opening:{teacher:'Muestra la figura y el instructivo elegido. Pregunta: ¿Dónde podemos mirar para saber cómo empezar?',children:'Miran los pasos y buscan qué parte del papel necesitarán para comenzar.'},
  development:{teacher:'Lee un paso y observa su imagen con los niños. Pregunta: ¿Qué nos indica hacer? Deja que prueben; si necesitan ayuda, vuelvan al instructivo y hagan juntos ese paso.',children:age===4?'Miran una imagen, prueban el doblez y piden ayuda o señalan el paso que necesitan volver a mirar.':'Relacionan los pasos con sus imágenes, prueban los dobleces y explican dónde miraron para continuar.'},
  closure:{teacher:'Invita a mostrar un paso que les ayudó. El foco es cómo usaron el instructivo, sin calificar la precisión del recorte o del doblez.',children:'Muestran una parte de su figura y señalan la imagen que les ayudó a hacerla.'},
});
const complete = age => ({
  purpose:'Buscar la pieza que completa una escena probando su forma, posición y relación con la imagen.',
  criterion:age===4?'Prueba dónde colocar una pieza y muestra qué parte de la imagen le ayuda a ubicarla.':'Explica por qué una pieza completa la escena considerando su forma y posición.',
  evidence:'Las piezas que prueba el niño y su gesto o explicación sobre cómo decidió dónde colocarlas.',
  materials:['Una ficha MINEDU de completar imágenes para la edad del aula','Tijeras de punta redonda','Pegamento'],
  preparation:'Elige una sola escena y prepara todas sus páginas infantiles, incluidos los recortables. Ofrece piezas recortadas a quien necesite apoyo. Permite probar sin pegar y acuerda el cuidado de las tijeras.',
  opening:{teacher:'Comiencen armando una imagen sencilla con piezas del aula. Luego miren la escena elegida: ¿Qué parte falta? Escucha sus ideas sin señalar la pieza correcta.',children:'Arman una imagen con piezas y después buscan partes que faltan en la escena impresa.'},
  development:{teacher:'Deja que comparen y giren las piezas. Pregunta: ¿Qué ves que continúa aquí? Si una pieza no encaja, invita a probar otra posición antes de pegar.',children:age===4?'Comparan una pieza con el espacio vacío, la giran y prueban dónde puede encajar.':'Prueban posiciones y explican qué detalle de la imagen o forma les ayuda a completar la escena.'},
  closure:{teacher:'Invita a mostrar una decisión y cómo la comprobaron. Valora las estrategias; recortar con precisión no es el criterio de este taller.',children:'Muestran una pieza que ubicaron y cuentan o señalan cómo descubrieron su lugar.'},
});
export const sheetExperiences = [
  {...shared,id:'taller-fichas-poemas-para-imaginar',title:'Poemas que nos hacen imaginar',type:'Lectura',competency_id:'COM_LECTURA',adaptations:{4:poem(4),5:poem(5)}},
  {...shared,id:'taller-fichas-leemos-y-doblamos',title:'Leemos los pasos y doblamos papel',type:'Lectura',competency_id:'COM_LECTURA',adaptations:{4:folds(4),5:folds(5)}},
  {...shared,id:'taller-fichas-completamos-una-escena',title:'Encontramos la pieza que falta',type:'Matemática · formas',competency_id:'MAT_FORMA',adaptations:{4:complete(4),5:complete(5)}},
].map(w=>({...w,age:4,...w.adaptations[4]}));
