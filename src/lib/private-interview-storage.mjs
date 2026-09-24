import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const types = new Map([["application/pdf", "pdf"], ["image/jpeg", "jpg"], ["image/png", "png"]]);
const keyPattern = /^family-interview\/([0-9a-f-]{36})\/([0-9a-f-]{36})\/([0-9a-f-]{36})\.(pdf|jpg|png)$/i;

export function createLocalPrivateInterviewStorage(root) {
  return {
    async save({ teacherId, studentId, mimeType, bytes }) {
      if (!uuid.test(teacherId) || !uuid.test(studentId) || !types.has(mimeType) || !Buffer.isBuffer(bytes)
        || bytes.length === 0 || bytes.length > 3_000_000) throw new TypeError("Adjunto inválido (PDF, JPG o PNG; máximo 3 MB).");
      const signatureValid = mimeType === "application/pdf" ? bytes.subarray(0, 5).toString() === "%PDF-"
        : mimeType === "image/jpeg" ? bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
          : bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      if (!signatureValid) throw new TypeError("El contenido del adjunto no coincide con su formato.");
      const key = `family-interview/${teacherId}/${studentId}/${randomUUID()}.${types.get(mimeType)}`;
      const target = path.join(root, ...key.split("/").slice(1));
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, bytes, { flag: "wx", mode: 0o600 });
      return key;
    },
    async read(key, teacherId, studentId) {
      const match = typeof key === "string" && key.match(keyPattern);
      if (!match || match[1] !== teacherId || match[2] !== studentId) throw new TypeError("Adjunto no autorizado.");
      return { bytes: await readFile(path.join(root, ...key.split("/").slice(1))), mimeType: match[4] === "pdf" ? "application/pdf" : match[4] === "jpg" ? "image/jpeg" : "image/png" };
    },
    async remove(key, teacherId, studentId) {
      const match = typeof key === "string" && key.match(keyPattern);
      if (!match || match[1] !== teacherId || match[2] !== studentId) throw new TypeError("Adjunto no autorizado.");
      await unlink(path.join(root, ...key.split("/").slice(1)));
    },
  };
}
