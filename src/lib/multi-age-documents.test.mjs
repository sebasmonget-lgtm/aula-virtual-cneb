import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import JSZip from 'jszip';
import { makeMultiAgeDocumentFixture,documentFixtureRequest as request } from '../../scripts/fixtures/multi-age-document-fixture.mjs';
import { listMultiAgeDocuments,loadMultiAgeDocument } from './multi-age-document-service.mjs';
import { multiAgePlanningDocumentSections,renderMultiAgePlanningWord } from './multi-age-planning-word.mjs';
import { confirmMultiAgeFamilyContext,confirmMultiAgeDiagnosticReview,multiAgeDiagnosticContext } from './multi-age-diagnostic.mjs';
import { multiAgeAnnualContext,saveMultiAgeAnnualDraft,confirmMultiAgeAnnualPlan } from './multi-age-annual.mjs';
const xml=async bytes=>(await JSZip.loadAsync(bytes)).file('word/document.xml').async('string');

test('Word multiedad: tres diagnósticos, quince tramos, referentes propios y fuentes literales',{timeout:90000},async t=>{
  const f=await makeMultiAgeDocumentFixture();try{
    const library=await listMultiAgeDocuments(f.db,f.teacher);assert.equal(library.length,4);assert.ok(library.every(d=>d.exportReady));assert.equal((await listMultiAgeDocuments(f.db,f.other)).length,0);
    const annual=await loadMultiAgeDocument(f.db,f.teacher,'annual_plan',f.plan.planId),annualXml=await xml(await renderMultiAgePlanningWord(annual));
    await t.test('el año conserva calendario y oportunidades; no hay edad escalar de aula',()=>{
      assert.equal(annual.identity.ages.length,3);assert.equal(annual.identity.school_year,2026);assert.equal(annual.calendar.projects.length,15);
      for(const age of [3,4,5])assert.ok(annualXml.includes(`${age} años`));
      for(const proposal of annual.content.proposals)assert.ok(annualXml.includes(proposal.title),'Conservar los títulos guardados sin depender del prefijo visual del renderizador.');
      const frozenReferences=JSON.stringify(annual.curriculumReference);
      for(const age of [3,4,5])assert.ok(frozenReferences.includes(`PCI2016.COM_ORAL.${age}.01`),'Los referentes por edad permanecen en la fuente congelada.');
      for(const name of new Set(annual.curriculumReference.map(r=>r.name)))assert.ok(annualXml.includes(name),'El Word anual identifica las competencias oficiales.');
      assert.doesNotMatch(annualXml,/\{\{|\[object Object\]|undefined/);
      const writing=annual.curriculumReference.find(c=>c.age===3&&c.competency_id==='COM_ESCRITURA');assert.equal(writing.official_performances.length,0);assert.ok(writing.cycle_standard_ai);
    });
    await t.test('cada diagnóstico conserva la actuación, familia y lectura de su niño',async()=>{
      for(const child of f.children){const document=await loadMultiAgeDocument(f.db,f.teacher,'diagnostic_student_review',child.reviewId),body=await xml(await renderMultiAgePlanningWord(document));
        assert.equal(document.curriculumSnapshot.age,child.age);assert.ok(body.includes(`Registro ficticio de ${child.age} años`));assert.ok(body.includes(`La familia del niño ficticio de ${child.age} años`));assert.ok(body.includes(`situación ficticia de ${child.age} años expresó una elección`));
        for(const age of [3,4,5].filter(age=>age!==child.age))assert.ok(!body.includes(`Registro ficticio de ${age} años`));
        assert.ok(document.content.pendingCompetencyIds.length>0);assert.match(body,/Información que falta recoger/);assert.doesNotMatch(body,/undefined|\{\{|\[object Object\]/);
        const zip=await JSZip.loadAsync(await renderMultiAgePlanningWord(document)),styles=await zip.file('word/styles.xml').async('string'),titleStyle=[...styles.matchAll(/<w:style\b[^>]*>[\s\S]*?<\/w:style>/g)].find(m=>/<w:name\b[^>]*w:val="Title"/.test(m[0]))?.[0];
        assert.ok(titleStyle);assert.doesNotMatch(titleStyle,/<w:pBdr/);for(const part of Object.keys(zip.files).filter(p=>/^word\/header\d+\.xml$/.test(p))){const header=await zip.file(part).async('string');assert.doesNotMatch(header,/PLANIFICACIÓN ANUAL/);}
        const styleIds=new Set([...styles.matchAll(/w:styleId="([^"]+)"/g)].map(m=>m[1]));for(const style of body.matchAll(/<w:pStyle w:val="([^"]+)"/g))assert.ok(styleIds.has(style[1]),`Estilo no definido: ${style[1]}`);
        await assert.rejects(loadMultiAgeDocument(f.db,f.other,'diagnostic_student_review',child.reviewId),/no está disponible/);
      }
    });
    await t.test('fecha de confirmación respeta Lima y no cambia la fecha civil del calendario',()=>{
      const copy=structuredClone(annual);copy.confirmedAt='2026-10-23T01:00:00Z';const sections=multiAgePlanningDocumentSections(copy);assert.ok(JSON.stringify(sections).includes('22/10/2026'));assert.ok(JSON.stringify(sections).includes('30/03/2026'));
    });
    await t.test('versiones nuevas, cambios de nombre y datos posteriores no reescriben la descarga anterior',async()=>{
      const old=await loadMultiAgeDocument(f.db,f.teacher,'diagnostic_student_review',f.children[0].reviewId),oldXml=await xml(await renderMultiAgePlanningWord(old));
      await f.db.query("update profiles set display_name='Nombre docente posterior' where user_id=$1",[f.teacher]);await f.db.query("update students set first_name='Nombre posterior' where id=$1",[f.children[0].studentId]);
      const previousFamily=(await multiAgeDiagnosticContext(f.db,f.teacher,f.children[0].studentId)).sources.family;
      await confirmMultiAgeFamilyContext(f.db,f.teacher,{...request(),studentId:f.children[0].studentId,expectedAssignmentId:f.children[0].assignmentId,expectedInterviewId:previousFamily.id,reason:'Rectificar el relato familiar ficticio.',familyText:'Relato familiar nuevo que no pertenece al Word anterior.'});
      const current=await multiAgeDiagnosticContext(f.db,f.teacher,f.children[0].studentId),newReview=await confirmMultiAgeDiagnosticReview(f.db,f.teacher,{...request(),studentId:f.children[0].studentId,expectedReviewId:f.children[0].reviewId,reason:'Revisar las fuentes diagnósticas actualizadas.',sourceFingerprint:current.sourceFingerprint,pendingInformationAcknowledged:true,findings:[]});
      const after=await loadMultiAgeDocument(f.db,f.teacher,'diagnostic_student_review',f.children[0].reviewId);assert.deepEqual(after,old);assert.equal(await xml(await renderMultiAgePlanningWord(after)),oldXml);
      const newDoc=await loadMultiAgeDocument(f.db,f.teacher,'diagnostic_student_review',newReview.reviewId);assert.match(newDoc.identity.student_name,/Nombre posterior/);assert.match(newDoc.sourceSnapshot.family.details.family_text,/Relato familiar nuevo/);
      const context=await multiAgeAnnualContext(f.db,f.teacher,f.classroom.classroomId),draft=await saveMultiAgeAnnualDraft(f.db,f.teacher,{...request(),classroomId:f.classroom.classroomId,sourceFingerprint:context.sourceFingerprint,proposal:{...f.proposal,title:'Mi año actualizado ficticio'}});
      await assert.rejects(loadMultiAgeDocument(f.db,f.teacher,'annual_plan',draft.planId),/versión confirmada/);
      await confirmMultiAgeAnnualPlan(f.db,f.teacher,{...request(),classroomId:f.classroom.classroomId,planId:draft.planId,expectedRevision:draft.revision,reason:'Actualizar el año ficticio conservando su documento anterior.'});
      const historical=await loadMultiAgeDocument(f.db,f.teacher,'annual_plan',f.plan.planId);assert.equal(historical.status,'archived');assert.equal(historical.identity.teacher_name,'Profesora ficticia de prueba');assert.equal(await xml(await renderMultiAgePlanningWord(historical)),annualXml);
      const documents=await listMultiAgeDocuments(f.db,f.teacher);assert.equal(documents.length,6);assert.equal(documents[0].id,draft.planId);assert.equal(documents.find(d=>d.id===f.children[0].reviewId).historical,true);assert.equal(documents.find(d=>d.id===newReview.reviewId).historical,false);
    });
    await t.test('IDs inválidos y documentos V2 anteriores sin snapshot de exportación se rechazan',async()=>{
      await assert.rejects(loadMultiAgeDocument(f.db,f.teacher,'otro',randomUUID()),/no está disponible/);
      await assert.rejects(loadMultiAgeDocument(f.db,f.teacher,'annual_plan','inválido'),/no está disponible/);
      const old=await loadMultiAgeDocument(f.db,f.teacher,'diagnostic_student_review',f.children[1].reviewId),id=randomUUID();
      await f.db.query(`insert into diagnostic_student_reviews(id,classroom_id,student_id,version,status,details,source_snapshot,created_by,teacher_confirmed_at,curriculum_contract_version) values($1,$2,$3,99,'confirmed',$4::jsonb,'{}',$5,now(),2)`,[id,f.classroom.classroomId,f.children[1].studentId,JSON.stringify({curriculum_snapshot:old.curriculumSnapshot}),f.teacher]);
      assert.equal((await listMultiAgeDocuments(f.db,f.teacher)).find(d=>d.id===id).exportReady,false);await assert.rejects(loadMultiAgeDocument(f.db,f.teacher,'diagnostic_student_review',id),/nueva revisión/);
    });
  }finally{await f.db.close();}
});

test('biblioteca multiedad respeta RLS temporal y conserva consulta del aula archivada',{timeout:90000},async()=>{
  const f=await makeMultiAgeDocumentFixture({schema:'supabase'});try{
    await f.db.exec('set role authenticated');await f.db.query("select set_config('request.jwt.claim.sub',$1,false)",[f.other]);
    assert.equal((await listMultiAgeDocuments(f.db,f.teacher)).length,0);await assert.rejects(loadMultiAgeDocument(f.db,f.teacher,'annual_plan',f.plan.planId),/no está disponible/);
    await f.db.query("select set_config('request.jwt.claim.sub',$1,false)",[f.teacher]);assert.equal((await listMultiAgeDocuments(f.db,f.teacher)).length,4);await f.db.exec('reset role');
    await f.db.query("update classrooms set status='archived' where id=$1",[f.classroom.classroomId]);
    const documents=await listMultiAgeDocuments(f.db,f.teacher);assert.equal(documents.length,4);assert.ok(documents.every(d=>d.historical));const document=await loadMultiAgeDocument(f.db,f.teacher,'annual_plan',f.plan.planId);assert.equal(document.identity.section,'Semillas de prueba');
  }finally{await f.db.close();}
});
