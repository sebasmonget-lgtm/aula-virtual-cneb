import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, ImageRun, PageNumber, Packer, Paragraph, Table, TableCell, TableLayoutType, TableRow, TextRun, VerticalAlign, WidthType } from 'docx';
import { competencyVisual } from './competency-visuals.mjs';
import { competencyLabels } from './competency-labels.mjs';
import { familyReportSectionForReader } from './family-report-presentation.mjs';
import { familyAttendanceChart } from './family-attendance-presentation.mjs';

const INK='173352',MUTED='456078',BORDER='D1E2EA',WIDTH=9914;
const levels={AD:{label:'Destacado',ink:'185E91',fill:'E6F2FF'},A:{label:'Esperado',ink:'12634E',fill:'DEF5E9'},B:{label:'En proceso',ink:'88520B',fill:'FFF2D5'},C:{label:'En inicio',ink:'A52C35',fill:'FFEDEF'}};
const clean=value=>typeof value==='string'?value.trim():'';
const list=value=>Array.isArray(value)?value.map(clean).filter(Boolean):[];
const date=value=>/^\d{4}-\d{2}-\d{2}/.test(value??'')?`${value.slice(8,10)}/${value.slice(5,7)}/${value.slice(0,4)}`:'';
const border={style:BorderStyle.SINGLE,size:4,color:BORDER};
const noBorder={style:BorderStyle.NONE,size:0,color:'FFFFFF'};
const noBorders={top:noBorder,bottom:noBorder,left:noBorder,right:noBorder,insideHorizontal:noBorder,insideVertical:noBorder};
const text=(value,options={})=>new TextRun({text:typeof value==='string'?value:'',font:'Poppins',size:21,color:INK,...options});
const paragraph=(value,options={})=>new Paragraph({children:[text(value)],spacing:{after:55,line:250},widowControl:true,...options});
const space=()=>new Paragraph({spacing:{before:0,after:0,line:100},children:[text('',{size:2})]});
const cell=(children,width,options={})=>new TableCell({width:{size:width,type:WidthType.DXA},verticalAlign:VerticalAlign.TOP,margins:{top:80,bottom:80,left:180,right:180},children,...options});
const table=(rows,widths=[WIDTH],options={})=>new Table({width:{size:WIDTH,type:WidthType.DXA},columnWidths:widths,layout:TableLayoutType.FIXED,borders:{top:border,bottom:border,left:border,right:border,insideHorizontal:border,insideVertical:border},rows,...options});
// Table rows keep each label with its content; keepNext inside cells chains whole tables across pages.
const label=(value,keepNext=false)=>new Paragraph({children:[text(value,{bold:true,size:19,color:'086C7C'})],keepNext,spacing:{before:20,after:40,line:240}});
const bullets=values=>list(values).map(value=>new Paragraph({children:[text(value)],numbering:{reference:'family-bullets',level:0},spacing:{after:50,line:250},widowControl:true}));
const group=(title,values)=>list(values).length?[label(title),...bullets(values)]:[];

function attendanceBlock(attendance){
  const chart=familyAttendanceChart(attendance);
  if(!chart)return [label('Asistencia del bimestre'),paragraph('Sin información de asistencia para este informe.')];
  const result=[label('Asistencia del bimestre',true),paragraph(chart.summary,{keepNext:chart.total>0})];
  if(chart.total){
    const barWidth=6714;
    const rows=chart.rows.map(row=>{
      const filled=Math.round(row.width/100*barWidth);
      const widths=[...(filled?[filled]:[]),...(filled<barWidth?[barWidth-filled]:[])];
      const bar=new Table({width:{size:barWidth,type:WidthType.DXA},columnWidths:widths,layout:TableLayoutType.FIXED,borders:noBorders,
        rows:[new TableRow({cantSplit:true,children:widths.map((width,index)=>cell([new Paragraph({spacing:{after:0,line:130},children:[text('',{size:1})]})],width,{margins:{top:0,bottom:0,left:0,right:0},shading:{fill:filled&&index===0?row.color.slice(1):'E7EDF3'}}))})]});
      return new TableRow({cantSplit:true,children:[cell([paragraph(row.label,{spacing:{after:0,line:225},children:[text(row.label,{size:18})]})],2200,{margins:{top:40,bottom:40,left:0,right:100}}),
        cell([bar],barWidth,{verticalAlign:VerticalAlign.CENTER,margins:{top:70,bottom:70,left:0,right:0}}),
        cell([paragraph(String(row.count),{alignment:AlignmentType.RIGHT,spacing:{after:0,line:225},children:[text(String(row.count),{size:18,bold:true})]})],1000,{margins:{top:40,bottom:40,left:100,right:0}})]});
    });
    result.push(table(rows,[2200,barWidth,1000],{borders:noBorders}));
  }
  result.push(paragraph(`${chart.note}${chart.asOf?` Corte: ${date(chart.asOf)}.`:''}`,{children:[text(`${chart.note}${chart.asOf?` Corte: ${date(chart.asOf)}.`:''}`,{size:16,color:MUTED})]}),space());
  return result;
}

