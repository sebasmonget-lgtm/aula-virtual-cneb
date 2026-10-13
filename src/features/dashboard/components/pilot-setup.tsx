"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight, CaseUpper, ImageIcon, LogOut, School, Upload, Users } from "lucide-react";
import { useUnsavedWork } from "@/src/lib/use-unsaved-work";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { savePilotSetup, savePilotSetupDraft, type PilotSetupDraft, type LocalDashboard } from "@/src/lib/local-database";
import { pilotSchoolYearDefaults } from "@/src/lib/pilot-school-year-defaults.mjs";
import { displayNow } from "@/src/lib/display-date";
import { AsyncButton } from "./workflow-ui";
import styles from "./pilot-setup.module.css";

async function encodeLogo(file: File): Promise<NonNullable<PilotSetupDraft["logoUpload"]>> {
  if (file.size > 2_000_000 || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("Elige un logo PNG, JPG o WebP de hasta 2 MB.");
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer el logo."));
    reader.readAsDataURL(file);
  });
  return { mimeType: file.type as NonNullable<PilotSetupDraft["logoUpload"]>["mimeType"], base64: dataUrl.split(",")[1] ?? "" };
}

export function PilotSetup({ onReady, accountYear, initialDraft, onSignOut }: {
  onReady: (dashboard: LocalDashboard) => void; accountYear?: number; initialDraft?: PilotSetupDraft | null; onSignOut?: () => void;
}) {
  const currentYear = accountYear ?? displayNow().getFullYear();
  const [draft, setDraft] = useState<PilotSetupDraft>(() => initialDraft ?? {
    teacherName: "", institutionName: "", section: "", institutionCode: "", district: "", ugel: "", directorName: "",
    age: null, year: currentYear, createLogo: false, logoInitials: "AA", logoPrimary: "#087d96", logoAccent: "#f6c85f",
  });
  const [busy, setBusy] = useState(false);
  const [readingLogo, setReadingLogo] = useState(false);
  const [error, setError] = useState("");
  const [autosave, setAutosave] = useState<"saved" | "pending" | "saving" | "error">("saved");
  const [autosaveError, setAutosaveError] = useState("");
  const [retry, setRetry] = useState(0);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const submissionId = useRef<string | null>(null);
  const saving = useRef(false);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const lastSaved = useRef(JSON.stringify(draft));
  const latest = useRef(JSON.stringify(draft));
  const allowLeave = useUnsavedWork(autosave !== "saved" || readingLogo, busy);
  const officialDates = pilotSchoolYearDefaults(draft.year);
  const logoPreview = draft.logoUpload ? `data:${draft.logoUpload.mimeType};base64,${draft.logoUpload.base64}` : "";
  const complete = draft.teacherName.trim().length >= 2 && draft.institutionName.trim().length >= 2 && Boolean(draft.section.trim()) && draft.age !== null && Boolean(officialDates);

  function change(patch: Partial<PilotSetupDraft>) {
    const next: PilotSetupDraft = { ...JSON.parse(latest.current), ...patch };
    latest.current = JSON.stringify(next);
    setDraft(next);
    setAutosave(latest.current === lastSaved.current ? "saved" : "pending");
    setAutosaveError(""); setError("");
  }

  useEffect(() => {
    const snapshot = JSON.stringify(draft);
    if (busy || snapshot === lastSaved.current) return;
    const timer = setTimeout(() => {
      setAutosave("saving");
      const task = queue.current.catch(() => {}).then(() => savePilotSetupDraft(draft));
      queue.current = task;
      void task.then(() => {
        lastSaved.current = snapshot;
        if (latest.current === snapshot) setAutosave("saved");
      }).catch((cause: unknown) => {
        if (latest.current !== snapshot) return;
        setAutosave("error");
        setAutosaveError(cause instanceof Error ? cause.message : "No se pudieron guardar los cambios.");
      });
    }, 700);
    return () => clearTimeout(timer);
  }, [draft, busy, retry]);

  async function selectLogo(file?: File) {
    if (!file) return;
    setReadingLogo(true); setError("");
    try { change({ logoUpload: await encodeLogo(file), createLogo: false }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo leer el logo."); }
    finally { setReadingLogo(false); if (logoInputRef.current) logoInputRef.current.value = ""; }
  }

  async function save() {
    if (saving.current || readingLogo) return;
    if (draft.age === null) { setError("Selecciona la edad del aula para continuar."); return; }
    if (!complete || !officialDates) { setError("Completa institución, nombre de la profesora, sección y año escolar para continuar."); return; }
    saving.current = true; submissionId.current ??= crypto.randomUUID();
    const started = performance.now();
    setBusy(true); setError("");
    try {
      await queue.current.catch(() => {});
      onReady(await savePilotSetup({ ...draft, age: draft.age, submissionId: submissionId.current,
        startsOn: officialDates.startsOn, endsOn: officialDates.endsOn, castellanoL2Applicable: false, religionApplicable: false }));
      if (process.env.NEXT_PUBLIC_AYNI_QA_CLOCK === "1") requestAnimationFrame(() => console.info("ayni_setup_frontend", JSON.stringify({ clickToFrameMs: Math.round(performance.now() - started), withLogo: Boolean(draft.logoUpload || draft.createLogo) })));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo configurar el aula."); }
    finally { saving.current = false; setBusy(false); }
  }

  const optional = <span className={styles.optional}>(opcional)</span>;
  const required = <span className={styles.required} aria-hidden="true">*</span>;
  return <div data-ayni-screen="classroom-setup" className={styles.page}>
    <header className={styles.topbar}><div className={styles.topbarInner}>
      <div className={styles.brand}><svg aria-hidden="true" viewBox="0 0 48 40" className={styles.brandIcon}><circle cx="24" cy="8" r="6" fill="#0089a5"/><circle cx="9" cy="14" r="4.5" fill="#f9b719"/><circle cx="39" cy="14" r="4.5" fill="#f9b719"/><path d="M16 39V24a8 8 0 0 1 16 0v15h-6V29h-4v10ZM1 34V26a8 8 0 0 1 13-6v16H8v-8H6v6ZM47 34V26a8 8 0 0 0-13-6v16h6v-8h2v6Z" fill="#0089a5"/></svg><span>Ayni <span>Aula</span></span></div>
      {onSignOut && <button type="button" className={styles.signOut} disabled={busy || readingLogo} onClick={() => { if (allowLeave()) onSignOut(); }}><LogOut size={19} aria-hidden="true"/>Cerrar sesión</button>}
    </div></header>
    <main className={styles.content}>
      <div className={styles.intro}>
        <h1>Crea tu salón</h1>
        <p>Completa estos datos una sola vez para empezar a usar Ayni con tu grupo.</p>
        <Image className={styles.illustration} src="/ayni-classroom-welcome.png" alt="" width={1536} height={1024} sizes="380px" preload />
        <ol className={styles.steps} aria-label="Preparación de tu aula">
          {["Configura tu aula", "Añade a tus niños", "Entrevistas y observaciones", "Prepara Mi año con Ayni"].map((label, index) => <li key={label} aria-current={index === 0 ? "step" : undefined}><span>{index + 1}</span><span>{label}</span></li>)}
        </ol>
      </div>
      <form onSubmit={event => { event.preventDefault(); void save(); }} className={styles.form}>
        <section className={styles.card} aria-labelledby="school-data-title">
          <div className={styles.sectionHeading}><span className={styles.schoolIcon}><School size={32} aria-hidden="true"/></span><div><h2 id="school-data-title">Datos del colegio</h2><p>Estos datos se usarán para personalizar tus documentos. Los campos opcionales se pueden completar después.</p></div></div>
          <div className={styles.schoolLayout}>
            <div className={styles.fields}>
              <label className={styles.full}>Institución {required}<Input required minLength={2} maxLength={200} disabled={busy} placeholder="Nombre de la institución educativa" value={draft.institutionName} onChange={event => change({institutionName:event.target.value})}/></label>
              <label>UGEL {optional}<Input maxLength={100} disabled={busy} placeholder="Ej. UGEL 07 San Borja" value={draft.ugel} onChange={event => change({ugel:event.target.value})}/></label>
              <label>Distrito {optional}<Input maxLength={100} disabled={busy} placeholder="Ej. San Borja" value={draft.district} onChange={event => change({district:event.target.value})}/></label>
              <label>Código modular {optional}<Input maxLength={40} disabled={busy} placeholder="Ej. 1234567" value={draft.institutionCode} onChange={event => change({institutionCode:event.target.value})}/></label>
              <label>Director(a) {optional}<Input maxLength={120} disabled={busy} placeholder="Nombre del director o directora" value={draft.directorName} onChange={event => change({directorName:event.target.value})}/></label>
            </div>
            <div className={styles.logoArea}>
              <div className={styles.logoHeading}><span className={styles.schoolIcon}><ImageIcon size={25} aria-hidden="true"/></span><div><h3>Logo del colegio {optional}</h3><p>Recomendado para personalizar tus documentos.</p></div></div>
              <div className={styles.logoPreview}>
                {draft.createLogo ? <span className={styles.initialsLogo} style={{backgroundColor:draft.logoPrimary, borderColor:draft.logoAccent}}>{draft.logoInitials.toUpperCase() || "AA"}</span> : logoPreview ? <Image unoptimized src={logoPreview} alt="Vista previa del logo del colegio" width={100} height={100}/> : <><ImageIcon size={34} aria-hidden="true"/><span>Tu logo aparecerá aquí</span><small>PNG, JPG o WebP. Hasta 2 MB.</small></>}
              </div>
              <div className={styles.logoActions}>
                <Button type="button" disabled={busy || readingLogo} onClick={() => logoInputRef.current?.click()} className={styles.primary}><Upload aria-hidden="true"/>{readingLogo ? "Leyendo logo…" : "Seleccionar logo"}</Button>
                <Button type="button" variant="outline" disabled={busy || readingLogo} aria-expanded={draft.createLogo} onClick={() => change({createLogo:!draft.createLogo, logoUpload:undefined})}><CaseUpper aria-hidden="true"/>Crear con iniciales</Button>
              </div>
              <input ref={logoInputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" disabled={busy || readingLogo} onChange={event => void selectLogo(event.target.files?.[0])}/>
              {draft.createLogo && <div className={styles.initialsFields}><label>Iniciales (máximo 3)<Input disabled={busy} maxLength={3} value={draft.logoInitials} onChange={event => change({logoInitials:event.target.value})}/></label><div><label>Color base<input type="color" disabled={busy} value={draft.logoPrimary} onChange={event => change({logoPrimary:event.target.value})}/></label><label>Acento<input type="color" disabled={busy} value={draft.logoAccent} onChange={event => change({logoAccent:event.target.value})}/></label></div></div>}
              <p className={styles.logoHelp}>Puedes continuar sin logo. {draft.logoUpload && <button type="button" disabled={busy} onClick={() => change({logoUpload:undefined})}>Quitar logo</button>}</p>
            </div>
          </div>
        </section>
        <section className={styles.card} aria-labelledby="classroom-data-title">
          <div className={styles.sectionHeading}><span className={styles.classroomIcon}><Users size={32} aria-hidden="true"/></span><div><h2 id="classroom-data-title">Datos de tu aula</h2><p>Cuéntanos sobre tu grupo de niños y tu rol.</p></div></div>
          <div className={styles.fields}>
            <label>Nombre de la profesora {required}<Input required minLength={2} maxLength={100} autoComplete="name" disabled={busy} placeholder="Tu nombre completo" value={draft.teacherName} onChange={event => change({teacherName:event.target.value})}/></label>
            <label>Sección {required}<Input required maxLength={80} disabled={busy} placeholder="Ej. A, B, Única" value={draft.section} onChange={event => change({section:event.target.value})}/></label>
            <label>Edad del aula {required}<select required disabled={busy} value={draft.age ?? ""} onChange={event => change({age:event.target.value ? Number(event.target.value) : null})}><option value="">Selecciona edad</option><option value={3}>3 años</option><option value={4}>4 años</option><option value={5}>5 años</option></select></label>
            <label>Año escolar {required}<select required disabled={busy} value={draft.year} aria-describedby={!officialDates ? "school-year-help" : undefined} onChange={event => change({year:Number(event.target.value)})}>{[...new Set([currentYear,2026,draft.year])].sort().map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          </div>
          {!officialDates && <p id="school-year-help" role="alert" className={styles.error}>Aún no está disponible el calendario oficial de {draft.year}. Selecciona 2026 para continuar.</p>}
          {error && <p role="alert" className={styles.error}>{error}</p>}
          <div className={styles.footer}>
            <AsyncButton type="submit" className={styles.primary} disabled={!complete || readingLogo} busy={busy} busyLabel="Guardando aula…"><ArrowRight aria-hidden="true"/>Guardar aula y continuar</AsyncButton>
            <p role="status" aria-live="polite" className={styles.saveStatus}>{autosave === "saved" ? "Tus cambios se guardan automáticamente." : autosave === "pending" || autosave === "saving" ? "Guardando cambios…" : <>{autosaveError} <button type="button" onClick={() => { setAutosave("pending"); setRetry(value => value + 1); }}>Reintentar</button></>}</p>
          </div>
        </section>
      </form>
    </main>
  </div>;
}
