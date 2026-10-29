"use client";
import {BookOpen,Heart,Table2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import styles from './period-review.module.css';

export function PeriodEvaluationNavigation({view,onChange}:{view:string;onChange:(value:'student'|'family'|'consolidated')=>void}){
  return <nav className={styles.navigation} aria-label="Espacios de Evaluar">{([["student","Evaluación del bimestre",BookOpen],["family","Informe a familias",Heart],["consolidated","Consolidado",Table2]] as const).map(([target,label,Icon])=>{const active=view===target||view==="conclusions"&&target==="student";return <Button key={target} aria-label={label} aria-current={active?"page":undefined} data-active={active} variant={active?"default":"outline"} onClick={()=>onChange(target)}><Icon aria-hidden="true"/><span className="hidden sm:inline">{label}</span><span className="sm:hidden">{target==="student"?"Evaluación":target==="family"?"Informes":"Consolidado"}</span></Button>;})}</nav>;
}
