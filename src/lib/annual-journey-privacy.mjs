import { neutralizeAssessmentText } from "./assessment-v4-service.mjs";

// Closed pedagogical vocabulary: preserve languages and common sentence starts,
// while unknown proper names and direct identifiers stay out of provider input.
const safeWords = new Set(("Quechua Aymara Aimara Shipibo Konibo Asháninka Ashaninka Awajún Awajun Shawi Matsigenka Yanesha Castellano Español Sombras Tejidos Animales " +
  "Quiero Siempre Me No Sí Si Le La El Los Las Una Un En Con Durante Cuando También Puede Prefiere Disfruta Necesita Familia Familias Juega Hace Hizo Construyó Explicó Observó Preguntó Se Su Para Hay Estamos Todavía").split(" "));
export function annualJourneySafeText(value, names = []) {
  if (typeof value !== "string" || value.length > 8000) return "";
  return neutralizeAssessmentText(value, names)
    .replace(/(?:https?:\/\/|www\.)\S+|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b\d{7,}\b/giu, "[contacto privado]")
    .replace(/(?:direcci[oó]n|domicilio|dni|tel[eé]fono)\s*[:=]\s*[^\n]+/giu, "[dato privado]")
    .replace(/(?<!\p{L})\p{Lu}\p{Ll}{2,}(?!\p{L})/gu, (word) => safeWords.has(word) ? word : "[persona]").trim();
}
