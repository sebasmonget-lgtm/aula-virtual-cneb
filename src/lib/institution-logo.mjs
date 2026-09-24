import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const allowedUploads = new Map([["image/png", "png"], ["image/jpeg", "jpeg"], ["image/webp", "webp"]]);

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
  const target = path.resolve(path.dirname(assetsRoot), "..", row.original_path);
  if (!target.startsWith(path.resolve(assetsRoot) + path.sep)) throw new Error("Ruta de logo no permitida.");
  try {
    const bytes = await readFile(target);
    return await sharp(bytes, { limitInputPixels: 16_000_000 }).resize(384, 384,
      { fit: "contain", background: "#ffffff" }).png({ compressionLevel: 9 }).toBuffer();
  } catch {
    return null;
  }
}
