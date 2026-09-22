const fields=["title","purpose","meaningful_situation","teacher_preparation","child_actions","mediation","evidence_opportunities","closure_or_continuity","competency_status","competency_id"];
export function validateActivityV4(proposal, allowedCompetencyIds) {
 if(!proposal||typeof proposal!=="object"||Array.isArray(proposal)||Object.keys(proposal).some(key=>!fields.includes(key))||fields.some(key=>!(key in proposal))) throw new Error("La propuesta no cumple activity-v1.");
 for(const key of fields.slice(0,8)) if(typeof proposal[key]!=="string"||!proposal[key].trim()) throw new Error(`Campo obligatorio inválido: ${key}.`);
 if(proposal.competency_status==="unconfirmed"&&proposal.competency_id===null)return proposal;
 if(proposal.competency_status!=="confirmed"||typeof proposal.competency_id!=="string"||!allowedCompetencyIds.has(proposal.competency_id)) throw new Error("La competencia de la actividad no es válida para esta experiencia.");
 return proposal;
}
