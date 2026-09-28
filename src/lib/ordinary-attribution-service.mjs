import { randomUUID } from "node:crypto";
import { VersionConflictError, versionTransaction } from "./version-integrity.mjs";
import { ObservationPermissionError } from "./ordinary-observation-service.mjs";

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const validId = value => typeof value === "string" && uuid.test(value);

async function ownedObservation(db, teacherId, observationId) {
  if (!validId(observationId) || !validId(teacherId)) throw new TypeError("Observación no válida.");
  const observation = (await db.query(`select o.*, ag.age_years as age,c.castellano_l2_applicable,c.religion_applicable,
      coalesce(r.corrected_text,o.raw_text) as effective_text
    from ordinary_observations o join classrooms c on c.id=o.classroom_id
    join age_grades ag on ag.id=c.age_grade_id
    join students s on s.id=o.student_id and s.classroom_id=o.classroom_id
    left join lateral (select corrected_text from ordinary_observation_revisions
      where observation_id=o.id order by revision desc limit 1) r on true
    where o.id=$1 and o.created_by=$2 and c.teacher_id=$2`, [observationId, teacherId])).rows[0];
  if (!observation) throw new ObservationPermissionError();
  return observation;
}

async function latest(db, observationId) {
  return (await db.query(`select * from ordinary_observation_attributions where observation_id=$1
    order by version desc limit 1`, [observationId])).rows[0] ?? null;
}

function distinctAllowed(ids, allowed) {
  if (!Array.isArray(ids) || ids.length > 12 || ids.some(id => typeof id !== "string" || !allowed.has(id)))
    throw new TypeError("Elige solo competencias aplicables del currículo vigente.");
  return [...new Set(ids)];
}

export async function recordOrdinarySuggestion(db, teacherId, observationId, {
  expectedVersion, candidateIds = [], allowedIds, provenance = {}, unavailable = false,
}) {
  const allowed = new Set(allowedIds);
  const candidates = distinctAllowed(candidateIds, allowed);
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) throw new VersionConflictError();
  const observation = await ownedObservation(db, teacherId, observationId);
  return versionTransaction(db, `raw-attribution:${observationId}`, async tx => {
    const previous = await latest(tx, observationId);
    if ((previous?.version ?? 0) !== expectedVersion) throw new VersionConflictError("La revisión cambió; recarga la observación.", previous?.version ?? 0);
    if (["confirmed", "unclassified"].includes(previous?.state) && previous.raw_revision === observation.source_revision)
      throw new VersionConflictError("Ayni no puede reemplazar una decisión docente.", previous.version);
    if (observation.source_revision !== (await ownedObservation(tx, teacherId, observationId)).source_revision)
      throw new VersionConflictError("La observación cambió; recarga antes de sugerir.");
    const state = unavailable ? "unavailable" : "suggested";
    return (await tx.query(`insert into ordinary_observation_attributions
      (id,observation_id,version,state,source,candidate_competency_ids,confirmed_competency_ids,
       confirmed_criterion_ids,raw_revision,provenance,created_by)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11) returning *`,
    [randomUUID(),observationId,expectedVersion+1,state,unavailable?"system":"jev",candidates,[],[],
      observation.source_revision,JSON.stringify(provenance),teacherId])).rows[0];
  });
}

export async function confirmOrdinaryAttribution(db, teacherId, observationId, {
  expectedVersion, competencyIds = [], criterionIds = [], allowedIds, reason = "",
}) {
  const selected = distinctAllowed(competencyIds, new Set(allowedIds));
  if (!Array.isArray(criterionIds) || criterionIds.length > 12 || criterionIds.some(id => !validId(id)))
    throw new TypeError("Criterio inválido.");
  const uniqueCriteria = [...new Set(criterionIds)];
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) throw new VersionConflictError();
  if (typeof reason !== "string" || reason.length > 500) throw new TypeError("Motivo inválido.");
  const observation = await ownedObservation(db, teacherId, observationId);
  if (observation.status === "voided") throw new TypeError("Una observación anulada no se puede atribuir.");
  if (uniqueCriteria.length && !observation.activity_id) throw new TypeError("Una observación espontánea no tiene criterio de actividad.");
  if (uniqueCriteria.length) {
    const criteria = (await db.query(`select id,competency_v4_id from activity_criteria
      where id=any($1::uuid[]) and activity_id=$2 and status='active'`,
    [uniqueCriteria, observation.activity_id])).rows;
    if (criteria.length !== uniqueCriteria.length || criteria.some(item => !selected.includes(item.competency_v4_id)))
      throw new TypeError("El criterio no corresponde a la actividad y competencia seleccionadas.");
  }
  return versionTransaction(db, `raw-attribution:${observationId}`, async tx => {
    const previous = await latest(tx, observationId);
    if ((previous?.version ?? 0) !== expectedVersion) throw new VersionConflictError("La revisión cambió; recarga la observación.", previous?.version ?? 0);
    if (observation.source_revision !== (await ownedObservation(tx, teacherId, observationId)).source_revision)
      throw new VersionConflictError("La observación cambió; recarga antes de confirmar.");
    const attribution = (await tx.query(`insert into ordinary_observation_attributions
      (id,observation_id,version,state,source,candidate_competency_ids,confirmed_competency_ids,
       confirmed_criterion_ids,raw_revision,provenance,created_by)
      values($1,$2,$3,$4,'teacher',$5,$6,$7,$8,$9::jsonb,$10) returning *`,
    [randomUUID(),observationId,expectedVersion+1,selected.length ? "confirmed" : "unclassified",
      selected.length ? previous?.candidate_competency_ids ?? [] : [],
      selected,uniqueCriteria,observation.source_revision,
      JSON.stringify({ reason, captured_criterion_id: observation.captured_criterion_id }),teacherId])).rows[0];
    for (const criterionId of uniqueCriteria) await tx.query(`insert into ordinary_observation_criterion_links
      (id,observation_id,attribution_id,criterion_id,source_revision,created_by) values($1,$2,$3,$4,$5,$6)`,
    [randomUUID(),observationId,attribution.id,criterionId,observation.source_revision,teacherId]);
    return attribution;
  });
}

export async function ordinaryAttributionHistory(db, teacherId, observationId) {
  const observation = await ownedObservation(db, teacherId, observationId);
  const history = (await db.query(`select * from ordinary_observation_attributions where observation_id=$1
    order by version`, [observationId])).rows;
  return { observation, history, latest: history.at(-1) ?? null };
}

export async function ordinaryReviewQueue(db, teacherId, classroomId = null) {
  return (await db.query(`select o.id,o.student_id,o.raw_text,r.corrected_text,o.source_kind,o.activity_id,o.captured_criterion_id,
      o.source_revision,o.status,a.version as attribution_version,a.state as attribution_state,
      a.candidate_competency_ids,a.confirmed_competency_ids,a.confirmed_criterion_ids,a.raw_revision as attribution_raw_revision
    from ordinary_observations o join classrooms c on c.id=o.classroom_id
    left join lateral (select corrected_text from ordinary_observation_revisions
      where observation_id=o.id order by revision desc limit 1) r on true
    left join lateral (select * from ordinary_observation_attributions av where av.observation_id=o.id
      order by av.version desc limit 1) a on true
    where c.teacher_id=$1 and o.created_by=$1 and ($2::uuid is null or o.classroom_id=$2::uuid) and o.status<>'voided'
      and (a.id is null or a.state not in ('confirmed','unclassified') or a.raw_revision<>o.source_revision)
      and (o.captured_criterion_id is null or a.id is not null)
    order by o.occurred_at desc,o.id desc`, [teacherId, classroomId])).rows;
}
