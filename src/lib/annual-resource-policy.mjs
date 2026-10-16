/** Only explicit available resources authorize a digital curricular opportunity. */
export function hasConfirmedDigitalResource(resources = []) {
  return Array.isArray(resources) && resources.some(value => {
    const text = String(value).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
    if (/\b(por confirmar|por conseguir|pendiente|quizas|tal vez|si conseguimos|si se consigue|no hay|no tenemos|no contamos|sin dispositivo|sin tableta|sin computadora)\b/.test(text)) return false;
    return /\b(celular|telefono|tablet|tableta|computadora|ordenador|laptop|proyector|pantalla|dispositivo digital|camara)\b/.test(text);
  });
}
export function resourceEligibleCompetencies(cards, resources) {
  return cards.filter(card => card.id !== 'TRANS_TIC' || hasConfirmedDigitalResource(resources));
}
