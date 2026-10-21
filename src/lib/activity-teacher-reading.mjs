import {competencyLabels} from './competency-labels.mjs';

/** Presentation of planning prose only. Never apply to literal child records. */
export function activityTeacherText(value){
 if(Array.isArray(value))return value.map(activityTeacherText);
 if(typeof value!=='string')return value;
 return value.replace(/\b(?:PS_IDENTIDAD|PS_CONVIVE|PSICO_MOTRICIDAD|COM_ORAL|COM_LECTURA|COM_ESCRITURA|COM_ARTE|MAT_CANTIDAD|MAT_FORMA|CYT_INDAGA|TRANS_AUTONOMO|TRANS_TIC|PS_RELIGION|CAST_L2_ORAL)\b/g,id=>competencyLabels[id]??id);
}

/** Keep the saved primary criterion first, independently of SQL row order. */
export function orderedActivityCriteria(details={},criteria=[]){
 const ids=[details.competency_id,...(details.additional_criteria??[]).map(item=>item.competency_id)].filter(Boolean);
 const rank=id=>{const index=ids.indexOf(id);return index<0?ids.length:index;};
 return criteria.map((row,index)=>({row,index})).sort((a,b)=>rank(a.row.competency_v4_id??a.row.competency_id)-rank(b.row.competency_v4_id??b.row.competency_id)||a.index-b.index).map(item=>item.row);
}
