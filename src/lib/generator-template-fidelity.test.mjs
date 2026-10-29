import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import JSZip from 'jszip';
import {makeMultiAgeDocumentFixture} from '../../scripts/fixtures/multi-age-document-fixture.mjs';
import {addActivityDocumentFixture} from '../../scripts/fixtures/multi-age-activity-document-fixture.mjs';
import {loadMultiAgeDocument,loadDocumentGeneratorProjectExport} from './multi-age-document-service.mjs';
import {renderMultiAgePlanningWord} from './multi-age-planning-word.mjs';

test('presentaciones 3 y 4 conservan estética y citas sin repetir bibliografía por competencia',{timeout:90000},async()=>{
 const f=await makeMultiAgeDocumentFixture();try{
  const a=await addActivityDocumentFixture(f);
  for(const presentation of [3,4,5,7,8])for(const [kind,id]of [['project',a.projectId],['activity',a.activityId]]){
   if(presentation===5&&kind==='project'||[7,8].includes(presentation)&&kind==='activity')continue;
   const d=await loadMultiAgeDocument(f.db,f.teacher,kind,id),before=JSON.stringify(d),copy=structuredClone(d);copy.content.documentPresentationVersion=presentation;
   const zip=await JSZip.loadAsync(await renderMultiAgePlanningWord(copy,{practical:true})),xml=await zip.file('word/document.xml').async('string');
   for(const family of copy.content.criteriaFamilies){
    assert.ok(xml.includes(copy.curriculumReference.find(r=>r.competency_id===family.competency_id).name));
    for(const v of family.variants){assert.ok(xml.includes(v.criterion_text));assert.ok(xml.includes(v.expected_evidence));}
   }
   assert.match(xml,/Referentes MINEDU/);assert.match(xml,/desempeños/);assert.match(xml,/HYPERLINK/);
   if(presentation===8)for(const match of xml.matchAll(/<w:t[^>]*>Referentes MINEDU/g)){
    const prefix=xml.slice(0,match.index),paragraphStart=prefix.lastIndexOf('<w:p>');
    assert.match(prefix.slice(paragraphStart),/<w:keepNext\/>/);
    const tail=xml.slice(match.index),paragraphEnd=tail.indexOf('</w:p>')+6;
    assert.ok(tail.slice(paragraphEnd).startsWith('<w:tbl>'),'La cita precede la tabla de su competencia para evitar quedar sola al pie.');
   }
   assert.equal((xml.match(/MINEDU · Programa Curricular de Educación Inicial/g)??[]).length,1);
   const template=await JSZip.loadAsync(await readFile(`assets/templates/${kind==='project'?'proyecto-unidad':'actividad-aprendizaje'}-inicial-unificada-v1.docx`));
   assert.equal(await zip.file('word/styles.xml').async('string'),await template.file('word/styles.xml').async('string'));
   for(const part of Object.keys(template.files).filter(n=>n.startsWith('word/media/')&&!template.files[n].dir))assert.deepEqual(await zip.file(part).async('nodebuffer'),await template.file(part).async('nodebuffer'));
   for(const ref of copy.curriculumReference)for(const p of ref.official_performances){assert.ok(xml.includes(`p. ${p.printed_page}`));}
   assert.equal(JSON.stringify(d),before);
  }
 }finally{await f.db.close();}
});

