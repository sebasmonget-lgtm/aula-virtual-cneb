"use client";

import { Check, ChevronRight } from "lucide-react";
import type { LocalDashboard } from "@/src/lib/local-database";
import { canOpenPlanningStep } from "@/src/lib/planning-journey.mjs";

type Journey = {
  diagnostic: string; annual: string; experience: string; activity: string;
  recommended: "diagnostic" | "annual" | "experiences" | "activities";
  studentCount: number; hasConfirmedAnnual: boolean; hasConfirmedExperience: boolean;
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
  return <div className="space-y-6">
    <header><h1 className="text-3xl font-extrabold tracking-tight text-[#1c2e50]">Planificar</h1><p className="mt-1 text-[#566883]">Empieza por el siguiente paso o entra a uno que ya preparaste. Las actividades y los talleres se organizan dentro de cada proyecto.</p></header>
    <section className="rounded-[1.5rem] border border-[#d4e1ed] bg-white p-5 shadow-sm" aria-label="Continuar planificación">
      <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-extrabold text-[#1c2e50]">Continúa donde lo dejaste</h2><span className="rounded-full bg-[#fff2d8] px-3 py-1 text-xs font-bold text-[#9a641a]">{label(status(recommended.id))}</span></div>
      <p className="mt-4 text-xl font-bold text-[#1c2e50]">{recommended.id === "diagnostic" ? "Conoce a tu grupo" : recommended.id === "annual" ? "Prepara tu plan anual" : recommended.id === "experiences" ? "Elige el próximo proyecto de tu plan" : "Entra a un proyecto y prepara su próxima actividad"}</p>
      <p className="mt-1 text-sm text-[#566883]">{journey.studentCount} niños en el aula · {dashboard.profile.age_label}</p>
      <button type="button" onClick={() => onOpen(recommended.id)} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0b7891] px-4 font-bold text-white hover:bg-[#08677d]">Continuar {recommended.name.toLocaleLowerCase("es-PE")} <ChevronRight className="size-4" /></button>
    </section>
    <section><h2 className="mb-3 text-xl font-extrabold text-[#1c2e50]">Tu recorrido</h2><ol className="space-y-2">{steps.map((step, index) => { const available = canOpenPlanningStep(journey, step.id); const done = ["reviewed", "confirmed"].includes(status(step.id)); return <li key={step.id}><button type="button" disabled={!available} onClick={() => onOpen(step.id)} className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-[#d4e1ed] bg-white p-3 text-left enabled:hover:border-[#8acbd8] disabled:opacity-60"><span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${done ? "bg-[#287561] text-white" : step.id === journey.recommended ? "bg-[#0b7891] text-white" : "bg-[#e3eaf3] text-[#64748c]"}`}>{done ? <Check className="size-4" /> : index + 1}</span><span className="min-w-0 flex-1"><b className="block">{step.name}</b><small className="text-[#566883]">{step.id === "experiences" ? "Elige y desarrolla un proyecto de Mi año" : step.id === "activities" ? "Entra a un proyecto y prepara actividades o talleres" : label(status(step.id))}</small></span><span className="text-sm font-semibold text-[#07576c]">{available ? "Abrir →" : "Pendiente"}</span></button></li>; })}</ol></section>
    <p className="text-sm text-[#566883]">{dashboard.profile.age_label} · {journey.studentCount} niños en el aula. También puedes <button type="button" className="font-semibold text-[#07576c] underline" onClick={onWorkshops}>buscar ideas de talleres en Biblioteca</button>.</p>
  </div>;
}
