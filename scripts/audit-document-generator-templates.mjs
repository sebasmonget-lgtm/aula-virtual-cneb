import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import JSZip from 'jszip';
import {PDFDocument} from 'pdf-lib';
import {renderWorkshopPrint} from '../src/lib/workshop-print.mjs';
import {loadKnowledgeBaseV4} from '../src/lib/knowledge-base-v4.mjs';
import {applicableCompetencyCards} from '../src/lib/competency-applicability.mjs';
import {GENERATOR_FORMATS,generatorDocumentSelection,generatorWorkshops} from '../src/lib/document-generator-service.mjs';
import {renderGeneratorFormat,renderGeneratorWorkshop} from '../src/lib/document-generator-word.mjs';
import {curatedWorkshopSheets} from '../src/lib/workshop-print-material.mjs';
import {makeMultiAgeDocumentFixture,documentFixtureRequest} from './fixtures/multi-age-document-fixture.mjs';
import {enqueueMultiAgeGeneration,loadMultiAgeGeneration,runMultiAgeGenerationStep} from '../src/lib/multi-age-generation-jobs.mjs';
import {multiAgeProviderForJob} from './multi-age-ai-runtime.mjs';
import {multiAgeAnnualContext} from '../src/lib/multi-age-annual.mjs';
import {confirmMultiAgeActivity} from '../src/lib/multi-age-local-service.mjs';
import {loadMultiAgeDocument} from '../src/lib/multi-age-document-service.mjs';
import {renderMultiAgePlanningWord} from '../src/lib/multi-age-planning-word.mjs';

const directory=path.resolve(process.env.AYNI_GENERATOR_TEMPLATE_QA_OUTPUT??'output/generador-documentos/revision-plantillas'),kb=await loadKnowledgeBaseV4();
await mkdir(directory,{recursive:true});
const c={institution:'Institución Educativa Inicial Jardín de prueba Los Girasoles',teacher:'Profesora María Elena de la Cruz Fernández',section:'Exploradores',year:2026,ages:[3,4,5],multi:true,
  ugel:'UGEL de prueba',district:'San Martín de Porres',director:'Directora de prueba',institutionCode:'0000000',
  planningContext:['La profesora indica que dispone de un patio y propone explorar materiales seguros. Es una decisión para planificar.'],
  students:[{id:'qa3',name:'Ana María Prueba',age:3,birthDate:''},{id:'qa4',name:'Luis Ángel Prueba',age:4,birthDate:'2022-02-15'},{id:'qa5',name:'Sofía de los Ángeles Prueba',age:5,birthDate:'2021-06-30'}],
  competencies:[3,4,5].map(age=>({age,cards:applicableCompetencyCards(kb.competencyCards,age,{}).map(card=>({id:card.id,name:card.official_name,reference:card.ages[String(age)]}))}))};