test('cuadros de actividad conservan instrucciones, apoyos, currículo y exportaciones anteriores',{timeout:90000},async()=>{
 const f=await makeMultiAgeDocumentFixture();try{
  const a=await addActivityDocumentFixture(f),source=await loadMultiAgeDocument(f.db,f.teacher,'activity',a.activityId);
  source.content.documentPresentationVersion=4;
  source.content.activityPlanning={version:3,materials:[{name:'Papel y crayones',availability:'confirmed'}],childParticipation:'Los niños eligen qué pregunta retomar y cómo mostrar sus propuestas.',ageSupports:[3,4,5].map(age=>({age,mediation:`Pregunta propia de ${age} años.`,support:`Apoyo específico para participar a los ${age} años.`}))};
  const before=JSON.stringify(source),old=await JSZip.loadAsync(await renderMultiAgePlanningWord(source,{practical:true})),copy=structuredClone(source);copy.content.documentPresentationVersion=5;
  const rendered=await JSZip.loadAsync(await renderMultiAgePlanningWord(copy,{practical:true})),xml=await rendered.file('word/document.xml').async('string');
  for(const text of [source.content.purpose,...Object.values(source.content.commonSequence),source.content.activityPlanning.childParticipation,...source.content.activityPlanning.ageSupports.map(s=>`${s.mediation} ${s.support}`)])assert.ok(xml.includes(text),text);
  for(const family of source.content.criteriaFamilies)for(const variant of family.variants){assert.ok(xml.includes(variant.criterion_text));assert.ok(xml.includes(variant.expected_evidence));}
  for(const color of ['65AD8A','315C86','EBA33B'])assert.ok(xml.includes(color),'Distinguir los tres momentos con la paleta de Ayni.');
  assert.match(xml,/<w:tblHeader\/>/);assert.match(xml,/Cómo ayudar/);assert.match(xml,/estándar|Referentes MINEDU/);
  const again=await JSZip.loadAsync(await renderMultiAgePlanningWord(source,{practical:true}));
  assert.equal(await again.file('word/document.xml').async('string'),await old.file('word/document.xml').async('string'));
  assert.equal(await rendered.file('word/styles.xml').async('string'),await old.file('word/styles.xml').async('string'));
  for(const part of Object.keys(old.files).filter(n=>n.startsWith('word/media/')&&!old.files[n].dir))assert.deepEqual(await rendered.file(part).async('nodebuffer'),await old.file(part).async('nodebuffer'));
  assert.equal(JSON.stringify(source),before);
 }finally{await f.db.close();}
});

test('la presentación sencilla conserva criterios, evidencias, referentes y fuentes anteriores',{timeout:90000},async()=>{
 const f=await makeMultiAgeDocumentFixture();
 try{
  const a=await addActivityDocumentFixture(f);
  for(const [kind,id]of [['project',a.projectId],['activity',a.activityId]]){
   const document=await loadMultiAgeDocument(f.db,f.teacher,kind,id),original=JSON.stringify(document);
   const oldBytes=await renderMultiAgePlanningWord(document,{practical:true});
   const simple=structuredClone(document);simple.content.documentPresentationVersion=2;
   const body=await (await JSZip.loadAsync(await renderMultiAgePlanningWord(simple,{practical:true}))).file('word/document.xml').async('string');
   assert.match(body,/Competencias y qué observar/);
   assert.match(body,/Qué observar \(criterio\)/);
   assert.match(body,/Qué podría registrar \(evidencia\)/);
   if(kind==='activity'){
    assert.match(body,/Qué necesitas/);
    for(const text of Object.values(document.content.commonSequence))assert.ok(body.includes(text));
   }
   for(const family of document.content.criteriaFamilies)for(const v of family.variants){assert.ok(body.includes(v.criterion_text));assert.ok(body.includes(v.expected_evidence));}
   for(const ref of document.curriculumReference){assert.ok(body.includes(ref.name));for(const p of ref.official_performances)assert.ok(body.includes(p.id));}
   assert.equal(JSON.stringify(document),original);
   const oldAgain=await JSZip.loadAsync(await renderMultiAgePlanningWord(document,{practical:true}));
   const oldZip=await JSZip.loadAsync(oldBytes);
   assert.equal(await oldAgain.file('word/document.xml').async('string'),await oldZip.file('word/document.xml').async('string'),'La mejora es solo para documentos nuevos.');
  }
 }finally{await f.db.close();}
});

