import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const EXPERIMENT_ROOT = path.resolve(here, "..");
export const REPOSITORY_ROOT = path.resolve(EXPERIMENT_ROOT, "..", "..");
export const KB_ROOT = path.join(REPOSITORY_ROOT, "knowledge", "cneb-initial-3-5", "v4.0.0");
export const NO_CLASSIFIABLE_ID = "NO_CLASIFICABLE";
export const CONTEXTS = new Set(["juego_libre", "recreo", "lonchera", "asamblea", "rutina", "exploracion", "actividad", "otro"]);
export const SPECIAL_COMPETENCIES = { CAST_L2_ORAL: "castellano_as_second_language", PS_RELIGION: "religion_applicable" };
