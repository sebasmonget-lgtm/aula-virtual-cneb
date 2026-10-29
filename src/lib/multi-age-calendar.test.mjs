import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {openMultiAgeLocalDb} from '../../scripts/multi-age-local-db.mjs';
import {createMultiAgeClassroom,enrollMultiAgeStudent,confirmMultiAgeActivity,multiAgeLocalWorkspace} from './multi-age-local-service.mjs';
import {confirmMultiAgeDiagnosticReview,multiAgeDiagnosticContext} from './multi-age-diagnostic.mjs';
import {multiAgeAnnualWorkspace,saveMultiAgeAnnualDraft,confirmMultiAgeAnnualPlan,multiAgeAnnualCalendar} from './multi-age-annual.mjs';
import {validateMultiAgeInstitutionalCalendar,multiAgeSchoolCalendar} from './multi-age-calendar-definition.mjs';
import {officialPerformances} from './official-performance-references.mjs';
import {loadMultiAgeDocument} from './multi-age-document-service.mjs';
const confirm=()=>({teacherConfirmed:true,clientRequestId:randomUUID()});
export const institutional2027=()=>({contract:'multi-age-institutional-calendar-v1',sourceLabel:'Calendario ficticio para pruebas locales 2027',periods:[['2027-03-15','2027-05-14'],['2027-05-24','2027-07-23'],['2027-08-09','2027-10-08'],['2027-10-18','2027-12-17']].map(([startsOn,endsOn])=>({startsOn,endsOn})),exclusions:[{date:'2027-04-07',reason:'Cierre ficticio institucional'}]});
for(const schema of ['local','supabase'])test(`Calendario ${schema}: año institucional 2027 → diagnóstico 3/4/5 → Mi año → actividad`,{timeout:90000},async()=>{
 const db=await openMultiAgeLocalDb({schema}),teacher=randomUUID(),other=randomUUID();try{
  if(schema==='supabase')await db.query('insert into auth.users(id) values($1),($2)',[teacher,other]);await db.query("insert into profiles(user_id,display_name) values($1,'Docente ficticia'),($2,'Otra docente ficticia')",[teacher,other]);
  const config={...confirm(),ages:[3,4,5],section:'Semillas 2027',institutionName:'Jardín ficticio',year:2027,startsOn:'2027-03-01',endsOn:'2027-12-31',calendarPolicy:'institutional',calendar:institutional2027()};
  const classroom=await createMultiAgeClassroom(db,teacher,config);assert.equal((await createMultiAgeClassroom(db,teacher,config)).replayed,true);
  let workspace=await multiAgeLocalWorkspace(db,teacher,classroom.classroomId);assert.equal(workspace.periods.length,4);assert.equal(workspace.classroom.institutional_calendar.sourceLabel,config.calendar.sourceLabel);
  const calendar=multiAgeAnnualCalendar(workspace.classroom);assert.equal(calendar.projects.length,15);assert.equal(calendar.integrity.gaps,0);assert.equal(calendar.calendar_version.authority,'teacher_confirmed_institutional');assert.ok(!calendar.assignments.some(d=>d.date==='2027-04-07'));
  for(const age of [3,4,5]){const child=await enrollMultiAgeStudent(db,teacher,{...confirm(),classroomId:classroom.classroomId,expectedRevision:1,firstName:`Niño de ${age}`,lastName:'Ficticio',age});const context=await multiAgeDiagnosticContext(db,teacher,child.studentId);
   await confirmMultiAgeDiagnosticReview(db,teacher,{...confirm(),studentId:child.studentId,sourceFingerprint:context.sourceFingerprint,pendingInformationAcknowledged:true,findings:[]});}
  const year=await multiAgeAnnualWorkspace(db,teacher,classroom.classroomId),draft=await saveMultiAgeAnnualDraft(db,teacher,{...confirm(),classroomId:classroom.classroomId,sourceFingerprint:year.sourceFingerprint,proposal:year.exampleProposal});
  const plans=await multiAgeAnnualWorkspace(db,teacher,classroom.classroomId),plan=plans.plans.find(p=>p.status==='draft');await confirmMultiAgeAnnualPlan(db,teacher,{...confirm(),classroomId:classroom.classroomId,planId:draft.planId,expectedRevision:plan.revision,sourceFingerprint:plans.sourceFingerprint});
  const blueprint={title:'Actividad ficticia 2027',purpose:'Invitar a conversar con criterios distintos para cada edad.',occursOn:calendar.projects[0].instructional_dates[0],participantAges:[3,4,5],commonSequence:{opening:'Compartir objetos del aula.',development:'Escuchar a cada grupo por turnos en el mismo espacio visible.',closure:'Invitar a compartir sin obligar a hablar.'},criteriaFamilies:[{competency_id:'COM_ORAL',variants:[3,4,5].map(age=>({curricular_age:age,criterion_text:`Criterio ficticio de ${age} años.`,expected_evidence:'La expresión concreta del niño durante la conversación.',observation_moments:['development'],official_performance_refs:officialPerformances('COM_ORAL',age).slice(0,1).map(p=>p.id)}))}]};
  const activity=await confirmMultiAgeActivity(db,teacher,{...confirm(),classroomId:classroom.classroomId,expectedRevision:1,annualPlanId:plan.id,annualSlotId:calendar.projects[0].slot_id,blueprint});
  const document=await loadMultiAgeDocument(db,teacher,'activity',activity.activityId);assert.equal(document.identity.school_year,2027);assert.deepEqual(document.identity.ages,[3,4,5]);
  await assert.rejects(db.query("update multi_age_calendars set definition='{}'::jsonb where classroom_id=$1",[classroom.classroomId]),/se conserva/);
  if(schema==='supabase'){await db.query('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);assert.equal((await db.query('select * from multi_age_calendars')).rows.length,0);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[teacher]);assert.equal((await db.query('select * from multi_age_calendars')).rows.length,1);await assert.rejects(db.query('delete from multi_age_calendars where classroom_id=$1',[classroom.classroomId]),e=>e.code==='42501');await db.query('reset role');}
 }finally{await db.close();}
});
test('calendario institucional rechaza solapamientos, semanas incompletas, exclusiones duplicadas y tramos vacíos',()=>{
 const scope={year:2027,starts_on:'2027-03-01',ends_on:'2027-12-31'},base=institutional2027();assert.equal(validateMultiAgeInstitutionalCalendar(base,scope).periods.length,4);
 const overlap=structuredClone(base);overlap.periods[1].startsOn=overlap.periods[0].endsOn;assert.throws(()=>validateMultiAgeInstitutionalCalendar(overlap,scope),/orden/);
 const broken=structuredClone(base);broken.periods[0].startsOn='2027-03-16';assert.throws(()=>validateMultiAgeInstitutionalCalendar(broken,scope),/calendario/);
 assert.throws(()=>validateMultiAgeInstitutionalCalendar({...base,exclusions:[...base.exclusions,...base.exclusions]},scope),/única/);
 const empty=structuredClone(base),schedule=multiAgeAnnualCalendar({...scope,institutional_calendar:base});for(const date of schedule.projects[0].instructional_dates)if(!empty.exclusions.some(e=>e.date===date))empty.exclusions.push({date,reason:'Exclusión ficticia del tramo completo'});assert.throws(()=>validateMultiAgeInstitutionalCalendar(empty,scope),/Cada tramo/);
 assert.throws(()=>multiAgeSchoolCalendar(scope),/No se trasladan/);
 const legacy=multiAgeAnnualCalendar({year:2026,starts_on:'2026-03-02',ends_on:'2026-12-31'});assert.equal(legacy.calendar_version.id,'multi-age-local-national-2026');assert.equal(legacy.projects.length,15);
});
