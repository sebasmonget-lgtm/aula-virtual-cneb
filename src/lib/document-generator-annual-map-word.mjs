import JSZip from 'jszip';
import {compactPlanningTable} from './pedagogical-word-presentation.mjs';
import {guideParagraph} from './teacher-guide-word-layout.mjs';

/** Read only the annual's frozen references and opportunities, never the live curriculum. */
export function documentAnnualCompetencyMap(d){
 const names=new Map(d.curriculumReference.map(r=>[r.competency_id,r.name]));
 return [...names].map(([id,name])=>{
  const groups=new Map(),everyday=[];
  for(const age of d.identity.ages){
   if(!d.curriculumReference.some(r=>r.competency_id===id&&r.age===age))continue;
   const projects=d.content.proposals.flatMap((p,i)=>p.opportunities.some(o=>o.age===age&&o.competency_id===id)?[i+1]:[]);
   const key=projects.join(',');if(!groups.has(key))groups.set(key,{ages:[],projects});groups.get(key).ages.push(age);
   if(d.content.everyday_opportunities.some(o=>o.age===age&&o.competency_id===id))everyday.push(age);
  }
  return {id,name,groups:[...groups.values()],everyday};
 });
}

/** Isolated to a new generator presentation; ordinary Ayni and older exports pass through. */
export async function addDocumentAnnualCompetencyMap(bytes,d){
 if(d.documentPresentationVersion!==2)return bytes;
 const rows=documentAnnualCompetencyMap(d).map(row=>[
  row.name,
  row.groups.map(g=>`${g.ages.join(', ')} años: ${g.projects.length?g.projects.map(n=>'P'+String(n).padStart(2,'0')).join(' · '):'sin proyecto previsto'}`).join('\n'),
  row.everyday.length?`Previstas para ${row.everyday.join(', ')} años.`:'Sin oportunidad cotidiana prevista.'
 ]);
 const body=guideParagraph('Dónde se trabajan las competencias',{bold:true,size:24,keepNext:true})
  +guideParagraph('P01, P02… corresponden a los proyectos de la vista general. Son oportunidades previstas, no aprendizajes ya logrados. Las oportunidades cotidianas se explican al final del plan.',{size:20,keepNext:true})
  +compactPlanningTable(['Competencia','Proyectos por edad','Rutinas, sectores y talleres'],rows,[3500,3900,2600]);
 const zip=await JSZip.loadAsync(bytes),xml=await zip.file('word/document.xml').async('string');
 const start=[...xml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)].find(p=>[...p[0].matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(t=>t[1]).join('')==='Organización del año');
 if(!start)throw new TypeError('El plan anual no conserva su apartado de organización.');
 zip.file('word/document.xml',xml.slice(0,start.index)+body+xml.slice(start.index));
 return zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});
}
