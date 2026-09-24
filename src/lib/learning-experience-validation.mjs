const baseFields = ["title","purpose","starting_point","primary_competency_ids","possible_secondary_competency_ids","spaces_and_materials","evidence_opportunities","family_or_community_links","adjustment_points","flexibility_notes"];
const pathFields = ["title","pedagogical_intention","possible_child_actions"];
const routeFields = ["id","number","title","specific_purpose","competency_id","evaluation_criterion","expected_evidence"];
export function validateLearningExperienceProposal(workflow, proposal, allowedCompetencyIds) {
 const context = workflow === "project" ? "trigger_or_interest" : workflow === "unit" ? "learning_need_or_context" : null;
 const collection = workflow === "project" ? "possible_pathways" : workflow === "unit" ? "proposed_situations" : null;
 if (!context || !proposal || typeof proposal !== "object" || Array.isArray(proposal)) throw new Error("Propuesta de experiencia inválida.");
 const fields=[...baseFields,context,collection,"activity_route","document_template_version","teacher_overrides"]; const keys=Object.keys(proposal);
 if ([...baseFields,context,collection].some(key=>!(key in proposal))||keys.some(key=>!fields.includes(key))) throw new Error("La propuesta no cumple el schema del workflow.");
 for(const key of ["title","purpose","starting_point",context,"flexibility_notes"]) if(typeof proposal[key]!=="string"||!proposal[key].trim()) throw new Error(`Campo obligatorio inválido: ${key}.`);
 for(const key of ["primary_competency_ids","possible_secondary_competency_ids","spaces_and_materials","evidence_opportunities","family_or_community_links","adjustment_points",collection]) if(!Array.isArray(proposal[key])) throw new Error(`Lista inválida: ${key}.`);
 for(const id of [...proposal.primary_competency_ids,...proposal.possible_secondary_competency_ids]) if(!allowedCompetencyIds.has(id)) throw new Error("La propuesta contiene una competencia no aplicable.");
 for(const item of proposal[collection]) if(!item||typeof item!=="object"||Object.keys(item).some(key=>!pathFields.includes(key))||pathFields.some(key=>typeof item[key]!=="string"||!item[key].trim())) throw new Error("Los caminos o situaciones no son válidos.");
 if(proposal.document_template_version!==undefined&&proposal.document_template_version!=="experience-unified-v1")throw new Error("Versión de documento no válida.");
 if(proposal.teacher_overrides!==undefined&&!Array.isArray(proposal.teacher_overrides))throw new Error("Las modificaciones docentes no son válidas.");
 if(proposal.activity_route!==undefined){
  if(!Array.isArray(proposal.activity_route)||proposal.activity_route.length<1||proposal.activity_route.length>15)throw new Error("La ruta de actividades debe tener entre una y quince propuestas.");
  const chosen=new Set([...proposal.primary_competency_ids,...proposal.possible_secondary_competency_ids]);
  for(const [index,item] of proposal.activity_route.entries())if(!item||typeof item!=="object"||Array.isArray(item)||Object.keys(item).some(key=>!routeFields.includes(key))||item.number!==index+1||routeFields.filter(key=>key!=="id").some(key=>key!=="number"&&(typeof item[key]!=="string"||!item[key].trim()))||!chosen.has(item.competency_id)||(item.id!==undefined&&typeof item.id!=="string"))throw new Error(`Ruta de actividad inválida en la posición ${index+1}.`);
 }
 return proposal;
}
