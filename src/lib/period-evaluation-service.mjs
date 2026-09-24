import { createHash } from "node:crypto";
import { assessmentSourceSnapshot, sameEvidenceSourceSnapshot } from "./assessment-v4-service.mjs";
import { sameAssessmentSnapshot, sourceAssessmentSnapshot } from "./descriptive-conclusion-v4-service.mjs";

export const dateOnly = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
const dayAfter = (value) => { const date = new Date(`${dateOnly(value)}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + 1); return date.toISOString().slice(0, 10); };

export function defaultEvaluationPeriods(schoolYear, instructionalBlocks = [], kind = "bimester") {
  if (!["bimester", "trimester"].includes(kind)) throw new Error("Elige bimestres o trimestres.");
  const count = kind === "bimester" ? 4 : 3;
  const blocks = instructionalBlocks.filter((block) => block.type === "instructional").sort((a, b) => dateOnly(a.start_date).localeCompare(dateOnly(b.start_date)));
  if (count === 4 && blocks.length === 4) return blocks.map((block, index) => ({ kind, ordinal: index + 1, label: `Bimestre ${index + 1}`, starts_on: dateOnly(block.start_date), ends_on: dateOnly(block.end_date) }));
  const first = blocks.length ? dateOnly(blocks[0].start_date) : dateOnly(schoolYear.starts_on);
  const last = blocks.length ? dateOnly(blocks.at(-1).end_date) : dateOnly(schoolYear.ends_on);
  const start = Date.parse(`${first}T00:00:00Z`), end = Date.parse(`${last}T00:00:00Z`);
  const days = Math.floor((end - start) / 86_400_000) + 1;
  return Array.from({ length: count }, (_, index) => {
    const from = new Date(start + Math.floor(days * index / count) * 86_400_000).toISOString().slice(0, 10);
    const until = index === count - 1 ? last : new Date(start + (Math.floor(days * (index + 1) / count) - 1) * 86_400_000).toISOString().slice(0, 10);
    return { kind, ordinal: index + 1, label: `${kind === "bimester" ? "Bimestre" : "Trimestre"} ${index + 1}`, starts_on: from, ends_on: until };
  });
}

export function evidenceIsCurrent(assessment, sourceRows) {
  return Boolean(assessment?.source_evidence_snapshot && sameEvidenceSourceSnapshot(assessment.source_evidence_snapshot, assessmentSourceSnapshot(sourceRows)));
}

export function conclusionIsCurrent(conclusion, assessment) {
  return Boolean(conclusion && assessment && conclusion.assessment_id === assessment.id && sameAssessmentSnapshot(conclusion.source_assessment_snapshot, sourceAssessmentSnapshot(assessment)));
}

export function evaluationState({ assessment, conclusion, draft, sourceRows }) {
  if (assessment && !evidenceIsCurrent(assessment, sourceRows)) return "needs_review";
  if (assessment && !assessment.achievement_level) return "level_pending";
  if (assessment?.achievement_level && assessment.achievement_level !== "AD" && !conclusionIsCurrent(conclusion, assessment)) return "conclusion_pending";
  if (assessment?.achievement_level && conclusion && !conclusionIsCurrent(conclusion, assessment)) return "needs_review";
  if (assessment?.achievement_level && (!conclusion || conclusionIsCurrent(conclusion, assessment))) return "confirmed";
  if (draft?.details?.information_status === "insufficient" && evidenceIsCurrent(draft, sourceRows)) return "insufficient_information";
  if (!sourceRows.length) return "no_evidence";
  if (sourceRows.length === 1) return "insufficient_information";
  return "pending";
}

export function periodClosureFingerprint(rows) {
  const normalized = rows.map((row) => ({ student_id: row.student_id, competency_v4_id: row.competency_v4_id, assessment_id: row.assessment?.id ?? null, level: row.assessment?.achievement_level ?? null, assessment_updated_at: row.assessment?.updated_at ?? null, conclusion_id: row.conclusion?.id ?? null, conclusion_updated_at: row.conclusion?.updated_at ?? null, evidence: assessmentSourceSnapshot(row.sourceRows) })).sort((a, b) => `${a.student_id}:${a.competency_v4_id}`.localeCompare(`${b.student_id}:${b.competency_v4_id}`));
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

export async function loadPeriodEvaluationRows(db, { classroomId, period, applicableIds }) {
  const students = (await db.query(`select id,first_name,last_name,preferred_name from students where classroom_id=$1 and status='active' order by last_name,first_name,id`, [classroomId])).rows;
  const criteria = (await db.query(`select distinct ac.competency_v4_id from activity_criteria ac join activities a on a.id=ac.activity_id join learning_experiences le on le.id=a.experience_id where le.classroom_id=$1 and a.status='active' and ac.status='active' and a.occurs_on between $2::date and $3::date and ac.competency_v4_id is not null`, [classroomId, period.starts_on, period.ends_on])).rows;
  const planned = (await db.query(`select ps.slot_index, ap.proposal from project_slots ps join annual_plans ap on ap.id=ps.annual_plan_id where ap.classroom_id=$1 and ap.status='active' and ps.starts_on<=$3::date and ps.ends_on>=$2::date`, [classroomId, period.starts_on, period.ends_on])).rows;
  const overrides = (await db.query(`select competency_v4_id,included from period_competency_scope where classroom_id=$1 and evaluation_period_id=$2`, [classroomId, period.id])).rows;
  const scope = new Set(criteria.map((row) => row.competency_v4_id).filter((id) => applicableIds.has(id)));
  for (const slot of planned) {
    const proposal = slot.proposal?.proposed_experiences?.[Number(slot.slot_index) - 1];
    for (const id of [...(proposal?.primary_competency_ids ?? []), ...(proposal?.possible_secondary_competency_ids ?? [])]) if (applicableIds.has(id)) scope.add(id);
  }
  const evidence = (await db.query(`select e.id,e.student_id,e.observed_at,coalesce(e.observed_on,e.observed_at::date) as observed_on,e.observation_status,e.observation_text,(e.media_path is not null) as media_available,e.activity_id,e.criterion_id,a.title as activity_title,ac.competency_v4_id,ac.criterion_text,ac.details,ac.performance_id from evidences e join students s on s.id=e.student_id join activities a on a.id=e.activity_id join activity_criteria ac on ac.id=e.criterion_id where s.classroom_id=$1 and coalesce(e.observed_on,e.observed_at::date) between $2::date and $3::date and ac.competency_v4_id is not null order by coalesce(e.observed_on,e.observed_at::date),e.observed_at,e.id`, [classroomId, period.starts_on, period.ends_on])).rows;
  for (const row of overrides) if (applicableIds.has(row.competency_v4_id)) {
    if (row.included) scope.add(row.competency_v4_id);
    else scope.delete(row.competency_v4_id);
  }
  // Una observación real vuelve visible la competencia aunque antes se haya retirado del alcance.
  for (const row of evidence) if (applicableIds.has(row.competency_v4_id)) scope.add(row.competency_v4_id);
  const assessments = (await db.query(`select ca.* from competency_assessments ca join students s on s.id=ca.student_id where s.classroom_id=$1 and ca.status='active' and (ca.evaluation_period_id=$2 or (ca.evaluation_period_id is null and ca.period_start=$3::date and ca.period_end=$4::date))`, [classroomId, period.id, period.starts_on, period.ends_on])).rows;
  const drafts = (await db.query(`select ca.* from competency_assessments ca join students s on s.id=ca.student_id where s.classroom_id=$1 and ca.status='draft' and (ca.evaluation_period_id=$2 or (ca.evaluation_period_id is null and ca.period_start=$3::date and ca.period_end=$4::date))`, [classroomId, period.id, period.starts_on, period.ends_on])).rows;
  for (const assessment of assessments) if (applicableIds.has(assessment.competency_v4_id)) scope.add(assessment.competency_v4_id);
  const conclusions = (await db.query(`select dc.* from competency_descriptive_conclusions dc join students s on s.id=dc.student_id where s.classroom_id=$1 and dc.status='active' and (dc.evaluation_period_id=$2 or (dc.evaluation_period_id is null and dc.period_start=$3::date and dc.period_end=$4::date))`, [classroomId, period.id, period.starts_on, period.ends_on])).rows;
  const key = (studentId, competencyId) => `${studentId}:${competencyId}`;
  const evidenceByKey = new Map(), assessmentByKey = new Map(), conclusionByKey = new Map(), draftByKey = new Map();
  for (const row of evidence) { const id = key(row.student_id, row.competency_v4_id); evidenceByKey.set(id, [...(evidenceByKey.get(id) ?? []), row]); }
  for (const row of assessments) assessmentByKey.set(key(row.student_id, row.competency_v4_id), row);
  for (const row of drafts) draftByKey.set(key(row.student_id, row.competency_v4_id), row);
  for (const row of conclusions) conclusionByKey.set(key(row.student_id, row.competency_v4_id), row);
  return { students, scope: [...scope], rows: students.flatMap((student) => [...scope].map((competencyId) => {
    const id = key(student.id, competencyId), sourceRows = evidenceByKey.get(id) ?? [], assessment = assessmentByKey.get(id) ?? null, conclusion = conclusionByKey.get(id) ?? null, draft = draftByKey.get(id) ?? null;
    return { student_id: student.id, competency_v4_id: competencyId, sourceRows, assessment, conclusion, draft, state: evaluationState({ sourceRows, assessment, conclusion, draft }) };
  })) };
}

export { dayAfter };
