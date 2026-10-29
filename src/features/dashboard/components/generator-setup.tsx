'use client';
import {useEffect,useState} from 'react';
import {PilotSetup} from './pilot-setup';
import {MultiAgeCalendarFields,multiAgeCalendarFormData} from './multi-age-calendar-fields';
import {apiFetch,apiJson} from '@/src/lib/ayni-api-fetch';
import {loadPilotSetup,localDatabaseApiUrl,type PilotSetupDraft} from '@/src/lib/local-database';
import {Button} from '@/components/ui/button';

/** Reuses the original school's complete form, autosave and private logo support. */
export function GeneratorSetup({onSaved,onSignOut,onBack}:{onSaved:()=>Promise<void>;onSignOut?:()=>void;onBack?:()=>void}){
 const [draft,setDraft]=useState<PilotSetupDraft|null|undefined>(undefined),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let live=true;loadPilotSetup().then(value=>{if(live){setDraft(value.draft??null);setError('');}}).catch(()=>{if(live)setError('No pudimos recuperar los datos del aula.');});return()=>{live=false;};},[attempt]);
 if(error)return <main className="p-6"><p role="alert">{error}</p><Button onClick={()=>setAttempt(n=>n+1)}>Reintentar</Button></main>;
 if(draft===undefined)return <main className="p-6" role="status">Recuperando los datos del aula…</main>;
 return <GeneratorSetupForm draft={draft} onSaved={onSaved} onSignOut={onSignOut} onBack={onBack}/>;
}
export function GeneratorSetupForm({draft,onSaved,onSignOut,onBack}:{draft:PilotSetupDraft|null;onSaved:()=>Promise<void>;onSignOut?:()=>void;onBack?:()=>void}){
 return <PilotSetup documentsOnly accountYear={2026} initialDraft={draft} onSignOut={onSignOut} adapter={{
   ageFields:onBack?<Button type="button" variant="ghost" onClick={onBack}>Cambiar modalidad</Button>:null,
   calendarFields:<div className="mt-5"><MultiAgeCalendarFields prefix="generator-"/></div>,
   save:async(values,fields,submissionId)=>{const response=await apiFetch(`${localDatabaseApiUrl}/api/document-generator/setup`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...values,...multiAgeCalendarFormData(fields,'generator-'),ages:fields.getAll('groupAge').map(Number),submissionId,teacherConfirmed:true,teachingMode:'single_teacher_multi_age'})});const result=await apiJson<{error?:string}>(response);if(!response.ok)throw new Error(result.error??'No se pudo guardar el aula.');await onSaved();}
 }}/>
}
