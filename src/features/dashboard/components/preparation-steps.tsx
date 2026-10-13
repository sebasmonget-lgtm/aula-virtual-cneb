"use client";
import { Check } from "lucide-react";
import styles from "./preparation-steps.module.css";

export type PreparationStep = 1 | 2 | 3 | 4;
const labels = ["Configura tu aula", "Añade a tus niños", "Entrevistas y observaciones", "Prepara Mi año con Ayni"];

export function PreparationSteps({ current, onSelect, disabled = false, className = "" }: {
  current: PreparationStep;
  onSelect: (step: PreparationStep) => void;
  disabled?: boolean;
  className?: string;
}) {
  return <ol className={`${styles.steps} ${className}`} aria-label="Preparación de tu aula">
    {labels.map((label, index) => {
      const step = (index + 1) as PreparationStep;
      return <li key={label}>
        <button type="button" disabled={disabled} aria-current={step === current ? "step" : undefined}
          aria-description={step < current ? "Paso completado. Puedes volver a abrirlo." : undefined}
          className={styles.step} data-completed={step < current || undefined} onClick={() => onSelect(step)}>
          <span className={styles.marker} aria-hidden="true">{step < current ? <Check size={22}/> : step}</span>
          <span>{label}</span>
        </button>
      </li>;
    })}
  </ol>;
}
