import { versionTransaction, VersionConflictError } from './version-integrity.mjs';
import { pilotSchoolYearDefaults } from './pilot-school-year-defaults.mjs';
const day=value=>value instanceof Date?value.toISOString().slice(0,10):String(value).slice(0,10);
const validDate=value=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(value??''))return false;const date=new Date(value+'T00:00:00Z');return Number.isFinite(date.valueOf())&&date.toISOString().slice(0,10)===value;};
async function current(db,teacherId,lock=false){
  const row=(await db.query(`select c.id,c.school_year_id,ag.age_years,sy.year,sy.starts_on,sy.ends_on,c.castellano_l2_applicable,c.religion_applicable
    from classrooms c join age_grades ag on ag.id=c.age_grade_id join school_years sy on sy.id=c.school_year_id
    where c.teacher_id=$1 and c.status='active' and sy.owner_id=$1 ${lock?'for update of c,sy':''}`,[teacherId])).rows[0];
  if(!row)throw new Error('Configura primero el aula.');
  return {row,value:{age:Number(row.age_years),year:Number(row.year),startsOn:day(row.starts_on),endsOn:day(row.ends_on),castellanoL2Applicable:row.castellano_l2_applicable===true,religionApplicable:row.religion_applicable===true}};
}
export async function loadClassroomSettings(db,teacherId){return (await current(db,teacherId)).value;}
export async function saveClassroomSettings(db,teacherId,input){
  return versionTransaction(db,`classroom-settings:${teacherId}`,async tx=>{
    const {row,value}=await current(tx,teacherId,true);
    if(!input?.expected||Object.keys(value).some(key=>input.expected[key]!==value[key]))throw new VersionConflictError('La configuración cambió. Recarga antes de guardar.');
    const next=input.settings;
    if(!next||![3,4,5].includes(next.age)||!Number.isInteger(next.year)||!validDate(next.startsOn)||!validDate(next.endsOn)||next.startsOn>next.endsOn||Number(next.startsOn.slice(0,4))!==next.year||Number(next.endsOn.slice(0,4))!==next.year||typeof next.castellanoL2Applicable!=='boolean'||typeof next.religionApplicable!=='boolean')throw new Error('Revisa la edad, el año y las fechas del aula.');
    if (next.startsOn !== value.startsOn || next.endsOn !== value.endsOn) {
      const official = pilotSchoolYearDefaults(next.year);
      if (!official || next.startsOn !== official.startsOn || next.endsOn !== official.endsOn) throw new Error('Las fechas oficiales MINEDU no se pueden modificar.');
    }
    const structural=['age','year','startsOn','endsOn'].some(key=>next[key]!==value[key]);
    if(structural){
      if(!pilotSchoolYearDefaults(next.year))throw new Error('El calendario oficial de ese año todavía no está disponible.');
      const used=(await tx.query(`select exists(select 1 from students where classroom_id=$1)
        or exists(select 1 from annual_plans where classroom_id=$1)
        or exists(select 1 from learning_experiences where classroom_id=$1)
        or exists(select 1 from class_schedule_entries where classroom_id=$1)
        or exists(select 1 from period_closures where classroom_id=$1)
        or exists(select 1 from period_closure_versions where classroom_id=$1)
        or exists(select 1 from period_competency_scope where classroom_id=$1 and teacher_override=true)
        or exists(select 1 from classroom_calendar_overrides where classroom_id=$1)
        or exists(select 1 from ai_pending_generations where classroom_id=$1)
        or exists(select 1 from classrooms where school_year_id=$2 and id<>$1) as used`,[row.id,row.school_year_id])).rows[0].used;
      if(used)throw new Error('La edad, el año y las fechas no pueden cambiar mientras el aula tenga niños o planificación. Puedes ajustar los días desde Calendario.');
      const bounds=(await tx.query(`select min(start_date)::text as first,max(end_date)::text as last from calendar_blocks where school_year_id=$1`,[row.school_year_id])).rows[0];
      if(bounds.first&&(next.startsOn>bounds.first||next.endsOn<bounds.last))throw new Error('Las fechas deben incluir los bloques existentes. Revisa los ajustes desde Calendario.');
      await tx.query(`update school_years set year=$1,starts_on=$2::date,ends_on=$3::date where id=$4 and owner_id=$5`,[next.year,next.startsOn,next.endsOn,row.school_year_id,teacherId]);
      const grade=(await tx.query(`select id from age_grades where age_years=$1 and level_id='20000000-0000-4000-8000-000000000001'`,[next.age])).rows[0];
      if(!grade)throw new Error('La edad del aula no está disponible.');
      await tx.query(`update classrooms set age_grade_id=$1 where id=$2 and teacher_id=$3`,[grade.id,row.id,teacherId]);
    }
    await tx.query(`update classrooms set castellano_l2_applicable=$1,religion_applicable=$2 where id=$3 and teacher_id=$4`,[next.castellanoL2Applicable,next.religionApplicable,row.id,teacherId]);
    return (await current(tx,teacherId)).value;
  });
}
