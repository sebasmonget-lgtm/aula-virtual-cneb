"use client";
import { useEffect, useRef, useState, type DragEvent, type PointerEvent, type ReactNode } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, GripVertical, Plus, Sun, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { competencyLabel } from "@/src/lib/competency-presentation";
import { annualDisplayTitle, annualCoverage, coverageDelta, editAnnualStructure, proposalCompetencies } from "@/src/lib/annual-year-editor.mjs";
import { annualMapPercent, annualMapWidth, annualMapHolidays } from "@/src/lib/annual-year-map.mjs";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { localDatabaseApiUrl } from "@/src/lib/local-database";
import { ProjectPictogram } from "./project-pictogram";
import { readWorkspaceParams,writeWorkspaceLocation } from "@/src/lib/workspace-location";
import { projectEventWarning } from "@/src/lib/project-event-warning.mjs";
import { NewAnnualProposal } from "./new-annual-proposal";
import { AnnualCompactTimeline } from "./annual-compact-timeline";
import type { AnnualMapRow, AnnualMapCalendar, AnnualMapEffectiveCalendar } from "./annual-year-map";

type Row=AnnualMapRow & { teacher_protected?:boolean; opportunities:{competency_id:string}[]; slot_id:string; instructional_dates:string[] };
type Slot={occupancy?:string;calendar_starts_on?:string;historical_dates?:string[];slot_id:string;index:number;proposal_id:string|null;starts_on:string;ends_on:string;duration_weeks:2|3;period:string;instructional_dates:string[]};
export type EditorPlan={editor_version:3;proposed_experiences:Row[];available_experiences?:Row[];curriculum_reference?:{id:string;name:string}[];everyday_opportunities?:{competency_id:string}[];
  resolved_calendar:{projects:Slot[];initial_stage:{name:string;starts_on:string;ends_on:string;instructional_dates:string[]}}};
