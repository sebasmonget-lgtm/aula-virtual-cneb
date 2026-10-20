import test from "node:test";
import assert from "node:assert/strict";
import {PDFDocument,StandardFonts,PageSizes,PDFArray,PDFRawStream,PDFDict,PDFName,decodePDFRawStream} from "pdf-lib";
import {nativeWorkshopSource} from "./workshop-print-source.mjs";
import {workshopCatalog} from "./workshop-catalog.mjs";
import {workshopAges} from "./workshop-ages.mjs";
import {workshopForAge} from "./workshop-ages.mjs";
import {hasWorkshopPrintMaterial} from "./workshop-print-material.mjs";
import {workshopActivityDetails} from "./workshop-catalog.mjs";
import {activityPedagogicalBlocks} from "./pedagogical-blocks.mjs";
import curatedSheets from '../../assets/workshop-resources/minedu/manifest.json' with {type:'json'};
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadWorkshopPrintContext,renderWorkshopPrint,workshopPrintHeaderLayout} from "./workshop-print.mjs";

const normalize=value=>value.replace(/\s+/g,' ').trim();
function nativeText(pdf,page){
  const contents=page.node.Contents(),streams=contents instanceof PDFArray?contents.asArray():[contents];
  return streams.map(ref=>pdf.context.lookup(ref)).filter(stream=>stream instanceof PDFRawStream)
    .flatMap(stream=>[...Buffer.from(decodePDFRawStream(stream).decode()).toString().matchAll(/<([0-9a-f]+)>\s*Tj/gi)]
      .map(match=>new TextDecoder('windows-1252').decode(Buffer.from(match[1],'hex')))).join(' ');
}

test("encabezados largos reservan espacio para colegio, aula y nombre sin superponer la ficha",async()=>{
  const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const context={institution_name:'Institución Educativa Inicial Jardín de las Flores y los Niños Exploradores de Nuestra Comunidad',section:'Los Girasoles del Valle',age:5,student_name:'María Alejandra de los Ángeles Ramírez Fernández de la Cruz'};
  for(const [width,height] of [PageSizes.A4,[PageSizes.A4[1],PageSizes.A4[0]]])for(const hasLogo of [true,false]){
    const long=workshopPrintHeaderLayout(context,{width,height,font,bold,hasLogo});
    const short=workshopPrintHeaderLayout({...context,institution_name:'IE Sol',student_name:'Ana'},{width,height,font,bold,hasLogo});
    assert.ok(long.sectionY<=long.institutionY-16,'el aula empieza después del nombre del colegio');
    assert.ok(long.nameY<long.boxBottom&&long.contentTop<long.nameY-12,'nombre y ficha tienen espacios propios');
    assert.ok(long.contentTop<=short.contentTop&&long.contentTop>height/2,'reserva dinámica sin perder la zona de impresión');
    if(width<height)assert.ok(long.sectionY<short.sectionY,'un colegio que ocupa dos líneas desplaza el aula');
  }
});

test("la descarga imprime solo recursos infantiles y la guía de 252 variantes sigue disponible en Hoy",async()=>{
  let printable=0,withoutSheet=0;
  for(const entry of workshopCatalog)for(const age of workshopAges(entry)){
    const workshop=workshopForAge(entry,age),context={institution_name:'IE Semillas',section:'Los Girasoles',age,student_name:'Lucía Ramírez'};
    const details=workshopActivityDetails(workshop),blocks=activityPedagogicalBlocks(details,[],[{id:'criterion',competency_v4_id:workshop.competency_id,criterion_text:workshop.criterion}]);
    assert.equal(details.teacher_preparation,workshop.preparation);
    assert.equal(blocks.length,3);
    assert.equal(blocks[1].expected_actions,workshop.development.children);
    if(!hasWorkshopPrintMaterial({resources:workshop.resources,workshopId:workshop.id,age})){
      await assert.rejects(()=>renderWorkshopPrint({context,workshopId:workshop.id}),/no necesita material para imprimir/);
      withoutSheet++;continue;
    }
    const bytes=await renderWorkshopPrint({context,workshopId:workshop.id});
    assert.equal(bytes.subarray(0,4).toString(),'%PDF',workshop.id);
    const pdf=await PDFDocument.load(bytes);assert.ok(pdf.getPageCount()>0,workshop.id);
    for(const page of pdf.getPages()){
      assert.ok(Math.abs(Math.min(page.getWidth(),page.getHeight())-595.28)<.1);
      assert.ok(Math.abs(Math.max(page.getWidth(),page.getHeight())-841.89)<.1);
    }
    assert.equal(pdf.getTitle(),workshop.title);
    const printed=normalize(pdf.getPages().map(page=>nativeText(pdf,page)).join(' '));
    assert.doesNotMatch(printed,/La guía, paso a paso|Qué hace la profesora|Qué pueden hacer los niños/);
    printable++;
  }
  assert.equal(printable+withoutSheet,252);
  assert.ok(printable>0&&withoutSheet>0);
});

