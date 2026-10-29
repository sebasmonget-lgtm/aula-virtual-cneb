import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import JSZip from 'jszip';
import {loadKnowledgeBaseV4} from './knowledge-base-v4.mjs';
import {commonPlanningDocument,renderCommonPlanningWord} from './ayni-planning-document.mjs';
import {buildProviderRequest} from './ai-generation-v4.mjs';
import {AYNI_PLANNING_RULES} from './ayni-planning-policy.mjs';
import {fixtureCalendar} from './test-fixtures/annual-journey.mjs';
import {solveAnnualJourneyCalendar} from './annual-journey-calendar.mjs';

const id='90000000-0000-4000-8000-000000000001';
const roster={contract:'ayni-document-observation-roster-v1',students:[{studentId:'90000000-0000-4000-8000-000000000002',name:'Ana de prueba',age:4},{studentId:'90000000-0000-4000-8000-000000000003',name:'Luis de prueba',age:4}]};
function source(kind){
 const base={id,kind,status:'active',version:1,age:4,school_year:2026,classroom:'LILA',institution_name:'Jardín de prueba',teacher_name:'Docente de prueba',formal_ready:true};
 const route=[['Planificamos el proyecto con los niños','2026-04-13','Proponen preguntas y ordenan las acciones que desean probar.'],['Probamos caminos para las semillas','2026-04-14','Comparan dónde pueden observar las semillas y prueban una ubicación.'],['Revisamos lo que cambió','2026-04-15','Comparan sus registros y deciden qué desean seguir observando.']].map(([title,date,specific_purpose],i)=>({id:'ruta-'+i,number:i+1,title,date,specific_purpose,competency_id:'COM_ORAL',competency_ids:['COM_ORAL'],evaluation_criterion:'Expresa una propuesta y escucha la de un compañero.',expected_evidence:'Un comentario al decidir el lugar de las semillas.',official_performance_refs:['PCI2016.COM_ORAL.4.01'],mediation_notes:'Muestra las semillas, escucha sus propuestas y anota sus preguntas.',child_decisions:'Eligen qué pregunta investigar y cómo guardar sus registros.',flexibility_notes:'Pueden señalar, hablar o dibujar para proponer.'}));
 if(kind==='experience')return {...base,subtype:'project',title:'¿Qué cambia en nuestras semillas?',starts_on:'2026-04-13',ends_on:'2026-04-15',source_proposal_index:1,content:{document_template_version:'experience-unified-v2',purpose:'Observar cambios y conversar sobre lo que encontramos.',starting_point:'Los niños encontraron semillas en el patio.',spaces_and_materials:['Semillas','Recipientes transparentes','Papel','Crayones'],activity_route:route,
  project_master:{meaningful_situation:'Los niños del aula LILA del Jardín de prueba encontraron semillas en el patio y preguntaron qué podía salir de ellas. Al compararlas, propusieron mirar qué cambiaría al cuidarlas. El proyecto permitirá probar sus ideas y contar lo que encuentren.',document_planning:{shared_challenge:'¿Qué cambiará en las semillas y cómo podemos averiguarlo?',planning_with_children:route[0].mediation_notes,child_decisions:route[0].child_decisions,organization:'Trabajan en una mesa compartida con materiales al alcance.',mediation:'Pregunta qué cambió y pide mostrarlo en el recipiente.',age_support:'Permite señalar el cambio antes de explicarlo.',closing_review:'Vuelvan a sus preguntas y registros, comparen lo observado y decidan qué continuar.',transversal_approaches:[{name:'Enfoque ambiental',attitude:'Cuidan las semillas y los recipientes.',teacherAction:'Acompaña el cuidado sin reemplazar sus decisiones.'}]}},
  dependents:{general_criteria:[{competency_id:'COM_ORAL',criterion:'Expresa una propuesta y escucha la de un compañero.',expected_evidence:['Un comentario al decidir el lugar de las semillas.'],official_performance_refs:['PCI2016.COM_ORAL.4.01']}]}}};
 if(kind==='activity')return {...base,title:route[0].title,occurs_on:route[0].date,experience_title:'¿Qué cambia en nuestras semillas?',experience_details:{activity_route:route,source_proposal_snapshot:{supports:['Permite señalar y mostrar antes de explicar.']}},content:{document_template_version:'activity-unified-v1',route_item_id:route[0].id,purpose:'Proponer preguntas y acordar cómo observar las semillas.',competency_id:'COM_ORAL',evaluation_criterion:route[0].evaluation_criterion,expected_evidence:route[0].expected_evidence,official_performance_refs:route[0].official_performance_refs,meaningful_situation:'Reúne al grupo alrededor de las semillas encontradas.',child_actions:'Los niños miran las semillas, proponen preguntas y eligen qué observar.',mediation:'1. Pregunta qué desean averiguar.\n2. Anota las preguntas y ayúdalos a ordenar qué harán.\n3. Acuerden qué materiales necesitan.',closure_or_continuity:'Miren el plan y elijan con qué pregunta comenzar mañana.',child_decisions:route[0].child_decisions,materials:['Semillas','Papel','Crayones']}};
 const slots=Array.from({length:15},(_,i)=>({proposal_id:'tramo_'+(i+1)})),calendar=solveAnnualJourneyCalendar(fixtureCalendar(),slots);
 return {...base,kind:'annual_plan',title:'Mi año',document_context:{age:4,institution_name:base.institution_name,teacher_name:base.teacher_name,classroom_section:base.classroom},content:{journey_version:2,organization_criteria:['Alternamos proyectos, juego y rutinas con agrupamientos flexibles.'],classroom_snapshot:{student_count:2},proposed_experiences:slots.map((slot,i)=>({...slot,title:'Propuesta de prueba '+(i+1),purpose:'Explorar materiales y conversar sobre las preguntas del grupo.',invitation:'¿Qué deseamos averiguar?',opportunities:[{competency_id:'COM_ORAL',child_action:'Comparte una pregunta.',mediation:'Espera su respuesta.',observation:'Cómo comunica su pregunta.',official_performance_refs:[]}]})),everyday_opportunities:[],resolved_calendar:calendar}};
}
const xml=async bytes=>(await JSZip.loadAsync(bytes)).file('word/document.xml').async('string');

