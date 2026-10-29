// Explicit paid QA only. Each round owns a synthetic database; never opens the user trial.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {randomUUID,createHash} from 'node:crypto';
import JSZip from 'jszip';
import assert from 'node:assert/strict';
import {openMultiAgePersistentDb,multiAgeLocalStorage} from './multi-age-local-db.mjs';
import {chooseAyniProductMode} from '../src/lib/ayni-product-mode.mjs';
import {createMultiAgeClassroom,enrollMultiAgeStudent,multiAgeLocalWorkspace} from '../src/lib/multi-age-local-service.mjs';
import {multiAgeAnnualContext,sampleMultiAgeAnnualProposal,saveMultiAgeAnnualDraft,confirmMultiAgeAnnualPlan,multiAgeAnnualWorkspace} from '../src/lib/multi-age-annual.mjs';
import {officialPerformances} from '../src/lib/official-performance-references.mjs';
import {enqueueMultiAgeGeneration,runMultiAgeGenerationStep,loadMultiAgeGeneration} from '../src/lib/multi-age-generation-jobs.mjs';
import {readMultiAgeConversation} from '../src/lib/multi-age-conversation.mjs';
import {startDocumentGeneratorProjectPreparation,advanceDocumentGeneratorProjects,readDocumentGeneratorProjectPreparation,retryDocumentGeneratorProjectPreparation} from '../src/lib/document-generator-project-preparation.mjs';
import {multiAgeProviderForJob} from './multi-age-ai-runtime.mjs';
import {loadMultiAgeDocument,loadDocumentGeneratorProjectExport} from '../src/lib/multi-age-document-service.mjs';
import {renderMultiAgePlanningWord} from '../src/lib/multi-age-planning-word.mjs';
import {documentGeneratorSavedFilename} from '../src/lib/document-generator-downloads.mjs';
import {DOCUMENT_GENERATOR_PROMPT_VERSION} from '../src/lib/document-generator-prompts.mjs';
import {buildDocumentGeneratorProjectZip} from '../src/lib/document-generator-project-zip.mjs';

const arg=name=>process.argv.find(a=>a.startsWith(`--${name}=`))?.slice(name.length+3);
const round=Number(arg('round')),stage=arg('stage'),keyFile=arg('key-env');
const suite=arg('suite')??'baseline';
if(!process.argv.includes('--confirm-live')||!['baseline','concrete'].includes(suite)||!(suite==='concrete'?[1,2]:[1,2,3]).includes(round)||!['setup','chat','generate','export'].includes(stage)||!keyFile)throw Error('Requiere autorización, suite/ronda válida, etapa y archivo local de configuración.');
const directory=`output/generador-documentos/${suite==='concrete'?'guia-concreta-real-20261027':'chat-proyecto-real-20261026'}/round-${round}`;
await mkdir(directory,{recursive:true});
const config=parseEnv(await readFile(keyFile,'utf8')),key=config.AYNI_DOCUMENT_GENERATOR_OPENAI_API_KEY??config.OPENAI_API_KEY;
if(!key)throw Error('Falta configuración local de IA.');
const storeName=suite==='concrete'?`generador-qa-guia-concreta-20261027-r${round}`:`generador-qa-chat-real-20261026-r${round}`,db=await openMultiAgePersistentDb({storeName}),teacher=multiAgeLocalStorage(db).teacherId;
const confirm=()=>({teacherConfirmed:true,clientRequestId:randomUUID()}),options={mode:'openai'};
const factory=multiAgeProviderForJob(db,{AYNI_MULTI_AGE_AI_MODE:'openai',AYNI_MULTI_AGE_OPENAI_API_KEY:key});
let call=0;
const providerForJob=async job=>{const base=await factory(job);return {generate:async request=>{
 assert.ok(++call<=(stage==='generate'?2:1),'Límite de llamadas por etapa.');
 const requestPath=`${directory}/request-${job.id}${job.attempts>1?'-attempt-'+job.attempts:''}.json`;
 if(job.attempts>1&&!process.argv.includes('--accept-uncertain-retry'))throw Error('El reintento requiere aceptación explícita de posible consumo.');
 if(suite==='concrete')assert.ok(job.attempts<=2,'Máximo un reintento explícito por tarea de esta suite.');
 try{await readFile(requestPath);throw Error('Esta solicitud ya consumió su intento; no se repite.');}catch(error){if(error.code!=='ENOENT')throw error;}
 assert.ok(!JSON.stringify(request.ai_context_bundle).includes('Privado QA'));
 await writeFile(requestPath,JSON.stringify(request,null,2));
 console.log(JSON.stringify({stage,round,kind:job.kind,state:'calling',promptVersion:DOCUMENT_GENERATOR_PROMPT_VERSION}));
 try{
  const result=await base.generate(request);await writeFile(`${directory}/response-${job.id}.json`,JSON.stringify(result,null,2));return result;
 }catch(error){
  // Do not log provider messages, request headers, credentials or arbitrary error details.
  const reason=/^[a-z_]{1,60}$/.test(error?.reason??'')?error.reason:'unclassified_provider_error';
  const status=Number.isInteger(error?.details?.status)?error.details.status:null;
  await writeFile(`${requestPath.slice(0,-5)}-error.json`,JSON.stringify({reason,status},null,2));throw error;
 }
 }};};
