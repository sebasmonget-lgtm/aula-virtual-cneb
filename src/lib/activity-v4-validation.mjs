const fields=["title","purpose","meaningful_situation","teacher_preparation","child_actions","mediation","evidence_opportunities","closure_or_continuity","competency_status","competency_id","route_item_id","evaluation_criterion","expected_evidence","document_template_version","teacher_overrides","activity_contract","teacher_context","additional_criteria"];
const required=fields.slice(0,10);
export function normalizeActivityMaterials(value) {
 if(!Array.isArray(value)) return [];
 return [...new Set(value.filter((item)=>typeof item==="string").map((item)=>item.trim().slice(0,120)).filter(Boolean))].slice(0,20);
}
export function publicActivityParent(experience, priorActivities = []) {
 return {
  id: experience.id, type: experience.type, title: experience.title, purpose: experience.purpose,
  starts_on: experience.starts_on, ends_on: experience.ends_on, origin: experience.origin, version: Number(experience.version ?? 1), status: experience.status,
  details: experience.details,
  prior_activities: priorActivities.map((item) => ({ occurs_on: item.occurs_on, title: item.title, purpose: item.purpose, closure_or_continuity: item.closure_or_continuity })),
 };
}
export function validateActivityV4(proposal, allowedCompetencyIds) {
 if(!proposal||typeof proposal!=="object"||Array.isArray(proposal)||Object.keys(proposal).some(key=>!fields.includes(key))||required.some(key=>!(key in proposal))) throw new Error("La propuesta no cumple activity-v1.");
 for(const key of fields.slice(0,8)) if(typeof proposal[key]!=="string"||!proposal[key].trim()) throw new Error(`Campo obligatorio inválido: ${key}.`);
 if(proposal.document_template_version!==undefined&&!['activity-unified-v1','activity-with-workshop-v1'].includes(proposal.document_template_version))throw new Error("Versión de documento inválida.");
 if(proposal.route_item_id!==undefined&&proposal.route_item_id!==null&&typeof proposal.route_item_id!=="string")throw new Error("Actividad de origen inválida.");
 for(const key of ["evaluation_criterion","expected_evidence"])if(proposal[key]!==undefined&&(typeof proposal[key]!=="string"||!proposal[key].trim()))throw new Error(`Campo inválido: ${key}.`);
 if(proposal.teacher_overrides!==undefined&&!Array.isArray(proposal.teacher_overrides))throw new Error("Modificaciones docentes inválidas.");
 if(proposal.teacher_context!==undefined&&(typeof proposal.teacher_context!=="string"||proposal.teacher_context.length>1000))throw new Error("Contexto docente inválido.");
 if(proposal.additional_criteria!==undefined) {
  if(!Array.isArray(proposal.additional_criteria)||proposal.additional_criteria.length>3)throw new Error("Criterios adicionales inválidos.");
  const seen=new Set([proposal.competency_id]);
  for(const item of proposal.additional_criteria) {
   if(!item||Object.keys(item).some(key=>!["competency_id","criterion_text","expected_evidence"].includes(key))||!allowedCompetencyIds.has(item.competency_id)||seen.has(item.competency_id)||["criterion_text","expected_evidence"].some(key=>typeof item[key]!=="string"||!item[key].trim()||item[key].length>2000))throw new Error("Cada competencia adicional necesita un criterio y evidencia válidos.");
   seen.add(item.competency_id);
  }
 }
 if(proposal.competency_status==="unconfirmed"&&proposal.competency_id===null)return proposal;
 if(proposal.competency_status!=="confirmed"||typeof proposal.competency_id!=="string"||!allowedCompetencyIds.has(proposal.competency_id)) throw new Error("La competencia de la actividad no es válida para esta experiencia.");
 return proposal;
}
