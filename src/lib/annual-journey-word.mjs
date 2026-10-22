import path from "node:path";
import JSZip from "jszip";
import {renderUnifiedWord, removeParagraphsContaining} from "./unified-word-template.mjs";
import { annualDisplayTitle } from "./annual-year-editor.mjs";
import { annualTeacherText } from "./annual-teacher-display.mjs";
import { Document, Paragraph, Packer, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle } from "docx";
import { familyInterviewQuestionGroups } from "./family-interview-contract.mjs";
import * as interview from "./family-interview-contract.mjs";
import {competencyLabels} from './competency-labels.mjs';
import { annualFollowupForSnapshot, currentAnnualObservationCount } from './annual-current-context.mjs';

const sourceKinds = { observed: "Observación de aula", family_report: "Relato de la familia",
  teacher_context: "Contexto del aula", teacher_decision: "Decisión docente" };
const scopes = { individual: "Registro individual", subgroup: "Subgrupo", group: "Grupo", classroom: "Aula", teacher_defined: "Alcance definido por la docente" };
const familyLabels = { ...Object.fromEntries(familyInterviewQuestionGroups("").flatMap(group => group.questions).map(q => [q.key,q.title])),
  language_context: "Lenguas en casa", family_expectation: "Expectativa familiar", family_expectations: "Expectativas familiares",
  family_community_context: "Familia y comunidad", family_community_enjoyed: "Experiencias compartidas",
  other_interest_text: "Otros intereses", other_language_text: "Otra lengua", other_community_text: "Otras experiencias",
  home_activity_example: "Actividades en casa", participation_support_context: "Apoyos para participar",
  emotional_support_context: "Acompañamiento emocional", autonomy_context: "Autonomía",
  communication_emotional_context: "Comunicación de emociones", adaptation_context: "Adaptación",
  daily_routine_context: "Rutinas en casa", previous_education: "Experiencia educativa anterior" };
// Only translate field labels added by the family snapshot. Preserve every answer,
// including unrecognized legacy data, and never apply this to observed evidence.
const optionFields={communication_tags:['Comunicación',interview.interviewCommunicationOptions],emotional_support_tags:['Acompañamiento emocional',interview.interviewEmotionalSupportOptions],social_play_tags:['Formas de jugar',interview.interviewSocialPlayOptions],home_activity_tags:['Experiencias en casa',interview.interviewHomeActivityOptions],participation_support_tags:['Apoyos para participar',interview.interviewParticipationSupportOptions],primary_language_tag:['Lengua principal',interview.interviewLanguageOptions]};
const readableFamilyField=(key,value)=>{
  const [label,options]=optionFields[key]??[familyLabels[key]??key.replaceAll('_',' '),[]];
  if(key==='home_language_uses')return 'Lenguas y personas con quienes se comunica: '+value.map(row=>[interview.interviewLanguageLabel(row.language_tag),row.with_whom].filter(Boolean).join(' con ')).join('; ');
  const text=(Array.isArray(value)?value:[value]).map(id=>options.find(option=>option.id===id)?.label??String(id)).join(', ');
  return `${label}: ${text}`;
};
const sourceText = fact => fact.kind !== "family_report" ? fact.support_text : fact.support_text.split("\n").map(line => {
  if(line.trim().startsWith('{')){try{return Object.entries(JSON.parse(line)).map(([key,value])=>readableFamilyField(key,value)).join('\n');}catch{/* Historical free text remains literal. */}}
  const match=/^([a-z_]+): (.*)$/.exec(line);
  return match && familyLabels[match[1]] ? `${familyLabels[match[1]]}: ${match[2]}` : line;
}).join("\n");
const sourceQualifications = { literal_record_only: "Describe lo registrado; no acredita por sí solo un logro.",
  reported_not_observed: "Información referida por la familia; no es evidencia curricular observada.",
  teacher_reported: "Información proporcionada por la docente.",
  confirmed_teacher_interpretation: "Síntesis revisada por la docente; consultar sus registros de origen.",
  confirmed_teacher_decision_not_new_evidence: "Decisión docente; no añade evidencia de aprendizaje.",
  historical_source_preserved_for_trace: "Antecedente conservado; no describe por sí solo la situación actual." };
