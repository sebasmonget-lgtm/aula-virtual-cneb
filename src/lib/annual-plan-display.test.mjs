import test from 'node:test';
import assert from 'node:assert/strict';
import {hasSavedAnnualYear,selectSavedAnnualPlan,currentAnnualPeriod,annualPeriodNumber} from './annual-plan-display.mjs';
test('saved partial and empty future years reopen; initial queued intent remains pending',()=>{
 const ready={id:'draft',proposal:{journey_version:2,editor_version:3,proposed_experiences:[],resolved_calendar:{projects:[]}}};
 assert.equal(hasSavedAnnualYear(ready),true);
 assert.equal(hasSavedAnnualYear({...ready,proposal:{journey_version:2,proposed_experiences:[]}}),false);
 assert.equal(selectSavedAnnualPlan({draft:ready,active:{id:'active'},archived:[{id:'old'}]}).id,'draft');
 assert.equal(selectSavedAnnualPlan({draft:ready,active:{id:'active'},archived:[{id:'old'}]},'old').id,'old');
 assert.equal(selectSavedAnnualPlan({archived:[{id:'old'}]}).id,'old');
});
test('period filters use the stored calendar, including dates between periods',()=>{
 const slots=[{period:'Bimestre 1',ends_on:'2026-05-15'},{period:'Bimestre 2',ends_on:'2026-07-24'},{period:'Bimestre 3',ends_on:'2026-10-09'},{period:'Bimestre 4',ends_on:'2026-12-18'}];
 assert.equal(currentAnnualPeriod(slots,'2026-10-13'),'4');
 assert.equal(currentAnnualPeriod(slots,'2026-05-20'),'2');
 assert.equal(currentAnnualPeriod(slots,'2027-01-01'),'4');
 assert.equal(annualPeriodNumber('Bimestre 3'),3);
});