test('Nina descarga solo el cuento, sin las dos páginas docentes',async()=>{
  const workshop=workshopCatalog.find(w=>w.resources.some(r=>r.id==='la-torre-de-nina'));
  assert.ok(workshop);
  const pdf=await PDFDocument.load(await renderWorkshopPrint({context:{institution_name:'IE Semillas',section:'Girasoles',age:5},workshopId:workshop.id}));
  assert.equal(pdf.getPageCount(),1);
  const printed=normalize(nativeText(pdf,pdf.getPage(0)));
  assert.match(printed,/Nina/);
  assert.doesNotMatch(printed,/Para qué lo haremos|Antes de empezar|Qué observar|La guía, paso a paso/);
});

test('disponibilidad coincide con los recursos y la edad de las fichas oficiales',()=>{
  const workshopId='taller-biblioteca-mesa-para-munecos';
  for(const age of [3,4,5])assert.equal(hasWorkshopPrintMaterial({resources:[],workshopId,age}),age===4);
  assert.equal(hasWorkshopPrintMaterial({resources:[],workshopId}),false);
  assert.equal(hasWorkshopPrintMaterial({resources:null}),false);
  assert.equal(hasWorkshopPrintMaterial({resources:[{url:'https://ejemplo.com/imagen.png'}]}),false);
  assert.equal(hasWorkshopPrintMaterial({resources:[{url:'/workshops/../secret.png'}]}),false);
  assert.equal(hasWorkshopPrintMaterial({resources:[{url:'/workshops/la-torre-de-nina.png'}]}),true);
  assert.equal(hasWorkshopPrintMaterial({resources:[{url:'/api/library/resources/recurso-conocido/download'}]}),true);
});

test('las fichas descargadas imprimen solo la hoja infantil y conservan el original con su guía',async()=>{
  for(const sheet of curatedSheets){
    const original=await readFile(new URL('../../assets/workshop-resources/minedu/'+sheet.filename,import.meta.url));
    assert.equal(createHash('sha256').update(original).digest('hex'),sheet.sha256);
    const source=await PDFDocument.load(original);
    assert.equal(source.getPageCount(),sheet.original_page_count);
    assert.ok(sheet.print_pages.length>0);
    assert.ok(sheet.print_pages.every(n=>!sheet.teacher_guide_pages.includes(n)&&!sheet.blank_reverse_pages.includes(n)&&!sheet.excluded_unrelated_pages.includes(n)));
    const workshop=workshopForAge(workshopCatalog.find(w=>w.id===sheet.workshop_id),sheet.age);
    assert.ok(workshop);assert.equal(workshop.competency_id,sheet.competency_id);assert.ok(sheet.fit.length>25&&sheet.classroom_use.length>25);
    const pdf=await PDFDocument.load(await renderWorkshopPrint({context:{institution_name:'IE Semillas',section:'Girasoles',age:sheet.age},workshopId:sheet.workshop_id,sheetId:sheet.id}));
    assert.equal(pdf.getPageCount(),sheet.print_pages.length,sheet.id);
    for(const [index,pageNumber]of sheet.print_pages.entries()){
      const box=source.getPage(pageNumber-1).getCropBox(),resources=pdf.getPage(index).node.Resources().lookup(PDFName.of('XObject'),PDFDict);
      const form=pdf.context.lookup(resources.values()[0]);
      assert.deepEqual(form.dict.lookup(PDFName.of('BBox'),PDFArray).asArray().map(n=>n.asNumber()),[box.x,box.y,box.x+box.width,box.y+box.height]);
      assert.deepEqual(form.dict.lookup(PDFName.of('Matrix'),PDFArray).asArray().map(n=>n.asNumber()),[1,0,0,1,-box.x||0,-box.y||0],'conserva los bordes cuando el PDF original no empieza en cero');
    }
    assert.equal(createHash('sha256').update(await readFile(new URL('../../assets/workshop-resources/minedu/'+sheet.filename,import.meta.url))).digest('hex'),sheet.sha256,'imprimir no modifica el original');
  }
});

test('la curaduría amplía el uso y excluye páginas de otros desafíos sin perder recortables',()=>{
  assert.equal(curatedSheets.length,40);
  assert.equal(new Set(curatedSheets.map(s=>s.id)).size,40);
  assert.equal(new Set(curatedSheets.map(s=>s.workshop_id)).size,12);
  for(const s of curatedSheets){
    assert.deepEqual([...s.print_pages,...s.teacher_guide_pages,...s.blank_reverse_pages,...s.excluded_unrelated_pages].sort((a,b)=>a-b),Array.from({length:s.original_page_count},(_,i)=>i+1),s.id);
    assert.ok([0,90,180,270].includes(s.clockwise_rotation));
  }
  assert.deepEqual(curatedSheets.find(s=>s.id==='minedu_crea_4_014').print_pages,[1,3],'el rompecabezas conserva también sus piezas');
  assert.deepEqual(curatedSheets.find(s=>s.id==='minedu_juega_5_030').excluded_unrelated_pages,[3,4],'no incluye La Caperucita Roja en las adivinanzas');
  assert.deepEqual(curatedSheets.find(s=>s.id==='minedu_crea_5_025').excluded_unrelated_pages,[5,6],'no incluye El nabo gigante en el recorrido del río');
});

