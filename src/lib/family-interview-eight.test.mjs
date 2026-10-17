import test from 'node:test';
import assert from 'node:assert/strict';
import {familyInterviewQuestionGroups,familyInterviewVersionFor,hasFamilyInterviewAnswers} from './family-interview-contract.mjs';
import {countFamilyInterviewAnswers} from './family-interview-progress.mjs';
import {validateFamilyInterviewDetails,safeFamilyContext} from './diagnostic-sources-v4.mjs';
import {buildFamilyInterviewPrintHtml,familyInterviewExtraAnswers} from './family-interview-print.mjs';
import {summarizeFamilyInterview,projectFamilyAssessmentContext} from './family-interview-projection.mjs';
import {buildAssessmentInput} from './assessment-v4-service.mjs';

const questions=familyInterviewQuestionGroups('Niña QA')[0].questions;
const answers={questionnaire_version:3,interests:'Juega a cocinar.',identity_autonomy_context:'Dice que está triste y pide compañía. Se pone los zapatos.',
  social_context:'Propone turnarse al jugar.',communication_context:'Cuenta lo que pasó en el parque.',
  literacy_context:'Mira las imágenes y hace marcas para un mensaje.',mathematics_context:'Reparte las cucharas para comer.',
  exploration_context:'Prueba qué objetos ruedan por una tabla.',family_context:'Queremos que disfrute hacer amigos.'};

test('ocho temas y preguntas exactas, sin duplicar respuestas de preguntas nuevas',()=>{
  assert.deepEqual(questions.map(q=>q.title),['Juegos e intereses','Identidad y autonomía','Convivencia','Comunicación oral','Lectura y escritura','Matemática','Curiosidad y exploración','Contexto familiar y expectativas']);
  assert.equal(questions[0].label,'¿Qué juegos o actividades disfruta más su hijo o hija? ¿Qué suele hacer cuando juega libremente?');
  assert.equal(questions[7].label,'¿Qué considera importante que la profesora conozca sobre su hijo o hija? ¿Qué le gustaría que aprenda o desarrolle durante este año?');
  assert.equal(new Set(questions.map(q=>q.key)).size,8);
  for(const question of questions)assert.equal(countFamilyInterviewAnswers({questionnaire_version:3,[question.key]:'Ejemplo familiar.'}),1);
  assert.equal(countFamilyInterviewAnswers(answers),8);
  assert.equal(countFamilyInterviewAnswers({questionnaire_version:3}),0);
  assert.equal(hasFamilyInterviewAnswers({questionnaire_version:3}),false);
});

test('valida nuevas respuestas, versiones y límites sin completar campos opcionales',()=>{
  const saved=validateFamilyInterviewDetails(answers);
  for(const [key,value]of Object.entries(answers))assert.equal(saved[key],value);
  assert.equal(validateFamilyInterviewDetails({literacy_context:'Mira imágenes.'}).questionnaire_version,3);
  assert.deepEqual(validateFamilyInterviewDetails({questionnaire_version:3}),{questionnaire_version:3});
  assert.throws(()=>validateFamilyInterviewDetails({questionnaire_version:9}),/versión/);
  assert.throws(()=>validateFamilyInterviewDetails({questionnaire_version:2,literacy_context:'Mira libros.'}),/ocho preguntas/);
  assert.throws(()=>validateFamilyInterviewDetails({questionnaire_version:3,mathematics_context:'x'.repeat(2001)}),/Revisa/);
});

test('la versión antigua conserva sus seis preguntas y la corrección no borra respuestas anteriores',()=>{
  const old={structured_options_version:2,home_activity_tags:['builds'],home_activity_example:'Arma cajas.',community_tags:['market'],family_community_context:'Acompaña al mercado.',participation_support_tags:['more_time']};
  const before=structuredClone(old);
  assert.equal(familyInterviewVersionFor(old),2);
  assert.equal(familyInterviewQuestionGroups('Niña QA',familyInterviewVersionFor(old))[0].questions.length,6);
  assert.equal(countFamilyInterviewAnswers(old),3);
  const corrected=validateFamilyInterviewDetails({...old,...answers});
  assert.equal(familyInterviewVersionFor(corrected),3);
  assert.equal(corrected.home_activity_example,old.home_activity_example);
  assert.deepEqual(old,before);
  const extra=familyInterviewExtraAnswers(corrected,3).map(row=>row.text).join(' ');
  assert.match(extra,/Arma cajas/);assert.match(extra,/mercado/);assert.match(extra,/Tener más tiempo/);
});

test('hoja imprimible y resumen conservan respuestas nuevas con atribución familiar',()=>{
  const html=buildFamilyInterviewPrintHtml('Niña <QA>',answers,familyInterviewQuestionGroups('Niña QA'));
  for(const value of Object.values(answers).filter(v=>typeof v==='string'))assert.ok(html.includes(value));
  for(const question of questions)assert.ok(html.includes(question.title));
  assert.match(html,/Niña &lt;QA&gt;/);
  const summary=summarizeFamilyInterview(answers);
  assert.match(summary,/^Según la familia/);assert.match(summary,/hace marcas/);assert.match(summary,/Reparte las cucharas/);assert.match(summary,/objetos ruedan/);
  assert.doesNotMatch(summary,/logró la competencia|nivel de logro/);
});

test('la información familiar nueva sigue siendo contexto y no evidencia curricular',()=>{
  assert.equal(safeFamilyContext(answers).literacy_context,answers.literacy_context);
  assert.equal(safeFamilyContext(answers).family_context,undefined,'el contexto familiar general no amplía el payload privado');
  const context=projectFamilyAssessmentContext(answers);
  assert.equal(context.role,'context_only');
  const input=buildAssessmentInput({age:5,competencyId:'MAT_CANTIDAD',evidenceHistory:[],familyContext:context});
  assert.deepEqual(input.evidence_history,[]);
  assert.equal(input.student_context?.family_context,undefined);
});
