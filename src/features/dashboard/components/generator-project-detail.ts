import type {AnnualProposal,CalendarSlot} from '@/src/lib/multi-age-app-types';
import type {ChangeProposal} from './annual-proposal-change-dialog';

/** Adapt saved V2 planning fields to Ayni's existing detail reader. */
export function generatorProjectDetail(row:AnnualProposal['proposals'][number],slot:CalendarSlot,period:string):ChangeProposal{
 const ids=[...new Set(row.opportunities.map(o=>o.competency_id))];
 const editorial=Boolean(row.summary&&row.rationale);
 return {proposal_id:row.slot_id,title:row.title,purpose:row.purpose,...(editorial?{summary:row.summary}:{}),invitation:row.common_invitation,rationale:editorial?row.rationale:row.one_teacher_organization,
  period,duration_weeks:slot.instructional_dates.length>10?3:2,planned_start_date:slot.starts_on,planned_end_date:slot.ends_on,
  primary_competency_ids:ids,children_actions:[...new Set(row.opportunities.map(o=>o.age))].sort().map(age=>`${age} años: ${editorial?row.opportunities.filter(o=>o.age===age).map(o=>o.child_action).join(' '):row.opportunities.find(o=>o.age===age)!.child_action}`),materials:[],
  opportunities:ids.map(id=>{const opportunities=row.opportunities.filter(o=>o.competency_id===id);
   const text=(field:'child_action'|'mediation'|'observation')=>opportunities.map(o=>`${o.age} años: ${o[field]}`).join('\n\n');
   return {competency_id:id,child_action:text('child_action'),conditions:row.common_invitation,mediation:text('mediation'),observation:text('observation'),supports:editorial?opportunities.map(o=>`${o.age} años: ${o.supports}`).join('\n\n'):row.one_teacher_organization};})};
}
