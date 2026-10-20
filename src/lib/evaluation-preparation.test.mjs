import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluationNeedsEarlyWarning,evaluationConfirmationSeconds} from './evaluation-preparation.mjs';
test('aviso antes del fin del bimestre, sin prohibir la preparación ni repetirlo al finalizar',()=>{
 assert.equal(evaluationNeedsEarlyWarning('2026-10-20','2026-12-18'),true);
 assert.equal(evaluationNeedsEarlyWarning('2026-12-18','2026-12-18'),false);
 assert.equal(evaluationNeedsEarlyWarning('2026-12-19','2026-12-18'),false);
 assert.equal(evaluationNeedsEarlyWarning('','2026-12-18'),true);
});
test('cinco segundos de reloj real; no habilitar antes ni prolongar el plazo por intervalos suspendidos',()=>{
 const deadline=15000;
 assert.equal(evaluationConfirmationSeconds(deadline,10000),5);
 assert.equal(evaluationConfirmationSeconds(deadline,14999),1);
 assert.equal(evaluationConfirmationSeconds(deadline,15000),0);
 assert.equal(evaluationConfirmationSeconds(deadline,22000),0);
});
