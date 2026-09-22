const baseFields = ["title","purpose","starting_point","primary_competency_ids","possible_secondary_competency_ids","spaces_and_materials","evidence_opportunities","family_or_community_links","adjustment_points","flexibility_notes"];
const pathFields = ["title","pedagogical_intention","possible_child_actions"];
export function validateLearningExperienceProposal(workflow, proposal, allowedCompetencyIds) {
 const context = workflow === "project" ? "trigger_or_interest" : workflow === "unit" ? "learning_need_or_context" : null;
 const collection = workflow === "project" ? "possible_pathways" : workflow === "unit" ? "proposed_situations" : null;
 if (!context || !proposal || typeof proposal !== "object" || Array.isArray(proposal)) throw new Error("Propuesta de experiencia inválida.");
 const fields=[...baseFields,context,collection]; const keys=Object.keys(proposal);
 if (fields.some(key=>!(key in proposal))||keys.some(key=>!fields.includes(key))) throw new Error("La propuesta no cumple el schema del workflow.");
 for(const key of ["title","purpose","starting_point",context,"flexibility_notes"]) if(typeof proposal[key]!=="string"||!proposal[key].trim()) throw new Error(`Campo obligatorio inválido: ${key}.`);
 for(const key of ["primary_competency_ids","possible_secondary_competency_ids","spaces_and_materials","evidence_opportunities","family_or_community_links","adjustment_points",collection]) if(!Array.isArray(proposal[key])) throw new Error(`Lista inválida: ${key}.`);
 for(const id of [...proposal.primary_competency_ids,...proposal.possible_secondary_competency_ids]) if(!allowedCompetencyIds.has(id)) throw new Error("La propuesta contiene una competencia no aplicable.");
 for(const item of proposal[collection]) if(!item||typeof item!=="object"||Object.keys(item).some(key=>!pathFields.includes(key))||pathFields.some(key=>typeof item[key]!=="string"||!item[key].trim())) throw new Error("Los caminos o situaciones no son válidos.");
 return proposal;
}
