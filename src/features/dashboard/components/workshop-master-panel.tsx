"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Item = { index: number; linked_activity_index: number; title: string; workshop_type: string;
  competency_id: string; purpose: string; rationale: string; observation_focus: string;
  materials: string[]; brief_outline: string; sheet_id: string | null; sheet_reason: string | null;
  day_decision?: "suggested" | "accepted" | "continued" | "changed" | "none";
  continuation_of_index?: number };
type Master = { id: string; status: "draft" | "active"; revision: number; details: { items: Item[] } };
type Sheet = { id: string; title: string; intention: string };
type Data = { master: Master | null; route: { index: number; title: string; date: string }[];
  competencies: { id: string; name: string }[] };
const endpoint = `${localDatabaseApiUrl}/api/workshops/master`;
const workshopTypes = ["gráfico-plástico", "psicomotricidad", "ciencia", "matemática", "lectura y escritura", "juego dramático", "música"];

function SheetPreview({ projectId, competencyId, sheet }: { projectId: string; competencyId: string; sheet: Sheet }) {
  const [source, setSource] = useState<string | null>(null);
  useEffect(() => {
    let active = true; let url: string | null = null;
    const params = new URLSearchParams({ projectId, competencyId, sheetId: sheet.id });
    void apiFetch(`${localDatabaseApiUrl}/api/workshops/sheets/preview?${params}`).then(async (response) => {
      if (!response.ok) return;
      const blob = await response.blob();
      if (active) { url = URL.createObjectURL(blob); setSource(url); }
    }).catch(() => {});
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [projectId, competencyId, sheet.id]);
  return source && <Image unoptimized className="mt-2 h-auto max-h-40 w-auto border" width={140} height={180}
    alt={`Vista previa de ${sheet.title}`} src={source} />;
}

export function WorkshopMasterPanel({ projectId, onConfirmed }: { projectId: string; onConfirmed?: () => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [choosing, setChoosing] = useState<number | null>(null);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function load() {
    const response = await apiFetch(`${endpoint}?projectId=${encodeURIComponent(projectId)}`);
    const result = await response.json() as Data & { error?: string };
    if (!response.ok) throw new Error(result.error ?? "No se pudieron cargar los talleres.");
    setData(result); setItems(result.master?.details.items ?? []);
  }
  useEffect(() => { let mounted = true;
    void apiFetch(`${endpoint}?projectId=${encodeURIComponent(projectId)}`).then(async (response) => {
      const result = await response.json() as Data & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "No se pudieron cargar los talleres.");
      if (mounted) { setData(result); setItems(result.master?.details.items ?? []); }
    }).catch((error: unknown) => { if (mounted) setMessage(error instanceof Error ? error.message : "No se pudieron cargar los talleres."); });
    return () => { mounted = false; };
  }, [projectId]);
  async function request(path: string, method: string, body: Record<string, unknown>) {
    setBusy(true); setMessage("");
    try {
      const response = await apiFetch(`${localDatabaseApiUrl}${path}`, { method,
        headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId, ...body }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "No se pudo guardar.");
      await load(); return true;
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo guardar."); return false; }
    finally { setBusy(false); }
  }
  function change(index: number, patch: Partial<Item>) {
    setItems((current) => current.map((item) => item.index === index
      ? { ...item, ...patch, day_decision: patch.day_decision ?? "changed",
        continuation_of_index: patch.day_decision === "continued" ? patch.continuation_of_index : undefined } : item));
  }
  function continuePrevious(item: Item) {
    const previous = items[item.index - 2];
    if (!previous || ["none", "suggested"].includes(previous.day_decision ?? "accepted")) return;
    change(item.index, { title: `Continuamos: ${previous.title}`, workshop_type: previous.workshop_type,
      competency_id: previous.competency_id, purpose: previous.purpose,
      rationale: `Continuar la experiencia iniciada el día ${previous.index}.`,
      observation_focus: previous.observation_focus, materials: previous.materials,
      brief_outline: previous.brief_outline, sheet_id: previous.sheet_id,
      sheet_reason: previous.sheet_reason, day_decision: "continued",
      continuation_of_index: previous.index });
  }
  async function chooseSheet(item: Item) {
    setChoosing(item.index); setMessage("");
    try {
      const response = await apiFetch(`${localDatabaseApiUrl}/api/workshops/sheets?projectId=${encodeURIComponent(projectId)}&competencyId=${encodeURIComponent(item.competency_id)}`);
      const result = await response.json() as { sheets?: Sheet[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? "No se pudieron cargar las fichas.");
      setSheets(result.sheets ?? []);
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudieron cargar las fichas."); }
  }
  const master = data?.master;
  const dirty = Boolean(master?.status === "draft" && JSON.stringify(items) !== JSON.stringify(master.details.items));
  const nameOf = (id: string) => data?.competencies.find((entry) => entry.id === id)?.name ?? id;
  return <section className="ayni-panel space-y-4 p-4 sm:p-5" aria-label="Talleres del proyecto">
    <header><h2 className="ayni-section-title">{master?.status === "active" ? "Talleres elegidos ✓" : "Talleres sugeridos · opcionales"}</h2>
      <p className="text-sm text-[#526b87]">Ayni propone una opción por día. Puedes aceptarla, continuar un taller, cambiarla o dejar ese día sin taller. La actividad principal se prepara por separado.</p></header>
    {message && <p role="status" className="rounded-lg bg-[#eaf7fb] p-3 text-sm">{message}</p>}
    {!master && <Button disabled={busy} onClick={() => void request("/api/workshops/master/generate", "POST", {}).then((ok) => { if (ok) setMessage("Talleres preparados. Revísalos antes de confirmar."); })}>{busy ? "Preparando..." : "Preparar talleres"}</Button>}
    {master?.status === "active" && <Button variant="outline" disabled={busy} onClick={() => void request("/api/workshops/master/generate", "POST", {}).then((ok) => { if (ok) setMessage("Nueva versión preparada. Los días ya confirmados conservan su versión anterior."); })}>Proponer una nueva versión</Button>}
    {items.map((item) => <article key={item.index} className="rounded-xl border bg-white p-4">
      <h3 className="font-bold">Día {item.index} · {item.title}</h3>
      <p className="mt-1 text-sm"><b>Competencia:</b> {nameOf(item.competency_id)}</p>
      <p className="mt-1 text-sm"><b>Propósito:</b> {item.purpose}</p>
      <p className="mt-1 text-sm"><b>¿Por qué?</b> {item.rationale}</p>
      <p className="mt-1 text-sm"><b>Ficha:</b> {item.sheet_id ? (sheets.find((sheet) => sheet.id === item.sheet_id)?.title ?? "Ficha seleccionada") : "Sin ficha"}</p>
      <p className="mt-1 text-sm"><b>Decisión:</b> {{ suggested: "Por decidir", accepted: "Aceptado", continued: "Continuación", changed: "Cambiado", none: "Sin taller" }[item.day_decision ?? "accepted"]}</p>
      {master?.status === "draft" && <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => change(item.index, { day_decision: "accepted" })}>Aceptar</Button>
        {item.index > 1 && <Button variant="outline" onClick={() => continuePrevious(item)}>Continuar anterior</Button>}
        <Button variant="outline" onClick={() => setEditing(editing === item.index ? null : item.index)}>Editar</Button>
        <Button variant="outline" onClick={() => change(item.index, { day_decision: "none" })}>Sin taller</Button>
        <Button variant="outline" onClick={() => void chooseSheet(item)}>Cambiar ficha</Button>
      </div>}
      {editing === item.index && master?.status === "draft" && <div className="mt-3 space-y-2 rounded-lg bg-[#f4f8fb] p-3">
        <label>Título<input value={item.title} onChange={(event) => change(item.index, { title: event.target.value })} /></label>
        <label>Tipo de taller<select value={item.workshop_type} onChange={(event) => change(item.index, { workshop_type: event.target.value })}>{workshopTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
        <label>Competencia<select value={item.competency_id} onChange={(event) => change(item.index, { competency_id: event.target.value, sheet_id: null, sheet_reason: null })}>{data?.competencies.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}</select></label>
        <label>Propósito<Textarea value={item.purpose} onChange={(event) => change(item.index, { purpose: event.target.value })} /></label>
        <label>Motivo<Textarea value={item.rationale} onChange={(event) => change(item.index, { rationale: event.target.value })} /></label>
        <label>Qué observar<Textarea value={item.observation_focus} onChange={(event) => change(item.index, { observation_focus: event.target.value })} /></label>
        <label>Recorrido breve<Textarea value={item.brief_outline} onChange={(event) => change(item.index, { brief_outline: event.target.value })} /></label>
        <label>Materiales<Textarea value={item.materials.join(", ")} onChange={(event) => change(item.index, { materials: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) })} /></label>
        <Button variant="outline" onClick={() => setEditing(null)}>Listo</Button>
      </div>}
      {choosing === item.index && master?.status === "draft" && <div className="mt-3 space-y-2 rounded-lg bg-[#f4f8fb] p-3">
        <p className="text-sm">Fichas para {nameOf(item.competency_id)} y la edad del aula</p>
        {sheets.map((sheet) => <div key={sheet.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white p-2 text-sm">
          <div><b>{sheet.title}</b><p>{sheet.intention}</p><SheetPreview projectId={projectId} competencyId={item.competency_id} sheet={sheet} /></div>
          <Button variant="outline" onClick={() => { change(item.index, { sheet_id: sheet.id, sheet_reason: `Permite registrar ${item.observation_focus.toLocaleLowerCase("es")}.` }); setChoosing(null); }}>Usar ficha</Button>
        </div>)}
        {!sheets.length && <p className="text-sm">No hay fichas compatibles disponibles.</p>}
        <Button variant="outline" onClick={() => { change(item.index, { sheet_id: null, sheet_reason: null }); setChoosing(null); }}>Usar sin ficha</Button>
      </div>}
    </article>)}
    {master?.status === "draft" && <div className="flex flex-wrap gap-2">
      <Button variant="outline" disabled={busy || !dirty} onClick={() => void request("/api/workshops/master", "PUT", { masterId: master.id, expectedRevision: master.revision, items }).then((ok) => { if (ok) setMessage("Cambios guardados."); })}>Guardar cambios</Button>
      <Button disabled={busy || dirty} onClick={() => void request("/api/workshops/master/confirm", "POST", { masterId: master.id, expectedRevision: master.revision }).then((ok) => { if (ok) { setMessage("Decisiones de talleres guardadas. Puedes cambiarlas con una nueva versión."); onConfirmed?.(); } })}>Guardar talleres elegidos</Button>
    </div>}
  </section>;
}
