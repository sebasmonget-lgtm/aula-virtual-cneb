// Extrapolate the unchanged BEFORE volumes using newly observed per-invocation costs.
// No provider calls, no application writes and no change to the original ledger/scenarios.
import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('./',import.meta.url);
const ledger=JSON.parse(await readFile(new URL('llamadas-ia-continuacion.json',root),'utf8'));
const scenarios=[{name:'BAJO',retry:0.05,audio:180},{name:'REALISTA',retry:0.20,audio:600},{name:'INTENSIVO',retry:0.75,audio:1500}];
const rows=[];
function observed(fn,uses,label=fn){
  const measured=ledger.byFunction[fn];
  if(!measured)throw new Error(`Missing observed cost ${fn}`);
  rows.push({function:label,source:'OBSERVADO: media por invocación facturable, incluidos intentos rechazados',
    observed_calls:measured.calls,observed_total_usd:measured.costUsd,unit_usd:measured.meanUsd,uses});
}
observed('diagnostic_group_synthesis',[1,1,1],'Diagnóstico grupal');
observed('diagnostic_priority_assist',[1,1,1],'Prioridades');
observed('annual_plan',[1,1,1],'Preplan anual');
observed('annual_formal',[1,1,1],'Documento anual');
for(const [fn,label] of [['project_preview','Proyecto/unidad: contexto'],['project_dependents','Proyecto/unidad: preguntas y criterios'],
  ['project_master','Proyecto/unidad: mapa maestro'],['project_formal','Proyecto/unidad: documento'],['jev_project_image','Jev imagen']])
  observed(fn,[8,16,28],label);
observed('activity',[80,150,220],'Actividad');
observed('workshop_master',[4,12,20],'Maestro de talleres');
observed('workshop_day',[40,120,220],'Taller del día');
observed('jev_workshop_sheet',[40,120,220],'Jev ficha (muestra pequeña, incluye abstención)');
observed('assessment_master',[4,4,4],'Marco de evaluación');
observed('assessment',[360,480,720],'Assessment alumno–competencia');
observed('descriptive_conclusion',[360,480,720],'Conclusión descriptiva');
observed('family_report',[60,60,60],'Informe familiar');
const primary=ledger.byFunction.observation_competency_primary;
const additional=ledger.byFunction.observation_competency_additional;
rows.push({function:'Jev observación híbrida (dos llamadas)',source:'OBSERVADO: pares diagnósticos, no comparación con contexto de actividad',
  observed_calls:primary.calls+additional.calls,observed_total_usd:primary.costUsd+additional.costUsd,
  unit_usd:primary.meanUsd+additional.meanUsd,uses:[300,900,1800]});
rows.push({function:'Informe del aula',source:'ESTIMADO: sobre BEFORE 9k/2k Sol; flujo todavía bloqueado',observed_calls:0,unit_usd:0.038,uses:[4,4,4]});
rows.push({function:'Reescritura nota',source:'ESTIMADO: sobre BEFORE 2.5k/300 Luna; no se midió',observed_calls:0,unit_usd:0.0004,uses:[30,180,540]});
rows.push({function:'Reajuste/consolidado/descarga',source:'CÓDIGO: sin llamada IA adicional; no acredita cierre anual',observed_calls:0,unit_usd:0,uses:[4,4,4]});
const totals=scenarios.map((scenario,index)=>{
  const base=rows.reduce((sum,row)=>sum+row.unit_usd*row.uses[index],0);
  const textAndDecisions=base*(1+scenario.retry),audio=scenario.audio*0.003,total=textAndDecisions+audio;
  return {...scenario,text_base_usd:base,text_plus_assumed_extra_calls_usd:textAndDecisions,audio_estimate_usd:audio,
    total_annual_usd:total,monthly_10_school_months_usd:total/10,monthly_12_calendar_months_usd:total/12,annual_per_student_15_usd:total/15};
});
const output={at:new Date().toISOString(),status:'ESTIMADO_ANUAL_NO_AÑO_OBSERVADO',students:15,observed_ledger:ledger.totals,
  assumptions:['Volúmenes y porcentajes de regeneración BEFORE sin cambio, para comparar calibración de precio unitario.',
    'Media por invocación, no costo por informe exitoso. Intentos rechazados/rework permanecen en gasto observado; usos/año y llamadas extra son supuestos.',
    'OpenAI usa tokens reales y tarifas, no factura reconciliada. Jev usa costos de proveedor.',
    'Audio no ejecutado: 0.003 USD/min es aproximación tarifaria. Informe del aula y reescritura siguen con sobres hipotéticos.',
    'Dos timeouts previos sin usage tienen cargo desconocido y no se sustituyen por cero.',
    'No incluye infraestructura, almacenamiento, soporte, impuestos, cambio de moneda, comisiones de recarga ni margen.'],rows,scenarios:totals};
await writeFile(new URL('evidencias/cost-scenarios-after.json',root),JSON.stringify(output,null,2));
console.log(JSON.stringify(output,null,2));
