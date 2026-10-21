import test from 'node:test';
import assert from 'node:assert/strict';
import {activityTeacherText,orderedActivityCriteria} from './activity-teacher-reading.mjs';
import {activityPedagogicalBlocks} from './pedagogical-blocks.mjs';

test('orden arbitrario del SQL no cambia la competencia principal ni mezcla sus evidencias',()=>{
 const details={competency_id:'PS_CONVIVE',child_actions:'Inicio: PS_CONVIVE: acordar. Desarrollo: construir. Cierre: contar.',mediation:'Inicio: escuchar. Desarrollo: acompañar. Cierre: preguntar.',additional_criteria:[{competency_id:'COM_ORAL'}]};
 const rows=[{id:'oral',competency_v4_id:'COM_ORAL',criterion_text:'Cuenta su idea.',details:{expected_evidence:'Explicación oral.'}},
  {id:'convive',competency_v4_id:'PS_CONVIVE',criterion_text:'Acuerda y comparte.',details:{expected_evidence:'Acuerdo aplicado.'}}];
 const before=structuredClone({details,rows});
 assert.deepEqual(orderedActivityCriteria(details,rows).map(item=>item.id),['convive','oral']);
 const blocks=activityPedagogicalBlocks(details,[],rows),observations=blocks.flatMap(block=>block.observations??[]);
 assert.equal(observations[0].criterion,'Acuerda y comparte.');assert.equal(observations[0].expected_evidence,'Acuerdo aplicado.');
 assert.doesNotMatch(blocks[0].expected_actions,/PS_CONVIVE/);assert.match(blocks[0].expected_actions,/Convive: acordar/);
 assert.deepEqual({details,rows},before);
});

test('presentación de planificación sustituye solo códigos conocidos y conserva el texto completo',()=>{
 const source=['Inicio: PS_CONVIVE: proponer un acuerdo.','COM_ORAL: contar qué cambió.','Palabras y tildes: ¿qué pasó?'];
 const result=activityTeacherText(source);
 assert.deepEqual(result,['Inicio: Convive: proponer un acuerdo.','Se comunica: contar qué cambió.','Palabras y tildes: ¿qué pasó?']);
 assert.notEqual(result,source);assert.equal(source[0],'Inicio: PS_CONVIVE: proponer un acuerdo.');
});
