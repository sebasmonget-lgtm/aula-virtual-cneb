import {renderCommonPlanningWord,supportsCommonPlanning} from './ayni-planning-document.mjs';
import path from 'node:path';
import JSZip from 'jszip';
import { Document,Paragraph,TextRun,Packer,Table,TableRow,TableCell,WidthType,BorderStyle,VerticalAlign } from 'docx';
import { renderUnifiedWord,replaceWordText } from './unified-word-template.mjs';
import {renderMultiAgeUnifiedProject,renderMultiAgeUnifiedActivity,renderMultiAgeUnifiedAnnual} from './multi-age-unified-word.mjs';

const date=value=>{const raw=value instanceof Date?value.toISOString():String(value??'');if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return raw.split('-').reverse().join('/');
  return raw&&Number.isFinite(Date.parse(raw))?new Intl.DateTimeFormat('es-PE',{timeZone:'America/Lima',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(raw)):'Fecha no consignada';};
const namesFor=document=>new Map((document.kind==='diagnostic_student_review'?document.curriculumReference.competencies:document.kind==='diagnostic_group_review'?document.curriculumReference.flatMap(g=>g.competencies):document.curriculumReference).map(c=>[c.competency_id??c.id,c.name]));
const priorities={usual:'Atención habitual',consider:'Tener en cuenta al planificar',prioritize:'Priorizar oportunidades de acompañamiento'};

/** Pure projection of a confirmed snapshot. No database, live roster, current catalog or AI. */
export function multiAgePlanningDocumentSections(document){
  if(document?.contract!=='AyniMultiAgeDocument/v1'||document.curriculumContractVersion!==2||!['active','archived','confirmed'].includes(document.status))throw new TypeError('Confirma una versión multiedad antes de descargarla.');
  const names=namesFor(document),name=id=>names.get(id)??id,identity=document.identity;
  const sections=[{title:document.kind==='annual_plan'?`Mi año ${identity.school_year}`:document.kind==='diagnostic_group_review'?'Diagnóstico del grupo':['activity','project','workshop'].includes(document.kind)?document.content.title:`Diagnóstico de ${identity.student_name}`,level:'title'},
    {lines:[identity.institution_name,`Aula ${identity.section} · grupos de ${identity.ages.join(', ')} años`,identity.teacher_name?`Docente ${identity.teacher_name}`:'Docente del aula',`Versión ${document.version} confirmada el ${date(document.confirmedAt)}`].filter(Boolean)}];
  if(document.kind==='annual_plan'){
    sections.push({lines:['Este documento conserva la planificación confirmada y sus oportunidades por edad. La cobertura prevista no acredita logros ni ejecución de las actividades.']},
      {title:document.content.title,lines:[document.content.organization]},
      {title:'Recorrido del año',table:{headers:['Tramo','Fechas','Propuesta','Edades'],widths:[1000,2000,4300,1100],rows:document.calendar.projects.map((s,i)=>[String(i+1),`${date(s.starts_on)} al ${date(s.ends_on)}`,document.content.proposals[i].title,identity.ages.join(', ')])}},
      {title:document.calendar.initial_stage.name,lines:[`${date(document.calendar.initial_stage.starts_on)} al ${date(document.calendar.initial_stage.ends_on)}`,document.calendar.initial_stage.purpose,...document.calendar.initial_stage.what_to_observe]});
    for(const [i,p]of document.content.proposals.entries()){
      const slot=document.calendar.projects[i];if(slot.slot_id!==p.slot_id)throw new TypeError('La propuesta no conserva su posición en el calendario.');
      sections.push({title:`Tramo ${i+1} ${p.title}`,lines:[`${date(slot.starts_on)} al ${date(slot.ends_on)} · ${slot.duration_weeks} semanas · ${slot.instructional_dates.length} días lectivos`,
        ...(p.summary?[`De qué trata: ${p.summary}`]:[]),`Propósito compartido: ${p.purpose}`,...(p.rationale?[`Por qué proponemos este proyecto: ${p.rationale}`]:[]),`Invitación compartida: ${p.common_invitation}`,`Organización con una profesora: ${p.one_teacher_organization}`]});
      for(const o of p.opportunities)sections.push({title:`${o.age} años ${name(o.competency_id)}`,level:'subheading',lines:[`Qué podrá hacer: ${o.child_action}`,`Cómo acompañar: ${o.mediation}`,`Qué observar: ${o.observation}`,...(o.supports?[`Apoyos para participar: ${o.supports}`]:[]),
        o.official_performance_refs.length?`Referentes: ${o.official_performance_refs.join(', ')}.`:'Referente de ciclo sin desempeño específico publicado para esta edad.']});
    }
    sections.push({title:'Oportunidades cotidianas por edad',lines:['Estas oportunidades complementan los tramos. Son previsiones de enseñanza y observación; no representan logros confirmados.']});
    for(const age of identity.ages){
      sections.push({title:`Grupo de ${age} años`});
      for(const o of document.content.everyday_opportunities.filter(o=>o.age===age))sections.push({title:name(o.competency_id),level:'subheading',lines:[`Qué podrá hacer: ${o.child_action}`,`Cómo acompañar: ${o.mediation}`,`Qué observar: ${o.observation}`,
        o.official_performance_refs.length?`Referentes: ${o.official_performance_refs.join(', ')}.`:'Referente de ciclo sin desempeño específico publicado para esta edad.']});
    }
    const students=document.sourceSnapshot.students;
    sections.push({title:'Revisiones que se tuvieron en cuenta',lines:['Las revisiones individuales conservan sus fuentes. Una competencia pendiente no se transforma en dificultad ni en nivel de logro.'],
      table:{headers:['Grupo','Matriculados','Revisiones vigentes al guardar','Con lecturas sustentadas'],widths:[1550,1800,2850,2200],rows:identity.ages.map(age=>{const members=students.filter(s=>s.age===age);return [`${age} años`,String(members.length),String(members.filter(s=>s.current).length),String(members.filter(s=>s.current&&s.review?.findings.length).length)];})}},
      {lines:students.map(s=>`${s.review?.document_identity?.student_name??'Niño del grupo'} · ${s.age} años · revisión ${s.review_version??'no consignada'} · ${s.review?.pending_competency_ids?.length??0} competencias pendientes de información.`)},
      {title:'Referentes curriculares conservados',lines:['Los desempeños oficiales se citan por su ID estable y versión. Las referencias de ciclo que se indican como paráfrasis son orientaciones editoriales; no son transcripciones oficiales.']});
    for(const c of document.curriculumReference){
      sections.push({title:`${c.age} años ${c.name}`,level:'subheading',lines:[`Catálogo de desempeños: ${c.official_performance_version}.`,
        ...(c.official_performances.length?c.official_performances.map(p=>`${p.id}: ${p.text}`):[`Sin desempeño específico para esta edad. Referente de ciclo en paráfrasis: ${c.cycle_standard_ai}`]) ]});
    }
  }else if(['activity','project','workshop'].includes(document.kind)){
    const project=document.kind==='project';
    sections.push({lines:[...(project?[`Proyecto de aprendizaje · ${date(document.content.startsOn)} al ${date(document.content.endsOn)}`,
      `Datos del aula y referentes conservados desde Mi año versión ${document.sourceSnapshot.annualPlanVersion}.`,
      'Esta versión orienta la preparación de actividades. El índice actualizado se consulta en Documentos; cada actividad conserva sus propios criterios confirmados.']:
      document.kind==='workshop'?[`Taller compartido · Fecha prevista ${date(document.content.occursOn)}`,`Materiales: ${document.content.materials.join(', ')}`,`Preparación: ${document.content.preparation}`]:[`Proyecto ${document.content.projectTitle}`,`Actividad ${document.content.position} · Fecha prevista ${date(document.content.occursOn)}`]),
      'Una experiencia compartida con criterios propios para cada edad. Las oportunidades de observación no representan logros confirmados.']},
      ...(project&&document.content.meaningfulSituation?[{title:'Situación significativa',lines:[document.content.meaningfulSituation]}]:[]),
      {title:'Propósito compartido',lines:[document.content.purpose]},
      ...Object.entries({opening:'Inicio',development:'Desarrollo',closure:'Cierre'}).map(([key,title])=>({title,lines:[document.content.commonSequence[key]]})));
    for(const age of identity.ages){
      sections.push({title:`Qué observar en ${age} años`});
      for(const family of document.content.criteriaFamilies){
        const variant=family.variants.find(v=>v.curricular_age===age),reference=document.curriculumReference.find(c=>c.age===age&&c.competency_id===family.competency_id);
        if(!variant||!reference)throw new TypeError('El documento necesita conservar los criterios y referentes de cada edad.');
        sections.push({title:name(family.competency_id),level:'subheading',keepTogether:project,lines:[`Criterio: ${variant.criterion_text}`,`Qué podría observar: ${variant.expected_evidence}`,
          `Momentos para observar: ${variant.observation_moments.map(m=>({opening:'Inicio',development:'Desarrollo',closure:'Cierre'})[m]).join(', ')}.`,
          ...(reference.official_performances.length?[]:['Sin desempeño específico publicado para esta edad. Se conserva el referente de ciclo.'])]});
      }
    }
    sections.push({title:'Referentes curriculares por edad',lines:['Los desempeños orientan la observación; no se exige todo su alcance en una sola actividad.']});
    for(const reference of document.curriculumReference)sections.push({title:`${reference.age} años ${reference.name}`,level:'subheading',keepTogether:project,lines:[`Catálogo de desempeños ${reference.official_performance_version}.`,
      ...(reference.official_performances.length?reference.official_performances.map(p=>`${p.id}: ${p.text}`):[`Referente de ciclo en paráfrasis: ${reference.cycle_standard_ai}`])]});
  }else if(document.kind==='diagnostic_group_review'){
    sections.push({lines:['Esta revisión conserva las lecturas confirmadas de cada edad y sus fuentes individuales. La información pendiente no implica dificultades ni niveles de logro. Los relatos familiares se presentan separados como contexto.']});
    for(const group of document.content.groups){
      sections.push({title:`Grupo de ${group.age} años`,keepLinesWithTable:true,lines:[`Matriculados: ${group.enrolled}. Revisiones individuales vigentes al confirmar: ${group.reviewed}.`,
        'La tabla cuenta niños con registros de la profesora y con lecturas individuales confirmadas. Pendiente indica que falta confirmar una lectura; no indica dificultad.'],
        table:{headers:['Competencia','Registro','Lectura','Pendiente'],widths:[4500,1300,1300,1300],keepHeaderWithRow:true,rows:group.coverage.map(c=>[name(c.competency_id),`${c.withTeacherSources} de ${c.enrolled}`,`${c.withConfirmedReading} de ${c.enrolled}`,String(c.enrolled-c.withConfirmedReading)])}});
      const cycleOnly=document.curriculumReference.find(r=>r.age===group.age)?.official_performance_catalog.competencies.filter(c=>c.status==='no_age_specific_performance')??[];
      if(cycleOnly.length)sections.push({lines:[`Referentes de ciclo sin desempeño específico publicado para esta edad: ${cycleOnly.map(c=>name(c.competency_id)).join('; ')}. No se copian desempeños ni exigencias de otra edad.`]});
      const readings=document.content.readings.filter(r=>r.age===group.age);
      if(!readings.length)sections.push({lines:['Sin síntesis sustentada para esta edad. Continuar recogiendo información.']});
      for(const reading of readings){
        const sources=reading.review_ids.map(id=>document.content.eligibleReadings.find(r=>r.reviewId===id&&r.age===group.age&&r.competency_id===reading.competency_id));
        if(sources.some(s=>!s))throw new TypeError('La lectura del grupo no conserva sus fuentes de la misma edad y competencia.');
        sections.push({title:name(reading.competency_id),level:'subheading',keepTogether:true,lines:[reading.teacher_reading,priorities[reading.planning_priority],`Sustento individual: ${sources.length} de ${group.enrolled}.`,...sources.map(s=>`${s.studentName} · revisión ${s.reviewVersion}: ${s.teacher_reading}`)]});
      }
    }
    sections.push({title:'Organización e intenciones para acompañar',lines:[document.content.organization||'La profesora continuará precisando la organización.','Estas intenciones orientan la planificación; no son logros observados.']},
      {title:'Lo que cuentan las familias',lines:['Contexto familiar confirmado. No se utiliza para atribuir competencias, niveles ni actuaciones observadas por la profesora.',...(document.content.familyContexts.length?document.content.familyContexts.map(f=>`${f.studentName} · grupo de ${f.age} años · entrevista ${f.version}: ${f.text}`):['No se habían confirmado relatos familiares. La información queda pendiente.'])]});
  }else if(document.kind==='diagnostic_student_review'){
    const age=document.curriculumSnapshot.age,sources=document.sourceSnapshot.observations,sourceNumbers=new Map(sources.map((o,i)=>[o.id,i+1]));
    sections.push({lines:[`Grupo curricular confirmado de ${age} años. Esta lectura conserva lo observado y revisado por la profesora. No asigna una valoración final del período.`]},
      {title:'Observaciones de la profesora',lines:sources.length?[]:['No se habían registrado observaciones en esta revisión. La información queda pendiente.']});
    for(const [i,o]of sources.entries())sections.push({title:`Registro ${i+1} ${name(o.competency_v4_id)}`,level:'subheading',lines:[date(o.observed_at),o.observation_text,
      `Referente pedagógico de ${age} años en paráfrasis: ${o.curriculum_snapshot.age_reference}`,o.observation_status==='insufficient_information'?'Información insuficiente para sostener una lectura.':'Registro observado; su interpretación corresponde a la profesora.']});
    sections.push({title:'Lo que cuenta la familia',lines:document.sourceSnapshot.family?[document.sourceSnapshot.family.details.family_text,'Relato familiar conservado como contexto. No sustituye la observación de la profesora ni acredita logros.']:['No se había confirmado un relato familiar textual en esta revisión.']},
      {title:'Lecturas confirmadas por la profesora',lines:document.content.findings.length?[]:['No se formularon lecturas sustentadas. Se continuará recogiendo información.']});
    for(const f of document.content.findings){if(f.observation_ids.some(id=>!sourceNumbers.has(id)))throw new TypeError('Una lectura no conserva sus fuentes originales.');
      sections.push({title:name(f.competency_id),level:'subheading',lines:[f.teacher_reading,priorities[f.planning_priority],`Sustento: registros ${f.observation_ids.map(id=>sourceNumbers.get(id)).join(', ')}.`]});}
    sections.push({title:'Información que falta recoger',lines:document.content.pendingCompetencyIds.length?document.content.pendingCompetencyIds.map(name):['La profesora no dejó competencias pendientes en esta revisión. Esto no implica niveles finales.']},
      {title:'Referencia curricular de esta revisión',lines:[`Base de conocimiento ${document.curriculumReference.knowledge_version}. Catálogo de desempeños ${document.curriculumReference.official_performance_catalog.version}.`,
        `Los referentes y las fuentes pertenecen al grupo de ${age} años de este niño. La falta de desempeño específico de una edad no autoriza copiar el de otra.`]});
  }else throw new TypeError('Tipo de documento multiedad no disponible.');
  return sections;
}

export async function renderMultiAgePlanningWord(document,options={}){
  const latest= document.kind==='annual_plan'&&document.documentPresentationVersion===2||document.kind==='project'&&document.content.documentPresentationVersion===8||document.kind==='activity'&&document.content.documentPresentationVersion===7;
  if(options.practical&&latest&&supportsCommonPlanning(document))return renderCommonPlanningWord(document,[],options);
  if(document.kind==='annual_plan'){multiAgePlanningDocumentSections(document);return renderMultiAgeUnifiedAnnual(document,options);}
  if(document.kind==='project'){multiAgePlanningDocumentSections(document);return renderMultiAgeUnifiedProject(document,options);}
  if(['activity','workshop'].includes(document.kind)){multiAgePlanningDocumentSections(document);return renderMultiAgeUnifiedActivity(document,options);}
  const sections=multiAgePlanningDocumentSections(document),children=[];
  const run=(text,bold=false,size=22)=>new TextRun({text:String(text??''),font:'Poppins',size,bold,color:'000000'});
  const paragraph=(text,props={})=>new Paragraph({children:[run(text)],spacing:{after:100,line:276},widowControl:true,keepLines:true,...props});
  for(const section of sections){
    if(section.title)children.push(new Paragraph({...section.level==='title'?{style:'Title'}:{outlineLevel:section.level==='subheading'?1:0},
      keepNext:true,keepLines:true,spacing:{before:section.level==='title'?0:200,after:100},children:[run(section.title,true,section.level==='title'?32:section.level==='subheading'?23:26)]}));
    const lines=(section.lines??[]).filter(Boolean);
    for(const [index,line]of lines.entries())children.push(paragraph(line,section.keepLinesWithTable||section.keepTogether&&index<lines.length-1?{keepNext:true}:{}));
    if(section.table){const table=section.table,borders=Object.fromEntries(['top','bottom','left','right'].map(side=>[side,{style:BorderStyle.SINGLE,size:4,color:'D9D9D9'}]));
      const cell=(value,index,header=false)=>new TableCell({width:{size:table.widths[index],type:WidthType.DXA},verticalAlign:VerticalAlign.CENTER,borders,shading:{fill:header?'E4EEF2':'FFFFFF'},margins:{top:100,bottom:100,left:120,right:120},children:[new Paragraph({...(header&&table.keepHeaderWithRow?{keepNext:true}:{}),spacing:{after:30,line:260},children:[run(value,header,20)]})]});
      children.push(new Table({width:{size:8400,type:WidthType.DXA},columnWidths:table.widths,borders:{...borders,insideHorizontal:{style:BorderStyle.SINGLE,size:4,color:'D9D9D9'},insideVertical:{style:BorderStyle.SINGLE,size:4,color:'D9D9D9'}},rows:[new TableRow({tableHeader:true,children:table.headers.map((v,i)=>cell(v,i,true))}),...table.rows.map(row=>new TableRow({cantSplit:true,children:row.map((v,i)=>cell(v,i))}))]}),paragraph('',{spacing:{after:100}}));
    }
  }
  const bodyZip=await JSZip.loadAsync(await Packer.toBuffer(new Document({sections:[{children}]}))),bodyXml=await bodyZip.file('word/document.xml').async('string'),body=bodyXml.slice(bodyXml.indexOf('<w:body>')+8,bodyXml.lastIndexOf('<w:sectPr'));
  const bytes=await renderUnifiedWord({templateUrl:path.join(process.cwd(),'assets/templates/planificacion-anual-inicial-unificada-v1.docx'),compactTrailingSpace:true,
    values:{'AÑO_ESCOLAR':String(document.identity.school_year),INSTITUCION_EDUCATIVA:document.identity.institution_name??'',EDAD_AULA:document.identity.ages.map(a=>`${a} años`).join(', '),DOCENTE:document.identity.teacher_name??'',UGEL:''},
    transformPart(part,xml){const heading={diagnostic_student_review:'DIAGNÓSTICO INDIVIDUAL',diagnostic_group_review:'DIAGNÓSTICO DEL GRUPO',activity:'ACTIVIDAD DE APRENDIZAJE',workshop:'TALLER COMPARTIDO',project:'PROYECTO DE APRENDIZAJE'}[document.kind];return heading&&part.startsWith('word/header')?replaceWordText(xml,'PLANIFICACIÓN ANUAL',heading):xml;},
    transform(xml){const start=xml.indexOf('<w:body>')+8,end=xml.lastIndexOf('<w:sectPr');if(start<8||end<start)throw new TypeError('La plantilla no conserva su estructura Word.');return xml.slice(0,start)+body+xml.slice(end);}});
  // The source stationery has a blue Title rule. It is not part of these new report titles.
  const zip=await JSZip.loadAsync(bytes),styles=await zip.file('word/styles.xml')?.async('string');
  if(styles){
    const titleStyle=[...styles.matchAll(/<w:style\b[^>]*>[\s\S]*?<\/w:style>/g)].find(match=>/<w:name\b[^>]*w:val="Title"/.test(match[0]))?.[0],titleId=/w:styleId="([^"]+)"/.exec(titleStyle??'')?.[1];
    if(titleId){const xml=await zip.file('word/document.xml').async('string');zip.file('word/document.xml',xml.replaceAll('<w:pStyle w:val="Title"/>',`<w:pStyle w:val="${titleId}"/>`));}
    zip.file('word/styles.xml',styles.replace(/<w:style\b[^>]*>[\s\S]*?<\/w:style>/g,style=>/<w:name\b[^>]*w:val="Title"/.test(style)||/w:styleId="Title"/.test(style)?style.replace(/<w:pBdr\b[^>]*>[\s\S]*?<\/w:pBdr>/g,''):style));
  }
  return zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});
}
