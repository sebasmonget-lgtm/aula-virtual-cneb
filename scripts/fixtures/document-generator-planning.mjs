import {firstProjectActivityCompetencies} from '../../src/lib/document-generator-project-route.mjs';
export function documentActivityPlanningFixture(ages,{version=2,final=false}={}){
 return {version,...(version===3?{organization:'En un pequeño grupo, una pareja prueba y los demás miran; registra cada intento antes de intercambiar los materiales.',projectReview:final?'Recupera la idea inicial y los registros disponibles; pregunta qué cambió al probar y qué pueden explicar o mostrar ahora.':null}:{}),materials:[{name:'Bloques de construcción limpios',availability:'to_verify'}],
  ageSupports:ages.map(age=>({age,mediation:`Para ${age} años, dar tiempo para proponer y explicar una elección durante el juego.`,support:'Aceptar una elección mediante gestos y ofrecer dos opciones accesibles.'})),
  childParticipation:'Recoger sus propuestas de juego y dejar que elijan una manera de incorporarse.',progression:'Esta propuesta permite explorar opciones; después podrán probar una idea compartida y revisar cómo participar.'};
}
export function documentProjectPlanningFixture(ages){
 const activity=documentActivityPlanningFixture(ages);
 return {version:2,meaningfulSituation:'Escenario posible de prueba: al elegir juegos pueden surgir distintas propuestas. El proyecto permitirá explorar maneras de expresar elecciones y participar con otros.',
  commonSequence:{opening:'Recoger elecciones y preguntas para el recorrido del proyecto.',development:'Proponer experiencias variadas de juego, exploración y creación a lo largo de los días.',closure:'Compartir voluntariamente elecciones, recuperar las decisiones de las distintas propuestas y elegir una pregunta para continuar.'},
  materials:activity.materials,ageSupports:activity.ageSupports,transversalApproaches:[{name:'Enfoque de derechos',attitude:'Expresar una elección y escuchar propuestas diferentes durante el juego.',teacherAction:'Ofrecer oportunidades de decidir sin exigir que todos participen de la misma manera.'}],
  learningJourney:[{phase:'Explorar opciones',proposal:'Recorrer propuestas y probar materiales seguros.',childDecision:'Elegir dónde comenzar y proponer un cambio.'},{phase:'Construir una propuesta compartida',proposal:'Combinar ideas y probar un juego con otros.',childDecision:'Decidir cómo incorporar distintas propuestas.'},{phase:'Revisar y compartir',proposal:'Recuperar las decisiones y mostrar voluntariamente una posibilidad de juego.',childDecision:'Elegir qué contar y qué seguir explorando.'}]};
}

export function documentProjectPlanningV3Fixture(ages,dates,competencyIds){
 const p=documentProjectPlanningFixture(ages);const result={...p,version:3,dailyRoute:dates.map((occursOn,i)=>({position:i+1,occursOn,title:i===0?'Planificamos el proyecto con los niños':i===dates.length-1?'Revisamos lo explorado y compartimos las decisiones':`Experiencia diferente del día ${i+1}`,purpose:`Explorar una propuesta concreta del día ${i+1}.`,stage:i===0?'planning':i===dates.length-1?'review':['explore','investigate','create_or_try','communicate'][(i-1)%4],mainAction:`Probar la propuesta ${i+1} con materiales seguros y recoger una expresión propia de esta experiencia.`,evidenceFocus:`Una decisión vinculada con el reto ${i+1}.`,childDecision:'Proponer una variante de la experiencia y cómo probarla.',competencyIds:i===0?firstProjectActivityCompetencies(competencyIds):[competencyIds[i%competencyIds.length]]}))};
 const covered=new Set(result.dailyRoute.slice(0,-1).flatMap(d=>d.competencyIds));const missing=competencyIds.filter(id=>!covered.has(id));if(result.dailyRoute.length>1&&missing.length)result.dailyRoute.at(-1).competencyIds=missing;return result;
}

export function documentProjectPlanningV4Fixture(ages,dates,competencyIds){
 const base=documentProjectPlanningV3Fixture(ages,dates,competencyIds),sequence={sharedChallenge:'¿Cómo podemos probar y mejorar una propuesta de juego compartida?',intendedOutcome:'Explorar y revisar una propuesta de juego a partir de decisiones y pruebas conectadas.'};
 const dailyRoute=base.dailyRoute.map((day,i)=>({...day,previousActivityPosition:i,startingPoint:i===0?sequence.sharedChallenge:`Un registro propio de la experiencia ${i} para decidir qué probar después.`,expectedContribution:`Un registro propio de la experiencia ${i+1} para decidir qué probar después.`,newChallenge:`Usar el aporte anterior para resolver una pregunta diferente de la experiencia ${i+1}.`}));
 return {...base,version:4,sequence,dailyRoute};
}
