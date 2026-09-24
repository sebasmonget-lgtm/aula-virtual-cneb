import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink, readFile } from "node:fs/promises";
import path from "node:path";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const extensions = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]]);
const validPath = /^student-evidence\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/i;

/** Storage boundary. The caller authorizes teacher, pupil and evidence before save. */
export function createLocalPrivateEvidenceStorage(root) {
  return {
    async save({ teacherId, studentId, mimeType, bytes }) {
      if (!uuid.test(teacherId) || !uuid.test(studentId) || !extensions.has(mimeType) || !Buffer.isBuffer(bytes) || bytes.length < 1 || bytes.length > 3_000_000) {
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
      const mimeType = mediaPath.endsWith(".png") ? "image/png" : mediaPath.endsWith(".webp") ? "image/webp" : "image/jpeg";
      return { data, mimeType };
    },
  };
}
