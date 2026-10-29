import {validateActivityAgainstProjectRoute} from './document-generator-project-route.mjs';
import { DOCUMENT_GENERATOR_ANNUAL_RULES, DOCUMENT_GENERATOR_ANNUAL_PROMPT_VERSION, documentGeneratorGroupContext } from './document-generator-prompts.mjs';
import { randomUUID } from 'node:crypto';
import { isDocumentGenerator } from './ayni-product-mode.mjs';
import { DOCUMENT_GENERATOR_DEMO_PROJECTS } from './document-generator-demo-projects.mjs';
import { assertMultiAgeLocalDb } from '../../scripts/multi-age-local-db.mjs';
import { classroomCurriculumScope, curriculumHash, curriculumRequest, curriculumDocumentIdentity, CurriculumPermissionError } from './classroom-curriculum-scope.mjs';
import { multiAgeDiagnosticWorkspace } from './multi-age-diagnostic.mjs';
import {multiAgeGroupDiagnosticWorkspace} from './multi-age-group-diagnostic.mjs';
import { multiAgePlanningContext } from './age-scoped-criteria.mjs';
import { loadKnowledgeBaseV4 } from './knowledge-base-v4.mjs';
import { applicableCompetencyCards } from './competency-applicability.mjs';
import { validateOfficialPerformanceRefs, officialPerformances } from './official-performance-references.mjs';
import { nationalCalendarBlocks2026, nationalSchoolHolidays2026, defaultInitialStage } from './annual-plan-calendar.mjs';
import { classifyCalendarDay } from './school-calendar-service.mjs';
import { solveAnnualJourneyCalendar } from './annual-journey-calendar.mjs';
import {multiAgeSchoolCalendar} from './multi-age-calendar-definition.mjs';
import { VersionConflictError } from './version-integrity.mjs';
import { multiAgeDecisionContext } from './multi-age-planning-decisions.mjs';
import { multiAgeProjectContext, validateMultiAgeProjectCriteria } from './multi-age-projects.mjs';
import { annualProjectLinks,annualPreservation } from './multi-age-planning-history.mjs';
import { correctionReason } from './multi-age-corrections.mjs';

export const MULTI_AGE_ANNUAL_PROMPT_VERSION='multi-age-annual-local-v2';
export const MULTI_AGE_ANNUAL_INSTRUCTIONS='Organiza un único recorrido anual para una profesora y todas las edades recibidas. Conserva exactamente los 15 slot_id y los grupos de cada posición; las fechas las calcula el servidor. Cada oportunidad declara edad, competencia, actuación, mediación, observación y referentes de esa edad. Cubre las competencias habilitadas de cada grupo entre propuestas y oportunidades cotidianas. No confundas cobertura planificada con logros. No atribuyas intereses, necesidades o dificultades al grupo a partir de un niño o relato familiar. Las fuentes ausentes quedan pendientes; no inventes hechos, recursos, notas ni diagnósticos. No conviertas un desempeño en exigencia completa de un día ni encargues a los mayores cuidar a los pequeños. La organización debe permitir acompañar a un grupo mientras los demás exploran materiales seguros en un espacio visible. No planifiques tres direcciones simultáneas que exijan atención exclusiva de la profesora. Las indicaciones docentes confirmadas son condiciones para planificar, no observaciones ni logros. No conviertas preguntas o instrucciones de guardar o continuar en un tema pedagógico. Devuelve una propuesta revisable sin fechas inventadas ni niveles finales.';
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&Object.keys(v).every(k=>keys.includes(k));
const text=(v,max=1500)=>typeof v==='string'&&Boolean(v.trim())&&v.length<=max;
export class MultiAgeAnnualCalendarError extends TypeError {}

