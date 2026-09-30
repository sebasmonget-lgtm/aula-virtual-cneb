"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";

type Account = { id: string; name: string; role: "admin" | "teacher"; createdAt: string | null;
  lastSignInAt: string | null; ai: { calls: number; unpricedCalls: number; estimatedCalls: number;
    costUsd: number; monthCalls: number; monthCostUsd: number } };
type Directory = { month: string; pricingVersion: string; accounts: Account[]; totalCostUsd: number; monthCostUsd: number };
const money = (value: number) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "USD", maximumFractionDigits: 4 }).format(value);
const date = (value: string | null) => value ? new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(new Date(value)) : "Sin ingreso";
const inputClass = "mt-2 w-full rounded-xl border border-[#bdd0dd] bg-white px-4 py-3 text-[#19334d] outline-none focus:border-[#087d96] focus:ring-2 focus:ring-[#087d96]/15";

export function AdminWorkspace({ onSignOut }: { onSignOut: () => void }) {
  const [directory, setDirectory] = useState<Directory | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [resetId, setResetId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");

  const reload = useCallback(async () => {
    const response = await apiFetch(`${localDatabaseApiUrl}/api/admin/accounts`, { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo cargar el directorio.");
    setDirectory(await response.json() as Directory);
  }, []);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await apiFetch(`${localDatabaseApiUrl}/api/admin/accounts`, { cache: "no-store" });
        if (!response.ok) throw new Error("No se pudo cargar el directorio.");
        const value = await response.json() as Directory;
        if (active) setDirectory(value);
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : "No se pudo cargar el directorio."); }
    }
    void load();
    return () => { active = false; };
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      if (password !== passwordConfirmation) throw new Error("Las contraseñas no coinciden.");
      const response = await apiFetch(`${localDatabaseApiUrl}/api/admin/accounts`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), dni, password }),
      });
      if (!response.ok) throw new Error("No se pudo crear la cuenta. Verifica el DNI, el nombre y si ya existe.");
      setName(""); setDni(""); setPassword(""); setPasswordConfirmation("");
      await reload(); setNotice("Cuenta docente creada. Entrega la contraseña por un canal privado.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo crear la cuenta."); }
    finally { setBusy(false); }
  }

  async function reset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetId) return;
    setBusy(true); setError(""); setNotice("");
    try {
      if (newPassword !== newPasswordConfirmation) throw new Error("Las contraseñas no coinciden.");
      const response = await apiFetch(`${localDatabaseApiUrl}/api/admin/accounts/${resetId}/password`, {
        method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: newPassword }),
      });
      if (!response.ok) throw new Error("No se pudo cambiar la contraseña.");
      setNewPassword(""); setNewPasswordConfirmation(""); setResetId(null); setNotice("Contraseña restablecida. Comunícala directamente a la docente.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cambiar la contraseña."); }
    finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-[#f5f8fc] px-4 py-6 text-[#19334d] sm:px-8 sm:py-10">
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#087d96]">Ayni Aula</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Administración</h1>
          <p className="mt-2 text-[#526b87]">Cuentas docentes y consumo de IA registrado por Ayni.</p></div>
        <button type="button" onClick={onSignOut} className="rounded-xl border border-[#bdd0dd] bg-white px-4 py-3 font-semibold">Cerrar sesión</button>
      </header>
      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
      {notice && <p role="status" className="mt-5 rounded-xl bg-[#e5f5ee] p-4 text-[#17634b]">{notice}</p>}
      <section aria-label="Resumen de consumo" className="mt-7 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#d7e4ee] bg-white p-5"><p className="text-sm text-[#526b87]">Cuentas docentes</p><p className="mt-2 text-3xl font-bold">{directory?.accounts.filter((item) => item.role === "teacher").length ?? "—"}</p></div>
        <div className="rounded-2xl border border-[#d7e4ee] bg-white p-5"><p className="text-sm text-[#526b87]">IA este mes · {directory?.month ?? ""}</p><p className="mt-2 text-3xl font-bold">{directory ? money(directory.monthCostUsd) : "—"}</p></div>
        <div className="rounded-2xl border border-[#d7e4ee] bg-white p-5"><p className="text-sm text-[#526b87]">IA acumulada registrada</p><p className="mt-2 text-3xl font-bold">{directory ? money(directory.totalCostUsd) : "—"}</p></div>
      </section>
      <p className="mt-3 text-sm text-[#526b87]">Importes en USD: incluyen costos informados por el proveedor y estimaciones. No incluyen uso anterior al registro ni infraestructura. Una llamada sin precio puede dejar el total incompleto.</p>
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-2xl border border-[#d7e4ee] bg-white">
          <div className="border-b border-[#d7e4ee] p-5"><h2 className="text-xl font-bold">Usuarios</h2><p className="mt-1 text-sm text-[#526b87]">Las contraseñas actuales no se pueden consultar. Puedes restablecer las de las docentes.</p></div>
          {!directory ? <p className="p-5">Cargando cuentas…</p> : directory.accounts.length === 0 ? <p className="p-5">Aún no hay cuentas.</p> :
            <div className="divide-y divide-[#e6edf3]">{directory.accounts.map((account) => <article key={account.id} className="p-5">
              <div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-bold">{account.name}</h3><p className="text-sm text-[#526b87]">{account.role === "admin" ? "Administrador" : "Docente"} · Cuenta {account.id.slice(0, 8)} · Alta {date(account.createdAt)} · Último ingreso {date(account.lastSignInAt)}</p></div>
                {account.role === "teacher" && <button type="button" onClick={() => { setResetId(account.id); setNewPassword(""); setNewPasswordConfirmation(""); setError(""); }} className="rounded-xl border border-[#bdd0dd] px-3 py-2 text-sm font-semibold text-[#087d96]">Restablecer contraseña</button>}</div>
              {account.role === "teacher" && <p className="mt-3 text-sm">IA: <strong>{money(account.ai.monthCostUsd)}</strong> este mes · <strong>{money(account.ai.costUsd)}</strong> acumulado · {account.ai.calls} llamadas{account.ai.unpricedCalls ? ` · ${account.ai.unpricedCalls} sin precio` : ""}{account.ai.estimatedCalls ? ` · ${account.ai.estimatedCalls} estimadas` : ""}</p>}
            </article>)}</div>}
        </section>
        <aside className="self-start rounded-2xl border border-[#d7e4ee] bg-white p-5"><h2 className="text-xl font-bold">Nueva docente</h2><p className="mt-1 text-sm text-[#526b87]">La profesora ingresará con su DNI y la contraseña que le entregues.</p>
          <form onSubmit={(event) => void create(event)} className="mt-5 space-y-4">
            <label className="block text-sm font-semibold">Nombre<input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={100} required autoComplete="off" /></label>
            <label className="block text-sm font-semibold">DNI<input className={inputClass} value={dni} onChange={(event) => setDni(event.target.value.replace(/\D/g, ""))} inputMode="numeric" pattern="[0-9]{8}" maxLength={8} required autoComplete="off" /></label>
            <label className="block text-sm font-semibold">Contraseña inicial<input className={inputClass} type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} required autoComplete="new-password" /></label>
            <label className="block text-sm font-semibold">Repite la contraseña<input className={inputClass} type="password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} minLength={12} required autoComplete="new-password" /></label>
            <button disabled={busy} className="w-full rounded-xl bg-[#087d96] px-4 py-3 font-bold text-white disabled:opacity-60">Crear cuenta</button>
          </form>
        </aside>
      </div>
      {resetId && <div className="fixed inset-0 z-50 grid place-items-center bg-[#10243b]/60 p-4"><section role="dialog" aria-modal="true" aria-labelledby="reset-heading" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 id="reset-heading" className="text-xl font-bold">Restablecer contraseña</h2><p className="mt-2 text-sm text-[#526b87]">Verifica la identidad de la docente antes de entregarle la nueva contraseña. Ayni no mostrará la contraseña anterior.</p>
        <form onSubmit={(event) => void reset(event)} className="mt-5"><label className="text-sm font-semibold">Nueva contraseña<input className={inputClass} type="password" minLength={12} required autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
          <label className="mt-4 block text-sm font-semibold">Repite la contraseña<input className={inputClass} type="password" minLength={12} required autoComplete="new-password" value={newPasswordConfirmation} onChange={(event) => setNewPasswordConfirmation(event.target.value)} /></label>
          <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => { setResetId(null); setNewPassword(""); setNewPasswordConfirmation(""); }} className="rounded-xl border border-[#bdd0dd] px-4 py-3 font-semibold">Cancelar</button><button disabled={busy} className="rounded-xl bg-[#087d96] px-4 py-3 font-bold text-white disabled:opacity-60">Guardar nueva contraseña</button></div>
        </form>
      </section></div>}
    </div>
  </main>;
}
