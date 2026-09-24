import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { EXPERIMENT_ROOT } from "../src/constants.mjs";

const output = path.join(EXPERIMENT_ROOT, "dist");
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(path.join(EXPERIMENT_ROOT, "public"), path.join(output, "public"), { recursive: true });
console.log("Build local creado en dist/. Iniciar src/local-server.mjs para servirlo con la API local.");
