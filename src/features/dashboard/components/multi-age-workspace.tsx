"use client";
import {ProjectZipDownload} from './project-zip-download';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react';
import { BookOpen, CalendarDays, ClipboardCheck, Home, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { multiAgeAppRequest as api, multiAgeDownloadUrl, annualActivityBlueprint } from '@/src/lib/multi-age-app-client';
import type { ActivityBlueprint, AnnualPlan, AnnualProposal, AssessmentContext, DiagnosticChild, DiagnosticFinding, MultiAgeAppState, MultiAgeProject, Opportunity } from '@/src/lib/multi-age-app-types';
import { MultiAgeGenerationControl } from './multi-age-generation-control';
import { MultiAgeConversation } from './multi-age-conversation';
import { MultiAgePeriodConsolidated } from './multi-age-period-consolidated';
import { MultiAgeCorrections } from './multi-age-corrections';
import { MultiAgeProjectEdit } from './multi-age-project-edit';
import { MultiAgeAnnualReorder } from './multi-age-annual-reorder';
import {MultiAgeFamilyQuestionnaire} from './multi-age-family-questionnaire';
import {MultiAgeGroupDiagnostic,SavedGroupDiagnostic} from './multi-age-group-diagnostic';
import { GeneratorDocuments } from './generator-documents';
import { GeneratorEnrollment } from './generator-enrollment';
import { GeneratorSetup } from './generator-setup';
import {GeneratorProjectWorkspace} from './generator-project-workspace';
import {GeneratorActivityGuide} from './generator-activity-guide';
import { GeneratorAnnualWorkspace } from './generator-annual-workspace';
import {MultiAgeWorkshops,MultiAgeWorkshopResources} from './multi-age-workshops';
import {MultiAgeYearTransition} from './multi-age-year-transition';
import {MultiAgeCalendarFields,multiAgeCalendarFormData} from './multi-age-calendar-fields';
import { PageIntro, WorkflowFeedback, WorkflowTabs } from './workflow-ui';
import { TeacherWorkspaceFrame } from './teacher-workspace-frame';
import { AnnualCompactTimeline } from './annual-compact-timeline';
import type { AnnualMapRow } from './annual-year-map';
import { DocumentTree, type TreeDocument } from './document-tree';
import {MultiAgeSavedProject,type SavedMultiAgeProjectDocument} from './multi-age-saved-project';
import { PreparationSteps } from './preparation-steps';
import setupStyles from './pilot-setup.module.css';
import { PeriodEvaluationNavigation } from './period-evaluation-navigation';
import { useWorkspaceSubview } from '@/src/lib/workspace-location';
import { ActivityReadingView } from './activity-reading-view';
import type { OpenDocument } from './documents-screen';
import styles from './multi-age-workspace.module.css';

type Run = (path: string, input: Record<string, unknown>) => Promise<boolean>;
type Workspace = NonNullable<MultiAgeAppState['workspace']>;
type AIMode = 'off'|'fixture'|'openai';
function canReviewProposal(element:HTMLElement|null){if(!element?.querySelector('form[data-dirty="true"]'))return true;return window.confirm('Tienes cambios sin guardar. ¿Quieres sustituirlos por la propuesta guardada para revisarla?');}
const tabs = [['mi-ano','Mi año',CalendarDays],['hoy','Hoy',Home],['calendario','Calendario',CalendarDays],['evaluar','Evaluar',ClipboardCheck],['documentos','Documentos',BookOpen],['aula','Aula',Users],['diagnostico','Diagnóstico',Users],['perfil','Perfil',Users],['biblioteca','Biblioteca',BookOpen]] as const;
const generatorNav=[['Mi año','Mi año',CalendarDays],['Documentos','Documentos',BookOpen],['Biblioteca','Biblioteca',BookOpen]] as const;
type View = typeof tabs[number][0];
const evaluationViews=['student','family','consolidated'] as const;
function subscribeView(callback: () => void) { window.addEventListener('hashchange', callback); window.addEventListener('popstate', callback); return () => { window.removeEventListener('hashchange', callback); window.removeEventListener('popstate', callback); }; }
function viewSnapshot(): View { return tabs.find(([id]) => '#' + id === window.location.hash.split('?')[0])?.[0] ?? 'aula'; }
const formValue = (data: FormData, key: string) => String(data.get(key) ?? '').trim();
const confirmed = { teacherConfirmed: true };
function canChangeForm(target: HTMLSelectElement) {
  const form = target.closest('form') ?? target.closest('section')?.querySelector<HTMLFormElement>('form[data-dirty="true"]');
  if (form?.dataset.dirty !== 'true') return true;
  if (!window.confirm('Hay cambios sin guardar en este formulario. ¿Quieres descartarlos y cambiar la selección?')) return false;
  form.reset(); form.dataset.dirty = 'false'; return true;
}

function Field({ label, name, value, type = 'text', required = true, hint, maxLength = 1500,min,max }: { label: string; name: string; value?: string; type?: string; required?: boolean; hint?: string; maxLength?: number;min?:string;max?:string }) {
  return <label className={styles.field}><span>{label}</span>{type === 'textarea' ? <Textarea name={name} defaultValue={value} required={required} maxLength={maxLength} /> : <Input name={name} type={type} defaultValue={value} required={required} maxLength={maxLength} min={min} max={max} />}{hint && <small>{hint}</small>}</label>;
}
function Select({ label, name, value = '', children }: { label: string; name: string; value?: string; children: ReactNode }) {
  return <label className={styles.field}><span>{label}</span><select name={name} defaultValue={value} required>{children}</select></label>;
}
function Check({ name, children }: { name: string; children: ReactNode }) { return <label className={styles.check}><input type="checkbox" name={name} required />{children}</label>; }
function SaveForm({ children, save, label, afterSave }: { children: ReactNode; save: (data: FormData) => Promise<boolean>; label: string; afterSave?: () => void }) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget;
    if (await save(new FormData(form))) { form.dataset.dirty = 'false'; afterSave?.(); }
  }
  return <form onSubmit={event => void submit(event)} onChangeCapture={event => {
    const target = event.target;
    if ((target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) && target.name) event.currentTarget.dataset.dirty = 'true';
  }}>{children}<div className={styles.actions}><Button type="submit" className="min-h-11">{label}</Button></div></form>;
}

