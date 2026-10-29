import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import JSZip from 'jszip';
import {PGlite} from '@electric-sql/pglite';
import {createPilotClassroom} from './pilot-onboarding-service.mjs';
import {prepareWordDownload} from './document-word-export.mjs';
import {prepareConfirmedDocumentArtifact,readConfirmedDocumentArtifact} from './document-artifact-service.mjs';
import {planningExportRoster} from './ayni-planning-export-roster.mjs';
import {loadKnowledgeBaseV4} from './knowledge-base-v4.mjs';

test('la descarga autorizada del original usa la guía común, conserva nombres y congela artefactos',{timeout:90000},async()=>{
 const db=new PGlite(),teacher=randomUUID(),foreign=randomUUID(),project=randomUUID(),activity=randomUUID(),child=randomUUID();
 try{
  const folder=new URL('../../local-db/migrations/',import.meta.url);
  for(const file of (await readdir(folder)).filter(n=>n.endsWith('.sql')).sort())await db.exec(await readFile(new URL(file,folder),'utf8'));
  const classroom=await createPilotClassroom(db,teacher,{teacherName:'Docente ficticia',institutionName:'Jardín de prueba',section:'LILA',age:4,year:2026,startsOn:'2026-03-01',endsOn:'2026-12-31',castellanoL2Applicable:false,religionApplicable:false});
  await db.query("insert into students(id,classroom_id,first_name,last_name,status) values($1,$2,'Ana','de prueba','active')",[child,classroom.classroomId]);
  await db.query("insert into learning_experiences(id,classroom_id,type,title,purpose,starts_on,ends_on,status,version,details,teacher_confirmed_at) values($1,$2,'project','Miramos las semillas','Explorar cambios','2026-04-13','2026-04-15','active',1,$3::jsonb,now())",[project,classroom.classroomId,JSON.stringify({starting_point:'Los niños encontraron semillas.',activity_route:[]})]);
  const details={document_template_version:'activity-unified-v1',competency_id:'COM_ORAL',meaningful_situation:'Muestra las semillas y escucha sus preguntas.',child_actions:'Los niños proponen qué desean averiguar.',mediation:'Pregunta qué mirar y anota sus propuestas.',closure_or_continuity:'Miren el plan y elijan por dónde comenzar.',purpose:'Proponer preguntas para observar semillas.',evaluation_criterion:'Comparte una pregunta sobre las semillas.',expected_evidence:'Una pregunta oral o un señalamiento acompañado de palabras.',official_performance_refs:['PCI2016.COM_ORAL.4.01'],child_decisions:'Eligen qué pregunta retomar.'};
  await db.query("insert into activities(id,experience_id,title,purpose,status,version,details,preparation,occurs_on,teacher_confirmed_at) values($1,$2,'Planificamos el proyecto con los niños','Proponer preguntas','active',1,$3::jsonb,$4::jsonb,'2026-04-13',now())",[activity,project,JSON.stringify(details),JSON.stringify({materials:['Semillas','Papel','Crayones']})]);
  const cards=(await loadKnowledgeBaseV4()).competencyCards.map(c=>({...c,name:c.official_name})),before=JSON.stringify((await db.query('select details,preparation from activities where id=$1',[activity])).rows);
  assert.equal(await prepareWordDownload(db,foreign,'activity',activity,cards),null);
  assert.deepEqual((await planningExportRoster(db,foreign,'activity',activity)).students,[]);
  const result=await prepareWordDownload(db,teacher,'activity',activity,cards),word=await JSZip.loadAsync(result.buffer),body=await word.file('word/document.xml').async('string');
  assert.equal(result.presentation,'ayni-planning-common-v2');for(const value of ['Ana de prueba','Qué harán los niños y cómo acompañarlos','Eligen qué pregunta retomar.'])assert.ok(body.includes(value),value);
  const cache=new Map(),storage={async read(key){if(!cache.has(key))throw new Error('No guardado');return cache.get(key);},async save(key,bytes){cache.set(key,bytes);return bytes;}};
  const first=await prepareConfirmedDocumentArtifact(db,storage,teacher,'activity',activity,{cards});
  const firstBytes=(await readConfirmedDocumentArtifact(db,storage,teacher,first.id)).bytes;
  assert.match(first.template_version,/ayni-planning-common-v2/);
  assert.equal((await prepareConfirmedDocumentArtifact(db,storage,teacher,'activity',activity,{cards})).id,first.id);
  await db.query("update students set first_name='Ana María' where id=$1",[child]);
  const next=await prepareConfirmedDocumentArtifact(db,storage,teacher,'activity',activity,{cards});
  assert.notEqual(next.id,first.id);assert.deepEqual((await readConfirmedDocumentArtifact(db,storage,teacher,first.id)).bytes,firstBytes);
  assert.equal(JSON.stringify((await db.query('select details,preparation from activities where id=$1',[activity])).rows),before);
 }finally{await db.close();}
});
