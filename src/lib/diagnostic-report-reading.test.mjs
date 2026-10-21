import test from 'node:test';
import assert from 'node:assert/strict';
import {validateDiagnosticSuggestion} from './ai-diagnostic-evaluation-service.mjs';
import {diagnosticCompetencyReading,diagnosticReportReadings,diagnosticRecordExcerpt} from './diagnostic-report-reading.mjs';
import {compactWordDocumentEnd} from './unified-word-template.mjs';
import {buildAnnualClassroomSnapshot} from './annual-classroom-snapshot.mjs';

const record='00000000-0000-4000-8000-000000000001';
const sources={known_names:[],comments:[],family_reported_context:[{source_id:'child_1_family_v1',child:'child_1',source_type:'family_reported_context'}],
 observed_records:[{child:'child_1',notes:[{source_id:'child_1_observation_1',record_id:record,source_type:'direct_observation',competency_ids:['MAT_CANTIDAD'],text:'Repartió un vaso a cada muñeco.'}]}]};
const output=()=>({strengths:'Un niño comprobó un reparto.',needs:'Falta conocer otros repartos.',planning_priorities:'Preparar pedidos para el juego.',
 claims:[['strengths','Un niño comprobó un reparto.','individual'],['needs','Falta conocer otros repartos.','information_gap'],['planning_priorities','Preparar pedidos para el juego.','planning_decision']].map(([field,text,scope])=>({field,text,scope,source_refs:['child_1_observation_1']})),
 competency_readings:[{competency_id:'MAT_CANTIDAD',summary:'En un registro, un niño relaciona un vaso con cada muñeco para comprobar el reparto.',next_step:'Variar quiénes participan y observar cómo resuelve un faltante.',scope:'individual',source_refs:['child_1_observation_1']}]});

test('la lectura diagnóstica conserva respaldo directo de su competencia y distingue alcance',()=>{
 const before=structuredClone(sources),valid=validateDiagnosticSuggestion(output(),sources);
 assert.deepEqual(valid.competency_readings[0].source_record_ids,[record]);assert.deepEqual(sources,before);
 for(const change of [row=>row.source_refs=['child_1_family_v1'],row=>row.competency_id='COM_ORAL',row=>row.scope='subgroup',row=>row.summary='Tiene nivel A.']){
  const invalid=output();change(invalid.competency_readings[0]);assert.throws(()=>validateDiagnosticSuggestion(invalid,sources),e=>e.reason==='proposal_invalid');
 }
 const missing=output();missing.competency_readings=[];assert.throws(()=>validateDiagnosticSuggestion(missing,sources),e=>e.reason==='proposal_invalid');
 const legacy=output();delete legacy.competency_readings;assert.equal(validateDiagnosticSuggestion(legacy,sources).competency_readings,undefined);
});

test('pantalla y Word leen una misma interpretación confirmada sin inventar análisis de históricos',()=>{
 const reading=validateDiagnosticSuggestion(output(),sources).competency_readings[0];
 const snapshot={competency_readings:[reading],observations:[{id:record,student_id:'one',competency_id:'MAT_CANTIDAD'}]},before=structuredClone(snapshot);
 assert.deepEqual(diagnosticReportReadings({content:{report_snapshot:snapshot}}),[diagnosticCompetencyReading(snapshot,'MAT_CANTIDAD')]);
 assert.equal(diagnosticCompetencyReading({...snapshot,observations:[]},'MAT_CANTIDAD'),null);
 assert.deepEqual(diagnosticReportReadings({content:{report_snapshot:{observations:[]}}}),[]);assert.deepEqual(snapshot,before);
});

test('los extractos se señalan y una marca vacía final no crea otra hoja tras la tabla',()=>{
 assert.equal(diagnosticRecordExcerpt('Repartió vasos. Después añadió uno para otra niña.',24),'Repartió vasos. […]');
 assert.equal(diagnosticRecordExcerpt('Texto completo.'),'Texto completo.');
 const result=compactWordDocumentEnd('<w:body><w:tbl>contenido</w:tbl><w:p w:rsidR="001"/><w:sectPr/></w:body>');
 assert.doesNotMatch(result,/rsidR/);assert.match(result,/w:line="20"/);
 assert.match(compactWordDocumentEnd('<w:body><w:p><w:r><w:t>Firma</w:t></w:r></w:p><w:sectPr/></w:body>'),/Firma/);
});

test('el año recibe la lectura revisada como interpretación docente y no como nueva observación',()=>{
 const reading=validateDiagnosticSuggestion(output(),sources).competency_readings[0];
 const snapshot=buildAnnualClassroomSnapshot({students:[{id:'one'}],interviews:[],names:[],observations:[{id:record,student_id:'one',observation_text:'Repartió un vaso a cada muñeco.',competency_v4_id:'MAT_CANTIDAD'}],
  group:{id:'group',version:2,teacher_confirmed_at:'2026-03-20',details:{competency_readings:[reading],report_snapshot:{observations:[{id:record,competency_id:'MAT_CANTIDAD',observation_text:'Repartió un vaso a cada muñeco.'}]}}}},{available_resources:[]},[{id:'MAT_CANTIDAD'}]);
 const fact=snapshot.facts.find(row=>row.key==='confirmed_diagnostic_MAT_CANTIDAD');
 assert.equal(fact.kind,'teacher_decision');assert.equal(fact.scope,'individual');assert.equal(fact.subject,'child_1');assert.equal(fact.uncertainty,'confirmed_teacher_interpretation');
 assert.match(fact.support_text,/Variar quiénes participan/);assert.equal(snapshot.facts.filter(row=>row.kind==='observed').length,1);assert.equal(snapshot.competency_information[0].confirmed_assessment,'unknown');
});
