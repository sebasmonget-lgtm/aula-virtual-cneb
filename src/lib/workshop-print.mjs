import {readFile} from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {PDFDocument,StandardFonts,rgb,PageSizes} from "pdf-lib";
import {workshopCatalog} from "./workshop-catalog.mjs";
import {workshopForAge} from "./workshop-ages.mjs";

const navy=rgb(.09,.18,.32),teal=rgb(.03,.46,.55);
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
export async function renderWorkshopPrint({context,workshopId=null,resourceId=null,legacyResource=null,logo=null}){
  const entry=workshopId?workshopCatalog.find(item=>item.id===workshopId):null;
  const workshop=entry&&workshopForAge(entry,context.age);
  if(workshopId&&!workshop)throw new TypeError("Este taller no corresponde a la edad del aula.");
  const resource=resourceId?workshopCatalog.flatMap(item=>item.resources).find(item=>item.id===resourceId):null;
  if(resourceId&&!resource)throw new TypeError("El recurso no está disponible.");
  const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  pdf.setTitle(workshop?.title??resource?.title??legacyResource?.title??"Material Ayni");pdf.setAuthor("Ayni Aula");
  const logoImage=logo?await pdf.embedPng(await sharp(logo).png().toBuffer()):null;
  const header=page=>{
    const {width:w,height:h}=page.getSize();
    page.drawRectangle({x:28,y:h-72,width:w-56,height:44,color:rgb(.92,.97,.98)});
    text(page,context.institution_name,logoImage?80:40,h-45,{font:bold,size:11,width:w-150});
    text(page,`${context.section} · ${context.age} años`,logoImage?80:40,h-61,{font,size:10,width:w-150});
    if(logoImage)page.drawImage(logoImage,{x:37,y:h-64,width:34,height:34});
    page.drawText("Ayni",{x:w-75,y:h-51,font:bold,size:12,color:teal});
    text(page,context.student_name?`Nombre: ${context.student_name}`:"Nombre: ________________________________________",36,h-91,{font,size:10,width:w-72});
    page.drawLine({start:{x:36,y:30},end:{x:w-36,y:30},color:rgb(.7,.86,.85),thickness:1});
    text(page,`Ayni Aula · Material para acompañar el juego · ${pdf.getPageCount()}`,36,17,{font,size:8,width:w-72});
  };
  const appendSource=async bytes=>{
    if(bytes.subarray(0,4).toString()==='%PDF'){
      const source=await PDFDocument.load(bytes);
      for(const index of source.getPageIndices()){
        const embedded=await pdf.embedPage(source.getPage(index)),page=pdf.addPage(embedded.width>embedded.height?[PageSizes.A4[1],PageSizes.A4[0]]:PageSizes.A4);header(page);
        const {width,height}=page.getSize(),scale=Math.min((width-72)/embedded.width,(height-150)/embedded.height);
        page.drawPage(embedded,{x:(width-embedded.width*scale)/2,y:38,width:embedded.width*scale,height:embedded.height*scale});
      }
    }else{
      const image=await pdf.embedPng(await sharp(bytes).png().toBuffer()),page=pdf.addPage(PageSizes.A4);header(page);
      const scale=Math.min(523/image.width,690/image.height);page.drawImage(image,{x:(595.28-image.width*scale)/2,y:38,width:image.width*scale,height:image.height*scale});
    }
  };
  if(legacyResource){await appendSource(await readFile(legacyResource.download.path));return Buffer.from(await pdf.save());}
  if(resource){
    if(!/^\/workshops\/[a-z0-9-]+\.png$/.test(resource.url))throw new TypeError("Abre este recurso desde su taller.");
    await appendSource(await readFile(path.join(process.cwd(),'public',resource.url)));return Buffer.from(await pdf.save());
  }
  if(!workshop)throw new TypeError("Selecciona un taller.");
  const standalone=workshop.resources.filter(item=>/^\/workshops\/[a-z0-9-]+\.png$/.test(item.url));
  for(const item of standalone)await appendSource(await readFile(path.join(process.cwd(),'public',item.url)));
  for(const item of workshop.resources.filter(item=>item.url.startsWith('/api/library/resources/'))){
    const {loadLibraryResources}=await import('../../scripts/library-resources.mjs');
    const original=(await loadLibraryResources()).find(row=>item.url===`/api/library/resources/${row.id}/download`&&row.age===context.age);
    if(!original)throw new TypeError("El material original del taller no está disponible.");
    await appendSource(await readFile(original.download.path));
  }
  const curated=JSON.parse(await readFile(path.join(process.cwd(),'assets/workshop-resources/minedu/manifest.json'),'utf8'));
  for(const sheet of curated.filter(item=>item.workshop_id===workshop.id&&item.age===context.age)){
    const bytes=await readFile(path.join(process.cwd(),'assets/workshop-resources/minedu',sheet.filename));
    const {createHash}=await import('node:crypto');if(createHash('sha256').update(bytes).digest('hex')!==sheet.sha256)throw new Error("La ficha no coincide con el original verificado.");
    await appendSource(bytes);
  }
  // No unrelated worksheet is attached to fill a gap. A workshop without a
  // matching child sheet receives practical, reusable teacher support cards.
  if(!pdf.getPageCount()){
    let page=pdf.addPage(PageSizes.A4);header(page);
    let y=text(page,workshop.title,36,724,{font:bold,size:19,width:520});
    y=text(page,"Tarjetas de acompañamiento · Para la docente",36,y-4,{font,size:10,color:teal,width:520})-18;
    const imageId=({PSICO_MOTRICIDAD:'movement',COM_ARTE:'artistic_expression',COM_ORAL:'storytelling',COM_LECTURA:'book',COM_ESCRITURA:'writing',MAT_CANTIDAD:'numbers',MAT_FORMA:'shapes',CYT_INDAGA:'seed',PS_IDENTIDAD:'identity',PS_CONVIVE:'sharing'})[workshop.competency_id]??'book';
    let picture=null;
    try{picture=await pdf.embedPng(await sharp(await readFile(path.join(process.cwd(),'public/project-illustrations',imageId+'.webp'))).resize(240,240).png().toBuffer());}catch(error){if(error.code!=='ENOENT')throw error;}
    for(const [index,key]of ['opening','development','closure'].entries()){
      const body=workshop[key].children,cardHeight=Math.max(136,lines(body,font,12,365).length*18+54);
      if(y-cardHeight<65){page=pdf.addPage(PageSizes.A4);header(page);y=724;}
      page.drawRectangle({x:36,y:y-cardHeight,width:523,height:cardHeight,color:[rgb(.93,.97,.99),rgb(.93,.98,.95),rgb(.97,.94,.99)][index],borderWidth:.6,borderColor:rgb(.78,.87,.9)});
      text(page,["Para comenzar","Durante el juego","Para compartir"][index],51,y-24,{font:bold,size:13,width:360});
      text(page,body,51,y-49,{font,size:12,width:365});
      if(picture)page.drawImage(picture,{x:439,y:y-cardHeight+30,width:90,height:90});
      y-=cardHeight+14;
    }
    text(page,"Puedes recortar las tarjetas para tenerlas a mano. Acompaña el juego sin exigir una respuesta idéntica a todos.",36,y-3,{font,size:9,width:520});
  }
  return Buffer.from(await pdf.save());
}
