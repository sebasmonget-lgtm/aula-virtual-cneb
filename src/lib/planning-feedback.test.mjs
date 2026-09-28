import test from 'node:test';
import assert from 'node:assert/strict';
import { projectPlanningFeedback, planningFeedbackText } from './planning-feedback.mjs';

test('planificación conserva distribuciones docentes manuales y competencias fuera de las primeras cinco', () => {
  const ids = ['PS_IDENTIDAD','PS_CONVIVE','PSICO_MOTRICIDAD','COM_ORAL','COM_LECTURA','MAT_CANTIDAD','CYT_INDAGA'];
  const cards = ids.map(id => ({ id, official_name: id }));
  const students = Array.from({length:15}, (_, index) => ({id:`s${index}`, first_name:`Nombre${index}`, last_name:'Reservado'}));
  const rows = students.flatMap((student, index) => ids.map(id => {
    const grade = id === 'PS_CONVIVE' && index < 14 ? index < 3 ? 'A' : 'B' : (id === 'MAT_CANTIDAD' && index === 3) || (id === 'CYT_INDAGA' && index === 4) ? 'A' : null;
    return { student_id:student.id, competency_v4_id:id, state:grade?'confirmed':'no_evidence',
      sourceRows:grade?[{id:`e${id}${index}`,observed_on:'2026-04-15',observation_text:'Texto privado Nombre0'}]:[],
      assessment:grade?{achievement_level:grade,details:{support_needs:[],next_opportunities:[]}}:null };
  }));
  const feedback = projectPlanningFeedback({model:{students,scope:ids,rows},cards,period:{id:'p1',label:'P1',ends_on:'2026-05-15'}});
  const convivencia = feedback.competencies.find(item => item.competency_id === 'PS_CONVIVE');
  assert.deepEqual(convivencia.levels,{AD:0,A:3,B:11,C:0});
  assert.equal(convivencia.students_without_grade,1);
  assert.equal(convivencia.students_without_record,1);
  assert.equal(convivencia.students_needing_development,11);
  assert.ok(feedback.suggested_adjustments.some(item => item.competency_id === 'PS_CONVIVE' && /11/.test(item.reason)));
  const text = planningFeedbackText(feedback);
  assert.match(text,/MAT_CANTIDAD/);
  assert.match(text,/CYT_INDAGA/);
  assert.match(text,/A: 3.*B: 11/);
  assert.match(text,/sin valoración/);
  assert.doesNotMatch(JSON.stringify(feedback),/Nombre\d|Reservado|Texto privado/);
  assert.equal(feedback.competencies.find(item=>item.competency_id==='COM_LECTURA').levels.C,0);
  assert.ok(!feedback.suggested_adjustments.some(item=>item.competency_id==='CYT_INDAGA' && /nivel B o C/.test(item.reason)), 'un caso no se convierte en necesidad grupal');
});

test('borradores y revisiones no se cuentan como decisiones pedagógicas confirmadas', () => {
  const feedback = projectPlanningFeedback({model:{students:[{id:'s'}],scope:['PS_CONVIVE'],rows:[{student_id:'s',competency_v4_id:'PS_CONVIVE',state:'draft',sourceRows:[],assessment:{achievement_level:'C'}}]},cards:[{id:'PS_CONVIVE',official_name:'Convive'}],period:{id:'p',label:'P1',ends_on:'2026-05-15'}});
  assert.equal(feedback.confirmed_assessments,0);
  assert.deepEqual(feedback.competencies[0].levels,{AD:0,A:0,B:0,C:0});
  assert.equal(feedback.competencies[0].students_without_grade,1);
});
