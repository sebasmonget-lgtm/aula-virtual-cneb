import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink, readFile } from "node:fs/promises";
import path from "node:path";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const extensions = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"],
  ["audio/webm", "webm"], ["audio/mpeg", "mp3"], ["audio/mp4", "m4a"], ["audio/wav", "wav"], ["audio/ogg", "ogg"]]);
const validPath = /^student-evidence\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp|webm|mp3|m4a|wav|ogg)$/i;
const mimeByExtension = Object.fromEntries([...extensions].map(([mime, extension]) => [extension, mime]));

/** Storage boundary. The caller authorizes teacher, pupil and evidence before save. */
export function createLocalPrivateEvidenceStorage(root) {
  return {
    async save({ teacherId, studentId, mimeType, bytes }) {
      const limit = mimeType?.startsWith("audio/") ? 8_000_000 : 3_000_000;
      if (!uuid.test(teacherId) || !uuid.test(studentId) || !extensions.has(mimeType) || !Buffer.isBuffer(bytes) || bytes.length < 1 || bytes.length > limit) {
        throw new TypeError("Archivo de evidencia inválido.");
      }
      const key = `${teacherId}/${studentId}/${randomUUID()}.${extensions.get(mimeType)}`;
      const target = path.join(root, ...key.split("/"));
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, bytes, { flag: "wx", mode: 0o600 });
      return `student-evidence/${key}`;
    },
    async delete(mediaPath) {
      if (typeof mediaPath !== "string" || !validPath.test(mediaPath)) return;
      await unlink(path.join(root, ...mediaPath.slice("student-evidence/".length).split("/")));
    },
    async read(mediaPath, { teacherId, studentId }) {
      if (typeof mediaPath !== "string" || !validPath.test(mediaPath) || !mediaPath.startsWith(`student-evidence/${teacherId}/${studentId}/`)) throw new Error("Evidencia privada no disponible.");
      const data = await readFile(path.join(root, ...mediaPath.slice("student-evidence/".length).split("/")));
      const mimeType = mimeByExtension[mediaPath.split(".").at(-1).toLowerCase()];
      return { data, mimeType };
    },
  };
}
