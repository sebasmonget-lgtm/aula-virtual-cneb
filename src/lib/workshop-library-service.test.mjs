import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {createPilotClassroom} from './pilot-onboarding-service.mjs';
import {workshopCatalog,workshopActivityDetails,rankWorkshopCatalog} from './workshop-catalog.mjs';
import {loadWorkshopLibrary,scheduleLibraryWorkshop} from './workshop-library-service.mjs';
import {loadSavedDocument} from './document-library-service.mjs';
import {saveOrdinaryObservation} from './ordinary-observation-service.mjs';
import {loadKnowledgeBaseV4} from './knowledge-base-v4.mjs';
import {activityPedagogicalBlocks} from './pedagogical-blocks.mjs';
import {renderSavedDocumentWord} from './document-word-export.mjs';
import JSZip from 'jszip';
import {handleWorkshopLibrary} from '../../scripts/workshop-library-routes.mjs';
import {startActivityToday} from './activity-today-execution.mjs';
import {loadLibraryResources} from '../../scripts/library-resources.mjs';

test('24 talleres: edades curriculares, guía docente, criterio observable y recursos concretos',async()=>{
  const kb=await loadKnowledgeBaseV4();assert.equal(workshopCatalog.length,24);
  const files=await loadLibraryResources();
  assert.equal(new Set(workshopCatalog.map(w=>w.id)).size,24);
  for(const w of workshopCatalog){
    assert.ok(kb.competencyCards.find(c=>c.id===w.competency_id)?.ages[String(w.age)]);
    for(const field of ['purpose','criterion','evidence','preparation'])assert.ok(w[field]?.length>25,`${w.id}:${field}`);
    assert.ok(w.materials.length>1);assert.doesNotMatch(w.materials.join(' '),/por definir|supports|por seleccionar/i);
    for(const key of ['opening','development','closure'])for(const field of ['teacher','children'])assert.ok(w[key][field]?.length>20,`${w.id}:${key}:${field}`);
    const blocks=activityPedagogicalBlocks(workshopActivityDetails(w),[],[{id:'criterion',competency_v4_id:w.competency_id,criterion_text:w.criterion}]);
    assert.equal(blocks.length,3);assert.equal(blocks[1].observations[0].competency_id,w.competency_id);
    assert.equal(blocks[1].expected_actions,w.development.children);
    for(const resource of w.resources){
      const file=resource.url.startsWith('/workshops/')?new URL('../../public'+resource.url,import.meta.url):
        files.find(f=>resource.url===`/api/library/resources/${f.id}/download`)?.download.path;
      assert.ok(file,resource.url);const bytes=await readFile(file);assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    }
  }
});

