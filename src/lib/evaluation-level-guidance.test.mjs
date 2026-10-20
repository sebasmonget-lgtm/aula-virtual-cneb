import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluationLevelGuidance } from './evaluation-level-guidance.mjs';
import { EVALUATION_LEVELS } from './assessment-display.mjs';
import { officialPerformances } from './official-performance-references.mjs';
import { loadKnowledgeBaseV4 } from './knowledge-base-v4.mjs';

test('la guía breve cubre todas las competencias y edades con fuente sin inventar referentes',async()=>{
 const kb=await loadKnowledgeBaseV4();
 for(const card of kb.competencyCards)for(const age of [3,4,5]){
   const guide=evaluationLevelGuidance(card.id,age),official=officialPerformances(card.id,age);
   assert.deepEqual(guide.performances.map(x=>x.id),official.map(x=>x.id));
   assert.equal(guide.age,age);
   if(official.length){assert.ok(guide.focus,`${card.id}/${age}`);assert.ok(guide.focus.split(/\s+/).length<=30);}
   else{assert.equal(guide.focus,null);assert.equal(guide.kind,'no_age_specific_performance');}
   assert.ok(guide.performances.every(x=>x.page>0&&official.some(o=>o.text===x.text)));
   assert.match(guide.note,/Guía orientativa/);
 }
 assert.deepEqual(EVALUATION_LEVELS.map(x=>x.value),['AD','A','B','C']);
 assert.ok(EVALUATION_LEVELS.every(x=>x.hint.split(/\s+/).length<=12));
 assert.doesNotMatch(JSON.stringify(EVALUATION_LEVELS),/porcentaje|número de evidencias|mayor edad/);
});

test('lectura cambia con la edad; acompañamiento previsto no desaparece del referente de autonomía',()=>{
 assert.notEqual(evaluationLevelGuidance('COM_LECTURA',3).focus,evaluationLevelGuidance('COM_LECTURA',5).focus);
 assert.match(evaluationLevelGuidance('TRANS_AUTONOMO',5).focus,/Con ayuda/);
 for(const [id,age] of [['COM_ESCRITURA',3],['TRANS_TIC',4],['CAST_L2_ORAL',4],['TRANS_AUTONOMO',3]])
   assert.deepEqual(evaluationLevelGuidance(id,age).performances,[]);
 assert.doesNotMatch(evaluationLevelGuidance('COM_ESCRITURA',4).focus,/dibujos/);
});