/** Reuses the installed calendar authority. This local preview explicitly supports 2026 only. */
export function multiAgeAnnualCalendar(scope){
  if(scope.institutional_calendar){
    try{return solveAnnualJourneyCalendar(multiAgeSchoolCalendar(scope));}catch(error){throw new MultiAgeAnnualCalendarError(error.message);}
  }
  if(Number(scope.year)!==2026)throw new MultiAgeAnnualCalendarError('Este año necesita un calendario institucional confirmado. No se trasladan automáticamente las fechas oficiales de 2026.');
  const blocks=nationalCalendarBlocks2026(),holidays=nationalSchoolHolidays2026(),days=[];
  for(let d=new Date('2026-03-02T00:00:00Z');d<=new Date('2026-12-31T00:00:00Z');d.setUTCDate(d.getUTCDate()+1)){
    const value=d.toISOString().slice(0,10),block=blocks.find(b=>b.start_date<=value&&value<=b.end_date),holiday=holidays.find(h=>h.exception_date===value);
    days.push({date:value,...classifyCalendarDay({date:value,block,holiday:holiday?{name:holiday.label}:null})});
  }
  const calendar={days,blocks,version:{id:'multi-age-local-national-2026',version:'existing-national-calendar-2026'},initial_stage:defaultInitialStage()},schedule=solveAnnualJourneyCalendar(calendar);
  if(schedule.initial_stage.starts_on<scope.starts_on||schedule.projects.at(-1).ends_on>scope.ends_on)throw new MultiAgeAnnualCalendarError('El calendario completo no cabe en las fechas del aula; requiere revisión antes de planificar.');
  return schedule;
}
export async function multiAgeAnnualContext(db,teacherId,classroomId){
  const documentsOnly=await isDocumentGenerator(db,teacherId);
  const diagnosis=await multiAgeDiagnosticWorkspace(db,teacherId,classroomId),scope=diagnosis.classroom,kb=await loadKnowledgeBaseV4();
  const eligible=scope.ages.map(age=>({age,cards:applicableCompetencyCards(kb.competencyCards,age,{castellanoL2Applicable:scope.castellano_l2_applicable,religionApplicable:scope.religion_applicable})}));
  const curriculum=await multiAgePlanningContext(scope,[...new Set(eligible.flatMap(g=>g.cards.map(c=>c.id)))]),calendar=multiAgeAnnualCalendar(scope);
  const planning={...curriculum,...(documentsOnly?{document_generation_mode:true,source_policy:DOCUMENT_GENERATOR_ANNUAL_RULES,groups:documentGeneratorGroupContext(diagnosis.groups)}:{}),prompt_version:documentsOnly?DOCUMENT_GENERATOR_ANNUAL_PROMPT_VERSION:MULTI_AGE_ANNUAL_PROMPT_VERSION,instructions:documentsOnly?`${MULTI_AGE_ANNUAL_INSTRUCTIONS}\n${DOCUMENT_GENERATOR_ANNUAL_RULES}`:MULTI_AGE_ANNUAL_INSTRUCTIONS,calendar,
    eligible_competencies_by_age:eligible.map(g=>({age:g.age,competency_ids:g.cards.map(c=>c.id)})),...(documentsOnly?{}:{diagnostic_groups:diagnosis.groups,
    diagnostic_readings:diagnosis.students.map((s,i)=>({child_key:`child_${i+1}`,age:s.age,source_state:s.current?'reviewed':'pending_review',
      teacher_readings:s.current?s.review.details.findings:[],pending_competency_ids:s.pendingCompetencyIds,
      family_context:s.family?{source_kind:'family_report',text:s.family.details.family_text}:null}))})};
  const decisions=await multiAgeDecisionContext(db,teacherId,classroomId);
  const group=await multiAgeGroupDiagnosticWorkspace(db,teacherId,classroomId,diagnosis);
  if(group.confirmed&&!documentsOnly){
    planning.diagnostic_group_review={id:group.confirmed.id,version:group.confirmed.version,current:group.current,
      readings:group.current?group.confirmed.details.readings:[],organization:group.current?group.confirmed.details.organization:'',
      source_policy:'Las lecturas se limitan a sus edades, competencias y revisiones citadas. No extrapoles a otros niños. Una versión sin vigencia es histórica; revisa las fuentes individuales. La organización es una intención docente y los relatos familiares son contexto.'};
  }
  if(decisions.revision)planning.teacher_confirmed_indications=decisions;
  const baseSourceFingerprint=curriculumHash({...(documentsOnly?{document_generation_mode:true}:{}),diagnostic:diagnosis.sourceFingerprint,calendar:calendar.calendar_fingerprint,curriculum_version:curriculum.official_performance_version,...(group.confirmed?{groupReview:planning.diagnostic_group_review}:{})});
  return {documentsOnly,diagnosis,eligible,calendar,context:planning,baseSourceFingerprint,sourceFingerprint:decisions.revision?curriculumHash({baseSourceFingerprint,decisions}):baseSourceFingerprint};
}
export function multiAgeAnnualPlanCurrent(plan,data){return plan.source_context_fingerprint===data.sourceFingerprint||plan.status==='active'&&(plan.document_context?.base_source_fingerprint??plan.source_context_fingerprint)===data.baseSourceFingerprint;}
function validateOpportunity(o,data,{editorial=false}={}){
  if(!exact(o,['age','competency_id','child_action','mediation','observation','official_performance_refs',...(editorial?['supports']:[])])||editorial&&!text(o.supports,500)||!data.eligible.some(g=>g.age===o.age&&g.cards.some(c=>c.id===o.competency_id))
    ||!text(o.child_action)||!text(o.mediation)||!text(o.observation))throw new TypeError('Revisa edad, competencia y actuación de cada oportunidad.');
  validateOfficialPerformanceRefs(o.official_performance_refs,o.competency_id,o.age,{required:true});
}
export function validateMultiAgeAnnualProposal(value,data){
  if(!exact(value,['title','organization','proposals','everyday_opportunities'])||!text(value.title,180)||!text(value.organization,2400)||!Array.isArray(value.proposals)||value.proposals.length!==15
    ||!Array.isArray(value.everyday_opportunities)||value.everyday_opportunities.length>90)throw new TypeError('Mi año requiere 15 posiciones completas y una organización compartida.');
  const covered=new Set();
  for(const [index,row] of value.proposals.entries()){
    const editorial=data.documentsOnly&&(Object.hasOwn(row,'summary')||Object.hasOwn(row,'rationale'));
    if(!exact(row,['slot_id','title','purpose','common_invitation','one_teacher_organization','opportunities',...(editorial?['summary','rationale']:[])])||editorial&&(!text(row.summary,350)||!text(row.rationale,1000))||row.slot_id!==data.calendar.projects[index].slot_id||!text(row.title,180)||!text(row.purpose)||!text(row.common_invitation)||!text(row.one_teacher_organization,2400)
      ||!Array.isArray(row.opportunities)||!row.opportunities.length||row.opportunities.length>18)throw new TypeError('No se pueden cambiar posiciones ni omitir la organización de la profesora.');
    const seen=new Set();for(const o of row.opportunities){validateOpportunity(o,data,{editorial});const key=`${o.age}:${o.competency_id}`;if(seen.has(key))throw new TypeError('La oportunidad está duplicada para la misma edad.');seen.add(key);covered.add(key);}
    if(data.eligible.some(g=>!row.opportunities.some(o=>o.age===g.age)))throw new TypeError('Cada posición debe incluir a todos los grupos atendidos.');
    if(data.documentsOnly&&data.eligible.some(g=>new Set(row.opportunities.filter(o=>o.age===g.age).map(o=>o.competency_id)).size<2))throw new TypeError('Cada proyecto necesita al menos dos competencias distintas para cada edad. Revisa la propuesta antes de guardarla.');
  }
  const everyday=new Set();for(const o of value.everyday_opportunities){validateOpportunity(o,data);const key=`${o.age}:${o.competency_id}`;if(everyday.has(key))throw new TypeError('Oportunidad cotidiana duplicada.');everyday.add(key);covered.add(key);}
  if(data.eligible.some(g=>g.cards.some(c=>!covered.has(`${g.age}:${c.id}`))))throw new TypeError('Falta cobertura planificada de una competencia habilitada para una edad.');
  return value;
}

