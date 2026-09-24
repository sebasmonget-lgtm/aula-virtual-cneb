import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { saveWordToLocalDownloads } from "./local-word-save.mjs";

test("guarda el Word sin sobrescribir otra versión ni duplicar la misma", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "ayni-word-save-"));
  try {
    const first = { filename: "plan-anual-2026-12345678.docx", buffer: Buffer.from("PKprimero") };
    const saved = await saveWordToLocalDownloads(first, directory);
    assert.equal(saved.filename, first.filename);
    assert.equal((await saveWordToLocalDownloads(first, directory)).alreadyExists, true);
    const revised = await saveWordToLocalDownloads({ ...first, buffer: Buffer.from("PKrevision") }, directory);
    assert.equal(revised.filename, "plan-anual-2026-12345678-2.docx");
    assert.equal((await readFile(saved.path)).toString(), "PKprimero");
    assert.equal((await readFile(revised.path)).toString(), "PKrevision");
    await assert.rejects(saveWordToLocalDownloads({ filename: "../otro.docx", buffer: first.buffer }, directory));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
