import { neutralizeAssessmentText } from "./assessment-v4-service.mjs";

const IDENTIFIER = /(?:https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b\d{7,}\b|\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b)/iu;
const ADDRESS = /\b(?:direcci[oó]n|domicilio|vive|vivienda)\s*(?:es|en|:)\s*(?:calle|avenida|av\.|jr\.|jir[oó]n|pasaje)\s+[^.!?\n]{1,80}\b\d{1,5}\b/iu;
const STREET = /\b(?:calle|avenida|av\.|jr\.|jir[oó]n|pasaje)\s+[\p{L}\d .-]{2,80}\b\d{1,5}\b/iu;
const PHONE = /(?:\+?51[\s-]?)?9(?:[\s-]?\d){8}\b/u;
const NAME_CONTEXT = /(?<!\p{L})(?:se llama|llamad[oa]|nombre de)\s+\p{L}+/giu;
// Common sentence starters remain intact. An unknown capitalized word is blocked,
// rather than silently replaced: replacing an action could change the evidence.
const SAFE_START = new Set([
  "Agrupó", "Agarró", "Comparó", "Contó", "Construyó", "Dibujó", "Dijo", "Eligió",
  "Encontró", "Explicó", "Exploró", "Hizo", "Jugó", "Leyó", "Miró", "Mostró",
  "Observó", "Ordenó", "Participó", "Preguntó", "Repartió", "Respondió", "Señaló",
  "Separó", "Terminó", "Trabajó", "Usó", "Construye", "Dibuja", "Escucha",
  "Escribe", "Lleva", "Mueve", "Ordena", "Propone", "Reparte", "Puso", "Toma",
  "Dice", "Creo", "Será", "Estuvo", "Acá", "Ahí", "Ahora", "Antes", "Aquí",
  "Así", "Cómo", "Después", "Durante", "Esta", "Este", "Hoy", "Luego",
  "Mientras", "Primero", "Con", "También", "Cuando", "Entonces", "La", "El",
  "Los", "Las", "Un", "Una", "Se", "Su", "Al", "En", "Por", "Para",
  "Mamá", "Papá", "Familia", "Hermano", "Hermana", "Casa",
]);

export function sanitizeObservationV24(value, knownNames = []) {
  if (typeof value !== "string" || value.length > 4000 || !value.trim())
    return { status: "blocked", reason: "invalid_input", text: null };
  if (IDENTIFIER.test(value) || ADDRESS.test(value) || STREET.test(value) || PHONE.test(value))
    return { status: "blocked", reason: "direct_identifier", text: null };
  let text = neutralizeAssessmentText(value, knownNames).replace(NAME_CONTEXT, "[persona]");
  // Reject ambiguous proper names before provider transit. This check never rewrites
  // the observation and leaves verbs and connectors unchanged when allowed.
  const unknown = [...text.matchAll(/(?<!\p{L})\p{Lu}\p{Ll}{2,}(?!\p{L})/gu)]
    .some(([word]) => !SAFE_START.has(word));
  if (unknown || IDENTIFIER.test(text) || !/[\p{L}]{3}/u.test(text))
    return { status: "blocked", reason: "ambiguous_identifier", text: null };
  return { status: "ok", reason: null, text: text.trim() };
}
