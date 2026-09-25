"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { TeacherWorkspace } from "./teacher-workspace";

type AccessState = "checking" | "ready" | "login" | "unavailable";

export function AuthGate() {
  const [state, setState] = useState<AccessState>("checking");
  const [mode, setMode] = useState<"local" | "supabase">("local");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!response.ok) throw new Error(response.status === 401 ? "Revisa tu correo y contraseña." : "No se pudo iniciar sesión.");
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
  return <main className="grid min-h-screen place-items-center bg-[#f5f9fd] p-5">
    <form onSubmit={(event) => void signIn(event)} className="w-full max-w-md rounded-3xl border border-[#dbe7ef] bg-white p-7 shadow-sm">
      <p className="text-sm font-semibold text-[#087d96]">Ayni Aula</p>
      <h1 className="mt-2 text-2xl font-bold text-[#19334d]">Ingresar</h1>
      <p className="mt-2 text-[#526b87]">Usa tu correo y contraseña para abrir tu aula.</p>
      <label className="mt-6 block text-sm font-semibold text-[#19334d]">Correo
        <input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-[#bfd4e0] px-4 py-3 text-base" />
      </label>
      <label className="mt-4 block text-sm font-semibold text-[#19334d]">Contraseña
        <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-[#bfd4e0] px-4 py-3 text-base" />
      </label>
      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={busy} className="mt-6 w-full rounded-xl bg-[#087d96] px-5 py-3 font-semibold text-white disabled:opacity-60">{busy ? "Ingresando…" : "Ingresar"}</button>
    </form>
  </main>;
}
