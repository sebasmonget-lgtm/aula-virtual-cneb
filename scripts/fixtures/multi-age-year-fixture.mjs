import {randomUUID} from 'node:crypto';
import {makeMultiAgePeriodFixture} from './multi-age-period-fixture.mjs';
import {multiAgeLocalWorkspace,confirmMultiAgeActivity,observeMultiAgeStudent,multiAgeAssessmentContext,confirmMultiAgeGrade} from '../../src/lib/multi-age-local-service.mjs';
import {loadKnowledgeBaseV4} from '../../src/lib/knowledge-base-v4.mjs';
import {applicableCompetencyCards} from '../../src/lib/competency-applicability.mjs';
import {officialPerformances} from '../../src/lib/official-performance-references.mjs';
import {multiAgePeriodOverview,closeMultiAgePeriod} from '../../src/lib/multi-age-period.mjs';
const confirm=()=>({teacherConfirmed:true,clientRequestId:randomUUID()});
export const institutional2027=()=>({contract:'multi-age-institutional-calendar-v1',sourceLabel:'Calendario ficticio para pruebas locales 2027',periods:[['2027-03-15','2027-05-14'],['2027-05-24','2027-07-23'],['2027-08-09','2027-10-08'],['2027-10-18','2027-12-17']].map(([startsOn,endsOn])=>({startsOn,endsOn})),exclusions:[{date:'2027-04-07',reason:'Cierre ficticio institucional'}]});
/** Entirely synthetic teacher decisions for exercising year closure; never a production seed. */
export async function makeMultiAgeYearFixture(options={}){
 const f=await makeMultiAgePeriodFixture(options),{db,teacher}=f;try{
  const w=await multiAgeLocalWorkspace(db,teacher,f.classroom.classroomId),kb=await loadKnowledgeBaseV4(),cards=applicableCompetencyCards(kb.competencyCards,3,{castellanoL2Applicable:false,religionApplicable:false}),ids=cards.map(c=>c.id).filter(id=>id!=='COM_ORAL'),newActivities=[];
  for(let i=0;i<ids.length;i+=6){const group=ids.slice(i,i+6),activity=await confirmMultiAgeActivity(db,teacher,{...confirm(),classroomId:w.classroom.id,expectedRevision:1,blueprint:{...f.activity.blueprint,title:`Actividad de prueba del cierre ${i+1}`,criteriaFamilies:group.map(id=>({competency_id:id,variants:[3,4,5].map(age=>({curricular_age:age,criterion_text:`Criterio ficticio ${id} propio de ${age} años.`,expected_evidence:'Una actuación ficticia declarada únicamente para esta prueba.',observation_moments:['development'],official_performance_refs:officialPerformances(id,age).slice(0,1).map(p=>p.id)}))}))}});newActivities.push(activity.activityId);}
  const updated=await multiAgeLocalWorkspace(db,teacher,w.classroom.id);
  for(const child of f.children)for(const criterion of updated.criteria.filter(c=>newActivities.includes(c.activity_id)&&c.curricular_age===child.age)){
   await observeMultiAgeStudent(db,teacher,{clientRequestId:randomUUID(),studentId:child.studentId,activityId:criterion.activity_id,criterionId:criterion.id,periodId:f.period.id,observedOn:f.activity.blueprint.occursOn,rawText:`Actuación ficticia de prueba del niño de ${child.age} años para ${criterion.competency_v4_id}.`});
   // Synthetic AD exercises the existing optional-conclusion rule; the original three full conclusions remain.
   const input={studentId:child.studentId,competencyId:criterion.competency_v4_id,periodId:f.period.id},context=await multiAgeAssessmentContext(db,teacher,input);await confirmMultiAgeGrade(db,teacher,{...confirm(),...input,sourceFingerprint:context.sourceFingerprint,achievementLevel:'AD'});
  }

  for(const period of w.periods){if(period.id!==f.period.id)await confirmMultiAgeActivity(db,teacher,{...confirm(),classroomId:w.classroom.id,expectedRevision:1,blueprint:{...f.activity.blueprint,title:`Oportunidad pendiente del ${period.label}`,occursOn:period.starts_on}});

   const overview=await multiAgePeriodOverview(db,teacher,{classroomId:w.classroom.id,periodId:period.id});if(!overview.ready)throw new Error(`Fixture anual no cerrable: ${JSON.stringify(overview.progress)}`);
   await closeMultiAgePeriod(db,teacher,{...confirm(),classroomId:w.classroom.id,periodId:period.id,expectedCurrentVersionId:null,expectedSourceFingerprint:overview.sourceFingerprint,pendingAcknowledged:true});}

  return f;
 }catch(error){await db.close();throw error;}
}
