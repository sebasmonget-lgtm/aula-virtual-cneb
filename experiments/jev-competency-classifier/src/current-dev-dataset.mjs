import { readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { normalizeBenchmarkCase } from "./luna-benchmark-dataset.mjs";
import { assertNoBenchmarkLabels } from "./luna-inference-boundary.mjs";
import { devPrivacy } from "./current-dev-privacy.mjs";

export const FROZEN_TEST_SHA256 = "c8dcf899eaa4a7d15d6bee414a56e3f575f39bb81e38663766c83a52e4c483ef";
export async function loadCurrentDevDataset(filename, { knowledgeBase, config, adjudicationFile } = {}) {
  if (/ayni_jev_gold_v1/iu.test(path.basename(filename))) throw new Error("Test final congelado: acceso prohibido en CURRENT DEV.");
  const contents = await readFile(filename, "utf8");
  const fingerprint = createHash("sha256").update(contents).digest("hex");
  if (fingerprint === FROZEN_TEST_SHA256) throw new Error("Test final congelado: copia reconocida por SHA-256; no se parseó el gold.");
  const records = contents.split(/\r?\n/u).filter((line) => line.trim()).map((line) => JSON.parse(line));
  if (!records.length) throw new Error("Dev set vacío.");
  let manifest = null;
  if (adjudicationFile) manifest = JSON.parse(await readFile(adjudicationFile, "utf8"));
  const approved = Boolean(manifest?.status === "adjudicated" && manifest?.gold_source === "human" &&
    typeof manifest.reviewed_by === "string" && manifest.reviewed_by.trim() &&
    Number.isFinite(Date.parse(manifest.reviewed_at)) && manifest.dataset_sha256 === fingerprint && manifest.case_count === records.length);
  const cases = records.map((record, index) => {
    if (typeof record.id !== "string" || !/^[A-Za-z0-9_-]{1,100}$/u.test(record.id) ||
      typeof record.observation !== "string" || !record.observation.trim() || record.observation.length > 2000 ||
      !["spontaneous", "guided"].includes(record.type) || (record.age != null && ![3, 4, 5].includes(record.age)) ||
      (record.context != null && (typeof record.context !== "string" || record.context.length > 500)) ||
      (record.known_names != null && (!Array.isArray(record.known_names) || !record.known_names.every((name) => typeof name === "string"))) ||
      (record.coverage_tags != null && (!Array.isArray(record.coverage_tags) || !record.coverage_tags.every((tag) => typeof tag === "string")))) throw new Error(`Entrada DEV inválida ${index + 1}.`);
    if (approved) {
      if (record.adjudication?.status !== "adjudicated" || typeof record.adjudication.reviewed_by !== "string" || !record.adjudication.reviewed_by.trim() ||
        !record.expected || typeof record.expected.should_abstain !== "boolean" || typeof record.expected.should_privacy_block !== "boolean")
        throw new Error(`${record.id}: falta adjudicación humana explícita.`);
      return { ...normalizeBenchmarkCase(record, index, { knowledgeBase, config }), coverage_tags: record.coverage_tags ?? [] };
    }
    return { id: record.id, age: record.age ?? null, type: record.type, context: record.context ?? null,
      raw_observation: record.observation, applicability: record.applicability ?? {
        castellano_as_second_language: false, religion_applicable: false }, known_names: record.known_names ?? [],
      expected: null, coverage_tags: record.coverage_tags ?? [] };
  });
  if (new Set(cases.map((item) => item.id)).size !== cases.length) throw new Error("IDs DEV duplicados.");
  return { filename, fingerprint, cases, adjudicated: approved, manifest,
    review_status: approved ? "human_adjudicated" : "pending_human_adjudication" };
}

export function devInferenceInput(item) {
  const text = devPrivacy(item.raw_observation, item.known_names);
  const context = item.context ? devPrivacy(item.context, item.known_names) : null;
  return assertNoBenchmarkLabels({ age: item.age ?? null, type: item.type,
    context: context?.text ?? null, observation: text.text,
    applicability: { castellano_as_second_language: item.applicability?.castellano_as_second_language === true,
      religion_applicable: item.applicability?.religion_applicable === true },
    privacy_blocked: text.blocked || Boolean(context?.blocked), privacy_reason: text.reason ?? context?.reason ?? null });
}
