import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {openMultiAgePersistentDb,multiAgeLocalStorage} from './multi-age-local-db.mjs';
import {chooseAyniProductMode} from '../src/lib/ayni-product-mode.mjs';
import {createMultiAgeClassroom,enrollMultiAgeStudent,confirmMultiAgeActivity} from '../src/lib/multi-age-local-service.mjs';
import {multiAgeAnnualContext,sampleMultiAgeAnnualProposal,saveMultiAgeAnnualDraft,confirmMultiAgeAnnualPlan,multiAgeAnnualWorkspace} from '../src/lib/multi-age-annual.mjs';
import {officialPerformances} from '../src/lib/official-performance-references.mjs';
import {enqueueMultiAgeGeneration,runMultiAgeGenerationStep,loadMultiAgeGeneration} from '../src/lib/multi-age-generation-jobs.mjs';
import {multiAgeProviderForJob} from './multi-age-ai-runtime.mjs';
import {multiAgeProjectContext} from '../src/lib/multi-age-projects.mjs';
import {loadMultiAgeDocument,loadDocumentGeneratorProjectExport} from '../src/lib/multi-age-document-service.mjs';
import {renderMultiAgePlanningWord} from '../src/lib/multi-age-planning-word.mjs';

const round=Number(process.argv.find(a=>a.startsWith('--round='))?.slice(8)),keyPath=process.argv.find(a=>a.startsWith('--key-env='))?.slice(10);
if(!process.argv.includes('--confirm-live')||![1,2,3].includes(round)||!keyPath)throw new Error('Requiere ronda 1–3 y autorización local de IA.');
const base='output/generador-documentos/proyectos-completos-20261026',directory=`${base}/round-${round}`;
await mkdir(directory,{recursive:true});
try{await readFile(`${directory}/request.json`);throw new Error('Esta ronda ya se consumió. No se reintenta automáticamente.');}catch(error){if(error.code!=='ENOENT')throw error;}
const env=parseEnv(await readFile(keyPath,'utf8')),key=env.AYNI_DOCUMENT_GENERATOR_OPENAI_API_KEY??env.OPENAI_API_KEY;
if(!key)throw new Error('Falta configuración local de clave.');
const db=await openMultiAgePersistentDb({storeName:'generador-qa-proyectos-completos-20261026'}),teacher=multiAgeLocalStorage(db).teacherId;
const conf=()=>({teacherConfirmed:true,clientRequestId:randomUUID()});let calls=0,status='failed';
try{
 let classroomId=(await db.query('select id from classrooms where teacher_id=$1',[teacher])).rows[0]?.id;
 if(!classroomId){
  assert.equal(round,1);await chooseAyniProductMode(db,teacher,{mode:'documents'});
  ({classroomId}=await createMultiAgeClassroom(db,teacher,{...conf(),teacherName:'Docente ficticia QA',institutionName:'Jardín ficticio de prueba',section:'QA multiedad',ages:[3,4,5],year:2026,startsOn:'2026-03-02',endsOn:'2026-12-31'}));
  for(const age of [3,4,5])await enrollMultiAgeStudent(db,teacher,{...conf(),classroomId,expectedRevision:1,firstName:`Niño QA ${age}`,lastName:'Ficticio',age});
  const data=await multiAgeAnnualContext(db,teacher,classroomId),proposal=sampleMultiAgeAnnualProposal(data);
  proposal.organization='Contexto ficticio confirmado para QA: aula con una profesora y tres niños, uno de cada edad de 3, 4 y 5 años. Dispone de bloques, retazos de tela y libros de imágenes; el patio está cerrado. No hay agua disponible para experimentar ni dispositivos digitales. Se prioriza conocerse, jugar juntos y cuidar recursos. Las familias pueden conversar brevemente a la salida, sin compras ni asistencia adicional.';
  for(const [index,title,invitation]of [[0,'Un espacio para nuestras ideas de juego','¿Cómo podemos combinar nuestras ideas para que cada uno encuentre una forma de jugar?'],[1,'Cuidamos el agua con decisiones compartidas','¿Qué acuerdos podemos proponer para cuidar el agua sin usarla en nuestros juegos?']]){
   const row=proposal.proposals[index];row.title=title;row.purpose=index?'Ofrecer oportunidades para expresar propuestas de cuidado y decidir con otros acciones posibles para cuidar el agua.':'Ofrecer oportunidades para expresar preferencias, combinar ideas y construir formas de participar en juegos compartidos.';row.common_invitation=invitation;
   row.opportunities=data.eligible.flatMap(g=>['PS_IDENTIDAD','PS_CONVIVE'].map(id=>({age:g.age,competency_id:id,child_action:id==='PS_IDENTIDAD'?'Expresar una elección en una propuesta compartida.':'Proponer una idea para participar y tomar decisiones con otros.',mediation:'Dar tiempo para elegir y escuchar propuestas distintas.',observation:'Una elección expresada o una propuesta durante el juego.',official_performance_refs:officialPerformances(id,g.age).slice(0,1).map(p=>p.id)})));
  }
  const draft=await saveMultiAgeAnnualDraft(db,teacher,{...conf(),classroomId,proposal,sourceFingerprint:data.sourceFingerprint});await confirmMultiAgeAnnualPlan(db,teacher,{...conf(),classroomId,planId:draft.planId,expectedRevision:draft.revision});
 }
 const workspace=await multiAgeAnnualWorkspace(db,teacher,classroomId),plan=workspace.plans.find(p=>p.status==='active'),slot=workspace.calendar.projects[round===3?1:0];
 const first=round===2?JSON.parse(await readFile(`${base}/round-1/saved.json`,'utf8')):null;
 const project=first?await multiAgeProjectContext(db,teacher,classroomId,first.projectId):null;
 const input={kind:'activity',classroomId,annualPlanId:plan.id,annualSlotId:slot.slot_id,occursOn:slot.instructional_dates[round===2?1:0],activityPosition:round===2?2:1,competencyIds:['PS_IDENTIDAD','PS_CONVIVE'],...(project?{projectId:project.project.id,expectedProjectFingerprint:project.fingerprint}:{})};
 const job=await enqueueMultiAgeGeneration(db,teacher,input,{mode:'openai'}),factory=multiAgeProviderForJob(db,{AYNI_MULTI_AGE_AI_MODE:'openai',AYNI_MULTI_AGE_OPENAI_API_KEY:key});
 await runMultiAgeGenerationStep(db,{mode:'openai',providerForJob:async row=>{const provider=await factory(row);return {generate:async request=>{if(++calls>1)throw new Error('Solo una llamada por ronda.');await writeFile(`${directory}/request.json`,JSON.stringify(request,null,2));return provider.generate(request);}};}});
 const ready=await loadMultiAgeGeneration(db,teacher,job.id);await writeFile(`${directory}/result.json`,JSON.stringify(ready,null,2));assert.equal(ready.status,'ready');
 const saved=await confirmMultiAgeActivity(db,teacher,{...conf(),...input,expectedRevision:1,generationJobId:job.id,blueprint:ready.result.proposal});await writeFile(`${directory}/saved.json`,JSON.stringify(saved,null,2));
 const prepared=await loadDocumentGeneratorProjectExport(db,teacher,saved.projectId);
 const activity=await loadMultiAgeDocument(db,teacher,'activity',saved.activityId);
 assert.equal(prepared.document.content.documentPlanning.version,2);assert.equal(activity.content.activityPlanning.version,2);
 await writeFile(`${directory}/documents.json`,JSON.stringify({project:prepared.document,activity},null,2));
 await writeFile(`${directory}/proyecto.docx`,await renderMultiAgePlanningWord(prepared.document,{activityRoute:prepared.activityRoute}));
 await writeFile(`${directory}/actividad.docx`,await renderMultiAgePlanningWord(activity));status='passed';
}finally{
 const usage=(await db.query('select workflow,model,cost_usd,input_tokens,output_tokens from ai_usage_events order by occurred_at')).rows;
 await writeFile(`${directory}/receipt.json`,JSON.stringify({round,status,calls,syntheticOnly:true,annualSource:'fixture confirmado para QA; cero año generado con IA',usage},null,2));await db.close();console.log(JSON.stringify({round,status,calls,directory}));
}
