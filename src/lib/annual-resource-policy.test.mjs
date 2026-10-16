import test from 'node:test';import assert from 'node:assert/strict';
import {hasConfirmedDigitalResource,resourceEligibleCompetencies} from './annual-resource-policy.mjs';
test('unknown, negative and conditional equipment do not authorize TIC; confirmed offline device does',()=>{
 for(const resources of [[],['papel','patio'],['No tenemos tableta'],['tableta por confirmar'],['Si conseguimos una laptop']]) assert.equal(hasConfirmedDigitalResource(resources),false);
 for(const resources of [['Tableta del aula'],['teléfono de la docente disponible'],['computadora sin internet']]) assert.equal(hasConfirmedDigitalResource(resources),true);
 const cards=[{id:'COM_ORAL'},{id:'TRANS_TIC'},{id:'PS_CONVIVE'}];
 assert.deepEqual(resourceEligibleCompetencies(cards,[]).map(x=>x.id),['COM_ORAL','PS_CONVIVE']);assert.deepEqual(resourceEligibleCompetencies(cards,['tableta']),cards);
});
