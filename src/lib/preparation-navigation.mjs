/** Presentation only; all records and drafts remain owned by their existing modules. */
export function preparationStage({ configured, studentCount, annualDraft, initialCoverage = false }) {
  return !configured ? 1 : !studentCount ? 2 : annualDraft || initialCoverage ? 4 : 3;
}

export function preparationStageHash(stage) {
  return stage === 1 ? '#perfil' : stage === 2 ? '#aula?view=enrollment' : stage === 4 ? '#planificar?tab=annual' : '#planificar?tab=diagnostic&step=0&mode=choose';
}

/** Remember one preparation destination in memory, without student IDs or draft content. */
export function preparationHash(hash) {
  const [route, query] = String(hash ?? '').split('?');
  if (route === '#perfil') return '#perfil';
  if (route === '#aula') return '#aula?view=enrollment';
  const params = new URLSearchParams(query);
  if (route === '#mi-ano' || route === '#planificar' && params.get('tab') === 'annual') return preparationStageHash(4);
  if (route !== '#diagnostico' && !(route === '#planificar' && params.get('tab') === 'diagnostic')) return null;
  const step = ['0','1','2','3'].includes(params.get('step')) ? params.get('step') : '0';
  const mode = ['choose','spontaneous','guided'].includes(params.get('mode')) ? params.get('mode') : 'choose';
  return `#planificar?tab=diagnostic&step=${step}&mode=${mode}`;
}
