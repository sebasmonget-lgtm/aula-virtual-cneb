"use client";

import { useCallback,useEffect,useMemo,useState } from "react";
import { ChevronLeft,ChevronRight,CalendarDays,Cake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUnsavedWork } from "@/src/lib/use-unsaved-work";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { calendarLocationDate } from "@/src/lib/workspace-selection.mjs";
import { apiFetch } from "@/src/lib/ayni-api-fetch";
import { calendarWeekDays, calendarWeekLabel, navigateCalendarPeriod } from "@/src/lib/school-calendar-navigation.mjs";
import { readWorkspaceParams, useWorkspaceParam, useWorkspaceSubview } from "@/src/lib/workspace-location";
import { localDatabaseApiUrl, type StudentBirthday } from "@/src/lib/local-database";
import { LoadingState,PageIntro,WorkflowFeedback } from "./workflow-ui";
import {calendarActivityState,calendarProjectsOnDay} from "@/src/lib/daily-dashboard-display.mjs";
import calendarStyles from "./calendar-overview.module.css";

type Day={id:string;date:string;calendar_type:string;is_instructional:boolean;source:string;reason:string;editable:boolean;school_override:boolean};
type Experience={id:string;title:string;type:"project"|"unit"|"workshop";starts_on:string;ends_on:string;status:string;source_proposal_id?:string;annual_status?:string;details?:{activity_route?:unknown[];decisions?:{competency_ids?:string[]}}};
type Activity={id:string;title:string;purpose:string|null;occurs_on:string;planned_date:string|null;schedule_status:string;status:string;execution_status?:string;sequence_locked?:boolean;experience_id:string;experience_title:string;experience_type:string;details?:{competency_id?:string};start_time:string};
type CalendarData={classroom:{id:string;section:string;year:number;starts_on:string;ends_on:string};version:{name:string;version:string;source_name:string;source_url:string;source_metadata:Record<string,unknown>};days:Day[];blocks:{type:string;label:string;start_date:string;end_date:string;sort_order:number}[];experiences:Experience[];activities:Activity[];birthdays?:StudentBirthday[]};


const dayKey=(date:Date)=>date.toISOString().slice(0,10);
const asDate=(value:string)=>new Date(`${value}T00:00:00Z`);
const todayKey=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"America/Lima",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const longDate=(value:string)=>new Intl.DateTimeFormat("es-PE",{weekday:"long",day:"numeric",month:"long",timeZone:"UTC"}).format(asDate(value));
const reasonLabel=(day?:Day)=>!day?"Fuera del año escolar":day.calendar_type==="instructional_day"?"Día de clase":day.calendar_type==="weekend"?"Fin de semana":day.calendar_type==="national_holiday"?day.reason:day.calendar_type==="management_week"?"Semana de gestión":day.reason;
const color=(day?:Day)=>!day?"bg-slate-50 text-slate-400":day.calendar_type==="management_week"?"bg-[#f2eafd] text-[#6843a5]":day.calendar_type==="school_non_instructional"?"bg-[#fff4d9] text-[#8a5b08]":day.is_instructional?"bg-[#e8f7f0] text-[#236c57]":"bg-[#fff0f0] text-[#8f3c3c]";
const json=async<T,>(path:string,init?:RequestInit)=>{const response=await apiFetch(`${localDatabaseApiUrl}${path}`,init);const body=await response.json() as T&{error?:string};if(!response.ok)throw new Error(body.error??"No se pudo cargar el calendario.");return body;};

