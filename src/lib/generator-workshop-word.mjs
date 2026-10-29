import {renderAyniInstrumentWord} from './ayni-instrument-word.mjs';
import {guideDetails,guideParagraph,guidePanel,guideText,keepShortTableTogether} from './teacher-guide-word-layout.mjs';
import {compactPlanningTable} from './pedagogical-word-presentation.mjs';

export async function renderGeneratorWorkshopTemplate(w,c){
 c={...c,ages:[w.age],students:c.students.filter(s=>s.age===w.age)};
 const name=c.competencies.find(g=>g.age===w.age)?.cards.find(card=>card.id===w.competency_id)?.name??w.competency_id;
 let body=guideParagraph('Preparación del taller',{bold:true,keepNext:true})+guideDetails([['Edad y duración',`${w.age} años · ${w.duration_minutes} minutos`],['Propósito',w.purpose],['Competencia',name],['Criterio',w.criterion],['Materiales previstos',w.materials],['Preparación',w.preparation],['Acompañamiento',w.mediation],['Evidencias esperadas',w.evidence],...(c.ugel?[['UGEL',c.ugel]]:[]),...(c.district?[['Distrito',c.district]]:[]),...(c.director?[['Director o directora',c.director]]:[]),...(c.institutionCode?[['Código de institución',c.institutionCode]]:[])])
  +guideParagraph('Guía del taller',{bold:true,keepNext:true}).replace('<w:pPr>','<w:pPr><w:pageBreakBefore/>');
 for(const [title,value]of [['Inicio',w.opening],['Desarrollo',w.development],['Cierre',w.closure]])body+=guidePanel(title,typeof value==='string'?[{title:'Experiencia compartida',body:guideText(value)}]:[{title:'Qué harán los niños',body:guideText(value?.children)},{title:'Cómo acompañar',body:guideText(value?.teacher)}]);
 body+=keepShortTableTogether(guideParagraph('REGISTRO DE OBSERVACIONES',{bold:true,keepNext:true})+roomyRegister(c.students));
 return renderAyniInstrumentWord({title:w.title,context:{...c,ages:[w.age]},body,workshop:w});
}

function roomyRegister(students){
 const xml=compactPlanningTable(['Estudiante · edad','Qué hizo o dijo','Apoyo o siguiente paso'],students.map(s=>[`${s.name}\n${s.age} años`,'','']),[3000,4200,2800]);
 let index=0;
 return xml.replace(/<w:tr>[\s\S]*?<\/w:tr>/g,row=>index++===0?row:row.replace('<w:trPr>','<w:trPr><w:trHeight w:val="900" w:hRule="atLeast"/>'));
}
