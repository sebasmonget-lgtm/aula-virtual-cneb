import { neutralizeAssessmentText } from "./assessment-v4-service.mjs";
import { competencyLabels } from "./competency-labels.mjs";

export const annualJourneyCurriculumTerms = curriculum => curriculum.flatMap(card => [card.name, competencyLabels[card.id]].filter(Boolean));

// Closed pedagogical vocabulary: preserve languages and common sentence starts,
// while unknown proper names and direct identifiers stay out of provider input.
const safeWords = new Set(("Explorar Comparar Comunicar Compartir Observar Indagar Construir Representar Organizar Crear Descubrir Escuchar Participar Aprender Cuidar Explicar Tenemos Usar Ofrecer Registrar Permitir Invitar Recuperar Juego Docente Niños Niñas Acompañar Mediar Preguntar Patio Feria Lego LEGO Expresión Inicial " + "Quechua Aymara Aimara Shipibo Konibo Asháninka Ashaninka Awajún Awajun Shawi Matsigenka Yanesha Castellano Español Sombras Tejidos Animales " +
  "Navidad Navideño Navideña Navideños Navideñas Nochebuena Pascua Perú Peru Fiestas Patrias Bandera Agua Plantas Semillas Árbol Arbol Árboles Arboles Flores Huerto Tierra Sol Luna Estrellas Planetas Mascotas Perros Gatos Aves Peces Ovejas Mariposas Insectos Mercado Colegio Escuela Biblioteca Libros Cuentos Pintura Colores Acuarelas Baile Música Musica Bloques Juguetes Reciclaje Ambiente Transporte Autos Alimentos Cocina Emociones Ideas Juegos " +
  "Quiero Siempre Me No Sí Si Le La El Los Las Una Un En Con Durante Cuando También Puede Prefiere Disfruta Necesita Familia Familias Juega Hace Hizo Construyó Explicó Observó Preguntó Se Su Para Hay Estamos Todavía").split(" "));
export function annualJourneySafeText(value, names = [], curriculumTerms = []) {
  if (typeof value !== "string" || value.length > 8000) return "";
  const officialWords = new Set(curriculumTerms.flatMap(term => String(term).match(/\p{Lu}\p{Ll}{2,}/gu) ?? []));
  return neutralizeAssessmentText(value, names)
    .replace(/(?:https?:\/\/|www\.)\S+|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b\d{7,}\b/giu, "[contacto privado]")
    .replace(/(?:direcci[oó]n|domicilio|dni|tel[eé]fono)\s*[:=]\s*[^\n]+/giu, "[dato privado]")
    .replace(/(?<!\p{L})\p{Lu}\p{Ll}{2,}(?!\p{L})/gu, (word) => safeWords.has(word) || officialWords.has(word) ? word : "[persona]").trim();
}
