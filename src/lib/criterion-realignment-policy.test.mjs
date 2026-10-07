import test from "node:test";
import assert from "node:assert/strict";
import { criterionRealignmentEligibility } from "./criterion-realignment-policy.mjs";
test("solo una decisión docente sobre propósito o acciones habilita revisar qué observar",()=>{
  for(const changeKind of [undefined,"materials","wording","space","time","date"]) assert.equal(criterionRealignmentEligibility({changeKind,reason:"Cambiaré los colores y el lugar"}).allowed,false);
  assert.equal(criterionRealignmentEligibility({changeKind:"purpose",reason:""}).allowed,false);
  assert.equal(criterionRealignmentEligibility({changeKind:"children_actions",reason:"Ahora compararán cantidades en lugar de narrar lo que miraron"}).allowed,true);
});
