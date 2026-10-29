import {validateOfficialPerformanceRefs,officialPerformances,OFFICIAL_PERFORMANCE_VERSION} from './official-performance-references.mjs';
import capacityCatalog from '../../curriculum/official/initial-capacities-v1.json' with {type:'json'};
import {routeObservationCriteria,activityObservationCriteria} from './activity-observation-plan.mjs';
import {activityPedagogicalBlocks} from './pedagogical-blocks.mjs';
import {renderActivityUnifiedWord} from './activity-unified-word.mjs';
import {guideParagraph,guideDetails} from './teacher-guide-word-layout.mjs';
import {renderMultiAgeUnifiedAnnual,renderMultiAgeUnifiedProject,renderMultiAgeUnifiedActivity} from './multi-age-unified-word.mjs';
import {readFile} from 'node:fs/promises';

// The same projection and layouts run in both products. Inputs stay in their
// own domains; this module never writes sources, observations or evaluations.
export const AYNI_PLANNING_PRESENTATION='ayni-planning-common-v2';
const lines=value=>(Array.isArray(value)?value:[value]).filter(v=>typeof v==='string'&&v.trim());
const join=value=>lines(value).join('\n');
const rosterContract='ayni-document-observation-roster-v1';
const moments={opening:'Inicio',development:'Desarrollo',closure:'Cierre'};

export function supportsCommonPlanning(document){
 if(document.contract==='AyniMultiAgeDocument/v1')return document.kind==='annual_plan'
  ||document.kind==='project'&&Boolean(document.content?.documentPlanning)
  ||document.kind==='activity'&&Boolean(document.content?.activityPlanning);
 const c=document.content??{};
 return document.kind==='annual_plan'&&c.journey_version===2
  ||document.kind==='experience'&&c.document_template_version==='experience-unified-v2'
  ||document.kind==='activity'&&!c.workshop_catalog&&['activity-unified-v1','activity-with-workshop-v1'].includes(c.document_template_version);
}

function reference(cards,id,age,refs){
 const card=cards.find(c=>c.id===id);if(!card)throw new TypeError('Falta la competencia curricular de la fuente.');
 return {competency_id:id,name:card.name??card.official_name,age,official_performance_version:OFFICIAL_PERFORMANCE_VERSION,capacity_names:(card.capacities??[]).map(c=>typeof c==='string'?c:c.official_name),
  cycle_standard_ai:card.cycle_standard_ai??card.cycle_standard??card.ages?.[String(age)]?.ai_focus??'',
  official_performances:validateOfficialPerformanceRefs(refs,id,age),reference_selection:refs===undefined&&officialPerformances(id,age).length?'not_saved':'saved'};
}

function familiesFrom(rows,age){
 const grouped=new Map();
 for(const row of rows){const id=row.competency_id??row.competency_v4_id;if(!id)continue;
  if(!grouped.has(id))grouped.set(id,{criterion:[],evidence:[],refs:new Set(),moments:new Set()});
  const group=grouped.get(id),detail=row.details??row;
  group.criterion.push(row.criterion_text??row.criterion??'');group.evidence.push(join(detail.expected_evidence??row.expected_evidence));
  for(const ref of detail.official_performance_refs??row.official_performance_refs??[])group.refs.add(ref);
  for(const moment of detail.observation_moments??row.observation_moments??['development'])group.moments.add(moment);
 }
 return [...grouped].map(([competency_id,g])=>({competency_id,variants:[{curricular_age:age,
  criterion_text:[...new Set(g.criterion.filter(Boolean))].join('\n'),expected_evidence:[...new Set(g.evidence.filter(Boolean))].join('\n'),
  // A general project can cite several daily references; the card resolver
  // validates each selected ID separately without imposing a daily quota.
  official_performance_refs:[...g.refs],observation_moments:[...g.moments]}]}));
}

function curricularReferences(cards,families){
 return families.flatMap(f=>f.variants.map(v=>{
  const selected=v.official_performance_refs??[];
  const r=reference(cards,f.competency_id,v.curricular_age,undefined);
  return {...r,reference_selection:selected.length?'saved':r.reference_selection,official_performances:selected.flatMap(id=>validateOfficialPerformanceRefs([id],f.competency_id,v.curricular_age))};
 }));
}

