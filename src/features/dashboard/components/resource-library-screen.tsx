"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Download, Search, Shapes, Sparkles } from "lucide-react";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import type { LibraryResource } from "@/src/lib/library-resource";
import { DocumentsScreen } from "./documents-screen";
import { EmptyState, LoadingState, WorkflowFeedback } from "./workflow-ui";
import { useWorkspaceSubview } from "@/src/lib/workspace-location";

type Filter = "for-you" | "worksheets" | "workshops" | "materials";
const libraryViews = ["resources", "documents"] as const;
const libraryFilters = ["for-you", "worksheets", "workshops", "materials"] as const;
const filters: { id: Filter; label: string }[] = [
  { id: "for-you", label: "Para ti" }, { id: "worksheets", label: "Fichas" },
  { id: "workshops", label: "Talleres" }, { id: "materials", label: "Materiales" },
];

export function ResourceLibraryScreen({ age, initialFilter = "for-you", onUse }: { age: number; initialFilter?: "for-you" | "workshops"; onUse: (resource: LibraryResource) => void }) {
  const [view, setView] = useWorkspaceSubview("Biblioteca", "view", libraryViews, initialFilter === "workshops" ? "resources" : "documents");
  const [filter, setFilter] = useWorkspaceSubview("Biblioteca", "filter", libraryFilters, initialFilter);
  const [query, setQuery] = useState("");
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [authMode, setAuthMode] = useState<"local" | "supabase">("local");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadMessage, setDownloadMessage] = useState("");
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void apiFetch(`${localDatabaseApiUrl}/api/auth/config`, { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<{ mode: "local" | "supabase" }> : null)
      .then((config) => { if (!controller.signal.aborted && config?.mode) setAuthMode(config.mode); })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    apiFetch(`${localDatabaseApiUrl}/api/library/resources`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("No pudimos cargar los recursos.");
        return response.json() as Promise<{ resources: LibraryResource[] }>;
      })
      .then((result) => { setResources(result.resources); setError(""); })
      .catch(() => { if (!controller.signal.aborted) setError("No pudimos cargar los recursos. Vuelve a intentarlo."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);

  const visible = useMemo(() => resources.filter((resource) => {
    if (resource.age !== age) return false;
    if (filter === "worksheets") return false;
    if (filter === "workshops" && resource.kind !== "workshop") return false;
    if (filter === "materials" && resource.kind !== "material") return false;
    const term = query.trim().toLocaleLowerCase("es-PE");
    return !term || [resource.title, resource.area, resource.purpose].some((value) => value.toLocaleLowerCase("es-PE").includes(term));
  }), [resources, filter, age, query]);

  async function download(resource: LibraryResource) {
    if (downloadingId) return;
    setDownloadingId(resource.id); setDownloadMessage(""); setDownloadError("");
    try {
      if (authMode === "local") {
        const response = await apiFetch(`${localDatabaseApiUrl}/api/library/resources/${resource.id}/save-local`, { method: "POST" });
        const result = await response.json() as { filename?: string; alreadyExists?: boolean; error?: string };
        if (!response.ok || !result.filename) throw new Error(result.error || "No se pudo guardar el recurso.");
        setDownloadMessage(`${result.alreadyExists ? "Ya estaba guardado" : "Guardado"} en Descargas: ${result.filename}`);
      } else {
        const response = await apiFetch(`${localDatabaseApiUrl}/api/library/resources/${resource.id}/download`);
        if (!response.ok) throw new Error("No se pudo descargar el recurso.");
        const filename = response.headers.get("content-disposition")?.match(/filename="([^"\\/]+)"/)?.[1]
          ?? `recurso-${resource.id}`;
        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement("a");
        link.href = url; link.download = filename;
        document.body.appendChild(link); link.click(); link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 60000);
        setDownloadMessage(`Recurso descargado: ${filename}`);
      }
    } catch (error) { setDownloadError(error instanceof Error ? error.message : "No se pudo descargar el recurso."); }
    finally { setDownloadingId(null); }
  }

  return <section className="mx-auto max-w-5xl space-y-5">
    <div className="flex gap-2" role="tablist" aria-label="Secciones de Biblioteca">
      <button type="button" role="tab" aria-selected={view === "documents"} onClick={() => setView("documents")} className={`min-h-11 rounded-full px-5 text-sm font-bold ${view === "documents" ? "bg-[#0b7891] text-white" : "border bg-white text-[#536681]"}`}>Mis documentos</button>
      <button type="button" role="tab" aria-selected={view === "resources"} onClick={() => setView("resources")} className={`min-h-11 rounded-full px-5 text-sm font-bold ${view === "resources" ? "bg-[#0b7891] text-white" : "border bg-white text-[#536681]"}`}>Ideas y materiales</button>
    </div>
    {view === "documents" ? <DocumentsScreen /> : <>
      <header><h1 className="text-3xl font-extrabold tracking-tight text-[#1c2e50]">Ideas y materiales</h1><p className="mt-1 text-[#566883]">Estos talleres y materiales son ejemplos incluidos en Ayni para distintas edades. No son actividades de tu aula: solo se incorporan si eliges «Usar en actividad».</p></header>
      <label className="flex min-h-14 items-center gap-3 rounded-2xl border border-[#d4e1ed] bg-white px-4 text-[#60718a]"><Search className="size-5" aria-hidden="true" /><span className="sr-only">Buscar recurso</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar taller o material" className="min-w-0 flex-1 border-0 bg-transparent text-[#1c2e50] outline-none" /></label>
      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar recursos">{filters.map((item) => <button type="button" key={item.id} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)} className={`min-h-11 shrink-0 rounded-full px-5 text-sm font-semibold ${filter === item.id ? "bg-[#0b7891] text-white" : "border border-[#d4e1ed] bg-white text-[#536681]"}`}>{item.label}</button>)}</div>
      <h2 className="text-xl font-extrabold text-[#1c2e50]">{filter === "for-you" ? `Recomendado para ${age} años` : filters.find((item) => item.id === filter)?.label}</h2>
      {downloadMessage && <WorkflowFeedback tone="success">{downloadMessage}</WorkflowFeedback>}
      {downloadError && <WorkflowFeedback tone="error">{downloadError}</WorkflowFeedback>}
      {loading ? <LoadingState label="Cargando biblioteca..." /> : error ? <div className="space-y-2"><WorkflowFeedback tone="error">{error}</WorkflowFeedback><button type="button" className="font-semibold text-[#0b7891] underline" onClick={() => { setLoading(true); setRetry((value) => value + 1); }}>Reintentar</button></div> : visible.length ? <div className="space-y-3">{visible.map((resource) => <article key={resource.id} className="flex gap-4 rounded-[1.4rem] border border-[#d4e1ed] bg-white p-4 shadow-sm">
        <div className={`grid size-20 shrink-0 place-items-center rounded-2xl ${resource.kind === "workshop" ? "bg-[#f1eaff] text-[#7952b8]" : "bg-[#e9f7f0] text-[#287561]"}`}>{resource.kind === "workshop" ? <Sparkles className="size-9" aria-hidden="true" /> : <Shapes className="size-9" aria-hidden="true" />}</div>
        <div className="min-w-0 flex-1"><span className="inline-block rounded-full bg-[#e8f7fa] px-3 py-1 text-xs font-bold text-[#0b7891]">{resource.kind === "workshop" ? "Taller" : "Material para actividad"}</span><h3 className="mt-2 text-lg font-extrabold leading-tight text-[#1c2e50]">{resource.title}</h3><p className="mt-1 text-sm text-[#566883]">{resource.area} · {resource.age} años</p><p className="mt-2 line-clamp-2 text-sm text-[#566883]">{resource.purpose}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => onUse(resource)} className="min-h-11 rounded-xl bg-[#e8f7fa] px-5 text-sm font-bold text-[#07576c] hover:bg-[#cdebf0]">Usar en actividad →</button><button type="button" disabled={Boolean(downloadingId)} onClick={() => void download(resource)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#cce2ea] px-4 text-sm font-semibold text-[#07576c] disabled:opacity-50"><Download className="size-4" aria-hidden="true" /> {downloadingId === resource.id ? "Guardando..." : authMode === "local" ? "Guardar en Descargas" : "Descargar"}</button></div></div>
      </article>)}</div> : <EmptyState title={filter === "worksheets" ? "Aún no hay fichas en la biblioteca" : "No encontramos recursos"} description={filter === "worksheets" ? "Los talleres y materiales disponibles están en las otras categorías." : "Prueba otra búsqueda o categoría."} />}
      <div className="rounded-2xl bg-[#eef8fc] p-5"><BookOpen className="mb-2 size-5 text-[#0b7891]" aria-hidden="true" /><h2 className="font-extrabold text-[#1c2e50]">Tu trabajo guardado</h2><p className="mt-1 text-sm text-[#566883]">Tus planes, actividades e informes están en Mis documentos.</p><button type="button" onClick={() => setView("documents")} className="mt-3 min-h-11 font-bold text-[#07576c]">Ver documentos →</button></div>
    </>}
  </section>;
}
