"use client";
import { Check } from "lucide-react";
import styles from "./preparation-steps.module.css";

export type PreparationStep = 1 | 2 | 3 | 4;
const labels = ["Configura tu aula", "Añade a tus niños", "Entrevistas y observaciones", "Prepara Mi año con Ayni"];

export function PreparationSteps({ current, onSelect, disabled = false, className = "", completedSteps, disabledSteps=[], documentsOnly=false }: {
  documentsOnly?:boolean;
  current: PreparationStep;
  onSelect: (step: PreparationStep) => void;
  disabled?: boolean;
  className?: string;
  completedSteps?: number[]; disabledSteps?: number[];
}) {
  return <ol className={`${styles.steps} ${className}`} aria-label="Preparación de tu aula">
    {labels.map((label, index) => {
      const step = (index + 1) as PreparationStep;
      if(documentsOnly&&step===3)return null;
      const completed=completedSteps?completedSteps.includes(step):step<current;
      return <li key={label}>
        <button type="button" disabled={disabled||disabledSteps.includes(step)} aria-current={step === current ? "step" : undefined}
          title={completed ? "Paso completado. Puedes volver a abrirlo." : undefined}
          className={styles.step} data-completed={completed || undefined} onClick={() => onSelect(step)}>
          <span className={styles.marker} aria-hidden="true">{completed ? <Check size={22}/> : documentsOnly&&step===4?3:step}</span>
          <span>{label}</span>
        </button>
      </li>;
    })}
  </ol>;
}
