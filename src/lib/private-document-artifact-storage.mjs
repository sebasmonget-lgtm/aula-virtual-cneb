import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { supabaseServiceHeaders } from "./supabase-service-headers.mjs";

const keyPattern = /^([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})\/([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})\.docx$/i;
const assertKey = (key, teacherId) => {
  const match = keyPattern.exec(key ?? "");
  if (!match || match[1] !== teacherId) throw new Error("Artefacto privado no disponible.");
  return key;
};

export function createLocalPrivateDocumentArtifactStorage(root) {
  return {
    async save(key, bytes, teacherId) {
      assertKey(key, teacherId);
      if (!Buffer.isBuffer(bytes) || !bytes.length) throw new TypeError("Documento vacío.");
      const target = path.join(root, ...key.split("/"));
      await mkdir(path.dirname(target), { recursive: true });
      try { await writeFile(target, bytes, { flag: "wx", mode: 0o600 }); }
      catch (error) { if (error.code !== "EEXIST") throw error; }
      return readFile(target);
    },
    async read(key, teacherId) { return readFile(path.join(root, ...assertKey(key, teacherId).split("/"))); },
  };
}

export function createSupabasePrivateDocumentArtifactStorage({ url, serviceRoleKey, fetchImpl = fetch }) {
  const base = new URL(url ?? "https://invalid.example");
  if ((base.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(base.hostname)) ||
    !serviceRoleKey) throw new Error("Storage documental privado no configurado.");
  const headers = () => supabaseServiceHeaders(serviceRoleKey);
  const endpoint = key => `${base.origin}/storage/v1/object/ayni-document-artifacts/${key.split("/").map(encodeURIComponent).join("/")}`;
  return {
    async save(key, bytes, teacherId) {
      assertKey(key, teacherId);
      if (!Buffer.isBuffer(bytes) || !bytes.length) throw new TypeError("Documento vacío.");
      const response = await fetchImpl(endpoint(key), { method: "POST", headers: { ...headers(),
        "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "x-upsert": "false", "cache-control": "private, no-store" }, body: bytes });
      if (!response.ok && response.status !== 409) throw new Error("No se pudo preparar el documento privado.");
      return this.read(key, teacherId);
    },
    async read(key, teacherId) {
      assertKey(key, teacherId);
      const response = await fetchImpl(endpoint(key), { headers: headers(), cache: "no-store" });
      if (!response.ok) throw new Error("Documento privado no disponible.");
      return Buffer.from(await response.arrayBuffer());
    },
  };
}
