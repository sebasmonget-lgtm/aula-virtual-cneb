import {readFile} from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {PDFDocument,StandardFonts,rgb,PageSizes,degrees} from "pdf-lib";
import {workshopCatalog} from "./workshop-catalog.mjs";
import {workshopForAge} from "./workshop-ages.mjs";
import {loadNativeWorkshopSource} from "./workshop-print-source.mjs";
import {hasWorkshopPrintMaterial,curatedWorkshopSheets} from "./workshop-print-material.mjs";

const navy=rgb(.09,.18,.32);
const printable=value=>Array.from(String(value??"").replace(/[\u0000-\u001f]/g,' ')).map(char=>
  /[\u0020-\u007e\u00a0-\u00ff“”‘’…•€]/u.test(char)?char:/[‐‑‒–—]/u.test(char)?'-':' '
).join('');
function lines(text,font,size,maxWidth){
  const rows=[];let current='';
  for(const word of printable(text).split(/\s+/)){
    if(current&&font.widthOfTextAtSize(current+' '+word,size)>maxWidth){rows.push(current);current='';}
    // Long unbroken names must not cross the printable boundary.
    for(const char of word){if(font.widthOfTextAtSize(current+char,size)>maxWidth){rows.push(current);current='';}current+=char;}
    current+=' ';
  }
  if(current.trim())rows.push(current.trim());return rows;
}
function text(page,value,x,y,{font,size=11,width=490,color=navy,lineHeight=size*1.45}={}){
  for(const line of lines(value,font,size,width)){page.drawText(line.trim(),{x,y,size,font,color});y-=lineHeight;}return y;
}

export function workshopPrintHeaderLayout(context,{width,height,font,bold,hasLogo=false}){
  const x=hasLogo?80:40,bodyWidth=width-x-108;
  const institution=lines(context.institution_name,bold,11,bodyWidth);
  const section=lines(`${context.section} · ${context.age} años`,font,10,bodyWidth);
  const name=lines(context.student_name?`Nombre: ${context.student_name}`:"Nombre: ________________________________________",font,10,width-72);
  const institutionY=height-45,sectionY=institutionY-Math.max(1,institution.length)*16;
  const boxBottom=sectionY-Math.max(1,section.length)*14+3,nameY=boxBottom-19;
  return {x,bodyWidth,institutionY,sectionY,boxBottom,nameY,contentTop:nameY-Math.max(1,name.length)*14-12};
}

export async function loadWorkshopPrintContext(db,{teacherId,studentId=null}){
  const classroom=(await db.query(`select c.id,c.section,coalesce(ip.display_name,c.institution_name) as institution_name,ag.age_years as age
    from classrooms c join school_years y on y.id=c.school_year_id join age_grades ag on ag.id=c.age_grade_id
    left join institution_profiles ip on ip.owner_user_id=c.teacher_id
    where c.teacher_id=$1 and y.owner_id=$1 and c.status='active' limit 1`,[teacherId])).rows[0];
  if(!classroom)throw new TypeError("Configura primero tu aula.");
  let student_name=null;
  if(studentId){
    const student=(await db.query("select concat_ws(' ',first_name,last_name) as name from students where id=$1 and classroom_id=$2",[studentId,classroom.id])).rows[0];
    if(!student)throw new TypeError("El niño no pertenece a tu aula.");student_name=student.name;
  }
  return {...classroom,age:Number(classroom.age),student_name};
}

/** One A4 print pipeline for original resources, verified sheets and old PNG links.
 * Never fetch a client URL or accept a filesystem path from the request. */
