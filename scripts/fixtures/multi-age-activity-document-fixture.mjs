import { confirmMultiAgeActivity } from '../../src/lib/multi-age-local-service.mjs';
import { multiAgeAnnualWorkspace } from '../../src/lib/multi-age-annual.mjs';
import { officialPerformances } from '../../src/lib/official-performance-references.mjs';
import { documentFixtureRequest } from './multi-age-document-fixture.mjs';

/** Synthetic teacher-confirmed activity; no provider calls or existing application database. */
export async function addActivityDocumentFixture(f,{performanceOrdersByAge=null}={}){
  const w=await multiAgeAnnualWorkspace(f.db,f.teacher,f.classroom.classroomId),plan=w.plans.find(p=>p.status==='active'),row=plan.proposal.proposals[0],slot=plan.document_context.calendar.projects[0];
  const blueprint={title:'Elegimos un juego y conversamos',purpose:row.purpose,occursOn:slot.instructional_dates[0],participantAges:[3,4,5],
    commonSequence:{opening:'Invitar a elegir un juego con los bloques disponibles.',development:'Escuchar las elecciones por turnos y acompañar brevemente a cada grupo, manteniendo a todos a la vista.',closure:'Invitar a compartir lo elegido, respetando a quien prefiera escuchar.'},
    criteriaFamilies:[{competency_id:'COM_ORAL',variants:[3,4,5].map(age=>({curricular_age:age,criterion_text:`Criterio ficticio propio de ${age} años para la elección del juego.`,expected_evidence:`Posible actuación propia de ${age} años, aún no observada.`,observation_moments:['opening','development'],official_performance_refs:(performanceOrdersByAge?officialPerformances('COM_ORAL',age).filter(p=>performanceOrdersByAge[age].includes(p.official_order)):officialPerformances('COM_ORAL',age).slice(-2)).map(p=>p.id)}))}]};
  return {...await confirmMultiAgeActivity(f.db,f.teacher,{...documentFixtureRequest(),classroomId:f.classroom.classroomId,expectedRevision:1,annualPlanId:plan.id,annualSlotId:slot.slot_id,blueprint}),blueprint};
}
