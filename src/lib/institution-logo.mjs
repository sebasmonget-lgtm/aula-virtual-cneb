import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const allowedUploads = new Map([["image/png", "png"], ["image/jpeg", "jpeg"], ["image/webp", "webp"]]);

export function buildInstitutionInitialsLogo({ initials, primary, accent } = {}) {
  const safeInitials = typeof initials === "string" ? initials.trim().toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ0-9]/g, "").slice(0, 3) || "AA" : "AA";
  const safeColor = (value, fallback) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
  const base = safeColor(primary, "#173d3a"), highlight = safeColor(accent, "#f6c85f");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="116" fill="${base}"/><circle cx="392" cy="120" r="54" fill="${highlight}"/><path d="M120 342c82-8 137-58 156-151 55 54 73 114 51 181-69 30-138 20-207-30Z" fill="${highlight}" opacity=".95"/><text x="126" y="280" font-family="Arial,sans-serif" font-size="132" font-weight="700" fill="white">${safeInitials}</text></svg>`;
  return Buffer.from(svg);
}

/** Turn an untrusted upload into a small PNG without EXIF or other metadata. */
export async function normalizeInstitutionLogoUpload(upload) {
  if (!upload || !allowedUploads.has(upload.mimeType) || typeof upload.base64 !== "string"
    || !/^[A-Za-z0-9+/]+={0,2}$/.test(upload.base64) || upload.base64.length > 2_800_000) {
    throw new TypeError("Elige una imagen PNG, JPG o WebP de hasta 2 MB.");
  }
  const bytes = Buffer.from(upload.base64, "base64");
  if (!bytes.length || bytes.length > 2_000_000) throw new TypeError("El logo debe pesar como máximo 2 MB.");
  try {
    const image = sharp(bytes, { limitInputPixels: 16_000_000, failOn: "error" });
    const metadata = await image.metadata();
    if (metadata.format !== allowedUploads.get(upload.mimeType) || !metadata.width || !metadata.height) {
      throw new TypeError("El contenido del logo no coincide con el formato elegido.");
    }
    return await image.rotate().resize(384, 384, { fit: "contain", background: "#ffffff" })
      .png({ compressionLevel: 9 }).toBuffer();
  } catch (error) {
    if (error instanceof TypeError) throw error;
    throw new TypeError("La imagen del logo no se pudo leer. Usa PNG, JPG o WebP.");
  }
}

/** Read only the current logo of the authorized institution. Never accept a client path. */
export async function loadInstitutionLogoForDocuments(db, teacherId, assetsRoot) {
  const row = (await db.query(`select ia.original_path,ia.mime_type from institution_profiles ip
    join institution_assets ia on ia.id=ip.logo_asset_id and ia.owner_user_id=ip.owner_user_id and ia.type='logo'
    where ip.owner_user_id=$1`, [teacherId])).rows[0];
  if (!row) return null;
  try {
    let bytes;
    if (typeof assetsRoot === "string") {
      const target = path.resolve(path.dirname(assetsRoot), "..", row.original_path);
      if (!target.startsWith(path.resolve(assetsRoot) + path.sep)) throw new Error("Ruta de logo no permitida.");
      bytes = await readFile(target);
    } else {
      bytes = await assetsRoot.read(row.original_path, teacherId);
    }
    return await sharp(bytes, { limitInputPixels: 16_000_000 }).resize(384, 384,
      { fit: "contain", background: "#ffffff" }).png({ compressionLevel: 9 }).toBuffer();
  } catch {
    return null;
  }
}
