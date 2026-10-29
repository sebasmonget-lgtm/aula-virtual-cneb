import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import JSZip from 'jszip';
import { makeMultiAgeDocumentFixture } from '../../scripts/fixtures/multi-age-document-fixture.mjs';
import { addActivityDocumentFixture } from '../../scripts/fixtures/multi-age-activity-document-fixture.mjs';
import { loadMultiAgeDocument } from './multi-age-document-service.mjs';
import { renderMultiAgePlanningWord } from './multi-age-planning-word.mjs';

test('actividad Word: criterios propios 3/4/5, referentes de la versión confirmada y ninguna evidencia de niños',{timeout:90000},async t=>{
  const f=await makeMultiAgeDocumentFixture();try{
    const a=await addActivityDocumentFixture(f),document=await loadMultiAgeDocument(f.db,f.teacher,'activity',a.activityId);
    const zip=await JSZip.loadAsync(await renderMultiAgePlanningWord(document)),body=await zip.file('word/document.xml').async('string');
    assert.equal(document.kind,'activity');assert.deepEqual(document.identity.ages,[3,4,5]);assert.equal(document.content.position,1);
    assert.ok(body.includes(a.blueprint.title));assert.ok(body.includes('Inicio'));assert.ok(body.includes('Desarrollo'));assert.ok(body.includes('Cierre'));
    for(const age of [3,4,5]){
      assert.ok(body.includes(`${document.curriculumReference.find(r=>r.age===age).name} · ${age} años`));assert.ok(body.includes(`Criterio ficticio propio de ${age} años`));assert.ok(body.includes(`Posible actuación propia de ${age} años`));
      const reference=document.curriculumReference.find(r=>r.age===age);assert.equal(reference.official_performances.length,2);
      for(const p of reference.official_performances){assert.equal(p.age,age);assert.equal(p.competency_id,'COM_ORAL');assert.ok(body.includes(p.id));}
    }
    assert.doesNotMatch(body,/Registro ficticio|La familia del niño|Ana Ficticio|Bruno Ficticio|Clara Ficticio|undefined|\[object Object\]|\{\{/);
    const headers=await Promise.all(Object.keys(zip.files).filter(p=>/^word\/header\d+\.xml$/.test(p)).map(part=>zip.file(part).async('string')));
    assert.doesNotMatch(headers.join(''),/PLANIFICACIÓN ANUAL/);assert.match(headers.join(''),/ACTIVIDAD DE APRENDIZAJE/);
    await t.test('descargar es solo lectura y cambios posteriores no reemplazan la identidad confirmada',async()=>{
      const snapshot=async()=>Object.fromEntries(await Promise.all(['activities','learning_experiences','activity_criteria','ordinary_observations','competency_assessments','multi_age_generation_jobs'].map(async table=>[table,(await f.db.query(`select * from ${table} order by id`)).rows])));
      const before=await snapshot();assert.deepEqual(await loadMultiAgeDocument(f.db,f.teacher,'activity',a.activityId),document);assert.deepEqual(await snapshot(),before);
      await f.db.query("update profiles set display_name='Nombre posterior' where user_id=$1",[f.teacher]);
      await f.db.query("update classrooms set section='Otro nombre',institution_name='Otra institución',status='archived' where id=$1",[f.classroom.classroomId]);
      const historical=await loadMultiAgeDocument(f.db,f.teacher,'activity',a.activityId);assert.deepEqual(historical,document);
      const after=await JSZip.loadAsync(await renderMultiAgePlanningWord(historical));assert.equal(await after.file('word/document.xml').async('string'),body);
    });
    await t.test('otra docente, IDs inválidos y referentes alterados no pueden descargarse',async()=>{
      await assert.rejects(loadMultiAgeDocument(f.db,f.other,'activity',a.activityId),/no está disponible/);
      await assert.rejects(loadMultiAgeDocument(f.db,f.teacher,'activity',randomUUID()),/no está disponible/);
      await assert.rejects(loadMultiAgeDocument(f.db,f.teacher,'activity','inválido'),/no está disponible/);
      const criterion=(await f.db.query('select * from activity_criteria where activity_id=$1 order by curricular_age',[a.activityId])).rows[0];
      await assert.rejects(f.db.query("update activity_criteria set details=jsonb_set(details,'{official_performance_version}','\"otra-version\"') where id=$1",[criterion.id]),/inmutable/);
      assert.deepEqual(await loadMultiAgeDocument(f.db,f.teacher,'activity',a.activityId),document);
      const incompleteId=randomUUID();
      await f.db.query(`insert into activities(id,experience_id,title,purpose,occurs_on,status,details,teacher_confirmed_at)
        select $2,experience_id,title,purpose,occurs_on,status,jsonb_set(jsonb_set(details,'{activity_contract,project_fingerprint}','"alterado"'),'{activity_contract,position}','2'),now() from activities where id=$1`,[a.activityId,incompleteId]);
      await assert.rejects(loadMultiAgeDocument(f.db,f.teacher,'activity',incompleteId),/datos confirmados/);
    });
  }finally{await f.db.close();}
});

test('actividad Word: RLS impide a otra identidad leer incluso indicando el ID docente correcto',{timeout:90000},async()=>{
  const f=await makeMultiAgeDocumentFixture({schema:'supabase'});try{
    const a=await addActivityDocumentFixture(f);await f.db.exec('set role authenticated');
    await f.db.query("select set_config('request.jwt.claim.sub',$1,false)",[f.other]);
    await assert.rejects(loadMultiAgeDocument(f.db,f.teacher,'activity',a.activityId),/no está disponible/);
    await f.db.query("select set_config('request.jwt.claim.sub',$1,false)",[f.teacher]);
    assert.equal((await loadMultiAgeDocument(f.db,f.teacher,'activity',a.activityId)).content.title,a.blueprint.title);
    await f.db.exec('reset role');
  }finally{await f.db.close();}
});
