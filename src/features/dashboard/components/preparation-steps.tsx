"use client";
import { Check } from "lucide-react";
import shell from "./pilot-setup.module.css";
import styles from "./interviews-workspace.module.css";
export function PreparationSteps({current}:{current:1|2|3|4}){
  return <ol className={`${shell.steps} ${styles.steps}`} aria-label="Preparación de tu aula">{['Configura tu aula','Añade a tus niños','Entrevistas y observaciones','Prepara Mi año con Ayni'].map((label,index)=><li key={label} className={index+1<current?styles.completed:undefined} aria-current={index+1===current?'step':undefined}><span>{index+1<current?<Check size={22} aria-label="Completado"/>:index+1}</span><span>{label}</span></li>)}</ol>;
}