async function portrait(photo){
  if(!photo?.data)return null;
  const {data,info}=await sharp(photo.data).rotate().resize({width:240,height:270,fit:'inside',withoutEnlargement:true}).png().toBuffer({resolveWithObject:true});
  const scale=Math.min(78/info.width,88/info.height);
  // Word requires a nonempty drawing name and unique document-wide IDs, including header images.
  return new ImageRun({data,type:'png',transformation:{width:Math.round(info.width*scale),height:Math.round(info.height*scale)},altText:{id:'1',name:'Foto del estudiante',title:'Foto del estudiante',description:'Foto de identificación del estudiante'}});
}

async function competencyIcon(id,index){
  if(!competencyVisual(id))return null;
  const svg=await readFile(path.join(process.cwd(),'public','competencies','compact',`${id.toLowerCase()}.svg`));
  const data=await sharp(svg,{density:288}).resize(80,80).png().toBuffer();
  return new ImageRun({data,type:'png',transformation:{width:20,height:20},altText:{id:String(index+2),name:`Competencia ${id}`,title:competencyLabels[id],description:'Símbolo de la competencia'}});
}

async function competencyBlock(section,names,achievementLevels,index){
  section=familyReportSectionForReader(section);
  const id=clean(section.competency_id),name=names.get(id)||competencyLabels[id]||'Aprendizajes observados';
  const theme=competencyVisual(id),fill=theme?.background.slice(1)??'EDF6FB',color=theme?.foreground.slice(1)??INK;
  const grade=achievementLevels.find(row=>row.competency_v4_id===id)?.achievement_level,gradeTheme=levels[grade];
  const icon=await competencyIcon(id,index),short=competencyLabels[id]??name;
  const header=[new Paragraph({heading:HeadingLevel.HEADING_2,keepNext:true,spacing:{after:45,line:285},children:[...(icon?[icon,text('  ')]:[]),text(short,{size:25,bold:true,color})]}),
    ...(short!==name?[paragraph(name,{keepNext:true,spacing:{after:0,line:225},children:[text(name,{size:17,color:INK})]})]:[])];
  const gradeCell=gradeTheme?[new Paragraph({alignment:AlignmentType.CENTER,keepNext:true,spacing:{after:15},children:[text(grade,{size:30,bold:true,color:gradeTheme.ink})]}),
    new Paragraph({alignment:AlignmentType.CENTER,keepNext:true,spacing:{after:0,line:220},children:[text(gradeTheme.label,{size:17,bold:true,color:gradeTheme.ink})]})]:[paragraph('Sin valoración',{keepNext:true,alignment:AlignmentType.CENTER})];
  const summary=clean(section.progress_summary)?[label('Lo que hemos visto'),paragraph(section.progress_summary)]:[];
  const examples=group('Así lo vimos',section.examples),support=group('Apoyos en el aula',section.support_or_conditions),next=group('Qué seguiremos trabajando',section.next_steps);
  const home=group('Ideas para casa',section.family_suggestions);
  const children=[new TableRow({cantSplit:true,tableHeader:true,children:[cell(header,WIDTH-1540,{columnSpan:2,shading:{fill}}),cell(gradeCell,1540,{shading:{fill:gradeTheme?.fill??fill}})]})];
  if(summary.length)children.push(new TableRow({cantSplit:true,children:[cell(summary,WIDTH,{columnSpan:3})]}));
  if(examples.length)children.push(new TableRow({cantSplit:true,children:[cell(examples,WIDTH,{columnSpan:3})]}));
  if(support.length&&next.length)children.push(new TableRow({cantSplit:true,children:[cell(support,4957,{shading:{fill:'F7FAFC'}}),cell(next,4957,{columnSpan:2,shading:{fill:'F7FAFC'}})]}));
  else if(support.length||next.length)children.push(new TableRow({cantSplit:true,children:[cell([...support,...next],WIDTH,{columnSpan:3})]}));
  if(home.length)children.push(new TableRow({cantSplit:true,children:[cell(home,WIDTH,{columnSpan:3,shading:{fill:'F2F9F5'}})]}));
  if(clean(section.insufficiency_note))children.push(new TableRow({cantSplit:true,children:[cell([label('Seguimos observando'),paragraph(section.insufficiency_note)],WIDTH,{columnSpan:3,shading:{fill:'FFF6E5'}})]}));
  return table(children,[4957,3417,1540]);
}

