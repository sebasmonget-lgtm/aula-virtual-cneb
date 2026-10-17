import { interviewAutonomyOptions, interviewAutonomyLevels, interviewCommunicationOptions, interviewCommunityOptions,
  interviewEmotionalSupportOptions, interviewHomeActivityOptions, interviewInterestOptions,
  interviewParticipationSupportOptions, interviewSocialPlayOptions, interviewLanguageLabel } from "./family-interview-contract.mjs";
import {familyInterviewAnswerFieldsFor} from './family-interview-progress.mjs';

const escape = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const labelList = (ids, options) => (ids ?? []).map((id) => options.find((item) => item.id === id)?.label).filter(Boolean).join(", ");
export function familyInterviewAnswerText(details, key) {
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
  const languages = key === "communication_context" ? (details.language_tags ?? []).map(tag => interviewLanguageLabel(tag, details.other_language_text)).filter(Boolean).join(", ") : "";
  const familyUse = key === "communication_context" ? (details.home_language_uses ?? []).map((row) =>
    `${interviewLanguageLabel(row.language_tag, details.other_language_text)} con ${row.with_whom}`).join("; ") : "";
  const other = key === "interests" ? details.other_interest_text : key === "communication_context"
    ? details.other_language_text : key === "family_community_context" ? details.other_community_text : "";
  return [selected, autonomy, languages && `Lenguas que escucha o usa en casa: ${languages}`, familyUse,
    other && `Otro: ${other}`, details[key], key === "family_community_context" && details.family_community_enjoyed,
    key === "family_expectation" && details.family_expectations,
    key === "communication_context" && details.language_context,
    key === "family_context" && details.family_expectation && `Expectativa familiar: ${details.family_expectation}`,
    key === "family_context" && details.family_expectations && `Expectativas anteriores: ${details.family_expectations}`].filter(Boolean).join("\n");
}

export function familyInterviewExtraAnswers(details, version) {
  const covered = new Set(Object.values(familyInterviewAnswerFieldsFor(version)).flat());
  return ['home_activity_example','family_community_context','participation_support_context','autonomy_context',
    'emotional_support_context','family_context','family_expectation','language_context','communication_emotional_context',
    'adaptation_context','daily_routine_context','family_expectations','previous_education']
    .filter(key => !covered.has(key) && !(key === 'family_expectation' && !covered.has('family_context')) && !(key === 'family_expectations' && !covered.has('family_context')))
    .map(key => ({key,text:familyInterviewAnswerText(details,key)})).filter(item => item.text);
}

/** A stand-alone paper sheet, without IDs, metadata or private attachment paths. */
export function buildFamilyInterviewPrintHtml(name, details, groups, context = {}) {
  const fields = groups.map((group) => `<div class="group">${group.title ? `<h2>${escape(group.title)}</h2>` : ""}${(group.questions ?? [group]).map((question) =>
    `<section><strong>${question.title ? escape(question.title) + '<br>' : ''}${escape(question.label)}</strong>${question.hint ? `<small>${escape(question.hint)}</small>` : ""}<p>${escape(familyInterviewAnswerText(details, question.key)) || "&nbsp;"}</p></section>`).join("")}</div>`).join("");
  const version = groups.some(group => (group.questions ?? []).some(question => question.key === 'literacy_context')) ? 3 : 2;
  const extras = familyInterviewExtraAnswers(details,version);
  const extraHtml = extras.length ? `<h2>Respuestas conservadas de la entrevista anterior</h2>${extras.map(item=>`<section><p>${escape(item.text)}</p></section>`).join('')}` : '';
  const place = [context.institution && `Institución: ${escape(context.institution)}`,
    context.classroom && `Aula: ${escape(context.classroom)}`].filter(Boolean).join(" · ");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Entrevista familiar · ${escape(name)}</title><style>body{font:14px Arial,sans-serif;margin:22mm;color:#172b52}h1{font-size:22px;margin-bottom:8px}h2{font-size:16px;margin:24px 0 12px}.meta{line-height:1.9;margin-bottom:16px}section{margin:12px 0;break-inside:avoid}small{display:block;color:#536477;margin-top:4px}p{min-height:60px;border-bottom:1px solid #aaa;white-space:pre-wrap;padding:8px 0;margin:4px 0 0}@media print{body{margin:14mm}}</style></head><body><h1>Entrevista familiar</h1><div class="meta">${place ? `${place}<br>` : ""}Niño o niña: ${escape(name)}<br>Fecha: __________________ · Docente: __________________</div><p>Comparte solo lo que consideres útil. Puedes dejar preguntas sin responder.</p>${fields}${extraHtml}<script>window.onload=()=>window.print()<\/script></body></html>`;
}