test('la revisión editorial conserva IDs y adapta las acciones a cada experiencia',()=>{
  assert.equal(workshopCatalog.find(w=>w.id==='taller-5-creamos-un-paisaje-sonoro').title,'Inventamos los sonidos de un lugar');
  for(const item of workshopCatalog)for(const age of workshopAges(item)){
    const w=workshopForAge(item,age),guide=[w.purpose,w.preparation,w.criterion,w.evidence,...['opening','development','closure'].flatMap(key=>[w[key].teacher,w[key].children])].join(' ');
    assert.doesNotMatch(guide,/grafías|cromática|perceptual|decodificación|timbres/i,`${w.id}:${age}`);
    assert.notEqual(w.opening.children,'Exploran los materiales, comunican lo que les interesa y eligen cómo participar.');
    assert.notEqual(w.closure.children,'Comparten una decisión o un descubrimiento con palabras, gestos, una demostración o un dibujo.');
  }
});
test("material PDF no permite rutas arbitrarias, una edad ajena o identificar niños de otro aula",async()=>{
  await assert.rejects(()=>renderWorkshopPrint({context:{age:3},workshopId:'taller-5-leemos-y-buscamos-pistas'}),/edad/);
  await assert.rejects(()=>renderWorkshopPrint({context:{age:5},resourceId:'../../secret'}),/disponible/);
  await assert.rejects(()=>renderWorkshopPrint({context:{age:5},workshopId:'taller-fichas-leemos-y-doblamos',sheetId:'minedu_crea_4_022'}),/no pertenece/);
  await assert.rejects(()=>renderWorkshopPrint({context:{age:5},workshopId:'taller-fichas-leemos-y-doblamos',sheetId:'minedu_crea_5_003'}),/no pertenece/);
  await assert.rejects(()=>renderWorkshopPrint({context:{age:5},workshopId:'taller-fichas-leemos-y-doblamos',sheetId:'../../secret'}),/no pertenece/);
  let calls=0;
  const db={query:async()=>({rows:++calls===1?[{id:'classroom',age:5}]:[]})};
  await assert.rejects(()=>loadWorkshopPrintContext(db,{teacherId:'teacher',studentId:'another-child'}),/no pertenece/);
});

test("los originales Ayni imprimen texto nativo y no una captura de las instrucciones",async()=>{
 const parsed=nativeWorkshopSource('<svg><text x="20" y="30" class="title">Pintamos con agua</text><text x="25" y="50" style="fill:white;font-size:28px">1</text><text x="25" y="80">Niños &amp; niñas</text></svg>');
 assert.equal(parsed.rows[0].size,48);assert.equal(parsed.rows[0].bold,true);assert.equal(parsed.rows[1].white,true);assert.equal(parsed.rows[2].text,'Niños & niñas');assert.ok(!parsed.artwork.includes('<text'));
 for(const resourceId of ['pintamos-con-agua','adivinanzas-con-pistas','cuento-la-semilla']){
  const pdf=await PDFDocument.load(await renderWorkshopPrint({context:{institution_name:'IE Semillas',section:'Girasoles',age:5},resourceId}));
  const contents=pdf.getPage(0).node.Contents(),streams=contents instanceof PDFArray?contents.asArray():[contents];
  const native=streams.map(ref=>pdf.context.lookup(ref)).filter(stream=>stream instanceof PDFRawStream).map(stream=>Buffer.from(decodePDFRawStream(stream).decode()).toString()).join('');
  assert.ok((native.match(/ Tj/g)??[]).length>20,resourceId+' conserva instrucciones como texto');
  assert.equal(pdf.getPageCount(),1);
  assert.equal(pdf.getPage(0).node.lookupMaybe(PDFName.of('Annots'),PDFArray)?.size()??0,0,'no añade enlaces externos a una ficha');
 }
});

test('el enlace antiguo de tarjetas motoras sirve la ficha nueva con texto nativo',async()=>{
  const pdf=await PDFDocument.load(await renderWorkshopPrint({context:{institution_name:'IE Sol',section:'Girasoles',age:5},
    legacyResource:{id:'taller-05-psicomotricidad-rutas-que-inventamos-material',download:{path:'no-debe-leer-un-png-antiguo'}}}));
  const printed=normalize(nativeText(pdf,pdf.getPage(0)));
  for(const action of ['Camina por la línea','Rodea los conos','Salta la línea','Lleva una bolsita','Gira despacio','Pasa por el aro'])assert.ok(printed.includes(action));
  assert.equal(pdf.getPageCount(),1);
});
