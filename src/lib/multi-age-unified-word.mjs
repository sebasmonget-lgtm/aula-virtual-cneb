import {renderLearningExperienceUnifiedWord} from './learning-experience-unified-word.mjs';
import {renderActivityUnifiedWord} from './activity-unified-word.mjs';
import {renderAnnualJourneyWord} from './annual-journey-word.mjs';
import {guideDetails,guideParagraph,guidePanel,guideText,keepShortTableTogether} from './teacher-guide-word-layout.mjs';
import {compactPlanningTable} from './pedagogical-word-presentation.mjs';
import {practicalActivityBody,practicalProjectBody} from './document-generator-practical-word.mjs';
import {addDocumentAnnualCompetencyMap} from './document-generator-annual-map-word.mjs';
import {readFile} from 'node:fs/promises';

const moments={opening:'Inicio',development:'Desarrollo',closure:'Cierre'};
const ageLabel=d=>`${d.identity.ages.join(', ')} años · ${d.identity.section}`;
const references=(d,id,age)=>d.curriculumReference.find(r=>r.competency_id===id&&r.age===age);
const referenceText=reference=>reference.official_performances.length?reference.official_performances.map(p=>`${p.text} (${p.id})`).join('\n'):`Referente de ciclo: ${reference.cycle_standard_ai}`;
const materialLines=planning=>planning.materials.map(m=>`${m.name}${m.availability==='to_verify'?' · por verificar':''}`);
const practicalIllustration=async kind=>[{marker:'AYNI_GUIA_ILUSTRACION',data:await readFile(`public/${kind==='project'?'ayni-thinking-v2':'ayni-profesora'}.webp`),alt:'Ayni acompaña la planificación docente',maxWidthInches:0.8,maxHeightInches:0.65}];
const supportsXml=planning=>planning.ageSupports.map(s=>keepShortTableTogether(guideParagraph(`${s.age} años`,{bold:true,keepNext:true})+guideDetails([['Cómo acompañar',s.mediation],['Apoyo para participar',s.support]]))).join('');

/** Presentation only: reuse the approved project renderer and immutable saved references. */
export async function renderMultiAgeUnifiedProject(d,{activityRoute=null,practical=false,logo=null}={}){
 const c=d.content,annual=c.annualContext??{},planning=c.documentPlanning,names=new Map(d.curriculumReference.map(r=>[r.competency_id,r.name]));
 const cards=[...names].map(([id,name])=>({id,name}));
 const competencyKeys=new Map([...names.keys()].map((id,index)=>[id,`C${index+1}`]));
 const routeSummary=activityRoute===null?'':guideParagraph('Ruta breve de actividades',{bold:true,keepNext:true})
  +guideParagraph(activityRoute.length?'Propuestas previstas, ajustables a los intereses y ritmos del grupo. El desarrollo completo está en el documento de cada actividad.':'Las actividades se incorporarán a esta ruta cuando estén preparadas.',{keepNext:activityRoute.length>0})
  +(activityRoute.length?guideParagraph([...names].map(([id,name])=>`${competencyKeys.get(id)}: ${name}`).join(' · '),{keepNext:true})
   +compactPlanningTable(['Fecha','Actividad y propósito','Competencias'],activityRoute.map(item=>[
    item.date.split('-').reverse().join('/'),`${item.title}\n${item.purpose}`,
    item.competencies.map(c=>competencyKeys.get(c.id)??c.name).join(' · ')
   ]),[1400,6500,2100]):'');
 const competencyRows=c.criteriaFamilies.flatMap(f=>f.variants.map(v=>{
  const reference=references(d,f.competency_id,v.curricular_age);
  return {AREA:'',COMPETENCIA:`${reference.name} · ${v.curricular_age} años`,CAPACIDADES:'',DESEMPENO_REFERENTE:referenceText(reference),CRITERIOS:v.criterion_text,EVIDENCIAS:v.expected_evidence};
 }));
 const document={id:d.id,kind:'experience',subtype:'project',title:c.title,status:d.status,school_year:d.identity.school_year,version:d.version,
  institution_name:d.identity.institution_name,teacher_name:d.identity.teacher_name,classroom:d.identity.section,ugel:d.identity.ugel??'',starts_on:c.startsOn,ends_on:c.endsOn,origin:'planned',source_proposal_index:annual.index,
  content:{document_template_version:'experience-unified-v2',purpose:c.purpose,activity_route:[],primary_competency_ids:c.criteriaFamilies.map(f=>f.competency_id),
   project_master:{meaningful_situation:c.meaningfulSituation??annual.rationale??'',global_challenge:annual.invitation??''},
   formal_content:{methodology:annual.organization??'',closing:c.commonSequence.closure},
   dependents:{journey:(annual.childActions??[]).map(description=>({title:'',description}))},
   spaces_and_materials:planning?materialLines(planning):[],adjustment_points:annual.supports??[],transversal_approaches:[],observable_attitudes:[]}};
 return renderLearningExperienceUnifiedWord(document,cards,{logo,multiAge:{...(practical?{bodyXml:practicalProjectBody(d,activityRoute),projectCards:[7,8].includes(c.documentPresentationVersion),simplePresentation:[2,3,4].includes(c.documentPresentationVersion),compactCurriculum:[3,4].includes(c.documentPresentationVersion),compactGuide:c.documentPresentationVersion===4,inlineImages:await practicalIllustration('project')}:{}),ageLabel:ageLabel(d),competencyRows,
  originXml:guideDetails([['Situación significativa',c.meaningfulSituation??annual.rationale],['Invitación compartida',annual.invitation]]),
  ...(planning?{transversalXml:planning.transversalApproaches.map(a=>keepShortTableTogether(guideParagraph(a.name,{bold:true,keepNext:true})+guideDetails([['Actitud que acompañaremos',a.attitude],['Intervención docente',a.teacherAction]]))).join('')+guideParagraph('Acompañamiento y apoyos por edad',{bold:true,keepNext:true})+supportsXml(planning)}:{}),
  routeXml:(planning?compactPlanningTable(['Momento del proyecto','Qué se propone','Qué podrán decidir los niños'],planning.learningJourney.map(s=>[s.phase,s.proposal,s.childDecision]),[2000,4500,3500])+guideDetails([['Cierre y continuidad del proyecto',c.commonSequence.closure]])
   :Object.entries(moments).map(([key,title])=>guideParagraph(title,{bold:true,keepNext:true})+guideDetails([['Experiencia compartida',c.commonSequence[key]]])).join(''))+routeSummary,
  overview:practical?[['Competencias del proyecto',c.criteriaFamilies.map(f=>names.get(f.competency_id)).join(' · ')]]:[['Edades que participan',d.identity.ages.map(age=>`${age} años`).join(' · ')],['Competencias del proyecto',[...names.values()].join(' · ')]]}});
}

