"use client";
import {useRef,type FormEvent} from 'react';
import {Button} from '@/components/ui/button';
import type {AnnualPlan,MultiAgeAppState} from '@/src/lib/multi-age-app-types';
type Props={classroomId:string;planning:NonNullable<MultiAgeAppState['planning']>;active:AnnualPlan;draft?:AnnualPlan;run:(path:string,input:Record<string,unknown>)=>Promise<boolean>};
export function MultiAgeAnnualReorder({classroomId,planning,active,draft,run}:Props){
 const root=useRef<HTMLFormElement>(null),proposal=draft?.proposal??active.proposal;
 const free=proposal.proposals.filter(r=>!planning.protectedSlots.some(s=>s.slotId===r.slot_id));
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const form=event.currentTarget,fields=new FormData(form);
  const otherDirty=[...(form.closest('section')?.querySelectorAll('form[data-dirty="true"]')??[])].some(f=>f!==form);
  if(otherDirty&&!window.confirm('Hay cambios sin guardar en Mi año. ¿Quieres descartarlos y preparar el intercambio con la versión guardada?'))return;
  if(await run('/annual/reorder',{classroomId,sourceFingerprint:planning.sourceFingerprint,expectedBasePlanId:active.id,expectedBaseRevision:active.revision,
   ...(draft?{planId:draft.id,expectedRevision:draft.revision}:{}),reorder:{fromSlotId:String(fields.get('from')),toSlotId:String(fields.get('to'))}}))form.dataset.dirty='false';
 }
 return <details className="mt-5"><summary className="min-h-11 cursor-pointer py-2 font-bold">Reorganizar tramos de Mi año</summary>
  <p className="my-3 text-sm">Intercambia dos propuestas en sus fechas previstas. Los tramos con proyectos preparados y los de bimestres cerrados conservan su lugar. El intercambio se guarda en un borrador para revisar y confirmar.</p>
  {free.length<2?<p>No hay dos tramos libres para intercambiar. Puedes editar el proyecto para las próximas actividades o revisar los cierres.</p>:<form ref={root} className="space-y-4" onSubmit={event=>void submit(event)} onChangeCapture={event=>{event.currentTarget.dataset.dirty='true';}}>
   <div className="grid gap-4 sm:grid-cols-2">{(['from','to'] as const).map((name,i)=><label key={name} className="min-w-0 text-sm font-semibold">{i===0?'Primera propuesta':'Intercambiar con'}<select className="mt-1 min-h-11 w-full min-w-0 rounded-xl border bg-white px-3" name={name} defaultValue={free[i].slot_id} required>{proposal.proposals.map((r,j)=>{const protectedSlot=planning.protectedSlots.find(s=>s.slotId===r.slot_id);return <option key={r.slot_id} value={r.slot_id} disabled={Boolean(protectedSlot)}>{j+1}. {r.title}{protectedSlot?protectedSlot.reason==='prepared'?' · Con actividades':' · Bimestre cerrado':''}</option>;})}</select></label>)}</div>
   <Button variant="outline" type="submit">Guardar intercambio en el borrador</Button>
  </form>}
 </details>;
}
