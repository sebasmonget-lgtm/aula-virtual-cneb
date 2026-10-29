// Explicit local preparation: preserve school/roster, never copy example plans or AI jobs.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {access} from 'node:fs/promises';
import {openMultiAgePersistentDb,multiAgeLocalStorage} from './multi-age-local-db.mjs';
import {chooseAyniProductMode} from '../src/lib/ayni-product-mode.mjs';
import {createPilotClassroom} from '../src/lib/pilot-onboarding-service.mjs';
import {multiAgeClassroomConfiguration,enrollMultiAgeStudent} from '../src/lib/multi-age-local-service.mjs';

if(!process.argv.includes('--confirm-local'))throw new Error('Requiere --confirm-local.');
const state=await (await fetch('http://127.0.0.1:8805/api/multi-age/state')).json();
const context=await (await fetch('http://127.0.0.1:8805/api/document-generator/context')).json();
const w=state.workspace;assert.ok(w&&context.multi);assert.equal(Number(w.classroom.year),2026);
assert.ok(!w.classroom.institutional_calendar,'Un calendario institucional necesita un traslado explícito.');
const storeName=process.argv.find(argument=>argument.startsWith('--trial-store='))?.slice('--trial-store='.length)??'generador-prueba-limpia';
assert.match(storeName,/^generador-(?:prueba-limpia|prueba-chat-[a-z0-9-]{1,35})$/);
// A new trial always gets a new directory; even an empty existing store is preserved.
try{await access(new URL(`../.local/multi-age-stores/${storeName}`,import.meta.url));throw new Error('El destino ya existe; elige otro nombre.');}catch(error){if(error.code!=='ENOENT')throw error;}
const db=await openMultiAgePersistentDb({storeName}),teacher=multiAgeLocalStorage(db).teacherId;
try{
 assert.equal((await db.query('select count(*)::int n from classrooms where teacher_id=$1',[teacher])).rows[0].n,0,'El destino ya tiene datos; no se sobrescribe.');
 await chooseAyniProductMode(db,teacher,{mode:'documents'});
 const input={teacherName:context.teacher,institutionName:context.institution,section:context.section,ages:context.ages,age:context.ages[0],year:2026,startsOn:w.classroom.starts_on,endsOn:w.classroom.ends_on,calendarPolicy:'national-2026',ugel:context.ugel,district:context.district,directorName:context.director,institutionCode:context.institutionCode};
 const saved=await createPilotClassroom(db,teacher,input,{multiAge:multiAgeClassroomConfiguration(input)});
 for(const s of w.students)await enrollMultiAgeStudent(db,teacher,{clientRequestId:randomUUID(),teacherConfirmed:true,classroomId:saved.classroomId,expectedRevision:1,firstName:s.first_name,lastName:s.last_name,preferredName:s.preferred_name??'',birthDate:s.birth_date??null,age:s.age,enrolledOn:s.enrolled_on??w.classroom.starts_on});
 for(const table of ['annual_plans','learning_experiences'])assert.equal((await db.query(`select count(*)::int n from ${table} where classroom_id=$1`,[saved.classroomId])).rows[0].n,0);
 assert.equal((await db.query('select count(*)::int n from multi_age_generation_jobs where teacher_id=$1',[teacher])).rows[0].n,0);
 process.stdout.write(JSON.stringify({storeName,students:w.students.length,plans:0,projects:0,activities:0,jobs:0,sourcePreserved:true})+'\n');
}finally{await db.close();}
