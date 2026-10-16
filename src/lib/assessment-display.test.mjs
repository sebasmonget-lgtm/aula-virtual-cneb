import test from 'node:test';import assert from 'node:assert/strict';
import {assessmentDisplayText,assessmentReanalysisWarning} from './assessment-display.mjs';
import {sanitizeEvidenceForAssessment} from './assessment-v4-service.mjs';
test('presentation names only explicit evaluated-child tokens and keeps anonymous peers neutral',()=>{
 const raw='[estudiante_actual] explicó a [estudiante].';
 assert.equal(assessmentDisplayText(raw,'Lucía'),'Lucía explicó a un estudiante.');
 assert.equal(assessmentDisplayText(raw,'Diego'),'Diego explicó a un estudiante.');
 assert.equal(raw,'[estudiante_actual] explicó a [estudiante].');
 assert.match(assessmentReanalysisWarning({level:'B',reason:'Sustento docente',analysis:'Anterior'}),/versión anterior.*historial/);
});
test('provider receives no target or peer name and does not conflate subjects',()=>{
 const value=sanitizeEvidenceForAssessment({observed_on:'2026-10-26',observation_text:'Lucía explicó a Diego. Diego respondió.',activity_title:'Juego',criterion_text:'Comunica'},['Lucía','Diego'],['Lucía']);
 assert.equal(value.observation_note,'[estudiante_actual] explicó a [estudiante]. [estudiante] respondió.');
 assert.ok(!JSON.stringify(value).includes('Lucía')&&!JSON.stringify(value).includes('Diego'));
});

test('libre sin criterio conserva null al anonimizar y no bloquea el análisis',()=>{const value=sanitizeEvidenceForAssessment({observed_on:'2026-11-09',criterion_text:null,activity_title:null,observation_text:'Ada comparó dos dibujos.'},['Ada'],['Ada']);assert.equal(value.criterion_text,null);assert.equal(value.activity_title,null);assert.equal(value.observation_note,'[estudiante_actual] comparó dos dibujos.');});
