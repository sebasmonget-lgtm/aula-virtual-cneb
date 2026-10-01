import { interviewAutonomyOptions, interviewAutonomyLevels, interviewCommunicationOptions, interviewCommunityOptions,
  interviewEmotionalSupportOptions, interviewHomeActivityOptions, interviewInterestOptions,
  interviewLanguageOptions, interviewParticipationSupportOptions, interviewSocialPlayOptions } from "./family-interview-contract.mjs";

const escape = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const labelList = (ids, options) => (ids ?? []).map((id) => options.find((item) => item.id === id)?.label).filter(Boolean).join(", ");
function answerFor(details, key) {
  const tags = {
    interests: ["interest_tags", interviewInterestOptions],
    communication_context: ["communication_tags", interviewCommunicationOptions],
    emotional_support_context: ["emotional_support_tags", interviewEmotionalSupportOptions],
    social_context: ["social_play_tags", interviewSocialPlayOptions],
    home_activity_example: ["home_activity_tags", interviewHomeActivityOptions],
    family_community_context: ["community_tags", interviewCommunityOptions],
    participation_support_context: ["participation_support_tags", interviewParticipationSupportOptions],
  };
  const [field, options] = tags[key] ?? [];
  const selected = field ? labelList(details[field], options) : "";
  const autonomy = key === "autonomy_context" ? (details.autonomy_routines ?? []).map((row) => {
    const task = interviewAutonomyOptions.find((item) => item.id === row.id)?.label;
    const level = interviewAutonomyLevels.find((item) => item.id === row.level)?.label;
    return task && level ? `${task}: ${level}` : "";
  }).filter(Boolean).join("; ") : "";
  const languages = key === "communication_context" ? labelList(details.language_tags, interviewLanguageOptions) : "";
  const familyUse = key === "communication_context" ? (details.home_language_uses ?? []).map((row) =>
    `${interviewLanguageOptions.find((item) => item.id === row.language_tag)?.label ?? ""} con ${row.with_whom}`).join("; ") : "";
  const other = key === "interests" ? details.other_interest_text : key === "communication_context"
    ? details.other_language_text : key === "family_community_context" ? details.other_community_text : "";
  return [selected, autonomy, languages && `Idiomas en casa: ${languages}`, familyUse,
    other && `Otro: ${other}`, details[key], key === "family_community_context" && details.family_community_enjoyed,
    key === "family_expectation" && details.family_expectations].filter(Boolean).join("\n");
}

/** A stand-alone paper sheet, without IDs, metadata or private attachment paths. */
export function buildFamilyInterviewPrintHtml(name, details, groups, context = {}) {
  const fields = groups.map((group) => `<div class="group">${group.title ? `<h2>${escape(group.title)}</h2>` : ""}${(group.questions ?? [group]).map((question) =>
    `<section><strong>${escape(question.label)}</strong>${question.hint ? `<small>${escape(question.hint)}</small>` : ""}<p>${escape(answerFor(details, question.key)) || "&nbsp;"}</p></section>`).join("")}</div>`).join("");
  const place = [context.institution && `Institución: ${escape(context.institution)}`,
    context.classroom && `Aula: ${escape(context.classroom)}`].filter(Boolean).join(" · ");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Entrevista familiar · ${escape(name)}</title><style>body{font:14px Arial,sans-serif;margin:22mm;color:#172b52}h1{font-size:22px;margin-bottom:8px}h2{font-size:16px;margin:24px 0 12px}.meta{line-height:1.9;margin-bottom:16px}section{margin:12px 0;break-inside:avoid}small{display:block;color:#536477;margin-top:4px}p{min-height:60px;border-bottom:1px solid #aaa;white-space:pre-wrap;padding:8px 0;margin:4px 0 0}@media print{body{margin:14mm}}</style></head><body><h1>Entrevista familiar</h1><div class="meta">${place ? `${place}<br>` : ""}Niño o niña: ${escape(name)}<br>Fecha: __________________ · Docente: __________________</div><p>Comparte solo lo que consideres útil. Puedes dejar preguntas sin responder.</p>${fields}<script>window.onload=()=>window.print()<\/script></body></html>`;
}
