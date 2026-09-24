import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/** Save only an authorized, already rendered Word file in the local user's Downloads folder. */
export async function saveWordToLocalDownloads(download, downloadsDir) {
  const filename = download?.filename;
  const buffer = download?.buffer;
  if (typeof filename !== "string" || !/^[a-z0-9-]+\.docx$/i.test(filename) ||
      !Buffer.isBuffer(buffer) || buffer.length < 4 || buffer.subarray(0, 2).toString() !== "PK") {
    throw new Error("El documento Word no es válido.");
  }
  await mkdir(downloadsDir, { recursive: true });
  const stem = filename.slice(0, -5);
  for (let index = 1; index <= 100; index += 1) {
    const candidate = index === 1 ? filename : `${stem}-${index}.docx`;
    const filePath = path.join(downloadsDir, candidate);
    try {
      await writeFile(filePath, buffer, { flag: "wx" });
      return { filename: candidate, path: filePath, alreadyExists: false };
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      if ((await readFile(filePath)).equals(buffer)) {
        return { filename: candidate, path: filePath, alreadyExists: true };
      }
    }
  }
  throw new Error("La carpeta Descargas contiene demasiadas versiones de este documento.");
}
