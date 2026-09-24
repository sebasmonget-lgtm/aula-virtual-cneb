import { randomUUID } from "node:crypto";

export class ActivityVersionError extends Error {
  constructor(reason, message) { super(message); this.name = "ActivityVersionError"; this.reason = reason; }
}

export async function copyConfirmedActivity(db, teacherId, classroomId, sourceId) {
  await db.exec("begin");
  try {
    const source = (await db.query(`select a.* from activities a
      join learning_experiences e on e.id=a.experience_id and e.classroom_id=$2
      join classrooms c on c.id=e.classroom_id and c.teacher_id=$1
      join school_years sy on sy.id=c.school_year_id and sy.owner_id=$1
      where a.id=$3 and a.status='active' and e.status='active'`, [teacherId, classroomId, sourceId])).rows[0];
    if (!source) throw new ActivityVersionError("source_unavailable", "La actividad vigente ya no está disponible.");
    if (typeof source.details?.meaningful_situation !== "string")
      throw new ActivityVersionError("legacy_activity", "Esta actividad usa un formato anterior y no puede copiarse automáticamente.");
    const existing = (await db.query(`select id from activities where supersedes_activity_id=$1 and status='draft'`, [source.id])).rows[0];
    if (existing) throw new ActivityVersionError("draft_exists", "Ya existe un borrador nuevo de esta actividad.");
    const id = randomUUID();
    const version = Number(source.version ?? 1) + 1;
    await db.query(`insert into activities
      (id,experience_id,occurs_on,title,purpose,sequence,preparation,adaptations,status,details,generation_metadata,version,supersedes_activity_id)
      values($1,$2,$3::date,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,'draft',$9::jsonb,$10::jsonb,$11,$12)`,
    [id,source.experience_id,source.occurs_on instanceof Date?source.occurs_on.toISOString().slice(0,10):String(source.occurs_on).slice(0,10),source.title,source.purpose,
      JSON.stringify(source.sequence),JSON.stringify(source.preparation),JSON.stringify(source.adaptations),
      JSON.stringify(source.details),JSON.stringify({workflow:"activity_copy",source_activity_id:source.id}),version,source.id]);
    await db.exec("commit");
    return {id,version,status:"draft",supersedes_activity_id:source.id};
  } catch (error) {
    await db.exec("rollback").catch(() => {});
    throw error;
  }
}