/** Adapt literal saved fields, never generate a missing classroom event. */
export function commonPlanningDocument(document,cards=[],{roster=null}={}){
 if(!supportsCommonPlanning(document))throw new TypeError('Esta fuente no utiliza la presentación común.');
 if(document.contract==='AyniMultiAgeDocument/v1'){
  const copy=structuredClone(document);
  if(copy.kind==='annual_plan')copy.documentPresentationVersion=2;
  else if(copy.kind==='project')copy.content.documentPresentationVersion=8;
  else{copy.content.documentPresentationVersion=7;
   copy.content.observationRoster??=roster??{contract:rosterContract,students:[]};}
  return copy;
 }
 const c=document.content,age=Number(document.age??document.document_context?.age),context=document.document_context??{};
 if(![3,4,5].includes(age))throw new TypeError('La fuente necesita su edad curricular.');
 const identity={ages:[age],school_year:document.school_year,section:document.classroom??context.classroom_section??context.section??'',
  institution_name:document.institution_name??context.institution_name??'',teacher_name:document.teacher_name??context.teacher_name??''};
 const base={contract:'AyniMultiAgeDocument/v1',curriculumContractVersion:2,id:document.id,kind:document.kind==='experience'?'project':document.kind,
  status:document.status,version:document.version??1,identity,sourceSnapshot:{},confirmedAt:document.confirmed_at};
 if(document.kind==='annual_plan'){
  const saved=c.proposed_experiences??[],slots=c.resolved_calendar?.projects??[];
  const proposals=saved.map((p,i)=>({slot_id:p.proposal_id,title:p.title,purpose:p.purpose??p.shared_purpose??p.pedagogical_intention??'',
   common_invitation:p.common_invitation??p.invitation??p.shared_challenge??p.central_question??p.title,
   one_teacher_organization:join(p.organization??p.organization_notes??p.flexibility),
   opportunities:(p.opportunities??[]).map(o=>({...o,age,official_performance_refs:o.official_performance_refs??[]})),
   ...(p.rationale?{rationale:p.rationale}:{}),index:i+1}));
  const everyday=(c.everyday_opportunities??[]).map(o=>({...o,age,official_performance_refs:o.official_performance_refs??[]}));
  const ids=new Set([...proposals.flatMap(p=>p.opportunities),...everyday].map(o=>o.competency_id));
  const curriculumReference=[...ids].map(id=>reference(cards,id,age,undefined));
  const studentCount=c.classroom_snapshot?.student_count??context.student_count;
  return {...base,documentPresentationVersion:2,curriculumReference,sourceSnapshot:{...(Number.isInteger(studentCount)?{studentCount}:{})},
   calendar:{projects:slots.map((s,i)=>({...s,slot_id:s.proposal_id??proposals[i]?.slot_id,starts_on:s.starts_on??s.planned_start_date,ends_on:s.ends_on??s.planned_end_date})),
    initial_stage:{name:c.resolved_calendar?.initial_stage?.name??'Inicio del año',purpose:c.resolved_calendar?.initial_stage?.purpose??'',what_to_observe:c.resolved_calendar?.initial_stage?.what_to_observe??[]}},
   content:{title:document.title,organization:join(c.organization_criteria),proposals,everyday_opportunities:everyday,
    generalGuidance:{transversal_approaches:c.transversal_approaches??[],teaching_strategies:c.teaching_strategies??[],assessment_followup:c.assessment_followup??[],family_collaboration:c.family_collaboration??[],inclusive_supports:c.inclusive_supports??[]}}};
 }
 if(document.kind==='experience'){
  const route=c.activity_route??[],formal=c.formal_content??{},shared=c.project_master?.document_planning??{},first=route[0];
  const rows=c.dependents?.general_criteria?.length?c.dependents.general_criteria:route.flatMap(routeObservationCriteria);
  const criteriaFamilies=familiesFrom(rows,age),materials=lines(c.spaces_and_materials);
  const planning={version:4,sequence:{sharedChallenge:shared.shared_challenge??c.project_master?.global_challenge??join(c.dependents?.guiding_questions)},
   learningJourney:[{proposal:shared.planning_with_children??first?.mediation_notes??first?.specific_purpose??'',childDecision:shared.child_decisions??first?.child_decisions??first?.flexibility_notes??''}],
   dailyRoute:route.map((r,i)=>({position:r.number??i+1,occursOn:r.date??r.planned_date,title:r.title,mainAction:r.child_actions??r.specific_purpose})),
   commonSequence:{closure:shared.closing_review??formal.closing??c.project_master?.closing_description??''},
   materials:materials.map(name=>({name,availability:'confirmed'})),
   transversalApproaches:shared.transversal_approaches??lines(c.transversal_approaches).map((name,i)=>({name,attitude:lines(c.observable_attitudes)[i]??'',teacherAction:''})),
   ageSupports:[{age,mediation:shared.mediation??'',support:shared.age_support??formal.diversity_support??join(c.source_proposal_snapshot?.supports)}]};
  return {...base,curriculumReference:curricularReferences(cards,criteriaFamilies),content:{documentPresentationVersion:8,title:document.title,purpose:c.purpose,
   startsOn:document.starts_on,endsOn:document.ends_on,position:Number.isInteger(document.source_proposal_index)?document.source_proposal_index+1:null,
   meaningfulSituation:c.project_master?.meaningful_situation??formal.situation??c.starting_point,
   criteriaFamilies,documentPlanning:planning,annualContext:{index:document.source_proposal_index??null},commonSequence:{opening:shared.organization??formal.methodology??'',development:'',closure:planning.commonSequence.closure}}};
 }
 const route=document.experience_details?.activity_route?.find(r=>r.id===c.route_item_id),criteria=document.guide?.criteria?.length?document.guide.criteria:activityObservationCriteria(c);
 const criteriaFamilies=familiesFrom(criteria,age),blocks=document.guide?.pedagogical_blocks??activityPedagogicalBlocks(c,[],criteria);
 const commonSequence=Object.fromEntries(Object.entries(moments).map(([id])=>{const block=blocks.find(b=>b.id===id);return [id,[...new Set([block?.expected_actions??'',block?.instruction??''].filter(Boolean))].join('\n')];}));
 return {...base,curriculumReference:curricularReferences(cards,criteriaFamilies),content:{documentPresentationVersion:7,documentRouteVersion:4,title:document.title,purpose:c.purpose,
  occursOn:document.occurs_on,projectTitle:document.experience_title,position:route?.number??null,criteriaFamilies,commonSequence,
  ...(c.teacher_preparation?{preparation:c.teacher_preparation}:{}),
  observationRoster:roster??{contract:rosterContract,students:[]},activityPlanning:{materials:lines(c.materials??route?.materials).map(name=>({name,availability:'confirmed'})),
   childParticipation:c.child_decisions??route?.child_decisions??route?.flexibility_notes??'',
   ageSupports:[{age,mediation:c.age_mediation??route?.age_mediation??'',support:join(c.age_support??route?.age_support??c.adjustment_points??document.experience_details?.source_proposal_snapshot?.supports)}]}}};
}

