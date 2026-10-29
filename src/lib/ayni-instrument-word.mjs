import path from 'node:path';
import JSZip from 'jszip';
import {renderUnifiedWord,replaceWordText,removeParagraphsContaining} from './unified-word-template.mjs';
import {keepShortRowsTogether,guideParagraph} from './teacher-guide-word-layout.mjs';

/** Instruments without a dedicated master reuse Ayni's retained cover and stationery. */
export async function renderAyniInstrumentWord({title,context,body,styles='',landscape=false,workshop=null}){
 const headerContext=[`${context.institution} · Aula ${context.section} · ${context.year}`,`Docente: ${context.teacher}`].map(line=>guideParagraph(line,{size:16,color:'526B87'}).replace(/<w:spacing\b[^>]*\/>/g,'<w:spacing w:before="0" w:after="15" w:line="190" w:lineRule="auto"/>').replace('<w:rPr>','<w:rPr><w:rFonts w:ascii="Poppins" w:hAnsi="Poppins"/>')).join('');
 body=body.replace(/<w:r>[\s\S]*?<\/w:r>/g,run=>run.includes('<w:rPr>')?run.replace('<w:rPr>','<w:rPr><w:rFonts w:ascii="Poppins" w:hAnsi="Poppins"/>'):run.replace('<w:r>','<w:r><w:rPr><w:rFonts w:ascii="Poppins" w:hAnsi="Poppins"/></w:rPr>'));
 const diagnostic=title==='Diagnóstico del aula';
 const split={ 'Nómina del aula':['NÓMINA','DEL AULA'],'Registro de observaciones':['REGISTRO','DE OBSERVACIONES'],
  'Registro de evaluación':['REGISTRO','DE EVALUACIÓN'],'Conclusiones descriptivas':['CONCLUSIONES','DESCRIPTIVAS'],
  'Informe a la familia':['INFORME','A LA FAMILIA'],'Diagnóstico del aula':['EVALUACIÓN','DIAGNÓSTICA'] }[title]??['DOCUMENTO','DEL AULA'];
 const bytes=await renderUnifiedWord({templateUrl:path.join(process.cwd(),`assets/templates/${workshop?'taller-inicial-ayni-unificada-v1':diagnostic?'evaluacion-diagnostica-inicial-unificada-v1':'planificacion-anual-inicial-unificada-v1'}.docx`),compactTrailingSpace:true,
  values:{AÑO_ESCOLAR:String(context.year),INSTITUCION_EDUCATIVA:context.institution,EDAD_AULA:`${context.ages.join(', ')} años · ${context.section}`,DOCENTE:context.teacher,UGEL:context.ugel??'',N_ESTUDIANTES:String(context.students.length),...(workshop?{TITULO_TALLER:workshop.title,TIPO_TALLER:workshop.type??'',EDAD_OBJETIVO:`${workshop.age} años`,FECHA:''}:{})},
  transform(xml){
   const start=[...xml.matchAll(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g)].find(m=>m[0].replace(/<[^>]+>/g,'').includes('I. DATOS GENERALES'));
   if(!start)throw new Error('La plantilla Ayni no conserva la portada de instrumentos.');
   const lastTable=[...xml.slice(0,start.index).matchAll(/<w:tbl(?:\s[^>]*)?>/g)].at(-1);
   const coverEnd=lastTable&&xml.lastIndexOf('</w:tbl>',start.index)<lastTable.index?lastTable.index:start.index;
   let cover=removeParagraphsContaining(xml.slice(0,coverEnd),['Plantilla editable','Los campos {{','{{...}}']);
   if(!context.ugel)cover=cover.replace(/<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/g,row=>row.includes('{{UGEL}}')?'':row);
   if(diagnostic)cover=cover.replace(/<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/g,row=>row.includes('{{FECHA_INICIO_DIAGNOSTICO}}')?'':row);
   if(!workshop)cover=replaceWordText(replaceWordText(cover,'PLANIFICACIÓN',split[0]),'ANUAL',split[1]);
   if(landscape){const begin=xml.indexOf('<w:body>')+8;cover=xml.slice(0,begin);}
   let section=xml.slice(xml.lastIndexOf('<w:sectPr'));
   if(landscape)section=section.replace(/<w:pgSz\b[^>]*\/>/,'<w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>').replace(/<w:titlePg\b[^>]*\/>/,'');
   return cover+keepShortRowsTogether(body).replaceAll('w:val="Title"','w:val="AyniInstrumentTitle"').replaceAll('w:val="Heading2"','w:val="AyniInstrumentHeading"')+section;
  },transformPart(part,xml){
   if(!part.startsWith('word/header'))return xml;
   const titled=!workshop?replaceWordText(xml,'PLANIFICACIÓN ANUAL',title.toUpperCase()):xml;
   return titled.replace('</w:hdr>',headerContext+'</w:hdr>');
  }});
 const zip=await JSZip.loadAsync(bytes),original=await zip.file('word/styles.xml').async('string');
 const extra=[...styles.matchAll(/<w:style\b[^>]*>[\s\S]*?<\/w:style>/g)].map(m=>m[0]).filter(s=>/w:styleId="(?:Title|Heading2)"/.test(s)).map(s=>s.replace('w:styleId="Title"','w:styleId="AyniInstrumentTitle"').replace('w:styleId="Heading2"','w:styleId="AyniInstrumentHeading"').replace(/<w:pBdr\b[^>]*>[\s\S]*?<\/w:pBdr>/g,'')).join('');
 zip.file('word/styles.xml',original.replace('</w:styles>',extra+'</w:styles>'));
 return zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});
}
