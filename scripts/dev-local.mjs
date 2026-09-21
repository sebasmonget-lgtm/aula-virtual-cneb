import { spawn } from "node:child_process";

const database = spawn(process.execPath, ["scripts/local-db-server.mjs"], { stdio: "inherit" });
const web = spawn(process.execPath, ["scripts/run-framework.mjs", "dev", "--host", "127.0.0.1"], { stdio: "inherit" });
const children = [database, web];

function stop(exitCode = 0) {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  process.exit(exitCode);
}

for (const child of children) {
  child.on("exit", (code) => {
    if (code && code !== 0) stop(code);
  });
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
