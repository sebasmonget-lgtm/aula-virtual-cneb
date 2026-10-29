// Explicit live QA: one provider generation per run, isolated memory database only.
import assert from 'node:assert/strict';
import {parseEnv} from 'node:util';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {openMultiAgeLocalDb} from './multi-age-local-db.mjs';
import {multiAgeProviderForJob} from './multi-age-ai-runtime.mjs';
import {chooseAyniProductMode} from '../src/lib/ayni-product-mode.mjs';
import {createMultiAgeClassroom,enrollMultiAgeStudent} from '../src/lib/multi-age-local-service.mjs';
import {enqueueMultiAgeGeneration,runMultiAgeGenerationStep} from '../src/lib/multi-age-generation-jobs.mjs';
import {prepareDocumentGeneratorConversation} from '../src/lib/multi-age-planning-decisions.mjs';
import {multiAgeAnnualContext,sampleMultiAgeAnnualProposal,validateMultiAgeAnnualProposal} from '../src/lib/multi-age-annual.mjs';
import {DOCUMENT_GENERATOR_ANNUAL_SCHEMA,proposeLocalMultiAgeAnnual} from '../src/lib/multi-age-planning-generation.mjs';
import {proposeLocalMultiAgeBlueprint} from '../src/lib/multi-age-generation.mjs';
import {resolveAIExecutionPlan} from '../src/lib/ai-execution-router-v4.mjs';
import {buildProviderRequest} from '../src/lib/ai-generation-v4.mjs';
import {DOCUMENT_GENERATOR_PROMPT_VERSION} from '../src/lib/document-generator-prompts.mjs';

