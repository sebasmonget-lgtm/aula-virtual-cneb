"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, CarFront, Droplets, Hammer, HeartHandshake, Leaf, MoveHorizontal, Music2, Palette, PawPrint, Plus, Sprout, Store, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { annualMapHolidays, annualMapPercent, annualMapWidth, annualMapWindow, scheduledAnnualRows } from "@/src/lib/annual-year-map.mjs";

export type AnnualMapRow = { proposal_id: string; experience_type: "project" | "unit"; title: string; period: string;
  month: number; duration_weeks: 2 | 3; rationale: string; purpose: string; primary_competency_ids: string[];
  planned_start_date?: string; planned_end_date?: string; planned_instructional_days?: number };
export type AnnualMapCalendar = { school_year: number; blocks: { type: string; label: string; start_date: string; end_date: string }[]; initial_stage?: { duration_weeks: number } };
export type AnnualMapEffectiveCalendar = { days: { date: string; calendar_type: string; reason: string; is_instructional: boolean }[];
  blocks: AnnualMapCalendar["blocks"] };
type Slot = { slot_index: number; starts_on: string; ends_on: string; duration_weeks: number; proposal_id?: string };
type Competency = { id: string; name: string };
const months = ["Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const styles = [
  "bg-[#e8f7ec] border-[#c9ead5]", "bg-[#eaf2fc] border-[#d3e2f8]", "bg-[#fff1df] border-[#f3dfbd]",
  "bg-[#f1eafd] border-[#e1d4f8]", "bg-[#e7f8f8] border-[#cce9e9]", "bg-[#fff0f3] border-[#f3d6df]",
];
const day = (value: string) => new Date(`${value}T00:00:00Z`);
const compact = (value: string) => new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", timeZone: "UTC" }).format(day(value));
const holidayShort = (label: string, start: string, end: string) => {
  if (/(jueves|viernes) santo|semana santa|pascua/i.test(label)) return "SS";
  if (/fiestas patrias/i.test(label)) return "FP";
  if (start !== end) return `${day(start).getUTCDate()}–${day(end).getUTCDate()}`;
  return String(day(start).getUTCDate());
};
const iconFor = (title: string) => /animal/i.test(title) ? PawPrint : /planta|jardín|entorno/i.test(title) ? Sprout
  : /carrito|vehículo/i.test(title) ? CarFront : /mercado|comercio/i.test(title) ? Store
    : /agua/i.test(title) ? Droplets : /constru/i.test(title) ? Hammer
      : /tradici|familia/i.test(title) ? HeartHandshake : /arte/i.test(title) ? Palette
        : /crecemos|juntos/i.test(title) ? Users : /historias|cuentos/i.test(title) ? BookOpen
          : /música/i.test(title) ? Music2 : Leaf;