test('las dos entradas usan la misma estructura y palabras para anual, proyecto y actividad',async()=>{
 const cards=(await loadKnowledgeBaseV4()).competencyCards.map(c=>({...c,name:c.official_name}));
 for(const kind of ['annual_plan','experience','activity']){
  const ordinary=source(kind),before=JSON.stringify(ordinary),normalized=commonPlanningDocument(ordinary,cards,{roster}),generator=structuredClone(normalized);
  generator.curriculumReference=generator.curriculumReference.map(row=>{const copy={...row};delete copy.capacity_names;return copy;});
  const originalWord=await renderCommonPlanningWord(ordinary,cards,{roster}),generatorWord=await renderCommonPlanningWord(generator,cards);
  assert.equal(await xml(originalWord),await xml(generatorWord),kind+' debe producir exactamente el mismo cuerpo Word.');
  const a=await JSZip.loadAsync(originalWord),b=await JSZip.loadAsync(generatorWord);
  assert.deepEqual(Object.keys(a.files).sort(),Object.keys(b.files).sort());
  for(const name of Object.keys(a.files).filter(n=>!a.files[n].dir))assert.deepEqual(await a.file(name).async('nodebuffer'),await b.file(name).async('nodebuffer'),kind+' conserva también estilos, imágenes, cabeceras y propiedades.');
  assert.equal(JSON.stringify(ordinary),before);assert.match(await xml(originalWord),/Jardín de prueba/);
  if(kind==='experience')for(const label of ['Situación significativa','Planificación con los niños','Ruta breve de actividades','Cómo revisaremos el proyecto','Competencias y qué observar','Enfoques en la práctica'])assert.ok((await xml(originalWord)).includes(label));
  if(kind==='activity'){
   const body=await xml(originalWord);for(const label of ['Inicio · Qué harán los niños','Desarrollo · Qué harán los niños','Cierre · Qué harán los niños','Ana de prueba','Luis de prueba'])assert.ok(body.includes(label));
   assert.ok(body.indexOf('Referentes MINEDU')<body.indexOf('Qué observar (criterio)'),'La cita precede a su tabla para no quedar aislada después.');
   const rows=[...body.matchAll(/<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/g)].filter(r=>/Ana de prueba|Luis de prueba/.test(r[0]));assert.equal(rows.length,2);
   for(const row of rows)for(const cell of [...row[0].matchAll(/<w:tc\b[^>]*>[\s\S]*?<\/w:tc>/g)].slice(-2))assert.doesNotMatch(cell[0],/<w:t(?:\s[^>]*)?>\s*[^<\s]/);
  }
  if(process.env.AYNI_QA_DOCX_DIR){const title={annual_plan:'Plan anual',experience:'Proyecto',activity:'Actividad'}[kind];await mkdir(process.env.AYNI_QA_DOCX_DIR,{recursive:true});await writeFile(process.env.AYNI_QA_DOCX_DIR+'/'+title+' - Ayni original.docx',originalWord);await writeFile(process.env.AYNI_QA_DOCX_DIR+'/'+title+' - Generador.docx',generatorWord);}
 }
});

