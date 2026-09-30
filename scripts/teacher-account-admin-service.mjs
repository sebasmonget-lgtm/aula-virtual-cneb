import { dniLoginAlias } from "./dni-login.mjs";

async function adminRequest({ url, key, fetchImpl }, pathname, options = {}) {
  if (!url || new URL(url).protocol !== "https:" || !key) throw new Error("Falta la configuración privada de Supabase Auth.");
  const response = await fetchImpl(new URL(pathname, `${url.replace(/\/$/, "")}/`), {
    ...options,
    headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" },
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

export async function createTeacherAccount(config) {
  const alias = accountInput(config);
  await adminRequest(config, "/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({ email: alias, password: config.password, email_confirm: true, app_metadata: { ayni_role: "teacher" } }),
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
