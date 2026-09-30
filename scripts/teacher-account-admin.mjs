import { stdin, stdout } from "node:process";
import { createTeacherAccount, resetTeacherPassword } from "./teacher-account-admin-service.mjs";

const operation = process.argv[2];
if (!["create", "reset"].includes(operation) || process.argv.length !== 3) {
  throw new Error("Uso: node scripts/teacher-account-admin.mjs create|reset");
}
if (!stdin.isTTY || !stdin.setRawMode) throw new Error("Ejecuta esta herramienta en una terminal interactiva privada.");

const base = process.env.AYNI_SUPABASE_URL;
const key = process.env.AYNI_SUPABASE_SERVICE_ROLE_KEY;
if (!base || new URL(base).protocol !== "https:" || !key) throw new Error("Configura AYNI_SUPABASE_URL y AYNI_SUPABASE_SERVICE_ROLE_KEY en el servidor administrador.");

async function hiddenQuestion(label) {
  stdout.write(label);
  return new Promise((resolve, reject) => {
    let value = "";
    function finish(error) {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
      if (error) reject(error); else resolve(value);
    }
    function onData(chunk) {
      for (const character of String(chunk)) {
        if (character === "\r" || character === "\n") { finish(); return; }
        if (character === "\u0003") { finish(new Error("Operación cancelada.")); return; }
        if (character === "\b" || character === "\u007f") { value = value.slice(0, -1); continue; }
        if (character >= " " && character !== "\u007f") value += character;
      }
    }
    stdin.setRawMode(true);
    stdin.on("data", onData);
    stdin.resume();
  });
}

const dni = await hiddenQuestion("DNI de la docente: ");
const password = await hiddenQuestion(operation === "create" ? "Contraseña inicial (12+ caracteres): " : "Contraseña nueva (12+ caracteres): ");
if (password.length < 12) throw new Error("La contraseña debe tener al menos 12 caracteres.");
const confirmation = await hiddenQuestion("Repite la contraseña: ");
if (password !== confirmation) throw new Error("Las contraseñas no coinciden.");

const config = { dni, password, pepper: process.env.AYNI_DNI_LOGIN_PEPPER, domain: process.env.AYNI_DNI_ALIAS_DOMAIN,
  url: base, key, fetchImpl: fetch };
if (operation === "create") {
  await createTeacherAccount(config);
  stdout.write("Cuenta docente creada. Entrega la contraseña por un canal privado.\n");
} else {
  await resetTeacherPassword(config);
  stdout.write("Contraseña restablecida. Entrega la nueva por un canal privado.\n");
}
