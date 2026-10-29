import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {loadKnowledgeBaseV4} from './knowledge-base-v4.mjs';
import {applicableCompetencyCards} from './competency-applicability.mjs';
import {GENERATOR_FORMATS,generatorDocumentSelection,generatorWorkshops} from './document-generator-service.mjs';
import {renderGeneratorFormat,renderGeneratorWorkshop} from './document-generator-word.mjs';

async function fixture(){
 const kb=await loadKnowledgeBaseV4();
 return {institution:'Jardín Ficticio',teacher:'Docente Ficticia',section:'Semillas',year:2026,ages:[3,4,5],period:2,month:2,ugel:'UGEL Ficticia',district:'Distrito Ficticio',director:'Dirección Ficticia',institutionCode:'COD-FICTICIO',planningContext:['Conversación privada que no es evidencia.'],
  students:[{id:'qa3',name:'Ana Ficticia',age:3,birthDate:'2023-02-10'},{id:'qa4',name:'Luis Ficticio',age:4,birthDate:''},{id:'qa5',name:'María Ficticia',age:5,birthDate:''}],
  competencies:[3,4,5].map(age=>({age,cards:applicableCompetencyCards(kb.competencyCards,age,{religionApplicable:false,castellanoL2Applicable:false}).map(card=>({id:card.id,name:card.official_name,reference:card.ages[String(age)]}))}))};
}
async function inspect(bytes){const zip=await JSZip.loadAsync(bytes);return {xml:await zip.file('word/document.xml').async('string'),headers:(await Promise.all(Object.keys(zip.files).filter(n=>/^word\/header\d+\.xml$/.test(n)).map(n=>zip.file(n).async('string')))).join('')};}

test('los siete formatos ya incluyen el colegio, docente, aula y alumnos sin registros dentro de Ayni',async()=>{
 const c=await fixture();
 for(const format of GENERATOR_FORMATS){
  const before=JSON.stringify(c),{xml,headers}=await inspect(await renderGeneratorFormat(format.id,c));
  for(const value of [c.institution,c.teacher,c.section,c.ugel,c.district,c.director,c.institutionCode,...c.students.map(s=>s.name)])assert.ok(xml.includes(value),`${format.id}: falta ${value}`);
  assert.ok(headers.includes(c.institution)&&headers.includes(c.teacher)&&headers.includes(c.section),`${format.id}: identificación repetida`);
  assert.doesNotMatch(xml,/Conversación privada que no es evidencia|undefined|\{\{|\[object Object\]/);
  if(format.id==='observations'){assert.match(xml,/w:trHeight w:val="1000"/);assert.match(xml,/Puedes dejar filas sin completar/);}
  if(format.id==='evaluation'){
   assert.match(xml,/C1/);assert.match(xml,/identifican competencias, no valoraciones/);
   for(const group of c.competencies)for(const card of group.cards)assert.ok(xml.includes(card.name));
   const matrices=[...xml.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>/g)].filter(m=>m[0].includes('Estudiante · edad')&&/<w:t(?:\s[^>]*)?>C1<\/w:t>/.test(m[0]));
   assert.equal(matrices.length,3,'Una primera matriz por cada grupo de edad.');
   for(const matrix of matrices)for(const row of [...matrix[0].matchAll(/<w:tr>[\s\S]*?<\/w:tr>/g)].slice(1))for(const blank of [...row[0].matchAll(/<w:tc>[\s\S]*?<\/w:tc>/g)].slice(1))assert.doesNotMatch(blank[0],/<w:t[^>]*>[^<]+<\/w:t>/);
  }
  assert.equal(JSON.stringify(c),before);
 }
});

test('las fichas individuales y los talleres conservan solo los alumnos y edades que corresponden',async()=>{
 const c=await fixture(),one=generatorDocumentSelection(c,{studentId:'qa4'});
 for(const kind of ['family','conclusions','diagnostic','evaluation']){
  const {xml}=await inspect(await renderGeneratorFormat(kind,one));
  assert.ok(xml.includes('Luis Ficticio'));assert.doesNotMatch(xml,/Ana Ficticia|María Ficticia/);
 }
 for(const age of c.ages){
  const w=generatorWorkshops(c,age)[0],before=JSON.stringify(c),{xml,headers}=await inspect(await renderGeneratorWorkshop(w,c));
  for(const s of c.students)assert.equal(xml.includes(s.name),s.age===age);
  for(const value of [c.institution,c.teacher,c.section,c.ugel,c.district,c.director,c.institutionCode])assert.ok(xml.includes(value));
  assert.ok(headers.includes(c.teacher));assert.match(xml,/w:trHeight w:val="900"/);
  assert.equal(JSON.stringify(c),before);
 }
});
