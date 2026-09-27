import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const inventoryUrl = new URL("../../docs/auditoria-biblioteca-fichas-inventario.json", import.meta.url);
const defaultRoot = () => process.env.AYNI_SHEET_LIBRARY_DIR || path.join(os.homedir(), "Documents", "plantillas ayni", "Fichas_MINEDU_JSON_Ayni");
const printableCompetencies = new Set(["MAT_CANTIDAD", "MAT_FORMA", "CYT_INDAGA", "COM_LECTURA", "COM_ESCRITURA"]);
const stop = new Set(["para", "como", "sobre", "entre", "desde", "donde", "cuando", "hacen", "hacer", "nuestro", "nuestra", "niños", "niñas", "taller", "proyecto", "actividad", "ficha", "observar", "representar"]);
const words = (value) => new Set(String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("es").match(/[a-zñ]{4,}/g)?.filter((word) => !stop.has(word)) ?? []);
const quantityTopics = ["cantid", "cuant", "colecci", "conjunt", "numero", "agrup", "emparej", "correspond", "repart"];
const genericThemes = new Set(["exploramos", "explorar", "jugamos", "jugar", "juego", "objetos", "materiales",
  "nuestro", "nuestra", "entorno", "pensamos", "aprendemos", "cantidad", "cantidades", "proyecto"]);
const sharedTopic = (wanted, content) => quantityTopics.some((stem) =>
  [...wanted].some((word) => word.startsWith(stem)) && [...content].some((word) => word.startsWith(stem)));
const isStorySheet = (sheet) => /\b(cuento|historia|narraci[oó]n)\b/i.test(`${sheet.title} ${sheet.intention}`);
const inside = (root, file) => file.startsWith(`${path.resolve(root)}${path.sep}`);
let cache;

export async function loadWorkshopSheetCatalog() {
  if (!cache) cache = readFile(inventoryUrl, "utf8").then((raw) => JSON.parse(raw).fichas.filter((item) =>
    item.fuente_categoria === "MINEDU" && item.confianza_del_analisis === "alta"
    && !item.requiere_redisenar_pdf && printableCompetencies.has(item.competencia_id)
    && [3, 4, 5].includes(Number(item.edad))));
  return cache;
}

export async function availableSheets({ age, competencyId, root = defaultRoot() }) {
  if (!printableCompetencies.has(competencyId)) return [];
  const candidates = (await loadWorkshopSheetCatalog()).filter((item) => Number(item.edad) === Number(age)
    && item.competencia_id === competencyId);
  const available = [];
  for (const item of candidates) {
    const json = path.resolve(root, item.archivo);
    if (!inside(root, json)) continue;
    let source;
    try { source = JSON.parse(await readFile(json, "utf8")); } catch { continue; }
    const pdfName = source.fuente?.archivo_pdf;
    if (!/^[\w.-]+\.pdf$/i.test(pdfName ?? "")) continue;
    const folder = path.basename(path.dirname(json));
    const pdf = path.resolve(root, `${folder}_desarmado`, pdfName);
    if (!inside(root, pdf)) continue;
    try { if (!(await stat(pdf)).isFile()) continue; } catch { continue; }
    available.push({ id: item.id, title: item.titulo, age: Number(item.edad), competency_id: item.competencia_id,
      intention: item.proposito_o_intencion ?? "", actions: item.acciones ?? [], description: item.descripcion ?? "",
      source_pdf_sha256: source.fuente.sha256_pdf ?? null, pdf_path: pdf,
      page_count: Number(source.fuente.paginas_en_ficha ?? 1) });
  }
  return available;
}

export function rankWorkshopSheets(sheets, { age, competencyId, intention, topic = "" }) {
  const wanted = words(intention);
  const topicWords = [...words(topic)].filter((word) => !genericThemes.has(word));
  return sheets.filter((sheet) => sheet.age === Number(age) && sheet.competency_id === competencyId)
    .map((sheet) => {
      const content = words([sheet.title, sheet.intention, sheet.description, ...sheet.actions].join(" "));
      const score = [...wanted].filter((word) => content.has(word)).length;
      const topicCompatible = competencyId !== "MAT_CANTIDAD" || sharedTopic(wanted, content);
      const storyCompatible = !isStorySheet(sheet) || /\b(cuento|historia|narraci[oó]n)\b/i.test(intention);
      const themeCompatible = !topicWords.length || topicWords.some((word) => content.has(word));
      return { sheet, match_score: score, topicCompatible, storyCompatible, themeCompatible };
    }).filter((sheet) => sheet.match_score >= 2 && sheet.topicCompatible && sheet.storyCompatible && sheet.themeCompatible)
    .map(({ sheet, match_score }) => ({ ...sheet, match_score }))
    .sort((a, b) => b.match_score - a.match_score || a.title.localeCompare(b.title, "es"));
}

export async function selectWorkshopSheet({ age, competencyId, intention, topic, root }) {
  return rankWorkshopSheets(await availableSheets({ age, competencyId, root }), { age, competencyId, intention, topic })[0] ?? null;
}

export async function verifiedSheetFile(sheet) {
  const bytes = await readFile(sheet.pdf_path);
  if (bytes.subarray(0, 4).toString() !== "%PDF") throw new Error("La ficha seleccionada no es un PDF válido.");
  if (sheet.source_pdf_sha256 && createHash("sha256").update(bytes).digest("hex") !== sheet.source_pdf_sha256)
    throw new Error("La ficha seleccionada cambió desde que se catalogó.");
  return bytes;
}

export function publicSheet(sheet) {
  return { id: sheet.id, title: sheet.title, age: sheet.age, competency_id: sheet.competency_id,
    intention: sheet.intention, actions: sheet.actions, match_score: sheet.match_score ?? null };
}

/** Convert the verified original PDF pages to lossless images for Word/thumbnail use. */
export async function renderSheetPages(sheet, { firstOnly = false } = {}) {
  const bytes = await verifiedSheetFile(sheet);
  const directory = await mkdtemp(path.join(tmpdir(), "ayni-sheet-"));
  try {
    const input = path.join(directory, "source.pdf");
    await writeFile(input, bytes);
    const output = path.join(directory, "page");
    await promisify(execFile)(process.env.AYNI_PDFTOPPM_PATH || "pdftoppm",
      ["-f", "1", ...(firstOnly ? ["-l", "1"] : []), "-r", firstOnly ? "90" : "180", "-png", input, output],
      { timeout: 60_000, maxBuffer: 2_000_000 });
    const names = (await readdir(directory)).filter((name) => /^page-\d+\.png$/.test(name)).sort();
    if (!names.length) throw new Error("No se pudo preparar la ficha para impresión.");
    return Promise.all(names.map((name) => readFile(path.join(directory, name))));
  } finally { await rm(directory, { recursive: true, force: true }); }
}
