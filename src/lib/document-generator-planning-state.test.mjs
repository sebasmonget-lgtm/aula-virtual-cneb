import test from 'node:test';
import assert from 'node:assert/strict';
import {documentGeneratorAnnualState} from './document-generator-planning-state.mjs';

test('el ejemplo editorial no aparece como un año creado ni como borrador implícito',()=>{
 const state=documentGeneratorAnnualState({plans:[],protectedSlots:[],exampleProposal:{title:'Ejemplo local'}});
 assert.equal(state.proposal,null);assert.equal(state.origin,'empty');assert.equal(state.active,null);
});
test('el año manual y una propuesta preparada conservan su origen separado',()=>{
 const manual={id:'manual',status:'active',proposal:{title:'Ejemplo local',proposals:[]},document_context:{}};
 assert.equal(documentGeneratorAnnualState({plans:[manual],protectedSlots:[]}).origin,'manual');
 const prepared={...manual,document_context:{generation_job_id:'authorized-job'}};
 assert.equal(documentGeneratorAnnualState({plans:[prepared],protectedSlots:[]}).origin,'prepared');
 assert.equal(documentGeneratorAnnualState({plans:[manual],protectedSlots:[]},{proposal:{title:'Propuesta nueva',proposals:[]}}).origin,'prepared');
});
test('revisar una propuesta real conserva los tramos que ya tienen actividades',()=>{
 const protectedRow={slot_id:'first',title:'Proyecto ya preparado'},futureRow={slot_id:'second',title:'Propuesta nueva'};
 const active={id:'year',status:'active',document_context:{},proposal:{title:'Año anterior',proposals:[protectedRow,{slot_id:'second',title:'Tema anterior'}]}};
 const generated={proposal:{title:'Año revisado',proposals:[{slot_id:'first',title:'No reemplazar actividades'},futureRow]}};
 const before=JSON.stringify(generated),state=documentGeneratorAnnualState({plans:[active],protectedSlots:[{slotId:'first'}]},generated);
 assert.deepEqual(state.proposal.proposals,[protectedRow,futureRow]);assert.equal(JSON.stringify(generated),before);
 assert.equal(active.proposal.title,'Año anterior');
});
