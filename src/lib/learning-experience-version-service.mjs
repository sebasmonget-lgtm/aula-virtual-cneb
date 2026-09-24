import { randomUUID } from "node:crypto";

export class LearningExperienceVersionError extends Error {
  constructor(reason, message) { super(message); this.name = "LearningExperienceVersionError"; this.reason = reason; }
}

export async function copyConfirmedLearningExperience(db, teacherId, classroomId, sourceId) {
  await db.exec("begin");
  try {
    const source = (await db.query(`select e.* from learning_experiences e
      join classrooms c on c.id=e.classroom_id and c.teacher_id=$1
      join school_years sy on sy.id=c.school_year_id and sy.owner_id=$1
      where e.id=$2 and e.classroom_id=$3 and e.type in ('project','unit') and e.status='active'`,
    [teacherId, sourceId, classroomId])).rows[0];
    if (!source) throw new LearningExperienceVersionError("source_unavailable", "El proyecto o unidad vigente ya no está disponible.");
    if (typeof source.details?.starting_point !== "string")
      throw new LearningExperienceVersionError("legacy_experience", "Este proyecto usa un formato anterior y no puede copiarse automáticamente.");
    const existing = (await db.query(`select id from learning_experiences where supersedes_experience_id=$1 and status='draft'`, [source.id])).rows[0];
    if (existing) throw new LearningExperienceVersionError("draft_exists", "Ya existe un borrador nuevo de este proyecto o unidad.");
    const id = randomUUID();
    const dateOnly = (date) => date instanceof Date ? date.toISOString().slice(0,10) : String(date).slice(0,10);
    const version = Number(source.version ?? 1) + 1;
    await db.query(`insert into learning_experiences
      (id,classroom_id,type,title,purpose,starts_on,ends_on,status,details,annual_plan_id,origin,
       planning_reason,source_proposal_index,generation_metadata,version,supersedes_experience_id)
      values ($1,$2,$3,$4,$5,$6::date,$7::date,'draft',$8::jsonb,$9,$10,$11,$12,$13::jsonb,$14,$15)`,
    [id, source.classroom_id, source.type, source.title, source.purpose, dateOnly(source.starts_on), dateOnly(source.ends_on),
      JSON.stringify(source.details), source.annual_plan_id, source.origin, source.planning_reason,
      source.source_proposal_index, JSON.stringify({ workflow: "learning_experience_copy", source_experience_id: source.id }), version, source.id]);
    await db.exec("commit");
    return { id, version, status: "draft", supersedes_experience_id: source.id };
  } catch (error) {
    await db.exec("rollback").catch(() => {});
    throw error;
  }
}

export async function confirmLearningExperienceVersion(db, classroomId, draftId) {
  await db.exec("begin");
  try {
    const draft = (await db.query(`select id,supersedes_experience_id,annual_plan_id,origin,source_proposal_index,type
      from learning_experiences where id=$1 and classroom_id=$2 and status='draft'`, [draftId, classroomId])).rows[0];
    if (!draft) throw new LearningExperienceVersionError("draft_unavailable", "El borrador ya no está disponible.");
    if (draft.supersedes_experience_id) {
      const parent = (await db.query(`select id,annual_plan_id,origin,source_proposal_index,type from learning_experiences
        where id=$1 and classroom_id=$2 and status='active'`, [draft.supersedes_experience_id, classroomId])).rows[0];
      if (!parent || parent.annual_plan_id !== draft.annual_plan_id || parent.origin !== draft.origin ||
          parent.source_proposal_index !== draft.source_proposal_index || parent.type !== draft.type)
        throw new LearningExperienceVersionError("source_changed", "La versión original ya no coincide con este borrador.");
      await db.query(`update learning_experiences set status='archived' where id=$1`, [parent.id]);
    }
    const result = (await db.query(`update learning_experiences set status='active',teacher_confirmed_at=now()
      where id=$1 and classroom_id=$2 and status='draft' returning id,status,teacher_confirmed_at,version`, [draftId, classroomId])).rows[0];
    await db.exec("commit");
    return result;
  } catch (error) {
    await db.exec("rollback").catch(() => {});
    throw error;
  }
}