export async function renderMultiAgeUnifiedActivity(d,{practical=false,logo=null}={}){
 const c=d.content,planning=c.activityPlanning,names=new Map(d.curriculumReference.map(r=>[r.competency_id,r.name])),cards=[...names].map(([id,name])=>({id,name}));
 const curriculumXml=c.criteriaFamilies.flatMap(f=>f.variants.map(v=>{
  const reference=references(d,f.competency_id,v.curricular_age);
  return keepShortTableTogether(guideParagraph(`${reference.name} · ${v.curricular_age} años`,{bold:true,keepNext:true})+guideDetails([
   ['Referentes para observar',referenceText(reference).split('\n')],['Criterio de esta actividad',v.criterion_text],['Evidencia esperada',v.expected_evidence],['Momentos para observar',v.observation_moments.map(m=>moments[m]).join(' · ')]]));
 })).join('');
 const document={id:d.id,kind:'activity',title:c.title,status:d.status,school_year:d.identity.school_year,institution_name:d.identity.institution_name,
  teacher_name:d.identity.teacher_name,classroom:d.identity.section,occurs_on:c.occursOn,experience_title:c.projectTitle??'',experience_details:{activity_route:[{id:'saved-activity',number:c.position??1}]},
  content:{document_template_version:'activity-unified-v1',route_item_id:'saved-activity',competency_id:c.criteriaFamilies[0].competency_id,purpose:c.purpose,
   child_actions:c.commonSequence.development,mediation:'',evidence_opportunities:'',closure_or_continuity:c.commonSequence.closure,
   ...(d.kind==='workshop'?{workshop_catalog:{id:'saved-workshop'}}:{})}};
 return renderActivityUnifiedWord(document,cards,{logo,multiAge:{...(practical?{bodyXml:practicalActivityBody(d),activityCards:[5,6,7].includes(c.documentPresentationVersion),simplePresentation:[2,3,4].includes(c.documentPresentationVersion),compactCurriculum:[3,4].includes(c.documentPresentationVersion),compactGuide:c.documentPresentationVersion===4,omitPurposeOverview:[3,4].includes(c.documentRouteVersion),inlineImages:await practicalIllustration('activity'),overview:[['Competencias de la actividad',c.criteriaFamilies.map(f=>names.get(f.competency_id)).join(' · ')]]}:{}),ageLabel:ageLabel(d),curriculumXml,
  guide:{purpose:guideDetails([['Propósito compartido',c.purpose],...(planning?[['Materiales previstos',materialLines(planning)],['Aporte al recorrido del proyecto',planning.progression]]:c.materials?.length?[['Materiales previstos',c.materials]]:[])]),
   sequence:Object.entries(moments).map(([key,title])=>guidePanel(title,[{title:'Experiencia compartida',body:guideText(c.commonSequence[key])}])).join('')+(planning?guideDetails([['Decisiones y propuestas de los niños',planning.childParticipation]])+guideParagraph('Acompañamiento y apoyos por edad',{bold:true,keepNext:true})+supportsXml(planning):'')}}});
}

