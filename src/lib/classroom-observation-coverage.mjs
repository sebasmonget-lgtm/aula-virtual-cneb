import {loadDiagnosticCoverageRecords} from './pedagogical-coverage.mjs';
import {loadConfirmedOrdinaryEvaluationRows} from './ordinary-evaluation-adapter.mjs';
/** Capture coverage is year-wide; it is not a bimonthly achievement judgment. Caller owns this classroom/year. */
export async function classroomObservationCoverage(db,{classroomId,year,competencyId,includeOrdinary=true,allCompetencies=false}){
  const date=value=>value instanceof Date?value.toISOString().slice(0,10):String(value).slice(0,10);
  const period={starts_on:date(year.starts_on),ends_on:date(year.ends_on)};
  const [diagnostic,ordinary,evidence]=await Promise.all([
    loadDiagnosticCoverageRecords(db,classroomId,period),
    includeOrdinary?loadConfirmedOrdinaryEvaluationRows(db,{classroomId,period}):[],
    db.query(`select ev.id,ev.student_id,ac.competency_v4_id as competency_id from evidences ev
      join students s on s.id=ev.student_id join activities act on act.id=ev.activity_id
      join learning_experiences project on project.id=act.experience_id and project.classroom_id=$1
      join activity_criteria ac on ac.id=ev.criterion_id and ac.activity_id=act.id
      where s.classroom_id=$1 and s.status='active' and ($2::text is null or ac.competency_v4_id=$2)
        and (ev.observed_at at time zone 'America/Lima')::date between $3::date and $4::date`,[classroomId,competencyId,period.starts_on,period.ends_on]),
  ]);
  const records=[...diagnostic,...ordinary,...evidence.rows].filter(item=>allCompetencies||(item.competency_id??item.competency_v4_id)===competencyId);
  const counts=new Map(),seen=new Set();
  for(const item of records){const competency=item.competency_id??item.competency_v4_id;const key=`${competency}:${item.student_id}:${item.source_type??item.details?.source??'evidence'}:${item.id}`;if(seen.has(key))continue;seen.add(key);const studentKey=allCompetencies?`${competency}:${item.student_id}`:item.student_id;counts.set(studentKey,(counts.get(studentKey)??0)+1);}
  return counts;
}
