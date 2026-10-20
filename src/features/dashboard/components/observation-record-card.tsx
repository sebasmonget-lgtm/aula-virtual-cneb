"use client";
import { useState, type ReactNode } from "react";
import Image from "next/image";
import { Pencil, List, Blocks, Trees, Utensils, Users, Clock, MessageCircle, Search, Ellipsis, Paperclip } from "lucide-react";
import { StudentPhoto } from "./student-photo";
import { competencyVisual } from "@/src/lib/competency-presentation";
import styles from "./observation-record-card.module.css";
const momentIcons:Record<string,typeof Clock>={"Juego libre":Blocks,Recreo:Trees,Lonchera:Utensils,Asamblea:Users,Rutina:Clock,Conversación:MessageCircle,Exploración:Search,Otro:Ellipsis};
export function ObservationRecordCard({studentId,name,text,date,origin,competencies,competencyIds=[],mediaUrl,actions,children,suggested=false}:{studentId:string;name:string;text:string;date:string|null|undefined;origin:string;competencies:string[];competencyIds?:string[];mediaUrl?:string;actions?:ReactNode;children?:ReactNode;suggested?:boolean}){
  const [expanded,setExpanded]=useState(false);
  const value=date?new Date(/^\d{4}-\d{2}-\d{2}$/.test(date)?date+'T12:00:00-05:00':date):null;
  const label=value&&Number.isFinite(value.valueOf())?value.toLocaleDateString('es-PE',{timeZone:'America/Lima'}):'Fecha no disponible';
  const [kind,...momentParts]=origin.split(' · '),moment=momentParts.join(' · ');
  const OriginIcon=kind==='Observación libre'?Pencil:List, MomentIcon=momentIcons[moment]??Clock;
  return <article className={styles.record}><div className={styles.row}>
    <div className={styles.child}><StudentPhoto id={studentId} name={name} className={styles.photo}/><div><h3>{name}</h3><time dateTime={value&&Number.isFinite(value.valueOf())?value.toISOString():undefined}>{label}</time></div></div>
    <div className={styles.observation}><div className={styles.context}><span><OriginIcon size={16} aria-hidden="true"/>{kind}</span>{moment&&<span><MomentIcon size={16} aria-hidden="true"/>{moment}</span>}</div><p className={expanded?styles.fullText:styles.preview}>{text||'Evidencia adjunta'}</p>{(text.length>80||text.includes('\n'))&&<button type="button" className={styles.expand} aria-expanded={expanded} onClick={()=>setExpanded(current=>!current)}>{expanded?'Ver menos':'Ver texto completo'}</button>}{mediaUrl&&<a className={styles.media} href={mediaUrl} target="_blank" rel="noreferrer"><Paperclip size={15} aria-hidden="true"/>Ver evidencia privada</a>}</div>
    <div className={styles.competencies}>{competencies.length?competencies.map((label,index)=>{const visual=competencyVisual(competencyIds[index]);return <span key={competencyIds[index]??label} className={styles.competency} style={visual?{color:visual.foreground,backgroundColor:visual.background}:undefined}>{visual&&<Image src={visual.image} alt="" width={20} height={20} unoptimized/>}<span>{label}{suggested&&<small>Sugerencia de Ayni</small>}</span></span>;}):<span className={styles.unclassified}>Sin competencia elegida</span>}</div>
    {actions&&<div className={styles.actions}>{actions}</div>}
  </div>{children&&<div className={styles.details}>{children}</div>}</article>;
}
