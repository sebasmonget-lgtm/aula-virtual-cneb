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

export function createSupabasePrivateInterviewStorage({ url, serviceRoleKey, fetchImpl = fetch }) {
  const base = new URL(url ?? "https://invalid.example");
  if ((base.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(base.hostname)) || !serviceRoleKey) {
    throw new Error("Storage privado de entrevistas no configurado.");
  }
  const headers = () => ({ apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` });
  const endpoint = key => `${base.origin}/storage/v1/object/family-interviews/${key.split("/").map(encodeURIComponent).join("/")}`;
  const assertKey = (key, teacherId, studentId) => {
    const match = typeof key === "string" && key.match(keyPattern);
    if (!match || match[1] !== teacherId || match[2] !== studentId) throw new TypeError("Adjunto no autorizado.");
    return key;
  };
  return {
    async save({ teacherId, studentId, mimeType, bytes }) {
      if (!uuid.test(teacherId) || !uuid.test(studentId) || !types.has(mimeType) || !Buffer.isBuffer(bytes) ||
        bytes.length === 0 || bytes.length > 3_000_000) throw new TypeError("Adjunto inválido (PDF, JPG o PNG; máximo 3 MB).");
      const signatureValid = mimeType === "application/pdf" ? bytes.subarray(0, 5).toString() === "%PDF-"
        : mimeType === "image/jpeg" ? bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
          : bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      if (!signatureValid) throw new TypeError("El contenido del adjunto no coincide con su formato.");
      const key = `family-interview/${teacherId}/${studentId}/${randomUUID()}.${types.get(mimeType)}`;
      const response = await fetchImpl(endpoint(key), { method: "POST", headers: { ...headers(),
        "content-type": mimeType, "x-upsert": "false", "cache-control": "private, no-store" }, body: bytes });
      if (!response.ok) throw new Error("No se pudo guardar el adjunto privado.");
      return key;
    },
    async read(key, teacherId, studentId) {
      assertKey(key, teacherId, studentId);
      const response = await fetchImpl(endpoint(key), { headers: headers(), cache: "no-store" });
      if (!response.ok) throw new Error("Adjunto privado no disponible.");
      return { bytes: Buffer.from(await response.arrayBuffer()), mimeType: key.endsWith(".pdf") ? "application/pdf" : key.endsWith(".jpg") ? "image/jpeg" : "image/png" };
    },
    async remove(key, teacherId, studentId) {
      assertKey(key, teacherId, studentId);
      const response = await fetchImpl(endpoint(key), { method: "DELETE", headers: headers() });
      if (!response.ok && response.status !== 404) throw new Error("No se pudo retirar el adjunto no vinculado.");
    },
  };
}
