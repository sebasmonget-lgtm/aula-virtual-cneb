import { makeMultiAgeDocumentFixture, documentFixtureRequest as confirm } from './multi-age-document-fixture.mjs';
import { addActivityDocumentFixture } from './multi-age-activity-document-fixture.mjs';
import { multiAgeLocalWorkspace, observeMultiAgeStudent, multiAgeAssessmentContext, confirmMultiAgeGrade, confirmMultiAgeConclusion, confirmMultiAgeFamilyReport } from '../../src/lib/multi-age-local-service.mjs';
import { nationalCalendarBlocks2026 } from '../../src/lib/annual-plan-calendar.mjs';

export async function makeMultiAgePeriodFixture({schema='local',evaluated=true,storeName=null,activityOptions={}}={}){
  const f=await makeMultiAgeDocumentFixture({schema,storeName});try{
    const blocks=nationalCalendarBlocks2026().filter(b=>b.type==='instructional');
    await f.db.query("update evaluation_periods set label='Bimestre 1',ends_on=$2::date where id=$1",[f.classroom.periodId,blocks[0].end_date]);
    for(const [i,b]of blocks.entries())if(i)await f.db.query(`insert into evaluation_periods(id,school_year_id,kind,ordinal,label,starts_on,ends_on)
      select $1,school_year_id,'bimester',$2,$3,$4::date,$5::date from classrooms where id=$6`,[crypto.randomUUID(),i+1,`Bimestre ${i+1}`,b.start_date,b.end_date,f.classroom.classroomId]);
    const activity=await addActivityDocumentFixture(f,activityOptions),w=await multiAgeLocalWorkspace(f.db,f.teacher,f.classroom.classroomId);
    f.activity=activity;f.period=w.periods.find(p=>p.starts_on<=activity.blueprint.occursOn&&p.ends_on>=activity.blueprint.occursOn);
    for(const child of f.children){child.criterionId=w.criteria.find(c=>c.activity_id===activity.activityId&&c.curricular_age===child.age).id;
      child.input={studentId:child.studentId,competencyId:'COM_ORAL',periodId:f.period.id};
      child.observationInput={clientRequestId:crypto.randomUUID(),studentId:child.studentId,activityId:activity.activityId,criterionId:child.criterionId,periodId:f.period.id,observedOn:activity.blueprint.occursOn,rawText:`Registro cotidiano ficticio propio de ${child.age} años: expresó su elección al jugar.`};
      if(evaluated){await observeMultiAgeStudent(f.db,f.teacher,child.observationInput);
        child.context=await multiAgeAssessmentContext(f.db,f.teacher,child.input);
        child.grade=await confirmMultiAgeGrade(f.db,f.teacher,{...confirm(),...child.input,sourceFingerprint:child.context.sourceFingerprint,achievementLevel:child.age===3?'B':child.age===4?'A':'AD'});}
    }
    if(evaluated){for(const child of f.children)child.conclusion=await confirmMultiAgeConclusion(f.db,f.teacher,{...confirm(),...child.input,assessmentId:child.grade.assessmentId,sourceFingerprint:child.context.sourceFingerprint,conclusionText:`Conclusión ficticia de ${child.age} años basada en su registro propio.`});
      for(const child of f.children)child.report=await confirmMultiAgeFamilyReport(f.db,f.teacher,{...confirm(),studentId:child.studentId,periodId:f.period.id});}
    return f;
  }catch(error){await f.db.close();throw error;}
}
