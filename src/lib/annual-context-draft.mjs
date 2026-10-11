/** Import each teacher turn once; later AI wording must not replace teacher edits. */
export function mergeAnnualContextDraft(draft, items = []) {
  const importedTurns = new Set(draft.importedTurns);
  const additions = items.filter(item => !importedTurns.has(item.source_turn));
  for (const item of additions) importedTurns.add(item.source_turn);
  const texts = new Set(draft.value.contextItems.map(item => item.text.trim()));
  const contextItems = [...draft.value.contextItems];
  for (const item of additions) {
    if (!texts.has(item.text.trim())) {
      contextItems.push({ text: item.text, source_turn: item.source_turn });
      texts.add(item.text.trim());
    }
  }
  return { value: { ...draft.value, contextItems }, importedTurns: [...importedTurns] };
}

/** A draft may contain unfinished rows. Final preparation still validates completeness. */
export function validateAnnualContextDraft(draft, curriculum, turnCount) {
  const { value, importedTurns } = draft ?? {};
  if (!value || !Array.isArray(value.contextItems) || value.contextItems.length > 20 ||
      !Array.isArray(value.historicalProjects) || value.historicalProjects.length > 20 ||
      !Array.isArray(importedTurns) || importedTurns.some(turn => !Number.isInteger(turn) || turn < 0 || turn >= turnCount))
    throw new TypeError("Revisa el contexto: admite veinte ideas y veinte proyectos anteriores.");
  const allowed = new Set(curriculum.map(card => card.id));
  const contextItems = value.contextItems.map(item => {
    if (!item || typeof item.text !== "string" || item.text.length > 500 ||
        (item.source_turn != null && (!Number.isInteger(item.source_turn) || item.source_turn < 0 || item.source_turn >= turnCount)))
      throw new TypeError("Cada idea admite hasta 500 caracteres.");
    return { text: item.text, ...(item.source_turn == null ? {} : { source_turn: item.source_turn }) };
  });
  if (contextItems.map(item => item.text.trim()).join("\n").length > 2000)
    throw new TypeError("Resume tus ideas en hasta 2000 caracteres para guardar el contexto.");
  const historicalProjects = value.historicalProjects.map(item => {
    if (!item || typeof item.title !== "string" || item.title.length > 180 ||
        !Array.isArray(item.competency_ids) || item.competency_ids.some(id => !allowed.has(id)) ||
        (item.period != null && ![1, 2, 3, 4].includes(item.period)))
      throw new TypeError("Revisa el nombre, período y competencias de los proyectos anteriores.");
    return { title: item.title, competency_ids: [...new Set(item.competency_ids)], period: item.period ?? null };
  });
  return { value: { contextItems, historicalProjects }, importedTurns: [...new Set(importedTurns)] };
}
