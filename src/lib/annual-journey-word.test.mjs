import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {annualJourneyDocumentSections,renderAnnualJourneyWord} from './annual-journey-word.mjs';

test('Word anual conserva fuentes una vez, con referencias y alcance legibles sin cambiar la fuente',async()=>{
 const plan={journey_version:2,teacher_preferences:'Explorar materiales del aula.',classroom_snapshot:{facts:[
  {key:'observation_123',kind:'observed',subject:'child_1',scope:'individual',occurred_at:'2026-03-27T02:30:00Z',uncertainty:'literal_record_only',support_text:'Ana probó otra ubicación para su caja.'},
  {key:'family_456',kind:'family_report',subject:'child_1',scope:'individual',uncertainty:'reported_not_observed',support_text:'La familia refiere que disfruta escuchar cuentos.\n{"communication_tags":["quiet_initially"]}'}]},
  resolved_calendar:{initial_stage:{name:'Diagnóstico',purpose:'Conocer al grupo.',starts_on:'2026-03-16',ends_on:'2026-03-27',suggested_experiences:[],what_to_observe:[]},projects:[],calendar_version:{version:'MINEDU-2026'},calendar_fingerprint:'technical-fingerprint',integrity:{assigned:170,eligible:172,gaps:2,overlaps:1}},
  proposed_experiences:[1,2].map(n=>({title:'Invitación '+n,rationale:'Invitación docente.',purpose:'Explorar.',invitation:'¿Qué podemos probar?',children_actions:[],planned_start_date:'2026-04-01',planned_end_date:'2026-04-03',duration_weeks:1,planned_instructional_days:3,opportunities:[],materials:[],supports:[],flexibility:'Tiempo para explorar.',source_fact_keys:['observation_123','family_456']})),
  evidence_interpretations:[{scope:'individual',meaning:'ambiguous',interpretation:'No permite concluir un logro.'}],everyday_opportunities:[]};
 for(const key of ['organization_criteria','transversal_approaches','teaching_strategies','assessment_followup','family_collaboration','inclusive_supports'])plan[key]=[];
 plan.classroom_snapshot.facts.push({key:'uncited',kind:'observed',scope:'individual',subject:'child_1',support_text:'Registro no citado que se conserva en Ayni.'});
 const before=structuredClone(plan),sections=annualJourneyDocumentSections(plan),text=sections.flatMap(s=>[s.title,...s.lines]).join('\n');
 assert.doesNotMatch(text,/Registro no citado que se conserva en Ayni/);assert.equal(plan.classroom_snapshot.facts.length,3);
 assert.equal(text.split('Ana probó otra ubicación para su caja.').length-1,1);
 assert.equal(sections.filter(s=>s.title==='Registros de referencia').length,0);
 assert.match(text,/Anexo · Referencias por propuesta/);assert.match(text,/1\. Invitación 1: fuente 1; fuente 2/);assert.match(text,/Fuente 2\. Relato de la familia/);
 assert.ok(sections.some(s=>s.title.includes('pendientes de revisión docente')));
 assert.ok(annualJourneyDocumentSections({...plan,interpretation_review:{status:'reviewed'}}).some(s=>s.title==='Interpretaciones revisadas por la docente'));
 assert.doesNotMatch(text,/quiet_initially|communication_tags/);assert.match(text,/Habla poco al inicio/);
 assert.match(text,/no es evidencia curricular observada/);assert.match(text,/26\/03\/2026/);
 assert.match(text,/1 semana · 3 días/);assert.match(text,/2 sin asignar; 1 solapamientos/);
 assert.doesNotMatch(text,/child_1|literal_record_only|reported_not_observed|technical-fingerprint|observation_123/);
 assert.match(JSON.stringify(annualJourneyDocumentSections(plan,new Map(),{child_1:'Ana'})),/Registro individual · Ana/);
 const zip=await JSZip.loadAsync(await renderAnnualJourneyWord({status:'active',school_year:2026,version:1,content:plan}));
 const xml=await zip.file('word/document.xml').async('string');
 assert.match(xml,/Ana probó otra ubicación/);
 // The original data heading lives inside a table: cutting at its paragraph
 // would leave orphaned table/row/cell elements and produce an unreadable DOCX.
 const stack=[];
 for(const match of xml.matchAll(/<(\/?)(w:(?:document|body|tbl|tr|tc|p))(?=[\s>])[^>]*>/g)){
   if(match[1])assert.equal(stack.pop(),match[2],`Estructura Word inválida: ${match[0]}`);
   else if(!match[0].endsWith('/>'))stack.push(match[2]);
 }
 assert.deepEqual(stack,[]);
 assert.match(xml,/w:color w:val="173B65"/);
 assert.doesNotMatch(xml,/<w:pStyle w:val="(?:Heading1|Title)"/,'el cuerpo insertado no referencia estilos ausentes en la plantilla');
 assert.match(xml,/<w:keepLines\/>/);
 assert.deepEqual(plan,before);
});