const option=name=>process.argv.find(a=>a.startsWith(`--${name}=`))?.slice(name.length+3);
const keyFile=option('key-env'),round=option('round'),mode=option('mode')??'sample';
if(!process.argv.includes('--confirm-live')||!keyFile||!/^0[1-5]$/.test(round??'')||!['sample','full','activity'].includes(mode))throw new Error('Requiere --confirm-live, --key-env, --round=01..05 y --mode=sample|full|activity.');
const outputRoot=option('output-root')??'prompts-claros';
if(!/^[a-z0-9-]{1,60}$/.test(outputRoot))throw new TypeError('Selecciona una carpeta QA propia.');
const directory=`output/generador-documentos/${outputRoot}/round-${round}`;
await mkdir(directory,{recursive:true});
try{await readFile(`${directory}/receipt.json`);throw new Error('Esta ronda ya existe; no se repiten llamadas.');}catch(error){if(error.code!=='ENOENT')throw error;}
const settings=parseEnv(await readFile(keyFile,'utf8')),key=settings.AYNI_DOCUMENT_GENERATOR_OPENAI_API_KEY??settings.OPENAI_API_KEY;
assert.ok(key,'Falta clave de texto.');
const db=await openMultiAgeLocalDb(),teacher=randomUUID(),confirm=()=>({clientRequestId:randomUUID(),teacherConfirmed:true});
let calls=0,status='failed',result,checks;
try{
 await chooseAyniProductMode(db,teacher,{mode:'documents'});
 const c=await createMultiAgeClassroom(db,teacher,{...confirm(),teacherName:'Docente ficticia QA',institutionName:'Jardín ficticio QA',section:'Prueba editorial',ages:[3,4,5],year:2026,startsOn:'2026-03-02',endsOn:'2026-12-31'});
 for(const age of [3,4,5])await enrollMultiAgeStudent(db,teacher,{...confirm(),classroomId:c.classroomId,expectedRevision:1,firstName:`Prueba ${age}`,lastName:'Ficticia',age});
 const teacherText=option('context')==='wide'?'Contexto ficticio de prueba general: una profesora y grupos de 3, 4 y 5 años. Hay patio visible, sectores de construcción y biblioteca, bloques, telas, cuentos, vasos y cucharas disponibles. Tres prioridades sucesivas: autonomía en alimentación y cuidado personal (probar utensilios y vaso, recoger restos y pedir ayuda, no solo ordenar una mesa), explorar por qué hay pequeños animales en el patio, y compartir relatos de la comunidad. Son oportunidades futuras, sin niveles ni necesidades generalizadas. El lavado de manos ya se acompaña a diario; no lo presentes como algo que no hacen. No conocemos las preferencias de todos los niños. Las familias pueden contar relatos de forma voluntaria, sin compras ni compromisos. Proyectos con preguntas abiertas y varias vías de exploración; elige por pertinencia las competencias que permitan experiencias variadas, sin fijar la cantidad en dos ni acumularlas por cuota.':option('context')==='sparse'?'Contexto ficticio: una profesora y grupos de 3, 4 y 5 años. Hay patio visible y bloques. Quiero comenzar por integrarnos, después cuidar el agua y explorar relatos. No conozco todavía sus preferencias ni tengo observaciones. No hay huerto, pantallas ni agua disponible para experimentar. Las familias podrían participar, no es un compromiso. Necesito que Ayni proponga situaciones posibles que expliquen por qué elegir esos proyectos, sin atribuirlas a observaciones.':
 'Contexto ficticio: una profesora acompaña a 3, 4 y 5 años. Hay patio visible y sectores de casa, teatro, biblioteca y construcción, cuentos, bloques y telas. Quiero comenzar por conocernos e integrarnos; después cuidar el agua porque a veces escasea y explorar relatos de la comunidad. Reporto que suelen elegir representar personajes y construir. Las familias podrían contar relatos de forma voluntaria, no confirmo que aporten materiales. Jornada con juego en sectores y momentos comunes. Hay semanas frías: usar el aula en esos días. No hay huerto, pantallas ni agua disponible para experimentar. No pido un producto obligatorio, pruebas, diagnóstico ni niveles.';
 const scenarioText=option('context-file')?await readFile(option('context-file'),'utf8'):teacherText;
 await enqueueMultiAgeGeneration(db,teacher,{clientRequestId:randomUUID(),kind:'conversation',classroomId:c.classroomId,expectedRevision:0,text:scenarioText},{mode:'fixture'});
 await runMultiAgeGenerationStep(db,{mode:'fixture',providerForJob:multiAgeProviderForJob(db,{AYNI_MULTI_AGE_AI_MODE:'fixture'})});
 await prepareDocumentGeneratorConversation(db,teacher,{...confirm(),classroomId:c.classroomId});
 const data=await multiAgeAnnualContext(db,teacher,c.classroomId),factory=multiAgeProviderForJob(db,{AYNI_MULTI_AGE_AI_MODE:'openai',AYNI_MULTI_AGE_OPENAI_API_KEY:key});
 const original=await factory({kind:mode==='activity'?'activity':'annual',teacher_id:teacher,provider_mode:'openai',input:{}});
 const provider={generate:async request=>{assert.equal(calls,0,'Una llamada por ronda.');calls++;await writeFile(`${directory}/request.json`,JSON.stringify(request,null,2));const response=await original.generate(request);const {model,duration_ms,usage}=response.provider_metadata??{};await writeFile(`${directory}/usage.json`,JSON.stringify({model,duration_ms,usage},null,2));return response;}};
 if(mode==='full')result=await proposeLocalMultiAgeAnnual(db,teacher,c.classroomId,{provider});
 else if(mode==='activity'){
  const file=option('annual-file');assert.ok(file,'La actividad QA necesita --annual-file de una ronda anual.');
  const annual=JSON.parse(await readFile(file,'utf8')),row=annual.output.proposals[0],slot=data.calendar.projects[0];
  const competencyIds=[...new Set(row.opportunities.map(o=>o.competency_id))];assert.ok(competencyIds.length>=2);
  result=await proposeLocalMultiAgeBlueprint(db,teacher,{classroomId:c.classroomId,competencyIds,occursOn:slot.instructional_dates[0],annualContext:{...annual.projectContext,proposal:row,slot,organization:annual.output.organization}},{provider});
 }else{
  const schema={...DOCUMENT_GENERATOR_ANNUAL_SCHEMA,id:'qa-three-document-projects-v8',properties:{...DOCUMENT_GENERATOR_ANNUAL_SCHEMA.properties,proposals:{...DOCUMENT_GENERATOR_ANNUAL_SCHEMA.properties.proposals,minItems:3,maxItems:3}}};
  const {instructions,source_policy,...brief}=data.context;void source_policy;
  const context={...brief,calendar:{...data.calendar,projects:data.calendar.projects.slice(0,3)},qa_task:option('context')==='wide'?'Solo esta muestra QA: tres posiciones, en el orden de las prioridades expresadas. No es un año completo; no se exige una cantidad de competencias distinta de la política real del producto. Conserva los slot_id y las edades. Las oportunidades cotidianas pueden quedar vacías en esta muestra.':'Solo esta muestra QA: tres posiciones, en orden integración, cuidado del agua y relatos. No es un año completo. Conserva los tres slot_id y todos los grupos. Las oportunidades cotidianas pueden quedar vacías en esta muestra; el año completo se valida después.'};
  const request=buildProviderRequest('annual_plan',context,resolveAIExecutionPlan({workflow:'annual_plan',task:'generation'}),schema,instructions);
  const response=await provider.generate(request),output=typeof response.output==='string'?JSON.parse(response.output):response.output;
  assert.equal(output.proposals.length,3);
  const merged=sampleMultiAgeAnnualProposal(data);merged.proposals.splice(0,3,...output.proposals);validateMultiAgeAnnualProposal(merged,data);
  result={output,promptVersion:DOCUMENT_GENERATOR_PROMPT_VERSION};
 }
 await writeFile(`${directory}/result.json`,JSON.stringify(result,null,2));
 if(result.output){
  const rows=result.output.proposals;
  checks=rows.map(r=>({title:r.title,allAgesTwoCompetencies:[3,4,5].every(age=>new Set(r.opportunities.filter(o=>o.age===age).map(o=>o.competency_id)).size>=2),editorialFields:Boolean(r.summary&&r.rationale&&r.opportunities.every(o=>o.supports)),distinctSections:new Set([r.summary,r.purpose,r.rationale,r.common_invitation,r.one_teacher_organization].map(t=>t.trim().toLowerCase())).size===5,distinctActions:r.opportunities.length===new Set(r.opportunities.map(o=>o.child_action.trim().toLowerCase())).size,noEmbeddedLabels:!r.opportunities.some(o=>/^\s*(qué observar|evidencia esperada|competencias)\s*:/i.test(o.observation))}));
  assert.ok(checks.every(c=>c.allAgesTwoCompetencies&&c.editorialFields&&c.distinctSections&&c.distinctActions&&c.noEmbeddedLabels));
 }else checks={criteriaFamilies:result.proposal.criteriaFamilies.map(f=>({id:f.competency_id,ages:f.variants.map(v=>v.curricular_age)})),distinctMoments:new Set(Object.values(result.proposal.commonSequence)).size===3,
  projectPlanning:Boolean(result.projectPlanning?.meaningfulSituation),projectDiffersFromFirstActivity:JSON.stringify(result.projectPlanning?.commonSequence)!==JSON.stringify(result.proposal.commonSequence)};
 assert.equal((await db.query('select count(*)::int n from annual_plans where classroom_id=$1',[c.classroomId])).rows[0].n,0);
 status='passed';
}finally{
 const usage=(await db.query('select workflow,model,input_tokens,output_tokens,cost_usd from ai_usage_events where teacher_id=$1',[teacher])).rows;
 await writeFile(`${directory}/receipt.json`,JSON.stringify({status,calls,mode,promptVersion:DOCUMENT_GENERATOR_PROMPT_VERSION,syntheticOnly:true,userStoreUntouched:true,checks,usage},null,2));
 await db.close();process.stdout.write(JSON.stringify({status,calls,mode,directory,checks})+'\n');
}
