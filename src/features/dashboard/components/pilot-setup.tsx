"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useUnsavedWork } from "@/src/lib/use-unsaved-work";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { savePilotSetup, type LocalDashboard } from "@/src/lib/local-database";
import { pilotSchoolYearDefaults } from "@/src/lib/pilot-school-year-defaults.mjs";
import { displayNow } from "@/src/lib/display-date";
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
  const currentYear = displayNow().getFullYear();
  const [teacherName, setTeacherName] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [section, setSection] = useState("");
  const [institutionCode, setInstitutionCode] = useState("");
  const [district, setDistrict] = useState("");
  const [ugel, setUgel] = useState("");
  const [directorName, setDirectorName] = useState("");
  const [age, setAge] = useState<number | null>(null);
  const [year, setYear] = useState(currentYear);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [createLogo, setCreateLogo] = useState(false);
  const [logoInitials, setLogoInitials] = useState("AA");
  const [logoPrimary, setLogoPrimary] = useState("#087d96");
  const [logoAccent, setLogoAccent] = useState("#f6c85f");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useUnsavedWork(Boolean(teacherName || institutionName || section || logoFile || createLogo || institutionCode || district || ugel || directorName || age !== null || year !== currentYear), busy);
  const officialDates = pilotSchoolYearDefaults(year);

  useEffect(() => () => { if (logoPreview) URL.revokeObjectURL(logoPreview); }, [logoPreview]);

  async function save() {
    if (busy) return;
    if (age === null) {
      setError("Elige la edad del aula para continuar.");
      return;
    }
    if (!officialDates) {
      setError("Aún no está disponible el calendario oficial de ese año. Elige un año con calendario disponible.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const logoUpload = logoFile ? await encodeLogo(logoFile) : undefined;
      onReady(await savePilotSetup({ teacherName, institutionName, section, institutionCode, district, ugel,
        directorName, age, year, startsOn: officialDates.startsOn, endsOn: officialDates.endsOn,
        castellanoL2Applicable: false, religionApplicable: false,
        createLogo, logoInitials, logoPrimary, logoAccent, logoUpload }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo configurar el aula.");
    } finally { setBusy(false); }
  }

  return <main data-ayni-screen="classroom-setup" className="mx-auto max-w-5xl space-y-5 p-5 md:p-9">
    <header>
      <h1 className="text-3xl font-bold">Configura tu aula</h1>
      <p className="mt-2 text-sm text-muted-foreground">Registra los datos del colegio y del aula una sola vez. Después podrás añadir a tus niños y elegir cómo empezar.</p>
    </header>
    <section className="rounded-2xl border bg-white p-5 sm:p-6" aria-labelledby="school-data-title">
      <h2 id="school-data-title" className="text-lg font-bold text-[#19345b]">Datos de tu colegio</h2>
      <p className="mt-2 text-sm text-muted-foreground">Estos datos se usarán para personalizar tus documentos. Los campos opcionales se pueden completar después.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold sm:col-span-2">Institución<Input className="mt-2" value={institutionName} onChange={(event) => setInstitutionName(event.target.value)} /></label>
        <label className="block text-sm font-semibold">UGEL <span className="font-normal text-muted-foreground">(opcional)</span><Input className="mt-2" value={ugel} onChange={(event) => setUgel(event.target.value)} /></label>
        <label className="block text-sm font-semibold">Distrito <span className="font-normal text-muted-foreground">(opcional)</span><Input className="mt-2" value={district} onChange={(event) => setDistrict(event.target.value)} /></label>
        <label className="block text-sm font-semibold">Código modular <span className="font-normal text-muted-foreground">(opcional)</span><Input className="mt-2" value={institutionCode} onChange={(event) => setInstitutionCode(event.target.value)} /></label>
        <label className="block text-sm font-semibold">Director(a) <span className="font-normal text-muted-foreground">(opcional)</span><Input className="mt-2" value={directorName} onChange={(event) => setDirectorName(event.target.value)} /></label>
      </div>
      <div className="mt-6 border-t pt-5">
        <div className="flex items-center gap-3"><div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#087d96] text-xl font-bold text-white">{logoPreview && !createLogo ? <Image unoptimized src={logoPreview} alt="Vista previa del logo" width={64} height={64} className="size-full object-contain bg-white" /> : createLogo ? <span style={{ backgroundColor: logoPrimary }} className="grid size-full place-items-center">{logoInitials.toUpperCase().slice(0, 3) || "AA"}</span> : "IE"}</div><div><h2 className="font-bold">Logo del colegio</h2><p className="text-sm text-muted-foreground">Recomendado para personalizar tus documentos. Puedes continuar sin logo.</p></div></div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button variant="outline" type="button" disabled={busy} className="min-h-11 border-[#bdd0dd] bg-white font-semibold text-[#075d70]" aria-describedby="setup-logo-help" onClick={() => logoInputRef.current?.click()}>Seleccionar logo</Button>
          <input ref={logoInputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; setLogoFile(file); setLogoPreview(URL.createObjectURL(file)); setCreateLogo(false); }} />
          <p role="status" className="min-w-0 break-all text-sm text-[#075d70]">{logoFile ? `Seleccionado: ${logoFile.name}` : "Ningún logo seleccionado"}</p>
          {logoFile && <Button variant="outline" className="min-h-11 border-[#bdd0dd] bg-white text-[#075d70]" type="button" disabled={busy} onClick={() => { setLogoFile(null); setLogoPreview(""); if (logoInputRef.current) logoInputRef.current.value = ""; }}>Quitar logo</Button>}
        </div>
        <p id="setup-logo-help" className="mt-2 text-xs text-muted-foreground">Opcional. PNG, JPG o WebP. Hasta 2 MB. Se guarda de forma privada.</p>
        <label className="setup-logo-choice mt-5 flex min-h-11 items-center gap-2 rounded-lg border border-transparent px-2 text-sm font-medium"><input type="checkbox" disabled={busy} checked={createLogo} onChange={(event) => { setCreateLogo(event.target.checked); if (event.target.checked) { setLogoFile(null); setLogoPreview(""); if (logoInputRef.current) logoInputRef.current.value = ""; } }} /> Prefiero crear uno con iniciales</label>
        {createLogo && <div className="mt-4 space-y-3"><label className="block text-sm font-semibold">Iniciales (máximo 3)<Input className="mt-2" maxLength={3} value={logoInitials} onChange={(event) => setLogoInitials(event.target.value)} /></label><div className="flex gap-4 text-sm"><label>Color base <input type="color" value={logoPrimary} onChange={(event) => setLogoPrimary(event.target.value)} className="ml-2 align-middle" /></label><label>Acento <input type="color" value={logoAccent} onChange={(event) => setLogoAccent(event.target.value)} className="ml-2 align-middle" /></label></div></div>}
      </div>
    </section>
    <section className="rounded-2xl border bg-white p-5 sm:p-6" aria-labelledby="classroom-data-title">
      <h2 id="classroom-data-title" className="text-lg font-bold text-[#19345b]">Datos de tu aula</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold sm:col-span-2">Nombre de la profesora<Input className="mt-2" value={teacherName} onChange={(event) => setTeacherName(event.target.value)} /></label>
        <label className="block text-sm font-semibold sm:col-span-2">Sección<Input className="mt-2" value={section} onChange={(event) => setSection(event.target.value)} /></label>
        <label className="block text-sm font-semibold">Edad del aula<select required aria-describedby="classroom-age-help" className="mt-2 block min-h-11 w-full rounded-lg border border-input bg-white px-3" value={age ?? ""} onChange={(event) => setAge(event.target.value ? Number(event.target.value) : null)}><option value="">Elige la edad</option><option value={3}>3 años</option><option value={4}>4 años</option><option value={5}>5 años</option></select><span id="classroom-age-help" className="mt-1 block font-normal text-muted-foreground">Debes elegir la edad para continuar.</span></label>
        <label className="block text-sm font-semibold">Año escolar<Input className="mt-2" type="number" min={2020} max={2100} value={year || ""} aria-describedby={!officialDates ? "school-year-help" : undefined} onChange={(event) => setYear(Number(event.target.value))} /></label>
      </div>
      {!officialDates && <p id="school-year-help" role="alert" className="mt-3 text-sm text-destructive">Aún no está disponible el calendario oficial de {year || "ese año"}. Elige un año con calendario disponible (2026).</p>}
    </section>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {busy && <LoadingState label="Guardando datos del colegio y del aula…" />}
    <AsyncButton className="min-h-11" disabled={age === null || !officialDates} busy={busy} busyLabel="Guardando…" onClick={() => void save()}>Guardar aula y añadir niños</AsyncButton>
  </main>;
}
