"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { displayDate, setQADisplayClock } from "@/src/lib/display-date";
import { canLeaveWorkspace } from "@/src/lib/workspace-location";
import { QASetupPerformance } from "./qa-setup-performance";

type Clock = { date: string; time: string; active?: boolean };

export function QAClockControl({ children }: { children: ReactNode }) {
  const [clock, setClock] = useState<Clock | null>(null);
  const [ready, setReady] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (!clock) return;
    function toggleClock(event: KeyboardEvent) {
      if (event.code !== "KeyL" || !event.ctrlKey || !event.altKey || event.metaKey || event.shiftKey
        || event.repeat || event.isComposing || event.getModifierState("AltGraph")) return;
      event.preventDefault();
      setHidden(value => !value);
    }
    window.addEventListener("keydown", toggleClock);
    return () => window.removeEventListener("keydown", toggleClock);
  }, [clock]);

  useEffect(() => {
    const controller = new AbortController();
    void apiFetch(`${localDatabaseApiUrl}/api/qa/clock`, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        if (controller.signal.aborted) return;
        if (response.status === 404) { setQADisplayClock(null); setReady(true); return; }
        if (!response.ok) throw new Error();
        const value = await response.json() as Clock;
        if (controller.signal.aborted) return;
        setQADisplayClock(value.active === false ? null : value); setClock(value); setDate(value.date); setTime(value.time); setReady(true);
      })
      .catch(() => { if (!controller.signal.aborted) setError("No pudimos comprobar el reloj QA. Reintenta antes de continuar."); });
    return () => { controller.abort(); setQADisplayClock(null); };
  }, [retry]);

  async function apply(event: FormEvent) {
    event.preventDefault();
    if (busy || !canLeaveWorkspace()) return;
    setBusy(true); setError("");
    try {
      const response = await apiFetch(`${localDatabaseApiUrl}/api/qa/clock`, {
        method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ date, time }),
      });
      if (!response.ok) throw new Error();
      // Reload only after the server confirms the cookie; no pedagogical records are created.
      window.location.reload();
    } catch { setError("No pudimos confirmar el cambio. Recarga para comprobar la fecha activa."); setBusy(false); }
  }

  async function resetClock() {
    if (busy || !canLeaveWorkspace()) return;
    setBusy(true); setError("");
    try {
      const response = await apiFetch(`${localDatabaseApiUrl}/api/qa/clock`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      window.location.reload();
    } catch { setError("No pudimos restablecer el reloj. Reintenta."); setBusy(false); }
  }

  if (!ready && !error) return <>{children}</>;

  if (!ready) return <div className="border-b border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-950" role={error ? "alert" : "status"}>
    {error || "Comprobando el reloj QA…"}
    {error && <button type="button" onClick={() => { setError(""); setRetry(value => value + 1); }} className="ml-3 min-h-11 rounded-lg px-3 underline focus-visible:outline-2 focus-visible:outline-offset-2">Reintentar</button>}
  </div>;

  return <>
    {clock && !hidden && <aside aria-label="Reloj de pruebas QA" aria-keyshortcuts="Control+Alt+L" className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4">
        <p role="status" className="font-semibold">QA · {clock.active === false ? "Fecha real · " : "Fecha simulada · "}{displayDate(clock.date)} · {clock.time} · Lima</p>
        <button type="button" onClick={() => setHidden(true)} title="Volver a mostrar: Ctrl + Alt + L" className="min-h-11 rounded-lg px-3 text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2">Ocultar · Ctrl + Alt + L</button>
      </div>
      <details className="mt-1">
        <summary className="min-h-11 cursor-pointer py-3 font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2">Cambiar fecha y hora de pruebas</summary>
        <form onSubmit={apply} className="flex flex-wrap items-end gap-3 py-2">
          <label htmlFor="qa-clock-date" className="grid gap-1">Fecha
            <input id="qa-clock-date" type="date" min="2026-01-01" max="2026-12-31" required disabled={busy} value={date} onChange={event => setDate(event.target.value)} className="min-h-11 min-w-0 rounded-lg border border-amber-700 bg-white px-3 text-base outline-offset-2" />
          </label>
          <label htmlFor="qa-clock-time" className="grid gap-1">Hora de Lima
            <input id="qa-clock-time" type="time" required disabled={busy} value={time} onChange={event => setTime(event.target.value)} className="min-h-11 rounded-lg border border-amber-700 bg-white px-3 text-base outline-offset-2" />
          </label>
          <button type="submit" disabled={busy || (date === clock.date && time === clock.time)} className="min-h-11 rounded-lg bg-amber-950 px-4 font-semibold text-white hover:bg-amber-900 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50">{busy ? "Aplicando…" : "Aplicar reloj QA"}</button>
          <button type="button" disabled={busy || clock.active === false} onClick={() => void resetClock()} className="min-h-11 rounded-lg border border-amber-700 bg-white px-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50">Restablecer reloj</button>
        </form>
        <p>Solo esta cuenta de pruebas. Ocultar el panel conserva la fecha aplicada. Restablecer vuelve a la fecha real en producción. Los registros guardados conservan sus fechas.</p>
        {error && <p role="alert" className="mt-2">{error}</p>}
      </details>
      {process.env.NEXT_PUBLIC_AYNI_QA_SETUP_BENCHMARK === "1" && <QASetupPerformance />}
    </aside>}
    {children}
  </>;
}