const interpretationLabels = { advance: "Posible avance", support_needed: "Posible necesidad de apoyo",
  ambiguous: "Información insuficiente para interpretar" };
const readableDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") ? value.split('-').reverse().join('/')
  : value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('es-PE',{timeZone:'America/Lima',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(value)) : "Fecha no registrada";

/** A pure rendering of the confirmed object. No title regex, inference, prompt or enrichment. */
export function annualJourneyDocumentSections(plan, names = new Map(), subjects = {}) {
  if (plan.curriculum_reference) names = new Map(plan.curriculum_reference.map((card) => [card.id, card.name]));
  const facts = plan.classroom_snapshot.facts;
  const sources = new Map(facts.map((fact,index) => [fact.key,{ fact, number: index + 1 }]));
  const citedKeys=new Set([...plan.proposed_experiences.flatMap(row=>row.source_fact_keys),...plan.evidence_interpretations.flatMap(item=>item.fact_keys??[])]);
  const count = currentAnnualObservationCount(plan.classroom_snapshot);
  const sections = [{ title: 'Información disponible en esta versión', lines: [count
    ? `Esta versión incorpora ${count} ${count === 1 ? 'registro de observación' : 'registros de observación'}. Son actuaciones registradas; no representan por sí solas logros ni niveles confirmados.`
    : 'Esta versión todavía no incorpora actuaciones observadas. Los relatos familiares y las decisiones docentes se conservan como contexto.'] }];
  if (!plan.experience_context) sections.push({ title: "Ideas y decisiones docentes al preparar el año", lines: [plan.teacher_preferences].filter(Boolean) });
  if(plan.experience_context){
    sections.push({title:"Contexto inicial de planificación aprobado por la profesora",lines:plan.experience_context.context_items.map(item=>item.text)});
    sections.push({title:"Proyectos anteriores declarados",lines:plan.experience_context.historical_projects.length ? plan.experience_context.historical_projects.map(item=>`${item.title} · ${item.period?`Bimestre ${item.period}`:"Período no precisado"} · ${item.competency_ids.length?item.competency_ids.map(id=>names.get(id)??id).join("; "):"Competencias no declaradas"}. Declaración docente; no representa evidencias ni evaluaciones.`) : ["No se declararon proyectos anteriores."]});
    if(plan.resolved_calendar.planning_scope!=="full_year")sections.push({title:"Pasado sin registro en Ayni",lines:plan.resolved_calendar.projects.filter(slot=>slot.occupancy==="past_unrecorded").map(slot=>`Tramo ${slot.index}: ${slot.starts_on} al ${slot.ends_on}. No se generó trabajo retrospectivo.`)});
    sections.push({title:"Preparación desde el inicio en Ayni",lines:[plan.resolved_calendar.planning_scope==="full_year"?`El plan anual incluye quince propuestas. Las de fechas pasadas son solo para consulta; no acreditan trabajo realizado. Las actividades se preparan únicamente desde ${plan.experience_context.starts_on}.`:`Se preparan únicamente fechas desde ${plan.experience_context.starts_on}. El primer tramo puede tener menos días disponibles.`, ...(plan.future_coverage_gaps ?? []).map(id=>`${names.get(id)??id}: sin oportunidad futura prevista; no implica nivel ni ausencia de trabajo anterior.`)]});
  }
  const general = { organization_criteria: "Organización del año", transversal_approaches: "Enfoques transversales",
    teaching_strategies: "Acompañamiento", assessment_followup: "Observación y seguimiento",
    family_collaboration: "Familias y comunidad", inclusive_supports: "Apoyos para participar" };
  for (const [key, title] of Object.entries(general)) sections.push({ title, lines: key === 'assessment_followup' ? annualFollowupForSnapshot(plan[key], plan.classroom_snapshot) : plan[key] });
  const stage = plan.resolved_calendar.initial_stage;
  sections.push({ title: stage.name, lines: [...(plan.experience_context?.starts_on>stage.ends_on ? ["Período pasado: esta previsión no acredita ejecución ni diagnóstico registrado."]:[]),stage.purpose, `${stage.starts_on} al ${stage.ends_on}`,
    ...stage.suggested_experiences, ...stage.what_to_observe, ...(stage.family_actions ?? []), ...(stage.diagnostic_focus ?? []),
    ...(stage.teacher_notes ? [stage.teacher_notes] : [])] });
  for (const [index, row] of plan.proposed_experiences.entries()) {
    const slot=plan.resolved_calendar.projects.find(slot=>slot.proposal_id===row.proposal_id);
    const duration=slot?.historical_dates?.length?`${row.planned_instructional_days} días restantes del tramo`: `${row.duration_weeks} ${row.duration_weeks === 1 ? "semana" : "semanas"} · ${row.planned_instructional_days} días lectivos`;
    sections.push({ title: `${slot?.index ?? index + 1}. ${annualDisplayTitle(row.title)}`, lines: [`Situación que da origen: ${row.rationale}`, `Propósito: ${row.purpose}`, `Reto para los niños: ${row.invitation}`,
      ...row.children_actions.map(text=>`Qué harán: ${text}`), `${readableDate(row.planned_start_date)} al ${readableDate(row.planned_end_date)} · ${duration}`] });
    for (const opportunity of row.opportunities) sections.push(opportunitySection(opportunity, names));
    sections.push({ title: "Materiales, apoyos y flexibilidad", lines: [`Materiales: ${row.materials.join('; ')}`,`Apoyos: ${row.supports.join(' ')}`, row.flexibility] });
  }
  for (const opportunity of plan.everyday_opportunities) sections.push({ ...opportunitySection(opportunity, names),
    title: `${opportunity.moment} · ${names.get(opportunity.competency_id) ?? opportunity.competency_id}` });
  sections.push({ title: plan.interpretation_review?.status==="reviewed"?"Interpretaciones revisadas por la docente":"Interpretaciones propuestas por Ayni · pendientes de revisión docente", lines: plan.evidence_interpretations.map((x) =>
    `${scopes[x.scope] ?? "Alcance no precisado"} · ${interpretationLabels[x.meaning] ?? "Interpretación para revisar"}: ${x.interpretation}${x.fact_keys?.length?` Fuentes: ${x.fact_keys.map(key=>sources.get(key)?.number).filter(Boolean).join(', ')}.`:''}`) });
  if (plan.insufficient_interpretations?.length) sections.push({title:"Información que todavía necesitamos conocer",lines:[
    `En ${plan.insufficient_interpretations.length} posibles interpretaciones todavía faltaba sustento. Conservamos los registros sin concluir que exista un avance o una dificultad.`]});
  sections.push({ title: "Calendario efectivo", lines: [`Versión: ${plan.resolved_calendar.calendar_version.version}`,
    `${plan.resolved_calendar.integrity.assigned} de ${plan.resolved_calendar.integrity.eligible} fechas previstas; ${plan.resolved_calendar.integrity.gaps} sin asignar; ${plan.resolved_calendar.integrity.overlaps} solapamientos.`] });
  sections.push({title:'Anexo · Referencias por propuesta',lines:plan.proposed_experiences.map((row,index)=>{
    const slot=plan.resolved_calendar.projects.find(slot=>slot.proposal_id===row.proposal_id);
    const references=row.source_fact_keys.map(key=>sources.has(key)?`fuente ${sources.get(key).number}`:'referencia no disponible').join('; ');
    return `${slot?.index??index+1}. ${annualDisplayTitle(row.title)}: ${references||'Invitación curricular; sin observaciones citadas'}.`;
  })});
  sections.push({ title: "Anexo · Fuentes del plan y su procedencia", lines: [`Se revisaron ${facts.length} fuentes. ${citedKeys.size?'Aquí se incluyen las citadas en las propuestas e interpretaciones; los demás registros se conservan en Entrevistas y observaciones de Ayni.':'Las fuentes se conservan con su procedencia original.'}`,...facts.flatMap((f,index) => citedKeys.size&&!citedKeys.has(f.key)?[]:[
    `Fuente ${index + 1}. ${sourceKinds[f.kind] ?? "Registro del aula"} · ${scopes[f.scope] ?? "Alcance no precisado"}${/^child_\d+$/i.test(f.subject ?? "") ? ` · ${annualTeacherText(f.subject,subjects)}` : ""} · ${readableDate(f.occurred_at)}. ${sourceText(f)}${f.explicit_tags?.length ? `; selecciones: ${f.explicit_tags.join(", ")}` : ""} ${sourceQualifications[f.uncertainty] ?? "Consultar el registro original para conocer su alcance."}`])] });
  return sections.filter(section=>section.lines?.some(line=>typeof line==='string'&&line.trim()));
}
function opportunitySection(o, names) {
  return { kind:'opportunity',opportunity:o,title: names.get(o.competency_id) ?? o.competency_id, lines: [`Capacidades: ${o.capacity_names.join(" · ")}`,
    `Qué harán: ${o.child_action}`, `Condiciones: ${o.conditions}`, `Cómo acompañar: ${o.mediation}`, `Qué observar: ${o.observation}`, `Apoyos: ${o.supports}`] };
}
export async function renderAnnualJourneyWord(document, cards = [], {logo = null} = {}) {
  if (!["active", "archived", "confirmed"].includes(document.status) || document.content?.journey_version !== 2)
    throw new Error("Confirma tu año antes de descargar el documento.");
  const age=document.age??document.document_context?.age;
  const names = new Map(cards.map((card) => [card.id, card.official_name ?? card.name]));
  // Direct formatting survives insertion into the original stationery's styles.
  // The retained stationery has no Heading1/Title styles. Keep headings
  // self-contained instead of referencing styles from the discarded body ZIP.
  const heading=(text,title=false)=>new Paragraph({outlineLevel:0,keepNext:true,keepLines:true,spacing:{before:title?0:180,after:80,line:276},children:[new TextRun({text,font:'Poppins',size:title?32:25,bold:true,color:'173B65'})]});
  const children = [heading(`Mi año ${document.school_year} · versión ${document.version}`,true),
    new Paragraph({ text: [document.document_context?.institution_name, document.document_context?.teacher_name,
      document.document_context?.classroom_section??document.document_context?.section,age?`${age} años`:null,Number.isInteger(document.content.classroom_snapshot.student_count)?`${document.content.classroom_snapshot.student_count} niños`:null].filter(Boolean).join(" · ") })];
  const cell=(text,width,header=false,paragraphs=null)=>new TableCell({width:{size:width,type:WidthType.DXA},borders:Object.fromEntries(['top','bottom','left','right'].map(side=>[side,{style:BorderStyle.SINGLE,size:4,color:'C6DFE8'}])),shading:{fill:header?'DDEEF3':'FFFFFF'},margins:{top:85,bottom:85,left:100,right:100},children:paragraphs??[new Paragraph({spacing:{after:30,line:260},children:[new TextRun({text,font:'Poppins',color:'173352',bold:header,size:20})]})]});
  const widths=[550,1700,4150,2900];
  children.push(heading('Vista general de los quince proyectos'),new Table({width:{size:9300,type:WidthType.DXA},columnWidths:widths,rows:[new TableRow({tableHeader:true,children:['N.º','Fechas','Proyecto','Competencias'].map((text,i)=>cell(text,widths[i],true))}),...document.content.proposed_experiences.map((row,index)=>new TableRow({cantSplit:true,children:[String(document.content.resolved_calendar.projects.find(slot=>slot.proposal_id===row.proposal_id)?.index??index+1),`${readableDate(row.planned_start_date)}\n${readableDate(row.planned_end_date)}`,annualDisplayTitle(row.title),row.opportunities.map(item=>competencyLabels[item.competency_id]??names.get(item.competency_id)??item.competency_id).join(' · ')].map((text,i)=>cell(text,widths[i]))}))]}));
  const sections=annualJourneyDocumentSections(document.content,names,document.display_subjects);
  for (let i=0;i<sections.length;i++) {
    const section=sections[i];
    if(section.kind==='opportunity'){
      const group=[];while(sections[i]?.kind==='opportunity')group.push(sections[i++]);i--;
      const paragraph=(text,bold=false)=>new Paragraph({spacing:{after:55,line:260},children:[new TextRun({text:annualTeacherText(text,document.display_subjects),font:'Poppins',size:21,color:'173352',bold})]});
      children.push(new Table({width:{size:9300,type:WidthType.DXA},columnWidths:[3000,6300],rows:[new TableRow({tableHeader:true,children:[cell('Competencia y capacidades',3000,true),cell('Acción, acompañamiento y observación',6300,true)]}),...group.map(item=>{
        const o=item.opportunity;return new TableRow({cantSplit:true,children:[cell('',3000,false,[paragraph(item.title,true),paragraph(o.capacity_names.join('; '))]),cell('',6300,false,[paragraph(`Qué harán: ${o.child_action}`),paragraph(`Condiciones: ${o.conditions}`),paragraph(`Cómo acompañar: ${o.mediation}`),paragraph(`Qué observar: ${o.observation}`),paragraph(`Apoyo: ${o.supports}`)])]});
      })]}));continue;
    }
    children.push(heading(section.title));
    for (const line of section.lines) children.push(new Paragraph({ children: [new TextRun({text:annualTeacherText(line,document.display_subjects),font:'Poppins',size:22,color:'173352'})], spacing: { after: 70,line:276 }, widowControl: true }));
  }
  const bodyZip = await JSZip.loadAsync(await Packer.toBuffer(new Document({styles:{default:{document:{run:{font:"Poppins",size:22,color:"173352"}}}},sections:[{children}]})));
  const bodyXml = await bodyZip.file("word/document.xml").async("string");
  // Only generated text/tables enter the body. The source keeps its original
  // cover, section geometry, illustrations, styles, headers and footers.
  const body = bodyXml.slice(bodyXml.indexOf("<w:body>")+8,bodyXml.lastIndexOf("<w:sectPr"));
  const context = document.document_context ?? {};
  return renderUnifiedWord({templateUrl:path.join(process.cwd(),"assets/templates/planificacion-anual-inicial-unificada-v1.docx"),logo,compactTrailingSpace:true,
    values:{"AÑO_ESCOLAR":String(document.school_year),INSTITUCION_EDUCATIVA:context.institution_name??"Institución educativa",EDAD_AULA:[age?`${age} años`:null,context.classroom_section??context.section].filter(Boolean).join(" · "),DOCENTE:context.teacher_name??"Docente del aula",UGEL:context.ugel??""},
    transform(xml){
      const start=[...xml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)].find(match=>match[0].replace(/<[^>]+>/g,"").includes("I. DATOS GENERALES"));
      if(!start)throw new Error("La plantilla anual no conserva la portada esperada.");
      const lastTable=[...xml.slice(0,start.index).matchAll(/<w:tbl(?:\s[^>]*)?>/g)].at(-1);
      const coverEnd=lastTable && xml.lastIndexOf("</w:tbl>",start.index)<lastTable.index ? lastTable.index : start.index;
      let cover=xml.slice(0,coverEnd);
      cover=removeParagraphsContaining(cover,["Plantilla editable"]);
      if(!context.ugel)cover=cover.replace(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g,row=>row.includes("{{UGEL}}")?"":row);
      return cover+body+xml.slice(xml.lastIndexOf("<w:sectPr"));
    }});
}
