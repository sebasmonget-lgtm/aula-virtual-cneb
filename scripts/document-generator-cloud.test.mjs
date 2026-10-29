import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import JSZip from 'jszip';
import {openMultiAgeLocalDb,assertMultiAgeLocalDb} from './multi-age-local-db.mjs';
import {createDocumentPlanningDatabase} from '../src/lib/document-planning-database.mjs';
import {chooseAyniProductMode,loadAyniProductMode} from '../src/lib/ayni-product-mode.mjs';
import {createPilotClassroom} from '../src/lib/pilot-onboarding-service.mjs';
import {multiAgeClassroomConfiguration} from '../src/lib/multi-age-local-service.mjs';
import {pilotSchoolYearDefaults} from '../src/lib/pilot-school-year-defaults.mjs';
import {importDocumentGeneratorStudents} from '../src/lib/document-generator-roster.mjs';
import {enqueueMultiAgeGeneration,loadMultiAgeGeneration,retryMultiAgeGeneration} from '../src/lib/multi-age-generation-jobs.mjs';
import {multiAgeProviderForJob} from './multi-age-ai-runtime.mjs';
import {saveDocumentProviderResponse} from '../src/lib/multi-age-generation-provider-state.mjs';
import {useDocumentGeneratorYear} from '../src/lib/document-generator-year.mjs';
import {multiAgeAnnualWorkspace} from '../src/lib/multi-age-annual.mjs';
import {startDocumentGeneratorProjectPreparation,readDocumentGeneratorProjectPreparation} from '../src/lib/document-generator-project-preparation.mjs';
import {loadDocumentGeneratorProjectExport} from '../src/lib/multi-age-document-service.mjs';
import {buildDocumentGeneratorProjectZip} from '../src/lib/document-generator-project-zip.mjs';
import {documentGeneratorCloudEnabled,documentCloudScope,documentCloudOperationAllowed,documentDispatchHeaders,acceptDocumentDispatch,drainDocumentCloud} from './document-generator-cloud.mjs';

const confirmation=()=>({clientRequestId:randomUUID(),teacherConfirmed:true});
test('cloud: desactivado por defecto y separado del laboratorio local',()=>{
 assert.equal(documentGeneratorCloudEnabled({}),false);
 for(const env of [{AYNI_AUTH_MODE:'local'},{AYNI_AUTH_MODE:'supabase',AYNI_DB_MODE:'local'},{AYNI_AUTH_MODE:'supabase',AYNI_MULTI_AGE_LOCAL:'1'}])assert.throws(()=>documentGeneratorCloudEnabled({...env,AYNI_DOCUMENT_GENERATOR_CLOUD:'1'}));
 assert.equal(documentGeneratorCloudEnabled({AYNI_DOCUMENT_GENERATOR_CLOUD:'1',AYNI_AUTH_MODE:'supabase',AYNI_DB_MODE:'postgres'}),true);
 assert.throws(()=>createDocumentPlanningDatabase({},{teacherId:randomUUID(),authMode:'local',role:'teacher',enabled:true}));
 assert.throws(()=>assertMultiAgeLocalDb({query(){}}));
 for(const route of ['/api/multi-age/observe','/api/multi-age/grade','/api/multi-age/diagnostic/review'])assert.equal(documentCloudOperationAllowed('POST',route),false);
 assert.equal(documentCloudOperationAllowed('POST','/api/multi-age/generation'),true);
});

