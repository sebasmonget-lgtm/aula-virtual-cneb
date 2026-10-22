/** A free observation keeps its confirmed competencies without inventing a criterion. */
export function activityObservationCriterionLabel(observation,cards=[]) {
 const criterion=typeof observation.criterion_text==='string'?observation.criterion_text.trim():'';
 if(criterion)return criterion;
 if(observation.source!=='ordinary_observation')return 'Sin criterio asociado';
 const names=(observation.confirmed_competency_ids??[]).map(id=>cards.find(card=>card.id===id)?.name).filter(Boolean);
 return ['Observación libre',...names].join(' · ');
}
