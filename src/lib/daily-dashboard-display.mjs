import {activityRecordLabel} from "./activity-record-signals.mjs";
/** Presentation only. Peru's clock is independent of the device's time zone.
 * @param {Date} at
 * @param {{date:string,time:string}|null} qaClock
 */
export function teacherGreeting(at=new Date(),qaClock=null){
  if(/^\d{4}-\d{2}-\d{2}$/.test(qaClock?.date??'')&&/^\d{2}:\d{2}$/.test(qaClock?.time??'')){
    const simulated=new Date(`${qaClock.date}T${qaClock.time}:00-05:00`);
    if(Number.isFinite(simulated.getTime()))at=simulated;
  }
  const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'America/Lima',hour:'2-digit',hourCycle:'h23'}).format(at));
  return hour<12?{text:'Buenos días',period:'morning'}:hour<19?{text:'Buenas tardes',period:'afternoon'}:{text:'Buenas noches',period:'night'};
}

/** A completed block remains available to consult, never as an upcoming task. */
export function todayBlockLabel(block, isCurrent=false){
  if(block?.status==='completed')return 'TERMINADA';
  if(block?.status==='skipped')return 'NO REALIZADA';
  return isCurrent?'AHORA':'PRÓXIMO';
}

export function calendarActivityState(activity,today){
  const execution=activity.execution_status??'planned';
  return {
    label:activity.schedule_status==='rescheduled'&&Number(activity.observation_count??0)===0&&execution==='planned'?'Reprogramada':activityRecordLabel({...activity,execution_status:execution},today),
    canMarkNotWorked:activity.status==='active'&&execution==='planned'&&Number(activity.observation_count??0)===0&&activity.occurs_on>=today&&!['cancelled','not_worked'].includes(activity.schedule_status),
  };
}

/** Keep historical documents available; only confirmed, usable activities count as upcoming. */
export function calendarAgenda(data,today){
  const activities=(data?.activities??[]).filter(item=>item.status==='active'&&!['cancelled','not_worked'].includes(item.schedule_status)&&!['completed','skipped'].includes(item.execution_status));
  const projects=(data?.experiences??[]).filter(item=>item.type!=='workshop'&&item.status==='active'&&item.annual_status!=='archived');
  return {
    currentProject:projects.find(item=>item.starts_on<=today&&item.ends_on>=today)??null,
    nextProject:projects.filter(item=>item.starts_on>today).sort((a,b)=>a.starts_on.localeCompare(b.starts_on))[0]??null,
    nextActivity:activities.filter(item=>item.occurs_on>=today).sort((a,b)=>a.occurs_on.localeCompare(b.occurs_on)||(a.start_time??'').localeCompare(b.start_time??''))[0]??null,
  };
}

export function calendarProjectsOnDay(data,date){
  const activities=(data.activities??[]).filter(item=>item.occurs_on===date&&item.schedule_status!=='cancelled');
  const scheduled=new Set(activities.map(item=>item.experience_id));
  const projects=(data.experiences??[]).filter(item=>item.type!=='workshop'&&item.status==='active'&&
    (scheduled.size?scheduled.has(item.id):item.annual_status!=='archived'&&item.starts_on<=date&&date<=item.ends_on));
  return [...new Map(projects.map(item=>[item.source_proposal_id??item.id,item])).values()];
}
