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
import {workshopAges,workshopForAge,workshopAgeLabel} from './workshop-ages.mjs';

test('100 talleres, 246 adaptaciones: edades curriculares, guía docente, criterio y recursos concretos',async()=>{
  const kb=await loadKnowledgeBaseV4();assert.equal(workshopCatalog.length,100);
  const files=await loadLibraryResources();
  assert.equal(new Set(workshopCatalog.map(w=>w.id)).size,100);
  assert.equal(new Set(workshopCatalog.map(w=>w.title)).size,100,'100 propuestas distintas, no variantes contadas como talleres');
  const variants=workshopCatalog.flatMap(w=>workshopAges(w).map(age=>workshopForAge(w,age)));
  assert.equal(variants.length,246);
  for(const w of variants){
    const card=kb.competencyCards.find(c=>c.id===w.competency_id);
    assert.ok(card?.ages[String(w.age)]);
    assert.equal(card.runtime_selectable_by_age[String(w.age)],true,`${w.id}:${w.age}`);
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

test('las 246 variantes se publican con adaptación y criterio propios en las tres edades',async()=>{
  const db=new PGlite(),exported=new Set(),kb=await loadKnowledgeBaseV4();try{
    for(const file of (await readdir(new URL('../../local-db/migrations/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort())
      await db.exec(await readFile(new URL('../../local-db/migrations/'+file,import.meta.url),'utf8'));
    for(const age of [3,4,5]){
      const teacherId=randomUUID(),c=await createPilotClassroom(db,teacherId,{teacherName:'QA',institutionName:'QA',section:'QA '+age,age,year:2026,startsOn:'2026-03-02',endsOn:'2026-12-31'});
      const library=await loadWorkshopLibrary(db,{teacherId,classroomId:c.classroomId,today:'2026-03-16'});
      const dates=library.available_dates;
      const variants=workshopCatalog.map(w=>workshopForAge(w,age)).filter(Boolean);
      assert.equal(variants.length,age===3?78:84);
      assert.equal(library.workshops.length,variants.length);
      assert.ok(library.workshops.every(w=>workshopAges(w).includes(age)));
      assert.ok(library.workshops.some(w=>workshopAges(w).length>1),'Las propuestas multiedad compatibles también se pueden elegir.');
      assert.ok(dates.length>=variants.length,'Cada selección se prueba en un día lectivo diferente.');
      for(const [index,w]of variants.entries()){
        const saved=await scheduleLibraryWorkshop(db,{teacherId,classroomId:c.classroomId,workshopId:w.id,occursOn:dates[index],clientRequestId:randomUUID(),today:'2026-03-16'});
        const doc=await loadSavedDocument(db,teacherId,'activity',saved.id);
        assert.equal(doc.guide.pedagogical_blocks.length,3,w.id);
        assert.equal(doc.guide.criteria[0].competency_v4_id,w.competency_id,w.id);
        assert.equal(doc.content.evaluation_criterion,w.criterion,w.id);
        assert.equal(doc.guide.pedagogical_blocks[1].expected_actions,w.development.children,w.id);
        assert.equal(doc.content.teacher_preparation,w.preparation,w.id);
        assert.equal(doc.content.workshop_catalog.id,w.id,"La consulta conserva el enlace al paquete PDF del taller.");
        if(age===5&&w.id.startsWith('taller-biblioteca-')&&!exported.has(w.competency_id)){
          const word=await renderSavedDocumentWord(doc,kb.competencyCards.map(c=>({...c,name:c.official_name})));
          const xml=await(await JSZip.loadAsync(word)).file('word/document.xml').async('string');
          const text=xml.replace(/<[^>]+>/g,'').replace(/•/g,'').replace(/\s+/g,' ');
          for(const value of [w.title,w.criterion,w.development.teacher])assert.ok(text.includes(value),`${w.id}: Word ${value}`);
          exported.add(w.competency_id);
        }
        const snapshot=(await db.query('select details from activities where id=$1',[saved.id])).rows[0].details;
        assert.equal(snapshot.workshop_catalog.age,age);
        assert.equal(snapshot.workshop_catalog.id,w.id);
        assert.equal(snapshot.workshop_catalog.version,'1.3.0');
        assert.equal((await scheduleLibraryWorkshop(db,{teacherId,classroomId:c.classroomId,workshopId:w.id,occursOn:dates[index],clientRequestId:
          (await db.query('select generation_metadata from activities where id=$1',[saved.id])).rows[0].generation_metadata.client_request_id,today:'2026-03-16'})).id,saved.id);
      }
      if(age===3)await assert.rejects(scheduleLibraryWorkshop(db,{teacherId,classroomId:c.classroomId,
        workshopId:'taller-compartido-mensajes-que-llegan',occursOn:dates[20],clientRequestId:randomUUID(),today:'2026-03-16'}),/edad/);
    }
    assert.equal((await db.query("select count(*)::int as n from activities where details ? 'workshop_catalog'")).rows[0].n,246);
    assert.equal(exported.size,10,'Un Word completo de las nuevas propuestas por cada competencia cubierta.');
  }finally{await db.close();}
});

test('el repertorio cubre áreas variadas y no duplica una guía para completar cien',async()=>{
  const kb=await loadKnowledgeBaseV4(),areas=new Set(),counts={};
  for(const w of workshopCatalog){
    const card=kb.competencyCards.find(c=>c.id===w.competency_id);
    areas.add(card.area_id);counts[w.competency_id]=(counts[w.competency_id]??0)+1;
  }
  assert.equal(areas.size,5);assert.equal(Object.keys(counts).length,10);
  assert.ok(counts.PSICO_MOTRICIDAD>=12);assert.ok(counts.COM_ARTE>=16);assert.ok(counts.COM_LECTURA>=10);
  const authored=workshopCatalog.filter(w=>w.id.startsWith('taller-biblioteca-'));
  assert.equal(authored.length,64);
  for(const age of [3,4,5]){
    const variants=authored.map(w=>workshopForAge(w,age)).filter(Boolean);
    const actions=variants.map(w=>`${w.development.teacher}|${w.development.children}`.toLowerCase().replace(/\s+/g,' '));
    assert.equal(new Set(actions).size,variants.length,'Cada taller tiene acciones/mediación propias.');
  }
});

test('taller compartido adapta el reto y el criterio sin duplicar tarjeta ni inventar edades',()=>{
  const w=workshopCatalog.find(w=>w.id==='taller-compartido-rampas-y-ruedas');
  const variants=[3,4,5].map(age=>workshopForAge(w,age));
  assert.equal(new Set(variants.map(v=>v.id)).size,1);
  assert.equal(new Set(variants.map(v=>v.criterion)).size,3);
  assert.equal(new Set(variants.map(v=>v.development.teacher)).size,3);
  assert.deepEqual(variants.map(v=>v.duration_minutes),[25,30,35]);
  assert.equal(workshopAgeLabel(w),'3, 4 y 5 años');
  assert.equal(workshopForAge(w,2),null);
  assert.equal(workshopForAge({...w,adaptations:{}},4),null);
  assert.equal(workshopForAge(workshopCatalog.find(w=>w.competency_id==='COM_ESCRITURA'),3),null);
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
