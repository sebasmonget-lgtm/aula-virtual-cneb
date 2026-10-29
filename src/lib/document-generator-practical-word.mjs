import {guideParagraph,guideDetails,guideText,keepShortRowsTogether,keepShortTableTogether} from './teacher-guide-word-layout.mjs';
import {compactPlanningTable} from './pedagogical-word-presentation.mjs';
import {activityCardsWordBody} from './document-generator-activity-cards-word.mjs';
import {documentObservationRegisterWord} from './document-generator-observation-register-word.mjs';
import {projectCardsWordBody} from './document-generator-project-cards-word.mjs';

const momentNames={opening:'Inicio',development:'Desarrollo',closure:'Cierre'};
const heading=text=>{
 const fill=/observ|evaluación|registro|conocimientos|identidad|comunica|participa|motricidad/i.test(text)?'F0EBF9':/niños|empezar/i.test(text)?'FFF1DF':/acompañar|propósito|enfoques/i.test(text)?'E8F5EE':'EAF3FA';
 if(text==='Sustento curricular')return guideParagraph(text,{bold:true,size:22,keepNext:true,color:'526B87'});
 return guideParagraph(text,{bold:true,size:24,keepNext:true}).replace('<w:pPr>',`<w:pPr><w:shd w:val="clear" w:fill="${fill}"/><w:ind w:left="120" w:right="80"/>`);
};
const table=(headers,rows,widths)=>compactPlanningTable(headers,rows,widths);
function tintLabels(xml,palette){
 return xml.replace(/<w:tr>[\s\S]*?<\/w:tr>/g,row=>{
  const first=row.match(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/)?.[1],fill=palette[first];
  return fill?row.replace('<w:shd w:fill="FFFFFF"/>',`<w:shd w:val="clear" w:fill="${fill}"/>`):row;
 });
}
const materialText=p=>p?.materials.map(m=>`${m.name}${m.availability==='to_verify'?' (por verificar)':''}`).join(' · ');
const ref=(d,id,age)=>d.curriculumReference.find(r=>r.competency_id===id&&r.age===age);
function criteria(d){
 // Keep each age row intact; repeat the header if a table continues on another
 // page instead of pushing a whole competency and leaving a large blank gap.
 return d.content.criteriaFamilies.map(f=>{const leadingCitation=d.kind==='project'&&d.content.documentPresentationVersion===8||d.content.includeCapacityReferences===true;
  const reference=ref(d,f.competency_id,d.identity.ages[0]);
  const block=heading(reference.name)
  +(d.content.includeCapacityReferences&&reference.capacity_names?.length?guideParagraph('Capacidades de referencia: '+reference.capacity_names.join(' · '),{size:18,color:'526B87',keepNext:true}):'')
  +(leadingCitation?compactFamilyReferences(d,f.competency_id,{keepNext:true}):'')
  +tintLabels(table([2,3,4,5,6,7,8].includes(d.content.documentPresentationVersion)?['Edad','Qué observar (criterio)','Qué podría registrar (evidencia)']:['Edad','Criterio','Evidencia prevista'],f.variants.map(v=>[
   `${v.curricular_age} años`,v.criterion_text,`${v.expected_evidence}${d.kind==='activity'?([5,6,7].includes(d.content.documentPresentationVersion)?' ':'\n')+'Momento: '+v.observation_moments.map(m=>momentNames[m]).join(' · '):''}`
  ]),[800,4600,4600]),{'3 años':'E8F5EE','4 años':'FFF1DF','5 años':'F0EBF9'})
  +(!leadingCitation&&[3,4,5,6,7,8].includes(d.content.documentPresentationVersion)?compactFamilyReferences(d,f.competency_id):'');
  return [7,8].includes(d.content.documentPresentationVersion)?keepShortTableTogether(block):block;
 }).join('');
}
function compactFamilyReferences(d,id,{keepNext=false}={}){
 const rows=d.curriculumReference.filter(r=>r.competency_id===id);
 const groups=new Map();
 for(const r of rows){
  const numbers=r.official_performances.map(p=>p.official_order??Number(p.id.split('.').at(-1))),pages=[...new Set(r.official_performances.map(p=>p.printed_page).filter(Boolean))];
  const key=JSON.stringify({numbers,pages});if(!groups.has(key))groups.set(key,{ages:[],numbers,pages});groups.get(key).ages.push(r.age);
 }
 const text=[...groups.values()].map(({ages,numbers,pages})=>`${ages.join(' y ')} años: ${numbers.length?numbers.join(', '):rows.some(r=>ages.includes(r.age)&&r.reference_selection==='not_saved')?'no seleccionado en la fuente':'estándar del ciclo II'}${pages.length?' (p. '+pages.join(', ')+')':''}`).join(' · ');
 return guideParagraph('Referentes MINEDU (desempeños) · '+text,{size:18,color:'526B87',keepNext});
}
function supports(p){return p?p.ageSupports.map(s=>{
 const paragraph=guideParagraph(`${s.age} años: ${s.mediation} ${s.support}`);
 return [3,4].includes(p.version)?paragraph.replace('<w:pPr>','<w:pPr><w:keepLines/>'):paragraph;
}).join(''):'';}
function references(d){
 if([3,4,5,6,7,8].includes(d.content.documentPresentationVersion)){
  const line=guideParagraph('MINEDU · Programa Curricular de Educación Inicial',{size:18,color:'526B87'});
  return line.replace(/<w:r>[\s\S]*?<\/w:r>/,run=>`<w:fldSimple w:instr=" HYPERLINK &quot;https://www.minedu.gob.pe/curriculo/pdf/programa-curricular-educacion-inicial.pdf&quot; ">${run}</w:fldSimple>`);
 }
 if(d.content.documentPresentationVersion===2)return heading('Sustento curricular')
  +[...new Set(d.curriculumReference.map(r=>r.competency_id))].map(id=>{
   const rows=d.curriculumReference.filter(r=>r.competency_id===id);
   return guideParagraph(rows[0].name,{bold:true,size:20,keepNext:true})+rows.map(r=>guideParagraph(`${r.age} años: ${r.official_performances.length?r.official_performances.map(p=>`${p.id}${p.printed_page?` · p. ${p.printed_page}`:''}`).join('; '):'estándar del ciclo II (sin desempeño específico para esta edad)'}`,{size:18})).join('');
  }).join('')
  +guideParagraph('MINEDU · Programa Curricular de Educación Inicial\nhttps://www.minedu.gob.pe/curriculo/pdf/programa-curricular-educacion-inicial.pdf',{size:18});
 return heading('Sustento curricular')
 +[...new Set(d.curriculumReference.map(r=>r.competency_id))].map(id=>{
  const rows=d.curriculumReference.filter(r=>r.competency_id===id);
  return guideParagraph(rows.map(r=>`${r.age} años: ${r.official_performances.length?r.official_performances.map(p=>`${p.id}${p.printed_page?` · p. ${p.printed_page}`:''}`).join('; '):`referente de ciclo: ${r.cycle_standard_ai}`}`).join(' · '),{size:20});
 }).join('')
 +guideParagraph('MINEDU · Programa Curricular de Educación Inicial\nhttps://www.minedu.gob.pe/curriculo/pdf/programa-curricular-educacion-inicial.pdf',{size:20});
}
function inlineLabel(label,text){
 const value=guideParagraph(text).match(/<w:r>[\s\S]*?<\/w:r>/)?.[0]??'';
 return guideParagraph(label+': ',{bold:true}).replace('</w:p>',value+'</w:p>');
}
function identity(d){const c=d.content;return [3,4].includes(c.documentPresentationVersion)&&d.kind==='activity'?inlineLabel('Para qué',c.purpose):heading(d.kind==='project'?'Propósito del proyecto':'Propósito de la actividad')+guideParagraph(c.purpose);}
function observationRegister(compact=false){
 const labels=['Nombre y fecha: ____________________','Qué hizo o dijo y criterio relacionado: ____________________','Apoyo o siguiente paso: ______________________________'];
 return keepShortTableTogether(compact?guideParagraph('Registro de observación para completar · Nombre y fecha: __________',{bold:true,size:20,keepNext:true})
  +guideParagraph('Qué hizo/dijo y criterio: __________________ · Apoyo o siguiente paso: ______________',{size:20})
  :heading('Registro de observación para completar')+guideText(labels));
}

