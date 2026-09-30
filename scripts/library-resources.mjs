import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.join(process.cwd(), "biblioteca-talleres");
const ages = [3, 4, 5];
const families = ["grafico-plastico", "psicomotricidad"];

async function workshop(folder) {
  const metadata = JSON.parse(await readFile(path.join(folder, "metadata.json"), "utf8"));
  const filenames = await readdir(folder);
  const word = filenames.find((name) => name.endsWith(".docx"));
  if (!word || !/^taller-[a-z0-9-]+$/.test(metadata.id) || !ages.includes(metadata.edad)) return [];
  const resources = [{
    id: metadata.id,
    kind: "workshop",
    title: metadata.titulo,
    age: metadata.edad,
    area: metadata.tipo_taller,
    purpose: metadata.proposito,
    materials: metadata.materiales,
    criterion: metadata.criterio,
    download: { path: path.join(folder, word), filename: word, mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  }];
  for (const resource of metadata.recursos_asociados ?? []) {
    const png = resource.files?.find((name) => /^assets\/[a-z0-9-]+\.png$/.test(name));
    if (!png) continue;
    resources.push({
      id: `${metadata.id}-material`, kind: "material", title: resource.name, age: metadata.edad,
      area: metadata.tipo_taller, purpose: resource.description, materials: [], criterion: "",
      download: { path: path.join(folder, png), filename: path.basename(png), mimeType: "image/png" },
    });
  }
  return resources;
}

let cached;
export async function loadLibraryResources() {
  if (!cached) cached = (async () => {
    const entries = [];
    for (const age of ages) for (const family of families) {
      const directory = path.join(root, `${age}-anos`, family);
      let folders = [];
      try { folders = await readdir(directory, { withFileTypes: true }); }
      catch (error) { if (error?.code !== "ENOENT") throw error; }
      for (const entry of folders) if (entry.isDirectory()) {
        entries.push(...await workshop(path.join(directory, entry.name)));
      }
    }
    return entries.sort((a, b) => a.age - b.age || a.title.localeCompare(b.title, "es"));
  })();
  return cached;
}

export function publicLibraryResource(resource) {
  return {
    id: resource.id, kind: resource.kind, title: resource.title, age: resource.age,
    area: resource.area, purpose: resource.purpose, materials: resource.materials,
    criterion: resource.criterion,
  };
}

export async function saveLibraryResourceToDownloads(resource, downloadsDir) {
  const { filename } = resource.download;
  if (!/^[a-z0-9_-]+\.(docx|png)$/i.test(filename)) throw new Error("Nombre de recurso no válido.");
  const bytes = await readFile(resource.download.path);
  const valid = filename.endsWith(".docx")
    ? bytes.subarray(0, 2).toString() === "PK"
    : bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (!valid) throw new Error("El archivo del recurso no es válido.");
  await mkdir(downloadsDir, { recursive: true });
  const extension = path.extname(filename);
  const stem = filename.slice(0, -extension.length);
  for (let index = 1; index <= 100; index += 1) {
    const candidate = index === 1 ? filename : `${stem}-${index}${extension}`;
    try {
      await writeFile(path.join(downloadsDir, candidate), bytes, { flag: "wx" });
      return { filename: candidate, alreadyExists: false };
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      if ((await readFile(path.join(downloadsDir, candidate))).equals(bytes)) {
        return { filename: candidate, alreadyExists: true };
      }
    }
  }
  throw new Error("La carpeta Descargas contiene demasiadas versiones de este recurso.");
}
