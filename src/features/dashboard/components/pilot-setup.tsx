"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { savePilotSetup, type LocalDashboard } from "@/src/lib/local-database";

export function PilotSetup({ onReady }: { onReady: (dashboard: LocalDashboard) => void }) {
  const currentYear = new Date().getFullYear();
  const [teacherName, setTeacherName] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [section, setSection] = useState("");
  const [age, setAge] = useState(5);
  const [year, setYear] = useState(currentYear);
  const [startsOn, setStartsOn] = useState(`${currentYear}-03-01`);
  const [endsOn, setEndsOn] = useState(`${currentYear}-12-20`);
  const [castellanoL2Applicable, setCastellanoL2Applicable] = useState(false);
  const [religionApplicable, setReligionApplicable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    setBusy(true); setError("");
    try { onReady(await savePilotSetup({ teacherName, institutionName, section, age, year, startsOn, endsOn, castellanoL2Applicable, religionApplicable })); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo configurar el aula."); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-2xl space-y-5 p-5 md:p-9"><header><p className="font-semibold text-[#087d96]">Paso 1 de 6 · Configura el aula</p><h1 className="text-3xl font-bold">Cuéntanos sobre tu aula</h1><p className="mt-2 text-sm text-muted-foreground">Primero registra tus datos, colegio y edad del grupo. Después añadirás a los niños y harás la evaluación diagnóstica antes del plan anual.</p></header>
    <div className="grid gap-4 rounded-2xl border bg-white p-5 sm:grid-cols-2"><label>Nombre de la docente<Input value={teacherName} onChange={(event) => setTeacherName(event.target.value)} /></label><label>Institución<Input value={institutionName} onChange={(event) => setInstitutionName(event.target.value)} /></label><label>Sección<Input value={section} onChange={(event) => setSection(event.target.value)} /></label><label>Edad del aula<select className="block h-10 w-full rounded border px-3" value={age} onChange={(event) => setAge(Number(event.target.value))}><option value={3}>3 años</option><option value={4}>4 años</option><option value={5}>5 años</option></select></label><label>Año escolar<Input type="number" min={2020} max={2100} value={year} onChange={(event) => setYear(Number(event.target.value))} /></label><span /><label>Inicio<Input type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} /></label><label>Fin<Input type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} /></label><label className="flex items-center gap-2 sm:col-span-2"><input type="checkbox" checked={castellanoL2Applicable} onChange={(event) => setCastellanoL2Applicable(event.target.checked)} /> Castellano como segunda lengua aplicable</label><label className="flex items-center gap-2 sm:col-span-2"><input type="checkbox" checked={religionApplicable} onChange={(event) => setReligionApplicable(event.target.checked)} /> Educación religiosa aplicable</label></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button disabled={busy} onClick={() => void save()}>{busy ? "Guardando…" : "Guardar aula y añadir alumnos"}</Button></main>;
}