/** Presentation only: confirmed prose, grades and private photo remain source controlled. */
export async function renderFamilyReportWord(document,competencyCards=[],{logo=null,studentPhoto=null,attendance=null}={}){
  const value=document.content??{},names=new Map(competencyCards.map(card=>[card.id,card.name??card.official_name]));
  const photo=await portrait(studentPhoto),student=clean(document.title).replace(/^Informe a la familia de\s+/i,'');
  const period=clean(document.period_label)||'Informe histórico sin período formal',dates=[date(document.period_start),date(document.period_end)].filter(Boolean).join(' al ');
  const identification=[
    paragraph('Informe a la familia',{heading:HeadingLevel.TITLE,spacing:{after:80,line:300},children:[text('Informe a la familia',{size:34,bold:true})]}),
    paragraph(student,{keepNext:true,spacing:{after:90,line:300},children:[text(student,{size:29,bold:true})]}),
    paragraph([document.institution_name,document.classroom,(document.age??document.age_years)?`${document.age??document.age_years} años`:''].filter(Boolean).join(' · '),{spacing:{after:45,line:245}}),
    paragraph([period,dates].filter(Boolean).join(' · '),{spacing:{after:45,line:245}}),
    ...(clean(document.teacher_name)?[paragraph(`Docente: ${document.teacher_name}`,{spacing:{after:0,line:245},children:[text(`Docente: ${document.teacher_name}`,{size:18,color:MUTED})]})]:[]),
    ...(document.status==='draft'?[paragraph('Borrador por revisar',{children:[text('Borrador por revisar',{bold:true,color:'88520B',size:18})]})]:[]),
  ];
  const headerWidth=photo?WIDTH-1850:WIDTH;
  const intro=table([new TableRow({cantSplit:true,children:[cell(identification,headerWidth,{margins:{top:100,bottom:100,left:0,right:180}}),...(photo?[cell([new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:0},children:[photo]})],1850,{verticalAlign:VerticalAlign.CENTER})]:[])]})],photo?[headerWidth,1850]:[WIDTH],{borders:noBorders});
  const blocks=[];
  if(clean(value.introduction))blocks.push(label('En pocas palabras',true),paragraph(value.introduction));
  blocks.push(...attendanceBlock(attendance));
  blocks.push(new Paragraph({spacing:{after:150,line:230},children:[text('Valoración confirmada por la docente  ',{size:16,bold:true,color:MUTED}),...Object.entries(levels).flatMap(([grade,theme],index)=>[text(`${index?'   ·   ':''}${grade} ${theme.label}`,{size:16,color:theme.ink})])]}));
  for(const [index,section] of (Array.isArray(value.sections)?value.sections:[]).entries()){
    if(index>0)blocks.push(new Paragraph({pageBreakBefore:true,spacing:{before:0,after:0,line:20},children:[text('',{size:2})]}));
    blocks.push(await competencyBlock(section,names,document.achievement_levels??[],index),space());
  }
  if(clean(value.closing_note))blocks.push(label('Para seguir acompañando',true),paragraph(value.closing_note));
  if(clean(value.family_agreements))blocks.push(label('Acuerdos con la familia',true),paragraph(value.family_agreements));
  const rule=table([new TableRow({cantSplit:true,height:{value:45},children:['35648A','6FB58A','E7B04A'].map(fill=>cell([new Paragraph({spacing:{line:20,after:0},children:[text('',{size:1})]})],Math.floor(WIDTH/3),{shading:{fill},margins:{top:0,bottom:0,left:0,right:0}}))})],[3304,3305,3305],{borders:noBorders});
  const doc=new Document({title:clean(document.title),subject:'Informe a la familia',creator:'Ayni Aula',description:'family-report-readable-v2',
    styles:{default:{document:{run:{font:'Poppins',size:21,color:INK},paragraph:{spacing:{after:55,line:250}}}},
      paragraphStyles:[{id:'Normal',name:'Normal',run:{font:'Poppins',size:21,color:INK}}]},
    numbering:{config:[{reference:'family-bullets',levels:[{level:0,format:'bullet',text:'•',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:200,hanging:160}},run:{font:'Poppins',size:18,color:'086C7C'}}}]}]},
    sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1000,right:996,bottom:1000,left:996,header:450,footer:430}}},
      headers:{default:new Header({children:[new Paragraph({spacing:{after:55},children:[...(logo?[new ImageRun({data:logo,type:'png',transformation:{width:22,height:22},altText:{id:'1000',name:'Institución educativa'}}),text('  ')]:[]),text(clean(document.institution_name)||'Informe a la familia',{size:16,bold:true}),text(`   ·   ${document.school_year??''}`,{size:16,color:MUTED})]}),rule,space()]})},
      footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.RIGHT,children:[text(`${document.classroom??''}  ·  ${period}  ·  Página `,{size:15,color:MUTED}),new TextRun({children:[PageNumber.CURRENT],font:'Poppins',size:15,color:MUTED})]})]})},
      children:[intro,space(),...blocks]}]});
  return Packer.toBuffer(doc);
}