export async function renderWorkshopPrint({context,workshopId=null,resourceId=null,sheetId=null,legacyResource=null,logo=null}){
  const entry=workshopId?workshopCatalog.find(item=>item.id===workshopId):null;
  const workshop=entry&&workshopForAge(entry,context.age);
  if(workshopId&&!workshop)throw new TypeError("Este taller no corresponde a la edad del aula.");
  const sheets=workshop?curatedWorkshopSheets(workshop.id,context.age):[];
  if(sheetId&&!sheets.some(sheet=>sheet.id===sheetId))throw new TypeError('La ficha no pertenece a este taller o a la edad del aula.');
  const resource=resourceId?workshopCatalog.flatMap(item=>item.resources).find(item=>item.id===resourceId):null;
  if(resourceId&&!resource)throw new TypeError("El recurso no está disponible.");
  const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  pdf.setTitle(workshop?.title??resource?.title??legacyResource?.title??"Material Ayni");pdf.setAuthor("Ayni Aula");
  const logoImage=logo?await pdf.embedPng(await sharp(logo).png().toBuffer()):null;
  const header=(page,sourceLabel=null)=>{
    const {width:w,height:h}=page.getSize();
    const layout=workshopPrintHeaderLayout(context,{width:w,height:h,font,bold,hasLogo:Boolean(logoImage)});
    page.drawRectangle({x:28,y:layout.boxBottom,width:w-56,height:h-28-layout.boxBottom,color:rgb(.92,.97,.98)});
    text(page,context.institution_name,layout.x,layout.institutionY,{font:bold,size:11,width:layout.bodyWidth,lineHeight:16});
    text(page,`${context.section} · ${context.age} años`,layout.x,layout.sectionY,{font,size:10,width:layout.bodyWidth,lineHeight:14});
    if(logoImage)page.drawImage(logoImage,{x:37,y:h-64,width:34,height:34});
    text(page,context.student_name?`Nombre: ${context.student_name}`:"Nombre: ________________________________________",36,layout.nameY,{font,size:10,width:w-72,lineHeight:14});
    page.drawLine({start:{x:36,y:30},end:{x:w-36,y:30},color:rgb(.7,.86,.85),thickness:1});
    text(page,`${sourceLabel??'Ayni Aula · Material para acompañar el juego'} · ${pdf.getPageCount()}`,36,17,{font,size:8,width:w-72});
    return layout.contentTop;
  };
  const appendSource=async(bytes,printPages=null,sourceLabel=null,clockwiseRotation=0)=>{
    if(bytes.subarray(0,4).toString()==='%PDF'){
      const source=await PDFDocument.load(bytes);
      if(printPages!==null&&(!Array.isArray(printPages)||!printPages.length||new Set(printPages).size!==printPages.length||printPages.some(page=>!Number.isInteger(page)||page<1||page>source.getPageCount())))
        throw new TypeError('Las páginas infantiles de la ficha no están disponibles.');
      // Curated child pages are selected explicitly; the original source bytes,
      // including its separate teacher guidance, remain untouched.
      const indices=printPages===null?source.getPageIndices():printPages.map(page=>page-1);
      for(const index of indices){
        const original=source.getPage(index),box=original.getCropBox(),rotation=((original.getRotation().angle+clockwiseRotation)%360+360)%360;
        if(![0,90,180,270].includes(rotation))throw new TypeError('Revisa la orientación de la ficha.');
        const embedded=await pdf.embedPage(original,{left:box.x,bottom:box.y,right:box.x+box.width,top:box.y+box.height});
        const rotated=rotation===90||rotation===270,w=rotated?embedded.height:embedded.width,h=rotated?embedded.width:embedded.height;
        const page=pdf.addPage(w>h?[PageSizes.A4[1],PageSizes.A4[0]]:PageSizes.A4),contentTop=header(page,sourceLabel),{width}=page.getSize(),scale=Math.min((width-72)/w,(contentTop-38)/h);
        const x=(width-w*scale)/2+(rotation===180?embedded.width*scale:rotation===270?embedded.height*scale:0);
        const y=contentTop-h*scale+(rotation===90?embedded.width*scale:rotation===180?embedded.height*scale:0);
        page.drawPage(embedded,{x,y,width:embedded.width*scale,height:embedded.height*scale,rotate:degrees(-rotation)});
      }
    }else{
      const image=await pdf.embedPng(await sharp(bytes).png().toBuffer()),page=pdf.addPage(PageSizes.A4),contentTop=header(page);
      const scale=Math.min(523/image.width,(contentTop-38)/image.height);page.drawImage(image,{x:(595.28-image.width*scale)/2,y:contentTop-image.height*scale,width:image.width*scale,height:image.height*scale});
    }
  };
  const appendOriginal=async item=>{
    const source=await loadNativeWorkshopSource(item.url.split('/').at(-1).replace(/\.png$/,''));
    const image=await pdf.embedPng(source.image),page=pdf.addPage(PageSizes.A4),contentTop=header(page);
    const scale=Math.min((page.getWidth()-72)/source.width,(contentTop-38)/source.height),x=(page.getWidth()-source.width*scale)/2,y=contentTop-source.height*scale;
    page.drawImage(image,{x,y,width:source.width*scale,height:source.height*scale});
    for(const row of source.rows)page.drawText(printable(row.text),{x:x+row.x*scale,y:contentTop-row.y*scale,size:row.size*scale,font:row.bold?bold:font,color:row.white?rgb(1,1,1):navy});
  };
  if(legacyResource){
    // Keep the old authenticated download URL usable, with the same native,
    // revised resource that new workshop selections receive.
    if(legacyResource.id==='taller-05-psicomotricidad-rutas-que-inventamos-material')await appendOriginal({url:'/workshops/tarjetas-recorrido-motor.png'});
    else await appendSource(await readFile(legacyResource.download.path));
    return Buffer.from(await pdf.save());
  }
  if(resource){
    if(!/^\/workshops\/[a-z0-9-]+\.png$/.test(resource.url))throw new TypeError("Abre este recurso desde su taller.");
    await appendOriginal(resource);return Buffer.from(await pdf.save());
  }
  if(!workshop)throw new TypeError("Selecciona un taller.");
  // The teacher guide remains in Hoy and Word. This action prints only
  // child-facing sheets, stories, cards and other resources for the experience.
  if(!hasWorkshopPrintMaterial({resources:workshop.resources,workshopId:workshop.id,age:context.age}))
    throw new TypeError("Este taller no necesita material para imprimir. Consulta la guía en Hoy.");
  const selectedResources=sheetId?[]:workshop.resources;
  const standalone=selectedResources.filter(item=>/^\/workshops\/[a-z0-9-]+\.png$/.test(item.url));
  for(const item of standalone)await appendOriginal(item);
  for(const item of selectedResources.filter(item=>item.url.startsWith('/api/library/resources/'))){
    const {loadLibraryResources}=await import('../../scripts/library-resources.mjs');
    const original=(await loadLibraryResources()).find(row=>item.url===`/api/library/resources/${row.id}/download`&&row.age===context.age);
    if(!original)throw new TypeError("El material original del taller no está disponible.");
    await appendSource(await readFile(original.download.path));
  }
  for(const sheet of sheets.filter(sheet=>!sheetId||sheet.id===sheetId)){
    const bytes=await readFile(path.join(process.cwd(),'assets/workshop-resources/minedu',sheet.filename));
    const {createHash}=await import('node:crypto');if(createHash('sha256').update(bytes).digest('hex')!==sheet.sha256)throw new Error("La ficha no coincide con el original verificado.");
    if(!Array.isArray(sheet.print_pages))throw new TypeError('Revisa las páginas infantiles de esta ficha antes de imprimirla.');
    await appendSource(bytes,sheet.print_pages,sheet.source,sheet.clockwise_rotation??0);
  }
  return Buffer.from(await pdf.save());
}
