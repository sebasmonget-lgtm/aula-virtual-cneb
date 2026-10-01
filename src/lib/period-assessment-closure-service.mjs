import { createHash, randomUUID } from "node:crypto";
import JSZip from "jszip";
import { versionTransaction } from "./version-integrity.mjs";

const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const dateOnly = (value) => value == null ? null : value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
export const TEACHER_ACHIEVEMENT_LEVELS = Object.freeze(["AD", "A", "B", "C"]);
const gradeOrder = TEACHER_ACHIEVEMENT_LEVELS;
export const isTeacherAchievementLevel = (value) => TEACHER_ACHIEVEMENT_LEVELS.includes(value);

const SHORT_LABEL_RULES = [
  [/comunica oralmente/i, "Se comunica"], [/lee diversos/i, "Lee"], [/escribe diversos/i, "Escribe"],
  [/cantidad/i, "Cantidad"], [/forma.*movimiento.*localizaci/i, "Forma y espacio"], [/indaga/i, "Indaga"],
  [/convive/i, "Convive"], [/construye su identidad/i, "Construye identidad"], [/motricidad/i, "Motricidad"],
  [/lenguajes artísticos/i, "Crea con arte"], [/entornos virtuales/i, "Entornos virtuales"], [/aprendizaje.*aut[oó]noma/i, "Aprende con autonomía"],
];

export function stableCompetencyLabel(card = {}) {
  const name = card.official_name ?? card.name ?? card.id ?? "Competencia";
  const shortLabel = SHORT_LABEL_RULES.find(([pattern]) => pattern.test(name))?.[1]
    ?? name.split(/\s+/).slice(0, 4).join(" ");
  const area = card.area_name ?? card.area?.official_name ?? card.area ?? card.curricular_area ?? "Área curricular";
  return { competency_id: card.id, short_label: shortLabel, area: typeof area === "string" ? area : "Área curricular", official_name: name };
}

export function activityMapState({ scheduleStatus, executionStatus, evidenceCount = 0 }) {
  if (["skipped", "not_worked", "cancelled"].includes(executionStatus) || ["not_worked", "cancelled"].includes(scheduleStatus)) return "skipped";
  if (executionStatus === "completed" || evidenceCount > 0) return "completed";
  if (executionStatus === "rescheduled" || scheduleStatus === "rescheduled") return "rescheduled";
  return "planned";
}

export function competencyWorkState(entries = [], planned = false) {
  const worked = entries.some((row) => row.activity_state === "completed");
  const evidenced = entries.some((row) => Number(row.evidence_count) > 0);
  return { planned, worked, evidenced, state: evidenced ? "evidenced" : worked ? "worked" : planned ? "planned" : "not_planned" };
}