/** Read-only presentation. The complete immutable references remain in the source document. */
export function practicalActivityBody(d){
 const c=d.content,p=c.activityPlanning;
 if([5,6,7].includes(c.documentPresentationVersion))return activityCardsWordBody(d,{criteria:criteria(d),references:references(d),observationRegister:[6,7].includes(c.documentPresentationVersion)?documentObservationRegisterWord(d):observationRegister(true),materials:materialText(p)??c.materials?.join(' · ')??'Prever los materiales de la actividad.'});
 if([2,3,4].includes(c.documentPresentationVersion))return identity(d)
  +([3,4].includes(c.documentPresentationVersion)?inlineLabel('Materiales',materialText(p)??c.materials?.join(' · ')??'Prever los materiales de la actividad.'):heading('Qué necesitas')+guideParagraph(materialText(p)??c.materials?.join(' · ')??'Prever los materiales de la actividad.'))
  +([3,4].includes(c.documentPresentationVersion)?'':heading('Guía de la actividad'))
  +Object.entries(momentNames).map(([key,name])=>heading(name)+guideText(c.commonSequence[key])).join('')
  +(p?heading('Qué pueden decidir los niños')+guideParagraph(p.childParticipation)+heading('Cómo ayudar según la edad')+([3,4].includes(c.documentPresentationVersion)?keepShortTableTogether(supports(p)):supports(p)):'')
  +heading('Competencias y qué observar')+criteria(d)
  +observationRegister([3,4].includes(c.documentPresentationVersion))
  +references(d);
 const guide=tintLabels(table(['Momento','Qué haremos'],Object.entries(momentNames).map(([key,name])=>[name,c.commonSequence[key]]),[1400,8600]),{Inicio:'E8F5EE',Desarrollo:'EAF3FA',Cierre:'FFF1DF'});
 return identity(d)+heading('Antes de empezar')+guideParagraph(`Materiales: ${materialText(p)??c.materials?.join(' · ')??'Prever los materiales que requiere la propuesta y comprobar su disponibilidad.'}`,{size:20})
 +heading('Guía de la actividad')+([3,4].includes(c.documentRouteVersion)?keepShortTableTogether(guide):guide)
 +(p?guideDetails([['Decisiones de los niños',p.childParticipation]])+heading('Cómo acompañar a cada edad')+supports(p):'')
 +heading('Qué observar durante la actividad')+criteria(d)
 +([3,4].includes(c.documentRouteVersion)?keepShortTableTogether(heading('Registro de observación para completar')+guideText(['Nombre y fecha: ____________________','Qué hizo o dijo y criterio relacionado: ____________________','Apoyo o siguiente paso: ______________________________'])+references(d))
 :keepShortTableTogether(heading('Registro de observación para completar')+guideText(['Nombre y fecha: ____________________','Qué hizo o dijo y criterio relacionado: ____________________','Apoyo o siguiente paso: ______________________________']))+keepShortTableTogether(references(d)));
}

