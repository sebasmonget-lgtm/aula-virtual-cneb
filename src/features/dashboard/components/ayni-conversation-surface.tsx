'use client';

import type {ReactNode} from 'react';
import {Send} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import styles from './annual-chat.module.css';

/** The original Ayni conversation shell, shared by both data contracts. */
export function AyniConversationSurface({contextTools,headerAction,messages,children}:{contextTools?:ReactNode;headerAction:ReactNode;messages:ReactNode;children:ReactNode}){
 return <div className={`${styles.layout} ${!contextTools?styles.single:''}`}>{contextTools}<section aria-label="Conversación con Ayni" className={styles.conversation}>
   <header className={styles.conversationHeader}><h2>Ayni</h2>{headerAction}</header>
   <div role="log" aria-live="polite" aria-label="Mensajes" className={styles.log}>{messages}</div>
   {children}
 </section></div>;
}

export function AyniConversationComposer({id,value,onChange,onSend,disabled,sendDisabled,label,placeholder,help,tools,sendLabel='Enviar respuesta'}:{id:string;value:string;onChange:(text:string)=>void;onSend:()=>void;disabled:boolean;sendDisabled:boolean;label:string;placeholder:string;help:string;tools?:ReactNode;sendLabel?:string}){
 return <div className={styles.composer}><label htmlFor={id} className="sr-only">{label}</label><div><Textarea id={id} value={value} maxLength={2000} disabled={disabled} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="min-w-0 flex-1"/>{tools}<Button type="button" size="icon" className="size-11 shrink-0 rounded-full" aria-label={sendLabel} disabled={sendDisabled} onClick={onSend}><Send className="size-5"/></Button></div><small>{help}</small></div>;
}