export async function syncPeriodEvaluationMap(db, { classroomId, schoolYearId, period }) {
  const relations=(await db.query(`select to_regclass('period_evaluation_map_versions') is not null as map_ready,
    to_regclass('daily_execution_logs') is not null and to_regclass('class_schedule_entries') is not null as execution_ready,
    to_regclass('evidences') is not null and to_regclass('students') is not null as evidence_ready,
    to_regclass('experience_formal_contents') is not null as formal_content_ready`)).rows[0];
  const activities = (await db.query(`select a.id as activity_id,a.revision as activity_revision,a.occurs_on,
      (to_jsonb(a)->>'planned_date')::date as planned_date,coalesce(to_jsonb(a)->>'schedule_status','planned') as schedule_status,
      a.details as activity_details,le.id as experience_id,coalesce(to_jsonb(le)->>'type','project') as experience_type,le.revision as experience_revision,
      ac.id as criterion_id,ac.revision as criterion_revision,(to_jsonb(ac)->>'supersedes_criterion_id')::uuid as supersedes_criterion_id,
      ac.competency_v4_id,ac.details as criterion_details
    from activity_criteria ac join activities a on a.id=ac.activity_id
    join learning_experiences le on le.id=a.experience_id
    where le.classroom_id=$1 and a.status='active' and ac.status='active' and ac.competency_v4_id is not null
      and a.occurs_on between $2::date and $3::date
    order by a.occurs_on,a.id,ac.id`, [classroomId, period.starts_on, period.ends_on])).rows;
  const executions = relations.execution_ready ? (await db.query(`select se.activity_id,del.execution_date,del.status
    from daily_execution_logs del join class_schedule_entries se on se.id=del.schedule_entry_id
    where se.classroom_id=$1 and se.activity_id is not null and del.execution_date between $2::date and $3::date
    order by del.execution_date desc,del.id desc`, [classroomId, period.starts_on, period.ends_on])).rows : [];
  const evidence = relations.evidence_ready ? (await db.query(`select e.criterion_id,count(*)::int as evidence_count,count(distinct e.student_id)::int as students_with_evidence,
      max(coalesce((to_jsonb(e)->>'observed_on')::date,e.observed_at::date)) as actual_on
    from evidences e join students s on s.id=e.student_id where s.classroom_id=$1
      and coalesce((to_jsonb(e)->>'observed_on')::date,e.observed_at::date) between $2::date and $3::date group by e.criterion_id`,
    [classroomId, period.starts_on, period.ends_on])).rows : [];
  const formalContents = relations.formal_content_ready && activities.length ? (await db.query(`select id,experience_id from experience_formal_contents
    where experience_id=any($1::uuid[])`, [[...new Set(activities.map((row) => row.experience_id))]])).rows : [];
  const executionByActivity = new Map(executions.map((row) => [row.activity_id, row]));
  const evidenceByCriterion = new Map(evidence.map((row) => [row.criterion_id, row]));
  const formalContentByExperience = new Map(formalContents.map((row) => [row.experience_id, row.id]));
  const snapshot = activities.map((row) => {
    const actual = evidenceByCriterion.get(row.criterion_id), execution = executionByActivity.get(row.activity_id);
    const evidenceCount = Number(actual?.evidence_count ?? 0);
    const item = {
      learning_experience_id: row.experience_id, learning_experience_type: row.experience_type,
      experience_revision: Number(row.experience_revision ?? 1), formal_content_id: formalContentByExperience.get(row.experience_id) ?? null,
      activity_blueprint_ref: row.activity_details?.activity_blueprint_id ?? row.activity_details?.route_item_id ?? null,
      activity_id: row.activity_id, activity_revision: Number(row.activity_revision ?? 1),
      criterion_id: row.criterion_id, criterion_revision: Number(row.criterion_revision ?? 1),
      criterion_source: row.supersedes_criterion_id ? "criterion_realignment" : "project_master",
      planned_on: dateOnly(row.planned_date ?? row.occurs_on),
      actual_on: dateOnly(execution?.execution_date ?? actual?.actual_on),
      activity_state: activityMapState({ scheduleStatus: row.schedule_status, executionStatus: execution?.status, evidenceCount }),
      competency_v4_id: row.competency_v4_id,
      students_with_evidence: Number(actual?.students_with_evidence ?? 0), evidence_count: evidenceCount,
    };
    return { ...item, source_fingerprint: hash(item) };
  });
  const sourceFingerprint = hash(snapshot);
  if(!relations.map_ready) return { version: 1, source_fingerprint: sourceFingerprint, entries: snapshot, changed: true, ephemeral: true };
  return versionTransaction(db, `period-evaluation-map:${classroomId}:${period.id}`, async (tx) => {
    const latest = (await tx.query(`select version,source_fingerprint from period_evaluation_map_versions
      where classroom_id=$1 and evaluation_period_id=$2 order by version desc limit 1`, [classroomId, period.id])).rows[0];
    if (latest?.source_fingerprint === sourceFingerprint) {
      return { version: Number(latest.version), source_fingerprint: sourceFingerprint, entries: snapshot, changed: false };
    }
    const version = Number(latest?.version ?? 0) + 1;
    await tx.query(`insert into period_evaluation_map_versions(id,classroom_id,evaluation_period_id,version,source_fingerprint,snapshot)
      values($1,$2,$3,$4,$5,$6::jsonb)`, [randomUUID(), classroomId, period.id, version, sourceFingerprint, JSON.stringify(snapshot)]);
    const ids = [];
    for (const item of snapshot) {
      ids.push(item.criterion_id);
      await tx.query(`insert into period_evaluation_map_entries(id,classroom_id,school_year_id,evaluation_period_id,map_version,
        learning_experience_id,learning_experience_type,experience_revision,formal_content_id,activity_blueprint_ref,
        activity_id,activity_revision,criterion_id,criterion_revision,criterion_source,planned_on,actual_on,activity_state,
        competency_v4_id,students_with_evidence,evidence_count,source_fingerprint)
        values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::date,$17::date,$18,$19,$20,$21,$22)
        on conflict(classroom_id,evaluation_period_id,criterion_id) do update set map_version=excluded.map_version,
        experience_revision=excluded.experience_revision,formal_content_id=excluded.formal_content_id,
        activity_blueprint_ref=excluded.activity_blueprint_ref,activity_revision=excluded.activity_revision,
        criterion_revision=excluded.criterion_revision,criterion_source=excluded.criterion_source,planned_on=excluded.planned_on,
        actual_on=excluded.actual_on,activity_state=excluded.activity_state,competency_v4_id=excluded.competency_v4_id,
        students_with_evidence=excluded.students_with_evidence,evidence_count=excluded.evidence_count,
        source_fingerprint=excluded.source_fingerprint,updated_at=now()`, [randomUUID(), classroomId, schoolYearId, period.id,
        version, item.learning_experience_id, item.learning_experience_type, item.experience_revision, item.formal_content_id,
        item.activity_blueprint_ref, item.activity_id, item.activity_revision, item.criterion_id, item.criterion_revision,
        item.criterion_source, item.planned_on, item.actual_on, item.activity_state, item.competency_v4_id,
        item.students_with_evidence, item.evidence_count, item.source_fingerprint]);
    }
    if(ids.length) await tx.query(`delete from period_evaluation_map_entries where classroom_id=$1 and evaluation_period_id=$2
      and not(criterion_id=any($3::uuid[]))`, [classroomId, period.id, ids]);
    else await tx.query(`delete from period_evaluation_map_entries where classroom_id=$1 and evaluation_period_id=$2`,[classroomId,period.id]);
    return { version, source_fingerprint: sourceFingerprint, entries: snapshot, changed: true };
  });
}

