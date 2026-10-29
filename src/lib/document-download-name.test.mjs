import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizedDownloadName,downloadContentDisposition,downloadNameFromDisposition,savedDocumentDownloadName,generatorFormatDownloadName,generatorWorkshopDownloadName} from './document-download-name.mjs';

const identity={school_year:2026,section:'CELESTE',ages:[3,4,5]};
const project={kind:'project',identity,version:1,content:{title:'Un lugar para cada uno',annualContext:{index:0}}};
test('nombres ordenables de proyecto, actividad y edición exacta',()=>{
 assert.equal(savedDocumentDownloadName(project),'P01 - Un lugar para cada uno - 2026 - Aula CELESTE.docx');
 const activity={kind:'activity',identity,version:1,content:{title:'Elegimos dónde jugar',position:2}};
 assert.equal(savedDocumentDownloadName(activity,{project}),'P01 - A02 - Elegimos dónde jugar - 2026 - Aula CELESTE.docx');
 assert.equal(savedDocumentDownloadName(activity,{project:{...project,version:2}}),'P01-v02 - A02 - Elegimos dónde jugar - 2026 - Aula CELESTE.docx');
 assert.equal(savedDocumentDownloadName({...project,content:{...project.content,annualContext:{index:9}}}).slice(0,3),'P10');
 assert.ok(!savedDocumentDownloadName({...project,content:{title:'Sin vínculo anual'}}).startsWith('P01'),'no inventa un número sin fuente');
 assert.equal(savedDocumentDownloadName({kind:'activity',school_year:2026,classroom:'CELESTE',content:{route_item_id:'a',title:'Jugamos'},experience_details:{activity_route:[{id:'a',number:3}]}},{project:{kind:'experience',source_proposal_index:2,version:1}}),'P03 - A03 - Jugamos - 2026 - Aula CELESTE.docx');
});
test('año, formatos y talleres distinguen período, edad, alumno y materiales',()=>{
 assert.equal(savedDocumentDownloadName({kind:'annual_plan',identity,version:2}),'Plan anual - 2026 - Aula CELESTE - v02.docx');
 const c={year:2026,section:'CELESTE',period:2,month:4,students:[{name:'Lucía Pérez'}]};
 assert.equal(generatorFormatDownloadName('attendance',c),'Registro de asistencia - 2026-04 - Aula CELESTE.docx');
 assert.equal(generatorFormatDownloadName('evaluation',c,{individual:true}),'Registro de evaluación - B02 - 2026 - Aula CELESTE - Lucía Pérez.docx');
 assert.equal(generatorFormatDownloadName('roster',c),'Nómina del aula - 2026 - Aula CELESTE.docx');
 assert.equal(generatorWorkshopDownloadName({title:'Jugamos con sonidos'},c,3),'Taller - Jugamos con sonidos - Guía - 3 años - 2026 - Aula CELESTE.docx');
 assert.equal(generatorWorkshopDownloadName({title:'Jugamos con sonidos'},c,4,'pdf'),'Taller - Jugamos con sonidos - Materiales - 4 años - 2026 - Aula CELESTE.pdf');
});
test('nombres seguros y cabecera UTF-8 sin inyección, rutas ni caracteres reservados',()=>{
 const filename=normalizedDownloadName(['P01','¿Quién soy? / Yo: "tú"\r\n','2026','Aula CELESTE']);
 assert.equal(filename,'P01 - ¿Quién soy Yo tú - 2026 - Aula CELESTE.docx');
 const header=downloadContentDisposition(filename);
 assert.doesNotMatch(header,/[\r\n]/);assert.match(header,/filename\*=UTF-8''/);
 assert.equal(downloadNameFromDisposition(header),filename);
 assert.match(header,/filename="P01 - Quien soy Yo tu - 2026 - Aula CELESTE.docx"/);
 assert.equal(normalizedDownloadName(['CON']),'Ayni - CON.docx');
 assert.ok(normalizedDownloadName(['A'.repeat(500)]).length<=185);
 assert.equal(downloadNameFromDisposition("attachment; filename*=UTF-8''..%2Fsecreto.docx",'seguro.docx'),'seguro.docx');
 assert.equal(downloadNameFromDisposition('attachment; filename="respaldo.docx"; filename*=UTF-8\'\'%ZZ'),'respaldo.docx');
 assert.equal(downloadNameFromDisposition(null,'seguro.docx'),'seguro.docx');
});