try{
 if(stage==='setup'){
  assert.equal((await db.query('select count(*)::int n from classrooms where teacher_id=$1',[teacher])).rows[0].n,0,'Esta ronda ya fue inicializada.');
  await chooseAyniProductMode(db,teacher,{mode:'documents'});
  const c=await createMultiAgeClassroom(db,teacher,{...confirm(),teacherName:'Docente ficticia QA',institutionName:'Jardín QA 428',section:'CELESTE QA',ages:[3,4,5],year:2026,startsOn:'2026-03-02',endsOn:'2026-12-31'});
  for(const age of [3,4,5])await enrollMultiAgeStudent(db,teacher,{...confirm(),classroomId:c.classroomId,expectedRevision:1,firstName:'Niño ficticio',lastName:`Privado QA ${age}`,age});
  const data=await multiAgeAnnualContext(db,teacher,c.classroomId),proposal=sampleMultiAgeAnnualProposal(data),p=proposal.proposals[0];
  const garden=suite==='concrete'?round===2:round===3;
  const ids=garden?['CYT_INDAGA','COM_ORAL','PS_CONVIVE']:['PS_IDENTIDAD','PSICO_MOTRICIDAD','PS_CONVIVE'];
  proposal.organization='Previsión anual ficticia para QA. Una profesora acompaña a los tres grupos en un mismo espacio visible. Los recursos, intereses y condiciones de cada proyecto se precisarán en su conversación propia.';
  p.title=garden?'Exploramos la vida de nuestras plantas':'Comemos y nos cuidamos con más autonomía';
  p.purpose=garden?'Explorar preguntas sobre las plantas, comunicar ideas y colaborar en su cuidado.':'Explorar maneras de alimentarse y cuidarse con autonomía y participar en el cuidado del espacio compartido.';
  p.common_invitation=garden?'¿Qué podemos averiguar sobre las plantas que tenemos cerca?':'¿Qué podemos probar para comer, cuidarnos y dejar nuestro espacio cuidado con más autonomía?';
  p.opportunities=data.eligible.flatMap(g=>ids.map(id=>{
   const index=id==='PS_IDENTIDAD'?(g.age===5?3:2):id==='PSICO_MOTRICIDAD'?1:id==='PS_CONVIVE'?(g.age===3?2:3):0;
   const performance=officialPerformances(id,g.age)[index];assert.ok(performance);
   return {age:g.age,competency_id:id,child_action:id==='PS_IDENTIDAD'?'Elegir y realizar acciones de cuidado personal, comunicando qué ayuda necesita.':id==='PSICO_MOTRICIDAD'?'Explorar y ajustar movimientos al utilizar utensilios cotidianos.':id==='PS_CONVIVE'?'Proponer formas de cuidar materiales y espacios con otros.':id==='CYT_INDAGA'?'Explorar preguntas sobre seres vivos cercanos y comunicar lo que encuentra.':'Expresar ideas y preguntas en un intercambio sobre las plantas.',mediation:'Dar tiempo para probar y expresar ideas, con apoyos adecuados a cada edad.',observation:'Una actuación o expresión concreta durante la experiencia prevista.',official_performance_refs:[performance.id]};
  }));
  const draft=await saveMultiAgeAnnualDraft(db,teacher,{...confirm(),classroomId:c.classroomId,proposal,sourceFingerprint:data.sourceFingerprint});
  await confirmMultiAgeAnnualPlan(db,teacher,{...confirm(),classroomId:c.classroomId,planId:draft.planId,expectedRevision:draft.revision});
  console.log(JSON.stringify({stage,round,syntheticOnly:true,paidAnnualGenerations:0}));
 }else{
  const classroomId=(await db.query('select id from classrooms where teacher_id=$1',[teacher])).rows[0]?.id;assert.ok(classroomId,'Inicializa esta ronda.');
  const planning=await multiAgeAnnualWorkspace(db,teacher,classroomId),plan=planning.plans.find(p=>p.status==='active'),slot=planning.calendar.projects[0];
  const scope={classroomId,annualPlanId:plan.id,annualSlotId:slot.slot_id};
  if(stage==='chat'){
   const text=arg('message');assert.ok(text);
   const chat=await readMultiAgeConversation(db,teacher,scope);assert.ok(chat.revision<9,'Máximo nueve turnos por ronda.');
   const job=await enqueueMultiAgeGeneration(db,teacher,{...scope,clientRequestId:randomUUID(),kind:'conversation',expectedRevision:chat.revision,text},options);
   await runMultiAgeGenerationStep(db,{...options,providerForJob});
   const ready=await loadMultiAgeGeneration(db,teacher,job.id);assert.equal(ready.status,'ready',ready.errorCode??ready.status);
   const conversation=await readMultiAgeConversation(db,teacher,scope);await writeFile(`${directory}/conversation.json`,JSON.stringify(conversation,null,2));
   console.log(JSON.stringify({turn:conversation.revision,...ready.result.output}));
  }else if(stage==='generate'){
   const chat=await readMultiAgeConversation(db,teacher,scope);assert.ok(chat.revision>=3,'Primero conversa sobre el proyecto.');
   const input={...scope,teacherConfirmed:true,expectedPlanRevision:plan.revision,projectConversationRevision:chat.revision,selectedDates:slot.instructional_dates.slice(0,6)};
   const previous=await startDocumentGeneratorProjectPreparation(db,teacher,input,options);
   if(['failed','uncertain'].includes(previous.status)&&process.argv.includes('--accept-uncertain-retry'))await retryDocumentGeneratorProjectPreparation(db,teacher,{classroomId,preparationId:previous.id,acceptPotentialRepeat:true},options);
   for(let i=0;i<2;i++){
    await runMultiAgeGenerationStep(db,{...options,providerForJob});await advanceDocumentGeneratorProjects(db,options);
    const state=await readDocumentGeneratorProjectPreparation(db,teacher,scope);await writeFile(`${directory}/preparation.json`,JSON.stringify(state,null,2));console.log(JSON.stringify(state));
    assert.ok(!['failed','uncertain'].includes(state.status),'La preparación no se completó; sin reintento automático.');if(state.status==='succeeded')break;
   }
  }else{
   const w=await multiAgeLocalWorkspace(db,teacher,classroomId),project=w.projects.find(p=>p.annual_plan_id===plan.id&&p.annual_slot_id===slot.slot_id);assert.ok(project);
   const prepared=await loadDocumentGeneratorProjectExport(db,teacher,project.id),activities=[];
   const originals=await Promise.all(['proyecto-unidad-inicial-unificada-v1','actividad-aprendizaje-inicial-unificada-v1'].map(async name=>{const bytes=await readFile(`assets/templates/${name}.docx`);return {name,bytes,sha256:createHash('sha256').update(bytes).digest('hex')};}));
   await writeFile(`${directory}/artifact.md`,['# Plantillas originales de Ayni',...originals.map(t=>`${t.name}: ${t.sha256}`),'Portada, estilos, imágenes, márgenes, cabeceras y pie conservados. Cuerpo práctico en la ranura del renderizador existente. Matrices compactas, propósito, materiales, momentos, apoyos y referentes. Fuente estructurada guardada inmutable. Identidad y situaciones de QA ficticias; no edita la prueba de la usuaria.'].join('\n'));
   for(const a of w.activities){const document=await loadMultiAgeDocument(db,teacher,'activity',a.id);activities.push(document);await writeFile(`${directory}/${await documentGeneratorSavedFilename(db,teacher,document)}`,await renderMultiAgePlanningWord(document,{practical:true}));}
   await writeFile(`${directory}/${await documentGeneratorSavedFilename(db,teacher,prepared.document)}`,await renderMultiAgePlanningWord(prepared.document,{activityRoute:prepared.activityRoute,practical:true}));
   for(const document of [prepared.document,...activities]){const rendered=await JSZip.loadAsync(await readFile(`${directory}/${await documentGeneratorSavedFilename(db,teacher,document)}`)),original=await JSZip.loadAsync(originals[document.kind==='project'?0:1].bytes);assert.equal(await rendered.file('word/styles.xml').async('string'),await original.file('word/styles.xml').async('string'));for(const name of Object.keys(original.files).filter(n=>n.startsWith('word/media/')&&!original.files[n].dir))assert.deepEqual(await rendered.file(name).async('nodebuffer'),await original.file(name).async('nodebuffer'));}
   const bundle=await buildDocumentGeneratorProjectZip(db,teacher,project.id);await writeFile(`${directory}/${bundle.filename}`,bundle.bytes);
   await writeFile(`${directory}/documents.json`,JSON.stringify({project:prepared.document,activityRoute:prepared.activityRoute,activities},null,2));
   console.log(JSON.stringify({exported:activities.length+1,activities:activities.map(d=>({title:d.content.title,date:d.content.occursOn})),project:prepared.document.content.meaningfulSituation}));
  }
 }
}finally{
 const usage=(await db.query('select workflow,model,cost_usd,cost_source,input_tokens,output_tokens from ai_usage_events order by occurred_at')).rows;
 const versions=(await db.query("select distinct result->>'promptVersion' as version from multi_age_generation_jobs where teacher_id=$1 and result->>'promptVersion' is not null",[teacher])).rows.map(r=>r.version);
 await writeFile(`${directory}/usage.json`,JSON.stringify({storeName,syntheticOnly:true,lastStagePolicy:DOCUMENT_GENERATOR_PROMPT_VERSION,generationPromptVersions:versions,usage},null,2));await db.close();
}
