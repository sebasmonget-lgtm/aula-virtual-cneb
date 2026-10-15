import test from "node:test";
import assert from "node:assert/strict";
import { isValidStepIndex, normalizeStepIndex,activityMomentCount,assertActivityMomentAction } from "./activity-runner.mjs";

test("normaliza un paso persistido si la planificación ahora tiene menos pasos", () => {
  assert.equal(normalizeStepIndex(4, 2), 1);
  assert.equal(normalizeStepIndex(-1, 3), 0);
  assert.equal(normalizeStepIndex(0, 0), 0);
});

test("solo acepta índices dentro de los pasos de la actividad", () => {
  assert.equal(isValidStepIndex(1, 2), true);
  assert.equal(isValidStepIndex(2, 2), false);
  assert.equal(isValidStepIndex(-1, 2), false);
});

test('la guía canónica define los momentos aunque preparación no tenga steps; completar exige alcanzar el último',()=>{
 const details={meaningful_situation:'Miran las semillas.',child_actions:'Comparan sus formas.',mediation:'Pregunta qué notan.',closure_or_continuity:'Comparten lo descubierto.'};
 assert.equal(activityMomentCount(details,[]),3);
 assert.throws(()=>assertActivityMomentAction({action:'complete',currentStep:0,totalSteps:3,status:'active'}),/último/);
 assert.throws(()=>assertActivityMomentAction({action:'set_step',stepIndex:2,currentStep:0,totalSteps:3,status:'active'}),/orden/);
 assert.throws(()=>assertActivityMomentAction({action:'set_step',stepIndex:1,currentStep:0,totalSteps:3,status:'planned'}),/orden/);
 assert.doesNotThrow(()=>assertActivityMomentAction({action:'set_step',stepIndex:1,currentStep:0,totalSteps:3,status:'active'}));
 assert.doesNotThrow(()=>assertActivityMomentAction({action:'complete',currentStep:2,totalSteps:3,status:'active'}));
 assert.doesNotThrow(()=>assertActivityMomentAction({action:'complete',currentStep:0,totalSteps:0,status:'active'}));
});
