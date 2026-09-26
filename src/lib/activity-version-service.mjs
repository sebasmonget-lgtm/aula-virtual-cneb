import { randomUUID } from "node:crypto";
import { assertRevision, versionTransaction, VersionConflictError } from "./version-integrity.mjs";

export class ActivityVersionError extends Error {
  constructor(reason, message) { super(message); this.name = "ActivityVersionError"; this.reason = reason; }
}

export async function copyConfirmedActivity(db, teacherId, classroomId, sourceId, expectedSourceRevision = null) {
  const dateOnly=(value)=>value instanceof Date?value.toISOString().slice(0,10):/^\d{4}-\d{2}-\d{2}/.test(String(value))?String(value).slice(0,10):new Date(value).toISOString().slice(0,10);
  const identity = (await db.query(`select lineage_id from activities where id=$1`, [sourceId])).rows[0];
  if (!identity) throw new ActivityVersionError("source_unavailable", "La actividad vigente ya no está disponible.");
  return versionTransaction(db, `activity:${identity.lineage_id}`, async (tx) => {
    const source = (await tx.query(`select a.* from activities a
      join learning_experiences e on e.id=a.experience_id and e.classroom_id=$2
      join classrooms c on c.id=e.classroom_id and c.teacher_id=$1
      join school_years sy on sy.id=c.school_year_id and sy.owner_id=$1
      where a.id=$3 and a.status='active' and e.status='active' for update of a`, [teacherId, classroomId, sourceId])).rows[0];
    if (!source) throw new ActivityVersionError("source_unavailable", "La actividad vigente ya no está disponible.");
    if (expectedSourceRevision !== null) assertRevision(source, expectedSourceRevision);
    if (typeof source.details?.meaningful_situation !== "string")
      throw new ActivityVersionError("legacy_activity", "Esta actividad usa un formato anterior y no puede copiarse automáticamente.");
    const existing = (await tx.query(`select id from activities where lineage_id=$1 and status='draft'`, [source.lineage_id])).rows[0];
    if (existing) throw new VersionConflictError("Ya existe un borrador nuevo de esta actividad.", source.revision, "draft_exists");
    const id = randomUUID();
    const version = Number(source.version ?? 1) + 1;
    await tx.query(`insert into activities
      (id,experience_id,occurs_on,planned_date,schedule_status,title,purpose,sequence,preparation,adaptations,status,details,generation_metadata,version,supersedes_activity_id,lineage_id)
      values($1,$2,$3::date,$4::date,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,'draft',$11::jsonb,$12::jsonb,$13,$14,$15)`,
    [id,source.experience_id,dateOnly(source.occurs_on),
      dateOnly(source.planned_date??source.occurs_on),source.schedule_status??"planned",source.title,source.purpose,
      JSON.stringify(source.sequence),JSON.stringify(source.preparation),JSON.stringify(source.adaptations),
      JSON.stringify(source.details),JSON.stringify({workflow:"activity_copy",source_activity_id:source.id}),version,source.id,source.lineage_id]);
    return {id,version,revision:1,lineage_id:source.lineage_id,status:"draft",supersedes_activity_id:source.id};
  });
}
