import { randomUUID } from "node:crypto";
import { supabaseServiceHeaders } from "./supabase-service-headers.mjs";

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const validPath = /^ordinary-observations\/([0-9a-f-]{36})\/([0-9a-f-]{36})\/([0-9a-f-]{36})\.(jpg|png|webp)$/i;
const extensions = new Map([["image/jpeg","jpg"],["image/png","png"],["image/webp","webp"]]);
const mimeTypes = Object.fromEntries([...extensions].map(([mime, ext]) => [ext,mime]));

/** Server-only Storage boundary. The route authorizes ownership before every operation. */
export function createSupabasePrivateObservationStorage({ url, serviceRoleKey, fetchImpl = fetch }) {
  const base = new URL(url ?? "https://invalid.example");
  if ((!/^https:$/.test(base.protocol) && !["localhost", "127.0.0.1"].includes(base.hostname)) ||
    !serviceRoleKey || typeof serviceRoleKey !== "string") throw new Error("Storage privado de observaciones no configurado.");
  const headers = () => supabaseServiceHeaders(serviceRoleKey);
  const endpoint = key => `${base.origin}/storage/v1/object/ayni-observation-media/${key.split("/").map(encodeURIComponent).join("/")}`;
  const assertPath = (mediaPath, teacherId, studentId) => {
    const match = validPath.exec(mediaPath ?? "");
    if (!match || match[1] !== teacherId || match[2] !== studentId) throw new Error("Foto privada no disponible.");
    return mediaPath.slice("ordinary-observations/".length);
  };
  return {
    async save({ teacherId, studentId, mimeType, bytes }) {
      if (!uuid.test(teacherId) || !uuid.test(studentId) || !extensions.has(mimeType) ||
        !Buffer.isBuffer(bytes) || bytes.length < 1 || bytes.length > 3_000_000) throw new TypeError("Foto inválida.");
      const key = `${teacherId}/${studentId}/${randomUUID()}.${extensions.get(mimeType)}`;
      const response = await fetchImpl(endpoint(key), { method: "POST", headers: { ...headers(), "content-type": mimeType,
        "x-upsert": "false", "cache-control": "private, no-store" }, body: bytes });
      if (!response.ok) throw new Error("No se pudo guardar la foto privada.");
      return `ordinary-observations/${key}`;
    },
    async read(mediaPath, { teacherId, studentId }) {
      const key = assertPath(mediaPath, teacherId, studentId);
      const response = await fetchImpl(endpoint(key), { headers: headers(), cache: "no-store" });
      if (!response.ok) throw new Error("Foto privada no disponible.");
      return { data: Buffer.from(await response.arrayBuffer()), mimeType: mimeTypes[key.split(".").at(-1)] };
    },
    async delete(mediaPath, { teacherId, studentId }) {
      const key = assertPath(mediaPath, teacherId, studentId);
      const response = await fetchImpl(endpoint(key), { method: "DELETE", headers: headers() });
      if (!response.ok && response.status !== 404) throw new Error("No se pudo retirar la foto no vinculada.");
    },
  };
}
