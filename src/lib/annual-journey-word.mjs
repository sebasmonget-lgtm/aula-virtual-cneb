import { annualDisplayTitle } from "./annual-year-editor.mjs";
import { Document, HeadingLevel, Paragraph, Packer, TextRun } from "docx";

/** A pure rendering of the confirmed object. No title regex, inference, prompt or enrichment. */
export function annualJourneyDocumentSections(plan, names = new Map()) {
  if (plan.curriculum_reference) names = new Map(plan.curriculum_reference.map((card) => [card.id, card.name]));
  const sections = [{ title: "Ideas y decisiones docentes", lines: [plan.teacher_preferences].filter(Boolean) }];
  const general = { organization_criteria: "Organización del año", transversal_approaches: "Enfoques transversales",
    teaching_strategies: "Acompañamiento", assessment_followup: "Observación y seguimiento",
    family_collaboration: "Familias y comunidad", inclusive_supports: "Apoyos para participar" };
  for (const [key, title] of Object.entries(general)) sections.push({ title, lines: plan[key] });
  const stage = plan.resolved_calendar.initial_stage;
  sections.push({ title: stage.name, lines: [stage.purpose, `${stage.starts_on} al ${stage.ends_on}`,
    ...stage.suggested_experiences, ...stage.what_to_observe, ...(stage.family_actions ?? []), ...(stage.diagnostic_focus ?? []),
    ...(stage.teacher_notes ? [stage.teacher_notes] : [])] });
  for (const [index, row] of plan.proposed_experiences.entries()) {
    sections.push({ title: `${index + 1}. ${annualDisplayTitle(row.title)}`, lines: [row.rationale, row.purpose, row.invitation,
      ...row.children_actions, `${row.planned_start_date} al ${row.planned_end_date} · ${row.duration_weeks} semanas · ${row.planned_instructional_days} días lectivos`] });
    for (const opportunity of row.opportunities) sections.push(opportunitySection(opportunity, names));
    sections.push({ title: "Materiales, apoyos y flexibilidad", lines: [...row.materials, ...row.supports, row.flexibility] });
    sections.push({ title: "Fuentes pertinentes", lines: row.source_fact_keys.map((key) => {
      const fact = plan.classroom_snapshot.facts.find((f) => f.key === key);
      return `${fact.kind} · ${fact.subject} · ${fact.scope}: ${fact.support_text}`;
    }) });
  }
  for (const opportunity of plan.everyday_opportunities) sections.push({ ...opportunitySection(opportunity, names),
    title: `${opportunity.moment} · ${names.get(opportunity.competency_id) ?? opportunity.competency_id}` });
  sections.push({ title: "Interpretaciones revisadas por la docente", lines: plan.evidence_interpretations.map((x) =>
    `${x.scope} · ${x.meaning}: ${x.interpretation}`) });
  if (plan.insufficient_interpretations?.length) sections.push({title:"Información que todavía necesitamos conocer",lines:[
    `En ${plan.insufficient_interpretations.length} posibles interpretaciones todavía faltaba sustento. Conservamos los registros sin concluir que exista un avance o una dificultad.`]});
  sections.push({ title: "Lo que sabemos del aula y su procedencia", lines: plan.classroom_snapshot.facts.map((f) =>
    `${f.kind} · ${f.subject} · ${f.scope} · ${f.occurred_at ?? "fecha desconocida"} · ${f.uncertainty}: ${f.support_text}${f.explicit_tags?.length ? `; selecciones: ${f.explicit_tags.join(", ")}` : ""}`) });
  sections.push({ title: "Calendario efectivo", lines: [`Versión: ${plan.resolved_calendar.calendar_version.version}`,
    `Huella: ${plan.resolved_calendar.calendar_fingerprint}`, `${plan.resolved_calendar.integrity.assigned}/${plan.resolved_calendar.integrity.eligible} fechas; 0 huecos; 0 solapamientos.`] });
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
  for (const section of annualJourneyDocumentSections(document.content, names)) {
    children.push(new Paragraph({ text: section.title, heading: HeadingLevel.HEADING_1, keepNext: true }));
    for (const line of section.lines) children.push(new Paragraph({ children: [new TextRun(line)], spacing: { after: 140 }, widowControl: true }));
  }
  return Packer.toBuffer(new Document({ styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [{ properties: {}, children }] }));
}
