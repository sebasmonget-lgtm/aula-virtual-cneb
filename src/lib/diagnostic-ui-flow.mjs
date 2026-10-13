/** Presentation aliases preserve all historical interview IDs. */
export function interviewOptionIds(field, id) {
  return field === 'interest_tags' && id === 'plants' ? ['plants', 'nature'] : [id];
}
export function toggleInterviewOption(values, field, id) {
  const aliases = interviewOptionIds(field, id);
  return values.some(value => aliases.includes(value))
    ? values.filter(value => !aliases.includes(value)) : [...values, id];
}
export const observationMoment = value => value?.trim() || 'Sin momento indicado';
const instant = value => { const result = value ? Date.parse(value) : NaN; return Number.isFinite(result) ? result : -Infinity; };
/** Undated records follow dated ones; IDs provide a deterministic tie break. */
export function compareObservationDates(a, b, order='newest') {
  const left = instant(a.observed_at ?? a.date), right = instant(b.observed_at ?? b.date);
  if (left !== right) {
    if(left===-Infinity)return 1;
    if(right===-Infinity)return -1;
    return (right > left ? 1 : -1)*(order==='oldest'?-1:1);
  }
  return String(b.id).localeCompare(String(a.id));
}
export function isRecordedObservation(record) {
  return !['draft','withdrawn','cancelled','voided','insufficient_information'].includes(record.observation_status)
    && Boolean(record.observation_text?.trim() || record.has_media);
}
export function experienceCoverageGaps(experience, students, guided, free) {
  return experience.competencies.filter(competency => {
    const children = new Set([
      ...guided.filter(record => record.competency_v4_id === competency.id && isRecordedObservation(record)),
      ...free.filter(record => record.competency_v4_ids?.includes(competency.id)),
    ].map(record => record.student_id));
    return students.some(student => !children.has(student.id));
  }).length;
}

/** Counts coverage opportunities, never attainment or difficulties. */
export function experienceCoverageOpportunities(experience, students, guided, free, coverage) {
  return experience.competencies.map(competency => {
    const counts = new Map(students.map(student => [student.id, 0]));
    const records = [
      ...guided.filter(record => record.competency_v4_id === competency.id && isRecordedObservation(record)),
      ...free.filter(record => record.competency_v4_ids?.includes(competency.id) && !['withdrawn','cancelled','voided','draft'].includes(record.observation_status)),
    ];
    if (coverage) for (const student of students) counts.set(student.id, coverage[`${student.id}:${competency.id}`] ?? 0);
    else for (const record of records) if (counts.has(record.student_id)) counts.set(record.student_id, counts.get(record.student_id) + 1);
    return {id:competency.id,name:competency.name,missing:[...counts.values()].filter(count=>count===0).length,few:[...counts.values()].filter(count=>count===1).length};
  }).filter(item=>item.missing>0||item.few>0).sort((a,b)=>b.missing-a.missing||b.few-a.few);
}

/** Compare coverage rates so experiences with more competencies do not get a head start. */
export function rankGuidedExperiences(experiences, students, guided, free, coverage) {
  return experiences.map((experience,index)=>{
    const opportunities=experienceCoverageOpportunities(experience,students,guided,free,coverage);
    const denominator=Math.max(1,experience.competencies.length*students.length);
    return {experience,opportunities,index,missingRate:opportunities.reduce((sum,item)=>sum+item.missing,0)/denominator,fewRate:opportunities.reduce((sum,item)=>sum+item.few,0)/denominator};
  }).sort((a,b)=>b.missingRate-a.missingRate||b.fewRate-a.fewRate||a.index-b.index);
}

export function experiencePriorityLabel(item) {
  if (item.missingRate === 1) return 'Sin observaciones en estas competencias';
  if (item.missingRate > 0) return 'Con algunas observaciones';
  if (item.fewRate > 0) return 'Con pocos registros';
  return 'Con registros en todas sus competencias';
}