export async function renderMultiAgeUnifiedAnnual(d,{practical=false,logo=null}={}){
 const names=new Map(d.curriculumReference.map(r=>[r.competency_id,r.name]));
 const opportunities=list=>list.map(o=>({kind:'opportunity',title:`${o.age} años · ${names.get(o.competency_id)??o.competency_id}`,
  opportunity:{capacity_names:[],child_action:o.child_action,conditions:'',mediation:o.mediation,observation:o.observation,supports:o.supports??''}}));
 const sections=[{title:'Organización del año',lines:[d.content.organization]},
  {title:d.calendar.initial_stage.name,lines:[d.calendar.initial_stage.purpose,...d.calendar.initial_stage.what_to_observe]}];
 const proposed=d.content.proposals.map((r,i)=>{
  const s=d.calendar.projects[i];
  sections.push({title:`${i+1}. ${r.title}`,lines:[r.summary,...(r.rationale?[`Situación que da sentido: ${r.rationale}`]:[]),`Propósito: ${r.purpose}`,`Invitación: ${r.common_invitation}`,`Organización: ${r.one_teacher_organization}`].filter(Boolean)},...opportunities(r.opportunities));
  return {proposal_id:r.slot_id,title:r.title,planned_start_date:s.starts_on,planned_end_date:s.ends_on,opportunities:[...new Set(r.opportunities.map(o=>o.competency_id))].map(competency_id=>({competency_id}))};
 });
 if(d.content.everyday_opportunities.length)sections.push({title:'Oportunidades cotidianas',lines:['Oportunidades previstas para las rutinas y el juego.']},...opportunities(d.content.everyday_opportunities));
 const document={id:d.id,status:d.status,school_year:d.identity.school_year,version:d.version,age:d.identity.ages.join(', '),
  document_context:{institution_name:d.identity.institution_name,teacher_name:d.identity.teacher_name,classroom_section:d.identity.section},
  content:{journey_version:2,classroom_snapshot:{...(Number.isInteger(d.sourceSnapshot.studentCount)?{student_count:d.sourceSnapshot.studentCount}:Array.isArray(d.sourceSnapshot.students)?{student_count:d.sourceSnapshot.students.length}:{})},proposed_experiences:proposed,
   resolved_calendar:{projects:d.calendar.projects.map((s,i)=>({...s,index:i+1,proposal_id:s.slot_id}))}}};
 const practicalSections=[sections[0],sections[1],
  ...d.content.proposals.map((r,i)=>({title:`${i+1}. ${r.title}`,lines:[`Propósito: ${r.purpose}`,`Pregunta para explorar: ${r.common_invitation}`,`Organización: ${r.one_teacher_organization}`]})),
  {title:'Desarrollo y revisión durante el año',lines:['Esta es una orientación anual flexible. Cada proyecto desarrolla su situación, criterios por edad, materiales, acompañamiento y actividades. Las preguntas y decisiones de los niños pueden modificar las propuestas. Las rutinas de cuidado y el juego ofrecen oportunidades cotidianas de aprendizaje.']},
  ...(d.content.everyday_opportunities.length?[{title:'Oportunidades cotidianas previstas',lines:d.content.everyday_opportunities.map(o=>`${o.age} años · ${names.get(o.competency_id)}: ${o.child_action} Acompañamiento: ${o.mediation} Qué observar: ${o.observation}`)}]:[])];
 const bytes=await renderAnnualJourneyWord(document,[...names].map(([id,name])=>({id,name})),{logo,planningSections:practical?practicalSections:sections});
 return practical?addDocumentAnnualCompetencyMap(bytes,d):bytes;
}
