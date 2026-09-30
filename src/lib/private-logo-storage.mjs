import { supabaseServiceHeaders } from "./supabase-service-headers.mjs";

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const validPath = /^institution-logos\/([0-9a-f-]{36})\/([0-9a-f-]{36})\.(png|svg)$/i;

/** Logo objects are addressed only after the institution asset owner is checked in SQL. */
export function createSupabasePrivateLogoStorage({ url, serviceRoleKey, fetchImpl = fetch }) {
  const base = new URL(url ?? "https://invalid.example");
  if ((base.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(base.hostname)) || !serviceRoleKey) {
    throw new Error("Storage privado de logos no configurado.");
  }
  const headers = () => supabaseServiceHeaders(serviceRoleKey);
  const endpoint = key => `${base.origin}/storage/v1/object/institution-logos/${key.split("/").map(encodeURIComponent).join("/")}`;
  const assertPath = (mediaPath, teacherId) => {
    const match = validPath.exec(mediaPath ?? "");
    if (!match || match[1] !== teacherId) throw new Error("Logo privado no disponible.");
    return mediaPath.slice("institution-logos/".length);
  };
  return {
    async save({ teacherId, assetId, mimeType, bytes }) {
      if (!uuid.test(teacherId) || !uuid.test(assetId) || !["image/png", "image/svg+xml"].includes(mimeType) ||
        !Buffer.isBuffer(bytes) || !bytes.length || bytes.length > 2_000_000) throw new TypeError("Logo inválido.");
      const key = `${teacherId}/${assetId}.${mimeType === "image/png" ? "png" : "svg"}`;
      const response = await fetchImpl(endpoint(key), { method: "POST", headers: { ...headers(),
        "content-type": mimeType, "x-upsert": "false", "cache-control": "private, no-store" }, body: bytes });
      if (!response.ok) throw new Error("No se pudo guardar el logo privado.");
      return `institution-logos/${key}`;
    },
    async read(mediaPath, teacherId) {
      const key = assertPath(mediaPath, teacherId);
      const response = await fetchImpl(endpoint(key), { headers: headers(), cache: "no-store" });
      if (!response.ok) throw new Error("Logo privado no disponible.");
      return Buffer.from(await response.arrayBuffer());
    },
    async remove(mediaPath, teacherId) {
      const key = assertPath(mediaPath, teacherId);
      const response = await fetchImpl(endpoint(key), { method: "DELETE", headers: headers() });
      if (!response.ok && response.status !== 404) throw new Error("No se pudo retirar el logo no vinculado.");
    },
  };
}