for(const ages of [[4],[3,4,5]])test(`RLS cloud ${ages.join('/')}: alta, año, proyecto, actividades y ZIP aislados`,{timeout:120000},async()=>{
 const base=await openMultiAgeLocalDb({schema:'supabase'}),a=randomUUID(),b=randomUUID(),daily=randomUUID();
 try{
  for(const teacher of [a,b,daily]){await base.query('insert into auth.users(id) values($1)',[teacher]);await base.query("insert into profiles(user_id,display_name) values($1,'Docente ficticia cloud')",[teacher]);}
  await chooseAyniProductMode(base,a,{mode:'documents'});await chooseAyniProductMode(base,b,{mode:'documents'});await chooseAyniProductMode(base,daily,{mode:'daily'});
  const scoped=documentCloudScope(base,a),other=documentCloudScope(base,b);
  const originalPreferences=(await base.query('select preferences from profiles where user_id=$1',[daily])).rows[0];
  const {startsOn,endsOn}=pilotSchoolYearDefaults(2026),input={teacherName:'Docente ficticia cloud',institutionName:'Jardín de prueba cloud',section:'LILA QA',age:ages[0],year:2026,startsOn,endsOn,ages,calendarPolicy:'national-2026',...confirmation()};
  const saved=await createPilotClassroom(scoped,a,input,{multiAge:multiAgeClassroomConfiguration(input,{allowSingleAge:true})});
  const room=saved.classroomId;
  await importDocumentGeneratorStudents(scoped,a,{...confirmation(),classroomId:room,expectedRevision:1,age:ages[0],students:[{firstName:'Niña',lastName:'Ficticia'}]});
  for(const age of ages.slice(1))await importDocumentGeneratorStudents(scoped,a,{...confirmation(),classroomId:room,expectedRevision:1,age,students:[{firstName:'Niño '+age,lastName:'Ficticio'}]});
  assert.equal((await scoped.query('select id from classrooms')).rows.length,1);
  assert.equal((await other.query('select id from classrooms where id=$1',[room])).rows.length,0);
  assert.equal((await other.query('update classrooms set section=$2 where id=$1 returning id',[room,'No autorizado'])).rows.length,0);
  assert.equal((await loadAyniProductMode(scoped,b)).mode,null);
  const job=await enqueueMultiAgeGeneration(scoped,a,{kind:'annual',classroomId:room},{mode:'openai'});
  const lease=randomUUID();
  await scoped.query("update multi_age_generation_jobs set status='running',lease_token=$2,lease_until=now()+interval '60 seconds' where id=$1",[job.id,lease]);
  await saveDocumentProviderResponse(scoped,{id:job.id,teacher_id:a,lease_token:lease},'resp_cloud_fictive');
  assert.equal((await other.query('select job_id from multi_age_generation_provider_state')).rows.length,0);
  await scoped.query("update multi_age_generation_jobs set status='failed',error_code='provider_failed',lease_token=null,lease_until=null where id=$1",[job.id]);
  await retryMultiAgeGeneration(scoped,a,job.id,{mode:'openai'});
  assert.equal((await scoped.query('select job_id from multi_age_generation_provider_state')).rows.length,0);
  const fixture=multiAgeProviderForJob(scoped,{AYNI_MULTI_AGE_AI_MODE:'fixture'});
  const providerForJob=j=>fixture({...j,provider_mode:'fixture'});
  await drainDocumentCloud({db:scoped,teacherId:a,providerForJob,continueWork:async()=>{throw new Error('La prueba no necesita continuación');},budgetMs:60000});
  assert.equal((await loadMultiAgeGeneration(scoped,a,job.id)).status,'ready');
  await useDocumentGeneratorYear(scoped,a,{...confirmation(),classroomId:room,generationJobId:job.id});
  // Match node-postgres BIGINT decoding at the workspace response boundary.
  const query=scoped.query;scoped.query=async(sql,params)=>{const result=await query(sql,params);if(/select \* from annual_plans/iu.test(sql))return {...result,rows:result.rows.map(row=>({...row,revision:String(row.revision)}))};return result;};
  const planning=await multiAgeAnnualWorkspace(scoped,a,room),plan=planning.plans.find(p=>p.status==='active'),slot=planning.calendar.projects[0];
  scoped.query=query;
  assert.equal(typeof plan.revision,'number');
  const projectInput={...confirmation(),classroomId:room,annualPlanId:plan.id,annualSlotId:slot.slot_id,selectedDates:slot.instructional_dates.slice(0,2)};
  for(const invalid of [plan.revision+1,true,[plan.revision],null,'2.0'])await assert.rejects(()=>startDocumentGeneratorProjectPreparation(scoped,a,{...projectInput,expectedPlanRevision:invalid},{mode:'openai'}),/Mi año cambió/u);
  await startDocumentGeneratorProjectPreparation(scoped,a,{...projectInput,expectedPlanRevision:ages.length===1?String(plan.revision):plan.revision},{mode:'openai'});
  await drainDocumentCloud({db:scoped,teacherId:a,providerForJob,continueWork:async()=>{throw new Error('La prueba no necesita continuación');},budgetMs:60000});
  const prepared=await readDocumentGeneratorProjectPreparation(scoped,a,{classroomId:room,annualPlanId:plan.id,annualSlotId:slot.slot_id});
  assert.equal(prepared.status,'succeeded');assert.equal(prepared.completed,2);
  const bundleSource=await loadDocumentGeneratorProjectExport(scoped,a,prepared.project_id);
  const result=await buildDocumentGeneratorProjectZip(scoped,a,prepared.project_id);
  assert.ok(bundleSource);const zip=await JSZip.loadAsync(result.bytes??result.buffer??result);
  assert.equal(Object.values(zip.files).filter(f=>!f.dir).length,3);
  await assert.rejects(()=>loadDocumentGeneratorProjectExport(other,b,prepared.project_id));
  // The role and teacher are local to each transaction, including explicit BEGIN.
  assert.notEqual((await base.query('select current_user as name')).rows[0].name,'ayni_document_server');
  assert.deepEqual((await base.query('select preferences from profiles where user_id=$1',[daily])).rows[0],originalPreferences);
  await assert.rejects(()=>chooseAyniProductMode(base,a,{mode:'daily'}));
  await assert.rejects(()=>scoped.query('update profiles set preferences=$2::jsonb where user_id=$1',[a,JSON.stringify({ayni_product_mode:'daily'})]));
  // Browsers cannot assume the server role or read private provider response IDs.
  await assert.rejects(()=>base.transaction(async tx=>{await tx.query('set local session authorization authenticated');await tx.query('set local role ayni_document_server');}),e=>e.code==='42501');
  await assert.rejects(()=>base.transaction(async tx=>{await tx.query('set local session authorization authenticated');await tx.query('select response_id from multi_age_generation_provider_state');}),e=>e.code==='42501');
 }finally{await base.close();}
});

test('la continuación firma la docente y rechaza cambio de identidad, caducidad y repetición',async()=>{
 const db=await openMultiAgeLocalDb({schema:'supabase'}),teacher=randomUUID(),other=randomUUID(),secret='test-only-document-dispatch-secret-123456789';
 try{
  await db.query('insert into auth.users(id) values($1)',[teacher]);await chooseAyniProductMode(db,teacher,{mode:'documents'});
  const headers=documentDispatchHeaders(secret,teacher);
  assert.equal(await acceptDocumentDispatch(db,{...headers,'x-ayni-document-teacher':other},secret),null);
  assert.equal(await acceptDocumentDispatch(db,headers,secret,Date.now()+180000),null);
  assert.equal(await acceptDocumentDispatch(db,headers,secret),teacher);
  assert.equal(await acceptDocumentDispatch(db,headers,secret),null);
 }finally{await db.close();}
});
