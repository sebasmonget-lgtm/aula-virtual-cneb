import { randomUUID } from "node:crypto";
import { assertRevision, versionTransaction, VersionConflictError } from "./version-integrity.mjs";

export class LearningExperienceVersionError extends Error {
  constructor(reason, message) { super(message); this.name = "LearningExperienceVersionError"; this.reason = reason; }
}

export async function copyConfirmedLearningExperience(db, teacherId, classroomId, sourceId, expectedSourceRevision = null) {
  const identity = (await db.query(`select lineage_id from learning_experiences where id=$1`, [sourceId])).rows[0];
  if (!identity) throw new LearningExperienceVersionError("source_unavailable", "El proyecto o unidad vigente ya no está disponible.");
  return versionTransaction(db, `experience:${identity.lineage_id}`, async (tx) => {
    const source = (await tx.query(`select e.* from learning_experiences e
      join classrooms c on c.id=e.classroom_id and c.teacher_id=$1
      join school_years sy on sy.id=c.school_year_id and sy.owner_id=$1
      where e.id=$2 and e.classroom_id=$3 and e.type in ('project','unit') and e.status='active' for update of e`,
    [teacherId, sourceId, classroomId])).rows[0];
    if (!source) throw new LearningExperienceVersionError("source_unavailable", "El proyecto o unidad vigente ya no está disponible.");
    if (expectedSourceRevision !== null) assertRevision(source, expectedSourceRevision);
    if (typeof source.details?.starting_point !== "string")
      throw new LearningExperienceVersionError("legacy_experience", "Este proyecto usa un formato anterior y no puede copiarse automáticamente.");
    const existing = (await tx.query(`select id from learning_experiences where lineage_id=$1 and status='draft'`, [source.lineage_id])).rows[0];
    if (existing) throw new VersionConflictError("Ya existe un borrador nuevo de este proyecto o unidad.", source.revision, "draft_exists");
    const id = randomUUID();
    const dateOnly = (date) => date instanceof Date ? date.toISOString().slice(0,10) : String(date).slice(0,10);
    const version = Number(source.version ?? 1) + 1;
    await tx.query(`insert into learning_experiences
      (id,classroom_id,type,title,purpose,starts_on,ends_on,status,details,annual_plan_id,origin,
       planning_reason,source_proposal_index,generation_metadata,version,supersedes_experience_id,lineage_id,source_proposal_id)
      values ($1,$2,$3,$4,$5,$6::date,$7::date,'draft',$8::jsonb,$9,$10,$11,$12,$13::jsonb,$14,$15,$16,$17)`,
    [id, source.classroom_id, source.type, source.title, source.purpose, dateOnly(source.starts_on), dateOnly(source.ends_on),
      JSON.stringify(source.details), source.annual_plan_id, source.origin, source.planning_reason,
      source.source_proposal_index, JSON.stringify({ workflow: "learning_experience_copy", source_experience_id: source.id }), version, source.id, source.lineage_id, source.source_proposal_id]);
    return { id, version, revision: 1, lineage_id: source.lineage_id, status: "draft", supersedes_experience_id: source.id };
  });
}

export async function confirmLearningExperienceVersion(db, classroomId, draftId, expectedDraftRevision = null) {
  const identity = (await db.query(`select lineage_id from learning_experiences where id=$1`, [draftId])).rows[0];
  if (!identity) throw new LearningExperienceVersionError("draft_unavailable", "El borrador ya no está disponible.");
  return versionTransaction(db, `experience:${identity.lineage_id}`, async (tx) => {
    const draft = (await tx.query(`select id,revision,lineage_id,supersedes_experience_id,annual_plan_id,origin,source_proposal_index,type
      from learning_experiences where id=$1 and classroom_id=$2 and status='draft' for update`, [draftId, classroomId])).rows[0];
    if (!draft) throw new VersionConflictError("El borrador ya fue confirmado o reemplazado.");
    if (expectedDraftRevision !== null) assertRevision(draft, expectedDraftRevision);
    if (draft.supersedes_experience_id) {
      const parent = (await tx.query(`select id,annual_plan_id,origin,source_proposal_index,type from learning_experiences
        where id=$1 and classroom_id=$2 and lineage_id=$3 and status='active' for update`, [draft.supersedes_experience_id, classroomId, draft.lineage_id])).rows[0];
      if (!parent || parent.annual_plan_id !== draft.annual_plan_id || parent.origin !== draft.origin ||
          parent.source_proposal_index !== draft.source_proposal_index || parent.type !== draft.type)
        throw new VersionConflictError("La versión original ya no coincide con este borrador.", draft.revision);
      await tx.query(`update learning_experiences set status='archived',superseded_at=now() where id=$1 and status='active'`, [parent.id]);
    }
    const result = (await tx.query(`update learning_experiences set status='active',teacher_confirmed_at=now()
      where id=$1 and classroom_id=$2 and status='draft' and revision=$3 returning id,status,teacher_confirmed_at,version,revision`, [draftId, classroomId, draft.revision])).rows[0];
    if (!result) throw new VersionConflictError();
    return result;
  });
}
