import { createHash, randomUUID } from "node:crypto";
import { VersionConflictError, versionTransaction } from "./version-integrity.mjs";
import { lockClassroomSchedule } from "./activity-schedule-integrity.mjs";
import { activityPedagogicalBlocks } from "./pedagogical-blocks.mjs";

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const validId = value => typeof value === "string" && uuid.test(value);

export function validateOrdinaryObservation(input) {
  if (!input || !validId(input.studentId)) throw new TypeError("Selecciona a un alumno antes de guardar la observación.");
  if (!validId(input.clientRequestId)) throw new TypeError("La solicitud de observación no es válida.");
  if (!['guided', 'spontaneous'].includes(input.sourceKind)) throw new TypeError("Elige el tipo de observación.");
  if (input.activityId != null && !validId(input.activityId)) throw new TypeError("La actividad no es válida.");
  if (input.criterionId != null && (!validId(input.criterionId) || !input.activityId)) throw new TypeError("El criterio requiere una actividad válida.");
  if (input.momentId != null && (typeof input.momentId !== 'string' || !input.criterionId || input.momentId.length > 80)) throw new TypeError("El momento requiere un criterio de la actividad.");
  const rawText = input.rawText == null ? null : input.rawText;
  if (rawText !== null && (typeof rawText !== 'string' || !rawText.trim() || rawText.length > 4000))
    throw new TypeError("Escribe una observación de hasta 4000 caracteres.");
  if (!rawText && !input.hasMedia) throw new TypeError("Escribe un hecho o adjunta una foto.");
  // Raw text, including names, casing, line breaks and transcription mistakes, is never normalized.
  return { studentId: input.studentId, clientRequestId: input.clientRequestId,
    sourceKind: input.sourceKind, activityId: input.activityId ?? null,
    criterionId: input.criterionId ?? null, ...(input.momentId ? { momentId: input.momentId } : {}), rawText };
}

export async function saveOrdinaryObservation(db, teacherId, input, { mediaPath = null, mediaMimeType = null, mediaFingerprint = null, occurredAt = new Date() } = {}) {
  const capture = validateOrdinaryObservation({ ...input, hasMedia: Boolean(mediaPath) });
  if (!validId(teacherId)) throw new TypeError("Docente no válido.");
  const student = (await db.query(`select s.id,s.classroom_id from students s
    join classrooms c on c.id=s.classroom_id where s.id=$1 and s.status='active'
    and c.teacher_id=$2 and c.status='active'`, [capture.studentId, teacherId])).rows[0];
  if (!student) throw new ObservationPermissionError();
  let context = {};
  let projectId = null;
  let blueprintId = null;
  if (capture.activityId) {
    const activity = (await db.query(`select a.id,a.title,a.occurs_on::text,a.details,le.id as project_id,le.title as project_title
      from activities a join learning_experiences le on le.id=a.experience_id
      where a.id=$1 and le.classroom_id=$2 and a.status in ('active','archived')`,
    [capture.activityId, student.classroom_id])).rows[0];
    if (!activity) throw new ObservationPermissionError();
    projectId = activity.project_id;
    const ref = activity.details?.activity_contract?.blueprint_id ?? activity.details?.route_item_id;
    blueprintId = validId(ref) ? ref : null;
    context = { activity_id: activity.id, activity_title: activity.title,
      activity_date: String(activity.occurs_on).slice(0, 10), project_id: projectId,
      project_title: activity.project_title, blueprint_id: blueprintId,
      project_version: activity.details?.activity_contract?.project_version ?? null,
      project_fingerprint: activity.details?.activity_contract?.project_fingerprint ?? null };
    if (capture.momentId) {
      const preparation=(await db.query(`select preparation from activities where id=$1`,[capture.activityId])).rows[0]?.preparation;
      const criteria=(await db.query(`select id,criterion_text,competency_v4_id,details from activity_criteria where activity_id=$1 and status='active'`,[capture.activityId])).rows;
      const moment=activityPedagogicalBlocks(activity.details??{},preparation?.steps??[],criteria)
        .find(block=>block.id===capture.momentId&&block.observations?.some(item=>item.id===capture.criterionId));
      if(!moment)throw new TypeError("El momento para observar ya no pertenece a esta actividad. Recarga su guía.");
      context={...context,moment_id:moment.id,moment_title:moment.title};
    }
  }
  if (capture.criterionId) {
    const criterion = (await db.query(`select ac.id,ac.competency_id,ac.competency_v4_id,ac.criterion_text from activity_criteria ac
      where ac.id=$1 and ac.activity_id=$2 and ac.status='active'`,
    [capture.criterionId,capture.activityId])).rows[0];
    if (!criterion) throw new ObservationPermissionError();
    context = { ...context, captured_criterion_id: criterion.id,
      captured_criterion_text: criterion.criterion_text,
      captured_competency_id: criterion.competency_v4_id,
      captured_legacy_competency_id: criterion.competency_id };
  }
  const eventTime = occurredAt instanceof Date ? occurredAt : new Date(occurredAt);
  if (Number.isNaN(eventTime.getTime())) throw new TypeError("La fecha de observación no es válida.");
  const civilDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(eventTime);
  const period = (await db.query(`select ep.id from evaluation_periods ep
    join classrooms c on c.school_year_id=ep.school_year_id
    where c.id=$1 and $2::date between ep.starts_on and ep.ends_on
    order by ep.starts_on limit 1`, [student.classroom_id,civilDate])).rows[0];
  context = { ...context, evaluation_period_id: period?.id ?? null };
  const fingerprint = createHash('sha256').update(JSON.stringify({ ...capture, mediaMimeType, mediaFingerprint })).digest('hex');
  return versionTransaction(db, `raw:${teacherId}:${capture.clientRequestId}`, async tx => {
    await lockClassroomSchedule(tx, student.classroom_id);
    const existing = (await tx.query(`select * from ordinary_observations where created_by=$1 and client_request_id=$2`,
      [teacherId, capture.clientRequestId])).rows[0];
    if (existing) {
      if (existing.request_fingerprint !== fingerprint) throw new VersionConflictError("La solicitud ya se usó con otro contenido.");
      return { observation: existing, created: false };
    }
    if (capture.activityId) {
      const current = (await tx.query("select occurs_on::text from activities where id=$1", [capture.activityId])).rows[0];
      if (!current || current.occurs_on !== context.activity_date)
        throw new VersionConflictError("La fecha de la actividad cambió. Revisa su ubicación antes de guardar la observación.");
    }
    const observation = (await tx.query(`insert into ordinary_observations
      (id,classroom_id,student_id,created_by,client_request_id,request_fingerprint,occurred_at,
       raw_text,media_path,media_mime_type,source_kind,context_snapshot,activity_id,project_id,blueprint_id,captured_criterion_id)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,$15,$16) returning *`,
    [randomUUID(), student.classroom_id, capture.studentId, teacherId, capture.clientRequestId,
      fingerprint, eventTime, capture.rawText, mediaPath, mediaMimeType,
      capture.sourceKind, JSON.stringify(context), capture.activityId, projectId, blueprintId, capture.criterionId])).rows[0];
    return { observation, created: true };
  });
}

