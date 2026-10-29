"use client";
import {useState} from 'react';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import styles from './multi-age-workspace.module.css';

export function multiAgeCalendarFormData(data:FormData,prefix:string){
 const value=(key:string)=>String(data.get(prefix+key)??'');
 if(value('policy')==='national-2026')return {calendarPolicy:'national-2026',year:2026,startsOn:'2026-03-02',endsOn:'2026-12-31'};
 return {calendarPolicy:'institutional',year:Number(value('year')),startsOn:value('starts'),endsOn:value('ends'),calendar:{contract:'multi-age-institutional-calendar-v1',sourceLabel:value('source'),
  periods:[1,2,3,4].map(i=>({startsOn:value('period-start-'+i),endsOn:value('period-end-'+i)})),exclusions:value('exclusions').split('\n').filter(line=>line.trim()).map(line=>{const split=line.indexOf('|');return {date:line.slice(0,split).trim(),reason:line.slice(split+1).trim()};})}};
}
/** No future official dates are prefilled or inferred from the old year. */
export function MultiAgeCalendarFields({prefix,defaultYear=2026,nationalAvailable=true}:{prefix:string;defaultYear?:number;nationalAvailable?:boolean}){
 const [policy,setPolicy]=useState(nationalAvailable?'national-2026':'institutional');
 return <fieldset className="space-y-4"><legend className="py-2 text-lg font-bold">Calendario del aula</legend>
  <label className={styles.field}>Calendario<select name={prefix+'policy'} value={policy} onChange={event=>setPolicy(event.target.value)}>{nationalAvailable&&<option value="national-2026">Calendario nacional instalado de 2026</option>}<option value="institutional">Calendario institucional confirmado</option></select></label>
  {policy==='national-2026'?<p>Año 2026: 2 de marzo a 31 de diciembre. Clases del 16 de marzo al 18 de diciembre, con cuatro bimestres y días no lectivos instalados.</p>:<>
   <p>Completa las fechas aprobadas para tu institución. Ayni las guardará como calendario institucional. No se consideran fechas oficiales nacionales. Este recorrido admite cuatro bimestres de nueve semanas, de lunes a viernes; los días sin clases se excluyen dentro de esos bloques.</p>
   <label className={styles.field}>Año escolar<Input name={prefix+'year'} type="number" min={2020} max={2100} defaultValue={defaultYear} required/></label>
   <div className={styles.fields}><label className={styles.field}>Inicio del año<Input name={prefix+'starts'} type="date" required/></label><label className={styles.field}>Fin del año<Input name={prefix+'ends'} type="date" required/></label></div>
   <label className={styles.field}>Referencia del calendario aprobado<Input name={prefix+'source'} maxLength={180} required/></label>
   {[1,2,3,4].map(i=><fieldset key={i}><legend className="py-2 font-semibold">Bimestre {i}</legend><div className={styles.fields}><label className={styles.field}>Primer lunes<Input name={prefix+'period-start-'+i} type="date" required/></label><label className={styles.field}>Último viernes<Input name={prefix+'period-end-'+i} type="date" required/></label></div></fieldset>)}
   <label className={styles.field}>Días sin clases, incluidos feriados<Textarea name={prefix+'exclusions'} placeholder={'Una fecha y motivo por línea: AAAA-MM-DD | Motivo'} maxLength={18000}/></label>
   <p className="text-sm">La acogida ocupa las dos primeras semanas. Mi año distribuirá los 15 tramos restantes. El calendario queda conservado al confirmar el aula.</p>
  </>}
 </fieldset>;
}