/** One renderer for the three planning documents, independent of product mode. */
export async function renderCommonPlanningWord(document,cards=[],{roster=null,logo=null}={}){
 const allowed=document.contract==='AyniMultiAgeDocument/v1'?['active','archived','confirmed']:['draft','active','archived','confirmed'];
 if(!allowed.includes(document.status))throw new TypeError('La fuente no está disponible para descargarla.');
 if(document.kind==='experience'&&!document.formal_ready)throw new TypeError('Prepara primero el Word del proyecto confirmado.');
 const d=commonPlanningDocument(document,cards,{roster});
 d.curriculumReference=d.curriculumReference.map(r=>r.capacity_names?.length||r.official_performance_version!==capacityCatalog.official_performance_version?r:{...r,capacity_names:capacityCatalog.competencies[r.competency_id]??[]});
 if(d.kind!=='annual_plan')d.content.includeCapacityReferences=true;
 if(d.kind==='activity'){d.content.compactSingleAge=true;d.content.keepGuideMomentsTogether=true;}
 if(d.kind==='annual_plan')return renderMultiAgeUnifiedAnnual(d,{practical:true,logo});
 if(document.contract==='AyniMultiAgeDocument/v1')return d.kind==='project'?renderMultiAgeUnifiedProject(d,{practical:true,logo}):renderMultiAgeUnifiedActivity(d,{practical:true,logo});
 const illustration=[{marker:'AYNI_GUIA_ILUSTRACION',data:await readFile(`public/${d.kind==='project'?'ayni-thinking-v2':'ayni-profesora'}.webp`),alt:'Ayni acompaña la planificación docente',maxWidthInches:0.8,maxHeightInches:0.65}];
 // The adapter's body is identical to the generator; the original renderer
 // retains its own cover dates, school branding and linked workshop resources.
 const multiAge={ageLabel:`${d.identity.ages.join(', ')} años · ${d.identity.section}`,inlineImages:illustration,
  overview:[[d.kind==='project'?'Competencias del proyecto':'Competencias de la actividad',[...new Set(d.curriculumReference.map(r=>r.name))].join(' · ')]]};
 // Use the same public projection to supply criteria, references and register.
 const bytes=d.kind==='project'?await renderMultiAgeUnifiedProject(d,{practical:true,logo}):await renderMultiAgeUnifiedActivity(d,{practical:true,logo});
 const {default:JSZip}=await import('jszip'),zip=await JSZip.loadAsync(bytes),xml=await zip.file('word/document.xml').async('string');
 if(document.registered_evidence?.length||document.teacher_closure_note){
  const appendix=guideParagraph('Registros guardados en Ayni',{bold:true,keepNext:true})
   +(document.registered_evidence??[]).map(row=>guideDetails([['Alumno/a',row.student_name],['Fecha',String(row.observed_at??'').slice(0,10)],['Qué hizo o dijo',row.observation_text],['Criterio',row.criterion_text],['Adjunto',row.has_attachment?'Conservado en Ayni':'']])).join('')
   +(document.teacher_closure_note?guideDetails([['Reflexión guardada de la profesora',document.teacher_closure_note]]):'');
  const end=xml.lastIndexOf('<w:sectPr');zip.file('word/document.xml',xml.slice(0,end)+appendix+xml.slice(end));
 }
 if(!document.workshop)return zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});
 const mainXml=await zip.file('word/document.xml').async('string');
 const start=[...mainXml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)].find(m=>m[0].includes('Para qué'));
 if(!start)throw new TypeError('La guía común no conserva su cuerpo.');
 const bodyXml=mainXml.slice(start.index,mainXml.lastIndexOf('<w:sectPr'));
 return renderActivityUnifiedWord(document,cards,{logo,multiAge:{...multiAge,bodyXml,activityCards:true,preserveWorkshop:true}});
}
