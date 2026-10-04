import { competencyLabels as labels } from "./competency-labels.mjs";
export const competencyLabels: Record<string,string> = labels;
export const competencyLabel=(id:string,fallback:string)=>competencyLabels[id]??fallback;
export const competencyImage=(id:string)=>competencyLabels[id]?'/competencies/'+id.toLowerCase()+'.svg':undefined;
