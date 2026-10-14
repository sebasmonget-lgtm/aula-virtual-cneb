"use client";

import { displayDate } from "@/src/lib/display-date";
import {Check} from 'lucide-react';

export type ProjectCalendarDay = { date: string; is_instructional: boolean; calendar_type: string; reason: string; selected?: boolean; exclusion_reason?: string | null };

export function ProjectCalendarReview({ days, selectedDates, onChange, disabled }: {
  days: ProjectCalendarDay[]; selectedDates: string[]; onChange: (dates: string[]) => void; disabled: boolean;
}) {
  const months = [...new Set(days.map(day => day.date.slice(0, 7)))];
  return <div className="mt-4 space-y-4">
    <p className="text-sm text-[#526b87]">Toca un día para marcarlo o quitarlo. Los fines de semana, feriados y días sin clase no se pueden elegir.</p>
    <div className="flex flex-wrap items-center gap-4 text-sm"><span className="flex items-center gap-2"><span className="size-4 rounded border border-[#087d96] bg-[#dff3f7]" aria-hidden="true"/>Elegido</span><span className="flex items-center gap-2"><span className="size-4 rounded border bg-[#f1f4f7]" aria-hidden="true"/>Sin clase</span><strong className="ml-auto text-[#07576c]" role="status">{selectedDates.length} días elegidos</strong></div>
    {months.map(month => {
      const monthDays = days.filter(day => day.date.startsWith(month));
      const offset = (new Date(`${monthDays[0].date}T12:00:00Z`).getUTCDay() + 6) % 7;
      return <section key={month}><h3 className="mb-2 font-semibold">{new Intl.DateTimeFormat("es-PE", {month:"long", year:"numeric",timeZone:"UTC"}).format(new Date(`${month}-01T12:00:00Z`))}</h3>
        <div className="grid grid-cols-7 gap-1">{["L", "M", "M", "J", "V", "S", "D"].map((label,index) => <span key={index} className="py-1 text-center text-xs font-semibold" aria-hidden="true">{label}</span>)}
          {Array.from({length:offset},(_,index) => <span key={`gap-${index}`} />)}
          {monthDays.map(day => <button key={day.date} type="button" aria-pressed={selectedDates.includes(day.date)}
            aria-label={`${displayDate(day.date)}: ${selectedDates.includes(day.date) ? "día del proyecto" : day.reason || day.calendar_type}`}
            title={day.reason || day.calendar_type} disabled={disabled || !day.is_instructional}
            onClick={() => onChange(selectedDates.includes(day.date) ? selectedDates.filter(date => date !== day.date) : [...selectedDates,day.date].sort())}
            className={`relative min-h-11 rounded-lg border text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#087d96] ${selectedDates.includes(day.date) ? "border-[#087d96] bg-[#dff3f7] text-[#07576c]" : day.is_instructional ? "bg-white text-[#526b87]" : "bg-[#f1f4f7] text-[#526b87]"}`}>{Number(day.date.slice(-2))}{selectedDates.includes(day.date)&&<Check size={12} aria-hidden="true" className="absolute right-1 top-1"/>}</button>)}
        </div></section>;
    })}
    <ul className="space-y-1 text-sm text-[#526b87]">{days.filter(day => !day.is_instructional && !["weekend"].includes(day.calendar_type)).map(day => <li key={day.date}>{displayDate(day.date)} · {day.reason || day.calendar_type}</li>)}</ul>
  </div>;
}