test('no inventa referentes, no mezcla edades y mantiene los registros reales aparte',async()=>{
 const cards=(await loadKnowledgeBaseV4()).competencyCards.map(c=>({...c,name:c.official_name}));
 const wrong=source('activity');wrong.content.official_performance_refs=['PCI2016.COM_ORAL.5.01'];assert.throws(()=>commonPlanningDocument(wrong,cards),/competencia y edad/);
 const actual={...source('activity'),registered_evidence:[{student_name:'Ana de prueba',observed_at:'2026-04-13',observation_text:'Dijo: quiero mirar la semilla más grande.',criterion_text:'Comunica su pregunta.'}],teacher_closure_note:'Retomar su pregunta al volver a mirar las semillas.'};
 const before=JSON.stringify(actual),body=await xml(await renderCommonPlanningWord(actual,cards,{roster}));assert.match(body,/Registros guardados en Ayni/);assert.match(body,/quiero mirar la semilla más grande/);assert.match(body,/Retomar su pregunta/);assert.equal(JSON.stringify(actual),before);
 const pending={...source('experience'),formal_ready:false};await assert.rejects(()=>renderCommonPlanningWord(pending,cards),/Prepara primero/);
 const annualDraft={...source('annual_plan'),status:'draft'};await assert.rejects(()=>renderCommonPlanningWord(annualDraft,cards),/Confirma tu año/,'Conserva el requisito anual ya existente.');
 const activityDraft={...source('activity'),status:'draft'};assert.ok((await renderCommonPlanningWord(activityDraft,cards,{roster})).length>0,'No añade confirmaciones a las actividades que ya permitían una descarga de borrador.');
});

test('ambas modalidades comparten política sin añadir requisitos a sus entradas',()=>{
 const request=buildProviderRequest('project_master',{context:'aula ficticia'},{},{});assert.ok(request.skill_instructions.includes(AYNI_PLANNING_RULES));
 assert.match(AYNI_PLANNING_RULES,/Planificamos el proyecto con los niños/);assert.match(AYNI_PLANNING_RULES,/Cada día retoma/);
 const other=buildProviderRequest('family_report',{}, {},{});assert.ok(!other.skill_instructions.includes(AYNI_PLANNING_RULES));
});

test('la presentación común conserva el taller vinculado y la preparación docente',async()=>{
 const cards=(await loadKnowledgeBaseV4()).competencyCards.map(c=>({...c,name:c.official_name}));
 const ordinary=source('activity');ordinary.content.teacher_preparation='Deja las semillas y los recipientes al alcance antes de reunir al grupo.';
 ordinary.content.document_template_version='activity-with-workshop-v1';
 ordinary.workshop={content:{workshop_type:'Arte',purpose:'Explorar formas con papel',opening:'Mirar el papel y elegir cómo empezar',development:'Crear formas doblando y combinando',closure:'Compartir lo que desean mostrar',materials:['papel']}};
 const before=JSON.stringify(ordinary),body=await xml(await renderCommonPlanningWord(ordinary,cards,{roster}));
 for(const value of ['Antes de empezar','Deja las semillas','Taller vinculado','Explorar formas con papel','Crear formas doblando y combinando','Ana de prueba'])assert.ok(body.includes(value),value);
 assert.doesNotMatch(body,/\{\{/);assert.equal(JSON.stringify(ordinary),before);
 if(process.env.AYNI_QA_DOCX_DIR)await writeFile(process.env.AYNI_QA_DOCX_DIR+'/activity-linked-workshop.docx',await renderCommonPlanningWord(ordinary,cards,{roster}));
});

test('los layouts comunes instalados son idénticos entre los dos checkouts locales',async()=>{
 if(!process.env.AYNI_PEER_ROOT)return;
 for(const name of ['ayni-planning-document.mjs','ayni-planning-policy.mjs','document-generator-practical-word.mjs','document-generator-project-cards-word.mjs','document-generator-activity-cards-word.mjs','document-generator-observation-register-word.mjs','document-generator-annual-map-word.mjs','multi-age-unified-word.mjs'])assert.deepEqual(await readFile('src/lib/'+name),await readFile(process.env.AYNI_PEER_ROOT+'/src/lib/'+name),name);
});
