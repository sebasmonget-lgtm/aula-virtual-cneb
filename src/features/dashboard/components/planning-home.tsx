"use client";

import { BookOpen, CalendarDays, Check, ChevronRight, ClipboardCheck, Sparkles } from "lucide-react";
import type { LocalDashboard } from "@/src/lib/local-database";

type Journey = {
  diagnostic: string; annual: string; experience: string; activity: string;
  recommended: "diagnostic" | "annual" | "experiences" | "activities";
  studentCount: number; hasConfirmedAnnual: boolean;
};
type Step = Journey["recommended"];
const steps: { id: Step; name: string }[] = [
  { id: "diagnostic", name: "Diagnóstico" }, { id: "annual", name: "Plan anual" },
  { id: "experiences", name: "Proyecto" }, { id: "activities", name: "Actividad" },
];
const label = (status: string) => status === "reviewed" ? "Revisado" : status === "confirmed" ? "Confirmado" :
  status === "draft" ? "Borrador guardado" : status === "in_progress" ? "En curso" : "Por empezar";

export function PlanningHome({ journey, dashboard, onOpen, onWorkshops }: {
  journey: Journey; dashboard: LocalDashboard; onOpen: (step: Step) => void; onWorkshops: () => void;
}) {
  const recommended = steps.find((item) => item.id === journey.recommended) ?? steps[0];
  const status = (step: Step) => step === "diagnostic" ? journey.diagnostic : step === "annual" ? journey.annual : step === "experiences" ? journey.experience : journey.activity;
  const cards = [
    { id: "annual" as const, title: "Plan anual", Icon: CalendarDays, tint: "bg-[#e9f8f2] text-[#287561]" },
    { id: "experiences" as const, title: "Proyecto o unidad", Icon: BookOpen, tint: "bg-[#e8f7fa] text-[#0b7891]" },
    { id: "activities" as const, title: "Actividad", Icon: Sparkles, tint: "bg-[#f1eaff] text-[#7952b8]" },
  ];
  return <div className="space-y-6">
    <header><h1 className="text-3xl font-extrabold tracking-tight text-[#1c2e50]">Planificar</h1><p className="mt-1 text-[#566883]">Avanza un paso a la vez. Ayni completa lo repetitivo.</p></header>
    <section className="rounded-[1.5rem] border border-[#d4e1ed] bg-white p-5 shadow-sm" aria-label="Continuar planificación">
      <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-extrabold text-[#1c2e50]">Continúa donde lo dejaste</h2><span className="rounded-full bg-[#fff2d8] px-3 py-1 text-xs font-bold text-[#9a641a]">{label(status(recommended.id))}</span></div>
      <p className="mt-4 text-xl font-bold text-[#1c2e50]">{recommended.id === "diagnostic" ? "Conoce a tu grupo" : recommended.id === "annual" ? "Prepara el plan anual" : recommended.id === "experiences" ? "Desarrolla una propuesta" : "Prepara la próxima actividad"}</p>
      <p className="mt-1 text-sm text-[#566883]">{journey.studentCount} niños en el aula · {dashboard.profile.age_label}</p>
      <ol className="mt-5 grid grid-cols-4 gap-2" aria-label="Avance de planificación">{steps.map((step, index) => {
        const done = ["reviewed", "confirmed"].includes(status(step.id));
        return <li key={step.id} className="text-center"><span className={`mx-auto grid size-8 place-items-center rounded-full text-sm font-bold ${done ? "bg-[#287561] text-white" : step.id === journey.recommended ? "bg-[#0b7891] text-white" : "bg-[#e3eaf3] text-[#64748c]"}`}>{done ? <Check className="size-4" /> : index + 1}</span><span className="mt-2 block text-xs text-[#566883]">{step.name}</span></li>;
      })}</ol>
      <button type="button" onClick={() => onOpen(recommended.id)} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0b7891] px-4 font-bold text-white hover:bg-[#08677d]">Continuar {recommended.name.toLocaleLowerCase("es-PE")} <ChevronRight className="size-4" /></button>
    </section>
    <section><h2 className="mb-3 text-xl font-extrabold text-[#1c2e50]">¿Qué quieres preparar?</h2><div className="grid grid-cols-2 gap-3">{cards.map(({ id, title, Icon, tint }) => <button key={id} type="button" onClick={() => onOpen(id)} className="flex min-h-32 flex-col items-start rounded-[1.3rem] border border-[#d4e1ed] bg-white p-4 text-left hover:border-[#8acbd8] hover:shadow-sm"><span className={`grid size-10 place-items-center rounded-xl ${tint}`}><Icon className="size-5" /></span><b className="mt-2 text-[#1c2e50]">{title}</b><small className="mt-1 text-[#376d71]">{label(status(id))}</small><span className="mt-auto pt-2 text-sm font-bold text-[#07576c]">Abrir →</span></button>)}<button type="button" onClick={onWorkshops} className="flex min-h-32 flex-col items-start rounded-[1.3rem] border border-[#d4e1ed] bg-white p-4 text-left hover:border-[#8acbd8] hover:shadow-sm"><span className="grid size-10 place-items-center rounded-xl bg-[#fff2d8] text-[#ad741f]"><ClipboardCheck className="size-5" /></span><b className="mt-2 text-[#1c2e50]">Taller</b><small className="mt-1 text-[#926329]">Elegir de Biblioteca</small><span className="mt-auto pt-2 text-sm font-bold text-[#07576c]">Abrir →</span></button></div></section>
    <aside className="rounded-[1.4rem] bg-[#eef8fc] p-5"><h2 className="font-extrabold text-[#1c2e50]">Lo que Ayni tiene a mano</h2><ul className="mt-3 space-y-2 text-sm text-[#536681]"><li><Check className="mr-2 inline size-4 text-[#287561]" /> Aula · {dashboard.profile.age_label} · {journey.studentCount} niños</li><li><span className="mr-2 inline-block w-4 text-center text-[#287561]">{journey.diagnostic === "reviewed" ? "✓" : "○"}</span> Diagnóstico · {label(journey.diagnostic)}</li><li><Check className="mr-2 inline size-4 text-[#287561]" /> Currículo filtrado para {dashboard.profile.age_label}</li></ul></aside>
  </div>;
}