test('año, proyecto y actividad conservan estilos e ilustraciones de sus plantillas aprobadas',{timeout:90000},async()=>{
 const f=await makeMultiAgeDocumentFixture();
 try{
  const a=await addActivityDocumentFixture(f);
  for(const [kind,id,template]of [['annual_plan',f.plan.planId,'planificacion-anual-inicial-unificada-v1'],['project',a.projectId,'proyecto-unidad-inicial-unificada-v1'],['activity',a.activityId,'actividad-aprendizaje-inicial-unificada-v1']]){
   const document=await loadMultiAgeDocument(f.db,f.teacher,kind,id),before=JSON.stringify(document);
   const original=await JSZip.loadAsync(await readFile(`assets/templates/${template}.docx`));
   const options=kind==='project'?{activityRoute:(await loadDocumentGeneratorProjectExport(f.db,f.teacher,id)).activityRoute}:{};
   const zip=await JSZip.loadAsync(await renderMultiAgePlanningWord(document,options));
   assert.equal(await zip.file('word/styles.xml').async('string'),await original.file('word/styles.xml').async('string'),`${kind}: no sustituir la identidad tipográfica`);
   for(const name of Object.keys(original.files).filter(n=>n.startsWith('word/media/')&&!original.files[n].dir))assert.deepEqual(await zip.file(name).async('nodebuffer'),await original.file(name).async('nodebuffer'),`${kind}: ilustración original ${name}`);
   const xml=await zip.file('word/document.xml').async('string');
   assert.ok((xml.match(/<w:tbl>/g)??[]).length>=5,`${kind}: conservar las secciones estructuradas`);
   assert.doesNotMatch(xml,/\{\{|\[object Object\]|undefined|Regístralas en Hoy/);
   assert.equal(JSON.stringify(document),before,'Exportar no escribe ni modifica el contenido guardado.');
   if(kind!=='annual_plan'){
    const practical=await JSZip.loadAsync(await renderMultiAgePlanningWord(document,{...options,practical:true}));
    assert.equal(await practical.file('word/styles.xml').async('string'),await original.file('word/styles.xml').async('string'));
    for(const name of Object.keys(original.files).filter(n=>n.startsWith('word/media/')&&!original.files[n].dir))assert.deepEqual(await practical.file(name).async('nodebuffer'),await original.file(name).async('nodebuffer'));
    const body=await practical.file('word/document.xml').async('string');
    assert.match(body,/Sustento curricular/);assert.match(body,kind==='activity'?/Guía de la actividad/:/Ruta breve de actividades/);
    const breakAt=body.search(/<w:br\b[^>]*w:type="page"/);assert.ok(breakAt>=0);
    const content=body.slice(body.indexOf('</w:p>',breakAt)+6,body.lastIndexOf('<w:sectPr'));
    for(const paragraph of content.match(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)??[]){
     if(!/<w:t(?:\s|>)/.test(paragraph))continue;
     assert.match(paragraph,/<w:rFonts w:ascii="Poppins" w:hAnsi="Poppins"/,'La tipografía del cuerpo debe ser explícita para lectores que no heredan estilos.');
     assert.match(paragraph,/<w:jc w:val="left"\/>/,'Evitar texto estirado al justificar columnas estrechas.');
     assert.match(paragraph,/<w:suppressAutoHyphens\/>/,'Conservar palabras completas en las guías prácticas.');
    }
    const cover=body.slice(0,breakAt);
    assert.match(cover,kind==='activity'?/Competencias de la actividad/:/Competencias del proyecto/);
    for(const family of document.content.criteriaFamilies)assert.ok(cover.includes(document.curriculumReference.find(r=>r.competency_id===family.competency_id).name),'Las competencias focalizadas deben identificarse desde la portada.');
    assert.match(body,kind==='activity'?/Registro de observación para completar/:/Instrumento previsto: registro de observación/);
    assert.doesNotMatch(body,/Recorrido abierto del proyecto|Las actividades forman una ruta prevista|Cierre y continuidad|Cómo cerraremos el proyecto/);
    for(const family of document.content.criteriaFamilies)for(const variant of family.variants){assert.ok(body.includes(variant.criterion_text));assert.ok(body.includes(variant.expected_evidence));}
    for(const reference of document.curriculumReference)for(const performance of reference.official_performances)assert.ok(body.includes(performance.id));
    assert.doesNotMatch(body,/\{\{|undefined|\[object Object\]|Regístralas en Hoy/);
    assert.equal(JSON.stringify(document),before,'La guía práctica también conserva las fuentes anteriores.');
   }
  }
 }finally{await f.db.close();}
});
