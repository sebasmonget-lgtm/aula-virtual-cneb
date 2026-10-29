// Explicit paid QA in a separate store. All Word/ZIP files use Ayni's production renderers.
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {randomUUID} from 'node:crypto';
import {setTimeout as pause} from 'node:timers/promises';
import assert from 'node:assert/strict';
import {openMultiAgePersistentDb,multiAgeLocalStorage} from './multi-age-local-db.mjs';
import {chooseAyniProductMode} from '../src/lib/ayni-product-mode.mjs';
import {createMultiAgeClassroom,enrollMultiAgeStudent,multiAgeLocalWorkspace} from '../src/lib/multi-age-local-service.mjs';
import {multiAgeAnnualContext,sampleMultiAgeAnnualProposal,saveMultiAgeAnnualDraft,confirmMultiAgeAnnualPlan,multiAgeAnnualWorkspace} from '../src/lib/multi-age-annual.mjs';
import {enqueueMultiAgeGeneration,runMultiAgeGenerationStep,loadMultiAgeGeneration,multiAgeGenerationSource} from '../src/lib/multi-age-generation-jobs.mjs';
import {readMultiAgeConversation} from '../src/lib/multi-age-conversation.mjs';
import {startDocumentGeneratorProjectPreparation,advanceDocumentGeneratorProjects,readDocumentGeneratorProjectPreparation} from '../src/lib/document-generator-project-preparation.mjs';
import {multiAgeProviderForJob} from './multi-age-ai-runtime.mjs';
import {proposeLocalMultiAgeBlueprint} from '../src/lib/multi-age-generation.mjs';
import {proposeMultiAgeActivityBatch} from '../src/lib/multi-age-activity-batch.mjs';
import {loadMultiAgeDocument,loadDocumentGeneratorProjectExport} from '../src/lib/multi-age-document-service.mjs';
import {renderMultiAgePlanningWord} from '../src/lib/multi-age-planning-word.mjs';
import {documentGeneratorSavedFilename} from '../src/lib/document-generator-downloads.mjs';
import {buildDocumentGeneratorProjectZip} from '../src/lib/document-generator-project-zip.mjs';
import {GENERATOR_QUALITY_CASES} from './fixtures/generator-quality-cases.mjs';
import {officialPerformances} from '../src/lib/official-performance-references.mjs';

