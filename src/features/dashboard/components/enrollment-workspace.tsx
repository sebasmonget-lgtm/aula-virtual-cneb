"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Camera, Check, ChevronDown, ImageIcon, Info, ListPlus, LogOut, Pencil, Plus, Save, Search, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { importPilotStudents, mergeDashboardRoster, loadLocalDashboard, localDatabaseApiUrl, type LocalDashboard, type LocalStudent, type PrivateMediaUpload } from "@/src/lib/local-database";
import { parseStudentCsv, validateStudentsForImport } from "@/src/lib/student-import.mjs";
import { useUnsavedWork } from "@/src/lib/use-unsaved-work";
import { StudentPhoto, uploadStudentPhoto } from "./student-photo";
import { StudentEnrollment } from "./student-enrollment";
import { preparePrivateMedia } from "./media-attachment-input";
import { AsyncButton, WorkflowFeedback } from "./workflow-ui";
import { SaveConfirmation, useSaveConfirmation } from "./save-confirmation";
import shell from "./pilot-setup.module.css";
import styles from "./enrollment-workspace.module.css";

type Form = {firstName:string;lastName:string;birthDate:string};
const empty: Form = {firstName:"",lastName:"",birthDate:""};
const studentForm = (student: LocalStudent): Form => ({firstName:student.first_name ?? "",lastName:student.last_name ?? "",birthDate:student.birth_date ?? ""});
const fullName = (student: LocalStudent) => student.first_name ? `${student.first_name} ${student.last_name ?? ""}`.trim() : student.full_name ?? student.name;
async function mutate(path:string,body:Record<string,unknown>,dashboard?:LocalDashboard):Promise<LocalDashboard> {
  const response=await apiFetch(`${localDatabaseApiUrl}${path}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({...body,compact:Boolean(dashboard)})});
  const result=await response.json() as {dashboard?:LocalDashboard;students?:LocalStudent[];error?:string};
  if(response.ok&&dashboard&&result.students)return mergeDashboardRoster(dashboard,result.students);
  if(!response.ok || !result.dashboard)throw new Error(result.error ?? "No se pudo guardar. Recarga la lista y vuelve a intentarlo.");
  return result.dashboard;
}

export function EnrollmentWorkspace({dashboard,onUpdated,onBack,onContinue,onSignOut}: {
  dashboard:LocalDashboard;onUpdated:(data:LocalDashboard)=>void;onBack:()=>void;onContinue:()=>Promise<void>;onSignOut?:()=>void;
}) {
  const [query,setQuery]=useState("");
  const [editing,setEditing]=useState<LocalStudent|null>(null);
  const [form,setForm]=useState<Form>(empty);
  const [photo,setPhoto]=useState<PrivateMediaUpload|null>(null);
  const [photoBusy,setPhotoBusy]=useState(false);
  const [photoMenu,setPhotoMenu]=useState(false);
  const [revisions,setRevisions]=useState<Record<string,number>>({});
  const [photoRetry,setPhotoRetry]=useState<{id:string;media:PrivateMediaUpload}|null>(null);
  const [busy,setBusy]=useState(false);
  const [action,setAction]=useState("");
  const [error,setError]=useState("");
  const [deleting,setDeleting]=useState<LocalStudent|null>(null);
  const [profileMenu,setProfileMenu]=useState(false);
  const [importOpen,setImportOpen]=useState(false);
  const [csv,setCsv]=useState("");
  const [review,setReview]=useState<ReturnType<typeof validateStudentsForImport>|null>(null);
  const [namesReviewed,setNamesReviewed]=useState(false);
  const fileInput=useRef<HTMLInputElement>(null),cameraInput=useRef<HTMLInputElement>(null),nameInput=useRef<HTMLInputElement>(null),csvInput=useRef<HTMLInputElement>(null);
  const lock=useRef(false);
  const importIntent=useRef<{payload:string;id:string}|null>(null);
  const {confirmation,confirm}=useSaveConfirmation();
  const dirty=JSON.stringify(form)!==JSON.stringify(editing?studentForm(editing):empty)||Boolean(photo)||Boolean(csv.trim());
  const allowLeave=useUnsavedWork(dirty||Boolean(photoRetry),busy||photoBusy);
  const unavailable=busy||photoBusy;
  const students=dashboard.students;
  const visible=students.filter(student=>fullName(student).toLocaleLowerCase("es-PE").includes(query.trim().toLocaleLowerCase("es-PE")));
  const normalized=(name:string)=>name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLocaleLowerCase("es-PE");
  const duplicateNames=(review??[]).map(row=>normalized(`${row.firstName} ${row.lastName}`)).filter((name,index,all)=>all.indexOf(name)!==index || students.some(student=>normalized(fullName(student))===name));

  function reset(){importIntent.current=null;setEditing(null);setForm(empty);setPhoto(null);setPhotoMenu(false);setError("");}
  function edit(student:LocalStudent){if(unavailable||photoRetry||!allowLeave())return;setEditing(student);setForm(studentForm(student));setPhoto(null);setPhotoMenu(false);setError("");nameInput.current?.focus();}
  async function choose(file?:File){if(!file)return;setPhotoBusy(true);setError("");try{setPhoto(await preparePrivateMedia(file,{maxEdge:512,maxBytes:100_000}));setPhotoMenu(false);}catch(cause){setError(cause instanceof Error?cause.message:"No se pudo preparar la foto.");}finally{setPhotoBusy(false);}}
  async function save(useCsv=false){
    if(lock.current||unavailable||photoRetry)return;
    if(useCsv&&(!review?.length||dirty&&Boolean(form.firstName||form.lastName||photo)||duplicateNames.length>0&&!namesReviewed))return;
    lock.current=true;setBusy(true);setAction(useCsv?"import":"save");setError("");
    try {
      const input={students:useCsv?review!.map(row=>({...row,preferredName:row.preferredName??undefined,birthDate:row.birthDate??undefined})):[form]};
      const payload=JSON.stringify(input);
      if(importIntent.current?.payload!==payload)importIntent.current={payload,id:crypto.randomUUID()};
      const next=editing&&!useCsv ? await mutate(`/api/students/${editing.id}/details`,{...form,preferredName:editing.preferred_name??null,expected:{...studentForm(editing),birthDate:editing.birth_date??null,preferredName:editing.preferred_name??null}},dashboard)
        : await importPilotStudents(input,importIntent.current.id,dashboard);
      const savedId=editing?.id ?? next.students.find(student=>!students.some(old=>old.id===student.id))?.id;
      onUpdated(next);
      if(useCsv){setCsv("");setReview(null);setImportOpen(false);setNamesReviewed(false);}else reset();
      let photoSaved=true;
      if(photo&&savedId&&!useCsv){
        try{await uploadStudentPhoto(savedId,photo);setRevisions(value=>({...value,[savedId]:(value[savedId]??0)+1}));}
        catch{photoSaved=false;setPhotoRetry({id:savedId,media:photo});setError("Los datos del niño se guardaron. La foto está pendiente; reintenta guardarla sin añadirlo de nuevo.");}
      }
      importIntent.current=null;
      if(photoSaved)confirm(editing?"¡Datos del niño actualizados!":useCsv?"¡Lista registrada!":"¡Niño añadido!","Registro guardado.");
    }catch(cause){setError(cause instanceof Error?cause.message:"No se pudo guardar al niño.");}
    finally{lock.current=false;setBusy(false);nameInput.current?.focus();}
  }
  async function remove(){
    if(!deleting||lock.current)return;lock.current=true;setBusy(true);setAction("remove");setError("");
    try{onUpdated(await mutate(`/api/students/${deleting.id}/enrollment`,{status:"inactive",expectedStatus:"active"}));if(editing?.id===deleting.id)reset();setDeleting(null);confirm("Niño eliminado de la lista.","Su historial se conserva para recuperarlo.");}
    catch(cause){setError(cause instanceof Error?cause.message:"No se pudo eliminar. Inténtalo de nuevo.");}
    finally{lock.current=false;setBusy(false);}
  }
  async function continueRegistration(){if(lock.current||photoRetry||!allowLeave())return;lock.current=true;setBusy(true);setAction("continue");setError("");try{await onContinue();}catch(cause){setError(cause instanceof Error?cause.message:"No se pudo continuar. Inténtalo de nuevo.");}finally{lock.current=false;setBusy(false);}}
  const teacherName=dashboard.profile.teacher_name;
  return <div className={`${shell.page} ${styles.page}`} data-ayni-screen="enrollment">
    <header className={shell.topbar}><div className={styles.topbarInner}>
      <div className={styles.brand}><span className={styles.brandSymbol}><svg aria-hidden="true" viewBox="0 0 48 40" width={40} height={36}><circle cx="24" cy="8" r="6" fill="white"/><circle cx="9" cy="14" r="4.5" fill="#ffd357"/><circle cx="39" cy="14" r="4.5" fill="#ffd357"/><path d="M16 39V24a8 8 0 0 1 16 0v15h-6V29h-4v10ZM1 34V26a8 8 0 0 1 13-6v16H8v-8H6v6ZM47 34V26a8 8 0 0 0-13-6v16h6v-8h2v6Z" fill="white"/></svg></span><div><strong>Ayni Aula</strong><small>Tu aliada en Inicial</small></div></div>
      <div className={styles.account}><button type="button" disabled={unavailable} aria-expanded={profileMenu} onClick={()=>setProfileMenu(value=>!value)}><span className={styles.avatar}>{teacherName.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join("")}</span><span>{teacherName}</span><ChevronDown size={18}/></button>{profileMenu&&<div className={styles.accountMenu}><button type="button" onClick={()=>{if(allowLeave())onBack();}}>Datos del colegio y aula</button>{onSignOut&&<button type="button" onClick={()=>{if(allowLeave())onSignOut();}}><LogOut size={17}/>Cerrar sesión</button>}</div>}</div>
    </div></header>
    <main className={`${shell.content} ${styles.content}`}>
      <div className={`${shell.intro} ${styles.intro}`}>
        <button type="button" className={styles.backLink} disabled={unavailable} onClick={()=>{if(allowLeave())onBack();}}><ArrowLeft size={18}/>Volver</button>
        <h1>Añade a tus niños</h1><p>Registra a los niños de tu aula. Puedes <strong>añadirlos</strong> uno por uno o varios a la vez.</p>
        <Image className={`${shell.illustration} ${styles.illustration}`} src="/ayni-classroom-welcome.png" alt="" width={1536} height={1024} sizes="440px" preload/>
        <ol className={`${shell.steps} ${styles.steps}`} aria-label="Preparación de tu aula">{["Configura tu aula","Añade a tus niños","Entrevistas y observaciones","Prepara Mi año con Ayni"].map((label,index)=><li key={label} aria-current={index===1?"step":undefined} className={index===0?styles.completed:undefined}><span>{index===0?<Check size={22} aria-label="Completado"/>:index+1}</span><span>{label}</span></li>)}</ol>
      </div>
      <div className={styles.columns}>
        <section className={`${shell.card} ${styles.listCard}`} aria-labelledby="registered-children-title">
          <div className={styles.listHeading}><span className={shell.classroomIcon}><Users size={32} aria-hidden="true"/></span><div><h2 id="registered-children-title">Niños registrados ({students.length})</h2><p>Aquí aparecen los niños registrados.</p><p className={styles.hint}><Info size={17} aria-hidden="true"/>Usa editar para cambiar foto, nombre o fecha de nacimiento.</p></div><label className={styles.search}><Search size={21} aria-hidden="true"/><span className="sr-only">Buscar niño o niña</span><Input placeholder="Buscar niño o niña…" value={query} onChange={event=>setQuery(event.target.value)}/></label></div>
          <div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>Foto</th><th>Nombre completo</th><th>Acciones</th></tr></thead><tbody>{visible.map(student=><tr key={student.id} data-selected={editing?.id===student.id||undefined}><td><StudentPhoto id={student.id} name={fullName(student)} revision={revisions[student.id]??0} className={styles.studentPhoto}/></td><th scope="row">{fullName(student)}{editing?.id===student.id&&<span className={styles.editingBadge}>Editando</span>}</th><td><div className={styles.actions}><button type="button" disabled={unavailable||Boolean(photoRetry)} aria-label={`Editar a ${fullName(student)}`} onClick={()=>edit(student)}><Pencil size={24}/></button><button type="button" disabled={unavailable||Boolean(photoRetry)} aria-label={`Eliminar a ${fullName(student)}`} onClick={()=>{setError("");setDeleting(student);}}><Trash2 size={24}/></button></div></td></tr>)}</tbody></table>{!visible.length&&<div className={styles.empty}><Users size={38} aria-hidden="true"/><p>{students.length?"No encontramos niños con ese nombre.":"Aún no has añadido niños."}</p><small>{students.length?"Prueba con otro nombre.":"Añade el primero con el formulario de al lado."}</small></div>}</div>
          <div className={styles.listTools}><Button type="button" variant="outline" disabled={unavailable||Boolean(editing)||Boolean(photoRetry)} aria-expanded={importOpen} onClick={()=>setImportOpen(value=>!value)}><ListPlus size={17}/>Importar lista</Button><StudentEnrollment disabled={unavailable||Boolean(editing)||Boolean(photoRetry)} onSaved={async()=>{onUpdated(await loadLocalDashboard());}}/></div>
          {importOpen&&<section className={styles.importPanel} aria-label="Importar lista de niños"><label>Lista de niños en CSV<Textarea disabled={unavailable} value={csv} onChange={event=>{setCsv(event.target.value);setReview(null);setNamesReviewed(false);}} placeholder={'first_name,last_name,preferred_name,birth_date\nMaría,López,,2021-05-14'}/></label><p>Hasta 40 niños. Columnas: first_name,last_name,preferred_name; birth_date es opcional (AAAA-MM-DD).</p><input ref={csvInput} hidden type="file" accept=".csv,text/csv" onChange={event=>{const file=event.target.files?.[0];if(!file)return;if(file.size>20000){setError("El archivo CSV admite hasta 20 KB.");return;}void file.text().then(value=>{setCsv(value);setReview(null);setNamesReviewed(false);}).catch(()=>setError("No se pudo leer el CSV."));event.target.value="";}}/><div><Button type="button" variant="outline" disabled={unavailable} onClick={()=>csvInput.current?.click()}>Seleccionar CSV</Button><Button type="button" variant="outline" disabled={unavailable||!csv.trim()} onClick={()=>{try{setReview(validateStudentsForImport(parseStudentCsv(csv)));setNamesReviewed(false);setError("");}catch(cause){setError(cause instanceof Error?cause.message:"Revisa la lista.");}}}>Revisar lista antes de añadir</Button></div>{review&&<><ul>{review.map((row,index)=><li key={index}>{row.firstName} {row.lastName}<button type="button" disabled={unavailable} onClick={()=>{setReview(review.filter((_,i)=>i!==index));setNamesReviewed(false);}}>Quitar</button></li>)}</ul>{duplicateNames.length>0&&<label className={styles.duplicate}><input type="checkbox" checked={namesReviewed} onChange={event=>setNamesReviewed(event.target.checked)}/>Revisé los nombres repetidos y confirmo que son niños diferentes.</label>}<AsyncButton busy={busy&&action==="import"} busyLabel="Importando…" disabled={unavailable||!review.length||duplicateNames.length>0&&!namesReviewed||Boolean(form.firstName||form.lastName||photo)} onClick={()=>void save(true)}>Añadir {review.length} {review.length===1?"niño":"niños"}</AsyncButton></>}</section>}
        </section>
        <section className={`${shell.card} ${styles.editor}`} data-editing={Boolean(editing)} aria-labelledby="student-editor-title">
          {editing&&<p className={styles.editingMode} role="status">Modo edición</p>}<div className={styles.editorHeading}><span className={shell.classroomIcon}>{editing?<Pencil size={31} aria-hidden="true"/>:<Plus size={36} aria-hidden="true"/>}</span><div><h2 id="student-editor-title">{editing?`Editar información de ${fullName(editing)}`:"Añadir un niño"}</h2><p>{editing?"Estás editando un registro existente. Guarda los cambios cuando termines.":"Completa la información del nuevo niño o niña."}</p></div></div>
          <form onSubmit={event=>{event.preventDefault();void save();}}>
            <div className={styles.photoRow}>{photo?<Image unoptimized src={`data:${photo.mimeType};base64,${photo.base64}`} alt="Foto seleccionada" width={120} height={120} className={styles.previewPhoto}/>:editing&&<StudentPhoto id={editing.id} name={fullName(editing)} revision={revisions[editing.id]??0} className={styles.previewPhoto}/>}<div className={styles.photoControl}><button type="button" disabled={unavailable||Boolean(photoRetry)} aria-expanded={photoMenu} onClick={()=>setPhotoMenu(value=>!value)}><Camera size={30}/><span>{editing||photo?"Cambiar foto":"Añadir foto"}</span></button>{photoMenu&&<div className={styles.photoMenu}><button type="button" onClick={()=>cameraInput.current?.click()}><Camera size={22}/>Tomar foto</button><button type="button" onClick={()=>fileInput.current?.click()}><ImageIcon size={22}/>Subir imagen</button></div>}</div>{photo&&<button className={styles.clearPhoto} type="button" disabled={unavailable} onClick={()=>setPhoto(null)}>Quitar foto seleccionada</button>}</div>
            <input ref={fileInput} hidden type="file" accept="image/jpeg,image/png,image/webp" disabled={unavailable} onChange={event=>{void choose(event.target.files?.[0]);event.target.value="";}}/><input ref={cameraInput} hidden type="file" capture="user" accept="image/jpeg,image/png,image/webp" disabled={unavailable} onChange={event=>{void choose(event.target.files?.[0]);event.target.value="";}}/>
            {photoBusy&&<p role="status">Preparando foto…</p>}
            <div className={shell.fields}><label htmlFor="enrollment-first-name">Nombres <span className={shell.required} aria-hidden="true">*</span><Input id="enrollment-first-name" ref={nameInput} required minLength={2} maxLength={80} disabled={unavailable||Boolean(photoRetry)} placeholder="Ej. Mariana Valentina" autoComplete="off" value={form.firstName} onChange={event=>{const value=event.target.value;setForm(current=>({...current,firstName:value}));}}/></label><label htmlFor="enrollment-last-name">Apellidos <span className={shell.required} aria-hidden="true">*</span><Input id="enrollment-last-name" required minLength={2} maxLength={80} disabled={unavailable||Boolean(photoRetry)} placeholder="Ej. Monge Tovar" autoComplete="off" value={form.lastName} onChange={event=>{const value=event.target.value;setForm(current=>({...current,lastName:value}));}}/></label><label className={shell.full} htmlFor="enrollment-birth-date">Fecha de nacimiento <span className={shell.optional}>(opcional)</span><Input id="enrollment-birth-date" type="date" min="2000-01-01" max={new Date().toISOString().slice(0,10)} disabled={unavailable||Boolean(photoRetry)} value={form.birthDate} onInput={event=>{const value=event.currentTarget.value;setForm(current=>({...current,birthDate:value}));}} onChange={event=>{const value=event.target.value;setForm(current=>({...current,birthDate:value}));}}/></label></div>
            <AsyncButton type="submit" busy={busy&&action==="save"} busyLabel="Guardando…" className={`${shell.primary} ${styles.save}`} disabled={unavailable||Boolean(photoRetry)||form.firstName.trim().length<2||form.lastName.trim().length<2}>{editing?<Save size={22}/>:<Plus size={23}/>} {editing?"Guardar cambios":"Agregar niño"}</AsyncButton>
            {editing&&<button type="button" className={styles.cancelEdit} disabled={unavailable} onClick={reset}>Cancelar edición</button>}
          </form>
          {error&&!deleting&&<WorkflowFeedback tone="error">{error}</WorkflowFeedback>}
          {photoRetry&&<div className={styles.retry}><AsyncButton busy={busy&&action==="photo"} busyLabel="Guardando foto…" disabled={unavailable} variant="outline" onClick={()=>{setBusy(true);setAction("photo");void uploadStudentPhoto(photoRetry.id,photoRetry.media).then(()=>{setRevisions(value=>({...value,[photoRetry.id]:(value[photoRetry.id]??0)+1}));setPhotoRetry(null);setError("");confirm("¡Foto guardada!");}).catch(()=>setError("La foto sigue pendiente. Inténtalo de nuevo.")).finally(()=>setBusy(false));}}>Reintentar guardar foto</AsyncButton><Button variant="ghost" disabled={unavailable} onClick={()=>{setPhotoRetry(null);setError("");}}>Continuar sin esta foto</Button></div>}
        </section>
      </div>
      <footer className={`${shell.card} ${styles.footer}`}><Button type="button" variant="outline" disabled={unavailable} onClick={()=>{if(allowLeave())onBack();}}><ArrowLeft/>Volver</Button><AsyncButton busy={busy&&action==="continue"} busyLabel="Continuando…" className={shell.primary} disabled={unavailable||!students.length||dirty||Boolean(photoRetry)} onClick={()=>void continueRegistration()}>Continuar a entrevistas y observaciones<ArrowRight/></AsyncButton></footer>
      <SaveConfirmation confirmation={confirmation}/>
    </main>
    <AlertDialog open={Boolean(deleting)} onOpenChange={open=>{if(!open&&!busy)setDeleting(null);}}><AlertDialogContent><AlertDialogTitle>¿Eliminar a {deleting?fullName(deleting):"este niño"} de la lista?</AlertDialogTitle><AlertDialogDescription>El niño y su historial quedarán ocultos hasta que lo recuperes.</AlertDialogDescription>{error&&<WorkflowFeedback tone="error">{error}</WorkflowFeedback>}<AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel><AsyncButton busy={busy&&action==="remove"} busyLabel="Eliminando…" disabled={busy} onClick={()=>void remove()}>Confirmar eliminación</AsyncButton></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
