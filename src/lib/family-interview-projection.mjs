import { interviewAutonomyOptions, interviewCommunicationOptions,
  interviewCommunityOptions, interviewHomeActivityOptions,
  interviewInterestOptions, interviewLanguageOptions, interviewParticipationSupportOptions,
  interviewSocialPlayOptions } from "./family-interview-contract.mjs";

const labels = (ids = [], options) => ids.filter((id) => id !== "other")
  .map((id) => options.find((item) => item.id === id)?.label).filter(Boolean);
const short = (value, limit = 180) => typeof value === "string" ? value.trim().slice(0, limit) : "";

/** Readable individual summary with explicit provenance and no inferred attainment. */
export function summarizeFamilyInterview(details = {}) {
  const parts = [];
  const interests = labels(details.interest_tags, interviewInterestOptions);
  if (interests.length) parts.push("le interesan " + interests.slice(0, 4).join(", "));
  else if (short(details.interests)) parts.push("le gusta " + short(details.interests));
  const languages = labels(details.language_tags, interviewLanguageOptions);
  if (languages.length) {
    const uses = (details.home_language_uses ?? []).filter((row) => row.with_whom)
      .map((row) => {
        const language = interviewLanguageOptions.find((item) => item.id === row.language_tag)?.label.toLowerCase();
        return language ? `${language} con ${short(row.with_whom, 60)}` : "";
      }).filter(Boolean);
    parts.push("en casa escucha o usa " + (uses.length ? uses.join(" y ") : languages.join(" y ")));
  }
  const communication = labels(details.communication_tags, interviewCommunicationOptions);
  if (communication.length) parts.push("para comunicarse " + communication.slice(0, 2).join(" y ").toLowerCase());
  const autonomy = (details.autonomy_routines ?? []).filter((row) => row.level === "alone")
    .map((row) => interviewAutonomyOptions.find((item) => item.id === row.id)?.label.toLowerCase()).filter(Boolean);
  if (autonomy.length) parts.push("suele hacer por sí mismo/a " + autonomy.slice(0, 3).join(", "));
  const social = labels(details.social_play_tags, interviewSocialPlayOptions);
  if (social.length) parts.push("al jugar " + social.slice(0, 2).join(" y ").toLowerCase());
  const home = labels(details.home_activity_tags, interviewHomeActivityOptions);
  if (home.length) parts.push("en casa " + home.slice(0, 2).join(" y ").toLowerCase());
  const community = labels(details.community_tags, interviewCommunityOptions);
  if (community.length) parts.push("participa en experiencias de " + community.slice(0, 3).join(", ").toLowerCase());
  const supports = labels(details.participation_support_tags, interviewParticipationSupportOptions);
  if (supports.length) parts.push("le ayuda " + supports.slice(0, 2).join(" y ").toLowerCase());
  if (!parts.length) return "";
  return "Según la familia, " + parts.join("; ") + ".";
}

/** Bounded family context for Assessment. It never enters evidence_history. */
export function projectFamilyAssessmentContext(details = {}, clean = (value) => value) {
  const project = (value) => short(clean(value), 240);
  return {
    source: "family_interview", role: "context_only",
    interests: labels(details.interest_tags, interviewInterestOptions).slice(0, 6),
    communication: labels(details.communication_tags, interviewCommunicationOptions).slice(0, 5),
    home_languages: labels(details.language_tags, interviewLanguageOptions).slice(0, 5),
    social_play: labels(details.social_play_tags, interviewSocialPlayOptions).slice(0, 5),
    home_activities: labels(details.home_activity_tags, interviewHomeActivityOptions).slice(0, 6),
    participation_supports: labels(details.participation_support_tags, interviewParticipationSupportOptions).slice(0, 5),
    community: labels(details.community_tags, interviewCommunityOptions).slice(0, 5),
    family_example: project(details.home_activity_example),
    family_support_note: project(details.participation_support_context),
    ...(details.structured_options_version !== 2 ? { legacy_family_context: project(
      [details.interests, details.language_context, details.communication_emotional_context,
        details.autonomy_context, details.social_context].filter(Boolean).join(" ")) } : {}),
  };
}

export async function loadConfirmedFamilyContext(db, classroomId, studentId) {
  const row = (await db.query(`select i.id,i.version,i.details from student_family_interviews i
    join students s on s.id=i.student_id and s.classroom_id=i.classroom_id
    where i.classroom_id=$1 and i.student_id=$2 and i.status='confirmed' and s.status='active'
    order by i.version desc limit 1`, [classroomId, studentId])).rows[0];
  return row ?? null;
}

/** A possible observation situation, never an assessment or competency claim. */
export function familyObservationHint(details = {}, competencyId) {
  const home = details.home_activity_tags ?? [];
  const social = details.social_play_tags ?? [];
  const communication = details.communication_tags ?? [];
  const interests = details.interest_tags ?? [];
  if (competencyId === "MAT_CANTIDAD" && home.includes("counts_compares"))
    return "Según la familia, suele contar, repartir o comparar en casa. Durante el juego con materiales, observa cómo usa cantidades al organizar objetos.";
  if (competencyId === "MAT_FORMA" && (home.includes("builds") || interests.includes("construction") || interests.includes("vehicles")))
    return "Según la familia, le interesan las construcciones o vehículos. Al armar o mover materiales, observa cómo explora formas, tamaños y posiciones.";
  if (competencyId === "COM_ORAL" && (communication.length || home.includes("invents") || interests.includes("stories")))
    return "Según la familia, disfruta conversar o contar ideas. En una conversación o juego, observa cómo expresa lo que quiere comunicar.";
  if (competencyId === "PS_CONVIVE" && social.length)
    return "Según la familia, tiene formas propias de acercarse al juego compartido. Observa cómo participa y acuerda con otros en una situación de juego.";
  if (competencyId === "CYT_INDAGA" && (home.includes("asks_why") || home.includes("explores") || interests.includes("animals") || interests.includes("plants")))
    return "Según la familia, muestra curiosidad por explorar. En una actividad con objetos o naturaleza, observa qué preguntas hace y qué prueba.";
  return null;
}
