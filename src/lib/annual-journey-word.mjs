import { annualDisplayTitle } from "./annual-year-editor.mjs";
import { annualTeacherText } from "./annual-teacher-display.mjs";
import { Document, HeadingLevel, Paragraph, Packer, TextRun } from "docx";
import { familyInterviewQuestionGroups } from "./family-interview-contract.mjs";

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
const sourceText = fact => fact.kind !== "family_report" ? fact.support_text : fact.support_text.split("\n").map(line => {
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
const readableDate = value => /^\d{4}-\d{2}-\d{2}/.test(value ?? "")
  ? value.slice(0,10).split("-").reverse().join("/") : "Fecha no registrada";

/** A pure rendering of the confirmed object. No title regex, inference, prompt or enrichment. */
export function annualJourneyDocumentSections(plan, names = new Map(), subjects = {}) {
  if (plan.curriculum_reference) names = new Map(plan.curriculum_reference.map((card) => [card.id, card.name]));
  const facts = plan.classroom_snapshot.facts;
  const sources = new Map(facts.map((fact,index) => [fact.key,{ fact, number: index + 1 }]));
  const sections = [{ title: "Ideas y decisiones docentes", lines: [plan.teacher_preferences].filter(Boolean) }];
  if(plan.experience_context){
    sections.push({title:"Contexto aprobado por la profesora",lines:plan.experience_context.context_items.map(item=>item.text)});
    sections.push({title:"Proyectos anteriores declarados",lines:plan.experience_context.historical_projects.length ? plan.experience_context.historical_projects.map(item=>`${item.title} · ${item.period?`Bimestre ${item.period}`:"Período no precisado"} · ${item.competency_ids.length?item.competency_ids.map(id=>names.get(id)??id).join("; "):"Competencias no declaradas"}. Declaración docente; no representa evidencias ni evaluaciones.`) : ["No se declararon proyectos anteriores."]});
    if(plan.resolved_calendar.planning_scope!=="full_year")sections.push({title:"Pasado sin registro en Ayni",lines:plan.resolved_calendar.projects.filter(slot=>slot.occupancy==="past_unrecorded").map(slot=>`Tramo ${slot.index}: ${slot.starts_on} al ${slot.ends_on}. No se generó trabajo retrospectivo.`)});
    sections.push({title:"Preparación desde el inicio en Ayni",lines:[plan.resolved_calendar.planning_scope==="full_year"?`El plan anual incluye quince propuestas. Las de fechas pasadas son solo para consulta; no acreditan trabajo realizado. Las actividades se preparan únicamente desde ${plan.experience_context.starts_on}.`:`Se preparan únicamente fechas desde ${plan.experience_context.starts_on}. El primer tramo puede tener menos días disponibles.`, ...(plan.future_coverage_gaps ?? []).map(id=>`${names.get(id)??id}: sin oportunidad futura prevista; no implica nivel ni ausencia de trabajo anterior.`)]});
  }
  const general = { organization_criteria: "Organización del año", transversal_approaches: "Enfoques transversales",
    teaching_strategies: "Acompañamiento", assessment_followup: "Observación y seguimiento",
    family_collaboration: "Familias y comunidad", inclusive_supports: "Apoyos para participar" };
  for (const [key, title] of Object.entries(general)) sections.push({ title, lines: plan[key] });
  const stage = plan.resolved_calendar.initial_stage;
  sections.push({ title: stage.name, lines: [...(plan.experience_context?.starts_on>stage.ends_on ? ["Período pasado: esta previsión no acredita ejecución ni diagnóstico registrado."]:[]),stage.purpose, `${stage.starts_on} al ${stage.ends_on}`,
    ...stage.suggested_experiences, ...stage.what_to_observe, ...(stage.family_actions ?? []), ...(stage.diagnostic_focus ?? []),
    ...(stage.teacher_notes ? [stage.teacher_notes] : [])] });
  for (const [index, row] of plan.proposed_experiences.entries()) {
    const slot=plan.resolved_calendar.projects.find(slot=>slot.proposal_id===row.proposal_id);
    const duration=slot?.historical_dates?.length?`${row.planned_instructional_days} días restantes del tramo`: `${row.duration_weeks} ${row.duration_weeks === 1 ? "semana" : "semanas"} · ${row.planned_instructional_days} días lectivos`;
    sections.push({ title: `${slot?.index ?? index + 1}. ${annualDisplayTitle(row.title)}`, lines: [row.rationale, row.purpose, row.invitation,
      ...row.children_actions, `${row.planned_start_date} al ${row.planned_end_date} · ${duration}`] });
    for (const opportunity of row.opportunities) sections.push(opportunitySection(opportunity, names));
    sections.push({ title: "Materiales, apoyos y flexibilidad", lines: [...row.materials, ...row.supports, row.flexibility] });
    sections.push({ title: "Registros de referencia", lines: row.source_fact_keys.map((key) => {
      const source = sources.get(key);
      return source ? `Fuente ${source.number}: ${sourceKinds[source.fact.kind] ?? "Registro del aula"}. Ver su texto en la procedencia del plan.`
        : "Referencia no disponible en esta versión del plan.";
    }) });
  }
  for (const opportunity of plan.everyday_opportunities) sections.push({ ...opportunitySection(opportunity, names),
    title: `${opportunity.moment} · ${names.get(opportunity.competency_id) ?? opportunity.competency_id}` });
  sections.push({ title: plan.interpretation_review?.status==="reviewed"?"Interpretaciones revisadas por la docente":"Interpretaciones propuestas por Ayni · pendientes de revisión docente", lines: plan.evidence_interpretations.map((x) =>
    `${scopes[x.scope] ?? "Alcance no precisado"} · ${interpretationLabels[x.meaning] ?? "Interpretación para revisar"}: ${x.interpretation}`) });
  if (plan.insufficient_interpretations?.length) sections.push({title:"Información que todavía necesitamos conocer",lines:[
    `En ${plan.insufficient_interpretations.length} posibles interpretaciones todavía faltaba sustento. Conservamos los registros sin concluir que exista un avance o una dificultad.`]});
  sections.push({ title: "Lo que sabemos del aula y su procedencia", lines: facts.map((f,index) =>
    `Fuente ${index + 1}. ${sourceKinds[f.kind] ?? "Registro del aula"} · ${scopes[f.scope] ?? "Alcance no precisado"}${/^child_\d+$/i.test(f.subject ?? "") ? ` · ${annualTeacherText(f.subject,subjects)}` : ""} · ${readableDate(f.occurred_at)}. ${sourceText(f)}${f.explicit_tags?.length ? `; selecciones: ${f.explicit_tags.join(", ")}` : ""} ${sourceQualifications[f.uncertainty] ?? "Consultar el registro original para conocer su alcance."}`) });
  sections.push({ title: "Calendario efectivo", lines: [`Versión: ${plan.resolved_calendar.calendar_version.version}`,
    `${plan.resolved_calendar.integrity.assigned} de ${plan.resolved_calendar.integrity.eligible} fechas previstas; ${plan.resolved_calendar.integrity.gaps} sin asignar; ${plan.resolved_calendar.integrity.overlaps} solapamientos.`] });
  return sections;
}
function opportunitySection(o, names) {
  return { title: names.get(o.competency_id) ?? o.competency_id, lines: [o.capacity_names.join(" · "),
    o.child_action, o.conditions, o.mediation, o.observation, o.supports] };
}
export async function renderAnnualJourneyWord(document, cards = []) {
  if (!["active", "archived", "confirmed"].includes(document.status) || document.content?.journey_version !== 2)
    throw new Error("Confirma tu año antes de descargar el documento.");
  const names = new Map(cards.map((card) => [card.id, card.official_name ?? card.name]));
  const children = [new Paragraph({ text: `Mi año ${document.school_year} · versión ${document.version}`, heading: HeadingLevel.TITLE }),
    new Paragraph({ text: [document.document_context?.institution_name, document.document_context?.teacher_name,
      document.document_context?.classroom_section].filter(Boolean).join(" · ") })];
  for (const section of annualJourneyDocumentSections(document.content, names, document.display_subjects)) {
    children.push(new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_1, keepNext: true }));
    for (const line of section.lines) children.push(new Paragraph({ children: [new TextRun(annualTeacherText(line,document.display_subjects))], spacing: { after: 140 }, widowControl: true }));
  }
  return Packer.toBuffer(new Document({ styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [{ properties: {}, children }] }));
}
