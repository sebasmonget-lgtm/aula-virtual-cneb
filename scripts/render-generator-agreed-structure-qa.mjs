// Read-only replay of previously accepted synthetic examples. No AI or teacher DB writes.
import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {renderMultiAgePlanningWord} from '../src/lib/multi-age-planning-word.mjs';

const outputRoot='output/generador-documentos/estructura-acordada-20261027';
const templates=await Promise.all([
 ['project','proyecto-unidad-inicial-unificada-v1','c8429192a79922c8e5f42b0ab28d0aed7f57d9c104bddcc00ee6cc6bb1094c34'],
 ['activity','actividad-aprendizaje-inicial-unificada-v1','fe475d2fb4d4259b543637322edb47c0dfa3647331daa2d367e42a6592eb6a11'],
].map(async([kind,name,expected])=>{
 const bytes=await readFile(`assets/templates/${name}.docx`),hash=createHash('sha256').update(bytes).digest('hex');
 assert.equal(hash,expected,'La plantilla aprobada debe conservar su identidad.');
 return {kind,name,hash,zip:await JSZip.loadAsync(bytes)};
}));
await mkdir(outputRoot,{recursive:true});
await writeFile(`${outputRoot}/artifact.md`,[
 '# Plantillas Ayni aprobadas',
 ...templates.map(t=>`${t.name}: ${t.hash}`),
 'Se reutilizan los maestros binarios, estilos, papelería e imágenes originales.',
 'Ediciones autorizadas: resumen de competencias en portada, estructura práctica del cuerpo, franjas pastel y pequeña ilustración Ayni procedente de los recursos del producto.',
 'Fuentes sintéticas previamente generadas con v21, reexportadas sin cambiar su contenido.',
 'No representa una generación real nueva con v23 ni modifica proyectos docentes.',
].join('\n'));
for(const round of [1,2]){
 const source=`output/generador-documentos/guia-concreta-real-20261027/round-${round}`,destination=`${outputRoot}/round-${round}`;
 const raw=await readFile(`${source}/documents.json`,'utf8'),documents=JSON.parse(raw),before=JSON.stringify(documents),files=await readdir(source);
 await mkdir(destination,{recursive:true});
 const bundle=new JSZip();let count=0;
 for(const document of [documents.project,...documents.activities]){
  const expectedPrefix=document.kind==='project'?'P01 - ':`P01 - A${String(document.content.position).padStart(2,'0')} - `;
  const names=files.filter(name=>name.startsWith(expectedPrefix)&&name.endsWith('.docx')&&(document.kind!=='project'||!/^P01 - A\d+ - /.test(name)));
  assert.equal(names.length,1,'La exportación anterior debe identificar un único archivo.');
  const bytes=await renderMultiAgePlanningWord(document,{practical:true,...(document.kind==='project'?{activityRoute:documents.activityRoute}:{})});
  const rendered=await JSZip.loadAsync(bytes),original=templates.find(t=>t.kind===document.kind).zip;
  assert.equal(await rendered.file('word/styles.xml').async('string'),await original.file('word/styles.xml').async('string'));
  for(const name of Object.keys(original.files).filter(name=>name.startsWith('word/media/')&&!original.files[name].dir))assert.deepEqual(await rendered.file(name).async('nodebuffer'),await original.file(name).async('nodebuffer'));
  const xml=await rendered.file('word/document.xml').async('string');
  assert.doesNotMatch(xml,/Recorrido abierto del proyecto|Cierre y continuidad|Cómo cerraremos el proyecto|\{\{|undefined/);
  assert.match(xml,document.kind==='project'?/Planificación con los niños/:/Registro de observación para completar/);
  const coverEnd=xml.search(/<w:br\b[^>]*w:type="page"/);assert.ok(coverEnd>=0);
  for(const family of document.content.criteriaFamilies){const name=document.curriculumReference.find(r=>r.competency_id===family.competency_id).name;assert.ok(xml.slice(0,coverEnd).includes(name));}
  await writeFile(`${destination}/${names[0]}`,bytes);bundle.file(names[0],bytes);count++;
 }
 assert.equal(JSON.stringify(documents),before,'La presentación no debe modificar las fuentes.');
 assert.equal(await readFile(`${source}/documents.json`,'utf8'),raw);
 const zipName=files.find(name=>name.endsWith('.zip'));assert.ok(zipName);
 await writeFile(`${destination}/${zipName}`,await bundle.generateAsync({type:'nodebuffer',compression:'DEFLATE'}));
 await writeFile(`${destination}/source-audit.json`,JSON.stringify({syntheticOnly:true,sourcePromptVersion:'v21',newAiCalls:0,documents:count,sourceSha256:createHash('sha256').update(raw).digest('hex'),unchanged:true},null,2));
 console.log(JSON.stringify({round,exported:count,templatesPreserved:true,sourcesUnchanged:true}));
}
