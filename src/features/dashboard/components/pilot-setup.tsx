"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { savePilotSetup, type LocalDashboard } from "@/src/lib/local-database";
import { pilotSchoolYearDefaults } from "@/src/lib/pilot-school-year-defaults.mjs";
import { AsyncButton, LoadingState } from "./workflow-ui";

type LogoMimeType = "image/png" | "image/jpeg" | "image/webp";
const LOGO_MIME_TYPES: LogoMimeType[] = ["image/png", "image/jpeg", "image/webp"];

async function encodeLogo(file: File) {
  if (file.size > 2_000_000 || !LOGO_MIME_TYPES.includes(file.type as LogoMimeType)) {
    throw new Error("Elige un logo PNG, JPG o WebP de hasta 2 MB.");
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer el logo."));
    reader.readAsDataURL(file);
  });
  return { mimeType: file.type as LogoMimeType, base64: dataUrl.split(",")[1] ?? "" };
}

export function PilotSetup({ onReady }: { onReady: (dashboard: LocalDashboard) => void }) {
  const currentYear = new Date().getFullYear();
  const initialDates = pilotSchoolYearDefaults(currentYear);
  const [teacherName, setTeacherName] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [section, setSection] = useState("");
  const [institutionCode, setInstitutionCode] = useState("");
  const [district, setDistrict] = useState("");
  const [ugel, setUgel] = useState("");
  const [directorName, setDirectorName] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [year, setYear] = useState(currentYear);
  const [startsOn, setStartsOn] = useState(initialDates?.startsOn ?? "");
  const [endsOn, setEndsOn] = useState(initialDates?.endsOn ?? "");
  const [castellanoL2Applicable, setCastellanoL2Applicable] = useState(false);
  const [religionApplicable, setReligionApplicable] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [createLogo, setCreateLogo] = useState(false);
  const [logoInitials, setLogoInitials] = useState("AA");
  const [logoPrimary, setLogoPrimary] = useState("#087d96");
  const [logoAccent, setLogoAccent] = useState("#f6c85f");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const officialDates = pilotSchoolYearDefaults(year);

  useEffect(() => () => { if (logoPreview) URL.revokeObjectURL(logoPreview); }, [logoPreview]);

  function changeYear(nextYear: number) {
    setYear(nextYear);
    const dates = pilotSchoolYearDefaults(nextYear);
    setStartsOn(dates?.startsOn ?? "");
    setEndsOn(dates?.endsOn ?? "");
  }

  async function save() {
    if (age === null) {
      setError("Elige la edad del aula para continuar.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const logoUpload = logoFile ? await encodeLogo(logoFile) : undefined;
      onReady(await savePilotSetup({ teacherName, institutionName, section, institutionCode, district, ugel,
        directorName, age, year, startsOn, endsOn, castellanoL2Applicable, religionApplicable,
        createLogo, logoInitials, logoPrimary, logoAccent, logoUpload }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo configurar el aula.");
    } finally { setBusy(false); }
  }

  return <main className="mx-auto max-w-5xl space-y-5 p-5 md:p-9">
    <header>
      <p className="font-semibold text-[#087d96]">Paso 1 de 6 · Configura el aula</p>
      <h1 className="text-3xl font-bold">Cuéntanos sobre tu aula</h1>
      <p className="mt-2 text-sm text-muted-foreground">Registra los datos del colegio y del aula una sola vez. Después añadirás a los alumnos y continuarás con el diagnóstico.</p>
    </header>
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <section className="rounded-2xl border bg-white p-5 sm:p-6" aria-label="Datos del colegio y del aula">
        <h2 className="text-lg font-bold text-[#19345b]">Datos del colegio</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">Institución<Input className="mt-2" value={institutionName} onChange={(event) => setInstitutionName(event.target.value)} /></label>
          <label className="block text-sm font-semibold">Docente<Input className="mt-2" value={teacherName} onChange={(event) => setTeacherName(event.target.value)} /></label>
          <label className="block text-sm font-semibold">Sección<Input className="mt-2" value={section} onChange={(event) => setSection(event.target.value)} /></label>
          <label className="block text-sm font-semibold">Código modular <span className="font-normal text-[#526b87]">(opcional)</span><Input className="mt-2" value={institutionCode} onChange={(event) => setInstitutionCode(event.target.value)} /></label>
          <label className="block text-sm font-semibold">Distrito <span className="font-normal text-[#526b87]">(opcional)</span><Input className="mt-2" value={district} onChange={(event) => setDistrict(event.target.value)} /></label>
          <label className="block text-sm font-semibold">UGEL <span className="font-normal text-[#526b87]">(opcional)</span><Input className="mt-2" value={ugel} onChange={(event) => setUgel(event.target.value)} /></label>
          <label className="block text-sm font-semibold">Dirección <span className="font-normal text-[#526b87]">(opcional)</span><Input className="mt-2" placeholder="Nombre de la directora o director" value={directorName} onChange={(event) => setDirectorName(event.target.value)} /></label>
        </div>
        <h2 className="mt-6 border-t pt-5 text-lg font-bold text-[#19345b]">Aula y año escolar</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">Edad del aula<select required aria-describedby="classroom-age-help" className="mt-2 block min-h-11 w-full rounded-lg border border-input bg-white px-3" value={age ?? ""} onChange={(event) => setAge(event.target.value ? Number(event.target.value) : null)}><option value="">Elige la edad</option><option value={3}>3 años</option><option value={4}>4 años</option><option value={5}>5 años</option></select><span id="classroom-age-help" className="mt-1 block font-normal text-muted-foreground">Debes elegir la edad para continuar.</span></label>
          <label className="block text-sm font-semibold">Año escolar<Input className="mt-2" type="number" min={2020} max={2100} value={year} onChange={(event) => changeYear(Number(event.target.value))} /></label>
          <div className="rounded-xl bg-[#eef8fb] p-3 text-sm text-[#23475d] sm:col-span-2">
            {officialDates ? <p><strong>Calendario Minedu 2026:</strong> 36 semanas de clases y 8 de gestión. El año escolar va del 2 de marzo al 31 de diciembre; las clases, del 16 de marzo al 18 de diciembre. En las semanas de gestión el personal planifica y evalúa, sin clases regulares. Si tu DRE, UGEL o colegio aprobó otras fechas, puedes cambiarlas abajo.</p>
              : <p>No hay fechas oficiales precargadas para {year || "ese año"}. Consulta la calendarización de tu DRE, UGEL o colegio e ingresa el inicio y el fin del año escolar, incluidas las semanas de gestión.</p>}
          </div>
          <label className="block text-sm font-semibold">Inicio del año escolar (incluye gestión)<Input className="mt-2" type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} /></label>
          <label className="block text-sm font-semibold">Fin del año escolar (incluye gestión)<Input className="mt-2" type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} /></label>
          <div className="sm:col-span-2"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={castellanoL2Applicable} onChange={(event) => setCastellanoL2Applicable(event.target.checked)} /> Castellano como segunda lengua aplicable</label><p className="ml-6 mt-1 text-sm text-muted-foreground">Márcalo si corresponde enseñar castellano como segunda lengua a niños cuya lengua materna es originaria.</p></div>
          <div className="sm:col-span-2"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={religionApplicable} onChange={(event) => setReligionApplicable(event.target.checked)} /> Educación religiosa aplicable</label><p className="ml-6 mt-1 text-sm text-muted-foreground">Márcalo si el área forma parte de la planificación. Las exoneraciones de familias se respetan por estudiante.</p></div>
        </div>
      </section>
      <aside className="h-fit rounded-2xl border border-[#dce9f2] bg-[#eef8fb] p-5">
        <div className="flex items-center gap-3"><div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#087d96] text-xl font-bold text-white">{logoPreview && !createLogo ? <Image unoptimized src={logoPreview} alt="Vista previa del logo" width={64} height={64} className="size-full object-contain bg-white" /> : createLogo ? <span style={{ backgroundColor: logoPrimary }} className="grid size-full place-items-center">{logoInitials.toUpperCase().slice(0, 3) || "AA"}</span> : "IE"}</div><div><h2 className="font-bold">Logo del colegio</h2><p className="text-xs text-muted-foreground">Aparecerá en tus documentos Word.</p></div></div>
        <label className="mt-5 block text-sm font-semibold">Subir una imagen del logo <span className="font-normal">(opcional)</span>
          <input ref={logoInputRef} className="mt-2 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:font-semibold file:text-[#075d70]" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0] ?? null; setLogoFile(file); setLogoPreview(file ? URL.createObjectURL(file) : ""); if (file) setCreateLogo(false); }} />
        </label>
        <p className="mt-2 text-xs text-muted-foreground">PNG, JPG o WebP. Hasta 2 MB. Se guarda en este equipo.</p>
        {logoFile && <p className="mt-2 text-sm text-[#075d70]">Seleccionado: {logoFile.name} <button className="underline" type="button" onClick={() => { setLogoFile(null); setLogoPreview(""); if (logoInputRef.current) logoInputRef.current.value = ""; }}>Quitar</button></p>}
        <label className="mt-5 flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={createLogo} onChange={(event) => { setCreateLogo(event.target.checked); if (event.target.checked) { setLogoFile(null); setLogoPreview(""); if (logoInputRef.current) logoInputRef.current.value = ""; } }} /> Prefiero crear uno con iniciales</label>
        {createLogo && <div className="mt-4 space-y-3"><label className="block text-sm font-semibold">Iniciales (máximo 3)<Input className="mt-2" maxLength={3} value={logoInitials} onChange={(event) => setLogoInitials(event.target.value)} /></label><div className="flex gap-4 text-sm"><label>Color base <input type="color" value={logoPrimary} onChange={(event) => setLogoPrimary(event.target.value)} className="ml-2 align-middle" /></label><label>Acento <input type="color" value={logoAccent} onChange={(event) => setLogoAccent(event.target.value)} className="ml-2 align-middle" /></label></div></div>}
      </aside>
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {busy && <LoadingState label="Guardando datos del colegio y del aula…" />}
    <AsyncButton disabled={age === null} busy={busy} busyLabel="Guardando…" onClick={() => void save()}>Guardar aula y añadir alumnos</AsyncButton>
  </main>;
}