const selection=generatorDocumentSelection(c,{period:'2',month:'2'}),report={fictitious:true,networkAI:false,documents:[],workshops:[],resources:[],printablePdfs:[]};
const normalized=value=>String(value).replace(/\s+/g,' ').trim();
const visibleText=xml=>xml.replace(/<w:br[^>]*\/>|<\/w:p>|<\/w:tc>/g,'\n').replace(/<[^>]+>/g,'').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&apos;',"'").replaceAll('&amp;','&');
async function inspect(bytes){
  const zip=await JSZip.loadAsync(bytes),xml=await zip.file('word/document.xml').async('string');
  assert.ok(zip.file('[Content_Types].xml'));assert.ok(zip.file('word/styles.xml'));
  assert.doesNotMatch(xml,/\{\{|\[object Object\]|undefined|NaN/);
  return {zip,xml};
}
async function save(name,bytes){const {xml}=await inspect(bytes);await writeFile(path.join(directory,name),bytes);report.documents.push({name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),paragraphs:(xml.match(/<w:p[ >]/g)??[]).length});}

for(const format of GENERATOR_FORMATS)await save(`${format.id}.docx`,await renderGeneratorFormat(format.id,selection));
const child=generatorDocumentSelection(c,{studentId:'qa3'});
assert.deepEqual(child.ages,[3]);
const individual=await renderGeneratorFormat('diagnostic',child),individualXml=(await inspect(individual)).xml;
assert.ok(individualXml.includes('Grupo de 3 años'));assert.ok(!individualXml.includes('Grupo de 4 años'));assert.ok(!individualXml.includes('Luis Ángel Prueba'));
await save('diagnostico-individual-3.docx',individual);
const stress={...selection,students:Array.from({length:45},(_,i)=>({id:`stress-${i}`,age:[3,4,5][i%3],name:`${String(i+1).padStart(2,'0')} María Fernanda de los Ángeles Apellido Compuesto de Prueba`,birthDate:''}))};
await save('nomina-45-nombres-largos.docx',await renderGeneratorFormat('roster',stress));
await save('asistencia-45-febrero.docx',await renderGeneratorFormat('attendance',stress));

const chosenTypes=new Set(),savedWorkshopSamples=[];
for(const age of c.ages)for(const w of generatorWorkshops(c,age)){
  const bytes=await renderGeneratorWorkshop(w,{...selection,ages:[age]}),{xml}=await inspect(bytes);
  const required=[w.title,w.purpose,w.criterion,w.preparation,...w.materials,w.opening.children,w.opening.teacher,w.development.children,w.development.teacher,w.closure.children,w.closure.teacher,w.evidence];
  for(const value of required){assert.equal(typeof value,'string',`${w.id}: texto ausente`);assert.ok(normalized(visibleText(xml)).includes(normalized(value)),`${w.id}: texto perdido`);}
  for(const student of c.students)assert.equal(xml.includes(student.name),student.age===age,`${w.id}: alumno de otra edad`);
  report.workshops.push({id:w.id,age,complete:true,printable:w.printable});
  if(w.printable){
    const bytes=await renderWorkshopPrint({context:{institution_name:c.institution,section:c.section,age,student_name:c.students.find(student=>student.age===age).name},workshopId:w.id});
    const pdf=await PDFDocument.load(bytes);assert.ok(pdf.getPageCount()>0);
    if(!report.printablePdfs.some(item=>item.age===age))await writeFile(path.join(directory,`material-taller-${age}.pdf`),bytes);
    report.printablePdfs.push({workshopId:w.id,age,pages:pdf.getPageCount(),bytes:bytes.length});
  }
  if(!chosenTypes.has(w.type)&&savedWorkshopSamples.length<5){chosenTypes.add(w.type);const name=`taller-${age}-${savedWorkshopSamples.length+1}.docx`;await save(name,bytes);savedWorkshopSamples.push(name);}
  for(const sheet of curatedWorkshopSheets(w.id,age)){
    const data=await readFile(path.join('assets/workshop-resources/minedu',sheet.filename));
    assert.equal(createHash('sha256').update(data).digest('hex'),sheet.sha256);
    assert.ok(sheet.print_pages?.length);report.resources.push({workshopId:w.id,age,file:sheet.filename,sha256:sheet.sha256});
  }
}

const f=await makeMultiAgeDocumentFixture();
try{
  const annual=await loadMultiAgeDocument(f.db,f.teacher,'annual_plan',f.plan.planId);
  await save('plan-anual-multiedad.docx',await renderMultiAgePlanningWord(annual));
  const data=await multiAgeAnnualContext(f.db,f.teacher,f.classroom.classroomId),slot=data.calendar.projects[0];
  const input={classroomId:f.classroom.classroomId,annualPlanId:f.plan.planId,annualSlotId:slot.slot_id,occursOn:slot.instructional_dates[0],competencyIds:['COM_ORAL']};
  const job=await enqueueMultiAgeGeneration(f.db,f.teacher,{clientRequestId:randomUUID(),kind:'activity',...input},{mode:'fixture'});
  await runMultiAgeGenerationStep(f.db,{mode:'fixture',providerForJob:multiAgeProviderForJob(f.db,{AYNI_MULTI_AGE_AI_MODE:'fixture'})});
  const result=await loadMultiAgeGeneration(f.db,f.teacher,job.id);assert.equal(result.status,'ready');
  const saved=await confirmMultiAgeActivity(f.db,f.teacher,{...documentFixtureRequest(),...input,expectedRevision:1,blueprint:result.result.proposal,generationJobId:job.id});
  const projectId=(await f.db.query('select experience_id from activities where id=$1',[saved.activityId])).rows[0].experience_id;
  for(const [kind,id,name]of [['project',projectId,'proyecto-multiedad.docx'],['activity',saved.activityId,'actividad-multiedad.docx']])await save(name,await renderMultiAgePlanningWord(await loadMultiAgeDocument(f.db,f.teacher,kind,id)));
}finally{await f.db.close();}
await writeFile(path.join(directory,'audit.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({documents:report.documents.length,workshopVariants:report.workshops.length,verifiedResourceLinks:report.resources.length,printablePdfs:report.printablePdfs.length,directory}));