type Action={kind:"place"|"remove";proposalId:string;targetSlotId?:string};
const compact=(value:string)=>new Intl.DateTimeFormat("es-PE",{day:"numeric",month:"short",timeZone:"UTC"}).format(new Date(value+"T00:00:00Z"));
const dragType="application/x-ayni-proposal";
export function AnnualSlotEditor({plan,planId,revision,calendar,effectiveCalendar,selectedId,onSelect,editable,disabled,onAction,onReload,children,compact:compactView=false,period='all',onPeriod=()=>{},detail=false,viewAction,listView=false,onProtection,showTools=true,calendarTimeline=false}: {
  plan:EditorPlan;planId:string;revision:number;calendar:AnnualMapCalendar;effectiveCalendar:AnnualMapEffectiveCalendar|null;selectedId:string|null;onSelect:(id:string)=>void;
  editable:boolean;disabled:boolean;onAction:(action:Action)=>void;onReload:(id:string)=>Promise<unknown>;children:ReactNode;compact?:boolean;period?:string;onPeriod?:(value:string)=>void;detail?:boolean;viewAction?:ReactNode;listView?:boolean;onProtection?:(id:string)=>void;showTools?:boolean;calendarTimeline?:boolean;
}) {
  const [filter,setFilter]=useState<string|null>(null),[dragging,setDragging]=useState<string|null>(null),[dropTarget,setDropTarget]=useState<string|null>(null);
  const [pending,setPending]=useState<{action:Action;delta:{id:string;name:string;before:number;after:number;missing:boolean}[]}|null>(null),[feedback,setFeedback]=useState("");
  const [placement,setPlacement]=useState<string|null>(null),[newOpen,setNewOpen]=useState(()=>!!readWorkspaceParams("Planificar").get("reviewPeriod")),[official,setOfficial]=useState<string|null>(null),[holidayOpen,setHolidayOpen]=useState<string|null>(null);
  const [locks,setLocks]=useState<{protected_ids:string[];today:string}|null>(null);
  const pointerDrag=useRef<{id:string;x:number;y:number;moved:boolean}|null>(null);
  const timelineRef=useRef<HTMLDivElement>(null),centeredPlan=useRef<string|null>(null);
  useEffect(()=>{let live=true;void apiFetch(`${localDatabaseApiUrl}/api/annual-journey/${planId}/editor-state`).then(async r=>{if(!r.ok)throw Error();return r.json();}).then(v=>{if(live)setLocks(v as {protected_ids:string[];today:string});}).catch(()=>{if(live)setFeedback("No pudimos verificar las protecciones. Vuelve a abrir Mi año antes de mover propuestas.");});return()=>{live=false;};},[planId,revision]);
  const today=locks?.today ?? new Date().toLocaleDateString("en-CA",{timeZone:"America/Lima"});
  const coverage=annualCoverage(plan),names=new Map((plan.curriculum_reference ?? []).map(c=>[c.id,c.name]));
  const slots=plan.resolved_calendar.projects, stage=plan.resolved_calendar.initial_stage;
  const window={start:`${calendar.school_year}-03-01`,end:`${calendar.school_year}-12-31`};
  const revealToday=()=>{const element=timelineRef.current;if(element)element.scrollTo({left:Math.max(0,annualMapPercent(today,window)/100*element.scrollWidth-element.clientWidth/3),behavior:"smooth"});};
  useEffect(()=>{
    if(!timelineRef.current){centeredPlan.current=null;return;}
    if(!locks||centeredPlan.current===planId)return;
    const element=timelineRef.current;
    element.scrollLeft=Math.max(0,annualMapPercent(locks.today,{start:`${calendar.school_year}-03-01`,end:`${calendar.school_year}-12-31`})/100*element.scrollWidth-element.clientWidth/3);
    centeredPlan.current=planId;
  },[locks,planId,calendar.school_year,calendarTimeline,compactView]);
  const blocks=(effectiveCalendar?.blocks ?? calendar.blocks).filter(b=>b.type==="management");
  const holidays=effectiveCalendar?annualMapHolidays(effectiveCalendar.days.filter(d=>!d.is_instructional)):[];
  const locked=(row:Row)=>Boolean(row.teacher_protected || locks?.protected_ids.includes(row.proposal_id) || row.planned_start_date && row.planned_start_date<today);
  const canMove=(row:Row)=>showTools&&editable&&!disabled&&!!locks&&!locked(row);
  const propose=(action:Action)=>{
    try {
      const next=editAnnualStructure(plan,action,{protectedIds:locks?.protected_ids ?? [],today});
      const fromLibrary=(plan.available_experiences ?? []).some(r=>r.proposal_id===action.proposalId),target=slots.find(s=>s.slot_id===action.targetSlotId);
      if(action.kind==="place"){
        const warnings=next.proposed_experiences.flatMap((row:Row)=>{
          const before=plan.proposed_experiences.find(item=>item.proposal_id===row.proposal_id);
          if(before?.slot_id===row.slot_id)return [];
          const destination=next.resolved_calendar.projects.find((slot:Slot)=>slot.proposal_id===row.proposal_id);
          const warning=destination&&projectEventWarning(row,destination);
          return warning?[`${annualDisplayTitle(row.title)}: ${warning}`]:[];
        });
        if(warnings.length&&!globalThis.confirm(`${warnings.join("\n")}\n¿Quieres realizar este cambio?`))return;
      }
      const delta=coverageDelta(plan,next);
      setFeedback("");setPlacement(null);
      if(fromLibrary&&target?.proposal_id)setPending({action,delta});else onAction(action);
    }catch(error){setFeedback(error instanceof Error?error.message:"No se pudo mover esta propuesta.");}
  };
  const startDrag=(event:DragEvent,id:string)=>{event.dataTransfer.setData(dragType,id);event.dataTransfer.effectAllowed="move";setDragging(id);};
  const pointerStart=(event:PointerEvent<HTMLSpanElement>,id:string)=>{
    if(event.button!==0)return;
    event.preventDefault();event.stopPropagation();event.currentTarget.setPointerCapture(event.pointerId);
    pointerDrag.current={id,x:event.clientX,y:event.clientY,moved:false};setDragging(id);
  };
  const pointerMove=(event:PointerEvent<HTMLSpanElement>)=>{
    const active=pointerDrag.current;if(!active)return;
    active.moved ||= Math.hypot(event.clientX-active.x,event.clientY-active.y)>8;
    const hit=document.elementFromPoint(event.clientX,event.clientY);
    setDropTarget(hit?.closest<HTMLElement>("[data-annual-slot]")?.dataset.annualSlot ?? null);
    const scroller=event.currentTarget.closest<HTMLElement>('[aria-label^="Línea de tiempo"]');
    if(scroller){const bounds=scroller.getBoundingClientRect();if(event.clientX<bounds.left+36)scroller.scrollBy(-24,0);else if(event.clientX>bounds.right-36)scroller.scrollBy(24,0);}
  };
  const pointerEnd=(event:PointerEvent<HTMLSpanElement>)=>{
    const active=pointerDrag.current;pointerDrag.current=null;setDragging(null);setDropTarget(null);
    if(!active?.moved)return;
    event.preventDefault();event.stopPropagation();
    const hit=document.elementFromPoint(event.clientX,event.clientY),targetSlotId=hit?.closest<HTMLElement>("[data-annual-slot]")?.dataset.annualSlot;
    if(targetSlotId)propose({kind:"place",proposalId:active.id,targetSlotId});
    else if(hit?.closest('[aria-labelledby="annual-library"]'))propose({kind:"remove",proposalId:active.id});
  };
  const drop=(event:DragEvent,targetSlotId?:string)=>{event.preventDefault();const proposalId=event.dataTransfer.getData(dragType);setDragging(null);setDropTarget(null);if(proposalId&&editable&&!disabled&&locks)propose({kind:targetSlotId?"place":"remove",proposalId,...(targetSlotId?{targetSlotId}:{})});};
  return <>
    {compactView&&feedback&&<p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">{feedback}</p>}
    {compactView&&!detail&&<AnnualCompactTimeline slots={slots} rows={plan.proposed_experiences} period={period} onPeriod={onPeriod} selectedId={selectedId} onSelect={onSelect} onEmpty={id=>{if(editable&&!disabled&&locks)setPlacement(`slot:${id}`);}} today={today} highlightedIds={filter?plan.proposed_experiences.filter(row=>proposalCompetencies(row).includes(filter)).map(row=>row.proposal_id):undefined} disabled={disabled} viewAction={viewAction} listView={listView||calendarTimeline}/>}
    {(!compactView||calendarTimeline)&&<>
    {showTools&&<p className="text-sm text-[#526b87]">15 tramos fijos · 11 de 2 semanas y 4 de 3 semanas. {editable?"Arrastra una propuesta a otro tramo para intercambiarlas. También puedes usar Colocar en otro tramo.":"Abre una revisión para organizar propuestas futuras."}</p>}
    {feedback&&<p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">{feedback}</p>}
    <div className="flex flex-wrap items-center gap-3 text-sm" aria-label="Leyenda del año">{[["Proyecto","bg-teal-100"],["Unidad","bg-violet-100"],["Acogida","bg-emerald-100"],["Gestión","bg-slate-200"]].map(([label,color])=><span key={label} className="flex items-center gap-2"><span className={`size-3 rounded ${color}`} aria-hidden="true"/>{label}</span>)}<span className="text-red-700">Feriado</span><span className="flex items-center gap-1 text-amber-800"><Sun className="size-4"/>Hoy</span></div>
    <div className="flex flex-wrap items-center gap-2"><Button variant="outline" className="min-h-11" aria-label="Ver tramos anteriores" onClick={()=>timelineRef.current?.scrollBy({left:-timelineRef.current.clientWidth*.8,behavior:"smooth"})}><ChevronLeft className="size-5"/></Button><Button variant="outline" className="min-h-11" onClick={revealToday}>Ir a hoy</Button><Button variant="outline" className="min-h-11" aria-label="Ver tramos siguientes" onClick={()=>timelineRef.current?.scrollBy({left:timelineRef.current.clientWidth*.8,behavior:"smooth"})}><ChevronRight className="size-5"/></Button><p className="text-sm text-[#526b87]">Desliza el año o usa las flechas.</p></div>
    <div ref={timelineRef} className="max-w-full overflow-x-auto rounded-xl border border-[#bccfd5] bg-white pb-3" tabIndex={0} role="region" aria-label="Línea de tiempo de Mi año, desplaza horizontalmente para ver todos los tramos">
      <div className="relative min-w-[3060px] px-3 pt-4 pb-2" data-testid="annual-slot-timeline">
        <div className="relative h-11 border-b border-[#d6e5ef]">{Array.from({length:10},(_,i)=>i+3).map(month=><span key={month} className="absolute text-sm font-semibold text-[#526b87]" style={{left:`${annualMapPercent(`${calendar.school_year}-${String(month).padStart(2,"0")}-01`,window)}%`}}>{new Intl.DateTimeFormat("es-PE",{month:"long",timeZone:"UTC"}).format(new Date(`${calendar.school_year}-${String(month).padStart(2,"0")}-01T00:00:00Z`))}</span>)}</div>
        <div className="relative mt-12 h-56">
          {blocks.map(block=><div key={block.start_date} title={`${block.label} · Sin clases`} className="absolute inset-y-0 flex flex-col items-center justify-center rounded-lg bg-[#dce8f2] px-1 text-center text-[#264869]" style={{left:`${annualMapPercent(block.start_date,window)}%`,width:`${annualMapWidth(block.start_date,block.end_date,window)}%`}}><CalendarDays className="mb-2 size-5"/><span className="text-sm font-semibold">Gestión</span><span className="mt-1 text-xs">Sin clases</span></div>)}
          <div title={`${stage.name} · ${compact(stage.starts_on)} – ${compact(stage.ends_on)}`} className="absolute inset-y-0 flex flex-col items-center justify-center rounded-lg bg-emerald-100 px-2 text-center text-emerald-950" style={{left:`${annualMapPercent(stage.starts_on,window)}%`,width:`${annualMapWidth(stage.starts_on,stage.ends_on,window)}%`}}><span className="text-sm font-semibold">Acogida</span><span className="mt-2 text-xs">2 semanas</span></div>
          {slots.map(slot=>{const row=plan.proposed_experiences.find(r=>r.proposal_id===slot.proposal_id), muted=filter&&row&&!proposalCompetencies(row).includes(filter), blocked=slot.starts_on<today || row&&locked(row);return <div key={slot.slot_id} data-annual-slot={slot.slot_id} role="group" aria-label={`Tramo ${slot.index}, ${slot.period}, ${slot.duration_weeks} semanas${row?", "+annualDisplayTitle(row.title):slot.occupancy==="past_unrecorded"?", pasado sin registro":", vacío"}`} onDragOver={e=>{if(dragging&&editable&&!disabled&&!blocked){e.preventDefault();e.dataTransfer.dropEffect="move";setDropTarget(slot.slot_id);}}} onDragLeave={()=>setDropTarget(null)} onDrop={e=>drop(e,slot.slot_id)} className={`absolute inset-y-0 p-1 transition-opacity ${muted?"opacity-35":""}`} style={{left:`${annualMapPercent(slot.starts_on,window)}%`,width:`${annualMapWidth(slot.starts_on,slot.ends_on,window)}%`}}>
            {row?<button type="button" draggable={canMove(row)} onDragStart={e=>startDrag(e,row.proposal_id)} onDragEnd={()=>{setDragging(null);setDropTarget(null);}} onClick={()=>onSelect(row.proposal_id)} aria-pressed={selectedId===row.proposal_id} title={annualDisplayTitle(row.title)} className={`flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl border p-3 text-[#173352] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087d96] ${row.experience_type==="unit"?"border-violet-200 bg-violet-50":"border-teal-200 bg-teal-50"} ${selectedId===row.proposal_id||dropTarget===slot.slot_id?"border-[#087d96] ring-2 ring-[#087d96]":""}`}>
              <ProjectPictogram project={row} className="size-16"/><span className="text-sm font-semibold tabular-nums">{String(slot.index).padStart(2,"0")}</span><span className="line-clamp-2 text-sm font-bold leading-5">{annualDisplayTitle(row.title)}</span><span className="text-xs">{compact(slot.starts_on)} – {compact(slot.ends_on)}</span><span className="text-sm">{slot.historical_dates?.length?`${slot.instructional_dates.length} días restantes`:`${slot.duration_weeks} sem`}</span>{canMove(row)&&<span title="Arrastrar propuesta" onPointerDown={e=>pointerStart(e,row.proposal_id)} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={()=>{pointerDrag.current=null;setDragging(null);setDropTarget(null);}} onDragStart={e=>e.preventDefault()} style={{touchAction:"none"}} className="absolute top-1 right-1 flex size-11 cursor-grab items-center justify-center rounded-lg text-[#526b87] active:cursor-grabbing"><GripVertical className="size-4" aria-hidden="true"/></span>}
            </button>:<button type="button" disabled={!showTools||!editable||disabled||blocked} onClick={()=>{setPlacement(`slot:${slot.slot_id}`);}} className={`flex h-full w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-white p-3 text-[#526b87] ${dropTarget===slot.slot_id?"ring-2 ring-[#087d96]":""}`}><Plus className="size-6"/><b className="text-sm">Tramo {String(slot.index).padStart(2,"0")}</b><span className="text-sm">{slot.occupancy==="past_unrecorded"?"Pasado sin registro":"Sin propuesta"}</span><span className="text-xs">{compact(slot.starts_on)} – {compact(slot.ends_on)}</span><span className="text-sm">{slot.duration_weeks} sem</span></button>}
          </div>;})}
          {holidays.map(h=><div key={h.start} className="pointer-events-none absolute -top-10 bottom-0 z-20 border-l border-red-500" style={{left:`${annualMapPercent(h.start,window)}%`,borderLeftColor:"#dc2626"}}><button type="button" className="pointer-events-auto relative -left-2 size-11 text-red-700" aria-label={`${compact(h.start)} · ${h.labels.join(" · ")} · Feriado nacional`} title={`${compact(h.start)} · ${h.labels.join(" · ")} · Feriado nacional`} onClick={()=>setHolidayOpen(holidayOpen===h.start?null:h.start)}><span aria-hidden="true" style={{borderTopColor:"transparent",borderBottomColor:"transparent",borderLeftColor:"#dc2626"}} className="absolute top-1 left-2 h-0 w-0 border-y-[6px] border-y-transparent border-l-[10px] border-l-red-600"/></button>{holidayOpen===h.start&&<div className="pointer-events-auto absolute -top-10 left-3 w-52 rounded-lg border bg-white p-3 text-sm shadow-md"><b>{compact(h.start)}</b><p>{h.labels.join(" · ")}</p><p className="mt-1 text-xs text-[#526b87]">Feriado nacional</p><button aria-label="Cerrar detalle del feriado" onClick={()=>setHolidayOpen(null)} className="absolute top-1 right-1"><X className="size-4"/></button></div>}</div>)}
          {today>=window.start&&today<=window.end&&<div className="pointer-events-none absolute -top-10 bottom-0 z-30 border-l-2 border-amber-600" style={{left:`${annualMapPercent(today,window)}%`,borderLeftColor:"#d97706"}}><span className="absolute -top-1 left-1 whitespace-nowrap rounded bg-amber-100 px-2 py-1 text-xs font-bold text-amber-950">HOY · {compact(today)}</span></div>}
        </div>
      </div>
    </div>
    </>}
    {children}
    {showTools&&<details open={!compactView||detail} className={compactView?"rounded-xl border border-[#d6e5ef] bg-white p-4":""}><summary className={compactView?"min-h-11 cursor-pointer py-2 font-bold text-[#173773]":"hidden"}>Otras opciones</summary>
    {editable&&plan.proposed_experiences.find(row=>row.proposal_id===selectedId)&&<div className="flex flex-wrap gap-3"><Button variant="outline" disabled={disabled||!canMove(plan.proposed_experiences.find(row=>row.proposal_id===selectedId)!)} onClick={()=>setPlacement(selectedId)}>Colocar en otro tramo</Button><Button variant="ghost" disabled={disabled||!canMove(plan.proposed_experiences.find(row=>row.proposal_id===selectedId)!)} onClick={()=>selectedId&&propose({kind:"remove",proposalId:selectedId})}>Retirar a Biblioteca</Button></div>}
    {editable&&onProtection&&selectedId&&<Button variant="outline" disabled={disabled} onClick={()=>onProtection(selectedId)}>{plan.proposed_experiences.find(row=>row.proposal_id===selectedId)?.teacher_protected?"Permitir cambios en esta propuesta":"Conservar esta propuesta ante cambios de Ayni"}</Button>}
    <details aria-labelledby="annual-library" onDragOver={e=>{if(dragging&&editable&&!disabled){e.preventDefault();e.currentTarget.open=true;}}} onDrop={e=>drop(e)} className={`border-t border-[#d6e5ef] pt-6 ${dragging?"rounded-xl bg-[#f0f8f8] p-5":""}`}>
      <summary id="annual-library" className="min-h-11 cursor-pointer py-2 text-lg font-bold text-[#172b52]">Biblioteca de propuestas · {plan.available_experiences?.length??0}</summary>{editable&&<Button className="mt-3" variant="outline" disabled={disabled} onClick={()=>setNewOpen(true)}><Plus className="size-4"/>Nueva propuesta</Button>}<p className="mt-2 text-sm text-[#526b87]">Conserva alternativas aquí. No tienen fechas hasta colocarlas en un tramo. {compactView?"Usa Retirar a Biblioteca para conservar una alternativa sin fechas.":"Puedes retirar una propuesta del año arrastrándola a esta sección."}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{(plan.available_experiences ?? []).map(row=><article key={row.proposal_id} draggable={editable&&!disabled&&!!locks} onDragStart={e=>startDrag(e,row.proposal_id)} onDragEnd={()=>setDragging(null)} className="flex gap-4 rounded-xl border border-[#d6e5ef] bg-white p-4"><ProjectPictogram project={row} className="size-16"/><div className="min-w-0"><p className="text-xs font-semibold text-[#526b87]">{row.experience_type==="unit"?"Unidad":"Proyecto"}</p><h3 className="mt-1 line-clamp-2 font-bold" title={annualDisplayTitle(row.title)}>{annualDisplayTitle(row.title)}</h3><p className="mt-2 line-clamp-2 text-sm text-[#526b87]">{row.purpose}</p><div className="mt-3 flex flex-wrap gap-2">{proposalCompetencies(row).map((id:string)=><button key={id} onClick={()=>setOfficial(id)} title={names.get(id) ?? id} className="rounded bg-teal-50 px-2 py-1 text-xs text-teal-900">{competencyLabel(id,names.get(id) ?? id)}</button>)}</div>{editable&&<Button className="mt-3" variant="outline" disabled={disabled||!locks} onClick={()=>setPlacement(row.proposal_id)}>Incorporar</Button>}</div></article>)}
      {!plan.available_experiences?.length&&<p className="py-6 text-sm text-[#526b87]">Todavía no tienes alternativas. Retira una propuesta del año o crea una nueva con Ayni.</p>}</div>
    </details>
    {editable&&<details aria-labelledby="annual-opportunities" className="border-t border-[#d6e5ef] pt-6"><summary id="annual-opportunities" className="min-h-11 cursor-pointer py-2 text-lg font-bold text-[#172b52]">Revisar oportunidades por competencia</summary><p className="mt-2 text-sm text-[#526b87]">Las propuestas son oportunidades planificadas. No indican el nivel de los niños.</p><label className="mt-3 block text-sm font-semibold">Resaltar una competencia<select className="mt-1 min-h-11 w-full rounded-xl border bg-white px-3" value={filter??""} onChange={event=>setFilter(event.target.value||null)}><option value="">Todas las competencias</option>{coverage.map((c:{id:string;name:string})=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>{filter&&coverage.filter((c:{id:string})=>c.id===filter).map((c:{id:string;total:number;periods:number[];everyday:boolean})=><p key={c.id} className="mt-3 text-sm text-[#526b87]">{c.total} propuestas · {c.periods.map((count,index)=>`Bimestre ${index+1}: ${count}`).join(" · ")}{c.everyday?" · También aparece en momentos cotidianos, sin aumentar el conteo.":""}</p>)}</details>}
    {official&&<p role="status" className="flex items-center justify-between gap-3 rounded-lg bg-[#f0f8fa] p-3 text-sm"><span>{names.get(official)??"Competencia seleccionada"}</span><Button variant="ghost" size="icon" aria-label="Cerrar nombre oficial" onClick={()=>setOfficial(null)}><X className="size-4"/></Button></p>}
    </details>}
    <Dialog open={!!placement} onOpenChange={open=>{if(!open)setPlacement(null);}}><DialogContent><DialogHeader><DialogTitle>{placement?.startsWith("slot:")?"Elegir una propuesta de Biblioteca":"Colocar en un tramo"}</DialogTitle><DialogDescription>Los tramos conservan sus fechas. Una propuesta pasa a tener la duración del tramo que ocupa.</DialogDescription></DialogHeader><div className="max-h-80 space-y-2 overflow-y-auto">{placement?.startsWith("slot:")?(plan.available_experiences ?? []).map(row=><Button key={row.proposal_id} variant="outline" className="h-auto w-full justify-start whitespace-normal py-3" onClick={()=>propose({kind:"place",proposalId:row.proposal_id,targetSlotId:placement.slice(5)})}>{annualDisplayTitle(row.title)}</Button>):slots.map(slot=><Button key={slot.slot_id} disabled={disabled||slot.starts_on<today||!!plan.proposed_experiences.find(r=>r.proposal_id===slot.proposal_id&&locked(r))} variant="outline" className="h-auto w-full justify-start whitespace-normal py-3" onClick={()=>placement&&propose({kind:"place",proposalId:placement,targetSlotId:slot.slot_id})}>Tramo {slot.index} · {compact(slot.starts_on)} – {compact(slot.ends_on)} · {slot.duration_weeks} sem{slot.proposal_id?" · Intercambiar o sustituir":" · Vacío"}</Button>)}</div></DialogContent></Dialog>
    <Dialog open={!!pending} onOpenChange={open=>{if(!open)setPending(null);}}><DialogContent><DialogHeader><DialogTitle>Cómo cambia tu año</DialogTitle><DialogDescription>La propuesta anterior pasará a Biblioteca. Los conteos muestran propuestas diferentes, no niveles ni horas.</DialogDescription></DialogHeader>{pending?.delta.length?<ul className="space-y-3">{pending.delta.map(c=><li key={c.id} className="flex flex-wrap justify-between gap-2"><span>{competencyLabel(c.id,c.name)}</span><b>{c.before} → {c.after}</b>{c.missing&&<span className="w-full text-sm text-amber-900">Quedaría sin oportunidad anual ni cotidiana. Resuélvelo antes de confirmar el año.</span>}</li>)}</ul>:<p className="text-sm">Los conteos curriculares se mantienen.</p>}<div className="mt-4 flex gap-3"><Button variant="outline" onClick={()=>setPending(null)}>Cancelar</Button><Button disabled={disabled} onClick={()=>{if(pending)onAction(pending.action);setPending(null);}}>Sustituir propuesta</Button></div></DialogContent></Dialog>
    <NewAnnualProposal reviewPeriodId={readWorkspaceParams("Planificar").get("reviewPeriod")??undefined} curriculumReference={plan.curriculum_reference} open={newOpen} onOpenChange={open=>{setNewOpen(open);if(!open)writeWorkspaceLocation("Planificar",{reviewPeriod:""},true);}} planId={planId} revision={revision} onApproved={onReload}/>
  </>;
}

export function AnnualPlacementActions({row,onPlace,onRemove,disabled}:{row:Row;onPlace:(id:string)=>void;onRemove:(id:string)=>void;disabled:boolean}) {
  return <><Button variant="outline" disabled={disabled} onClick={()=>onPlace(row.proposal_id)}>Colocar en otro tramo</Button><Button variant="ghost" disabled={disabled} onClick={()=>onRemove(row.proposal_id)}>Retirar a Biblioteca</Button></>;
}