export function buildPeriodStatistics({ rows, mapEntries = [], competencyMeta = [], studentCount = 0, plannedCompetencyIds = [] }) {
  const meta = new Map(competencyMeta.map((item) => [item.competency_id ?? item.id, item]));
  const planned = new Set(plannedCompetencyIds);
  const competencyIds = [...new Set([...planned, ...mapEntries.map((row) => row.competency_v4_id), ...rows.map((row) => row.competency_id ?? row.competency_v4_id)])].sort();
  const competencies = competencyIds.map((id) => {
    const relevantRows = rows.filter((row) => (row.competency_id ?? row.competency_v4_id) === id);
    const relevantMap = mapEntries.filter((row) => row.competency_v4_id === id);
    const levels = Object.fromEntries(gradeOrder.map((level) => [level, relevantRows.filter((row) => (row.level ?? row.assessment?.achievement_level) === level).length]));
    const evaluated = gradeOrder.reduce((sum, level) => sum + levels[level], 0);
    const withEvidence = new Set(relevantRows.filter((row) => Number(row.evidence_count ?? row.sourceRows?.length ?? 0) > 0).map((row) => row.student_id)).size;
    const noEvidence = Math.max(0, relevantRows.length - withEvidence);
    const work = competencyWorkState(relevantMap, planned.has(id));
    return { competency_id: id, short_label: meta.get(id)?.short_label ?? id, area: meta.get(id)?.area ?? "Área curricular",
      official_name: meta.get(id)?.official_name ?? id, ...work, evaluated, levels,
      percentages: Object.fromEntries(gradeOrder.map((level) => [level, evaluated ? Math.round(levels[level] * 1000 / evaluated) / 10 : 0])),
      students_without_grade: Math.max(0, relevantRows.length - evaluated), students_without_evidence: noEvidence,
      activity_count: new Set(relevantMap.filter((row) => row.activity_state === "completed").map((row) => row.activity_id)).size,
      criterion_count: new Set(relevantMap.map((row) => row.criterion_id)).size,
      evidence_count: relevantMap.reduce((sum, row) => sum + Number(row.evidence_count ?? 0), 0),
      evidence_coverage: studentCount ? Math.round(withEvidence * 1000 / studentCount) / 10 : 0 };
  });
  const totalCells = rows.length, confirmed = rows.filter((row) => gradeOrder.includes(row.level ?? row.assessment?.achievement_level)).length;
  const evidenceCounts = rows.map((row) => Number(row.evidence_count ?? row.sourceRows?.length ?? 0));
  return { student_count: studentCount, competencies,
    classroom: { competencies_worked: competencies.filter((row) => row.worked).length,
      competencies_planned_not_worked: competencies.filter((row) => row.planned && !row.worked).length,
      low_coverage_competencies: competencies.filter((row) => row.worked && row.evidence_coverage < 70).map((row) => row.competency_id),
      pending_assessments: totalCells - confirmed, confirmed_assessments: confirmed, total_assessments: totalCells,
      average_evidence_per_student_competency: evidenceCounts.length ? Math.round(evidenceCounts.reduce((a, b) => a + b, 0) * 100 / evidenceCounts.length) / 100 : 0 } };
}

