"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type TeacherIdea = { id: string; title: string; explanation: string; requested_month: number | null };
export type PlanningPreferences = { version: 1; teacher_ideas: TeacherIdea[] };
export const ideaMonths = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export function AnnualTeacherIdeas({ ideas, onChange, readOnly = false }: { ideas: TeacherIdea[]; onChange: (ideas: TeacherIdea[]) => void; readOnly?: boolean }) {
  const patch = (id: string, value: Partial<TeacherIdea>) => onChange(ideas.map((idea) => idea.id === id ? { ...idea, ...value } : idea));
  return <section className="space-y-4"><header><h1 className="text-3xl font-extrabold text-[#172b52]">¿Ya tienes alguna idea para este año?</h1>
    <p className="mt-2 text-sm text-[#526b87]">Si tienes algún tema, proyecto o experiencia que te gustaría trabajar con tu aula, puedes contármelo. Lo tendré en cuenta al preparar tus propuestas. Si todavía no tienes ninguna idea, puedes continuar.</p>
    <p className="mt-2 text-sm text-[#526b87]">Son ideas para planificar, no observaciones de los niños. Ayni las considerará junto con el aula, el CNEB y el calendario; podrás revisar qué propone.</p></header>
    {ideas.map((idea, index) => <section key={idea.id} aria-label={`Idea ${index + 1}`} className="space-y-3 rounded-2xl border border-[#d6e5ef] bg-white p-4 sm:p-5">
      <label className="block text-sm font-semibold" htmlFor={`idea-title-${idea.id}`}>Tema o idea {index + 1}<Input id={`idea-title-${idea.id}`} className="mt-2" maxLength={180} disabled={readOnly} value={idea.title} placeholder="Los animales de nuestra comunidad" onChange={(event) => patch(idea.id, { title: event.target.value })} /></label>
      <label className="block text-sm font-semibold" htmlFor={`idea-explanation-${idea.id}`}>Breve explicación {index + 1}<Textarea id={`idea-explanation-${idea.id}`} className="mt-2" maxLength={500} disabled={readOnly} value={idea.explanation} placeholder="Cuéntame qué te gustaría explorar con el aula." onChange={(event) => patch(idea.id, { explanation: event.target.value })} /></label>
      <label className="block text-sm font-semibold" htmlFor={`idea-month-${idea.id}`}>Mes de preferencia {index + 1} (opcional)<select id={`idea-month-${idea.id}`} className="mt-2 min-h-11 w-full rounded-lg border bg-white px-3" disabled={readOnly} value={idea.requested_month ?? ""} onChange={(event) => patch(idea.id, { requested_month: event.target.value ? Number(event.target.value) : null })}>
        <option value="">Sin fecha; Ayni puede proponer cuándo</option>{ideaMonths.map((month, i) => <option key={month} value={i + 1}>{month}</option>)}</select></label>
      {!readOnly && <Button variant="ghost" onClick={() => onChange(ideas.filter((item) => item.id !== idea.id))}>Eliminar idea {index + 1}</Button>}
    </section>)}
    {!readOnly && <Button variant="outline" disabled={ideas.length >= 10} onClick={() => onChange([...ideas, { id: crypto.randomUUID(), title: "", explanation: "", requested_month: null }])}>{ideas.length ? "Agregar otra idea" : "Agregar una idea"}</Button>}
    {ideas.length >= 10 && <p className="text-sm text-[#526b87]">Puedes guardar hasta diez ideas en esta preparación.</p>}
  </section>;
}
