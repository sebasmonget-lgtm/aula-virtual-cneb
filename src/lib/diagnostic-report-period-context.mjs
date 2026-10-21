import {initialDiagnosticPeriod,nationalCalendarBlocks2026} from './annual-plan-calendar.mjs';
const day=value=>value instanceof Date?value.toISOString().slice(0,10):String(value??'').slice(0,10);
/** Call only after ownership of the school year has been checked by the caller. */
export async function diagnosticTimingContext(db,schoolYearId,year){
  const [calendar,stage]=await Promise.all([
    db.query('select type,start_date,end_date from calendar_blocks where school_year_id=$1 order by start_date',[schoolYearId]),
    db.query('select duration_weeks from initial_stages where school_year_id=$1 limit 1',[schoolYearId]),
  ]);
  const blocks=calendar.rows.length?calendar.rows.map(row=>({...row,start_date:day(row.start_date),end_date:day(row.end_date)})):year===2026?nationalCalendarBlocks2026():[];
  const period=blocks.length?initialDiagnosticPeriod({school_year:year,blocks,initial_stage:{duration_weeks:Number(stage.rows[0]?.duration_weeks??2)}}):null;
  return {diagnostic_period_start:period?.starts_on??null,diagnostic_period_end:period?.ends_on??null};
}