const round=Number(process.argv.find(a=>a.startsWith('--round='))?.slice(8)),stage=process.argv.find(a=>a.startsWith('--stage='))?.slice(8);
if(!process.argv.includes('--confirm-live')||![1,2,3].includes(round)||!['setup','generate','export'].includes(stage))throw Error('Requiere ronda 1/2/3, etapa y autorización de QA real.');
const sequential=process.argv.includes('--sequential'),masterOnly=process.argv.includes('--master-only');
const runTag=process.argv.find(a=>a.startsWith('--run='))?.slice(6),scenario=process.argv.find(a=>a.startsWith('--case='))?.slice(7)??(sequential?'comida':'alrededores');
const replayDirectory=process.argv.find(a=>a.startsWith('--replay-from='))?.slice(14),livePosition=Number(process.argv.find(a=>a.startsWith('--live-position='))?.slice(16));
if(replayDirectory){assert.ok(replayDirectory.startsWith('output/generador-documentos/'));assert.ok(!replayDirectory.includes('..'));assert.ok(Number.isSafeInteger(livePosition)&&livePosition>=2);}
const qualityCase=GENERATOR_QUALITY_CASES[scenario];
assert.ok(!runTag||/^[a-z0-9-]{1,40}$/.test(runTag));assert.ok(['comida','alrededores',...Object.keys(GENERATOR_QUALITY_CASES)].includes(scenario));
const food=sequential&&scenario==='comida',slotIndex=food?2:1,slotId=`tramo_${slotIndex+1}`;
const directory=`output/generador-documentos/${sequential?'secuencia-proyecto-v30':'revision-p02-ruta-v27'}/${runTag?runTag+'/':''}iteracion-${String(round).padStart(2,'0')}`;
await mkdir(directory,{recursive:true});await mkdir(`${directory}/word`,{recursive:true});
const db=await openMultiAgePersistentDb({storeName:(sequential?`generador-qa-secuencia-v30-r${round}`:`generador-qa-p02-ruta-v27-r${round}`)+(runTag?`-${runTag}`:'')}),teacher=multiAgeLocalStorage(db).teacherId,confirm=()=>({clientRequestId:randomUUID(),teacherConfirmed:true});
try{
 if(stage==='setup'){
  const previous=(await db.query('select id from classrooms where teacher_id=$1',[teacher])).rows;assert.ok(previous.length<=1);assert.equal((await db.query('select count(*)::int n from annual_plans where classroom_id in (select id from classrooms where teacher_id=$1)',[teacher])).rows[0].n,0);
  const source=qualityCase?null:JSON.parse(await readFile(food?'.local/project-chat-scope-v28-activation-before.json':'.local/project-route-v27-case.json','utf8'));
  await chooseAyniProductMode(db,teacher,{mode:'documents'});
  const ages=qualityCase?.ages??[3,4,5];
  const {classroomId}=previous[0]?{classroomId:previous[0].id}:await createMultiAgeClassroom(db,teacher,{...confirm(),teacherName:qualityCase?'Docente ficticia QA':'IRMA ROXANA TOVAR HERRERA',institutionName:qualityCase?'Jardín de Prueba':'JARDIN 428',section:qualityCase?'LILA':'CELESTE',ages,year:2026,startsOn:'2026-03-16',endsOn:'2026-12-18'});
  const enrollment=qualityCase?(scenario==='mercado'?[4,4,4,5,5,5]:scenario==='juegos'?[3,3,4,4]:[3,4,4,5]):[3,4,4,5];
  for(const [i,age]of enrollment.entries())await enrollMultiAgeStudent(db,teacher,{...confirm(),classroomId,expectedRevision:1,firstName:'Estudiante QA',lastName:'Prueba '+String(i+1),age});
  const annual=await multiAgeAnnualContext(db,teacher,classroomId),proposal=sampleMultiAgeAnnualProposal(annual);
  if(qualityCase){
   Object.assign(proposal.proposals[slotIndex],{title:qualityCase.title,purpose:qualityCase.purpose,common_invitation:qualityCase.question,opportunities:annual.eligible.flatMap(g=>qualityCase.competencies.map(id=>({age:g.age,competency_id:id,child_action:`Participar en experiencias del proyecto relacionadas con ${g.cards.find(c=>c.id===id).official_name}.`,mediation:'Ofrecer materiales y recoger sus propuestas reales con palabras, gestos o acciones.',observation:'Una pregunta, prueba, propuesta, decisión o producción vinculada a la experiencia del día.',official_performance_refs:officialPerformances(id,g.age).slice(0,3).map(p=>p.id)})))});
   proposal.organization=qualityCase.messages.join('\n').slice(0,2400);
  }else proposal.proposals[slotIndex]=food?source.plans.find(p=>p.status==='active').proposal.proposals[slotIndex]:source.proposal;
  const draft=await saveMultiAgeAnnualDraft(db,teacher,{...confirm(),classroomId,proposal,sourceFingerprint:annual.sourceFingerprint});await confirmMultiAgeAnnualPlan(db,teacher,{...confirm(),classroomId,planId:draft.planId,expectedRevision:draft.revision});
  const messages=qualityCase?.messages??(food?[...source.chats.p3.turns.map(t=>t.teacherText),'Queremos combinar el juego de la cocinita con una preparación fría real acordada por el colegio: una ensalada de frutas para compartir. Tenemos una receta breve ilustrada en papel y los alimentos autorizados por el colegio, limpios y listos para mezclar; la profesora prepara todo lo que necesita cuchillo. Hay recipientes y cucharas y se puede usar el agua del aula. La profesora gestiona las restricciones alimentarias con las familias fuera del chat. La intención sigue siendo aprender cómo preparar y compartir una comida saludable, no solo elegir alimentos o repartir objetos.']:[
   'Al llegar a clases, los niños del aula CELESTE comentan que ven mucha basura en las calles cercanas al colegio y se preguntan si se podría mejorar esa situación. Ese es el hecho de origen del proyecto.',
   'Somos cuatro niños de 3, 4 y 5 años con una profesora. Tenemos sectores de hogar, construcción, biblioteca y teatro. Podemos usar los alrededores del colegio con acompañamiento, como ya conté al preparar Mi año.',
   'Cuenta con materiales básicos habituales del aula sin preguntar por cada hoja o crayón: papel, lápices, crayones, cartón limpio, goma o cinta y recipientes limpios. Para la observación la profesora elige y revisa un punto seguro; los niños no manipulan residuos desconocidos. Queremos conocer la situación y hacer alguna acción de cuidado posible, no pasar diez días planificando una salida.',
   'La primera actividad debe planear todo el proyecto con los niños: qué sabemos, qué queremos averiguar, qué actividades proponemos hacer, qué necesitamos y cómo compartiremos o revisaremos lo realizado. Ayni propone una ruta que luego podrá adaptarse a sus aportes reales. Las familias pueden conversar voluntariamente en casa.'
  ]);
  for(const [i,text]of messages.entries()){
   await enqueueMultiAgeGeneration(db,teacher,{kind:'conversation',clientRequestId:randomUUID(),classroomId,annualPlanId:draft.planId,annualSlotId:slotId,expectedRevision:i,text},{mode:'fixture'});
   await runMultiAgeGenerationStep(db,{mode:'fixture',providerForJob:food?async()=>({generate:async()=>({output:{assistant_text:source.chats.p3.turns[i]?.assistantText??'Conservamos la intención de preparar y compartir, con la modalidad y recursos confirmados.',suggestions:source.chats.p3.turns[i]?.suggestions??[],ready_to_generate:i>=4}})}):multiAgeProviderForJob(db,{AYNI_MULTI_AGE_AI_MODE:'fixture'})});
  }
  console.log(JSON.stringify({stage,round,isolated:true,paidAnnualCalls:0}));
 }else{
  const classroomId=(await db.query('select id from classrooms where teacher_id=$1',[teacher])).rows[0].id,planning=await multiAgeAnnualWorkspace(db,teacher,classroomId),plan=planning.plans.find(p=>p.status==='active'),slot=planning.calendar.projects[slotIndex];
  const scope={classroomId,annualPlanId:plan.id,annualSlotId:slot.slot_id};
  if(stage==='generate'){
   const config=parseEnv(await readFile('C:/Users/ASUS/Documents/ChatGPT/Asistente CNEB/.env.local','utf8')),key=config.AYNI_DOCUMENT_GENERATOR_OPENAI_API_KEY??config.OPENAI_API_KEY;
   assert.ok(key);const factory=multiAgeProviderForJob(db,{AYNI_MULTI_AGE_AI_MODE:'openai',AYNI_MULTI_AGE_OPENAI_API_KEY:key});
   const chat=await readMultiAgeConversation(db,teacher,scope);
   await startDocumentGeneratorProjectPreparation(db,teacher,{...scope,teacherConfirmed:true,expectedPlanRevision:plan.revision,projectConversationRevision:chat.revision,selectedDates:slot.instructional_dates},{mode:'openai'});
   let calls=0;const existingRequests=(await readdir(directory)).filter(f=>f.startsWith('request-')),knownJobs=new Set(existingRequests.map(f=>f.slice(8,-5))),priorCalls=existingRequests.length,maxCalls=1+Math.ceil((slot.instructional_dates.length-1)/5),deadline=Date.now()+30*60_000;
   for(let i=0;i<(masterOnly?1:maxCalls);i++){
    let response,capturedJob;
    const result=await runMultiAgeGenerationStep(db,{mode:'openai',providerForJob:async job=>{
     const firstRequest=!knownJobs.has(job.id);if(firstRequest){knownJobs.add(job.id);assert.ok(priorCalls+(++calls)<=maxCalls);}capturedJob=job;const provider=await factory(job);
     return {generate:async request=>{
      if(firstRequest)await writeFile(`${directory}/request-${job.id}.json`,JSON.stringify(request,null,2),{flag:'wx'});
      if(replayDirectory&&job.input.activityPosition!==livePosition){
       const candidates=(await readdir(replayDirectory)).filter(n=>n.startsWith('request-'));
       const matching=[];
       for(const name of candidates){const old=JSON.parse(await readFile(`${replayDirectory}/${name}`,'utf8'));if(old.workflow===request.workflow&&old.ai_context_bundle.task.first_activity_position===request.ai_context_bundle.task.first_activity_position)matching.push(name);}
       assert.equal(matching.length,1,'La reproducción necesita una única fuente por posición.');
       response=JSON.parse(await readFile(`${replayDirectory}/${matching[0].replace('request-','response-')}`,'utf8'));
       response.provider_metadata={provider:'fixture',cached_replay:true};
       console.log(JSON.stringify({round,kind:job.kind,stage:'cached_replay',call:calls}));
      }else{if(firstRequest)console.log(JSON.stringify({round,kind:job.kind,stage:'calling',call:calls}));response=await provider.generate(request);}
      await writeFile(`${directory}/response-${job.id}.json`,JSON.stringify(response,null,2));return response;
     }};
    }});
    if(!result||result.status==='queued'){
     assert.ok(Date.now()<deadline,'Se excedió la espera acotada de QA.');
     await pause(5100);i--;continue;
    }
    if(result?.status!=='ready'){
     if(response){const source=await multiAgeGenerationSource(db,teacher,capturedJob.kind,capturedJob.input),provider={generate:async()=>response};
      try{if(capturedJob.kind==='activity_batch')await proposeMultiAgeActivityBatch(db,teacher,capturedJob.input,source.annualContext,{provider});else await proposeLocalMultiAgeBlueprint(db,teacher,{...capturedJob.input,annualContext:source.annualContext},{provider});}catch(error){console.log(JSON.stringify({validation:error instanceof TypeError?error.message:'validation_failed',reason:error.reason??null}));}
     }throw Error(`QA detenida: ${result?.status??'sin tarea'}/${result?.errorCode??'sin código'}`);
    }
    const loaded=await loadMultiAgeGeneration(db,teacher,result.id);if(loaded.result.projectPlanning)await writeFile(`${directory}/master.json`,JSON.stringify(loaded.result.projectPlanning,null,2));
    await advanceDocumentGeneratorProjects(db,{mode:'openai'});
    const progress=await readDocumentGeneratorProjectPreparation(db,teacher,scope);console.log(JSON.stringify({round,stage:progress.status,completed:progress.completed,total:progress.total}));if(progress.status==='succeeded')break;
   }
   const progress=await readDocumentGeneratorProjectPreparation(db,teacher,scope);if(!masterOnly)assert.equal(progress.status,'succeeded');
  }else{
   const w=await multiAgeLocalWorkspace(db,teacher,classroomId),project=w.projects.find(p=>p.annual_slot_id===slotId);assert.equal(project.activities.length,slot.instructional_dates.length);
   const prepared=await loadDocumentGeneratorProjectExport(db,teacher,project.id),activities=await Promise.all(project.activities.map(a=>loadMultiAgeDocument(db,teacher,'activity',a.id)));
   for(const document of [prepared.document,...activities])await writeFile(`${directory}/word/${await documentGeneratorSavedFilename(db,teacher,document)}`,await renderMultiAgePlanningWord(document,{practical:true,...(document.kind==='project'?{activityRoute:prepared.activityRoute}:{})}));
   const bundle=await buildDocumentGeneratorProjectZip(db,teacher,project.id);await writeFile(`${directory}/${bundle.filename}`,bundle.bytes);
   await writeFile(`${directory}/documents.json`,JSON.stringify({project:prepared.document,activities},null,2));console.log(JSON.stringify({round,exported:activities.length+1,zip:bundle.filename}));
  }
 }
}finally{
 await writeFile(`${directory}/usage.json`,JSON.stringify((await db.query('select workflow,model,input_tokens,output_tokens,cost_usd from ai_usage_events order by occurred_at')).rows,null,2));await db.close();
}
