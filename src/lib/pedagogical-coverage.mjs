import { dateOnly } from "./period-evaluation-service.mjs";

/** Read-only projection. A missing observation is never interpreted as a low achievement level. */
export function projectPedagogicalCoverage({ students, cards, model, activityCounts = new Map() }) {
  const planned = new Set(model.scope);
  const sourceByKey = new Map(model.rows.map((row) => [`${row.student_id}:${row.competency_v4_id}`, row]));
  const rows = cards.flatMap((card) => students.map((student) => {
    const source = sourceByKey.get(`${student.id}:${card.id}`);
    const evidence = source?.sourceRows ?? [];
    const last = evidence.map((item) => dateOnly(item.observed_on ?? item.observed_at)).sort().at(-1) ?? null;
    const evaluated = source?.state === "confirmed";
    const status = evaluated ? "evaluada" : source?.state === "insufficient_information" ? "informacion_insuficiente" : evidence.length ? "pendiente" : "sin_registro";
    return { student_id: student.id, competency_id: card.id, planned: planned.has(card.id),
      evidence_count: evidence.length, last_observation: last, activity_count: activityCounts.get(card.id) ?? 0,
      evaluation_status: status };
  }));
  return { rows, by_competency: cards.map((card) => {
    const selected=rows.filter((row)=>row.competency_id===card.id);
    return { competency_id:card.id,competency_name:card.official_name,planned:planned.has(card.id),
      activity_count:activityCounts.get(card.id)??0,students_with_evidence:selected.filter((row)=>row.evidence_count>0).length,
      students_without_record:selected.filter((row)=>row.evidence_count===0).length,
      evidence_count:selected.reduce((sum,row)=>sum+row.evidence_count,0) };
  }), by_student: students.map((student)=>{
    const selected=rows.filter((row)=>row.student_id===student.id);
    return { student_id:student.id,student_name:[student.preferred_name||student.first_name,student.last_name].filter(Boolean).join(" "),
      with_evidence:selected.filter((row)=>row.evidence_count>0).length,
      without_record:selected.filter((row)=>row.evidence_count===0).length,
      evaluated:selected.filter((row)=>row.evaluation_status==="evaluada").length,
      pending:selected.filter((row)=>row.planned&&row.evaluation_status!=="evaluada").length };
  }) };
}
