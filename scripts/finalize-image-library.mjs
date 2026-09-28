import { access, readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { characterRegistrySchema, imageMetadataSchema } from "../src/lib/image-library-schema.mjs";

const root = resolve("assets/project-images");
const registry = characterRegistrySchema.parse(JSON.parse(await readFile(join(root, "characters.json"), "utf8")));
const lines = (await readFile(join(root, "catalog-prioritized.tsv"), "utf8")).trim().split(/\r?\n/u).slice(1);
const known = new Set();
const completed = new Set();
for (const entry of await readdir(root, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith(".json") || ["index.json", "characters.json", "image.schema.json"].includes(entry.name)) continue;
  const file = join(entry.parentPath ?? entry.path, entry.name);
  const metadata = imageMetadataSchema.parse(JSON.parse(await readFile(file, "utf8")));
  if (completed.has(metadata.id)) throw new Error(`Metadata duplicada: ${metadata.id}`);
  completed.add(metadata.id);
}
let added = 0;

for (const line of lines) {
  const columns = line.split("|");
  if (columns.length !== 9) throw new Error(`Catálogo inválido: ${line}`);
  const [id, category, subcategory, title, characterText, , conceptText, actionText, objectText] = columns;
  if (known.has(id)) throw new Error(`Escena duplicada: ${id}`);
  known.add(id);
  if (completed.has(id)) continue;
  const characters = characterText.split(",");
  for (const character of characters) if (!registry.characters[character]) throw new Error(`Personaje desconocido: ${character}`);
  const master = `masters/${id}.png`;
  try { await access(join(root, master)); } catch { continue; }
  const file = `${category}/${id}.jpg`;
  const metadataFile = join(root, category, `${id}.json`);
  try { await access(metadataFile); continue; } catch { /* New scene. */ }
  await mkdir(join(root, category), { recursive: true });
  const masterInfo = await sharp(join(root, master)).metadata();
  if (masterInfo.format !== "png" || masterInfo.width < masterInfo.height) throw new Error(`Master inválido: ${id}`);
  await sharp(join(root, master)).jpeg({ quality: 88, mozjpeg: true }).toFile(join(root, file));
  const metadata = imageMetadataSchema.parse({
    id, file, master, title, category, subcategory, characters,
    concepts: conceptText.split(","), actions: actionText.split(","), objects: objectText.split(","),
    contexts: [...new Set(["proyecto", "plan_anual", "portada", category, subcategory])],
    age_range: [3, 4, 5], orientation: "landscape", aspect_ratio: "3:2", has_text: false,
    country_context: "PE", variant: Number(id.match(/_(\d+)$/u)?.[1] ?? 1), priority: 10,
  });
  await writeFile(metadataFile, `${JSON.stringify(metadata, null, 2)}\n`);
  completed.add(id);
  added += 1;
}
console.log(`Escenas catalogadas: ${known.size}; escenas nuevas finalizadas: ${added}.`);
