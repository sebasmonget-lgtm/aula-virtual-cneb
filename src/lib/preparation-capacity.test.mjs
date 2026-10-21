import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readdir,readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createPilotClassroom} from './pilot-onboarding-service.mjs';
import {enqueuePreparation,runPreparationStep} from './preparation-jobs.mjs';

test('20 docentes simuladas: límites 2/4/6, sin duplicados ni cruces; no llama a IA',async()=>{
 const db=await PGlite.create(),dir=new URL('../../local-db/migrations/',import.meta.url);
 try{
  for(const file of (await readdir(dir)).filter(n=>n.endsWith('.sql')).sort())await db.exec(await readFile(new URL(file,dir),'utf8'));
  const owners=[];
  for(let i=0;i<20;i++){
   const teacherId=randomUUID();const result=await createPilotClassroom(db,teacherId,{teacherName:'Docente',institutionName:'Escuela',section:'A',age:5,year:2026,startsOn:'2026-03-02',endsOn:'2026-12-18'});
   owners.push({teacherId,classroomId:result.classroomId});
  }
  for(const concurrent of [2,4,6]){
   const expected=new Map();
   for(const owner of owners){const job=await enqueuePreparation(db,{...owner,kind:'document_export',sourceId:randomUUID(),sourceRevision:1,input:{scenario:concurrent},payload:{items:[]}});expected.set(job.id,owner.teacherId);}
   let active=0,peak=0;const seen=new Set();
   const execute=async job=>{
    assert.equal(job.teacher_id,expected.get(job.id));assert.ok(!seen.has(job.id));seen.add(job.id);
    active++;peak=Math.max(peak,active);assert.ok(active<=concurrent);
    await new Promise(resolve=>setTimeout(resolve,30));active--;return true;
   };
   for(let wave=0;wave<20&&seen.size<20;wave++)await Promise.all(Array.from({length:20},()=>runPreparationStep(db,execute,{limits:{concurrent,perTeacher:1}})));
   assert.equal(seen.size,20);assert.equal(peak,concurrent);assert.equal(active,0);
   const saved=(await db.query('select id,status from preparation_jobs_v2 where id=any($1::uuid[])',[[...expected.keys()]])).rows;
   assert.equal(saved.length,20);assert.ok(saved.every(row=>row.status==='succeeded'));
  }
 }finally{await db.close();}
});

test('un propietario no ocupa todos los lugares cuando se configura uno por docente',async()=>{
 const db=await PGlite.create(),dir=new URL('../../local-db/migrations/',import.meta.url);
 try{
  for(const file of (await readdir(dir)).filter(n=>n.endsWith('.sql')).sort())await db.exec(await readFile(new URL(file,dir),'utf8'));
  const teacherId=randomUUID(),classroom=await createPilotClassroom(db,teacherId,{teacherName:'Docente',institutionName:'Escuela',section:'A',age:5,year:2026,startsOn:'2026-03-02',endsOn:'2026-12-18'});
  for(let n=0;n<3;n++)await enqueuePreparation(db,{teacherId,classroomId:classroom.classroomId,kind:'document_export',sourceId:randomUUID(),sourceRevision:1,input:{n},payload:{items:[]}});
  let release;const held=new Promise(resolve=>{release=resolve;});let begun;const started=new Promise(resolve=>{begun=resolve;});
  const first=runPreparationStep(db,async()=>{begun();await held;return true;},{limits:{concurrent:4,perTeacher:1}});
  await started;assert.equal(await runPreparationStep(db,async()=>{assert.fail('El mismo propietario ya ocupa su lugar');},{limits:{concurrent:4,perTeacher:1}}),null);
  release();await first;
 }finally{await db.close();}
});
