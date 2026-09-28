import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve, relative } from "node:path";
import sharp from "sharp";
import { characterRegistrySchema, imageMetadataSchema, imageIndexSchema } from "../src/lib/image-library-schema.mjs";

const root = resolve("assets/project-images");
const registry = characterRegistrySchema.parse(JSON.parse(await readFile(join(root, "characters.json"), "utf8")));
const characterIds = new Set(Object.keys(registry.characters));

for (const character of Object.values(registry.characters)) {
  await readFile(join(root, character.reference));
}

const images = [];
const files = await readdir(root, { recursive: true, withFileTypes: true });
for (const entry of files) {
  if (!entry.isFile() || !entry.name.endsWith(".json") || ["index.json", "characters.json", "image.schema.json", "catalog-prioritized.json"].includes(entry.name)) continue;
  const folder = entry.parentPath ?? entry.path;
  const metadataPath = join(folder, entry.name);
  const metadata = imageMetadataSchema.parse(JSON.parse(await readFile(metadataPath, "utf8")));
  const expectedMetadataPath = join(root, metadata.file.replace(/\.jpg$/u, ".json"));
  if (resolve(metadataPath) !== resolve(expectedMetadataPath)) throw new Error(`Metadata fuera de lugar: ${relative(root, metadataPath)}`);
  for (const id of metadata.characters) if (!characterIds.has(id)) throw new Error(`Personaje desconocido ${id} en ${metadata.id}`);
  if (images.some((image) => image.id === metadata.id || image.file === metadata.file)) throw new Error(`ID o archivo duplicado: ${metadata.id}`);
  const optimized = await sharp(join(root, metadata.file)).metadata();
  const master = await sharp(join(root, metadata.master)).metadata();
  if (optimized.format !== "jpeg" || master.format !== "png") throw new Error(`Formatos incorrectos: ${metadata.id}`);
  if (optimized.width < optimized.height || optimized.width < 1200 || optimized.width > 1600) throw new Error(`Dimensiones incorrectas: ${metadata.id}`);
  if (Math.abs(optimized.width / optimized.height - 1.5) > 0.03 && Math.abs(optimized.width / optimized.height - 4 / 3) > 0.03) throw new Error(`Relación incorrecta: ${metadata.id}`);
  if (optimized.width !== master.width || optimized.height !== master.height) throw new Error(`Master y JPEG no coinciden: ${metadata.id}`);
  images.push(metadata);
}
images.sort((a, b) => a.id.localeCompare(b.id));
const index = imageIndexSchema.parse({ version: 1, images });
const target = join(root, "index.json");
const serialized = `${JSON.stringify(index, null, 2)}\n`;
if (process.argv.includes("--check")) {
  const current = await readFile(target, "utf8");
  if (current !== serialized) throw new Error("index.json no coincide con los JSON individuales.");
} else {
  await writeFile(target, serialized);
}
console.log(`Biblioteca validada: ${images.length} imágenes, ${characterIds.size} personajes.`);
