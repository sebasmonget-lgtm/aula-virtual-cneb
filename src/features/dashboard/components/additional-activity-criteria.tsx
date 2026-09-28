"use client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export type AdditionalActivityCriterion = { competency_id: string; criterion_text: string; expected_evidence: string };
export function AdditionalActivityCriteria({ value, competencies, primaryId, disabled, readOnly, onChange }: {
  value: AdditionalActivityCriterion[]; competencies: { id: string; name: string }[]; primaryId: string | null;
  disabled: boolean; readOnly: boolean; onChange: (next: AdditionalActivityCriterion[]) => void;
}) {
  const available = competencies.filter(item => item.id !== primaryId && !value.some(row => row.competency_id === item.id));
  const update = (index: number, patch: Partial<AdditionalActivityCriterion>) => onChange(value.map((item, position) => position === index ? { ...item, ...patch } : item));
  return <section className="space-y-3" aria-label="Criterios adicionales">
    {value.map((item, index) => <article key={index} className="rounded-xl border p-4 space-y-3">
      {readOnly ? <><p className="font-bold">{competencies.find(card => card.id === item.competency_id)?.name ?? item.competency_id}</p>
        <p><b>Criterio:</b> {item.criterion_text}</p><p><b>Evidencia esperada:</b> {item.expected_evidence}</p></> : <>
        <label>Competencia adicional<select disabled={disabled} value={item.competency_id} onChange={event => update(index, { competency_id: event.target.value })}>
          <option value="">Elige una competencia</option>{competencies.filter(card => card.id !== primaryId && (card.id === item.competency_id || !value.some(row => row.competency_id === card.id)))
            .map(card => <option key={card.id} value={card.id}>{card.name}</option>)}
        </select></label>
        <label>Criterio para esta competencia<Textarea disabled={disabled} maxLength={2000} value={item.criterion_text} onChange={event => update(index, { criterion_text: event.target.value })} placeholder="Por ejemplo: explica cómo llegó a un acuerdo con su compañero." /></label>
        <label>Evidencia esperada<Textarea disabled={disabled} maxLength={2000} value={item.expected_evidence} onChange={event => update(index, { expected_evidence: event.target.value })} placeholder="Por ejemplo: explicación del acuerdo durante el juego." /></label>
        <Button variant="outline" disabled={disabled} onClick={() => onChange(value.filter((_, position) => position !== index))}>Quitar competencia adicional</Button>
      </>}
    </article>)}
    {!readOnly && value.length < 3 && available.length > 0 && value.every(item => item.competency_id && item.criterion_text.trim() && item.expected_evidence.trim()) &&
      <Button variant="outline" disabled={disabled} onClick={() => onChange([...value, { competency_id: "", criterion_text: "", expected_evidence: "" }])}>Añadir otra competencia y su criterio</Button>}
  </section>;
}