/** Clearly labelled editorial fixture. No observation, interest, difficulty or achievement is invented. */
export function sampleMultiAgeAnnualProposal(data){
  const oral={3:{action:'Expresa lo que desea o siente al elegir un juego mediante palabras, gestos o movimientos.',mediation:'Escuchar, aceptar gestos y dar tiempo para expresar una elección sin exigir una explicación extensa.',observation:'Registrar sus palabras o gestos al expresar una necesidad, emoción o elección.'},
    4:{action:'Expresa sus preferencias o experiencias de juego en una conversación con otros.',mediation:'Escuchar su idea y ofrecer una pregunta abierta para continuar la conversación, sin responder por el niño.',observation:'Registrar lo que cuenta sobre sus preferencias o experiencias y cómo participa en el intercambio.'},
    5:{action:'Comparte ideas o experiencias de juego y desarrolla lo que quiere comunicar durante el intercambio.',mediation:'Dar tiempo para desarrollar su idea, respetar los turnos y ofrecer preguntas que permitan ampliar voluntariamente.',observation:'Registrar sus ideas, cómo las desarrolla y los recursos que usa para comunicarse.'}};
  const opportunity=(g,c)=>({age:g.age,competency_id:c.id,child_action:c.id==='COM_ORAL'?oral[g.age].action:`Explorar y participar según sus posibilidades en una oportunidad vinculada a «${c.official_name}».`,mediation:c.id==='COM_ORAL'?oral[g.age].mediation:'Ofrecer tiempo, materiales disponibles y diferentes formas de responder; acompañar a un grupo por turno.',observation:c.id==='COM_ORAL'?oral[g.age].observation:'Registrar lo que hace o dice, el contexto y los apoyos que efectivamente se ofrecieron.',official_performance_refs:officialPerformances(c.id,g.age).slice(0,1).map(p=>p.id)});
  return {title:'Nuestro año de juego y exploración · ejemplo local',organization:'Una profesora acompaña a un grupo a la vez; los otros exploran materiales seguros en un mismo espacio visible. Ajustar la previsión después de observar. No presupone logros ni intereses.',
    proposals:data.calendar.projects.map((slot,i)=>{
      const demo=data.documentsOnly?DOCUMENT_GENERATOR_DEMO_PROJECTS[i]:null;
      return {slot_id:slot.slot_id,title:demo?.title??`Invitación compartida ${i+1}`,purpose:demo?.purpose??'Abrir oportunidades de juego, comunicación y exploración para los grupos atendidos.',common_invitation:demo?.invitation??'Elegir materiales disponibles y explorar posibilidades de juego juntos.',one_teacher_organization:'Inicio común. Acompañar brevemente a un grupo por turno; los demás continúan explorando en el espacio visible. Cierre compartido y participación voluntaria.',opportunities:data.eligible.flatMap(g=>{const primary=demo?g.cards.find(c=>c.id===demo.competencyId)??g.cards[0]:i===0?g.cards.find(c=>c.id==='COM_ORAL'):g.cards[i%g.cards.length];return [primary,...(data.documentsOnly?[g.cards.find(c=>c.id!==primary.id&&c.id===(primary.id==='COM_ORAL'?'PS_CONVIVE':'COM_ORAL'))??g.cards.find(c=>c.id!==primary.id)]:[])].map(c=>opportunity(g,c));})};
    }),
    everyday_opportunities:data.eligible.flatMap(g=>g.cards.map(c=>opportunity(g,c)))};
}

