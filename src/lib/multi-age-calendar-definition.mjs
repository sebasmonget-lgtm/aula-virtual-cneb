import {nationalCalendarBlocks2026,nationalSchoolHolidays2026,defaultInitialStage} from './annual-plan-calendar.mjs';
import {solveAnnualJourneyCalendar} from './annual-journey-calendar.mjs';
import {classifyCalendarDay} from './school-calendar-service.mjs';

const day=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
const text=value=>typeof value==='string'&&value.trim().length>=3&&value.length<=180;
export function validateMultiAgeInstitutionalCalendar(value,scope){
 if(!value||value.contract!=='multi-age-institutional-calendar-v1'||!text(value.sourceLabel)||!Array.isArray(value.periods)||value.periods.length!==4||!Array.isArray(value.exclusions)||value.exclusions.length>100)
  throw new TypeError('Indica la referencia del calendario institucional, cuatro bimestres y sus días sin clases.');
 const within=d=>day(d)&&d>=scope.starts_on&&d<=scope.ends_on&&Number(d.slice(0,4))===Number(scope.year);
 const periods=value.periods.map((p,i)=>{
  if(!within(p.startsOn)||!within(p.endsOn)||p.startsOn>p.endsOn||(i&&value.periods[i-1].endsOn>=p.startsOn))throw new TypeError('Revisa las fechas y el orden de los cuatro bimestres.');
  return {startsOn:p.startsOn,endsOn:p.endsOn};
 });
 const dates=new Set(),exclusions=value.exclusions.map(e=>{if(!within(e.date)||!text(e.reason)||dates.has(e.date))throw new TypeError('Cada día sin clases necesita fecha única y motivo.');dates.add(e.date);return {date:e.date,reason:e.reason.trim()};}).sort((a,b)=>a.date.localeCompare(b.date));
 const result={contract:value.contract,sourceLabel:value.sourceLabel.trim(),periods,exclusions};
 // Validate the same calendar solver used by Mi año before accepting any persisted definition.
 const schedule=solveAnnualJourneyCalendar(multiAgeSchoolCalendar({...scope,institutional_calendar:result}));
 if(!schedule.initial_stage.instructional_dates.length||schedule.projects.some(p=>!p.instructional_dates.length))throw new TypeError('Cada tramo y la acogida necesitan días de clase.');
 return result;
}

/** Explicit institutional dates are teacher supplied. They never become a national authority. */
export function multiAgeSchoolCalendar(scope){
 const custom=scope.institutional_calendar;
 if(!custom&&Number(scope.year)!==2026)throw new TypeError('Este año necesita un calendario institucional confirmado. No se trasladan automáticamente las fechas oficiales de 2026.');
 const blocks=custom?custom.periods.map((p,i)=>({id:`institutional_${i+1}`,type:'instructional',start_date:p.startsOn,end_date:p.endsOn,label:`Bimestre ${i+1}`})):nationalCalendarBlocks2026();
 const exclusions=custom?custom.exclusions.map(e=>({date:e.date,reason:e.reason})):nationalSchoolHolidays2026().map(h=>({date:h.exception_date,reason:h.label})),days=[];
 for(let d=new Date(scope.starts_on+'T00:00:00Z');d<=new Date(scope.ends_on+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+1)){
  const date=d.toISOString().slice(0,10),block=blocks.find(b=>b.start_date<=date&&date<=b.end_date),exclusion=exclusions.find(e=>e.date===date),classification=classifyCalendarDay({date,block,holiday:exclusion?{name:exclusion.reason}:null});
  days.push({date,...classification,...(custom?{source:'Calendario institucional confirmado',...(exclusion?{calendar_type:'school_non_instructional'}:{})}:{})});
 }
 return {days,blocks,version:custom?{id:'institutional-'+scope.id,version:custom.contract,source:custom.sourceLabel,authority:'teacher_confirmed_institutional'}:{id:'multi-age-local-national-2026',version:'existing-national-calendar-2026'},initial_stage:defaultInitialStage()};
}
