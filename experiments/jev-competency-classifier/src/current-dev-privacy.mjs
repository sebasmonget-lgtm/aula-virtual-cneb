import { neutralizeAssessmentText } from "../../../src/lib/assessment-v4-service.mjs";

const IDENTIFIER = /(?:https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b\d{7,}\b)/iu;
const ADDRESS = /\b(?:direcci[oó]n|domicilio|vive|vivienda)\s*(?:es|en|:)\s*(?:calle|avenida|av\.|jr\.|jir[oó]n|pasaje)\s+[^.!?\n]{1,80}\b\d{1,5}\b/iu;
// Same closed list and anonymization as V1. Family nouns alone are not identifiers.
const SAFE_WORDS = new Set([
  "Agrupó", "Comparó", "Contó", "Construyó", "Dibujó", "Dijo", "Eligió", "Explicó",
  "Exploró", "Hizo", "Jugó", "Miró", "Mostró", "Observó", "Ordenó", "Participó",
  "Preguntó", "Repartió", "Respondió", "Señaló", "Separó", "Terminó", "Trabajó", "Usó",
  "Construye", "Dibuja", "Escucha", "Escribe", "Lleva", "Mueve", "Ordena", "Propone",
  "Reparte", "Puso", "Toma", "Dice", "Creo", "Será", "Estuvo",
  "Acá", "Ahí", "Ahora", "Antes", "Aquí", "Así", "Cómo", "Después", "Durante",
  "Esta", "Este", "Hoy", "Luego", "Mientras", "Primero",
]);

export function devPrivacy(value, knownNames = []) {
  if (typeof value !== "string" || value.length > 4000) return { blocked: true, text: null, reason: "invalid_input" };
  value = value.replace(/^\[PRUEBA FICTICIA(?: · OBS-\d{8})?\]\s*/u, "");
  if (!value.trim()) return { blocked: true, text: null, reason: "empty_input" };
  if (IDENTIFIER.test(value)) return { blocked: true, text: null, reason: "direct_identifier" };
  if (ADDRESS.test(value)) return { blocked: true, text: null, reason: "identifiable_address" };
  let text = neutralizeAssessmentText(value, knownNames);
  text = text.replace(/\b(?:se llama|llamad[oa]|nombre de)\s+\p{L}+/giu, "[persona]");
  text = text.replace(/(?<!\p{L})\p{Lu}\p{Ll}{2,}(?!\p{L})/gu,
    (word) => SAFE_WORDS.has(word) ? word : "[persona]");
  if (IDENTIFIER.test(text) || !/[\p{L}]{3}/u.test(text)) return { blocked: true, text: null, reason: "unusable_after_anonymization" };
  return { blocked: false, text: text.trim(), reason: null };
}