const calendarViews = ["month", "week", "year"] as const;
export function SchoolCalendarScreen({onOpenPlanning,onOpenActivity,todayDate}:{todayDate?:string;onOpenPlanning:(proposalId?:string)=>void;onOpenActivity:(activity:{id:string;experience_id:string})=>void}){
  const today=todayDate??todayKey();
  const [data,setData]=useState<CalendarData|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true);
  const [view,setView]=useWorkspaceSubview("Calendario", "view", calendarViews, "month"),[selected,setSelected]=useWorkspaceParam("Calendario", "date", today, calendarLocationDate);
  const [cursorKey,setCursorKey]=useWorkspaceParam("Calendario", "cursor", `${today.slice(0,7)}-01`, calendarLocationDate);
  const cursor=useMemo(()=>asDate(cursorKey),[cursorKey]);
  const birthdayYear=cursor.getUTCFullYear();
  const setCursor=(date:Date)=>setCursorKey(dayKey(date));
  const [reason,setReason]=useState(""),[reprogram,setReprogram]=useState<{id:string;date:string;reason:string}|null>(null);
  const [busy,setBusy]=useState(false);
  const allowLeave=useUnsavedWork(Boolean(reason.trim()||reprogram),busy);
  const [workshop,setWorkshop]=useState<Activity|null>(null);
  const load=useCallback(async()=>{setLoading(true);setError("");try{const next=await json<CalendarData>(`/api/school-calendar?birthdayYear=${birthdayYear}`);setData(next);const fallback=next.days.find((day)=>day.date===today)?.date??next.days.find((day)=>day.is_instructional)?.date??next.days[0]?.date;if(fallback){const params=readWorkspaceParams("Calendario");const chosen=calendarLocationDate(params.get("date"))??fallback;setSelected(chosen);const date=asDate(chosen);setCursorKey(calendarLocationDate(params.get("cursor"))??`${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,"0")}-01`);}}catch(cause){setError(cause instanceof Error?cause.message:"No se pudo abrir el calendario.");}finally{setLoading(false);}},[setSelected,setCursorKey,today,birthdayYear]);
  useEffect(()=>{const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer);},[load]);
  const byDate=useMemo(()=>new Map(data?.days.map((day)=>[day.date,day])??[]),[data]);
  const monthDays=useMemo(()=>{const first=new Date(Date.UTC(cursor.getUTCFullYear(),cursor.getUTCMonth(),1)),last=new Date(Date.UTC(cursor.getUTCFullYear(),cursor.getUTCMonth()+1,0));const start=new Date(first);start.setUTCDate(start.getUTCDate()-((start.getUTCDay()+6)%7));const end=new Date(last);end.setUTCDate(end.getUTCDate()+(7-((end.getUTCDay()+6)%7)-1));const rows=[];for(const d=new Date(start);d<=end;d.setUTCDate(d.getUTCDate()+1))rows.push(dayKey(d));return rows;},[cursor]);
  const visibleDays=useMemo(()=>view==="week"?calendarWeekDays(selected):monthDays,[view,monthDays,selected]);
  const movePeriod=(direction:number)=>{if(!allowLeave())return;setReason("");setReprogram(null);const next=navigateCalendarPeriod(view,selected,cursor,direction);setSelected(next.selected);setCursor(next.cursor);};
  const selectedActivities=data?.activities.filter((item)=>item.occurs_on===selected&&item.schedule_status!=='cancelled')??[];
  const selectedBirthdays=data?.birthdays?.filter(item=>item.date===selected)??[];
  const selectedDay=byDate.get(selected);
  const selectedLabel=reasonLabel(selectedDay);
  const selectedReason=selectedDay?.reason&&selectedDay.reason!==selectedLabel?` · ${selectedDay.reason}`:"";

  async function saveOverride(){if(busy||!selectedDay?.editable||!reason.trim())return;setBusy(true);try{await json("/api/school-calendar/override",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({date:selected,isInstructional:false,reason})});setReason("");await load();}catch(cause){setError(cause instanceof Error?cause.message:"No se pudo cambiar el día.");}finally{setBusy(false);}}
  async function saveReprogram(){if(busy||!reprogram?.date||!reprogram.reason.trim())return;setBusy(true);try{await json(`/api/activities/${reprogram.id}/reschedule`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({newDate:reprogram.date,reason:reprogram.reason,changeType:"rescheduled"})});setReprogram(null);await load();}catch(cause){setError(cause instanceof Error?cause.message:"No se pudo reprogramar.");}finally{setBusy(false);}}
  async function markNotWorked(activityId:string){if(busy||!allowLeave())return;setBusy(true);try{await json(`/api/activities/${activityId}/reschedule`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({reason:"La docente indicó que la actividad no se realizó en la fecha prevista.",changeType:"not_worked"})});setReprogram(null);await load();}catch(cause){setError(cause instanceof Error?cause.message:"No se pudo actualizar la actividad.");}finally{setBusy(false);}}
  if(loading)return <LoadingState label="Preparando el calendario escolar..."/>;
  if(!data)return <WorkflowFeedback tone="error">{error||"Calendario no disponible."}</WorkflowFeedback>;
  const title=view==="week"?calendarWeekLabel(selected):new Intl.DateTimeFormat("es-PE",{month:"long",year:"numeric",timeZone:"UTC"}).format(cursor);
  return <section className={calendarStyles.page}>
    {error&&<WorkflowFeedback tone="error">{error}</WorkflowFeedback>}
    <div className={calendarStyles.layout}>
      <div className={calendarStyles.main}>
        <PageIntro title="Calendario escolar" description="Clases, proyectos, actividades y cumpleaños en un mismo lugar." illustration="/project-illustrations/flower.webp"/>
        <div className={calendarStyles.toolbar}>
          <div className="flex gap-2"><Button variant="outline" onClick={()=>{if(!allowLeave())return;setReason("");setReprogram(null);const d=asDate(today);setCursor(new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1)));setSelected(today);}}>Hoy</Button>
            {(["month","week","year"] as const).map(item=><Button key={item} aria-pressed={view===item} variant={view===item?"default":"outline"} onClick={()=>{if(allowLeave())setView(item);}}>{item==="month"?"Mes":item==="week"?"Semana":"Año"}</Button>)}
          </div>
          <nav className={calendarStyles.periodNav} aria-label="Período del calendario"><Button variant="outline" size="icon" aria-label={view==="week"?"Semana anterior":view==="year"?"Año anterior":"Mes anterior"} onClick={()=>movePeriod(-1)}><ChevronLeft/></Button><h2>{view==="year"?cursor.getUTCFullYear():title}</h2><Button variant="outline" size="icon" aria-label={view==="week"?"Semana siguiente":view==="year"?"Año siguiente":"Mes siguiente"} onClick={()=>movePeriod(1)}><ChevronRight/></Button></nav>
        </div>
        <section className={calendarStyles.calendar} aria-label="Calendario de actividades">
          {view==="year"?<div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({length:12},(_,month)=>{const items=data.days.filter(day=>asDate(day.date).getUTCFullYear()===cursor.getUTCFullYear()&&asDate(day.date).getUTCMonth()===month);return <button key={month} className="min-h-24 rounded-xl border bg-[#eff9f3] p-4 text-left hover:border-[#087d96]" onClick={()=>{if(!allowLeave())return;setReason("");setReprogram(null);setCursor(new Date(Date.UTC(cursor.getUTCFullYear(),month,1)));setView("month");}}><b className="capitalize">{new Intl.DateTimeFormat("es-PE",{month:"long",timeZone:"UTC"}).format(new Date(Date.UTC(cursor.getUTCFullYear(),month,1)))}</b><span className="mt-2 block text-sm text-[#526b87]">{items.filter(day=>day.is_instructional).length} días de clase</span></button>})}</div>:
          <><div className={calendarStyles.weekdays}>{["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(day=><span key={day}>{day}</span>)}</div>
          <div className={calendarStyles.days}>{visibleDays.map(date=>{const day=byDate.get(date),outside=asDate(date).getUTCMonth()!==cursor.getUTCMonth(),activities=data.activities.filter(item=>item.occurs_on===date&&item.schedule_status!=="cancelled"),projects=calendarProjectsOnDay(data,date),birthdays=data.birthdays?.filter(item=>item.date===date)??[];
            return <button key={date} type="button" onClick={()=>{if(date===selected||!allowLeave())return;setReason("");setReprogram(null);setSelected(date);}} aria-pressed={selected===date} aria-label={`${longDate(date)}: ${reasonLabel(day)}${projects.length?` · ${projects.map(item=>item.title).join(" · ")}`:""}${activities.length?` · ${activities.length} actividades`:""}${birthdays.length?` · Cumpleaños de ${birthdays.map(item=>item.name).join(", ")}`:""}`} className={`${calendarStyles.day} ${color(day)} ${outside?calendarStyles.outside:""}`}>
              <span className={calendarStyles.dayNumber}>{date.slice(8)}</span><span className={calendarStyles.dayReason}>{day?.calendar_type==="management_week"?"Gestión":reasonLabel(day)}</span>
              {birthdays.map(child=><span key={child.student_id+child.date} className={calendarStyles.birthdayTag}><Cake size={14} aria-hidden="true"/><span>{child.short_name||child.name.split(" ")[0]}</span></span>)}
              {!!projects.length&&<span className={calendarStyles.projectTag}><span aria-hidden="true" className={calendarStyles.projectDot}/><span className={calendarStyles.projectTitle}>{projects[0].title}</span>{!!activities.length&&<b>{activities.length}</b>}</span>}
              {!projects.length&&!!activities.length&&<span className={calendarStyles.count} aria-label={`${activities.length} actividades`}>{activities.length}</span>}
            </button>;
          })}</div></>}
        </section>
        <div className={calendarStyles.legend}><span><i className="bg-[#2b9f71]"/>Clase</span><span><i className="bg-[#df6478]"/>Sin clases / feriado</span><span><i className="bg-[#8961c0]"/>Semana de gestión</span><span><i className="bg-[#d59c26]"/>Excepción del colegio</span><span><i className="bg-[#087d96]"/>Actividad programada</span><span className={calendarStyles.birthdayLegend}><Cake size={14} aria-hidden="true"/>Cumpleaños</span></div>
      </div>
      <details className={calendarStyles.selection}><summary className="min-h-11 cursor-pointer font-semibold">Opciones y detalle del día</summary><div className={calendarStyles.selectedHeading}><CalendarDays size={26}/><h2>{longDate(selected)}</h2><span className={color(selectedDay)}>{selectedLabel}</span></div>{selectedReason&&<p className="mt-2 text-sm text-[#526b87]">{selectedDay?.reason}</p>}{calendarProjectsOnDay(data,selected).map((item)=><p key={item.id} className="mt-2 break-words text-sm font-semibold text-[#344c8a]">{item.title}</p>)}{selectedActivities.length?<div className="mt-4 space-y-3">{selectedActivities.map((activity)=><article key={activity.id} className="rounded-xl border p-4"><div className="flex flex-wrap justify-between gap-2"><div><b>{activity.title}</b><p className="text-sm text-[#526b87]">{activity.start_time?activity.start_time.slice(0,5):"Hora por definir"} · {activity.experience_title} · {calendarActivityState(activity,today).label}</p></div><Button variant="outline" onClick={()=>activity.experience_type==="workshop"?setWorkshop(activity):onOpenActivity(activity)}>Ver actividad</Button></div>{reprogram?.id===activity.id?<div className="mt-3 grid gap-2 sm:grid-cols-[150px_1fr_auto]"><div><label className="mb-1 block text-sm font-semibold" htmlFor={`reschedule-date-${activity.id}`}>Nueva fecha</label><Input id={`reschedule-date-${activity.id}`} type="date" value={reprogram.date} onChange={(event)=>setReprogram({...reprogram,date:event.target.value})}/></div><div><label className="mb-1 block text-sm font-semibold" htmlFor={`reschedule-reason-${activity.id}`}>Motivo de reprogramación</label><Input id={`reschedule-reason-${activity.id}`} placeholder="Motivo" value={reprogram.reason} onChange={(event)=>setReprogram({...reprogram,reason:event.target.value})}/></div><Button className="self-end" disabled={busy||!reprogram.reason.trim()} onClick={()=>void saveReprogram()}>Guardar reprogramación</Button><Button variant="outline" disabled={busy} onClick={()=>{if(allowLeave())setReprogram(null);}}>Cancelar</Button></div>:<div className="mt-2 flex flex-wrap gap-2">{!activity.sequence_locked&&<Button variant="outline" disabled={busy} onClick={()=>{if(allowLeave())setReprogram({id:activity.id,date:activity.occurs_on,reason:""});}}>Reprogramar</Button>}{calendarActivityState(activity,today).canMarkNotWorked&&<Button variant="outline" disabled={busy} onClick={()=>void markNotWorked(activity.id)}>Marcar como no realizada</Button>}</div>}</article>)}</div>:<div className={calendarStyles.emptyDay}><CalendarDays size={42}/><div><strong>No hay actividades programadas para este día.</strong><p>{selectedDay?.is_instructional?"Puedes revisar tus próximas actividades en Mi año.":selectedLabel+"."}</p></div></div>}
      <Dialog open={!!workshop} onOpenChange={open=>{if(!open)setWorkshop(null);}}><DialogContent><DialogHeader><DialogTitle>{workshop?.title??"Actividad seleccionada"}</DialogTitle><DialogDescription>Taller · {workshop?longDate(workshop.occurs_on):""} · {workshop?.status==="active"?"Confirmada":"Pendiente"}</DialogDescription></DialogHeader>{workshop?.purpose&&<p>{workshop.purpose}</p>}<Button onClick={()=>setWorkshop(null)}>Cerrar</Button></DialogContent></Dialog>
      {selectedDay?.is_instructional&&selectedDay.editable&&<div className="mt-4 border-t pt-4"><details><summary className="min-h-11 cursor-pointer font-semibold">Cambiar este día a sin clases</summary><div className="mt-2 flex flex-col gap-2 sm:flex-row"><div className="flex-1"><label className="mb-1 block text-sm font-semibold" htmlFor="calendar-exception-reason">Motivo de la excepción</label><Input id="calendar-exception-reason" value={reason} onChange={(event)=>setReason(event.target.value)} placeholder="Ej.: actuación por aniversario"/></div><Button className="self-end" variant="outline" disabled={busy||!reason.trim()} onClick={()=>void saveOverride()}>Marcar sin clases</Button></div></details></div>}</details>
      <aside className={calendarStyles.aside}>
        {selectedBirthdays.length>0&&<section className={`${calendarStyles.daySummary} ${calendarStyles.birthdaySummary}`} aria-label="Cumpleaños del día elegido"><h2><Cake size={22} aria-hidden="true"/>Cumpleaños</h2><ul>{selectedBirthdays.map(child=><li key={child.student_id+child.date}><strong>{child.name}</strong>{child.leap_day_adjusted&&<p>Nació el 29 de febrero; este año lo recordamos el 28.</p>}</li>)}</ul></section>}
        <section className={calendarStyles.daySummary} aria-label="Resumen del día elegido"><h2>{longDate(selected)}</h2><p>{selectedLabel}</p>{selectedActivities.length?selectedActivities.map(activity=><button key={activity.id} className={calendarStyles.activityLink} type="button" onClick={()=>onOpenActivity(activity)}><span><strong>{activity.title}</strong><small>{activity.experience_type==='workshop'?'Taller':activity.experience_title}</small></span><ChevronRight size={18}/></button>):<p>No hay actividades programadas.</p>}</section>
        {calendarProjectsOnDay(data,selected).map(project=><section key={project.id} className={calendarStyles.daySummary} aria-label="Proyecto del día"><p>Proyecto de este día</p><h2 className="mt-2">{project.title}</h2><Button className="mt-3" variant="outline" onClick={()=>onOpenPlanning(project.source_proposal_id)}>Ver proyecto</Button></section>)}
      </aside>
    </div>
  </section>;
}
