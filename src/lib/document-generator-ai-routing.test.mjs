import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveAIExecutionPlan,AI_ROUTING_POLICY} from './ai-execution-router-v4.mjs';
import {resolveDocumentGeneratorExecutionPlan} from './document-generator-ai-routing.mjs';

test('Word documental usa redacción focalizada sin cambiar chat, maestro, anual o modo diario',()=>{
 const before=JSON.stringify(AI_ROUTING_POLICY);
 const document=resolveDocumentGeneratorExecutionPlan({workflow:'activity',documentsOnly:true});
 assert.deepEqual([document.model,document.reasoning_effort,document.fallback],['gpt-6.1-sol','low',null]);
 assert.equal(document.routing_policy_version,'4.0.1-documents-v31');
 assert.deepEqual(resolveDocumentGeneratorExecutionPlan({workflow:'activity'}),resolveAIExecutionPlan({workflow:'activity',task:'generation'}));
 for(const workflow of ['project_master','annual_plan','project_conversation','annual_journey_conversation'])assert.deepEqual(resolveDocumentGeneratorExecutionPlan({workflow,documentsOnly:true}),resolveAIExecutionPlan({workflow,task:'generation'}));
 assert.equal(JSON.stringify(AI_ROUTING_POLICY),before);
});
