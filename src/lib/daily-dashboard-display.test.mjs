import test from 'node:test';
import assert from 'node:assert/strict';
import {teacherGreeting,todayBlockLabel,calendarActivityState,calendarAgenda,calendarProjectsOnDay} from './daily-dashboard-display.mjs';
test('calendario distingue ejecución y no ofrece retirar trabajo registrado ni fechas pasadas',()=>{
  const activity={status:'active',schedule_status:'planned',occurs_on:'2026-07-06'};
  assert.deepEqual(calendarActivityState({...activity,execution_status:'completed'},'2026-07-06'),{label:'Realizada · registro anterior',canMarkNotWorked:false});
  assert.equal(calendarActivityState({...activity,execution_status:'active'},'2026-07-06').canMarkNotWorked,false);
  assert.equal(calendarActivityState(activity,'2026-07-07').canMarkNotWorked,false);
  assert.equal(calendarActivityState(activity,'2026-07-06').canMarkNotWorked,true);
  assert.equal(calendarActivityState({...activity,status:'archived'},'2026-07-06').canMarkNotWorked,false);
});
test('saludo respeta el reloj QA recibido sin cambiar el reloj real',()=>{
  const real=new Date('2026-10-15T23:00:00Z');
  assert.deepEqual(teacherGreeting(real,{date:'2026-08-17',time:'08:00'}),{text:'Buenos días',period:'morning'});
  assert.deepEqual(teacherGreeting(real,{date:'2026-08-17',time:'20:00'}),{text:'Buenas noches',period:'night'});
  assert.deepEqual(teacherGreeting(real,{date:'incorrecta',time:'08:00'}),teacherGreeting(real));
  assert.equal(real.toISOString(),'2026-10-15T23:00:00.000Z');
});

test('Hoy conserva la consulta de terminadas sin anunciarlas como próximas',()=>{
  assert.equal(todayBlockLabel({status:'completed'}),'TERMINADA');
  assert.equal(todayBlockLabel({status:'completed'},true),'TERMINADA');
  assert.equal(todayBlockLabel({status:'skipped'}),'NO REALIZADA');
  assert.equal(todayBlockLabel({status:'planned'}),'PRÓXIMO');
  assert.equal(todayBlockLabel({status:'active'},true),'AHORA');
});

for(const [instant,text,period] of [
  ['2026-10-14T05:00:00Z','Buenos días','morning'],
  ['2026-10-14T16:59:59Z','Buenos días','morning'],
  ['2026-10-14T17:00:00Z','Buenas tardes','afternoon'],
  ['2026-10-14T23:59:59Z','Buenas tardes','afternoon'],
  ['2026-10-15T00:00:00Z','Buenas noches','night'],
  ['2026-10-15T04:59:59Z','Buenas noches','night'],
])test(`saludo de Perú ${instant}`,()=>assert.deepEqual(teacherGreeting(new Date(instant)),{text,period}));

test('agenda no anuncia borradores, canceladas, no realizadas ni propuestas de versiones anteriores',()=>{
  const row={occurs_on:'2026-10-19',status:'active',schedule_status:'planned'};
  const project={type:'project',status:'active',starts_on:'2026-10-19',ends_on:'2026-10-30'};
  const data={activities:[{...row,id:'cancelled',schedule_status:'cancelled'},{...row,id:'draft',status:'draft'},{...row,id:'not-worked',schedule_status:'not_worked'},{...row,id:'already-done',execution_status:'completed'},{...row,id:'ready'}],
    experiences:[{...project,id:'old',annual_status:'archived'},{...project,id:'current',annual_status:'active'}]};
  assert.equal(calendarAgenda(data,'2026-10-14').nextActivity.id,'ready');
  assert.equal(calendarAgenda(data,'2026-10-14').nextProject.id,'current');
  assert.equal(calendarAgenda(data,'2026-10-20').currentProject.id,'current');
  assert.equal(calendarAgenda({},'2026-10-14').nextActivity,null);
});

test('día conserva su proyecto histórico real sin repetir otras versiones ni canceladas',()=>{
  const project={type:'project',status:'active',starts_on:'2026-10-19',ends_on:'2026-10-30'};
  const data={experiences:[{...project,id:'old',source_proposal_id:'one',annual_status:'archived'},{...project,id:'new',source_proposal_id:'one',annual_status:'active'}],
    activities:[{experience_id:'old',occurs_on:'2026-10-20',schedule_status:'planned'},{experience_id:'new',occurs_on:'2026-10-20',schedule_status:'cancelled'}]};
  assert.deepEqual(calendarProjectsOnDay(data,'2026-10-20').map(p=>p.id),['old']);
  assert.deepEqual(calendarProjectsOnDay(data,'2026-10-23').map(p=>p.id),['new']);
});
