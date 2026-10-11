"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { displayDate, setQADisplayClock } from "@/src/lib/display-date";
import { canLeaveWorkspace } from "@/src/lib/workspace-location";

type Clock = { date: string; time: string };

export function QAClockControl({ children }: { children: ReactNode }) {
  const [clock, setClock] = useState<Clock | null>(null);
  const [ready, setReady] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void apiFetch(`${localDatabaseApiUrl}/api/qa/clock`, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        if (controller.signal.aborted) return;
        if (response.status === 404) { setQADisplayClock(null); setReady(true); return; }
        if (!response.ok) throw new Error();
        const value = await response.json() as Clock;
        if (controller.signal.aborted) return;
        setQADisplayClock(value); setClock(value); setDate(value.date); setTime(value.time); setReady(true);
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

  if (!ready) return <div className="border-b border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-950" role={error ? "alert" : "status"}>
    {error || "Comprobando el reloj QA…"}
    {error && <button type="button" onClick={() => { setError(""); setRetry(value => value + 1); }} className="ml-3 min-h-11 rounded-lg px-3 underline focus-visible:outline-2 focus-visible:outline-offset-2">Reintentar</button>}
  </div>;

  return <>
    {clock && <aside aria-label="Reloj de pruebas QA" className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:px-5">
      <p role="status" className="font-semibold">QA · {displayDate(clock.date)} · {clock.time} · Lima</p>
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
        </form>
        <p>Solo esta cuenta QA en esta Preview. Los registros guardados conservan sus fechas.</p>
        {error && <p role="alert" className="mt-2">{error}</p>}
      </details>
    </aside>}
    {children}
  </>;
}
