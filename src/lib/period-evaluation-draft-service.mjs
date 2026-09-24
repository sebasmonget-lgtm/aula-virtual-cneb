import { createHash, randomUUID } from "node:crypto";
import { assessmentSourceSnapshot } from "./assessment-v4-service.mjs";

export const evidenceFingerprint = (rows) => createHash("sha256").update(JSON.stringify(assessmentSourceSnapshot(rows))).digest("hex");
const clean = (value, limit = 4000) => typeof value === "string" ? value.trim().slice(0, limit) : "";
const grade = new Set(["AD","A","B","C"]);

export async function savePeriodEvaluationDraft(db, { studentId, competencyId, period, sourceRows, analysis = null, metadata = null,
  teacherAnalysis = "", conclusionText = "", provisionalLevel = null, teacherJustification = "" }) {
  if (provisionalLevel && !grade.has(provisionalLevel)) throw new Error("El nivel provisional no es válido.");
  const snapshot=assessmentSourceSnapshot(sourceRows),fingerprint=evidenceFingerprint(sourceRows);
  await db.exec("begin");
  try {
    const existing=(await db.query(`select * from competency_assessments where student_id=$1 and competency_v4_id=$2
      and (evaluation_period_id=$3 or (evaluation_period_id is null and period_start=$4::date and period_end=$5::date)) and status='draft'`,
      [studentId,competencyId,period.id,period.starts_on,period.ends_on])).rows[0];
    const previousCurrent=existing && evidenceFingerprint(existing.source_evidence_snapshot ?? [])===fingerprint;
    const manualStatus=sourceRows.length>=2 && clean(teacherAnalysis) ? "sufficient" : "insufficient";
    const details=analysis ?? (previousCurrent && existing.generation_metadata?.analysis ? existing.details : {
      competency_id:competencyId,information_status:manualStatus,evidence_overview:clean(teacherAnalysis)||"Análisis pendiente de la docente.",observable_patterns:[],strengths_and_advances:[],
      support_needs:[],next_opportunities:[],teacher_questions:[],insufficiency_reason:manualStatus==="insufficient"?"La docente revisará más oportunidades de observación.":null,caution:"Borrador docente." });
    const suggestedLevel=analysis ? (analysis.information_status==="sufficient" ? analysis.suggested_level ?? null : null)
      : previousCurrent ? existing.suggested_level : null;
    const suggestionReason=analysis ? (analysis.information_status==="sufficient" ? analysis.suggestion_reason ?? null : null)
      : previousCurrent ? existing.suggestion_reason : null;
    const fields=[JSON.stringify(sourceRows.map((row)=>row.id)),JSON.stringify(snapshot),JSON.stringify(details),
      JSON.stringify(metadata ?? (previousCurrent ? existing.generation_metadata : {})),suggestedLevel,suggestionReason,
      clean(teacherAnalysis),clean(conclusionText),provisionalLevel || null,clean(teacherJustification,1000)];
    let saved;
    if(existing) saved=(await db.query(`update competency_assessments set evaluation_period_id=$12,source_evidence_ids=$1::jsonb,source_evidence_snapshot=$2::jsonb,
      details=$3::jsonb,generation_metadata=$4::jsonb,suggested_level=$5,suggestion_reason=$6,draft_teacher_analysis=$7,
      working_conclusion_text=$8,provisional_level=$9,draft_teacher_justification=$10,achievement_level=null,updated_at=now()
      where id=$11 returning id,updated_at`,[...fields,existing.id,period.id])).rows[0];
    else {
      const version=Number((await db.query(`select coalesce(max(version),0)+1 as version from competency_assessments
        where student_id=$1 and competency_v4_id=$2 and period_start=$3::date and period_end=$4::date`,
      [studentId,competencyId,period.starts_on,period.ends_on])).rows[0].version);
      saved=(await db.query(`insert into competency_assessments(id,student_id,competency_v4_id,evaluation_period_id,period_start,period_end,
        version,source_evidence_ids,source_evidence_snapshot,details,generation_metadata,status,suggested_level,suggestion_reason,
        draft_teacher_analysis,working_conclusion_text,provisional_level,draft_teacher_justification)
        values($1,$2,$3,$4,$5::date,$6::date,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,'draft',$12,$13,$14,$15,$16,$17)
        returning id,updated_at`,[randomUUID(),studentId,competencyId,period.id,period.starts_on,period.ends_on,version,...fields])).rows[0];
    }
    await db.exec("commit");
    return {id:saved.id,updated_at:saved.updated_at,evidence_fingerprint:fingerprint};
  } catch(error) {await db.exec("rollback").catch(()=>{});throw error;}
}

export function assertSavedEvaluationDraft(draft, {fingerprint,teacherAnalysis,conclusionText,achievementLevel,teacherJustification}) {
  if(!draft || evidenceFingerprint(draft.source_evidence_snapshot??[])!==fingerprint)
    throw new Error("El borrador no corresponde a las observaciones actuales. Revísalas y guárdalo otra vez.");
  if(clean(draft.draft_teacher_analysis)!==clean(teacherAnalysis) || clean(draft.working_conclusion_text)!==clean(conclusionText) ||
    (draft.provisional_level??"")!==(achievementLevel??"") || clean(draft.draft_teacher_justification,1000)!==clean(teacherJustification,1000))
    throw new Error("Guarda los cambios del borrador antes de confirmar.");
  if(draft.achievement_level!==null) throw new Error("Un borrador no puede tener nivel definitivo.");
  return draft;
}