export async function saveMultiAgeAnnualDraft(db,teacherId,input){
  assertMultiAgeLocalDb(db);
  return curriculumRequest(db,teacherId,input.clientRequestId,'annual_draft',input,async tx=>{
    if(input.generationJobId)await (await import('./multi-age-generation-jobs.mjs')).assertMultiAgeGenerationUse(tx,teacherId,input.generationJobId,'annual',input);
    const data=await multiAgeAnnualContext(tx,teacherId,input.classroomId);
    if(input.sourceFingerprint!==data.sourceFingerprint)throw new VersionConflictError('Cambió el diagnóstico, matrícula o calendario. Actualiza las fuentes del borrador.');
    const scope=data.diagnosis.classroom;
    const current=(await tx.query(`select * from annual_plans where classroom_id=$1 and curriculum_contract_version=2 and status='draft' for update`,[scope.id])).rows[0];
    if(current&&(input.planId!==current.id||Number(input.expectedRevision)!==Number(current.revision)))throw new VersionConflictError();
    if(!current&&(input.planId||input.expectedRevision))throw new VersionConflictError();
    const base=(await tx.query("select * from annual_plans where classroom_id=$1 and curriculum_contract_version=2 and status='active' order by version desc limit 1",[scope.id])).rows[0]??null;
    if(input.expectedBasePlanId&&(base?.id!==input.expectedBasePlanId||Number(base.revision)!==Number(input.expectedBaseRevision)))throw new VersionConflictError('Cambió Mi año. Recupera la versión vigente.');
    let proposed=input.proposal;
    if(input.reorder){
      if(!base||!input.expectedBasePlanId)throw new VersionConflictError('Selecciona la versión vigente de Mi año.');
      proposed=structuredClone(current?.proposal??base.proposal);
      const a=proposed.proposals.findIndex(r=>r.slot_id===input.reorder.fromSlotId),b=proposed.proposals.findIndex(r=>r.slot_id===input.reorder.toSlotId);
      if(a<0||b<0||a===b)throw new TypeError('Elige dos tramos distintos de este año.');
      const first=proposed.proposals[a],second=proposed.proposals[b];
      proposed.proposals[a]={...second,slot_id:first.slot_id};proposed.proposals[b]={...first,slot_id:second.slot_id};
    }
    const proposal=validateMultiAgeAnnualProposal(proposed,data),preservation=await annualPreservation(tx,scope,base,proposal);
    const id=current?.id??randomUUID(),snapshot={contract:2,classroom_id:scope.id,revision:scope.curriculum_revision,ages:scope.ages},document={base_source_fingerprint:data.baseSourceFingerprint,teacher_confirmed_indications:data.context.teacher_confirmed_indications??null,...((input.generationJobId??current?.document_context?.generation_job_id)?{generation_job_id:input.generationJobId??current.document_context.generation_job_id}:{}),contract:'multi-age-annual-local-v1',curriculum_snapshot:snapshot,calendar:data.calendar,source_snapshot:data.diagnosis.sourceSnapshot,prompt_version:data.context.prompt_version,
      preservation:{base_plan_id:base?.id??null,base_revision:base?.revision??null,fingerprint:preservation.fingerprint,links:preservation.links},...(data.documentsOnly?{document_presentation_version:2}:{}),document_identity:await curriculumDocumentIdentity(tx,teacherId,scope),curriculum_reference:data.eligible.flatMap(g=>g.cards.map(c=>{
        const refs=[...new Set([...proposal.proposals.flatMap(p=>p.opportunities),...proposal.everyday_opportunities].filter(o=>o.age===g.age&&o.competency_id===c.id).flatMap(o=>o.official_performance_refs))];
        return {age:g.age,competency_id:c.id,name:c.official_name,cycle_standard_ai:c.cycle_ii_standard_ai,age_reference:c.ages[String(g.age)],official_performances:refs.map(id=>officialPerformances(c.id,g.age).find(p=>p.id===id)),official_performance_version:data.context.official_performance_version};
      }))};
    if(current)await tx.query(`update annual_plans set proposal=$2::jsonb,document_context=$3::jsonb,source_context_fingerprint=$4,revision=revision+1,updated_at=now() where id=$1`,[id,JSON.stringify(proposal),JSON.stringify(document),data.sourceFingerprint]);
    else{
      const version=Number((await tx.query('select coalesce(max(version),0)+1 n from annual_plans where classroom_id=$1 and school_year_id=$2',[scope.id,scope.school_year_id])).rows[0].n),curriculum=(await tx.query('select id from curriculum_versions order by created_at desc,id limit 1')).rows[0];
      if(!curriculum)throw new Error('Falta la versión curricular instalada.');
      const previous=(await tx.query(`select id from annual_plans where classroom_id=$1 and curriculum_contract_version=2 and status='active' order by version desc limit 1`,[scope.id])).rows[0];
      await tx.query(`insert into annual_plans(id,classroom_id,school_year_id,curriculum_version_id,version,status,proposal,document_context,source_context_fingerprint,supersedes_plan_id,curriculum_contract_version) values($1,$2,$3,$4,$5,'draft',$6::jsonb,$7::jsonb,$8,$9,2)`,[id,scope.id,scope.school_year_id,curriculum.id,version,JSON.stringify(proposal),JSON.stringify(document),data.sourceFingerprint,previous?.id??null]);
    }
    return {classroomId:scope.id,planId:id,revision:Number(current?.revision??0)+1};
  });
}
export async function confirmMultiAgeAnnualPlan(db,teacherId,input){
  assertMultiAgeLocalDb(db);if(input.teacherConfirmed!==true)throw new TypeError('La profesora debe confirmar Mi año.');
  return curriculumRequest(db,teacherId,input.clientRequestId,'annual_confirm',input,async tx=>{
    const data=await multiAgeAnnualContext(tx,teacherId,input.classroomId),plan=(await tx.query(`select * from annual_plans where id=$1 and classroom_id=$2 and curriculum_contract_version=2 for update`,[input.planId,input.classroomId])).rows[0];
    if(!plan||plan.status!=='draft'||Number(plan.revision)!==Number(input.expectedRevision))throw new VersionConflictError();
    if(data.documentsOnly&&!data.diagnosis.students.length)throw new TypeError('Agrega a tus alumnos antes de preparar Mi año.');
    if(!data.diagnosis.ready&&!data.documentsOnly)throw new VersionConflictError('Revisa el diagnóstico de cada niño; se permite confirmar información pendiente explícita, sin inventar actuaciones.');
    if(plan.source_context_fingerprint!==data.sourceFingerprint)throw new VersionConflictError('Las fuentes cambiaron. Actualiza el borrador antes de confirmar.');
    validateMultiAgeAnnualProposal(plan.proposal,data);
    if(plan.supersedes_plan_id){
      const reason=correctionReason(input),base=(await tx.query("select * from annual_plans where id=$1 and classroom_id=$2 and status='active'",[plan.supersedes_plan_id,input.classroomId])).rows[0];
      if(!base)throw new VersionConflictError('Cambió la versión vigente de Mi año.');
      const preservation=await annualPreservation(tx,data.diagnosis.classroom,base,plan.proposal);
      if(plan.document_context.preservation?.fingerprint!==preservation.fingerprint)throw new VersionConflictError('Cambió un proyecto, sus actividades o un cierre. Actualiza el borrador antes de confirmar.');
      for(const link of preservation.links)await tx.query(`insert into multi_age_annual_project_links(annual_plan_id,slot_id,classroom_id,project_id,confirmed_by) values($1,$2,$3,$4,$5)`,[plan.id,link.slot_id,input.classroomId,link.project_id,teacherId]);
      plan.document_context={...plan.document_context,revision_reason:reason};
      await tx.query('update annual_plans set document_context=$2::jsonb where id=$1',[plan.id,JSON.stringify(plan.document_context)]);
      await tx.query("update annual_plans set status='archived',updated_at=now() where id=$1 and classroom_id=$2 and status='active'",[plan.supersedes_plan_id,input.classroomId]);
    }
    await tx.query("update annual_plans set status='active',teacher_confirmed_at=now(),revision=revision+1,updated_at=now() where id=$1",[plan.id]);
    return {classroomId:input.classroomId,planId:plan.id,revision:Number(plan.revision)+1};
  });
}
export async function multiAgeAnnualWorkspace(db,teacherId,classroomId){
  const data=await multiAgeAnnualContext(db,teacherId,classroomId),plans=(await db.query(`select * from annual_plans where classroom_id=$1 and curriculum_contract_version=2 order by version desc`,[classroomId])).rows;
  const active=plans.find(p=>p.status==='active'),preservation=active?await annualPreservation(db,data.diagnosis.classroom,active,active.proposal):{protectedSlots:[],links:[]};
  return {diagnostic:data.diagnosis,calendar:data.calendar,sourceFingerprint:data.sourceFingerprint,protectedSlots:preservation.protectedSlots,projectLinks:preservation.links,plans:plans.map(p=>({...p,current:multiAgeAnnualPlanCurrent(p,data)})),exampleProposal:sampleMultiAgeAnnualProposal(data),coverage:data.eligible.map(g=>({age:g.age,competencies:g.cards.map(c=>({id:c.id,name:c.official_name,hasAgePerformance:officialPerformances(c.id,g.age).length>0}))}))};
}