export function AnnualYearTimeline({ rows, calendar, effectiveCalendar, selectedId, onSelect, initialStage }: {
  rows: (AnnualMapRow & { start: string; end: string })[]; calendar: AnnualMapCalendar;
  effectiveCalendar?: AnnualMapEffectiveCalendar | null; selectedId: string | null; onSelect: (id: string) => void;
  initialStage?: { name: string; starts_on: string; ends_on: string };
}) {
  const window = annualMapWindow(calendar);
  const blocks = calendar.blocks.filter((block) => block.type === "management");
  const holidays = annualMapHolidays(effectiveCalendar?.days ?? []);
  const [holidayOpen, setHolidayOpen] = useState<string | null>(null);
  const monthStart = (index: number) => `${calendar.school_year}-${String(index + 3).padStart(2, "0")}-01`;
  const monthEnd = (index: number) => new Date(Date.UTC(calendar.school_year, index + 3, 0)).toISOString().slice(0, 10);
  return <div className="space-y-3">
    <section aria-label="Mapa del año escolar" tabIndex={0} className="journey-matrix-scroll overflow-x-auto rounded-2xl border border-[#d8e8f0] bg-white shadow-sm">
      <div className="relative min-w-[1920px] px-4 pb-4 pt-4">
        <div className="relative h-9 border-b border-[#dbe8f0]">{months.map((month, index) => <span key={month}
          className="absolute top-0 border-l border-[#e0eaf1] pl-2 text-xs font-bold text-[#304a70]"
          style={{ left: `${annualMapPercent(monthStart(index), window)}%`, width: `${annualMapWidth(monthStart(index), monthEnd(index), window)}%` }}>{month}</span>)}</div>
        <div className="relative h-7">{months.map((month, index) => [1, 15].map((date) => <span key={`${month}-${date}`}
          className="absolute top-1 text-xs text-[#526b87]" style={{ left: `${annualMapPercent(`${calendar.school_year}-${String(index + 3).padStart(2, "0")}-${String(date).padStart(2, "0")}`, window)}%` }}>{date}</span>))}</div>
        <div className="relative h-24">{holidays.map((holiday, index) => <div key={holiday.start} className="absolute z-20"
          style={{ left: `${annualMapPercent(holiday.start, window)}%`, top: index > 0 && annualMapPercent(holiday.start, window) - annualMapPercent(holidays[index - 1].start, window) < 2.5 ? 48 : 0 }}><button type="button" aria-expanded={holidayOpen === holiday.start}
            aria-label={`Feriado: ${holiday.labels.join(" y ")}, ${compact(holiday.start)}${holiday.start === holiday.end ? "" : ` al ${compact(holiday.end)}`}`}
            onClick={() => setHolidayOpen(holidayOpen === holiday.start ? null : holiday.start)}
            className="min-h-11 min-w-11 -translate-x-1/2 rounded border border-[#e6a1a5] bg-[#fff5f5] px-1 py-1 text-xs font-bold text-[#b8303b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b8303b]"
            title={holiday.labels.join(" · ")}>{holidayShort(holiday.labels[0], holiday.start, holiday.end)}</button>
            {holidayOpen === holiday.start && <div role="status" className="absolute left-1/2 top-11 z-30 w-52 -translate-x-1/2 rounded-lg border bg-white p-2 text-xs shadow-lg">
              <b>{compact(holiday.start)}{holiday.start !== holiday.end ? `–${compact(holiday.end)}` : ""}</b><br />{holiday.labels.join(" · ")}</div>}</div>)}</div>
        <div className="relative h-48 rounded-xl bg-[#f7fafc]">
          {blocks.map((block) => <div key={`${block.start_date}-${block.end_date}`} aria-label={`${block.label}: ${compact(block.start_date)} al ${compact(block.end_date)}, sin clases`} className="absolute inset-y-0 z-20 flex flex-col items-center justify-center overflow-hidden rounded-md border-2 border-[#8faac3] bg-[#dce8f2] px-1 text-center text-[#264869]"
            style={{ left: `${annualMapPercent(block.start_date, window)}%`, width: `${annualMapWidth(block.start_date, block.end_date, window)}%` }} title={`${block.label}: ${compact(block.start_date)}–${compact(block.end_date)} · Sin clases`}>
            <CalendarDays className="mb-1 size-4 shrink-0" aria-hidden="true" />{annualMapWidth(block.start_date, block.end_date, window) >= 3 && <><span className="text-xs font-extrabold leading-tight">Gestión</span><span className="text-xs">Sin clases</span></>}</div>)}
          {initialStage && <div aria-label={initialStage.name} title={initialStage.name}
            className="absolute inset-y-0 flex items-center justify-center overflow-hidden rounded-md border border-[#cce9e9] bg-[#e7f8f8] px-2 text-center text-xs font-bold text-[#07576c]"
            style={{ left: `${annualMapPercent(initialStage.starts_on, window)}%`, width: `${annualMapWidth(initialStage.starts_on, initialStage.ends_on, window)}%` }}>Acogida</div>}
          {rows.map((row, index) => { const Icon = iconFor(row.title); return <button key={row.proposal_id} type="button" aria-pressed={selectedId === row.proposal_id}
            aria-label={`${index + 1}. ${row.title}, ${row.experience_type === "unit" ? "unidad" : "proyecto"}, ${compact(row.start)} al ${compact(row.end)}`}
            onClick={() => onSelect(row.proposal_id)}
            className={`absolute inset-y-0 z-10 flex min-w-0 flex-col items-center justify-center overflow-hidden rounded-md border px-1 text-center text-[#173352] transition-transform hover:-translate-y-1 focus-visible:z-20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087d96] ${styles[index % styles.length]} ${selectedId === row.proposal_id ? "ring-2 ring-[#087d96] ring-offset-1" : ""}`}
            style={{ left: `${annualMapPercent(row.start, window)}%`, width: `${annualMapWidth(row.start, row.end, window)}%` }}>
            <span className="mb-1 flex items-center gap-1 text-xs font-bold"><Icon className="size-4 shrink-0" aria-hidden="true" />{String(index + 1).padStart(2, "0")}</span><span className="w-full min-w-0 break-words text-xs font-bold leading-4" title={row.title}>{row.title}</span>
            <span className="mt-2 rounded-full bg-white/75 px-1 text-xs">{row.experience_type === "unit" ? "Unidad" : "Proyecto"}</span>
            <span className="text-xs">{row.duration_weeks} sem</span></button>; })}
          {holidays.map((holiday) => <div key={holiday.start} aria-hidden="true" className="pointer-events-none absolute inset-y-0 z-30 w-px bg-[#d83f4b]"
            style={{ left: `${annualMapPercent(holiday.start, window)}%` }} />)}
        </div>
      </div>
    </section>
    <p className="text-xs leading-relaxed text-[#586f89]">Desliza para ver el año completo. Gestión: sin clases. Marcadores rojos: feriados; púlsalos para ver el detalle.</p>
  </div>;
}

