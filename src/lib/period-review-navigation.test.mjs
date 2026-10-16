import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {assessmentReanalysisWarning} from './assessment-display.mjs';

const source=await readFile(new URL('../features/dashboard/components/period-evaluation.tsx',import.meta.url),'utf8');
const handler=source.match(/onChange=\{event=>\{if\(!canLeaveWorkspace\(\)\)return;setMessage\(""\);[\s\S]*?setPeriodId\(event.target.value\);\}\}/)?.[0];
assert.ok(handler,'Debe existir la transición de período de la revisión compacta.');

for(const mayLeave of [false,true])test(`cambio de bimestre: ${mayLeave?'limpia la revisión anterior':'cancelar conserva el contexto'}`,()=>{
  const state={message:'Bimestre cerrado',reopenReason:'Motivo anterior',reviewPair:{studentId:'ana',competencyId:'COM_ORAL'},studentId:'ana',competencyId:'COM_ORAL',detail:{period:'b1'},overview:{period:'b1'},periodId:'b1'};
  const before=structuredClone(state),context={canLeaveWorkspace:()=>mayLeave};
  for(const key of Object.keys(state))context['set'+key[0].toUpperCase()+key.slice(1)]=value=>{state[key]=value;};
  runInNewContext(`(${handler.slice('onChange={'.length,-1)})({target:{value:'b2'}})`,context);
  if(!mayLeave)assert.deepEqual(state,before);
  else{assert.equal(state.periodId,'b2');assert.equal(state.message,'');assert.equal(state.reopenReason,'');assert.equal(state.studentId,'');assert.equal(state.competencyId,'');assert.equal(state.detail,null);assert.equal(state.overview,null);assert.equal(state.reviewPair.studentId,'');assert.equal(state.reviewPair.competencyId,'');}
});

const reviewSource=await readFile(new URL('../features/dashboard/components/competency-period-review.tsx',import.meta.url),'utf8');
const selectStudent=reviewSource.match(/function selectStudent\(id:string\)\{[^\n]+\}/)?.[0].replace('(id:string)','(id)');
assert.ok(selectStudent,'La lista de estudiantes debe proteger la valoración abierta.');
for(const mayLeave of [false,true])test(`lista de estudiantes: ${mayLeave?'cambia y limpia el detalle':'cancelar conserva el borrador abierto'}`,()=>{
  const state={studentId:'camila',detail:{analysis:'Borrador docente'},error:'',notice:'',rosterOpen:true};
  const before=structuredClone(state),context={studentId:state.studentId,allowLeave:()=>mayLeave};
  for(const key of Object.keys(state))context['set'+key[0].toUpperCase()+key.slice(1)]=value=>{state[key]=value;};
  runInNewContext(`(${selectStudent})('diego')`,context);
  if(!mayLeave)assert.deepEqual(state,before);
  else{assert.equal(state.studentId,'diego');assert.equal(state.detail,null);assert.equal(state.rosterOpen,false);}
});
const analyze=reviewSource.slice(reviewSource.indexOf('async function analyze('),reviewSource.indexOf('async function saveObservationPending(')).replaceAll('(cause as Error)','cause');
for(const draft of [null,{revision:4}])test(`reanálisis explícito ${draft?'reutiliza revisión vigente':'materializa borrador de valoración confirmada'} antes de IA`,async()=>{
  const calls=[],context={detail:{timeline:[{id:'evidence'}],draft},busy:false,closed:false,dirty:false,level:'B',reason:'Sustento docente',analysis:'Análisis anterior',classroomId:'class',periodId:'period',studentId:'child',competencyId:'COM_ORAL',assessmentReanalysisWarning,
    writeDraft:async()=>{calls.push('draft');return{draft_revision:7};},api:async(path,body)=>{calls.push({path,body});},onChanged:async()=>{calls.push('changed');}};
  for(const key of ['setConfirmAnalysis','setBusy','setBusyAction','setError','setNotice','setReloadRevision'])context[key]=()=>{};
  const invoke=runInNewContext(`(${analyze})`,context);
  await invoke();assert.equal(calls.length,0,'Sin confirmar el diálogo no guarda ni llama IA.');
  await invoke(true);const request=calls.find(value=>typeof value==='object');assert.equal(request.body.acknowledgedRevision,draft?4:7);assert.equal(request.body.force,true);assert.equal(calls.filter(x=>x==='draft').length,draft?0:1);assert.equal(calls.at(-1),'changed');
});
