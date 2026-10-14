import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createPilotClassroom,importStudentsForTeacher} from './pilot-onboarding-service.mjs';
import {defaultInitialStage} from './annual-plan-calendar.mjs';
import {generationFixture} from './test-fixtures/annual-journey.mjs';
import {handleAnnualJourneyRoutes} from '../../scripts/annual-journey-routes.mjs';
import {annualJourneyDocumentSections} from './annual-journey-word.mjs';
import {loadSavedDocument} from './document-library-service.mjs';
import {renderSavedDocumentWord} from './document-word-export.mjs';
import JSZip from 'jszip';

test('confirmar planificación conserva interpretaciones pendientes; revisión explícita y propiedad siguen vigentes',async()=>{
  const db=new PGlite();try{
    for(const file of(await readdir(new URL('../../local-db/migrations/',import.meta.url))).filter(file=>file.endsWith('.sql')).sort())await db.exec(await readFile(new URL('../../local-db/migrations/'+file,import.meta.url),'utf8'));
    const teacher=randomUUID(),created=await createPilotClassroom(db,teacher,{teacherName:'QA',institutionName:'QA',section:'QA',age:5,year:2026,startsOn:'2026-03-02',endsOn:'2026-12-31'});
    await importStudentsForTeacher(db,teacher,[{firstName:'Alumno',lastName:'Ficticio QA'}]);const student=(await db.query("select id from students where classroom_id=$1 order by id limit 1",[created.classroomId])).rows[0].id;
    await db.query(`insert into diagnostic_spontaneous_observations(id,classroom_id,student_id,context_label,observation_text,created_by) values($1,$2,$3,'Exploración','Explicó por dónde pasó el agua en su canal.',$4)`,[randomUUID(),created.classroomId,student,teacher]);
    const context={id:created.classroomId,school_year_id:created.schoolYearId,curriculum_version_id:(await db.query('select id from curriculum_versions limit 1')).rows[0].id,year:2026,age:5,available_resources:[],calendar:{initial_stage:defaultInitialStage()}};
    let calls=0;
    const route=async(path,body,user=teacher)=>{let result;await handleAnnualJourneyRoutes({request:{method:body===undefined?'GET':'POST'},response:{},url:new URL('http://fixture/api/annual-journey/'+path),db,teacherId:user,annualPlanningContext:async()=>context,annualDocumentContext:()=>({teacher_name:'QA'}),readJson:async()=>body,send:(_r,status,data)=>{result={status,data};},createProvider:()=>({generate:async request=>{
      calls++;if(request.workflow==='annual_journey_review')return{output:{issues:[]}};
      const output=generationFixture(request.ai_context_bundle.curriculum.competency_cards),fact=request.ai_context_bundle.classroom.facts.find(f=>f.kind==='observed');
      output.evidence_interpretations=[{fact_keys:[fact.key],interpretation:'Hipótesis sobre esta actuación concreta, pendiente de revisión docente.',meaning:'ambiguous',scope:'individual'}];return{output};
    }})});return result;};
    const start=await route('start'),generated=await route('generate',{teacherIdeas:'',sourceFingerprint:start.data.snapshot.source_fingerprint});assert.equal(generated.status,201,JSON.stringify(generated.data));
    const plan=generated.data,count=calls;assert.equal(plan.proposal.evidence_interpretations.length,1);
    assert.equal((await route(plan.id+'/confirm',{expectedRevision:plan.revision})).data.reason,'teacher_review_required');
    assert.equal((await route(plan.id+'/confirm',{expectedRevision:plan.revision,confirmationScope:'planning',interpretationsReviewed:true})).data.reason,'invalid_review');
    assert.equal((await route(plan.id+'/confirm',{expectedRevision:plan.revision,confirmationScope:'planning',interpretationsReviewed:false},randomUUID())).status,404);
    assert.equal((await route(plan.id+'/confirm',{expectedRevision:plan.revision,confirmationScope:'planning',interpretationsReviewed:false})).status,200);
    const formal=(await db.query('select content,ai_metadata from annual_plan_formal_content where annual_plan_id=$1',[plan.id])).rows[0];
    assert.equal(formal.content.interpretation_review.status,'pending');assert.equal(formal.ai_metadata.confirmation_scope,'planning');assert.deepEqual(formal.content.evidence_interpretations,plan.proposal.evidence_interpretations);
    assert.ok(annualJourneyDocumentSections(formal.content).some(section=>section.title.includes('pendientes de revisión docente')));
    const document=await loadSavedDocument(db,teacher,'annual_plan',plan.id);assert.equal(document.content.interpretation_review.status,'pending');
    const zip=await JSZip.loadAsync(await renderSavedDocumentWord(document));assert.match(await zip.file('word/document.xml').async('string'),/pendientes de revisión docente/);
    assert.equal((await db.query('select count(*)::int as n from competency_assessments')).rows[0].n,0);assert.equal(calls,count,'confirmation is render-only, no provider');
    const active=(await db.query('select * from annual_plans where id=$1',[plan.id])).rows[0],copy=await route(plan.id+'/copy',{expectedRevision:Number(active.revision)});assert.equal(copy.status,201);
    assert.equal((await route(copy.data.id+'/confirm',{expectedRevision:Number(copy.data.revision),interpretationsReviewed:true})).status,200);
    const reviewed=(await db.query('select content from annual_plan_formal_content where annual_plan_id=$1',[copy.data.id])).rows[0].content;
    assert.equal(reviewed.interpretation_review.status,'reviewed');assert.equal((await db.query('select content from annual_plan_formal_content where annual_plan_id=$1',[plan.id])).rows[0].content.interpretation_review.status,'pending');
  }finally{await db.close();}
});
