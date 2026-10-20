import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {buildBriefAssessmentInput,validateBriefAssessment,briefAssessmentAsAnalysis} from './assessment-brief.mjs';
import {buildAIContext} from './ai-context-builder-v4.mjs';
import {loadKnowledgeBaseV4} from './knowledge-base-v4.mjs';
import {generateAIWorkflowV4} from './ai-generation-v4.mjs';
import {resolveAIExecutionPlan} from './ai-execution-router-v4.mjs';

const name='Emilia Cárdenas Ruiz';
const input=()=>buildBriefAssessmentInput({age:5,competencyId:'COM_LECTURA',studentName:name,period:{label:'Bimestre 4',starts_on:'2026-10-19',ends_on:'2026-12-18'},sourceRows:[{observed_on:'2026-11-02',activity_title:'Leemos juntas',criterion_text:'Explica una idea apoyándose en el cuento.',observation_text:'Emilia señaló la ilustración y explicó por qué el personaje volvió al jardín.',media_available:true,media_path:'privado.jpg'}]});
const proposal=()=>({competency_id:'COM_LECTURA',student_name:name,information_status:'insufficient',analysis_paragraph:`${name} explica una idea del cuento apoyándose en una ilustración. Esta observación muestra una actuación de comprensión. Hace falta observarla en otras situaciones para comprender cómo interpreta otros textos.`,evidence_refs:['o1'],performance_refs:['PCI2016.COM_LECTURA.5.01']});

test('catorce estándares completos con páginas y hashes, sin mezclar ciclos ni reemplazar el catálogo previo',async()=>{
 const catalog=JSON.parse(await readFile(new URL('../../curriculum/official/initial-cycle-ii-standards-v1.json',import.meta.url)));
 const kb=await loadKnowledgeBaseV4();
 assert.equal(catalog.standards.length,14);
 for(const card of kb.competencyCards){const row=catalog.standards.find(s=>s.competency_id===card.id);assert.equal(row.cycle,'II');assert.equal(row.pdf_page,row.printed_page+2);assert.equal(row.content_sha256,createHash('sha256').update(row.text).digest('hex'));assert.doesNotMatch(row.text,/\uFFFD|DESEMPEÑOS|Descripción del nivel/);}
});

test('contexto compacto: una edad/competencia, fuentes oficiales y notas originales, sin fotos ni contexto ajeno',async()=>{
 const request=input();request.student_context.family_context='No debe entrar';request.attendance=['absent'];request.previous_level='AD';
 const bundle=await buildAIContext(request);
 assert.equal(bundle.curriculum.competency_cards.length,1);
 assert.equal(bundle.curriculum.competency_cards[0].id,'COM_LECTURA');
 assert.equal(bundle.curriculum.age_performances.length,3);
 assert.ok(bundle.curriculum.age_performances.every(row=>row.id.includes('.5.')));
 assert.match(bundle.curriculum.cycle_ii_standard.text,/Lee diversos tipos/);
 assert.equal(bundle.context.student.name,name);
 assert.equal(bundle.context.observations[0].observed,request.evidence_history[0].observation_note);
 assert.doesNotMatch(JSON.stringify(bundle),/privado\.jpg|media_available|family_context|No debe entrar|absent|previous_level/);
 assert.equal(bundle.curriculum.scale,undefined);assert.doesNotMatch(request.teacher_request,/sugerencia de valoración/);
 assert.ok(JSON.stringify(bundle).length<14000,'Presupuesto de contexto, sin recortar las evidencias');
});

test('validación conserva nombre y fuentes; rechaza notas, referencias ajenas y párrafos extensos',()=>{
 assert.equal(Object.hasOwn(validateBriefAssessment(proposal(),input()),'suggested_level'),false);
 for(const patch of [{student_name:'Otro niño'},{evidence_refs:['o999']},{performance_refs:['PCI2016.COM_LECTURA.3.01']},{suggested_level:'C'},{analysis_paragraph:'Un análisis demasiado corto.'}])assert.throws(()=>validateBriefAssessment({...proposal(),...patch},input()));
 const enough={...proposal(),information_status:'sufficient'};
 assert.equal(validateBriefAssessment(enough,input()).information_status,'sufficient');
 for(const statement of ['Sugiero A.','Su nivel es B.','Su nota: AD.','Emilia muestra logro destacado.'])assert.throws(()=>validateBriefAssessment({...enough,analysis_paragraph:`${name} explica lo leído y señala una imagen del cuento para apoyar su respuesta. ${statement} Conviene seguir observando cómo relaciona sus ideas con otras ilustraciones al leer nuevos cuentos.`},input()),/nota|nivel/);
 const unsupported={...input(),age:3,competency_ids:['COM_ESCRITURA']};
 assert.throws(()=>validateBriefAssessment({...enough,competency_id:'COM_ESCRITURA',performance_refs:[]},unsupported));
 const legacy=briefAssessmentAsAnalysis(proposal());assert.equal(legacy.evidence_overview,proposal().analysis_paragraph);assert.equal(legacy.information_status,'insufficient');assert.equal(legacy.achievement_level,undefined);
});

test('30–70 palabras es orientación: acepta variaciones, normaliza espacios y conserva un límite amplio',()=>{
 const text=count=>Array.from({length:count},(_,i)=>i===0?'Emilia':i===15?'observa.':i===count-1?'comparte.':'observa').join(' ');
 for(const count of [20,29,30,70,71,100])assert.equal(validateBriefAssessment({...proposal(),analysis_paragraph:text(count)},input()).analysis_paragraph.split(/\s+/).length,count);
 for(const count of [19,101])assert.throws(()=>validateBriefAssessment({...proposal(),analysis_paragraph:text(count)},input()),/demasiado corto o extenso/);
 const oneSentence=text(35).replaceAll('.','');
 assert.equal(validateBriefAssessment({...proposal(),analysis_paragraph:'  '+oneSentence.replaceAll(' ','\n  ')+'  '},input()).analysis_paragraph,oneSentence);
});

test('la primera prueba conserva Luna low y el pipeline común sin fallback oculto',async()=>{
 const request=input(),plan={...resolveAIExecutionPlan({workflow:'assessment',task:'brief_trial'}),fallback:null};
 assert.equal(plan.model,'gpt-6-luna');assert.equal(plan.reasoning_effort,'low');
 let calls=0;
 const result=await generateAIWorkflowV4(request,{executionPlan:plan,provider:{id:'mock',async generate(payload){calls++;assert.equal(payload.output_schema.id,'assessment-brief-v2');assert.equal(payload.ai_context_bundle.profile,'brief-v2');return {output:proposal(),provider_metadata:{model:plan.model}};}}});
 assert.equal(calls,1);assert.equal(result.validation.status,'valid');assert.equal(result.output.student_name,name);
 assert.equal(result.metadata.reasoning_effort,'low');assert.equal(result.metadata.fallback_used,false);
});
