"use client";

import { useEffect, useState, type ReactNode } from 'react';
import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch, apiJson } from '@/src/lib/ayni-api-fetch';
import { localDatabaseApiUrl } from '@/src/lib/local-database';
import { PageIntro } from './workflow-ui';
import {downloadNameFromDisposition} from '@/src/lib/document-download-name.mjs';

type Context = { ages: number[]; year: number; students: {id:string;name:string;age:number}[]; formats: {id:string;title:string;description:string}[] };
type Workshop = { id:string; title:string; purpose:string; type:string; printable:boolean; resources:{id:string;title:string}[] };
const base = `${localDatabaseApiUrl}/api/document-generator`;
async function read<T>(path:string, signal?:AbortSignal):Promise<T> {
  const response = await apiFetch(base+path,{cache:'no-store',signal});
  const value=await apiJson<T & {error?:string}>(response);
  if(!response.ok)throw new Error(value.error??'No pudimos cargar tus documentos.');
  return value;
}
async function download(path:string, filename:string) {
  const response = await apiFetch(base+path,{cache:'no-store'});
  if (!response.ok) { const value=await response.json() as {error?:string}; throw new Error(value.error??'No se pudo descargar el documento.'); }
  const blob=await response.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=downloadNameFromDisposition(response.headers.get('content-disposition'),filename);document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export function GeneratorDocuments({children, library=false,initialSection='formats'}:{children?:ReactNode;library?:boolean;initialSection?:'formats'|'saved'}) {
  const [context,setContext]=useState<Context|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(''),[attempt,setAttempt]=useState(0);
  const [section,setSection]=useState<'formats'|'saved'>(initialSection),[student,setStudent]=useState(''),[period,setPeriod]=useState('1'),[month,setMonth]=useState('3'),[age,setAge]=useState<number|null>(null);
  const [workshops,setWorkshops]=useState<Workshop[]|null>(null),[query,setQuery]=useState('');
  useEffect(()=>{const controller=new AbortController();read<Context>('/context',controller.signal).then(c=>{setContext(c);setAge(c.ages[0]);setError('');}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[attempt]);
  useEffect(()=>{if(!library||age===null)return;const controller=new AbortController();read<{workshops:Workshop[]}>(`/workshops?age=${age}`,controller.signal).then(v=>{setWorkshops(v.workshops);setError('');}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[library,age,attempt]);
  async function get(path:string,name:string){if(busy)return;setBusy(path);setError('');try{await download(path,name);}catch(e){setError(e instanceof Error?e.message:'No se pudo descargar.');}finally{setBusy('');}}
  const params=new URLSearchParams({period,month,...(student?{studentId:student}:{})});
  const field='min-h-11 w-full rounded-xl border border-[#748da4] bg-white px-3 text-[#19334d]';
  return <section className="mx-auto max-w-6xl space-y-6">
    <PageIntro title={library?'Biblioteca de talleres':'Documentos'} description={library?'Elige la edad y descarga un taller con su guía y materiales.':'Tus planes guardados y formatos para completar en Word.'} icon={FileText}/>
    {!library&&children&&<div role="group" aria-label="Tipo de documentos" className="flex flex-wrap gap-3"><Button aria-pressed={section==='formats'} variant={section==='formats'?'default':'outline'} onClick={()=>setSection('formats')}>Formatos para completar</Button><Button aria-pressed={section==='saved'} variant={section==='saved'?'default':'outline'} onClick={()=>setSection('saved')}>Planes y actividades guardados</Button></div>}
    {error&&<div role="alert" className="space-y-3 rounded-xl bg-red-50 p-4 text-red-800"><p>{error}</p><Button variant="outline" onClick={()=>setAttempt(n=>n+1)}>Reintentar</Button></div>}
    {!library&&section==='saved'?children:!context?<p role="status">Cargando los datos de tu aula…</p>:<>
      <div className="ayni-panel grid gap-4 rounded-2xl bg-white p-5 sm:grid-cols-3">
        {library?<><label className="space-y-2"><span className="block font-semibold">Edad curricular</span><select className={field} value={age??''} onChange={e=>{setWorkshops(null);setAge(Number(e.target.value));setStudent('');}}>{context.ages.map(a=><option key={a} value={a}>{a} años</option>)}</select></label><label className="space-y-2 sm:col-span-2"><span className="block font-semibold">Buscar taller</span><input className={field} type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nombre, tema o tipo de taller"/></label></>:<><label className="space-y-2"><span className="block font-semibold">Estudiantes</span><select className={field} value={student} onChange={e=>setStudent(e.target.value)}><option value="">Todos los estudiantes</option>{context.students.map(s=><option key={s.id} value={s.id}>{s.name} · {s.age} años</option>)}</select></label><label className="space-y-2"><span className="block font-semibold">Bimestre</span><select className={field} value={period} onChange={e=>setPeriod(e.target.value)}>{[1,2,3,4].map(p=><option key={p} value={p}>Bimestre {p}</option>)}</select></label><label className="space-y-2"><span className="block font-semibold">Mes para asistencia</span><select className={field} value={month} onChange={e=>setMonth(e.target.value)}>{Array.from({length:12},(_,i)=><option key={i} value={i+1}>{new Intl.DateTimeFormat('es-PE',{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(context.year,i,1)))}</option>)}</select></label></>}
      </div>
      {!context.students.length&&<p role="status">Agrega a tus alumnos en Mi aula para personalizar y descargar los documentos.</p>}
      {!library&&<p className="text-sm text-[#526b87]">Incluyen los datos del colegio, nombres y competencias de cada edad. Las observaciones, valoraciones y conclusiones quedan vacías para completarlas en Word.</p>}
      {library&&!workshops?<p role="status">Buscando talleres de {age} años…</p>:<div className="grid gap-5 md:grid-cols-2">
        {library?workshops?.filter(w=>`${w.title} ${w.type} ${w.purpose}`.toLocaleLowerCase('es-PE').includes(query.toLocaleLowerCase('es-PE'))).map(w=><article key={w.id} className="ayni-panel flex flex-col gap-3 rounded-2xl bg-white p-5"><p className="text-sm font-semibold text-[#087d96]">{w.type} · {age} años</p><h2 className="text-xl font-bold text-[#172b52]">{w.title}</h2><p className="grow text-[#385771]">{w.purpose}</p><div className="flex flex-wrap gap-3"><Button disabled={Boolean(busy)||!context.students.length} onClick={()=>void get(`/workshops/${w.id}.docx?age=${age}`,`${w.title}.docx`)}><Download/>Guía Word</Button>{w.printable&&<Button variant="outline" disabled={Boolean(busy)||!context.students.length} onClick={()=>void get(`/workshops/${w.id}.pdf?age=${age}`,`${w.title}.pdf`)}><Download/>Materiales PDF</Button>}</div></article>):context.formats.map(f=><article key={f.id} className="ayni-panel flex flex-col gap-3 rounded-2xl bg-white p-5"><h2 className="text-xl font-bold text-[#172b52]">{f.title}</h2><p className="grow text-[#385771]">{f.description}</p><Button className="self-start" disabled={Boolean(busy)||!context.students.length} onClick={()=>void get(`/formats/${f.id}.docx?${params}`,`${f.title}.docx`)}><Download/>{busy.startsWith(`/formats/${f.id}.`)?'Preparando Word…':'Descargar Word'}</Button></article>)}
      </div>}
      {busy&&<p role="status">Preparando tu descarga…</p>}
      {library&&workshops&&!workshops.some(w=>`${w.title} ${w.type} ${w.purpose}`.toLocaleLowerCase('es-PE').includes(query.toLocaleLowerCase('es-PE')))&&<p role="status">No encontramos talleres con esa búsqueda. Prueba con otra palabra.</p>}
    </>}
  </section>;
}
