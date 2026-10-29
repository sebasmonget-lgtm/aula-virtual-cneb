import { randomUUID } from 'node:crypto';
import { openMultiAgeLocalDb,openMultiAgePersistentDb,multiAgeLocalStorage } from '../multi-age-local-db.mjs';
import { createMultiAgeClassroom,enrollMultiAgeStudent } from '../../src/lib/multi-age-local-service.mjs';
import { multiAgeDiagnosticContext,recordMultiAgeDiagnosticObservation,confirmMultiAgeFamilyContext,confirmMultiAgeDiagnosticReview } from '../../src/lib/multi-age-diagnostic.mjs';
import { multiAgeAnnualContext,sampleMultiAgeAnnualProposal,saveMultiAgeAnnualDraft,confirmMultiAgeAnnualPlan } from '../../src/lib/multi-age-annual.mjs';

export const documentFixtureRequest=()=>({clientRequestId:randomUUID(),teacherConfirmed:true});
export async function makeMultiAgeDocumentFixture({schema='local',storeName=null}={}){
  if(storeName&&schema!=='local')throw new TypeError('El fixture persistente usa solo el esquema local.');
  const db=storeName?await openMultiAgePersistentDb({storeName}):await openMultiAgeLocalDb({schema}),teacher=storeName?multiAgeLocalStorage(db).teacherId:randomUUID(),other=randomUUID(),children=[];
  try{
    if(storeName&&(await db.query('select 1 from classrooms where teacher_id=$1 limit 1',[teacher])).rows.length)throw new Error('El fixture no sobrescribe una cuenta local que ya tenga aulas.');
    if(schema==='supabase')await db.query('insert into auth.users(id) values($1),($2)',[teacher,other]);
    await db.query("insert into profiles(user_id,display_name) values($1,'Profesora ficticia de prueba'),($2,'Otra docente ficticia') on conflict(user_id) do nothing",[teacher,other]);
    const classroom=await createMultiAgeClassroom(db,teacher,{...documentFixtureRequest(),ages:[3,4,5],section:'Semillas de prueba',institutionName:'Jardín ficticio local',year:2026,startsOn:'2026-03-16',endsOn:'2026-12-18'});
    for(const [i,age]of [3,4,5].entries()){
      const child={...await enrollMultiAgeStudent(db,teacher,{...documentFixtureRequest(),classroomId:classroom.classroomId,expectedRevision:1,firstName:['Ana','Bruno','Clara'][i],lastName:'Ficticio',age}),age};
      const context=await multiAgeDiagnosticContext(db,teacher,child.studentId),experience=context.catalog.find(e=>e.aspects.some(a=>a.competency_id==='COM_ORAL')),aspect=experience.aspects.find(a=>a.competency_id==='COM_ORAL');
      const observation=await recordMultiAgeDiagnosticObservation(db,teacher,{...documentFixtureRequest(),studentId:child.studentId,expectedAssignmentId:child.assignmentId,experienceId:experience.id,aspectId:aspect.id,observationStatus:'observed_without_judgment',observationText:`Registro ficticio de ${age} años: dijo «quiero construir» y eligió los bloques.`,observedOn:'2026-03-16'});
      await confirmMultiAgeFamilyContext(db,teacher,{...documentFixtureRequest(),studentId:child.studentId,expectedAssignmentId:child.assignmentId,familyText:`La familia del niño ficticio de ${age} años cuenta que en casa pide escuchar cuentos. Es un relato familiar de prueba.`});
      const updated=await multiAgeDiagnosticContext(db,teacher,child.studentId),review=await confirmMultiAgeDiagnosticReview(db,teacher,{...documentFixtureRequest(),studentId:child.studentId,sourceFingerprint:updated.sourceFingerprint,pendingInformationAcknowledged:true,
        findings:[{competency_id:'COM_ORAL',observation_ids:[observation.observationId],teacher_reading:`En la situación ficticia de ${age} años expresó una elección. Es necesario observar más intercambios para ampliar esta lectura.`,planning_priority:'consider'}]});
      children.push({...child,reviewId:review.reviewId,observationId:observation.observationId});
    }
    const annual=await multiAgeAnnualContext(db,teacher,classroom.classroomId),proposal=sampleMultiAgeAnnualProposal(annual),plan=await saveMultiAgeAnnualDraft(db,teacher,{...documentFixtureRequest(),classroomId:classroom.classroomId,sourceFingerprint:annual.sourceFingerprint,proposal});
    await confirmMultiAgeAnnualPlan(db,teacher,{...documentFixtureRequest(),classroomId:classroom.classroomId,planId:plan.planId,expectedRevision:plan.revision});
    return {db,teacher,other,classroom,children,plan,proposal};
  }catch(error){await db.close();throw error;}
}
