"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { TeacherWorkspace } from "./teacher-workspace";
import { AdminWorkspace } from "./admin-workspace";

type AccessState = "checking" | "ready" | "login" | "unavailable";
const rememberedDniKey = "ayni:remembered-dni";

function offerBrowserPasswordStorage(dni: string, password: string) {
  const credentialType = (window as Window & {
    PasswordCredential?: new (data: { id: string; password: string }) => Credential;
  }).PasswordCredential;
  if (!credentialType || !navigator.credentials?.store) return;
  try {
    void navigator.credentials.store(new credentialType({ id: dni, password })).catch(() => {
      // Some browsers do not support password storage or the user declines it.
    });
  } catch { /* Credential support never blocks an otherwise successful login. */ }
}

export function AuthGate() {
  const [state, setState] = useState<AccessState>("checking");
  const [mode, setMode] = useState<"local" | "supabase">("local");
  const [role, setRole] = useState<"teacher" | "admin">("teacher");
  const [setupAvailable, setSetupAvailable] = useState(false);
  const [recoveryAvailable, setRecoveryAvailable] = useState(false);
  const [settingUp, setSettingUp] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [setupKey, setSetupKey] = useState("");
  const [setupName, setSetupName] = useState("");
  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [rememberDni, setRememberDni] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    async function check() {
      try {
        const config = await apiFetch(`${localDatabaseApiUrl}/api/auth/config`, { cache: "no-store" });
        if (!config.ok) throw new Error("Ayni no está disponible.");
        const value = await config.json() as { mode: "local" | "supabase" };
        if (!active) return;
        if (value.mode === "supabase") {
          try {
            const savedDni = window.localStorage.getItem(rememberedDniKey);
            if (savedDni && /^\d{8}$/.test(savedDni)) {
              setDni(savedDni);
              setRememberDni(true);
            }
          } catch { /* Login still works if browser storage is unavailable. */ }
        }
        setMode(value.mode);
        if (value.mode === "local") { setState("ready"); return; }
        const session = await apiFetch(`${localDatabaseApiUrl}/api/auth/session`, { cache: "no-store" });
        if (active) {
          if (session.ok) setRole(((await session.json()) as { role: "teacher" | "admin" }).role);
          setState(session.ok ? "ready" : session.status === 401 ? "login" : "unavailable");
          if (!session.ok) void apiFetch(`${localDatabaseApiUrl}/api/admin/setup-status`)
            .then((response) => response.json() as Promise<{ available: boolean; recoverable?: boolean }>).then((result) => {
              if (active) { setSetupAvailable(result.available); setRecoveryAvailable(Boolean(result.recoverable)); }
            }).catch(() => {});
        }
      } catch { if (active) setState("unavailable"); }
    }
    void check();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (mode !== "supabase") return;
    const requireLogin = () => setState("login");
    window.addEventListener("ayni:auth-required", requireLogin);
    return () => window.removeEventListener("ayni:auth-required", requireLogin);
  }, [mode]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const loginDni = dni.trim();
      const response = await apiFetch(`${localDatabaseApiUrl}/api/auth/login`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ dni: loginDni, password }),
      });
      if (!response.ok) throw new Error(response.status === 401 ? "Revisa tu DNI y contraseña." : "No se pudo iniciar sesión.");
      try {
        if (rememberDni) window.localStorage.setItem(rememberedDniKey, loginDni);
        else window.localStorage.removeItem(rememberedDniKey);
      } catch { /* Storage is optional. */ }
      if (rememberPassword) offerBrowserPasswordStorage(loginDni, password);
      setRole(((await response.json()) as { role: "teacher" | "admin" }).role);
      setPassword("");
      setState("ready");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo iniciar sesión."); }
    finally { setBusy(false); }
  }

  async function signOut() {
    await apiFetch(`${localDatabaseApiUrl}/api/auth/logout`, { method: "POST" }).catch(() => {});
    setState("login");
  }

  async function setup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (password !== passwordConfirmation) throw new Error("Las contraseñas no coinciden.");
      const response = await apiFetch(`${localDatabaseApiUrl}/api/admin/setup`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ setupKey, name: setupName.trim(), dni, password }),
      });
      if (!response.ok) throw new Error("No se pudo crear el administrador. Revisa los datos y la clave de configuración.");
      setSetupKey(""); setPassword(""); setPasswordConfirmation(""); setSettingUp(false); setSetupAvailable(false);
      setError(""); setNotice("Administrador creado. Ingresa con el mismo DNI y la contraseña que acabas de elegir.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo crear el administrador."); }
    finally { setBusy(false); }
  }

  async function recoverAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      if (password !== passwordConfirmation) throw new Error("Las contraseñas no coinciden.");
      const response = await apiFetch(`${localDatabaseApiUrl}/api/admin/recover`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ setupKey, dni: dni.trim(), password }),
      });
      if (!response.ok) throw new Error("No se pudo restablecer el acceso. Revisa la clave de configuración y los datos.");
      setSetupKey(""); setPassword(""); setPasswordConfirmation(""); setRecovering(false);
      setNotice("Acceso restablecido. Ingresa con el DNI y la nueva contraseña que elegiste.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo restablecer el acceso."); }
    finally { setBusy(false); }
  }

  if (state === "ready") return <>
    {role === "admin" ? <AdminWorkspace onSignOut={() => void signOut()} /> : <>
    {mode === "supabase" && <div className="flex justify-end border-b border-[#dce7ef] bg-white px-5 py-2">
      <button type="button" onClick={() => void signOut()} className="rounded-lg px-3 py-2 text-sm font-semibold text-[#0a7890] hover:bg-[#eaf6f9]">Cerrar sesión</button>
    </div>}
    <TeacherWorkspace /></>}
  </>;
  if (state === "checking") return <main className="grid min-h-screen place-items-center text-[#19334d]">Comprobando tu sesión…</main>;
  if (state === "unavailable") return <main className="grid min-h-screen place-items-center p-6 text-center text-[#19334d]">
    <div><h1 className="text-2xl font-bold">No pudimos conectar con Ayni</h1><p className="mt-2">Revisa la conexión e inténtalo de nuevo.</p><button onClick={() => window.location.reload()} className="mt-5 rounded-xl bg-[#087d96] px-5 py-3 font-semibold text-white">Reintentar</button></div>
  </main>;
  return <main className="min-h-screen bg-[#f5f8fc] px-5 py-8 text-[#19334d] sm:px-8 sm:py-12">
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex items-center gap-3">
        <Image src="/favicon.svg" alt="" width={48} height={48} className="h-12 w-12 rounded-2xl shadow-sm" />
        <div><p className="text-lg font-extrabold leading-tight">Ayni Aula</p><p className="text-sm font-semibold text-[#58718b]">Tu espacio docente</p></div>
      </div>
      <div className="mt-12 sm:mt-14">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#087d96]">{settingUp || recovering ? "Configuración inicial" : "Acceso a Ayni"}</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-[#172e49] sm:text-5xl">{settingUp ? "Primer administrador" : recovering ? "Recuperar acceso" : "Bienvenida a Ayni"}</h1>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-[#526b87]">{recovering ? "Usa la clave privada de configuración para elegir un DNI y una contraseña nuevos para el administrador. Disponible solo antes de su primer ingreso." : settingUp ? "Usa la clave privada de configuración que guardaste en Vercel." : "Ingresa con tu DNI registrado y contraseña para continuar."}</p>
      </div>
      <form onSubmit={(event) => void (settingUp ? setup(event) : recovering ? recoverAdmin(event) : signIn(event))} className="mt-6 rounded-3xl border border-[#d7e4ee] bg-white p-5 shadow-[0_12px_32px_rgba(24,50,76,0.05)] sm:p-7">
        {(settingUp || recovering) && <><label htmlFor="ayni-setup-key" className="block text-sm font-bold">Clave de configuración</label><input id="ayni-setup-key" type="password" autoComplete="off" required minLength={32} value={setupKey} onChange={(event) => setSetupKey(event.target.value)} className="mt-2 mb-5 w-full rounded-2xl border border-[#bdd0dd] px-4 py-4" />{settingUp && <><label htmlFor="ayni-setup-name" className="block text-sm font-bold">Nombre del administrador</label><input id="ayni-setup-name" required minLength={2} maxLength={100} value={setupName} onChange={(event) => setSetupName(event.target.value)} className="mt-2 mb-5 w-full rounded-2xl border border-[#bdd0dd] px-4 py-4" /></>}</>}
        <label htmlFor="ayni-login-dni" className="block text-sm font-bold text-[#19334d]">{recovering ? "DNI con el que entrarás" : "DNI"}</label>
        <input id="ayni-login-dni" name="username" type="text" inputMode="numeric" pattern="[0-9]{8}" maxLength={8} autoComplete="username" required value={dni} onChange={(event) => setDni(event.target.value.replace(/\D/g, ""))} className="mt-2 w-full rounded-2xl border border-[#bdd0dd] bg-white px-4 py-4 text-base outline-none transition focus:border-[#087d96] focus:ring-2 focus:ring-[#087d96]/15" />
        <label htmlFor="ayni-login-password" className="mt-5 block text-sm font-bold text-[#19334d]">{recovering ? "Nueva contraseña" : "Contraseña"}</label>
        <div className="mt-2 flex overflow-hidden rounded-2xl border border-[#bdd0dd] bg-white transition focus-within:border-[#087d96] focus-within:ring-2 focus-within:ring-[#087d96]/15">
          <input id="ayni-login-password" name="password" type={showPassword ? "text" : "password"} autoComplete={settingUp || recovering ? "new-password" : "current-password"} minLength={settingUp || recovering ? 12 : undefined} required value={password} onChange={(event) => setPassword(event.target.value)} className="min-w-0 flex-1 px-4 py-4 text-base outline-none" />
          <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={showPassword} className="grid w-14 place-items-center border-l border-[#d7e4ee] text-[#526b87] hover:bg-[#f5f8fc] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#087d96]">
            {showPassword ? <EyeOff size={21} aria-hidden="true" /> : <Eye size={21} aria-hidden="true" />}
          </button>
        </div>
        {(settingUp || recovering) && <><label htmlFor="ayni-setup-confirm" className="mt-5 block text-sm font-bold text-[#19334d]">Repite la contraseña</label><input id="ayni-setup-confirm" type="password" autoComplete="new-password" required minLength={12} value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} className="mt-2 w-full rounded-2xl border border-[#bdd0dd] bg-white px-4 py-4" /></>}
        {!settingUp && !recovering && <div className="mt-5 flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold text-[#385771]">
          <label className="flex items-center gap-2"><input type="checkbox" checked={rememberDni} onChange={(event) => setRememberDni(event.target.checked)} className="h-4 w-4 accent-[#087d96]" />Recordar DNI</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={rememberPassword} onChange={(event) => setRememberPassword(event.target.checked)} className="h-4 w-4 accent-[#087d96]" />Recordar contraseña</label>
          <p className="w-full text-xs font-normal text-[#526b87]">Si marcas «Recordar contraseña», tu navegador podrá guardarla al ingresar. Ayni no guarda una copia.</p>
        </div>}
        {notice && <p role="status" className="mt-4 rounded-xl bg-[#eaf6f9] px-4 py-3 text-sm text-[#176076]">{notice}</p>}
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className="mt-7 w-full rounded-2xl bg-[#087d96] px-5 py-4 text-base font-bold text-white shadow-sm transition hover:bg-[#086d83] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087d96] disabled:opacity-60">{busy ? "Procesando…" : settingUp ? "Crear administrador" : recovering ? "Restablecer acceso" : "Ingresar"}</button>
      </form>
      {setupAvailable && <button type="button" onClick={() => { setSettingUp((value) => !value); setError(""); setPassword(""); }} className="mt-5 text-sm font-semibold text-[#087d96] underline">{settingUp ? "Volver al inicio de sesión" : "Configurar primer administrador"}</button>}
      {recoveryAvailable && <button type="button" onClick={() => { setRecovering((value) => !value); setError(""); setNotice(""); setPassword(""); setPasswordConfirmation(""); }} className="mt-5 text-sm font-semibold text-[#087d96] underline">{recovering ? "Volver al inicio de sesión" : "Recuperar acceso del administrador"}</button>}
      <p className="mt-6 text-center text-sm text-[#526b87]">¿Olvidaste tu contraseña? Solicita al administrador que la restablezca.</p>
      <p className="mt-2 text-center text-sm text-[#526b87]">Tu sesión se renueva al usar Ayni y vence tras 30 días sin actividad.</p>
    </div>
  </main>;
}
