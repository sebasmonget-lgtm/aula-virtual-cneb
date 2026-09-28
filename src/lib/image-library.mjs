import index from "../../assets/project-images/index.json" with { type: "json" };
import { imageIndexSchema } from "./image-library-schema.mjs";

const images = imageIndexSchema.parse(index).images;
const stopWords = new Set(["a", "al", "con", "como", "de", "del", "el", "en", "es", "la", "las", "los", "mi", "nuestro", "nuestra", "para", "por", "que", "un", "una", "y"]);
const aliases = new Map(Object.entries({
  crece: "crecimiento", crecen: "crecimiento", crecer: "crecimiento", creciendo: "crecimiento",
  germina: "germinacion", germinan: "germinacion", germinar: "germinacion", germinando: "germinacion",
  brotan: "brote", brotar: "brote", brotes: "brote",
  sembrar: "plantar", sembrando: "plantar", siembra: "plantar", plantando: "plantar",
  riego: "regar", regando: "regar", riegan: "regar",
  cuidamos: "cuidar", cuidando: "cuidar", cuidan: "cuidar", cuidado: "cuidar",
  observando: "observar", observamos: "observar", observacion: "observar",
  comparando: "comparar", comparamos: "comparar", comparacion: "comparar",
  repartiendo: "repartir", repartimos: "repartir", reparto: "repartir",
  contando: "contar", contamos: "contar", conteo: "contar",
  flota: "flotar", flotan: "flotar", flotando: "flotar",
  hunde: "hundirse", hunden: "hundirse", hundiendo: "hundirse",
  reciclar: "reciclaje", reciclamos: "reciclaje", reciclando: "reciclaje",
  escuchamos: "escuchar", escuchando: "escuchar",
  jugamos: "jugar", jugando: "jugar",
  celebramos: "celebrar", celebrando: "celebrar",
  exploramos: "explorar", explorando: "explorar",
  separamos: "clasificar", separando: "clasificar",
}));

function tokens(value) {
  const raw = String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/gu, "").toLowerCase();
  return new Set((raw.match(/[a-z0-9]+/gu) ?? []).map((word) => {
    const singular = word.length > 4 && word.endsWith("es") ? word.slice(0, -2)
      : word.length > 3 && word.endsWith("s") ? word.slice(0, -1) : word;
    return aliases.get(word) ?? aliases.get(singular) ?? singular;
  }).filter((word) => word.length > 1 && !stopWords.has(word)));
}

function queryTokens(project) {
  if (typeof project === "string") return tokens(project);
  const fields = [project?.title, project?.purpose, project?.situation,
    ...(Array.isArray(project?.competencies) ? project.competencies : []),
    ...(Array.isArray(project?.concepts) ? project.concepts : []),
    project?.context];
  return tokens(fields.filter(Boolean).join(" "));
}

function matches(query, values) {
  const found = new Set();
  for (const value of values) for (const term of tokens(value)) if (query.has(term)) found.add(term);
  return found.size;
}

/** Score metadata independently of Word generation or image files. */
export function scoreImage(image, project, { usedIds = [] } = {}) {
  const query = queryTokens(project);
  if (!query.size) return 0;
  const score = matches(query, image.concepts) * 5
    + matches(query, image.actions) * 4
    + matches(query, image.objects) * 3
    + matches(query, [image.category]) * 3
    + matches(query, [image.subcategory]) * 4
    + matches(query, image.contexts) * 2;
  return score ? score - (usedIds.includes(image.id) ? 12 : 0) : 0;
}

export function searchProjectImages(project, options = {}) {
  return images.map((image) => ({ image, score: scoreImage(image, project, options) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.image.priority - a.image.priority || a.image.id.localeCompare(b.image.id));
}

/** Returns null when the library has no relevant illustration. */
export function selectProjectImage(project, options = {}) {
  const ranking = searchProjectImages(project, options);
  const minimum = options.minScore ?? 5;
  let selected = ranking.find(({ score }) => score >= minimum);
  if (!selected) {
    const query = queryTokens(project);
    selected = ranking.find(({ image }) => matches(query, [image.category]) > 0)
      ?? ranking.find(({ image }) => image.category === "general");
  }
  if (!selected) return null;
  return { id: selected.image.id, path: `assets/project-images/${selected.image.file}`, score: selected.score };
}
