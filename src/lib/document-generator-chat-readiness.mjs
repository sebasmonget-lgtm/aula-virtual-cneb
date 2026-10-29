export const DOCUMENT_CONVERSATION_VERSION='ayni-documents-chat-v25';

/** Legacy replies are read without rewriting them or making an extra AI call. */
export function documentConversationReady(turn) {
  if (!turn || turn.status !== 'ready') return false;
  if (typeof turn.readyToGenerate === 'boolean') return turn.readyToGenerate;
  if (turn.suggestions?.length || !turn.assistantText) return false;
  return /(?:puedes|podemos|bot[oó]n|pulsa|haz clic|selecciona|elige|continuar con).{0,100}(?:crear|generar|preparar|elegir d[ií]as)|(?:crear|generar) mi a[ñn]o|(?:bot[oó]n|pulsa|selecciona).{0,40}elegir d[ií]as/i.test(turn.assistantText);
}