export function MultiAgeWorkspace({ onSignOut, onBackToChoice, documentsOnly=false }: { documentsOnly?:boolean; onSignOut?: () => void; onBackToChoice?: () => void }) {
  const [state, setState] = useState<MultiAgeAppState | null>(null), [error, setError] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false);
  const guard = useRef(false), root = useRef<HTMLDivElement>(null);
  const [projectSlot,setProjectSlot]=useState<string|null>(null),[lastProjectSlot,setLastProjectSlot]=useState<string|null>(null),[conversationEntry,setConversationEntry]=useState(false),[yearVisit,setYearVisit]=useState(0),[documentsVisit,setDocumentsVisit]=useState(0);
  const requestedView = useSyncExternalStore(subscribeView, viewSnapshot, () => 'aula' as View);
  const view = documentsOnly&&['hoy','calendario','evaluar','diagnostico'].includes(requestedView)?'mi-ano':requestedView;
  const refresh = useCallback(async () => { setState(await api<MultiAgeAppState>('/state')); }, []);
  useEffect(() => {
    let live = true; api<MultiAgeAppState>('/state').then(value => { if (live) setState(value); }).catch(cause => { if (live) setError(cause.message); });
    const leave = (event: BeforeUnloadEvent) => { if (root.current?.querySelector('form[data-dirty="true"]')) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', leave);
    return () => { live = false; window.removeEventListener('beforeunload', leave); };
  }, []);
  const run: Run = async (path, input) => {
    if (guard.current) return false;
    guard.current = true; setBusy(true); setError(''); setNotice(''); let saved = false;
    try { await api(path, input); saved = true; await refresh(); setNotice(state?.capabilities?.storage==='postgres-tenant'?'Guardado. Puedes salir y volver a entrar.':state?.capabilities?.storage==='persistent-local'?'Guardado en la base local de prueba. Puedes salir y volver.':'Guardado. Puedes continuar o volver más tarde mientras el servidor esté abierto.'); return true; }
    catch (cause) { setError((saved ? 'El cambio se guardó, pero la pantalla no pudo actualizarse. Pulsa Actualizar. ' : '') + (cause instanceof Error ? cause.message : 'No se pudo guardar.')); return saved; }
    finally { guard.current = false; setBusy(false); }
  };
  function navigate(next: View) { window.history.pushState(null, '', '#' + next); window.dispatchEvent(new Event('hashchange')); }
  const w = state?.workspace;
  const initialRouteResolved=useRef(false);
  useEffect(()=>{if(!state||initialRouteResolved.current)return;initialRouteResolved.current=true;if(documentsOnly&&w?.students.length&&!window.location.hash){window.history.replaceState(null,'','#mi-ano');window.dispatchEvent(new Event('hashchange'));}},[documentsOnly,state,w?.students.length]);
  const selectedNavigation=tabs.find(([id])=>id===view)?.[1]??'Aula';
  const today=new Intl.DateTimeFormat('es-PE',{weekday:'long',day:'numeric',month:'long',timeZone:'America/Lima'}).format(new Date());
  const navigatePrimary=(destination:string)=>{const next=tabs.find(([,label])=>label===destination);if(next){if(documentsOnly&&next[0]==='mi-ano'){setProjectSlot(null);setConversationEntry(false);setYearVisit(n=>n+1);}if(documentsOnly&&next[0]==='documentos')setDocumentsVisit(n=>n+1);navigate(next[0]);}};
  if(documentsOnly&&state&&!w)return <GeneratorSetup onSaved={async()=>{navigate('aula');await refresh();}} onSignOut={onSignOut} onBack={onBackToChoice}/>;
  if(documentsOnly&&w&&view==='aula')return <GeneratorEnrollment w={w} onRefresh={refresh} onContinue={()=>{setConversationEntry(true);navigate('mi-ano');}} onBack={()=>navigate('perfil')} onSignOut={onSignOut}/>;
  return <div className={styles.workspace} ref={root}>
    <TeacherWorkspaceFrame documentsOnly={documentsOnly} {...(documentsOnly?{items:generatorNav,mobileItems:generatorNav}:{})} preparing={!w} selectedNavigation={selectedNavigation} active={selectedNavigation} today={today} navigatePrimary={navigatePrimary}
      profile={w?{section:w.classroom.section,age_label:w.classroom.ages.join(', ')+' años',school_year:w.classroom.year,institution_name:w.classroom.institution_name}:null} metrics={{students_total:w?.students.length??0}}
      headerActions={<><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline"><Users className="size-4"/>Mi aula</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem className="min-h-11 cursor-pointer" onSelect={()=>navigate('aula')}>Niños y familias</DropdownMenuItem><DropdownMenuItem className="min-h-11 cursor-pointer" onSelect={()=>navigate('perfil')}>Configuración</DropdownMenuItem></DropdownMenuContent></DropdownMenu><button type="button" title="Abrir perfil" aria-label="Abrir perfil" onClick={()=>navigate('perfil')} className="grid size-11 place-items-center rounded-full bg-[#d9eaf4] text-sm font-bold text-[#155a78] hover:bg-[#c4e3f0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087d96]">{w?.classroom.teacher_name?.split(' ').map(p=>p[0]).slice(0,2).join('')||'D'}</button></>}>
    <div className={styles.content}>
      {(!documentsOnly||state?.capabilities?.ai!=='openai')&&<p className={styles.muted}>Prueba local con datos ficticios. {state?.capabilities?.storage==='persistent-local'?'Los datos se conservan en una base local separada al reiniciar.':'Base temporal: los datos se pierden al detener el servidor.'} {state?.capabilities?.ai==='fixture'?'Asistencia simulada, sin llamadas a IA.':state?.capabilities?.ai==='openai'?'Asistencia de IA habilitada; las propuestas requieren tu revisión.':'Preparación manual.'}</p>}
      {error && <WorkflowFeedback tone="error">{error} <Button variant="outline" onClick={() => void refresh().then(() => setError('')).catch(cause => setError(cause.message))}>Actualizar</Button></WorkflowFeedback>}
      {notice && <WorkflowFeedback tone="success">{notice}</WorkflowFeedback>}
      {busy && <p role="status" className={styles.notice}>Guardando y comprobando las fuentes…</p>}
      {!state ? <p role="status">Cargando tu aula…</p> : <fieldset disabled={busy} className="min-w-0 border-0 p-0">
        {!w ? <Setup documentsOnly={documentsOnly} run={run} back={onBackToChoice} /> : <>
          <div hidden={view !== 'aula'}><PageIntro title="Mi aula" description="Tus niños y sus registros" icon={Users} illustration="/ayni-classroom-welcome.png"/><div className="mt-5">{!documentsOnly&&<WorkflowTabs id="multi-age-classroom" label="Secciones de Mi aula" value="children" onChange={value=>{if(value==='diagnostic')navigate('diagnostico');}} tabs={[{id:'children',label:'Niños y familias'},{id:'diagnostic',label:'Entrevistas y observaciones'}]}/>}</div><Enrollment w={w} run={run} />{documentsOnly&&<Button className="mt-5" disabled={!w.students.length} onClick={()=>navigate('mi-ano')}>Conversar con Ayni</Button>}</div>
          {!documentsOnly&&<div hidden={view !== 'diagnostico'}><PageIntro title="Entrevistas y observaciones" description="Seguimos conociendo a nuestros niños y sus familias." icon={Users}/><div className="my-5"><WorkflowTabs id="multi-age-diagnostic" label="Secciones de Mi aula" value="diagnostic" onChange={value=>{if(value==='children')navigate('aula');}} tabs={[{id:'children',label:'Niños y familias'},{id:'diagnostic',label:'Entrevistas y observaciones'}]}/></div><p>Al elegir al niño se muestran las orientaciones de su edad. Lo que cuenta la familia se guarda separado de lo observado en el aula.</p>
            {state.diagnostic?.groups.map(g => <p key={g.age} className={styles.muted}>{g.age} años: {g.reviewed} de {g.enrolled} revisiones vigentes.</p>)}
            {state.diagnostic?.groupReview&&<MultiAgeGroupDiagnostic state={state.diagnostic.groupReview} run={run}/>}
            {!w.students.length && <p className={styles.notice}>Matricula a los niños en Mi aula para comenzar.</p>}
            {state.diagnostic?.students.map(child => <Diagnostic key={`${child.id}-${child.assignmentId}-${child.sourceFingerprint}-${child.review?.version??0}`} child={child} classroomId={w.classroom.id} aiMode={state.capabilities?.ai??'off'} startsOn={w.students.find(s=>s.id===child.id)?.enrolled_on??w.periods[0]?.starts_on??w.classroom.starts_on} run={run} />)}<p className="mt-5 text-sm">Para corregir o retirar una observación y consultar sus versiones, abre <Button variant="link" onClick={()=>navigate('aula')}>Niños y familias → Corregir y ver historial</Button>.</p></div>}
          <div hidden={view !== 'mi-ano'}>{!documentsOnly&&<PageIntro title="Mi año" description="Conocemos al grupo y preparamos oportunidades para seguir aprendiendo." icon={CalendarDays}/>}
            {documentsOnly&&projectSlot&&<Button variant="outline" className="mb-5" onClick={()=>{setProjectSlot(null);setConversationEntry(false);}}>← Volver a Mi año</Button>}
            {state.planningUnavailable && <p role="alert" className={styles.notice}>{state.planningUnavailable}</p>}
            {state.planning && (documentsOnly?!projectSlot&&<GeneratorAnnualWorkspace key={yearVisit} initialSlotId={lastProjectSlot} initialConversation={conversationEntry} planning={state.planning} w={w} aiMode={state.capabilities?.ai??'off'} onDecision={refresh} onPrepareProject={id=>{setConversationEntry(false);setLastProjectSlot(id);setProjectSlot(id);}}/>:<Annual key={state.planning.plans.find(p => p.status === 'draft')?.revision ?? state.planning.plans.find(p => p.status === 'active')?.id ?? 'new'} planning={state.planning} aiMode={state.capabilities?.ai??'off'} documentsOnly={documentsOnly} diagnosticReady={documentsOnly||Boolean(state.diagnostic?.ready)} w={w} run={run} onDecision={refresh} />)}
            {documentsOnly&&projectSlot&&state.planning&&<GeneratorProjectWorkspace key={projectSlot} w={w} planning={state.planning} slotId={projectSlot} aiMode={state.capabilities?.ai??'off'} onRefresh={refresh} onDocuments={()=>{setDocumentsVisit(n=>n+1);navigate('documentos');}}/>}
            {state.planning?.plans.find(p => p.status === 'active') && !documentsOnly && <ActivityEditor documentsOnly={documentsOnly} initialSlotId={projectSlot??undefined} planning={state.planning} aiMode={state.capabilities?.ai??'off'} w={w} run={run} onDecision={refresh} />}</div>
          <div hidden={view !== 'hoy'}><PageIntro title="Hoy" description="Tu jornada, actividades y observaciones." icon={Home}/><ActivityReader w={w} run={run} /><MultiAgeWorkshops w={w} run={run}/></div>
          <div hidden={view !== 'calendario'}><PageIntro title="Calendario" description="Tu año, proyectos y actividades." icon={CalendarDays}/><p>Las edades del aula comparten las fechas de Mi año. Preparar una actividad no confirma una actuación infantil.</p>
            {state.planning?.calendar.projects.map((slot, index) => <section className={`${styles.panel} ayni-panel space-y-5 p-5 sm:p-6`} key={slot.slot_id}><h2 className="text-xl font-extrabold text-[#172b52]">Tramo {index + 1}</h2><p>{slot.starts_on} a {slot.ends_on}</p>{w.activities.filter(a => slot.instructional_dates.includes(a.occurs_on)).map(a => <p key={a.id}>{a.occurs_on} · {a.title} · Preparada</p>)}</section>)}
          </div>
          <div hidden={view !== 'evaluar'}><Evaluation w={w} run={run} /></div>
          <div hidden={view !== 'documentos'}>{documentsOnly?<GeneratorDocuments initialSection={state.documents.length?'saved':'formats'} key={String(documentsVisit)+':'+String(Boolean(state.documents.length))+':'+w.students.map(s=>[s.id,s.first_name,s.last_name,s.age].join(":")).join("|")}><MultiAgeDocuments state={state} w={w} generatorMode/></GeneratorDocuments>:<MultiAgeDocuments state={state} w={w}/>}</div>{documentsOnly&&view==='biblioteca'&&<GeneratorDocuments library/>}
          <div hidden={view !== 'perfil'}><PageIntro title="Configuración" description="Datos de tu colegio y tu aula." icon={Users}/><section className={`${styles.panel} ayni-panel space-y-5 p-5 sm:p-6`}><h2 className="text-xl font-extrabold text-[#172b52]">{w.classroom.institution_name}</h2><p>{w.classroom.teacher_name}</p><p>{w.classroom.section} · {w.classroom.year} · Unidocencia · {w.classroom.ages.join(', ')} años</p><p>La modalidad y los grupos se conservan con su año. Al abrir otro año se revisan nuevamente la matrícula y el calendario.</p>{onSignOut&&<Button variant="outline" onClick={onSignOut}>Cerrar sesión</Button>}</section><MultiAgeYearTransition key={w.classroom.id} w={w} run={run}/></div>
        </>}
      </fieldset>}
    </div>
    </TeacherWorkspaceFrame>
  </div>;
}

function Setup({ run, back, documentsOnly=false }: { documentsOnly?:boolean; run: Run; back?: () => void }) {
  return <section className="space-y-5 text-[#143573]"><div className={setupStyles.intro}><h1>Crea tu salón</h1><p>Completa estos datos una sola vez para empezar a usar Ayni con tu grupo.</p><PreparationSteps documentsOnly={documentsOnly} current={1} onSelect={()=>{}}/></div>
    <SaveForm label="Confirmar aula con Unidocencia" save={data => run('/classroom', { ...confirmed, teachingMode: 'single_teacher_multi_age', teacherName: formValue(data,'teacher'), section: formValue(data,'section'), institutionName: formValue(data,'institution'), ages: data.getAll('age').map(Number), ...multiAgeCalendarFormData(data,'setup-') })}>
      <section className={setupStyles.card}><h2 className="text-2xl font-extrabold">Datos del colegio</h2><p className="mt-2 text-sm text-[#526b87]">Estos datos se usarán para personalizar tus documentos.</p><Field name="institution" label="Institución educativa" maxLength={200}/></section>
      <section className={`${setupStyles.card} mt-5`}><h2 className="text-2xl font-extrabold">Datos de tu aula</h2><p className="mt-2 text-sm text-[#526b87]">Unidocencia: una profesora acompaña a niños de varias edades.</p>
      <Field name="teacher" label="Nombre de la profesora" maxLength={100} />
      <Field name="section" label="Nombre del aula" maxLength={80} />
      <fieldset><legend className="font-semibold">Edades atendidas · elige al menos dos</legend>{[3,4,5].map(age => <label key={age} className={styles.check}><input type="checkbox" name="age" value={age} />{age} años</label>)}</fieldset>
      <MultiAgeCalendarFields prefix="setup-"/><p className={styles.muted}>No se calcula la matrícula a partir del cumpleaños.</p>
      <Check name="confirm">Confirmo la modalidad y los grupos que atiendo.</Check>
      </section>
    </SaveForm>{back && <Button variant="outline" className="mt-4" onClick={back}>Volver a elegir modalidad</Button>}
  </section>;
}
function Enrollment({ w, run }: { w: Workspace; run: Run }) {
  const form = useRef<HTMLDivElement>(null);
  return <><p className="mt-5">El grupo curricular se confirma por niño. La fecha de nacimiento es opcional y un cumpleaños no cambia su grupo automáticamente.</p>
    <ul className={styles.roster}>{w.students.map(s => <li key={s.id}><strong>{s.first_name} {s.last_name}</strong><p>{s.age} años{s.birth_date ? ` · Nacimiento: ${s.birth_date}` : ''}{s.enrolled_on?` · Ingreso: ${s.enrolled_on}`:''}</p><MultiAgeCorrections student={s} ages={w.classroom.ages} revision={w} run={run}/></li>)}</ul>
    <section className={`${styles.panel} ayni-panel space-y-5 p-5 sm:p-6`} ref={form}><h2 className="text-xl font-extrabold text-[#172b52]">Matricular a un niño</h2><SaveForm label="Confirmar matrícula y grupo" afterSave={() => form.current?.querySelector('form')?.reset()} save={data => run('/enroll', { ...confirmed, classroomId: w.classroom.id, expectedRevision: w.classroom.curriculum_revision, firstName: formValue(data,'first'), lastName: formValue(data,'last'), birthDate: formValue(data,'birth'), enrolledOn:formValue(data,'enrolled'), age: Number(data.get('age')) })}>
      <div className={styles.fields}><Field name="first" label="Nombres" maxLength={80} /><Field name="last" label="Apellidos" maxLength={80} /></div>
      <Field name="enrolled" label="Fecha de ingreso al aula" type="date" value={w.periods.find(p=>!p.closed)?.starts_on??w.classroom.starts_on} min={w.classroom.starts_on} max={w.classroom.ends_on}/><p className={styles.muted}>Solo se incluyen bimestres desde su ingreso. Revisa esta fecha si se incorpora durante el año.</p>
      <div className={styles.fields}><Select label="Grupo curricular" name="age"><option value="">Selecciona una edad</option>{w.classroom.ages.map(age => <option key={age} value={age}>{age} años</option>)}</Select><Field name="birth" label="Fecha de nacimiento (opcional)" type="date" required={false} /></div>
    </SaveForm></section></>;
}

type SavedMultiAgeDocument={kind:string;identity:{student_name?:string;teacher_name:string;institution_name:string;section:string};content:Partial<AnnualProposal>&{readings?:import('@/src/lib/multi-age-app-types').GroupDiagnosticReading[];groups?:{age:number;enrolled:number;reviewed:number}[];familyContexts?:{studentId:string;studentName:string;age:number;text:string}[];findings?:{competency_id:string;teacher_reading:string}[];pendingCompetencyIds?:string[]};sourceSnapshot:{observations?:{id:string;observation_text:string}[];family?:{details:{family_text:string}}|null}};
function MultiAgeDocuments({state,w,generatorMode=false}:{state:MultiAgeAppState;w:Workspace;generatorMode?:boolean}){
  const [selected,setSelected]=useState<TreeDocument|null>(null),[document,setDocument]=useState<SavedMultiAgeDocument|null>(null),[projectDocument,setProjectDocument]=useState<SavedMultiAgeProjectDocument|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false);
  const requestId=useRef(0);
  const items:TreeDocument[]=[...state.documents.map(d=>({id:d.id,kind:['diagnostic_student_review','diagnostic_group_review'].includes(d.kind)?'diagnostic_summary':d.kind==='project'?'experience':d.kind==='workshop'?'activity':d.kind,title:d.kind==='activity'?`Actividad ${d.position} · ${d.title}`:d.title,status:d.historical?'archived':d.status,version:d.version,school_year:d.schoolYear,classroom:w.classroom.section,classroom_id:w.classroom.id,parent_experience_id:d.projectDocumentId,date:d.date})),...w.reportHistory.map(r=>({id:r.id,kind:'family_report',title:r.title,status:r.status,version:r.version,school_year:w.classroom.year,classroom:r.classroom,classroom_id:w.classroom.id,period_label:w.periods.find(p=>p.starts_on===r.period_start&&p.ends_on===r.period_end)?.label}))];
  async function open(item:TreeDocument){
    const current=++requestId.current;setSelected(item);setDocument(null);setProjectDocument(null);setError('');setLoading(false);if(item.kind==='family_report')return;
    const source=state.documents.find(d=>d.id===item.id);if(!source?.exportReady){setError('Esta versión necesita confirmarse antes de abrir su documento.');return;}
    setLoading(true);try{const saved=await api<SavedMultiAgeDocument|SavedMultiAgeProjectDocument>(`/documents/${source.kind}/${source.id}`);if(current===requestId.current){if(['project','activity','workshop'].includes(source.kind))setProjectDocument(saved as SavedMultiAgeProjectDocument);else setDocument(saved as SavedMultiAgeDocument);}}catch(cause){if(current===requestId.current)setError(cause instanceof Error?cause.message:'No se pudo abrir este documento.');}finally{if(current===requestId.current)setLoading(false);}
  }
  const source=state.documents.find(d=>d.id===selected?.id),report=w.reportHistory.find(r=>r.id===selected?.id);
  const selectedDocument=items.find(item=>item.id===selected?.id)??selected;
  if(generatorMode&&source?.kind==='activity'&&source.exportReady)return <GeneratorActivityGuide key={source.id} id={source.id}
    activities={state.documents.filter(d=>d.kind==='activity'&&d.projectDocumentId===source.projectDocumentId).sort((a,b)=>(a.position??0)-(b.position??0))}
    onBack={()=>{requestId.current++;setLoading(false);setSelected(null);}} onActivity={id=>{const item=items.find(d=>d.id===id);if(item)void open(item);}}/>;
  return <section className="mx-auto max-w-5xl space-y-5">{!generatorMode&&<PageIntro title="Documentos" description="Encuentra aquí tus diagnósticos, planes, actividades e informes." icon={BookOpen} illustration="/project-illustrations/book.webp"/>}
    {!selected?<DocumentTree hideEmptyFolders={generatorMode} documents={items} artifactStates={[]} onOpen={item=>void open(item)}/>:<>
      <div className="flex flex-wrap items-start justify-between gap-3"><Button variant="ghost" onClick={()=>{requestId.current++;setLoading(false);setSelected(null);}}>← Volver a Documentos</Button><div className="flex flex-wrap items-start gap-3">{((source?.exportReady&&(document||projectDocument))||report)&&<Button asChild className="min-h-11"><a href={multiAgeDownloadUrl(report?`/reports/${report.id}.docx`:`/documents/${source!.kind}/${source!.id}.docx`)}>Descargar Word</a></Button>}{generatorMode&&source?.kind==='project'&&source.exportReady&&projectDocument&&<ProjectZipDownload url={multiAgeDownloadUrl(`/documents/project/${source.id}/bundle.zip`)}/>}</div></div>
      {loading&&<p role="status">Abriendo documento guardado…</p>}{error&&<WorkflowFeedback tone="error">{error}</WorkflowFeedback>}
      {projectDocument&&<MultiAgeSavedProject document={projectDocument} activities={state.documents.filter(d=>d.kind==='activity'&&d.projectDocumentId===projectDocument.id).sort((a,b)=>(a.position??0)-(b.position??0)||a.id.localeCompare(b.id))} onOpenActivity={id=>{const item=items.find(d=>d.id===id&&d.kind==='activity');if(item)void open(item);}}/>}
      {(document||report)&&<article className="ayni-panel space-y-5 p-5 sm:p-8"><h2 className="text-2xl font-extrabold text-[#172b52]">{selectedDocument?.title}</h2><p className="text-sm text-[#526b87]">{selectedDocument?.classroom} · {selectedDocument?.school_year}{report?` · ${report.age} años · ${selectedDocument?.period_label??`${report.period_start} al ${report.period_end}`}`:''} · Versión {selectedDocument?.version} · {selectedDocument?.status==='archived'?'Versión anterior':'Confirmado'}</p>
        {report?.details.sections.map(s=><section key={s.competency_id}><h3 className="font-bold">{s.competency_id}</h3><p>{s.progress_summary}</p></section>)}
        {document?.content.organization&&<p>{document.content.organization}</p>}
        {document?.kind==='diagnostic_group_review'&&<><div className="space-y-2">{document.content.groups?.map(g=><p key={g.age}>{g.age} años · {g.reviewed} de {g.enrolled} revisiones vigentes al confirmar esta versión.</p>)}</div><SavedGroupDiagnostic content={{readings:document.content.readings??[],organization:''}}/><details><summary className="min-h-11 cursor-pointer py-2 font-bold">Contexto familiar conservado</summary><p>Lo que cuenta la familia no acredita logros observados en el aula.</p>{document.content.familyContexts?.map(f=><section key={f.studentId} className="mt-4"><h3 className="font-bold">{f.studentName} · {f.age} años</h3><p className="whitespace-pre-line">{f.text}</p></section>)}</details></>}
        {document?.content.proposals?.map((p,i)=><details key={p.slot_id}><summary>{i+1}. {p.title}</summary><p>{p.purpose}</p>{p.opportunities.map(o=><section key={`${o.age}-${o.competency_id}`} className="my-4 space-y-2"><h3 className="font-bold">{o.age} años · {o.competency_id}</h3><p>{o.child_action}</p><p><strong>Cómo acompañaré:</strong> {o.mediation}</p><p><strong>Qué observaré:</strong> {o.observation}</p></section>)}</details>)}
        {document?.sourceSnapshot.observations?.map(o=><blockquote key={o.id}>{o.observation_text}</blockquote>)}
        {document?.sourceSnapshot.family&&<section><h3 className="font-bold">Lo que cuenta la familia</h3><p>{document.sourceSnapshot.family.details.family_text}</p></section>}
        {document?.content.findings?.map(f=><section key={f.competency_id}><h3 className="font-bold">{f.competency_id} · Lectura docente</h3><p>{f.teacher_reading}</p></section>)}
        {document?.content.pendingCompetencyIds&&<p className="text-sm text-[#526b87]">{document.content.pendingCompetencyIds.length} competencias con información pendiente, sin notas asignadas.</p>}
      </article>}
    </>}
  </section>;
}

function Diagnostic({ child: s, startsOn, run, classroomId, aiMode }: { child: DiagnosticChild; startsOn: string; run: Run; classroomId:string;aiMode:AIMode }) {
  const root=useRef<HTMLElement>(null);
  const [generated,setGenerated]=useState<{findings:DiagnosticFinding[];sourceFingerprint:string;id:string}|null>(null);
  const [experienceId, setExperienceId] = useState(s.catalog[0]?.id ?? '');
  const experience = s.catalog.find(e => e.id === experienceId) ?? s.catalog[0];
  const [aspectId, setAspectId] = useState('');
  const aspect = experience?.aspects.find(a => a.id === aspectId) ?? experience?.aspects[0];
  const competencies = [...new Set(s.observations.filter(o => o.observation_status !== 'insufficient_information').map(o => o.competency_v4_id))];
  return <section ref={root} className={`${styles.panel} ayni-panel space-y-5 p-5 sm:p-6`}><h2 className="text-xl font-extrabold text-[#172b52]">{s.first_name} {s.last_name} · {s.age} años</h2><p className={styles.muted}>{s.current ? `Revisión vigente · versión ${s.review?.version}` : s.review ? 'Las fuentes cambiaron; revisa y confirma una nueva versión.' : 'Revisión pendiente'}</p>
    <details><summary>Observar con las orientaciones de {s.age} años</summary><SaveForm label="Guardar observación diagnóstica" save={data => run('/diagnostic/observe', { ...confirmed, studentId: s.id, expectedAssignmentId: s.assignmentId, experienceId: experience?.id, aspectId: aspect?.id, observationStatus: 'observed_without_judgment', observationText: formValue(data,'note'), observedOn: formValue(data,'day') })}>
      <label className={styles.field}>Experiencia compartida<select value={experience?.id} onChange={e => { if (canChangeForm(e.currentTarget)) { setExperienceId(e.target.value); setAspectId(''); } }}>{s.catalog.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}</select></label>
      <label className={styles.field}>Qué observar en este niño<select value={aspect?.id} onChange={e => { if (canChangeForm(e.currentTarget)) setAspectId(e.target.value); }}>{experience?.aspects.map(a => <option key={a.id} value={a.id}>{a.prompt}</option>)}</select></label>
      {aspect && <div className={styles.notice}><p><strong>Referente para {s.age} años:</strong> {aspect.age_reference}</p>{aspect.teacher_steps?.map((step, i) => <p key={i}>{step}</p>)}{aspect.look_for && <p>{aspect.look_for}</p>}</div>}
      <Field label="Qué hizo o dijo" name="note" type="textarea" /><Field label="Fecha de observación" name="day" type="date" value={startsOn} />
    </SaveForm></details>
    <MultiAgeFamilyQuestionnaire studentId={s.id} studentName={`${s.first_name} ${s.last_name}`} run={run}/>
    <details><summary>Revisar fuentes y confirmar diagnóstico individual</summary>
      <MultiAgeGenerationControl kind="diagnostic" input={{classroomId,studentId:s.id}} sourceKey={s.sourceFingerprint} mode={aiMode} disabled={!competencies.length} onReview={(result,id)=>{if(canReviewProposal(root.current)&&result.output&&'findings' in result.output)setGenerated({findings:result.output.findings,sourceFingerprint:result.sourceFingerprint,id});}}/>
      <SaveForm key={generated?.id??'manual'} label={s.review?'Confirmar nueva versión del diagnóstico':'Confirmar revisión diagnóstica'} save={data => run('/diagnostic/review', { ...confirmed, studentId: s.id,expectedReviewId:s.review?.id??null,reason:formValue(data,'reason'), sourceFingerprint: generated?.sourceFingerprint??s.sourceFingerprint,...(generated?{generationJobId:generated.id}:{}), pendingInformationAcknowledged: data.get('pending') === 'on', findings: competencies.filter(id => formValue(data,`reading-${id}`)).map(id => ({ competency_id: id, observation_ids: generated?.findings.find(f=>f.competency_id===id)?.observation_ids??s.observations.filter(o => o.competency_v4_id === id && o.observation_status !== 'insufficient_information').map(o => o.id), teacher_reading: formValue(data,`reading-${id}`), planning_priority: formValue(data,`priority-${id}`) })) })}>
        {!s.observations.length && <p>No hay observaciones todavía. Puedes confirmar que la información queda pendiente, sin asignar niveles ni inventar actuaciones.</p>}
        {competencies.map(id => <div key={id}><h3 className="mt-5 text-lg font-bold text-[#172b52]">{s.catalog.flatMap(e => e.aspects).find(a => a.competency_id === id)?.competency_name ?? id}</h3>{s.observations.filter(o => o.competency_v4_id === id).map(o => <blockquote key={o.id}>{o.observation_text}</blockquote>)}<Field label="Lectura docente (opcional)" name={`reading-${id}`} type="textarea" required={false} value={(generated?.findings??s.review?.details.findings)?.find(f => f.competency_id === id)?.teacher_reading} /><Select label="Atención en la planificación" name={`priority-${id}`} value={(generated?.findings??s.review?.details.findings)?.find(f => f.competency_id === id)?.planning_priority ?? 'usual'}><option value="usual">Habitual</option><option value="consider">Tener en cuenta</option><option value="prioritize">Priorizar</option></Select></div>)}
        {s.review&&<Field label="Motivo de la nueva revisión diagnóstica" name="reason" type="textarea" maxLength={500}/>}<Check name="pending">He revisado las fuentes. Las competencias sin información suficiente quedan pendientes, sin notas.</Check>
      </SaveForm>
    </details>
  </section>;
}

function OpportunityFields({ opportunity: o, prefix }: { opportunity: Opportunity; prefix: string }) {
  return <div><h3 className="mt-5 text-lg font-bold text-[#172b52]">{o.age} años · {o.competency_id}</h3><Field label="Qué podrán hacer los niños" name={prefix+'action'} type="textarea" value={o.child_action} /><Field label="Cómo acompañaré" name={prefix+'mediation'} type="textarea" value={o.mediation} /><Field label="Qué observaré" name={prefix+'observation'} type="textarea" value={o.observation} /><p className={styles.muted}>{o.official_performance_refs.length ? `Referentes propios de ${o.age} años: ${o.official_performance_refs.join(', ')}` : 'Sin desempeño específico de esta edad: se conserva el referente de ciclo.'}</p></div>;
}
function readOpportunity(data: FormData, o: Opportunity, prefix: string): Opportunity { return { ...o, child_action: formValue(data,prefix+'action'), mediation: formValue(data,prefix+'mediation'), observation: formValue(data,prefix+'observation') }; }
function Annual({ planning: p, documentsOnly=false, diagnosticReady, w, run, aiMode, onDecision }: { documentsOnly?:boolean; planning: NonNullable<MultiAgeAppState['planning']>; diagnosticReady: boolean; w: Workspace; run: Run;aiMode:AIMode;onDecision:()=>Promise<void> }) {
  const root=useRef<HTMLElement>(null),[generated,setGenerated]=useState<{proposal:AnnualProposal;sourceFingerprint:string;id:string}|null>(null);
  const draft = p.plans.find(plan => plan.status === 'draft'), active = p.plans.find(plan => plan.status === 'active'), source = draft ?? active;
  const proposal = generated?.proposal ?? source?.proposal ?? p.exampleProposal;
  const editing = Boolean(generated || draft || !active);
  const [period,setPeriod]=useState('1'),[selectedId,setSelectedId]=useState<string|null>(proposal.proposals[0]?.slot_id??null);
  const linkedProject=(slotId:string)=>w.projects?.find(project=>project.annual_plan_id===active?.id&&project.annual_slot_id===slotId);
  const rows:AnnualMapRow[]=proposal.proposals.map((r,i)=>({proposal_id:r.slot_id,experience_type:'project',title:linkedProject(r.slot_id)?.title??r.title,purpose:linkedProject(r.slot_id)?.purpose??r.purpose,rationale:r.common_invitation,period:String(w.periods.findIndex(period=>p.calendar.projects[i].starts_on>=period.starts_on&&p.calendar.projects[i].starts_on<=period.ends_on)+1),month:Number(p.calendar.projects[i].starts_on.slice(5,7)),duration_weeks:p.calendar.projects[i].instructional_dates.length>10?3:2,primary_competency_ids:[...new Set(r.opportunities.map(o=>o.competency_id))]}));
  const slots=p.calendar.projects.map((slot,i)=>({...slot,index:i+1,period:rows[i].period,proposal_id:slot.slot_id,duration_weeks:rows[i].duration_weeks}));
  async function save(data: FormData) {
    const edited: AnnualProposal = { ...proposal, title: formValue(data,'title'), organization: formValue(data,'organization'), proposals: proposal.proposals.map((row, i) => ({ ...row, title: formValue(data,`title-${i}`), purpose: formValue(data,`purpose-${i}`), common_invitation: formValue(data,`invitation-${i}`), one_teacher_organization: formValue(data,`org-${i}`), opportunities: row.opportunities.map((o,j) => readOpportunity(data,o,`p${i}o${j}-`)) })), everyday_opportunities: proposal.everyday_opportunities.map((o,i) => readOpportunity(data,o,`daily${i}-`)) };
    edited.proposals=edited.proposals.map((row,i)=>p.protectedSlots.some(s=>s.slotId===row.slot_id)?proposal.proposals[i]:row);
    return run('/annual/draft', { classroomId: w.classroom.id, proposal: edited, sourceFingerprint: generated?.sourceFingerprint??p.sourceFingerprint,...(active?{expectedBasePlanId:active.id,expectedBaseRevision:active.revision}:{}),...(generated?{generationJobId:generated.id}:{}), ...(draft ? { planId: draft.id, expectedRevision: draft.revision } : {}) });
  }
  return <section ref={root} className="mt-6 space-y-6"><AnnualCompactTimeline slots={slots} rows={rows} period={period} onPeriod={setPeriod} selectedId={selectedId} onSelect={setSelectedId} onEmpty={()=>{}} today={new Date().toLocaleDateString('en-CA',{timeZone:'America/Lima'})} disabled={false}/><section className={`${styles.panel} ayni-panel space-y-5 p-5 sm:p-6`}><h2 className="text-xl font-extrabold text-[#172b52]">{generated?'Propuesta de Mi año para revisar':draft?'Borrador de Mi año':active ? `Mi año confirmado · versión ${active.version}` : 'Preparar Mi año'}</h2>
    {!diagnosticReady && <p className={styles.notice}>Antes de confirmar Mi año, revisa a cada niño. Puedes dejar información pendiente expresamente.</p>}
    {source && !source.current && <p className={styles.notice}>Cambió la matrícula o el diagnóstico. El documento anterior se conserva; revisa el borrador con las fuentes actuales antes de confirmar.</p>}
    {!source && !generated && <p className={styles.notice}>Punto de partida editorial para la prueba local. Revísalo y adáptalo: no fue generado por IA ni afirma intereses o logros de tus niños.</p>}
    <details open={documentsOnly&&!active}><summary>Conversar con Ayni sobre Mi año</summary><MultiAgeConversation documentsOnly={documentsOnly} classroomId={w.classroom.id} mode={aiMode} onDecision={onDecision}/></details>
    {<MultiAgeGenerationControl kind="annual" input={{classroomId:w.classroom.id}} sourceKey={p.sourceFingerprint} mode={aiMode} disabled={!diagnosticReady} onReview={(result,id)=>{if(canReviewProposal(root.current)&&result.output&&'proposals' in result.output)setGenerated({proposal:result.output,sourceFingerprint:result.sourceFingerprint,id});}}/>}
    {generated&&<Button variant="ghost" onClick={()=>{if(!root.current?.querySelector('form[data-dirty="true"]')||window.confirm('Hay cambios sin guardar. ¿Quieres descartarlos y volver a la versión guardada?'))setGenerated(null);}}>Volver a la versión guardada</Button>}
    {editing ? <SaveForm key={generated?.id??'manual'} label={draft ? 'Actualizar borrador de Mi año' : 'Guardar borrador de Mi año'} save={save}>
      <Field label="Título de Mi año" name="title" value={proposal.title} maxLength={180} /><Field label="Cómo acompañaré a los grupos" name="organization" type="textarea" value={proposal.organization} maxLength={2400} />
      {proposal.proposals.map((row,i) => <div key={row.slot_id} hidden={selectedId!==row.slot_id}><h3 className="mt-5 text-lg font-bold text-[#172b52]">{i+1}. {row.title} · {p.calendar.projects[i].starts_on} a {p.calendar.projects[i].ends_on}</h3>{p.protectedSlots.some(s=>s.slotId===row.slot_id)&&<p className={styles.notice}>Este tramo conserva su contenido y fechas. Para cambiar próximas actividades utiliza Editar proyecto y ver versiones.</p>}<fieldset disabled={p.protectedSlots.some(s=>s.slotId===row.slot_id)}><Field label="Título de la propuesta" name={`title-${i}`} value={row.title} maxLength={180} /><Field label="Propósito compartido" name={`purpose-${i}`} type="textarea" value={row.purpose} /><Field label="Invitación compartida" name={`invitation-${i}`} type="textarea" value={row.common_invitation} /><Field label="Organización con una profesora" name={`org-${i}`} type="textarea" value={row.one_teacher_organization} maxLength={2400} />{row.opportunities.map((o,j) => <OpportunityFields key={`${o.age}-${o.competency_id}`} opportunity={o} prefix={`p${i}o${j}-`} />)}</fieldset></div>)}
      <details><summary>Oportunidades cotidianas y cobertura por edad</summary>{proposal.everyday_opportunities.map((o,i) => <details key={`${o.age}-${o.competency_id}`}><summary>{o.age} años · {p.coverage.find(g => g.age === o.age)?.competencies.find(c => c.id === o.competency_id)?.name ?? o.competency_id}</summary><OpportunityFields opportunity={o} prefix={`daily${i}-`} /></details>)}</details>
    </SaveForm> : <><h3 className="mt-5 text-lg font-bold text-[#172b52]">{proposal.title}</h3><p>{proposal.organization}</p>{proposal.proposals.filter(row=>row.slot_id===selectedId).map(row => {const project=linkedProject(row.slot_id);return <div key={row.slot_id} className="space-y-4"><h3 className="mt-5 text-lg font-bold text-[#172b52]">{project?.title??row.title}</h3><p>{project?.purpose??row.purpose}</p>{project?<>{project.criteriaFamilies.flatMap(f=>f.variants.map(v=><p key={`${f.competency_id}-${v.curricular_age}`}><strong>{v.curricular_age} años:</strong> {v.criterion_text}</p>))}<p className="text-sm text-[#526b87]">Proyecto versión {project.version}. Las actividades preparadas conservan la versión con la que se guardaron.</p></>:row.opportunities.map(o => <p key={`${o.age}-${o.competency_id}`}><strong>{o.age} años:</strong> {o.child_action}</p>)}</div>;})}</>}
    {draft && <SaveForm label="Confirmar Mi año para las edades del aula" save={data => run('/annual/confirm', { ...confirmed, classroomId: w.classroom.id, planId: draft.id, expectedRevision: draft.revision,reason:formValue(data,'reason') })}>{active&&<Field name="reason" label="Motivo de la nueva versión de Mi año" type="textarea" maxLength={500}/>}<Check name="reviewed">He guardado y revisado el borrador, las oportunidades de cada edad y sus fuentes. Se conservarán los proyectos, actividades y versiones anteriores.</Check></SaveForm>}
    {active && !draft && !generated && <div className={styles.actions}><Button variant="outline" onClick={() => void run('/annual/draft', { classroomId: w.classroom.id, sourceFingerprint: p.sourceFingerprint, proposal: active.proposal,expectedBasePlanId:active.id,expectedBaseRevision:active.revision })}>Crear otro borrador conservando esta versión</Button></div>}
    {active&&!generated&&<MultiAgeAnnualReorder key={`${active.id}-${draft?.revision??0}`} classroomId={w.classroom.id} planning={p} active={active} draft={draft} run={run}/>}
    {p.plans.filter(plan=>plan.status==='archived'&&plan.teacher_confirmed_at!==null).length>0&&<details><summary className="min-h-11 cursor-pointer py-2 font-bold">Versiones anteriores de Mi año</summary>{p.plans.filter(plan=>plan.status==='archived').map(plan=><p className="my-3" key={plan.id}><a className="underline" href={multiAgeDownloadUrl(`/documents/annual_plan/${plan.id}.docx`)}>Descargar Mi año · versión {plan.version}</a></p>)}</details>}
  </section></section>;
}

function ActivityEditor({ planning, w, run, aiMode, onDecision, documentsOnly=false, initialSlotId }: {documentsOnly?:boolean;initialSlotId?:string; planning: NonNullable<MultiAgeAppState['planning']>; w: Workspace; run: Run;aiMode:AIMode;onDecision:()=>Promise<void> }) {
  const plan = planning.plans.find(p => p.status === 'active')!;
  const [slotId, setSlotId] = useState(initialSlotId??plan.proposal.proposals[0].slot_id),[date,setDate]=useState(''),[choice,setChoice]=useState(''),[preparation,setPreparation]=useState('one'),[batchCount,setBatchCount]=useState(2);
  const proposal=plan.proposal.proposals.find(p=>p.slot_id===slotId)??plan.proposal.proposals[0];
  const slot=plan.document_context.calendar.projects.find(s=>s.slot_id===proposal.slot_id)!;
  const project=w.projects?.find(p=>p.annual_plan_id===plan.id&&p.annual_slot_id===proposal.slot_id);
  const families=project?.criteriaFamilies;
  const allIds=[...new Set(families?.map(f=>f.competency_id)??proposal.opportunities.map(o=>o.competency_id))];
  const common=allIds.filter(id=>w.classroom.ages.every(age=>families?families.some(f=>f.competency_id===id&&f.variants.some(v=>v.curricular_age===age)):proposal.opportunities.some(o=>o.age===age&&o.competency_id===id)));
  const selected=common.includes(choice)?choice:choice==='all'||documentsOnly&&!project?'all':common[0]??'all';
  const ids=selected==='all'?allIds:[selected];
  const lastDate=project?.activities.at(-1)?.occurs_on;
  const day=slot.instructional_dates.includes(date)?date:slot.instructional_dates.find(d=>!lastDate||d>lastDate)??slot.instructional_dates.at(-1)!;
  const position=project?.nextPosition??1;
  const initial=annualActivityBlueprint(proposal,w.classroom.ages,ids,day);
  if(project){initial.title=project.title+' · actividad '+position;initial.purpose=project.purpose;if(project.version>1)initial.commonSequence=project.commonSequence;initial.criteriaFamilies=project.criteriaFamilies.filter(f=>ids.includes(f.competency_id)).map(f=>({competency_id:f.competency_id,variants:f.variants.map(v=>({curricular_age:v.curricular_age,criterion_text:v.criterion_text,expected_evidence:v.expected_evidence,observation_moments:v.observation_moments,official_performance_refs:[...v.official_performance_refs]}))}));}
  return <section className={`${styles.panel} ayni-panel space-y-5 p-5 sm:p-6`}>{documentsOnly&&<PageIntro title={project?.title??proposal.title} description="Prepara y revisa las actividades de este proyecto." icon={BookOpen}/>}<h2 className="text-xl font-extrabold text-[#172b52]">Actividades del proyecto</h2><p>Un mismo proyecto puede tener varias actividades. Cada una conserva sus momentos compartidos y criterios por edad.</p>
    <label className={styles.field}>Tramo de Mi año<select value={proposal.slot_id} onChange={e=>{if(canChangeForm(e.currentTarget)){setSlotId(e.target.value);setDate('');setChoice('');}}}>{plan.proposal.proposals.map((p,i)=><option key={p.slot_id} value={p.slot_id}>{i+1}. {w.projects?.find(project=>project.annual_plan_id===plan.id&&project.annual_slot_id===p.slot_id)?.title??p.title}</option>)}</select></label>
    {project&&<><h3 className="text-lg font-bold">{project.title} · versión {project.version}</h3><ol className="space-y-2">{project.activities.map(a=><li key={a.id}><a href={`#hoy?activity=${a.id}`} className="underline">Actividad {a.position} · {a.occurs_on} · {a.title}</a></li>)}</ol><MultiAgeProjectEdit classroomId={w.classroom.id} project={project} run={run}/><details><summary>Conversar con Ayni sobre este proyecto</summary><MultiAgeConversation documentsOnly={documentsOnly} key={project.id} classroomId={w.classroom.id} projectId={project.id} mode={aiMode} onDecision={onDecision}/></details></>}
    {!plan.current&&!project?<p className={styles.notice}>Revisa las fuentes de Mi año antes de comenzar otro proyecto.</p>:position>30?<p>Este proyecto llegó a treinta actividades. Conservamos sus guías y observaciones.</p>:<>
      <h3 className="text-lg font-bold">Preparar actividad {position}</h3>
      <label className={styles.field}>Fecha prevista<select value={day} onChange={e=>{if(canChangeForm(e.currentTarget))setDate(e.target.value);}}>{slot.instructional_dates.map(d=><option key={d} value={d}>{d}</option>)}</select></label>
      <label className={styles.field}>Competencias de la actividad<select value={selected} onChange={e=>{if(canChangeForm(e.currentTarget))setChoice(e.target.value);}}>{common.map(id=><option key={id} value={id}>{planning.coverage.flatMap(g=>g.competencies).find(c=>c.id===id)?.name??id}</option>)}<option value="all">Todas las oportunidades previstas por edad</option></select></label>
      {project&&<label className={styles.field}>Qué quieres preparar<select value={preparation} onChange={e=>{if(canChangeForm(e.currentTarget))setPreparation(e.target.value);}}><option value="one">Una actividad</option><option value="batch">Varias actividades en lote</option></select></label>}
      {project&&preparation==='batch'?<>
        <label className={styles.field}>Cantidad de actividades<select value={batchCount} onChange={e=>{if(canChangeForm(e.currentTarget))setBatchCount(Number(e.target.value));}}>{[2,3,4,5].map(n=><option key={n} value={n}>{n} actividades</option>)}</select></label>
        <ActivityBatchProposal key={`${project.id}-${position}-${ids.join('-')}-${day}-${batchCount}`} project={project} activityPosition={position} dates={slot.instructional_dates.filter(d=>d>=day).slice(0,batchCount)} count={batchCount} competencyIds={ids} sourceKey={planning.sourceFingerprint} aiMode={aiMode} plan={plan} slot={slot} w={w} run={run}/>
      </>:<ActivityProposal documentsOnly={documentsOnly} key={`${plan.id}-${proposal.slot_id}-${project?.id??'new'}-${position}-${ids.join('-')}-${day}`} initial={initial} sourceKey={planning.sourceFingerprint} aiMode={aiMode} slot={slot} plan={plan} w={w} run={run} project={project} activityPosition={position}/>}
    </>}
  </section>;
}
function ActivityBatchProposal({project,activityPosition,dates,count,competencyIds,sourceKey,aiMode,plan,slot,w,run}:{project:MultiAgeProject;activityPosition:number;dates:string[];count:number;competencyIds:string[];sourceKey:string;aiMode:AIMode;plan:AnnualPlan;slot:{slot_id:string};w:Workspace;run:Run}){
  const root=useRef<HTMLDivElement>(null),[generated,setGenerated]=useState<{proposals:ActivityBlueprint[];id:string}|null>(null);
  const input={classroomId:w.classroom.id,annualPlanId:plan.id,annualSlotId:slot.slot_id,projectId:project.id,expectedProjectFingerprint:project.fingerprint,activityPosition,activityDates:dates,competencyIds};
  if(dates.length!==count||activityPosition+count-1>30)return <p role="status">No hay espacio para {count} actividades desde esa fecha. Reduce la cantidad o elige una fecha lectiva anterior del tramo.</p>;
  return <div ref={root} className="space-y-5">
    <p>Se prepararán las actividades {activityPosition} a {activityPosition+count-1}: {dates.join(', ')}. Revisa cada una antes de guardar el lote completo. Las actividades anteriores se conservan.</p>
    <MultiAgeGenerationControl kind="activity_batch" input={input} sourceKey={sourceKey} mode={aiMode} onReview={(result,id)=>{if(result.proposals&&canReviewProposal(root.current))setGenerated({proposals:result.proposals,id});}}/>
    {generated&&<SaveForm key={generated.id} label={`Confirmar lote de ${generated.proposals.length} actividades`} save={data=>run('/activity/batch',{...confirmed,...input,expectedRevision:w.classroom.curriculum_revision,generationJobId:generated.id,proposals:generated.proposals.map((b,i)=>({...b,title:formValue(data,`batch-${i}-title`),purpose:formValue(data,`batch-${i}-purpose`),commonSequence:Object.fromEntries(['opening','development','closure'].map(k=>[k,formValue(data,`batch-${i}-${k}`)])),criteriaFamilies:b.criteriaFamilies.map(f=>({...f,variants:f.variants.map(v=>({...v,criterion_text:formValue(data,`batch-${i}-criterion-${f.competency_id}-${v.curricular_age}`),expected_evidence:formValue(data,`batch-${i}-evidence-${f.competency_id}-${v.curricular_age}`)}))}))}))})}>
      {generated.proposals.map((b,i)=><fieldset key={i} className="space-y-4 border-t border-[#d0dee8] pt-5"><legend className="py-2 text-lg font-bold">Actividad {activityPosition+i} · {b.occursOn}</legend>
        <Field label={`Título de la actividad ${activityPosition+i}`} name={`batch-${i}-title`} value={b.title} maxLength={180}/><Field label="Propósito" name={`batch-${i}-purpose`} value={b.purpose} type="textarea" maxLength={1000}/>
        {([['opening','Inicio'],['development','Desarrollo'],['closure','Cierre']] as const).map(([key,label])=><Field key={key} label={label} name={`batch-${i}-${key}`} value={b.commonSequence[key]} type="textarea" maxLength={2400}/>)}
        {b.criteriaFamilies.flatMap(f=>f.variants.map(v=><div key={`${f.competency_id}-${v.curricular_age}`} className="space-y-3"><h4 className="text-lg font-bold">{v.curricular_age} años · {f.competency_id}</h4><Field label={`Criterio de observación de ${v.curricular_age} años`} name={`batch-${i}-criterion-${f.competency_id}-${v.curricular_age}`} value={v.criterion_text} type="textarea" maxLength={1000}/><Field label="Actuación que podría observar" name={`batch-${i}-evidence-${f.competency_id}-${v.curricular_age}`} value={v.expected_evidence} type="textarea" maxLength={1000}/><p className={styles.muted}>Referentes: {v.official_performance_refs.join(', ')||'Estándar de ciclo, sin desempeño específico de esta edad.'}</p></div>))}
        <Check name={`reviewed-${i}`}>He revisado la actividad {activityPosition+i} y sus criterios por edad.</Check>
      </fieldset>)}
    </SaveForm>}
  </div>;
}
function ActivityProposal({initial,sourceKey,aiMode,documentsOnly=false,...props}:{documentsOnly?:boolean;initial:ActivityBlueprint;sourceKey:string;aiMode:AIMode;slot:{slot_id:string;instructional_dates:string[]};plan:AnnualPlan;w:Workspace;run:Run;project?:MultiAgeProject;activityPosition:number}){
  const root=useRef<HTMLDivElement>(null),[generated,setGenerated]=useState<{blueprint:ActivityBlueprint;id:string}|null>(null);
  return <div ref={root} className="space-y-5"><MultiAgeGenerationControl kind="activity" input={{classroomId:props.w.classroom.id,annualPlanId:props.plan.id,annualSlotId:props.slot.slot_id,occursOn:initial.occursOn,competencyIds:initial.criteriaFamilies.map(f=>f.competency_id),activityPosition:props.activityPosition,...(props.project?{projectId:props.project.id,expectedProjectFingerprint:props.project.fingerprint}:{})}} sourceKey={sourceKey} mode={aiMode} beforeStart={documentsOnly&&props.project?async()=>{await api('/conversation/prepare',{classroomId:props.w.classroom.id,projectId:props.project!.id,teacherConfirmed:true});}:undefined} onReview={(result,id)=>{if(result.proposal&&canReviewProposal(root.current))setGenerated({blueprint:result.proposal,id});}}/>
    {(!documentsOnly||aiMode==='off'||generated)&&<BlueprintForm key={generated?.id??'manual'} {...props} blueprint={generated?.blueprint??initial} generationJobId={generated?.id}/>}</div>;
}
function BlueprintForm({ blueprint: b, slot, plan, w, run, generationJobId, project, activityPosition }: { blueprint: ActivityBlueprint; slot: { slot_id: string; instructional_dates: string[] }; plan: AnnualPlan; w: Workspace; run: Run;generationJobId?:string;project?:MultiAgeProject;activityPosition:number }) {
  return <SaveForm label="Confirmar actividad y criterios por edad" save={data => run('/activity', { ...confirmed,...(generationJobId?{generationJobId}:{}),activityPosition,...(project?{projectId:project.id,expectedProjectFingerprint:project.fingerprint}:{}), classroomId: w.classroom.id, expectedRevision: w.classroom.curriculum_revision, annualPlanId: plan.id, annualSlotId: slot.slot_id, blueprint: { ...b, title: formValue(data,'title'), purpose: formValue(data,'purpose'), occursOn: formValue(data,'day'), commonSequence: { opening: formValue(data,'opening'), development: formValue(data,'development'), closure: formValue(data,'closure') }, criteriaFamilies: b.criteriaFamilies.map(f => ({ ...f, variants: f.variants.map(v => ({ ...v, criterion_text: formValue(data,`criterion-${f.competency_id}-${v.curricular_age}`), expected_evidence: formValue(data,`evidence-${f.competency_id}-${v.curricular_age}`) })) })) } })}>
    <Field label="Título de la actividad" name="title" value={b.title} maxLength={180} /><Field label="Propósito" name="purpose" value={b.purpose} type="textarea" maxLength={1000} />
    <Select label="Fecha lectiva del tramo" name="day" value={b.occursOn}>{slot.instructional_dates.map(day => <option key={day} value={day}>{day}</option>)}</Select>
    {([['opening','Inicio'],['development','Desarrollo'],['closure','Cierre']] as const).map(([key,label]) => <Field key={key} label={label} name={key} type="textarea" value={b.commonSequence[key]} maxLength={2400} />)}
    {b.criteriaFamilies.flatMap(f => f.variants.map(v => ({f,v}))).map(({f,v}) => <div key={`${f.competency_id}-${v.curricular_age}`}><h3 className="mt-5 text-lg font-bold text-[#172b52]">{v.curricular_age} años · {f.competency_id}</h3><Field label={`Criterio de observación de ${v.curricular_age} años`} name={`criterion-${f.competency_id}-${v.curricular_age}`} type="textarea" value={v.criterion_text} maxLength={1000} /><Field label="Actuación que podría observar" name={`evidence-${f.competency_id}-${v.curricular_age}`} type="textarea" value={v.expected_evidence} maxLength={1000} /><p className={styles.muted}>Referentes: {v.official_performance_refs.join(', ') || 'Estándar de ciclo, sin desempeño específico de esta edad.'}</p></div>)}
    <Check name="reviewed">He revisado la actividad compartida y cada criterio por edad.</Check>
  </SaveForm>;
}

function ActivityReader({ w, run }: { w: Workspace; run: Run }) {
  const [activityId, setActivityId] = useState(''), [studentId, setStudentId] = useState(''), [criterionId, setCriterionId] = useState('');
  const [opened,setOpened]=useState(false);
  const requested=useSyncExternalStore(subscribeView,()=>new URLSearchParams(window.location.hash.split('?')[1]??'').get('activity')??'',()=> '');
  const a = w.activities.find(a => a.id === (requested||activityId)) ?? w.activities[0], child = w.students.find(s => s.id === studentId);
  const criteria = w.criteria.filter(c => c.activity_id === a?.id && c.curricular_age === child?.age), criterion = criteria.find(c => c.id === criterionId) ?? criteria[0];
  if (!a) return <p className={styles.notice}>Prepara una actividad desde Mi año para consultar su guía y observar.</p>;
  if(!opened&&!w.activities.some(a=>a.id===requested))return <div className="mx-auto mt-6 max-w-5xl space-y-4">{w.activities.map(item=><article key={item.id} className="rounded-3xl border border-[#bce3ec] bg-white p-5 shadow-[var(--ayni-panel-shadow)] sm:p-6"><div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-[#e0f1f6] px-3 py-1 text-sm font-semibold text-[#07576c]">{item.experience_type==='workshop'?'Taller':`Actividad ${item.details.activity_contract?.position??1} · ${item.project_title??'Proyecto'}`}</span><span className="text-sm text-[#47658b]">Fecha prevista: {item.occurs_on}</span></div><h2 className="mt-4 text-2xl font-extrabold text-[#172b52]">{item.title}</h2><Button className="mt-5 min-h-14 w-full px-6 text-base font-bold sm:w-auto" onClick={()=>{setActivityId(item.id);setOpened(true);}}>Abrir actividad</Button></article>)}</div>;
  const visibleCriteria=w.criteria.filter(c=>c.activity_id===a.id&&(!child||c.curricular_age===child.age));
  const document:OpenDocument={id:a.id,kind:'activity',title:a.title,status:'active',version:1,school_year:w.classroom.year,classroom:w.classroom.section,date:a.occurs_on,occurs_on:a.occurs_on,
    competencies:[...new Map(w.planningContext?.curriculum.flatMap(g=>g.cards.map(c=>[c.id,{id:c.id,name:c.official_name}] as const))??[]).values()],experience_title:a.project_title,
    content:{purpose:a.purpose??'',materials:a.details.workshop_snapshot?.content.materials,teacher_preparation:a.details.workshop_snapshot?.content.preparation,meaningful_situation:a.details.common_sequence.opening,child_actions:a.details.common_sequence.development,closure_or_continuity:a.details.common_sequence.closure,mediation:a.details.common_sequence.development,evaluation_criterion:visibleCriteria.map(c=>`${c.curricular_age} años: ${c.criterion_text}`).join('\n'),expected_evidence:visibleCriteria.map(c=>`${c.curricular_age} años: ${c.details.expected_evidence??''}`).join('\n'),evidence_opportunities:visibleCriteria.map(c=>`${c.curricular_age} años: ${c.details.expected_evidence??''}`).join('\n')},
    ...(criterion?{active_criterion:{criterion_text:`${child?.age} años: ${criterion.criterion_text}`,competency_v4_id:criterion.competency_v4_id,expected_evidence:criterion.details.expected_evidence}}:{})};
  return <section className={`${styles.panel} ayni-panel space-y-5 p-5 sm:p-6`}>
    <label className={styles.field}>Actividad preparada<select value={a.id} onChange={e => { if (canChangeForm(e.currentTarget)){setActivityId(e.target.value);if(requested){window.history.replaceState(null,'','#hoy');window.dispatchEvent(new Event('hashchange'));}} }}>{w.activities.map(a => <option key={a.id} value={a.id}>{a.occurs_on} · {a.title}</option>)}</select></label>
    <ActivityReadingView document={document} position={a.experience_type==='workshop'?undefined:a.details.activity_contract?.position??1} total={w.projects?.find(p=>p.id===a.project_id)?.activities.length} actions={<><Button variant="outline" onClick={event=>{if(canLeaveActivity(event.currentTarget)){setOpened(false);if(requested){window.history.replaceState(null,'','#hoy');window.dispatchEvent(new Event('hashchange'));}}}}>← Volver a Hoy</Button><Button asChild variant="outline"><a href={multiAgeDownloadUrl(`/documents/${a.experience_type==='workshop'?'workshop':'activity'}/${a.id}.docx`)}>Descargar Word</a></Button></>}/>
    <MultiAgeWorkshopResources resources={a.details.workshop_snapshot?.content.resources}/>
    <details key={child?.id??'all-ages'} open={!child}><summary>Qué observar en cada edad</summary><div className="mt-4 grid gap-4 lg:grid-cols-3">{w.classroom.ages.map(age=><section key={age} className="ayni-panel space-y-3 p-4"><h3 className="text-lg font-extrabold text-[#172b52]">{age} años</h3>{w.criteria.filter(c=>c.activity_id===a.id&&c.curricular_age===age).map(c=><div key={c.id} className="space-y-2"><p className="font-semibold">{w.planningContext?.curriculum.find(g=>g.age===age)?.cards.find(k=>k.id===c.competency_v4_id)?.official_name??c.competency_v4_id}</p><p><strong>Criterio:</strong> {c.criterion_text}</p><p><strong>Qué podría observar:</strong> {c.details.expected_evidence??'Revisa el criterio de esta edad.'}</p><p className="text-sm text-[#596c82]">{c.details.observation_moments?.map(m=>({opening:'Inicio',development:'Desarrollo',closure:'Cierre'})[m as 'opening'|'development'|'closure']).join(' · ')}</p></div>)}</section>)}</div></details>
    <h3 className="mt-5 text-lg font-bold text-[#172b52]">Registrar una observación</h3><label className={styles.field}>Niño que observas<select value={studentId} onChange={e => { if (canChangeForm(e.currentTarget)) { setStudentId(e.target.value); setCriterionId(''); } }}><option value="">Selecciona un niño</option>{w.students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} · {s.age} años</option>)}</select></label>
    {child&&criterion&&w.periods.find(p=>p.starts_on<=a.occurs_on&&p.ends_on>=a.occurs_on)?.closed&&<p className={styles.notice}>Este bimestre está cerrado. Puedes consultar la actividad; reabre el bimestre desde Consolidado antes de añadir observaciones.</p>}
    {child && criterion && !w.periods.find(p=>p.starts_on<=a.occurs_on&&p.ends_on>=a.occurs_on)?.closed && <SaveForm key={`${a.id}-${child.id}`} label="Guardar observación de este niño" save={data => run('/observe', { studentId: child.id, activityId: a.id, criterionId: criterion.id, periodId: formValue(data,'period'), observedOn: formValue(data,'day'), rawText: formValue(data,'text') })}>
      <label className={styles.field}>Criterio de {child.age} años<select value={criterion.id} onChange={e => { if (canChangeForm(e.currentTarget)) setCriterionId(e.target.value); }}>{criteria.map(c => <option key={c.id} value={c.id}>{c.criterion_text}</option>)}</select></label>
      <blockquote>{criterion.criterion_text}</blockquote><Field label="Qué hizo o dijo" name="text" type="textarea" maxLength={4000} /><Field label="Fecha de la observación" name="day" type="date" value={a.occurs_on} /><Select label="Período" name="period" value={w.periods.find(p=>p.starts_on<=a.occurs_on&&a.occurs_on<=p.ends_on)?.id??w.periods[0]?.id}>{w.periods.map(p => <option key={p.id} value={p.id}>{p.label} · {p.starts_on} a {p.ends_on}</option>)}</Select>
    </SaveForm>}
  </section>;
}

function canLeaveActivity(target:HTMLButtonElement){const form=target.closest('section')?.querySelector<HTMLFormElement>('form[data-dirty="true"]');if(!form)return true;if(!window.confirm('Hay una observación sin guardar. ¿Quieres descartarla y volver a Hoy?'))return false;form.reset();form.dataset.dirty='false';return true;}

function Evaluation({ w, run }: { w: Workspace; run: Run }) {
  const [periodId,setPeriodId] = useState('');
  const [reviewPair,setReviewPair]=useState<{studentId:string;competencyId:string}|null>(null);
  const [view,setView]=useWorkspaceSubview('Evaluar','view',evaluationViews,'student');
  const period = w.periods.find(p => p.id === periodId) ?? w.periods[0];
  const pairs = w.pairs.filter(p => p.periodId === period?.id);
  const ready = Boolean(pairs.length && pairs.every(p => p.current));
  return <><PageIntro title={view==='family'?'Informe a familias':view==='consolidated'?'Consolidado':'Evaluación del bimestre'} description="Evidencias y decisiones" icon={ClipboardCheck}/><p>Revisa sus observaciones y los referentes de su edad. La valoración AD, A, B o C la eliges y confirmas tú; sin observaciones queda pendiente.</p>
    <label className={styles.field}>Bimestre<select value={period?.id} onChange={e=>{if(canChangeForm(e.currentTarget)){setPeriodId(e.target.value);setReviewPair(null);}}}>{w.periods.map(p=><option key={p.id} value={p.id}>{p.label} · {p.starts_on} a {p.ends_on}</option>)}</select></label>
    {period?.closed&&<p className={styles.notice}>Bimestre cerrado. Puedes consultar los registros y descargar documentos. Para hacer cambios, reabre desde Consolidado.</p>}
    <PeriodEvaluationNavigation view={view} onChange={setView}/>
    <div hidden={view!=='student'}>
    {!pairs.length && <p className={styles.notice}>Todavía no hay observaciones pertinentes para evaluar este bimestre.</p>}
    {reviewPair&&<Button variant="outline" onClick={()=>setReviewPair(null)}>Ver todos los niños y competencias</Button>}
    {reviewPair&&!pairs.some(p=>p.studentId===reviewPair.studentId&&p.competencyId===reviewPair.competencyId)&&<p className={styles.notice}>Este registro todavía no tiene observaciones pertinentes. Registra lo que hizo o dijo el niño desde la actividad en Hoy; su valoración se conserva pendiente.</p>}
    {pairs.filter(p=>!reviewPair||p.studentId===reviewPair.studentId&&p.competencyId===reviewPair.competencyId).map(pair => <Assessment key={`${pair.studentId}-${pair.competencyId}-${pair.periodId}-${pair.grade?.id??"pending"}-${pair.conclusion?.id??"pending"}`} pair={pair} w={w} run={run} ready={ready} mode="student" closed={period?.closed??false}/>)}
    </div><div hidden={view!=='family'}>
    {!ready?<p className={styles.notice}>Primero completa las valoraciones pertinentes del bimestre antes de confirmar conclusiones e informes.</p>:pairs.map(pair=><Assessment key={`${pair.studentId}-${pair.competencyId}-${pair.periodId}-${pair.grade?.id??"pending"}-${pair.conclusion?.id??"pending"}`} pair={pair} w={w} run={run} ready={ready} mode="family" closed={period?.closed??false}/>)}
    <section className={`${styles.panel} ayni-panel space-y-5 p-5 sm:p-6`}><h2 className="text-xl font-extrabold text-[#172b52]">Informes a familias</h2>{!ready || !pairs.every(p => p.conclusion) ? <p>Primero confirma las valoraciones pertinentes y sus conclusiones. Los informes conservarán esos textos.</p> : w.students.filter(s => pairs.some(p => p.studentId === s.id)).map(s => { const report = w.reports.find(r => r.student_id === s.id && r.period_start === period.starts_on && r.period_end === period.ends_on); return <div key={s.id}><h3 className="mt-5 text-lg font-bold text-[#172b52]">{s.first_name} {s.last_name} · {s.age} años</h3>{report ? <a href={multiAgeDownloadUrl(`/reports/${report.id}.docx`)}>Descargar informe Word</a> : <Button disabled={period.closed} onClick={() => void run('/family', { ...confirmed, studentId: s.id, periodId: period.id })}>Confirmar informe con las conclusiones guardadas</Button>}</div>; })}</section>
    </div>{view==='consolidated'&&period&&<MultiAgePeriodConsolidated classroomId={w.classroom.id} periodId={period.id} periodLabel={period.label} revision={w} run={run} onReview={(studentId,competencyId)=>{setReviewPair({studentId,competencyId});setView('student');}}/>}
  </>;
}
function Assessment({ pair, w, run, ready, mode, closed=false }: { pair: Workspace['pairs'][number]; w: Workspace; run: Run; ready: boolean; mode:'student'|'family';closed?:boolean }) {
  const child = w.students.find(s => s.id === pair.studentId)!;
  const [context, setContext] = useState<AssessmentContext | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(false);
  async function review() { setLoading(true); try { setContext(await api<AssessmentContext>(`/context?studentId=${pair.studentId}&competencyId=${pair.competencyId}&periodId=${pair.periodId}`)); setError(''); } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las fuentes.'); } finally { setLoading(false); } }
  return <section className={`${styles.panel} ayni-panel space-y-5 p-5 sm:p-6`}><h2 className="text-xl font-extrabold text-[#172b52]">{child.first_name} {child.last_name} · {child.age} años</h2><p>{pair.competencyId}{pair.grade ? ` · Valoración confirmada: ${pair.grade.achievement_level}` : ' · Valoración pendiente'}</p>
    {pair.grade && !pair.current && <p className={styles.notice}>Las fuentes cambiaron después de confirmar. Se conserva la valoración anterior; revisa las observaciones y confirma una nueva versión con el motivo de la corrección.</p>}
    <div className={styles.actions}><Button variant="outline" disabled={loading} onClick={() => void review()}>{loading ? 'Cargando fuentes…' : 'Revisar observaciones y referentes'}</Button></div>
    {error && <p role="alert">{error}</p>}{context && <><h3 className="mt-5 text-lg font-bold text-[#172b52]">Observaciones propias del niño</h3>{context.sourceRows.map((row,i) => <blockquote key={i}>{row.observation_text}</blockquote>)}<details><summary>Referentes de {child.age} años</summary>{context.assessmentContext.curriculum.age_performances.map((p,i) => <p key={i}>{p.text}</p>)}</details>
      {mode==='student' && !closed && !pair.grade && <SaveForm label="Confirmar valoración docente" save={data => run('/grade', { ...confirmed, studentId: pair.studentId, competencyId: pair.competencyId, periodId: pair.periodId, achievementLevel: formValue(data,'level'), sourceFingerprint: context.sourceFingerprint })}><Select label="Valoración docente" name="level"><option value="">Selecciona una valoración</option>{['AD','A','B','C'].map(level => <option key={level} value={level}>{level}</option>)}</Select></SaveForm>}
      {mode==='student'&&!closed&&pair.grade&&<details><summary className="min-h-11 cursor-pointer py-2 font-semibold">Corregir valoración conservando la anterior</summary><SaveForm label="Confirmar nueva versión de la valoración" save={data=>run('/grade',{...confirmed,studentId:pair.studentId,competencyId:pair.competencyId,periodId:pair.periodId,expectedAssessmentId:pair.grade?.id,sourceFingerprint:context.sourceFingerprint,achievementLevel:formValue(data,'level'),reason:formValue(data,'reason')})}><Select label="Valoración docente revisada" name="level" value={pair.grade.achievement_level}>{['AD','A','B','C'].map(level=><option key={level} value={level}>{level}</option>)}</Select><Field name="reason" label="Motivo de la corrección" type="textarea" maxLength={1000}/><p className={styles.muted}>La conclusión y el informe anteriores se conservarán como versiones históricas. Revisa sus textos después de confirmar la nueva valoración.</p></SaveForm></details>}
    </>}
    {mode==='family' && (pair.conclusion ? <><h3 className="mt-5 text-lg font-bold text-[#172b52]">Conclusión confirmada</h3><p>{pair.conclusion.details.conclusion_text}</p></> : !closed && ready && pair.grade && context ? <SaveForm label="Confirmar conclusión descriptiva" save={data => run('/conclusion', { ...confirmed, studentId: pair.studentId, competencyId: pair.competencyId, periodId: pair.periodId, assessmentId: pair.grade?.id, sourceFingerprint: context.sourceFingerprint, conclusionText: formValue(data,'conclusion') })}><Field label="Conclusión docente basada en sus observaciones" name="conclusion" type="textarea" maxLength={4000} /></SaveForm> : pair.grade && <p className={styles.muted}>Revisa las observaciones y referentes antes de confirmar la conclusión.</p>)}
    {mode==='family'&&!closed&&ready&&pair.conclusion&&pair.grade&&context&&<details><summary className="min-h-11 cursor-pointer py-2 font-semibold">Corregir conclusión conservando la anterior</summary><SaveForm label="Confirmar nueva versión de la conclusión" save={data=>run('/conclusion',{...confirmed,studentId:pair.studentId,competencyId:pair.competencyId,periodId:pair.periodId,assessmentId:pair.grade?.id,expectedConclusionId:pair.conclusion?.id,sourceFingerprint:context.sourceFingerprint,conclusionText:formValue(data,'conclusion'),reason:formValue(data,'reason')})}><Field name="conclusion" label="Conclusión docente revisada" type="textarea" value={pair.conclusion.details.conclusion_text} maxLength={4000}/><Field name="reason" label="Motivo de la corrección" type="textarea" maxLength={1000}/></SaveForm></details>}
  </section>;
}
