import http from 'node:http';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { openMultiAgeLocalDb } from './multi-age-local-db.mjs';
import { sampleMultiAgeBlueprint } from './fixtures/multi-age-local-fixture.mjs';
import { createMultiAgeClassroom,enrollMultiAgeStudent,confirmMultiAgeActivity,observeMultiAgeStudent,multiAgeAssessmentContext,
  confirmMultiAgeGrade,confirmMultiAgeConclusion,confirmMultiAgeFamilyReport,multiAgeFamilyDocument,multiAgeLocalWorkspace } from '../src/lib/multi-age-local-service.mjs';
import { renderFamilyReportWord } from '../src/lib/family-report-word.mjs';
import { loadKnowledgeBaseV4 } from '../src/lib/knowledge-base-v4.mjs';
import { httpStatusForError, publicErrorMessage } from '../src/lib/version-integrity.mjs';
import { recordMultiAgeDiagnosticObservation, confirmMultiAgeFamilyContext, confirmMultiAgeDiagnosticReview, multiAgeDiagnosticContext } from '../src/lib/multi-age-diagnostic.mjs';
import { multiAgeAnnualWorkspace, saveMultiAgeAnnualDraft, confirmMultiAgeAnnualPlan, MultiAgeAnnualCalendarError } from '../src/lib/multi-age-annual.mjs';
import { listMultiAgeDocuments, loadMultiAgeDocument } from '../src/lib/multi-age-document-service.mjs';
import { renderMultiAgePlanningWord } from '../src/lib/multi-age-planning-word.mjs';

