import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { loadLibraryResources, publicLibraryResource, saveLibraryResourceToDownloads } from "./library-resources.mjs";

test("la Biblioteca ofrece archivos reales por edad y guarda una sola copia en Descargas", async () => {
  const resources = await loadLibraryResources();
  assert.equal(resources.filter((item) => item.kind === "workshop").length, 6);
  assert(resources.some((item) => item.kind === "material"));
  assert(resources.every((item) => [3, 4, 5].includes(item.age)));
  assert(resources.every((item) => !("download" in publicLibraryResource(item))));

  const directory = await mkdtemp(path.join(os.tmpdir(), "ayni-library-test-"));
  try {
    const word = resources.find((item) => item.kind === "workshop");
    const first = await saveLibraryResourceToDownloads(word, directory);
    const second = await saveLibraryResourceToDownloads(word, directory);
    assert.equal(first.alreadyExists, false);
    assert.equal(second.alreadyExists, true);
    assert.equal(second.filename, first.filename);
    assert.equal((await readFile(path.join(directory, first.filename))).subarray(0, 2).toString(), "PK");

    const material = resources.find((item) => item.kind === "material");
    const image = await saveLibraryResourceToDownloads(material, directory);
    assert.equal(path.extname(image.filename), ".png");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
