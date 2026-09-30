"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { TeacherWorkspace } from "./teacher-workspace";

type AccessState = "checking" | "ready" | "login" | "unavailable";

export function AuthGate() {
  const [state, setState] = useState<AccessState>("checking");
  const [mode, setMode] = useState<"local" | "supabase">("local");
  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function check() {
      try {
        const config = await apiFetch(`${localDatabaseApiUrl}/api/auth/config`, { cache: "no-store" });
        if (!config.ok) throw new Error("Ayni no está disponible.");
        const value = await config.json() as { mode: "local" | "supabase" };
        if (!active) return;
        setMode(value.mode);
        if (value.mode === "local") { setState("ready"); return; }
        const session = await apiFetch(`${localDatabaseApiUrl}/api/auth/session`, { cache: "no-store" });
        if (active) setState(session.ok ? "ready" : session.status === 401 ? "login" : "unavailable");
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
    setBusy(true); setError("");
    try {
      const response = await apiFetch(`${localDatabaseApiUrl}/api/auth/login`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ dni: dni.trim(), password }),
      });
      if (!response.ok) throw new Error(response.status === 401 ? "Revisa tu DNI y contraseña." : "No se pudo iniciar sesión.");
      setPassword("");
      setState("ready");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo iniciar sesión."); }
    finally { setBusy(false); }
  }

  async function signOut() {
    await apiFetch(`${localDatabaseApiUrl}/api/auth/logout`, { method: "POST" }).catch(() => {});
    setState("login");
  }

  if (state === "ready") return <>
    {mode === "supabase" && <div className="flex justify-end border-b border-[#dce7ef] bg-white px-5 py-2">
      <button type="button" onClick={() => void signOut()} className="rounded-lg px-3 py-2 text-sm font-semibold text-[#0a7890] hover:bg-[#eaf6f9]">Cerrar sesión</button>
    </div>}
    <TeacherWorkspace />
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
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#087d96]">Acceso docente</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-[#172e49] sm:text-5xl">Bienvenida a Ayni</h1>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-[#526b87]">Ingresa con el DNI registrado por la administración y tu contraseña para continuar en tu aula.</p>
      </div>
      <form onSubmit={(event) => void signIn(event)} className="mt-6 rounded-3xl border border-[#d7e4ee] bg-white p-5 shadow-[0_12px_32px_rgba(24,50,76,0.05)] sm:p-7">
        <label htmlFor="ayni-login-dni" className="block text-sm font-bold text-[#19334d]">DNI</label>
        <input id="ayni-login-dni" type="text" inputMode="numeric" pattern="[0-9]{8}" maxLength={8} autoComplete="username" required value={dni} onChange={(event) => setDni(event.target.value.replace(/\D/g, ""))} className="mt-2 w-full rounded-2xl border border-[#bdd0dd] bg-white px-4 py-4 text-base outline-none transition focus:border-[#087d96] focus:ring-2 focus:ring-[#087d96]/15" />
        <label htmlFor="ayni-login-password" className="mt-5 block text-sm font-bold text-[#19334d]">Contraseña</label>
        <div className="mt-2 flex overflow-hidden rounded-2xl border border-[#bdd0dd] bg-white transition focus-within:border-[#087d96] focus-within:ring-2 focus-within:ring-[#087d96]/15">
          <input id="ayni-login-password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="min-w-0 flex-1 px-4 py-4 text-base outline-none" />
          <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={showPassword} className="grid w-14 place-items-center border-l border-[#d7e4ee] text-[#526b87] hover:bg-[#f5f8fc] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#087d96]">
            {showPassword ? <EyeOff size={21} aria-hidden="true" /> : <Eye size={21} aria-hidden="true" />}
          </button>
        </div>
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className="mt-7 w-full rounded-2xl bg-[#087d96] px-5 py-4 text-base font-bold text-white shadow-sm transition hover:bg-[#086d83] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087d96] disabled:opacity-60">{busy ? "Ingresando…" : "Ingresar a mi aula"}</button>
      </form>
      <p className="mt-6 text-center text-sm text-[#526b87]">¿Olvidaste tu contraseña? Solicita al administrador que la restablezca.</p>
      <p className="mt-2 text-center text-sm text-[#526b87]">Tu sesión se renueva al usar Ayni y vence tras 30 días sin actividad.</p>
    </div>
  </main>;
}
