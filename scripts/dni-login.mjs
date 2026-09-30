import { createHmac } from "node:crypto";

export function dniLoginAlias(dni, pepper, domain) {
  if (typeof dni !== "string" || !/^\d{8}$/.test(dni)) throw new TypeError("DNI inválido.");
  if (typeof pepper !== "string" || pepper.length < 32) throw new Error("Falta una clave privada de DNI de al menos 32 caracteres.");
  if (typeof domain !== "string" || !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(domain) || !domain.includes(".")) {
    throw new Error("Configura un dominio técnico de acceso válido.");
  }
  const digest = createHmac("sha256", pepper).update(`ayni-dni-login-v1:${dni}`).digest("hex");
  return `u${digest}@${domain}`;
}
