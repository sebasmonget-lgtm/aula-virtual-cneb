import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { PGlite } from "@electric-sql/pglite";
import { loadInstitutionLogoForDocuments, normalizeInstitutionLogoUpload } from "./institution-logo.mjs";

test("el logo subido se valida, se reduce y se vuelve PNG sin metadatos", async () => {
  const jpg = await sharp({ create: { width: 600, height: 400, channels: 4,
    background: "#087d96" } }).jpeg().toBuffer();
  const normalized = await normalizeInstitutionLogoUpload({ mimeType: "image/jpeg", base64: jpg.toString("base64") });
  const metadata = await sharp(normalized).metadata();
  assert.equal(metadata.format, "png");
  assert.ok(metadata.width <= 384 && metadata.height <= 384);
  await assert.rejects(() => normalizeInstitutionLogoUpload({ mimeType: "image/png", base64: jpg.toString("base64") }),
    /no coincide/);
  await assert.rejects(() => normalizeInstitutionLogoUpload({ mimeType: "image/svg+xml", base64: jpg.toString("base64") }),
    /PNG, JPG o WebP/);
});

test("solo el logo de la institución de la docente se inserta en documentos", async () => {
  const db = new PGlite();
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "ayni-logo-"));
  const assetsRoot = path.join(projectRoot, ".local", "assets");
  try {
    await mkdir(assetsRoot, { recursive: true });
    await db.exec(`create table institution_profiles(owner_user_id text,logo_asset_id text);
      create table institution_assets(id text,owner_user_id text,type text,original_path text,mime_type text);`);
    const png = await sharp({ create: { width: 4, height: 4, channels: 4, background: "white" } }).png().toBuffer();
    await writeFile(path.join(assetsRoot, "logo.png"), png);
    await db.query(`insert into institution_profiles values('owner','logo'),('other',null)`);
    await db.query(`insert into institution_assets values('logo','owner','logo','.local/assets/logo.png','image/png')`);
    const loaded = await loadInstitutionLogoForDocuments(db, "owner", assetsRoot);
    assert.equal((await sharp(loaded).metadata()).format, "png");
    assert.equal(await loadInstitutionLogoForDocuments(db, "other", assetsRoot), null);
    assert.equal((await readFile(path.join(assetsRoot, "logo.png"))).length, png.length);
  } finally {
    await db.close();
    await rm(projectRoot, { recursive: true, force: true });
  }
});