export async function listOrdinaryObservations(db, teacherId, studentId = null) {
  if (studentId != null && !validId(studentId)) throw new TypeError("Alumno no válido.");
  return (await db.query(`select o.*, r.corrected_text, r.action as latest_action
    from ordinary_observations o join classrooms c on c.id=o.classroom_id
    join students s on s.id=o.student_id and s.classroom_id=o.classroom_id
    left join lateral (select corrected_text, action from ordinary_observation_revisions
      where observation_id=o.id order by revision desc limit 1) r on true
    where c.teacher_id=$1 and o.created_by=$1 and ($2::uuid is null or o.student_id=$2)
    order by o.occurred_at desc,o.id desc`, [teacherId, studentId])).rows;
}

export async function reviseOrdinaryObservation(db, teacherId, observationId, input) {
  if (!validId(observationId) || !validId(teacherId)) throw new TypeError("Observación no válida.");
  const action = input?.action;
  const reason = typeof input?.reason === 'string' ? input.reason.trim() : '';
  const correctedText = input?.correctedText;
  if (!['correct','void'].includes(action) || reason.length < 3 || reason.length > 500)
    throw new TypeError("Indica la corrección y un motivo breve.");
  if (action === 'correct' && (typeof correctedText !== 'string' || !correctedText.trim() || correctedText.length > 4000))
    throw new TypeError("Escribe la corrección sin borrar el original.");
  if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 1)
    throw new VersionConflictError("Recarga la observación para corregirla.");
  return versionTransaction(db, `raw-revision:${observationId}`, async tx => {
    const row = (await tx.query(`select o.* from ordinary_observations o join classrooms c on c.id=o.classroom_id
      where o.id=$1 and o.created_by=$2 and c.teacher_id=$2 for update of o`, [observationId, teacherId])).rows[0];
    if (!row) throw new ObservationPermissionError();
    if (row.source_revision !== input.expectedRevision) throw new VersionConflictError(undefined, row.source_revision);
    if (row.status === 'voided') throw new TypeError("La observación anulada no se puede corregir.");
    const next = row.source_revision + 1;
    await tx.query(`insert into ordinary_observation_revisions
      (id,observation_id,revision,corrected_text,action,reason,created_by)
      values($1,$2,$3,$4,$5,$6,$7)`, [randomUUID(), observationId, next,
      action === 'correct' ? correctedText : null, action, reason, teacherId]);
    return (await tx.query(`update ordinary_observations set status=$1,source_revision=$2
      where id=$3 and source_revision=$4 returning *`,
    [action === 'void' ? 'voided' : 'corrected', next, observationId, row.source_revision])).rows[0];
  });
}

export class ObservationPermissionError extends Error {
  constructor() { super("La observación o el alumno no pertenecen a tu aula."); this.status = 403; }
}
