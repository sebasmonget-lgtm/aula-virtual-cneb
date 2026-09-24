import { randomUUID } from "node:crypto";
import { dateOnly, periodClosureFingerprint } from "./period-evaluation-service.mjs";

export function buildPeriodClosureManifest({period,students,rows}) {
  if(!rows.length || rows.some((row)=>row.state!=="confirmed" || !row.assessment?.id || !row.assessment?.achievement_level))
    throw new Error("Todas las valoraciones deben estar confirmadas antes de cerrar el período.");
  const names=new Map(students.map((student)=>[student.id,[student.preferred_name||student.first_name,student.last_name].filter(Boolean).join(" ")]));
  return {period:{id:period.id,label:period.label,starts_on:dateOnly(period.starts_on),ends_on:dateOnly(period.ends_on)},
    entries:rows.map((row)=>({student_id:row.student_id,student_name:names.get(row.student_id)??"Estudiante",
      competency_id:row.competency_v4_id,assessment_id:row.assessment.id,assessment_version:Number(row.assessment.version),
      conclusion_id:row.conclusion?.id??null,achievement_level:row.assessment.achievement_level,
      assessment_details:row.assessment.details,conclusion_details:row.conclusion?.details??null,
      source_evidence_ids:row.assessment.source_evidence_ids??[],source_evidence_snapshot:row.assessment.source_evidence_snapshot??[],
      evidence:row.sourceRows.map((item)=>({id:item.id,observed_on:dateOnly(item.observed_on),activity_id:item.activity_id,
        activity_title:item.activity_title,criterion_id:item.criterion_id,criterion_text:item.criterion_text,
        observation_text:item.observation_text,observation_status:item.observation_status,media_available:Boolean(item.media_available)}))
    })).sort((a,b)=>`${a.student_id}:${a.competency_id}`.localeCompare(`${b.student_id}:${b.competency_id}`))};
}

export async function closePeriodWithManifest(db,{classroomId,period,teacherId,loadCurrent}) {
  await db.exec("begin");
  try {
    const current=await loadCurrent();
    const fingerprint=periodClosureFingerprint(current.rows);
    const manifest=buildPeriodClosureManifest({period,students:current.students,rows:current.rows});
    const previous=(await db.query(`select current_version_id,source_fingerprint from period_closures
      where classroom_id=$1 and evaluation_period_id=$2`,[classroomId,period.id])).rows[0];
    if(previous?.current_version_id && previous.source_fingerprint===fingerprint) {
      await db.exec("commit");
      return {id:previous.current_version_id,closed:true,current:true,unchanged:true};
    }
    const version=Number((await db.query(`select coalesce(max(version),0)+1 as version from period_closure_versions
      where classroom_id=$1 and evaluation_period_id=$2`,[classroomId,period.id])).rows[0].version);
    const id=randomUUID();
    await db.query(`insert into period_closure_versions(id,classroom_id,evaluation_period_id,version,source_fingerprint,confirmed_by,manifest)
      values($1,$2,$3,$4,$5,$6,$7::jsonb)`,[id,classroomId,period.id,version,fingerprint,teacherId,JSON.stringify(manifest)]);
    await db.query(`insert into period_closures(id,classroom_id,evaluation_period_id,source_fingerprint,confirmed_by,current_version_id)
      values($1,$2,$3,$4,$5,$6) on conflict(classroom_id,evaluation_period_id) do update set
      source_fingerprint=excluded.source_fingerprint,confirmed_by=excluded.confirmed_by,current_version_id=excluded.current_version_id,confirmed_at=now()`,
      [randomUUID(),classroomId,period.id,fingerprint,teacherId,id]);
    await db.exec("commit");
    return {id,version,closed:true,current:true};
  } catch(error) {await db.exec("rollback").catch(()=>{});throw error;}
}

export function projectPeriodClosureDocument(row) {
  return {id:row.id,kind:"period_closure",title:`Cierre de evaluación · ${row.label}`,status:"confirmed",version:Number(row.version),
    school_year:Number(row.year),classroom:row.section,institution_name:row.institution_name,
    period_start:dateOnly(row.starts_on),period_end:dateOnly(row.ends_on),confirmed_at:row.confirmed_at instanceof Date?row.confirmed_at.toISOString():String(row.confirmed_at),
    content:{format:"provisional_structured_projection",period:row.manifest.period,entries:row.manifest.entries}};
}
