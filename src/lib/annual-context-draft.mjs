/** Reconcile generated summaries; teacher edits and removals always take precedence. */
export function currentAnnualConversation(previous,next) {
  return previous?.id===next.id && (previous.revision>next.revision || previous.revision===next.revision&&previous.status===next.status) ? previous : next;
}

export function mergeAnnualContextDraft(draft, items = []) {
  const importedTurns = new Set(draft.importedTurns);
  // A read/retry of the same answer cannot revise the teacher's current draft.
  if (!items.some(item => !importedTurns.has(item.source_turn))) return draft;
  const importedItems = [...(draft.importedItems ?? [])];
  let contextItems = [...draft.value.contextItems];
  const signature = rows => JSON.stringify(rows.map(item => item.text.trim()).sort());
  const turns = new Set(items.map(item => item.source_turn));
  for (const turn of turns) {
    const previous = importedItems.filter(item => item.source_turn === turn);
    const current = contextItems.filter(item => item.source_turn === turn);
    // Legacy drafts have no baseline. Never infer that their text was unedited.
    if (importedTurns.has(turn) && (!previous.length || signature(previous) !== signature(current))) continue;
    const next = items.filter(item => item.source_turn === turn);
    contextItems = contextItems.filter(item => item.source_turn !== turn);
    for (let i = importedItems.length - 1; i >= 0; i--) if (importedItems[i].source_turn === turn) importedItems.splice(i, 1);
    importedItems.push(...next.map(({text,source_turn}) => ({text,source_turn})));
    contextItems.push(...next.map(({text,source_turn}) => ({text,source_turn})));
    importedTurns.add(turn);
  }
  const texts = new Set();
  contextItems = contextItems.filter(item => {
    if (!texts.has(item.text.trim())) {
      texts.add(item.text.trim());
      return true;
    }
    return false;
  });
  return { value: { ...draft.value, contextItems }, importedTurns: [...importedTurns], importedItems };
}

/** A draft may contain unfinished rows. Final preparation still validates completeness. */
export function validateAnnualContextDraft(draft, curriculum, turnCount) {
  const { value, importedTurns, importedItems } = draft ?? {};
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
  if (importedItems != null && (!Array.isArray(importedItems) || importedItems.length > 20 || importedItems.some(item =>
    typeof item?.text !== 'string' || item.text.length > 500 || !Number.isInteger(item.source_turn) || !importedTurns.includes(item.source_turn))))
    throw new TypeError('No pude conservar la procedencia del contexto. Vuelve a abrir la conversación.');
  return { value: { contextItems, historicalProjects }, importedTurns: [...new Set(importedTurns)],
    ...(importedItems ? {importedItems: importedItems.map(({text,source_turn}) => ({text,source_turn}))} : {}) };
}