export function AnnualYearMap({ rows, available, calendar, effectiveCalendar, slots = [], preferPlannedDates = false, selectedId, onSelect,
  editing, onMove, onRetire, onRestore, onReplace, onEdit, onDevelop, onAddManual, competencies }: {
  rows: AnnualMapRow[]; available: AnnualMapRow[]; calendar: AnnualMapCalendar; effectiveCalendar?: AnnualMapEffectiveCalendar | null;
  slots?: Slot[]; preferPlannedDates?: boolean; selectedId: string | null; onSelect: (id: string) => void; editing: boolean;
  onMove: (index: number, delta: number) => void; onRetire: (id: string) => void;
  onRestore: (id: string) => void; onReplace: (id: string) => void; onEdit: (id: string) => void;
  onDevelop?: (id: string) => void; onAddManual: () => void; competencies: Competency[];
}) {
  const projected = useMemo<{ rows: (AnnualMapRow & { start: string; end: string; days: number | null })[]; error: string }>(() => {
    try { return { rows: scheduledAnnualRows(calendar, rows, slots, preferPlannedDates), error: "" }; }
    catch (cause) { return { rows: [], error: cause instanceof Error ? cause.message : "No se pudieron calcular las fechas." }; }
  }, [calendar, rows, slots, preferPlannedDates]);
  const selected = projected.rows.find((row) => row.proposal_id === selectedId) ?? projected.rows[0];
  const selectedIndex = projected.rows.findIndex((row) => row.proposal_id === selected?.proposal_id);
  const names = new Map(competencies.map((item) => [item.id, item.name]));
  const [replacementOpen, setReplacementOpen] = useState(false);
  return <div className="space-y-3">
    <AnnualYearTimeline rows={projected.rows} calendar={calendar} effectiveCalendar={effectiveCalendar} selectedId={selected?.proposal_id ?? null} onSelect={onSelect} />
    {projected.error && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{projected.error}</p>}
    {selected && <section className="rounded-2xl border border-[#d8e8f0] bg-white p-4 shadow-sm sm:p-5" aria-label={`Detalle de ${selected.title}`}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,.9fr)]">
        <div><div className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e2f4ea] text-sm font-extrabold text-[#16805d]">{String(selectedIndex + 1).padStart(2, "0")}</span>
          <div><h2 className="text-lg font-extrabold text-[#172b52]">{selected.title}</h2><p className="text-xs text-[#526b87]">{selected.experience_type === "unit" ? "Unidad" : "Proyecto"} · {selected.period}</p></div></div>
          <p className="mt-2 text-sm text-[#526b87]">{compact(selected.start)} – {compact(selected.end)} · {selected.duration_weeks} semanas</p>
          <details className="mt-3 text-sm text-[#455d77]"><summary className="min-h-11 cursor-pointer py-3 font-semibold">Propósito y procedencia</summary><p><b>Propósito:</b> {selected.purpose}</p><p className="mt-2"><b>¿Por qué está en Mi año?</b> {selected.rationale}</p></details></div>
        <div className="hidden rounded-xl bg-[#f5f8fc] p-3 lg:block"><h3 className="text-sm font-bold text-[#526b87]">Competencias principales</h3>
          <ul className="mt-2 space-y-2">{selected.primary_competency_ids.map((id) => <li key={id} className="flex gap-2 text-xs"><span className="text-[#087d96]">●</span>{names.get(id) ?? id}</li>)}</ul></div>
        <div className="hidden rounded-xl bg-[#f5f8fc] p-3 lg:block"><h3 className="text-sm font-bold text-[#526b87]">Información</h3>
          <p className="mt-2 text-xs">Inicio: {compact(selected.start)} {calendar.school_year}</p><p className="mt-1 text-xs">Fin: {compact(selected.end)} {calendar.school_year}</p>
          <p className="mt-1 text-xs">{selected.duration_weeks} semanas{selected.days != null ? ` · ${selected.days} días de clase` : ""}</p>
          <p className="mt-1 text-xs">{selected.period}</p></div></div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#e3edf4] pt-3 [&_button]:min-h-11 [&_button]:whitespace-normal">
        {!editing && onDevelop && <Button type="button" onClick={() => onDevelop(selected.proposal_id)}>Ver proyecto</Button>}
        {editing && <><Button type="button" variant="outline" onClick={() => onEdit(selected.proposal_id)}>Modificar</Button>
          <Button type="button" variant="outline" disabled={!available.length} onClick={() => setReplacementOpen(!replacementOpen)}>Sustituir</Button>
          <Button type="button" variant="outline" disabled={rows.length <= 1} onClick={() => onRetire(selected.proposal_id)}><Trash2 className="size-4" /> Retirar del año</Button>
          <span className="ml-auto text-xs text-[#526b87]">Mover:</span><Button type="button" variant="outline" size="sm" aria-label="Mover propuesta antes" disabled={selectedIndex === 0} onClick={() => onMove(selectedIndex, -1)}><ArrowLeft className="size-4" /></Button>
          <Button type="button" variant="outline" size="sm" aria-label="Mover propuesta después" disabled={selectedIndex === rows.length - 1} onClick={() => onMove(selectedIndex, 1)}><ArrowRight className="size-4" /></Button></>}
      </div>
      <details className="mt-3 text-sm lg:hidden"><summary className="min-h-11 cursor-pointer py-3 font-semibold text-[#07576c]">Competencias y fechas de la propuesta</summary><ul className="space-y-2">{selected.primary_competency_ids.map((id) => <li key={id}>{names.get(id) ?? id}</li>)}</ul><p className="mt-3">Inicio: {compact(selected.start)} {calendar.school_year} · Fin: {compact(selected.end)} {calendar.school_year}</p><p>{selected.period} · {selected.days != null ? `${selected.days} días de clase` : `${selected.duration_weeks} semanas`}</p></details>
      {editing && replacementOpen && <div className="mt-3 flex flex-wrap gap-2 rounded-xl bg-[#f3f8fb] p-3 text-sm"><b className="w-full">Sustituir por una propuesta disponible</b>
        {available.map((row) => <Button key={row.proposal_id} type="button" variant="outline" onClick={() => { onReplace(row.proposal_id); setReplacementOpen(false); }}>{row.title}</Button>)}</div>}
    </section>}
    <section className="rounded-2xl border border-[#d8e8f0] bg-white p-4 shadow-sm" aria-label="Propuestas disponibles">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-extrabold text-[#172b52]">Propuestas disponibles</h2><p className="text-xs text-[#526b87]">Ideas retiradas o pendientes para incorporar al año.</p></div>
        {editing && <Button type="button" variant="outline" onClick={onAddManual}><Plus className="size-4" /> Nueva propuesta</Button>}</div>
      {available.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{available.map((row, index) => { const Icon = iconFor(row.title); return <article key={row.proposal_id} className={`rounded-xl border p-3 ${styles[index % styles.length]}`}>
        <div className="flex items-center gap-2"><Icon className="size-4 shrink-0" aria-hidden="true" /><h3 className="text-sm font-bold">{row.title}</h3></div><p className="mt-1 text-xs">{row.experience_type === "unit" ? "Unidad" : "Proyecto"} · {row.duration_weeks} semanas</p>
        {editing && <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => onRestore(row.proposal_id)}><MoveHorizontal className="size-4" /> Incorporar al año</Button>}</article>; })}</div>
        : <p className="mt-3 rounded-xl bg-[#f6f9fc] p-3 text-sm text-[#526b87]">Todas las propuestas de esta versión están ubicadas en el año.</p>}
    </section>
  </div>;
}
