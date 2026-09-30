import { dniLoginAlias } from "./dni-login.mjs";
import { supabaseServiceHeaders } from "../src/lib/supabase-service-headers.mjs";

async function adminRequest({ url, key, fetchImpl }, pathname, options = {}) {
  const endpoint = url ? new URL(url) : null;
  if (!endpoint || (endpoint.protocol !== "https:" && !(endpoint.protocol === "http:" && ["localhost", "127.0.0.1"].includes(endpoint.hostname))) || !key)
    throw new Error("Falta la configuración privada de Supabase Auth.");
  const response = await fetchImpl(new URL(pathname, `${url.replace(/\/$/, "")}/`), {
    ...options,
    headers: { ...supabaseServiceHeaders(key), "content-type": "application/json" },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Supabase Auth rechazó la operación (${response.status}).`);
  return response.json();
}

function accountInput({ dni, password, pepper, domain }) {
  const alias = dniLoginAlias(dni, pepper, domain);
  if (typeof password !== "string" || password.length < 12) throw new Error("La contraseña debe tener al menos 12 caracteres.");
  return alias;
}

export async function listAuthUsers(config) {
  const users = [];
  for (let page = 1; page <= 100; page++) {
    const result = await adminRequest(config, `/auth/v1/admin/users?page=${page}&per_page=1000`);
    const batch = Array.isArray(result.users) ? result.users : [];
    users.push(...batch);
    if (batch.length < 1000) return users;
  }
  throw new Error("El directorio supera el límite de consulta.");
}

export async function createTeacherAccount(config) {
  const alias = accountInput(config);
  const name = String(config.name ?? "").trim();
  if (name && (name.length < 2 || name.length > 100)) throw new Error("El nombre debe tener entre 2 y 100 caracteres.");
  const created = await adminRequest(config, "/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({ email: alias, password: config.password, email_confirm: true,
      app_metadata: { ayni_role: "teacher" }, ...(name ? { user_metadata: { display_name: name } } : {}) }),
  });
  return { id: created.id };
}

export async function createFirstAdmin(config) {
  const alias = accountInput(config);
  const name = String(config.name ?? "").trim();
  if (name.length < 2 || name.length > 100) throw new Error("El nombre debe tener entre 2 y 100 caracteres.");
  const users = await listAuthUsers(config);
  if (users.some((user) => user.app_metadata?.ayni_role === "admin")) throw new Error("Ya existe una cuenta administradora.");
  const created = await adminRequest(config, "/auth/v1/admin/users", {
    method: "POST", body: JSON.stringify({ email: alias, password: config.password, email_confirm: true,
      app_metadata: { ayni_role: "admin" }, user_metadata: { display_name: name } }),
  });
  return { id: created.id };
}

export async function recoverFirstAdmin(config) {
  const alias = accountInput(config);
  const admins = (await listAuthUsers(config)).filter((user) => user.app_metadata?.ayni_role === "admin");
  if (admins.length !== 1 || admins[0].last_sign_in_at) throw new Error("La recuperación inicial no está disponible.");
  await adminRequest(config, `/auth/v1/admin/users/${encodeURIComponent(admins[0].id)}`, {
    method: "PUT",
    body: JSON.stringify({ email: alias, email_confirm: true, password: config.password }),
  });
}

export async function resetPasswordByUserId(config, userId) {
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(userId)) throw new Error("Cuenta inválida.");
  if (typeof config.password !== "string" || config.password.length < 12) throw new Error("La contraseña debe tener al menos 12 caracteres.");
  const users = await listAuthUsers(config);
  if (!users.some((user) => user.id === userId && user.app_metadata?.ayni_role === "teacher")) throw new Error("Cuenta docente no disponible.");
  await adminRequest(config, `/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: "PUT", body: JSON.stringify({ password: config.password }),
  });
}

export async function resetTeacherPassword(config) {
  const alias = accountInput(config);
  let userId = null;
  for (let page = 1; page <= 100; page++) {
    const result = await adminRequest(config, `/auth/v1/admin/users?page=${page}&per_page=1000`);
    const users = Array.isArray(result.users) ? result.users : [];
    userId = users.find((user) => user.email === alias)?.id ?? null;
    if (userId || users.length < 1000) break;
  }
  if (!userId) throw new Error("No se encontró una cuenta para ese DNI.");
  await adminRequest(config, `/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: "PUT", body: JSON.stringify({ password: config.password }),
  });
}
