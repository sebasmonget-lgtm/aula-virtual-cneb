"use client";

import { useEffect, useState, type ComponentProps } from 'react';
import { apiFetch } from '@/src/lib/ayni-api-fetch';
import { localDatabaseApiUrl } from '@/src/lib/local-database';
import type { CurriculumEntry } from '@/src/lib/multi-age-app-types';
import { TeacherWorkspace } from './teacher-workspace';
import { MultiAgeWorkspace } from './multi-age-workspace';
import { Button } from '@/components/ui/button';
import {AyniModeChoice} from './ayni-mode-choice';

export function CurriculumWorkspace(props: ComponentProps<typeof TeacherWorkspace>) {
  const generatorOnly=process.env.NEXT_PUBLIC_AYNI_DOCUMENT_GENERATOR_ONLY==='1';
  const [entry, setEntry] = useState<CurriculumEntry | null>(null);
  const [choice, setChoice] = useState<'single' | 'multi' | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [product, setProduct] = useState<{mode:'daily'|'documents'|null;available?:boolean}|null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    apiFetch(`${localDatabaseApiUrl}/api/product-mode`, {cache:'no-store',signal:controller.signal})
      .then(async response=>{if(response.status===404)return {mode:'daily' as const};if(!response.ok)throw new Error('No pudimos verificar tu modalidad.');return response.json() as Promise<{mode:'daily'|'documents'|null}>;})
      .then(value=>{if(!controller.signal.aborted)setProduct(value);})
      .catch(cause=>{if(!controller.signal.aborted)setError(cause.message);});
    apiFetch(`${localDatabaseApiUrl}/api/curriculum/entry`, { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        // A previously deployed V1 server has no curriculum entry route.
        if (response.status === 404) return { enabled: false };
        if (!response.ok) throw new Error('No pudimos verificar la configuración del aula.');
        return response.json() as Promise<CurriculumEntry>;
      }).then(value => { if (!controller.signal.aborted) { setEntry(value); setError(''); } })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No pudimos conectar.'); });
    return () => controller.abort();
  }, [attempt]);
  async function choose(mode:'daily'|'documents') {
    setSaving(true);setError('');
    try {
      const response=await apiFetch(`${localDatabaseApiUrl}/api/product-mode`,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({mode})});
      const value=await response.json() as {mode:'daily'|'documents';error?:string};if(!response.ok)throw new Error(value.error??'No se pudo guardar la modalidad.');setProduct(value);setEntry(null);setAttempt(n=>n+1);
    }catch(cause){setError(cause instanceof Error?cause.message:'No se pudo guardar.');}finally{setSaving(false);}
  }
  if (error) return <main className="mx-auto max-w-2xl p-6"><p role="alert">{error}</p><Button className="mt-4" onClick={() => setAttempt(n => n + 1)}>Reintentar</Button></main>;
  if (!entry||!product) return <main className="p-6" role="status">Comprobando la configuración de tu aula…</main>;
  if(!product.mode)return <AyniModeChoice saving={saving} generatorOnly={generatorOnly} documentsAvailable={product.available!==false} onChoose={mode=>void choose(mode)}/>;
  const documentsOnly=product.mode==='documents';
  if(documentsOnly&&product.available===false)return <main className="mx-auto max-w-2xl p-6"><h1 className="text-2xl font-bold">El generador no está disponible por el momento</h1><p className="mt-3">Tus documentos se conservan. Vuelve a intentar en unos minutos.</p><Button className="mt-4" onClick={()=>setAttempt(n=>n+1)}>Reintentar</Button></main>;
  if(documentsOnly&&entry.enabled&&entry.contract!==1)return <MultiAgeWorkspace documentsOnly onSignOut={props.onSignOut}/>;
  if (!entry.enabled || entry.contract === 1 || choice === 'single') return <TeacherWorkspace {...props} documentsOnly={documentsOnly} />;
  if (entry.contract === 2 || choice === 'multi') return <MultiAgeWorkspace documentsOnly={documentsOnly} onSignOut={props.onSignOut} onBackToChoice={entry.contract ? undefined : () => setChoice(null)} />;
  return <main className="mx-auto max-w-3xl px-5 py-12 text-[#19334d]">
    <h1 className="text-3xl font-bold">¿Cómo está organizada tu aula?</h1>
    <p className="mt-3 max-w-prose">Elige la modalidad al configurar tu cuenta. Ayni usará esta elección para organizar {documentsOnly?'tus planes y documentos por edad.':'los referentes y criterios de observación.'}</p>
    <div className="mt-8 grid gap-5 sm:grid-cols-2">
      <section className="rounded-2xl border border-[var(--ayni-panel-border)] bg-white p-6"><h2 className="text-xl font-bold">Una sola edad</h2><p className="mt-3 mb-5">Todos los niños pertenecen al mismo grupo curricular: 3, 4 o 5 años.</p><Button onClick={() => setChoice('single')}>Elegir una sola edad</Button></section>
      <section className="rounded-2xl border border-[var(--ayni-panel-border)] bg-white p-6"><h2 className="text-xl font-bold">Unidocencia</h2><p className="mt-3 mb-5">Una profesora acompaña a niños de varias edades en el mismo aula. Cada niño conserva los referentes de su grupo.</p><Button onClick={() => setChoice('multi')}>Elegir Unidocencia</Button></section>
    </div>
    <p className="mt-6 text-sm text-[#526b87]">La modalidad se confirma al crear el aula.</p>
  </main>;
}