/** Validate lineage before the existing activity writer runs inside the SAME transaction. */
export async function validateMultiAgeAnnualActivity(tx,teacherId,input,{projectPositionOffset=0}={}){
  if(!input.annualPlanId&&!input.annualSlotId)return null;
  if(!input.annualPlanId||!input.annualSlotId)throw new TypeError('Selecciona el plan y la posición anual.');
  const scope=await classroomCurriculumScope(tx,teacherId,input.classroomId);if(scope.contract!==2)throw new CurriculumPermissionError();
  const plan=(await tx.query(`select * from annual_plans where id=$1 and classroom_id=$2 and status='active' and curriculum_contract_version=2`,[input.annualPlanId,scope.id])).rows[0];
  if(!plan)throw new CurriculumPermissionError();
  const slot=plan.document_context.calendar.projects.find(s=>s.slot_id===input.annualSlotId),row=plan.proposal.proposals.find(s=>s.slot_id===input.annualSlotId);
  if(!slot||!row||!slot.instructional_dates.includes(input.blueprint.occursOn))throw new TypeError('La actividad debe estar en una fecha lectiva de la posición anual elegida.');
  if(!input.projectId){const data=await multiAgeAnnualContext(tx,teacherId,scope.id);if(!multiAgeAnnualPlanCurrent(plan,data))throw new VersionConflictError('Mi año requiere revisar sus fuentes antes de preparar otra actividad.');}
  if(JSON.stringify([...input.blueprint.participantAges].sort())!==JSON.stringify(scope.ages))throw new TypeError('La actividad compartida debe conservar los grupos de la posición anual.');
  for(const family of input.blueprint.criteriaFamilies)for(const v of family.variants){if(!row.opportunities.some(o=>o.age===v.curricular_age&&o.competency_id===family.competency_id))throw new TypeError('El criterio no corresponde a una oportunidad de esa posición y edad.');}
  const existing=(await annualProjectLinks(tx,plan.id)).filter(link=>link.slot_id===slot.slot_id).map(link=>({id:link.project_id}));
  const position=input.activityPosition??1;
  if(!Number.isSafeInteger(position)||position<1||position>30)throw new TypeError('La posición de la actividad debe estar entre 1 y 30.');
  let project=null;
  if(input.projectId){
    if(existing.length!==1||existing[0].id!==input.projectId)throw new CurriculumPermissionError();
    project=await multiAgeProjectContext(tx,teacherId,scope.id,input.projectId);
    if(input.expectedProjectFingerprint!==project.fingerprint||position!==project.nextPosition+projectPositionOffset)throw new VersionConflictError('El proyecto cambió o esta actividad ya está preparada. Recupera su posición actual.');
    validateMultiAgeProjectCriteria(project.project,input.blueprint);
    if(input.blueprint.title)validateActivityAgainstProjectRoute(project.project.details.document_planning,input.blueprint);
  }else if(existing.length)throw new VersionConflictError('Esta posición ya tiene un proyecto preparado. Revisa el existente.');
  else if(position!==1)throw new TypeError('El proyecto comienza por su primera actividad.');
  return {planId:plan.id,slotId:slot.slot_id,startsOn:slot.starts_on,endsOn:slot.ends_on,planRevision:plan.revision,planFingerprint:curriculumHash(plan.proposal),position,project,
    documentProject:await isDocumentGenerator(tx,teacherId)?{title:row.title,purpose:row.purpose,opportunities:row.opportunities}:null};
}
