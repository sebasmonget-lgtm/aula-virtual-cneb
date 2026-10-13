import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createPilotClassroom,importStudentsForTeacher} from './pilot-onboarding-service.mjs';
import {recordDiagnosticExperienceObservation,loadDiagnosticExperienceWorkspace,withdrawGuidedObservation,reviseGuidedObservation} from './diagnostic-experiences-v4.mjs';
import {personalizationSources} from './annual-personalization-service.mjs';
import {diagnosticProgressForTeacher} from './diagnostic-review-service.mjs';
import {buildStudentPedagogicalContext} from './student-context-service.mjs';
import {loadStudentTrajectory} from './student-trajectory-service.mjs';
import {loadDiagnosticCoverageRecords} from './pedagogical-coverage.mjs';
test('guided withdrawal is authorized, CAS protected, idempotent and removes future coverage without losing original media or audit history',async()=>{
 const db=new PGlite(),teacher=randomUUID(),other=randomUUID();
 try{
  for(const file of (await readdir('local-db/migrations')).filter(file=>file.endsWith('.sql')).sort())await db.exec(await readFile('local-db/migrations/'+file,'utf8'));
  const created=await createPilotClassroom(db,teacher,{teacherName:'QA',institutionName:'QA',section:'A',age:5,year:2026,startsOn:'2026-03-02',endsOn:'2026-12-31'});
  await importStudentsForTeacher(db,teacher,[{firstName:'Ana',lastName:'Ficticia'}]);
  const workspace=await loadDiagnosticExperienceWorkspace(db,teacher),experience=workspace.experiences[0],student=workspace.students[0];
  const input={clientRequestId:randomUUID(),studentId:student.id,experienceId:experience.id,aspectId:experience.aspects[0].id,observationStatus:'observed_without_judgment',observationText:'Elige bloques para jugar.',mediaPath:`student-evidence/${teacher}/${student.id}/qa.jpg`,mediaMimeType:'image/jpeg',mediaSha256:'a'.repeat(64)};
  const saved=await recordDiagnosticExperienceObservation(db,teacher,input);
  const context={id:created.classroomId,school_year_id:created.schoolYearId,age:5,available_resources:[]};
  const before=await personalizationSources(db,teacher,context);
  await assert.rejects(withdrawGuidedObservation(db,other,saved.id,{expectedText:input.observationText}),/disponible/);
  await assert.rejects(withdrawGuidedObservation(db,teacher,saved.id,{expectedText:'outdated'}),/cambió/);
  await withdrawGuidedObservation(db,teacher,saved.id,{expectedText:input.observationText});
  assert.equal((await withdrawGuidedObservation(db,teacher,saved.id,{})).replayed,true);
  assert.equal((await loadDiagnosticExperienceWorkspace(db,teacher)).experience_observations.length,0);
  const after=await personalizationSources(db,teacher,context);assert.equal(after.observations.length,0);assert.notEqual(after.fingerprint,before.fingerprint);
  assert.equal((await diagnosticProgressForTeacher(db,teacher)).observation_count,0);
  assert.equal((await buildStudentPedagogicalContext(db,student.id)).diagnostic_observations.length,0);
  assert.equal((await loadStudentTrajectory(db,teacher,student.id)).diagnostic.length,0);
  assert.equal((await loadDiagnosticCoverageRecords(db,created.classroomId,{starts_on:'2026-01-01',ends_on:'2026-12-31'})).length,0);
  await assert.rejects(reviseGuidedObservation(db,teacher,saved.id,{observationText:input.observationText,expectedText:input.observationText}),/eliminada/);
  await assert.rejects(recordDiagnosticExperienceObservation(db,teacher,input),/eliminada/);
  const original=(await db.query('select observation_text,media_path from diagnostic_experience_observations where id=$1',[saved.id])).rows[0];assert.equal(original.observation_text,input.observationText);assert.equal(original.media_path,input.mediaPath);
  const events=(await db.query('select preferences from profiles where user_id=$1',[teacher])).rows[0].preferences.guided_observation_revisions[saved.id];assert.equal(events.length,1);assert.equal(events[0].action,'withdraw');
 }finally{await db.close();}
});
