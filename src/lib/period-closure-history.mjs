import { randomUUID } from "node:crypto";
import { dateOnly, periodClosureFingerprint, periodRowResolved } from "./period-evaluation-service.mjs";
import { VersionConflictError, versionTransaction } from "./version-integrity.mjs";

export function buildPeriodClosureManifest({period,students,rows,context=null,closedAt=null}) {
  if(!rows.length || rows.some((row)=>!periodRowResolved(row)))
    throw new Error("Revisa las valoraciones y las observaciones pendientes antes de cerrar el período.");
  const names=new Map(students.map((student)=>[student.id,[student.preferred_name||student.first_name,student.last_name].filter(Boolean).join(" ")]));
  return {period:{id:period.id,label:period.label,starts_on:dateOnly(period.starts_on),ends_on:dateOnly(period.ends_on)},
    ...(context ? {context:{...context,closed_at:closedAt}} : {}),
    entries:rows.filter((row)=>row.state==="confirmed").map((row)=>({student_id:row.student_id,student_name:names.get(row.student_id)??"Estudiante",
      competency_id:row.competency_v4_id,assessment_id:row.assessment.id,assessment_version:Number(row.assessment.version),
      conclusion_id:row.conclusion?.id??null,achievement_level:row.assessment.achievement_level,
      assessment_details:row.assessment.details,conclusion_details:row.conclusion?.details??null,
      source_evidence_ids:row.assessment.source_evidence_ids??[],source_evidence_snapshot:row.assessment.source_evidence_snapshot??[],
      evidence:row.sourceRows.map((item)=>({id:item.id,observed_on:dateOnly(item.observed_on),activity_id:item.activity_id,
        activity_title:item.activity_title,criterion_id:item.criterion_id,criterion_text:item.criterion_text,
        observation_text:item.observation_text,observation_status:item.observation_status,media_available:Boolean(item.media_available)}))
    })).sort((a,b)=>`${a.student_id}:${a.competency_id}`.localeCompare(`${b.student_id}:${b.competency_id}`)),
    pending_entries:rows.filter((row)=>row.state!=="confirmed").map((row)=>({
      student_id:row.student_id,student_name:names.get(row.student_id)??"Estudiante",
      competency_id:row.competency_v4_id,state:row.state,
      reason:row.state==="insufficient_information" ? row.draft?.details?.insufficiency_reason??null :
        row.state==="pending" ? "Hay evidencia del período, pendiente de revisión docente" : "Sin evidencia formativa del período",
      source_evidence_ids:row.sourceRows.map((item)=>item.id),
    })).sort((a,b)=>`${a.student_id}:${a.competency_id}`.localeCompare(`${b.student_id}:${b.competency_id}`))};
}

export async function closePeriodWithManifest(db,{classroomId,period,teacherId,loadCurrent,
  expectedCurrentVersionId=undefined,expectedSourceFingerprint=null,validateCurrent=null}) {
  return versionTransaction(db,`period:${period.id}`,async(tx)=>{
    const current=await loadCurrent(tx);
    if(validateCurrent) await validateCurrent(tx,current);
    const fingerprint=periodClosureFingerprint(current.rows);
    if(expectedSourceFingerprint!==null && expectedSourceFingerprint!==fingerprint)
      throw new VersionConflictError("Las valoraciones cambiaron. Revisa el aula antes de cerrar.");
    const previous=(await tx.query(`select current_version_id,source_fingerprint from period_closures
      where classroom_id=$1 and evaluation_period_id=$2 for update`,[classroomId,period.id])).rows[0];
    if(expectedCurrentVersionId!==undefined && (previous?.current_version_id??null)!==expectedCurrentVersionId)
      throw new VersionConflictError("El período ya fue cerrado desde otra pestaña.");
    const profile=(await tx.query(`select c.id as classroom_id,c.section,ag.age_years,sy.id as school_year_id,sy.year,
      c.teacher_id,p.display_name as teacher_name,coalesce(ip.display_name,c.institution_name) as institution_name,ip.ugel
      from classrooms c join school_years sy on sy.id=c.school_year_id
      join age_grades ag on ag.id=c.age_grade_id join profiles p on p.user_id=c.teacher_id
      left join institution_profiles ip on ip.owner_user_id=c.teacher_id
      where c.id=$1 and c.teacher_id=$2 and sy.id=$3`,[classroomId,teacherId,period.school_year_id])).rows[0];
    if(!profile) throw new VersionConflictError("El aula o el período ya no corresponden a esta docente.");
    const closedAt=(await tx.query("select now() as at")).rows[0].at;
    const context={teacher_id:profile.teacher_id,teacher_name:profile.teacher_name,institution_name:profile.institution_name,
      ugel:profile.ugel??null,classroom_id:profile.classroom_id,section:profile.section,age_years:Number(profile.age_years),
      school_year_id:profile.school_year_id,school_year:Number(profile.year),period_id:period.id};
    const manifest=buildPeriodClosureManifest({period,students:current.students,rows:current.rows,context,closedAt:closedAt instanceof Date?closedAt.toISOString():String(closedAt)});
    if(previous?.current_version_id && previous.source_fingerprint===fingerprint) {
      return {id:previous.current_version_id,closed:true,current:true,unchanged:true};
    }
    const version=Number((await tx.query(`select coalesce(max(version),0)+1 as version from period_closure_versions
      where classroom_id=$1 and evaluation_period_id=$2`,[classroomId,period.id])).rows[0].version);
    const id=randomUUID();
    await tx.query(`insert into period_closure_versions(id,classroom_id,evaluation_period_id,version,source_fingerprint,confirmed_by,confirmed_at,manifest)
      values($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,[id,classroomId,period.id,version,fingerprint,teacherId,closedAt,JSON.stringify(manifest)]);
    await tx.query(`insert into period_closures(id,classroom_id,evaluation_period_id,source_fingerprint,confirmed_by,confirmed_at,current_version_id)
      values($1,$2,$3,$4,$5,$6,$7) on conflict(classroom_id,evaluation_period_id) do update set
      source_fingerprint=excluded.source_fingerprint,confirmed_by=excluded.confirmed_by,current_version_id=excluded.current_version_id,confirmed_at=excluded.confirmed_at`,
      [randomUUID(),classroomId,period.id,fingerprint,teacherId,closedAt,id]);
    return {id,version,closed:true,current:true};
  });
}

export function projectPeriodClosureDocument(row) {
  return {id:row.id,kind:"period_closure",title:`Cierre de evaluación · ${row.manifest.period?.label??row.label}`,status:"confirmed",version:Number(row.version),
    school_year:Number(row.manifest.context?.school_year??row.year),classroom:row.manifest.context?.section??row.section,
    institution_name:row.manifest.context?.institution_name??row.institution_name,
    teacher_id:row.manifest.context?.teacher_id??row.confirmed_by,teacher_name:row.manifest.context?.teacher_name??null,
    age_years:row.manifest.context?.age_years??null,ugel:row.manifest.context?.ugel??null,
    period_start:dateOnly(row.manifest.period?.starts_on??row.starts_on),period_end:dateOnly(row.manifest.period?.ends_on??row.ends_on),confirmed_at:row.manifest.context?.closed_at??(row.confirmed_at instanceof Date?row.confirmed_at.toISOString():String(row.confirmed_at)),
    content:{format:"provisional_structured_projection",period:row.manifest.period,entries:row.manifest.entries,
      pending_entries:row.manifest.pending_entries??[]}};
}