export function practicalProjectBody(d,activityRoute){
 if([7,8].includes(d.content.documentPresentationVersion))return projectCardsWordBody(d,{criteria:criteria(d),references:references(d),activityRoute,materials:materialText(d.content.documentPlanning)});
 const c=d.content,p=c.documentPlanning,annual=c.annualContext??{},planningWithChildren=p?.learningJourney[0];
 const approaches=p?heading('Enfoques en la práctica')+table(['Enfoque','Actitud que acompañaremos','Qué hará la profesora'],p.transversalApproaches.map(a=>[a.name,a.attitude,a.teacherAction]),[2200,3800,4000]):'';
 const firstMaterials=new Map();
 const activityRows=activityRoute?.map(a=>{
  const materials=a.materials??[],full=materials.join(' · '),key=JSON.stringify([...materials].sort()),first=firstMaterials.get(key);
  if(materials.length&&!first)firstMaterials.set(key,a.position);
  return [`${a.position} · ${a.date.split('-').reverse().join('/')}\n${a.title}`,a.purpose,first&&full.length>110?`Los mismos materiales del día ${first}.`:full||'Por prever según la actividad.'];
 });
 const dailyRows=[3,4].includes(p?.version)?p.dailyRoute.map(day=>[`${day.position} · ${day.occursOn.split('-').reverse().join('/')}\n${day.title}`,day.mainAction]):null;
 return heading('Situación significativa')+guideText(c.meaningfulSituation??annual.rationale??'')
 +guideDetails([['Pregunta para explorar',p?.version===4?p.sequence.sharedChallenge:annual.invitation]])
 +identity(d)
 +(planningWithChildren?heading('Planificación con los niños')+([3,4].includes(p?.version)?keepShortTableTogether(guideDetails([['Qué proponemos',planningWithChildren.proposal],['Qué podrán decidir',planningWithChildren.childDecision]])):guideDetails([['Qué proponemos',planningWithChildren.proposal],['Qué podrán decidir',planningWithChildren.childDecision]])):'')
 +heading('Ruta breve de actividades')+(dailyRows?table(['Día y actividad','Qué harán los niños'],dailyRows,[3300,6700]):activityRows?.length?table(['Día y actividad','Qué haremos','Qué necesitamos'],activityRows,[2500,5000,2500])
 :p?table(['Momento','Qué se propone','Qué podrán decidir'],p.learningJourney.slice(1).map(s=>[s.phase,s.proposal,s.childDecision]),[2200,4200,3600])
 :Object.entries(momentNames).map(([key,name])=>guideDetails([[name,c.commonSequence[key]]])).join(''))
 +heading([2,3,4].includes(c.documentPresentationVersion)?'Competencias y qué observar':'Aprendizajes y evaluación')+guideParagraph([2,3,4].includes(c.documentPresentationVersion)?'Instrumento previsto: registro de observación. Anota lo que los niños hagan o digan en relación con cada criterio.':'Instrumento previsto: registro de observación de las actividades. Se anotarán acciones o expresiones reales vinculadas con estos criterios.')+criteria(d)
 +(c.documentPresentationVersion===4?approaches:'')
 +heading('Condiciones para realizarlo')+guideDetails([['Materiales',materialText(p)],['Organización',c.commonSequence.opening||annual.organization]])
 +(p?heading('Acompañamiento por edad')+supports(p)+(c.documentPresentationVersion===4?'':approaches):'')
 +([2,3,4].includes(c.documentPresentationVersion)?references(d):keepShortTableTogether(references(d)));
}

