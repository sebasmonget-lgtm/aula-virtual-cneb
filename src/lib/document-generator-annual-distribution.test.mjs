import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewDocumentAnnualDistribution,documentAnnualDistributionBrief} from './document-generator-annual-distribution.mjs';
import {DOCUMENT_GENERATOR_CONVERSATION_RULES,DOCUMENT_GENERATOR_ANNUAL_RULES} from './document-generator-prompts.mjs';

const data={eligible:[3,4].map(age=>({age,cards:['A','B','C'].map(id=>({id,official_name:id}))})),calendar:{projects:[1,2,3].map(i=>({slot_id:`p${i}`,period:`Bimestre ${i}`,duration_weeks:2}))}};
const opportunity=(age,competency_id)=>({age,competency_id});
test('revisión anual distingue presencia, retorno y continuidad sin alterar el plan',()=>{
 const proposal={proposals:[1,2,3].map((i)=>({slot_id:`p${i}`,opportunities:[3,4].flatMap(age=>['A',i===3?'C':'B'].map(id=>opportunity(age,id)))})),everyday_opportunities:[]};
 const before=JSON.stringify(proposal),review=reviewDocumentAnnualDistribution(proposal,data);
 assert.equal(review.twoCompetencyProjects,3);assert.equal(review.broaderProjects,0);
 assert.ok(review.reviewPoints.some(p=>p.code==='mostly_minimum_integration'));
 assert.ok(review.reviewPoints.some(p=>p.code==='no_planned_return'&&p.competencyId==='C'&&p.age===4));
 assert.deepEqual(review.byAge[0].competencies.find(c=>c.id==='A').periods,['Bimestre 1','Bimestre 2','Bimestre 3']);
 const continued=structuredClone(proposal);continued.everyday_opportunities=[opportunity(3,'C'),opportunity(4,'C')];
 assert.ok(!reviewDocumentAnnualDistribution(continued,data).reviewPoints.some(p=>p.code==='no_planned_return'));
 continued.proposals[0].opportunities.push(opportunity(3,'C'),opportunity(4,'C'));
 assert.equal(reviewDocumentAnnualDistribution(continued,data).broaderProjects,1);
 assert.equal(JSON.stringify(proposal),before);
 const brief=documentAnnualDistributionBrief(data,proposal,['p1']);
 assert.deepEqual(brief.protected_slot_ids,['p1']);assert.equal(brief.previous_plan_review.twoCompetencyProjects,3);
 assert.doesNotMatch(JSON.stringify(brief),/first_name|teacherText|birth_date/);
});

test('chat anual acepta prioridades amplias y la política permite retornos pertinentes',()=>{
 assert.match(DOCUMENT_GENERATOR_CONVERSATION_RULES,/acepta expresamente ese alcance/);
 assert.match(DOCUMENT_GENERATOR_CONVERSATION_RULES,/no se convierte automáticamente en un proyecto/);
 assert.doesNotMatch(DOCUMENT_GENERATOR_CONVERSATION_RULES,/primero precisa UNA situación concreta/);
 assert.match(DOCUMENT_GENERATOR_ANNUAL_RULES,/tres o cuatro competencias/);
 assert.match(DOCUMENT_GENERATOR_ANNUAL_RULES,/no exige cuotas iguales/);
 assert.match(DOCUMENT_GENERATOR_ANNUAL_RULES,/incluso para competencias ya presentes/);
 assert.doesNotMatch(DOCUMENT_GENERATOR_ANNUAL_RULES,/solamente pares competencia\/edad habilitados que todavía NO estén cubiertos/);
});