/** Deliberately independent of .env, running app ports, cloud adapters and persistent local data. */
export async function startMultiAgeLocalServer({port=0}={}){
  const db=await openMultiAgeLocalDb(),teacher=randomUUID(),session=randomBytes(32).toString('hex');let classroomId=null,url;
  await db.query("insert into profiles(user_id,display_name) values($1,'Docente de prueba local')",[teacher]);
  const send=(res,status,value)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(value));};
  const server=http.createServer(async(req,res)=>{
    try{
      if(req.headers.host!==new URL(url).host){send(res,403,{error:'Destino local no permitido.'});return;}
      const target=new URL(req.url,url);
      res.setHeader('x-content-type-options','nosniff');res.setHeader('referrer-policy','no-referrer');
      res.setHeader('content-security-policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'");
      if(req.method==='GET'&&target.pathname==='/'){
        // A cross-site navigation may display the page but cannot silently mint a session for mutation.
        if(!req.headers['sec-fetch-site']||['none','same-origin'].includes(req.headers['sec-fetch-site']))res.setHeader('set-cookie',`ayni_multi_age_local=${session}; HttpOnly; SameSite=Strict; Path=/`);
        res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(await readFile(new URL('./multi-age-local.html',import.meta.url)));return;
      }
      if(req.method==='GET'&&['/ui.js','/ui.css'].includes(target.pathname)){
        res.writeHead(200,{'content-type':target.pathname.endsWith('.js')?'text/javascript; charset=utf-8':'text/css; charset=utf-8','cache-control':'no-store'});
        res.end(await readFile(new URL(target.pathname==='/ui.js'?'./multi-age-local-ui.js':'./multi-age-local.css',import.meta.url)));return;
      }
      const cookie=req.headers.cookie?.split(';').map(p=>p.trim()).find(p=>p.startsWith('ayni_multi_age_local='))?.slice('ayni_multi_age_local='.length)??'';
      if(cookie.length!==session.length||!timingSafeEqual(Buffer.from(cookie),Buffer.from(session))){send(res,403,{error:'Abre la página local para comenzar la prueba.'});return;}
      if(req.method==='GET'&&target.pathname==='/api/state'){
        const workspace=classroomId?await multiAgeLocalWorkspace(db,teacher,classroomId):null;let planning=null,planningUnavailable=null;
        if(classroomId)try{planning=await multiAgeAnnualWorkspace(db,teacher,classroomId);}catch(error){if(!(error instanceof MultiAgeAnnualCalendarError))throw error;planningUnavailable=error.message;}
        send(res,200,{workspace,planning,planningUnavailable,documents:classroomId?await listMultiAgeDocuments(db,teacher,{classroomId}):[],blueprint:sampleMultiAgeBlueprint()});return;
      }
      if(req.method==='GET'&&target.pathname==='/api/documents'){send(res,200,{documents:await listMultiAgeDocuments(db,teacher)});return;}
      const documentRoute=/^\/api\/documents\/(annual_plan|diagnostic_student_review|diagnostic_group_review|project|activity)\/([0-9a-f-]+)\.docx$/.exec(target.pathname);
      if(req.method==='GET'&&documentRoute){
        const document=await loadMultiAgeDocument(db,teacher,documentRoute[1],documentRoute[2]),bytes=await renderMultiAgePlanningWord(document);
        res.writeHead(200,{'content-type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','content-disposition':`attachment; filename="${document.kind==='annual_plan'?'mi-ano-multiedad':'diagnostico-individual'}-v${document.version}.docx"`,'cache-control':'no-store'});res.end(bytes);return;
      }
      if(req.method==='GET'&&target.pathname==='/api/diagnostic/context'){
        const data=await multiAgeDiagnosticContext(db,teacher,target.searchParams.get('studentId'));
        send(res,200,{context:data.context,sourceFingerprint:data.sourceFingerprint});return;
      }
      if(req.method==='GET'&&target.pathname==='/api/context'){
        send(res,200,await multiAgeAssessmentContext(db,teacher,{studentId:target.searchParams.get('studentId'),competencyId:target.searchParams.get('competencyId'),periodId:target.searchParams.get('periodId')}));return;
      }
      if(req.method==='GET'&&/^\/api\/reports\/[0-9a-f-]+\.docx$/.test(target.pathname)){
        const id=target.pathname.split('/').at(-1).replace('.docx',''),doc=await multiAgeFamilyDocument(db,teacher,id),kb=await loadKnowledgeBaseV4();
        const bytes=await renderFamilyReportWord(doc,kb.competencyCards);
        res.writeHead(200,{'content-type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','content-disposition':'attachment; filename="informe-local.docx"','cache-control':'no-store'});res.end(bytes);return;
      }
      if(req.method!=='POST'){send(res,404,{error:'Ruta local no disponible.'});return;}
      if(req.headers.origin!==url||!String(req.headers['content-type']??'').startsWith('application/json')){send(res,403,{error:'La operación debe iniciarse desde esta página local.'});return;}
      const chunks=[],limit=target.pathname==='/api/annual/draft'?2*1024*1024:65536;let size=0;
      for await(const part of req){size+=part.length;if(size>limit){send(res,413,{error:'La solicitud excede el tamaño permitido.'});return;}chunks.push(part);}
      let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{send(res,400,{error:'La solicitud no contiene JSON válido.'});return;}
      if(!input||typeof input!=='object'||Array.isArray(input)){send(res,400,{error:'Solicitud inválida.'});return;}
      const operations={'/api/classroom':createMultiAgeClassroom,'/api/enroll':enrollMultiAgeStudent,'/api/activity':confirmMultiAgeActivity,
        '/api/observe':observeMultiAgeStudent,'/api/grade':confirmMultiAgeGrade,'/api/conclusion':confirmMultiAgeConclusion,'/api/family':confirmMultiAgeFamilyReport,
        '/api/diagnostic/observe':recordMultiAgeDiagnosticObservation,'/api/diagnostic/family':confirmMultiAgeFamilyContext,'/api/diagnostic/review':confirmMultiAgeDiagnosticReview,
        '/api/annual/draft':saveMultiAgeAnnualDraft,'/api/annual/confirm':confirmMultiAgeAnnualPlan};
      const operation=operations[target.pathname];if(!operation){send(res,404,{error:'Ruta local no disponible.'});return;}
      const result=await operation(db,teacher,input);if(target.pathname==='/api/classroom')classroomId=result.classroomId;
      send(res,200,result);
    }catch(error){send(res,httpStatusForError(error),{error:publicErrorMessage(error)});}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  url=`http://127.0.0.1:${server.address().port}`;
  return {url,close:async()=>{await new Promise(resolve=>server.close(resolve));await db.close();}};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  const instance=await startMultiAgeLocalServer();
  process.stdout.write(`Prueba multiedad local y temporal: ${instance.url}\n`);
  let stopping=false;const stop=async()=>{if(stopping)return;stopping=true;await instance.close();process.exit(0);};
  process.on('SIGINT',stop);process.on('SIGTERM',stop);
}
