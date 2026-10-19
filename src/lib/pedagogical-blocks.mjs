import { activityObservationCriteria, criterionMoments } from "./activity-observation-plan.mjs";
import {activityReadingStages} from "./activity-reading-content.mjs";
import { diagnosticMomentInstruction } from "./diagnostic-moment-instructions.mjs";
/** Server projection of explicit pedagogical fields. Split only explicit saved stage labels; never invent or summarize instructions. */
export function activityPedagogicalBlocks(details = {}, steps = [], criteria = []) {
  const planned = activityObservationCriteria(details);
  const opportunities = criteria.map(criterion => ({
    id: criterion.id, competency_id: criterion.competency_v4_id ?? criterion.competency_id,
    competency_name: criterion.competency_text ?? null, criterion: criterion.criterion_text,
    observation_focus: criterion.details?.observation_focus ?? criterion.observation_focus ?? [],
    expected_evidence: criterion.details?.expected_evidence ?? planned.find(item => item.competency_id === (criterion.competency_v4_id ?? criterion.competency_id))?.expected_evidence ?? (criteria.length === 1 ? details.expected_evidence : null) ?? null,
    observation_moments: criterionMoments({ observation_moments: criterion.details?.observation_moments ?? planned.find(item => item.competency_id === (criterion.competency_v4_id ?? criterion.competency_id))?.observation_moments }, details.evidence_opportunities),
  }));
  const childParts=activityReadingStages(details.child_actions),teacherParts=activityReadingStages(details.mediation);
  const stage=(parts,label)=>parts.stages.find(item=>item.label===label)?.text;
  const child=(label)=>stage(childParts,label),teacher=(label)=>stage(teacherParts,label);
  const opening=(parts,content)=>[parts.introduction,content].filter(Boolean).join("\n\n");
  if (details.child_actions || details.meaningful_situation) return [
    { id: "opening", title: "Comiencen", instruction: opening(teacherParts,teacher("Inicio")||details.meaningful_situation), ...(child("Inicio")?{expected_actions:opening(childParts,child("Inicio"))}:{}) },
    { id: "development", title: "Exploren y prueben", instruction: teacher("Desarrollo")||details.mediation || details.child_actions,
      ...(details.mediation && details.child_actions ? { expected_actions: child("Desarrollo")||details.child_actions } : {}),
       },
    { id: "closure", title: "Compartan lo que ocurrió", instruction: teacher("Cierre")||details.closure_or_continuity,...(child("Cierre")?{expected_actions:child("Cierre")}:{}) },
  ].filter(block => typeof block.instruction === "string" && block.instruction.trim()).map(block=>{ const observations=opportunities.filter(item=>item.observation_moments.includes(block.id)); return {...block,...(observations.length?{observations}:{})}; });
  // Historical activities keep their literal instructions; no invented examples or evidence.
  return steps.map((instruction, index) => ({ id: `instruction-${index + 1}`, title: `Actividad · ${index + 1}`, instruction,
    ...(index === Math.max(0, steps.length - 2) && opportunities.length ? { observations: opportunities } : {}) }));
}

export function diagnosticPedagogicalBlocks(experience) {
  return [{ id: "prepare", title: "Prepara el juego", instruction: experience.teacher_instructions },
    ...experience.aspects.map(aspect => ({ id: aspect.id, title: aspect.moment_title ?? aspect.label, instruction: aspect.teacher_steps?.join('\n') || diagnosticMomentInstruction(experience.id, aspect.id, aspect.prompt),
      ...(aspect.examples?.length ? { examples: aspect.examples } : {}),
      observations: [{ id: aspect.id, competency_id: aspect.competency_id, competency_name: aspect.competency_name, criterion: aspect.prompt }] }))];
}
