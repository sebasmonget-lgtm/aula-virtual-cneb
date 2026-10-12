import test from 'node:test';
import assert from 'node:assert/strict';
import {preparationStage,preparationStageHash,preparationHash} from './preparation-navigation.mjs';
import {destinationFromHash} from './teacher-navigation.mjs';
import {canOpenPlanningStep,loadStartingGuidance} from './planning-journey.mjs';

test('pending stage recommends initial coverage without blocking annual drafts',()=>{
  assert.equal(preparationStage({configured:false,studentCount:0,annualDraft:false}),1);
  assert.equal(preparationStage({configured:true,studentCount:0,annualDraft:false}),2);
  assert.equal(preparationStage({configured:true,studentCount:3,enrollmentCompleted:true,annualDraft:false}),3);
  assert.equal(preparationStage({configured:true,studentCount:3,enrollmentCompleted:true,annualDraft:true}),3);
  assert.equal(preparationStage({configured:true,studentCount:3,enrollmentCompleted:true,annualDraft:false,initialCoverage:true}),4);
  assert.equal(preparationStage({configured:true,studentCount:3,annualDraft:false}),2);
  assert.equal(canOpenPlanningStep({diagnostic:'pending',studentCount:3},'annual'),true);
});
test('return retains diagnostic step and mode, never private identifiers or text',()=>{
  assert.equal(preparationHash('#planificar?tab=diagnostic&step=2&mode=spontaneous&studentId=private&note=private'),'#planificar?tab=diagnostic&step=2&mode=spontaneous');
  assert.equal(preparationHash('#calendario?view=month'),null);
  assert.equal(preparationHash('#planificar?tab=activities'),null);
  assert.equal(preparationHash('#planificar?tab=diagnostic&step=invalid&mode=invalid'),preparationStageHash(3));
  assert.equal(preparationHash('#aula?studentId=private'),preparationStageHash(2));
  assert.equal(destinationFromHash('#preparacion'),'Preparación');
});
test('only confirmed annual server record selects daily navigation; draft cannot mask it',async()=>{
  const fetcher=async url=>({ok:true,json:async()=>url.includes('annual-plans/current')?{active:{id:'confirmed'},draft:{id:'new-draft'}}:{student_count:3,observation_count:0}});
  const saved=await loadStartingGuidance('',fetcher);
  assert.ok(saved.plans.active);
  assert.equal(saved.startingSection,'Hoy');
  const draft=await loadStartingGuidance('',async url=>({ok:true,json:async()=>url.includes('annual-plans/current')?{active:null,draft:{id:'draft'}}:{student_count:3}}));
  assert.equal(Boolean(draft.plans.active),false);
  assert.equal(preparationStage({configured:true,studentCount:draft.studentCount,enrollmentCompleted:true,annualDraft:Boolean(draft.plans.draft)}),3);
});
