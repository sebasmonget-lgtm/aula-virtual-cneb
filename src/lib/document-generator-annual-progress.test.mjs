import test from 'node:test';
import assert from 'node:assert/strict';
import {documentAnnualPreparationProgress} from './document-generator-annual-progress.mjs';

test('el anual conserva inicio y etapa al pasar de ejecución a espera del proveedor',()=>{
 const createdAt='2026-10-28T20:00:00.000Z',job={createdAt,updatedAt:createdAt,status:'queued',attempts:0};
 assert.deepEqual(documentAnnualPreparationProgress(job),{started_at:createdAt,stage:'sources',completed_stages:[]});
 for(const status of ['running','queued','running','queued']){
  const value=documentAnnualPreparationProgress({...job,status,attempts:1,updatedAt:'2026-10-28T20:05:00.000Z'});
  assert.equal(value.started_at,createdAt);assert.equal(value.stage,'generation');assert.deepEqual(value.completed_stages,['sources','calendar']);
 }
 assert.equal(documentAnnualPreparationProgress({...job,status:'queued',attempts:2}).started_at,createdAt,'Un intento explícito no debe borrar la antigüedad de la tarea.');
});
test('inicio sin tarea y compatibilidad con respuestas anteriores no inventan fechas',()=>{
 assert.deepEqual(documentAnnualPreparationProgress(null,{starting:true}),{started_at:undefined,stage:'sources',completed_stages:[]});
 assert.equal(documentAnnualPreparationProgress({updatedAt:'2026-10-28T20:00:00Z',status:'running'}).started_at,'2026-10-28T20:00:00Z');
});