test('los 24 talleres se publican con sus momentos y criterio propios en las tres edades',async()=>{
  const db=new PGlite();try{
    for(const file of (await readdir(new URL('../../local-db/migrations/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort())
      await db.exec(await readFile(new URL('../../local-db/migrations/'+file,import.meta.url),'utf8'));
    const dates=['2026-10-19','2026-10-20','2026-10-21','2026-10-22','2026-10-23','2026-10-26','2026-10-27','2026-10-28'];
    for(const age of [3,4,5]){
      const teacherId=randomUUID(),c=await createPilotClassroom(db,teacherId,{teacherName:'QA',institutionName:'QA',section:'QA '+age,age,year:2026,startsOn:'2026-03-02',endsOn:'2026-12-31'});
      for(const [index,w]of workshopCatalog.filter(w=>w.age===age).entries()){
        const saved=await scheduleLibraryWorkshop(db,{teacherId,classroomId:c.classroomId,workshopId:w.id,occursOn:dates[index],clientRequestId:randomUUID(),today:'2026-10-15'});
        const doc=await loadSavedDocument(db,teacherId,'activity',saved.id);
        assert.equal(doc.guide.pedagogical_blocks.length,3,w.id);
        assert.equal(doc.guide.criteria[0].competency_v4_id,w.competency_id,w.id);
        assert.equal(doc.content.evaluation_criterion,w.criterion,w.id);
        assert.equal(doc.guide.pedagogical_blocks[1].expected_actions,w.development.children,w.id);
        assert.equal(doc.content.teacher_preparation,w.preparation,w.id);
      }
    }
    assert.equal((await db.query("select count(*)::int as n from activities where details ? 'workshop_catalog'")).rows[0].n,24);
  }finally{await db.close();}
});

test('recomendación separa actividad desarrollada de observaciones y no interpreta niveles',()=>{
  const catalog=[{title:'A',competency_id:'a'},{title:'B',competency_id:'b'},{title:'C',competency_id:'c'}];
  const ranked=rankWorkshopCatalog(catalog,{a:{developed:2,observed_students:0},b:{developed:0,observed_students:3},c:{developed:0,observed_students:0}});
  assert.deepEqual(ranked.map(w=>w.title),['C','B','A']);
});

test('seleccionar sin proyecto: propiedad, edad, calendario, replay, guía, observación y documento existentes',async()=>{
  const db=new PGlite(),teacherId=randomUUID();
  try{
    for(const file of (await readdir(new URL('../../local-db/migrations/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort())
      await db.exec(await readFile(new URL('../../local-db/migrations/'+file,import.meta.url),'utf8'));
    const c=await createPilotClassroom(db,teacherId,{teacherName:'Docente ficticia',institutionName:'QA',section:'QA',age:4,year:2026,startsOn:'2026-03-02',endsOn:'2026-12-31'});
    const w=workshopCatalog.find(w=>w.age===4&&w.type==='Ciencia');
    const input={teacherId,classroomId:c.classroomId,workshopId:w.id,occursOn:'2026-10-19',clientRequestId:randomUUID(),today:'2026-10-15'};
    await assert.rejects(scheduleLibraryWorkshop(db,{...input,teacherId:randomUUID()}),/aula/);
    await assert.rejects(scheduleLibraryWorkshop(db,{...input,workshopId:workshopCatalog.find(w=>w.age===3).id}),/edad/);
    for(const date of ['2026-10-14','2026-10-17','2026-11-01','2026-10-08','2027-03-16'])
      await assert.rejects(scheduleLibraryWorkshop(db,{...input,occursOn:date}),/día|clases/);
    const saved=await scheduleLibraryWorkshop(db,input);assert.ok(saved.id);
    assert.equal((await scheduleLibraryWorkshop(db,input)).id,saved.id);
    await assert.rejects(scheduleLibraryWorkshop(db,{...input,clientRequestId:randomUUID()}),/ya tiene/);
    await assert.rejects(scheduleLibraryWorkshop(db,{...input,occursOn:'2026-10-20'}),/otro taller/);
    const activity=(await db.query('select * from activities where id=$1',[saved.id])).rows[0];
    assert.equal(activity.linked_main_activity_id,null);assert.equal(activity.details.competency_id,'CYT_INDAGA');
    assert.equal((await db.query('select * from class_schedule_entries where activity_id=$1',[saved.id])).rows.length,1);
    const document=await loadSavedDocument(db,teacherId,'activity',saved.id);
    assert.ok(document, 'existing document reader');assert.equal(document.guide.pedagogical_blocks.length,3);
    assert.deepEqual(document.content.materials,w.materials);
    assert.equal(await loadSavedDocument(db,randomUUID(),'activity',saved.id),null);
    const criterion=(await db.query('select * from activity_criteria where activity_id=$1',[saved.id])).rows[0];
    const student=randomUUID();await db.query(`insert into students(id,classroom_id,first_name,last_name,status) values($1,$2,'Niña','Ficticia','active')`,[student,c.classroomId]);
    await saveOrdinaryObservation(db,teacherId,{studentId:student,clientRequestId:randomUUID(),sourceKind:'guided',activityId:saved.id,criterionId:criterion.id,momentId:'development',rawText:'Explica que la esponja retuvo agua.'},{occurredAt:new Date('2026-10-19T15:00:00Z')});
    const library=await loadWorkshopLibrary(db,{teacherId,classroomId:c.classroomId,today:'2026-10-15'});
    assert.equal(library.coverage.CYT_INDAGA.observed_students,1);
    assert.equal(library.coverage.CYT_INDAGA.developed,0,'planned/observed is not developed');
    assert.ok(library.available_dates.includes('2026-10-19'));assert.ok(!library.available_dates.includes('2026-10-17'));
    assert.equal(library.scheduled[0].id,saved.id);
    await startActivityToday(db,teacherId,saved.id,'2026-10-19');
    assert.equal((await loadWorkshopLibrary(db,{teacherId,classroomId:c.classroomId,today:'2026-10-19'})).coverage.CYT_INDAGA.developed,1);
    const doc=await loadSavedDocument(db,teacherId,'activity',saved.id);assert.equal(doc.registered_evidence.length,1);
    const kb=await loadKnowledgeBaseV4();
    const word=await renderSavedDocumentWord(doc,kb.competencyCards.map(card=>({...card,name:card.official_name})));
    const xml=await(await JSZip.loadAsync(word)).file('word/document.xml').async('string');
    for(const value of [w.title,w.criterion,w.development.teacher,'Explica que la esponja retuvo agua.'])assert.ok(xml.replace(/<[^>]+>/g,'').replace(/•/g,'').replace(/\s+/g,' ').includes(value),value);
    let result;
    await handleWorkshopLibrary({db,teacherId,request:{method:'POST'},url:new URL('http://localhost/api/workshop-library'),response:{},
      readJson:async()=>({...input,clientRequestId:randomUUID(),occursOn:'2026-04-06',today:'2026-03-01'}),send:(_r,status,data)=>{result={status,data};}});
    assert.equal(result.status,422,'client cannot override the server clock');
  }finally{await db.close();}
});