export const CLASSROOM_PERIOD_REPORT_SCHEMA = { id: "classroom-period-report-v1", type: "object", additionalProperties: false,
  required: ["general_overview","developed_competencies","group_strengths","competencies_needing_development","little_or_not_worked","evidence_coverage","follow_up_summary","next_period_findings"],
  properties: Object.fromEntries(["general_overview","evidence_coverage","follow_up_summary"].map((key) => [key,{type:"string",minLength:1}]).concat(
    ["developed_competencies","group_strengths","competencies_needing_development","little_or_not_worked","next_period_findings"].map((key) => [key,{type:"array",items:{type:"string",minLength:1}}]))) };

export function validateClassroomPeriodReport(value) {
  const fields = Object.keys(CLASSROOM_PERIOD_REPORT_SCHEMA.properties);
  if (!value || typeof value !== "object" || fields.some((key) => !(key in value)) || Object.keys(value).some((key) => !fields.includes(key))) throw new Error("El informe del aula no cumple classroom-period-report-v1.");
  for (const key of ["general_overview","evidence_coverage","follow_up_summary"]) if (typeof value[key] !== "string" || !value[key].trim()) throw new Error(`Falta ${key}.`);
  for (const key of fields.filter((item) => !["general_overview","evidence_coverage","follow_up_summary"].includes(item))) if (!Array.isArray(value[key]) || value[key].some((item) => typeof item !== "string" || !item.trim())) throw new Error(`El campo ${key} es inválido.`);
  if (/\d|\b(?:inventad[oa]|aproximadamente)\b/i.test(JSON.stringify(value))) throw new Error("El informe narrativo no puede introducir cifras; los números se muestran desde las estadísticas calculadas.");
  return value;
}

export function buildClassroomPeriodReportInput({ age, competencyIds, statistics, evaluationMap, classroomContext }) {
  const evaluationMapSummary = evaluationMap.map((row) => ({ competency_id: row.competency_v4_id,
    activity_state: row.activity_state, evidence_count: Number(row.evidence_count), students_with_evidence: Number(row.students_with_evidence) }));
  return { workflow: "classroom_period_report", age, competency_ids: competencyIds,
    teacher_request: "Interpreta solo los datos agregados calculados por Ayni. Distingue desempeño, cobertura y competencias no trabajadas. No inventes cifras ni menciones nombres de estudiantes.",
    classroom_context: { id: "current_classroom", group_context: classroomContext?.group_context ?? null,
      period_statistics: statistics, evaluation_map_summary: evaluationMapSummary },
    period_statistics: statistics, evaluation_map_summary: evaluationMapSummary };
}

export function classroomReportFingerprint(statistics, mapVersion) { return hash({ statistics, mapVersion }); }

const xml = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const columnName = (index) => { let result = "", value = index + 1; while (value) { value--; result = String.fromCharCode(65 + value % 26) + result; value = Math.floor(value / 26); } return result; };
export async function buildGenericAssessmentWorkbook(rows) {
  const states = { confirmed: "Valorada por la docente", observation_pending: "Pendiente de observación", insufficient_information: "Información insuficiente", needs_review: "Requiere revisión", conclusion_pending: "Falta conclusión descriptiva", pending: "Pendiente de revisión docente", draft: "Borrador por revisar" };
  const data = [["Alumno","Competencia","Valoración","Conclusión descriptiva","Período","Estado"], ...rows.map((row) => [row.student_name,row.competency_name,row.state === "confirmed" ? row.achievement_level ?? "" : "",row.state === "confirmed" ? row.conclusion ?? "" : "",row.period_label ?? "",states[row.state] ?? row.state ?? "Sin valoración"])];
  const sheet = data.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, columnIndex) => `<c r="${columnName(columnIndex)}${rowIndex + 1}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`).join("")}</row>`).join("");
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`);
  zip.folder("_rels").file(".rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  zip.folder("xl").file("workbook.xml", `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Consolidado" sheetId="1" r:id="rId1"/></sheets></workbook>`);
  zip.folder("xl").folder("_rels").file("workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`);
  zip.folder("xl").folder("worksheets").file("sheet1.xml", `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheet}</sheetData></worksheet>`);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

export const SIAGIE_EXPORT_STATUS = Object.freeze({ implemented: false, label: "Exportar para SIAGIE", message: "Próximamente: pendiente de configurar con el formato oficial del colegio." });