// Explicit formatting also helps viewers that do not fully inherit Word styles.
// Scope it to the practical body: original Ayni documents and cover stay intact.
function readableBody(xml,{simplePresentation=false,compactCurriculum=false,compactGuide=false}={}){
 const starts=[xml.indexOf(heading('Cómo ayudar según la edad')),xml.indexOf(heading('Competencias y qué observar'))].filter(index=>index>=0);
 const appendix=compactCurriculum&&starts.length?Math.min(...starts):-1;
 const paragraph=(p,inTable,compact)=>{
  if(!/<w:t(?:\s|>)/.test(p))return p;
  const title=/<w:shd\b/.test(p)||p.includes('Sustento curricular');
  const before=title?(compact?(compactGuide?80:100):simplePresentation?(compactGuide?100:120):160):0,after=compact?(inTable?0:compactGuide?30:40):simplePresentation?(compactGuide?40:60):title?100:inTable?80:120,line=compact?(compactGuide?252:264):simplePresentation?(compactGuide?264:276):inTable?276:288;
  const properties=`<w:jc w:val="left"/><w:suppressAutoHyphens/><w:spacing w:before="${before}" w:after="${after}" w:line="${line}" w:lineRule="auto"/>`;
  let result=p.replace(/<w:(?:spacing|jc|suppressAutoHyphens)\b[^>]*\/>/g,'');
  result=result.includes('<w:pPr>')?result.replace('<w:pPr>',`<w:pPr>${properties}`):result.replace('<w:p>',`<w:p><w:pPr>${properties}</w:pPr>`);
  return result.replace(/<w:rPr>/g,'<w:rPr><w:rFonts w:ascii="Poppins" w:hAnsi="Poppins" w:eastAsia="Poppins" w:cs="Poppins"/>');
 };
 return xml.replace(/<w:tbl>[\s\S]*?<\/w:tbl>|<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g,(block,offset)=>block.startsWith('<w:tbl>')
  ?block.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g,p=>paragraph(p,true,appendix>=0&&offset>=appendix)).replace(/<w:(top|bottom) w:w="75" w:type="dxa"\/>/g,(margin,side)=>appendix>=0&&offset>=appendix?`<w:${side} w:w="${compactGuide?30:50}" w:type="dxa"/>`:margin)
  :paragraph(block,false,appendix>=0&&offset>=appendix))
  .replaceAll('<w:p/>','<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="60" w:lineRule="exact"/></w:pPr></w:p>');
}

/** Preserve the approved cover, styles, page setup, headers and artwork. */
export function replacePracticalBody(xml,body,{illustrated=false,simplePresentation=false,compactCurriculum=false,compactGuide=false,activityCards=false,projectCards=false}={}){
 const start=[...xml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)].find(m=>[...m[0].matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(t=>t[1]).join('').includes('I. DATOS GENERALES'));
 const end=xml.lastIndexOf('<w:sectPr');
 if(!start||end<start.index)throw new Error('No se encontró el cuerpo de la plantilla original de Ayni.');
 let cover=xml.slice(0,start.index);
 if(illustrated){
  const coverBreak=[...cover.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)].find(p=>/<w:br\b[^>]*w:type="page"/.test(p[0]));
  if(!coverBreak)throw new Error('Falta el salto de portada para la ilustración Ayni.');
  let tightBreak=coverBreak[0].replace(/<w:spacing\b[^>]*\/>/g,'');
  const spacing='<w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/>';
  tightBreak=tightBreak.includes('<w:pPr>')?tightBreak.replace('<w:pPr>',`<w:pPr>${spacing}`):tightBreak.replace('<w:p>',`<w:p><w:pPr>${spacing}</w:pPr>`);
  if(!cover.includes('{{AYNI_GUIA_ILUSTRACION}}'))throw new Error('Falta la ilustración en el resumen de portada.');
  cover=cover.slice(0,coverBreak.index)+tightBreak+cover.slice(coverBreak.index+coverBreak[0].length);
 }
 return cover+keepShortRowsTogether(activityCards||projectCards?body:readableBody(body,{simplePresentation,compactCurriculum,compactGuide}))+xml.slice(end);
}
