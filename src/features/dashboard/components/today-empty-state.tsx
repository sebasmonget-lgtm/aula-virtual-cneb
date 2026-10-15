"use client";

import {useEffect,useState} from 'react';
import Image from 'next/image';
import {ArrowRight,BookOpen,CalendarDays,FileText,Lightbulb,PencilLine} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {apiFetch,apiJson} from '@/src/lib/ayni-api-fetch';
import {localDatabaseApiUrl} from '@/src/lib/local-database';
import {calendarAgenda} from '@/src/lib/daily-dashboard-display.mjs';
import {displayDate} from '@/src/lib/display-date';
import {ProjectPictogram} from './project-pictogram';
import styles from './daily-overview.module.css';

type UpcomingData={experiences:{id:string;title:string;type:string;status:string;starts_on:string;ends_on:string;source_proposal_id?:string;annual_status?:string;details?:{decisions?:{competency_ids?:string[]}}}[];
  activities:{id:string;title:string;status:string;schedule_status:string;occurs_on:string;start_time?:string}[]};

export function TodayEmptyState({today,reason,onPlan,onCalendar,onActivity,onObserve,plannedActivity,period}:{
  today:string;reason?:string;onPlan:(proposalId?:string)=>void;onCalendar:()=>void;onActivity:(id:string)=>void;
  onObserve?:()=>void;plannedActivity?:{id:string;title:string};period?:{label:string;starts_on:string;ends_on:string}|null;
}){
  const [upcoming,setUpcoming]=useState<UpcomingData|null>(null),[failed,setFailed]=useState(false);
  useEffect(()=>{const controller=new AbortController();void apiFetch(`${localDatabaseApiUrl}/api/school-calendar`,{signal:controller.signal})
    .then(async response=>{if(!response.ok)throw Error();return apiJson<UpcomingData>(response);})
    .then(data=>{if(!controller.signal.aborted)setUpcoming(data);}).catch(()=>{if(!controller.signal.aborted)setFailed(true);});return()=>controller.abort();},[today]);
  const {nextProject,nextActivity}=calendarAgenda(upcoming,today);
  const prepared=plannedActivity??(nextActivity?{id:nextActivity.id,title:nextActivity.title}:null);
  return <>
    <section className={styles.emptyHero} aria-label="Hoy sin actividad programada">
      <div className={styles.emptyCopy}><span className={styles.calendarMark}><CalendarDays size={32}/></span>
        <h2>Hoy no hay actividad programada</h2>
        {reason&&<p className={styles.reason}>{reason}</p>}
        <p>Puedes revisar lo que viene{prepared?' o adelantar una actividad.':' en Mi año.'}</p>
        <div className={styles.heroActions}><Button onClick={()=>onPlan()}><BookOpen size={21}/>Ir a Mi año<ArrowRight size={19}/></Button>
          {prepared&&<Button variant="outline" onClick={()=>onActivity(prepared.id)}><FileText size={20}/>Abrir actividad prevista<ArrowRight size={18}/></Button>}</div>
      </div>
      <Image src="/ayni-thinking-v2.webp" width={640} height={427} unoptimized alt="" aria-hidden="true" className={styles.emptyIllustration}/>
    </section>
    <div className={styles.emptyLower}>
      <section className={styles.also}><h2><Lightbulb size={25}/>También puedes</h2><div className={styles.quickActions}>
        {onObserve&&<Button variant="outline" onClick={onObserve}><PencilLine size={20}/>Registrar observación libre<ArrowRight size={17}/></Button>}
        <Button variant="outline" onClick={onCalendar}><CalendarDays size={20}/>Ir al Calendario<ArrowRight size={17}/></Button>
      </div></section>
      <section className={styles.upcoming} aria-label="Lo que viene"><h2><CalendarDays size={24}/>Lo que viene</h2>
        {!upcoming?<p>{failed?'No pudimos consultar lo que viene. Puedes abrir Mi año o Calendario.':'Buscando las próximas actividades…'}</p>:
          !nextProject&&!nextActivity&&!period?<p>Cuando prepares tus proyectos, aparecerán aquí sus próximas actividades.</p>:
          <div className={styles.upcomingItems}>
            {nextProject&&<button type="button" onClick={()=>onPlan(nextProject.source_proposal_id)}><ProjectPictogram project={{title:nextProject.title,primary_competency_ids:nextProject.details?.decisions?.competency_ids}} className="size-12"/><span><small>Próximo proyecto</small><strong>{nextProject.title}</strong><small>{displayDate(nextProject.starts_on)}</small></span><ArrowRight size={16}/></button>}
            {nextActivity&&<button type="button" onClick={()=>onActivity(nextActivity.id)}><FileText className="shrink-0 text-[#7047ac]" size={27}/><span><small>Siguiente actividad</small><strong>{nextActivity.title}</strong><small>{displayDate(nextActivity.occurs_on)}</small></span><ArrowRight size={16}/></button>}
            {period&&<div className={styles.period}><CalendarDays size={25}/><span><strong>{period.label}</strong><small>{displayDate(period.starts_on)} – {displayDate(period.ends_on)}</small></span></div>}
          </div>}
      </section>
    </div>
  </>;
}