export function guidedStudentsByCoverage(students, competencyId, coverage, query='') {
  return students.filter(student=>student.name.toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es')))
    .map(student=>({student,count:coverage[`${student.id}:${competencyId}`]??0}))
    .sort((a,b)=>a.count-b.count||a.student.name.localeCompare(b.student.name,'es'));
}

/** Plain classroom instructions supplement, without replacing, versioned criteria. */
export const guidedTeacherSteps = {
  choice: ['Muestra los juguetes y los lugares donde pueden jugar.', 'Pide que elijan dónde empezar. Dales tiempo para jugar.'],
  conversation: ['Pregunta: «¿Qué quieres jugar?»', 'Invita a escuchar qué quiere jugar su compañero.'],
  agreements: ['Si varios quieren el mismo material, pregunta: «¿Cómo podemos compartirlo?»', 'Deja que acuerden los turnos y lo prueben.'],
  joins_game: ['Deja que miren cómo juegan otros niños.', 'Invita a unirse cuando quieran, sin obligarlos.'],
  movement: ['Deja un espacio seguro y libre de obstáculos.', 'Invita a correr, girar o agacharse como quieran.'],
  creation: ['Ofrece papel, telas y materiales seguros.', 'Invita a crear algo a su manera, sin copiar un modelo.'],
  adjust_movement: ['Arma un camino con obstáculos bajos y seguros.', 'Invita a probar cómo pasar por encima, debajo o alrededor.'],
  express_idea: ['Pide que muestren una idea con su cuerpo o sus materiales.', 'Pregunta: «¿Qué hiciste? ¿Qué quieres mostrar?»'],
  quantity: ['Pide que junten objetos para jugar o que los repartan.', 'Pregunta cuántos necesitan. Deja que los cuenten a su manera.'],
  space: ['Arma un camino sencillo y coloca algunos objetos.', 'Pregunta dónde están o cómo llegar hasta ellos.'],
  compare_groups: ['Pon dos grupos de objetos cerca de los niños.', 'Pregunta: «¿Alcanzan para todos? ¿Dónde hay más?»'],
  change_route: ['Cierra una parte del camino con un objeto seguro.', 'Invita a buscar otro camino o mover las piezas.'],
  question: ['Ofrece hojas, agua u otros materiales seguros para explorar.', 'Pregunta: «¿Qué te llama la atención? ¿Qué quisieras saber?»'],
  tell_discovery: ['Haz una pausa durante la exploración.', 'Invita a mostrar algo que encontraron y contar qué pasó.'],
  compare_materials: ['Ofrece dos materiales seguros para mirar y tocar.', 'Pregunta: «¿En qué se parecen? ¿Qué tienen de diferente?»'],
  tries_again: ['Invita a cambiar un material o la cantidad que usan.', 'Deja que prueben y pregunta qué pasó.'],
  reading: ['Muestra una imagen del cuento antes de leer.', 'Pregunta: «¿Qué crees que pasará?» Escucha sus ideas.'],
  writing: ['Después del cuento, ofrece papel y colores.', 'Invita a dibujar o escribir algo que quieran contar de la historia.'],
  retelling: ['Pregunta qué parte del cuento recuerdan.', 'Deja que la cuenten a su manera y miren las imágenes si quieren.'],
  shares_marks: ['Invita a mostrar su dibujo o escrito a un compañero.', 'Pregunta: «¿Qué quisiste contar aquí?»'],
  l2_oral: ['Usa un juego y objetos que ya conocen.', 'Habla con frases cortas en castellano. Acepta gestos o respuestas en su lengua familiar.'],
  religion: ['Invita a compartir una forma de cuidar a otros o una costumbre familiar.', 'Escucha a quien quiera participar, sin pedir detalles personales.'],
};

export const guidedExperienceIllustrations = {
  getting_to_know_us: 'planning_play', movement_and_art: 'movement', count_and_locate: 'numbers',
  explore_our_world: 'inquiry', stories_and_marks: 'storytelling', spanish_second_language: 'sharing', beliefs_and_care: 'heart',
};

/** Teacher-facing examples supplement the versioned criterion; no official text is changed. */
export function guidedObservationLookFor(criterion) {
  const examples=(criterion?.examples??[]).map(text=>text.replace(/[.]$/,'').replace(/^./,letter=>letter.toLocaleLowerCase('es')));
  return examples.length ? `Fíjate si el niño o la niña ${examples.join('; si ')}.` : `Observa qué hace o dice durante el juego y registra un ejemplo concreto.`;
}
