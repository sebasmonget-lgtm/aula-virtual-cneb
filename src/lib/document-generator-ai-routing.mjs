import {AI_ROUTING_POLICY,resolveAIExecutionPlan} from './ai-execution-router-v4.mjs';

// Finished Word guides need focused writing; ordinary daily planning keeps its policy.
const documentWritingPolicy=Object.freeze({...AI_ROUTING_POLICY,version:'4.0.1-documents-v31',workflows:Object.freeze({
 ...AI_ROUTING_POLICY.workflows,activity:Object.freeze({tier:'focused_writing'})
})});
export function resolveDocumentGeneratorExecutionPlan({workflow,documentsOnly=false}){
 return resolveAIExecutionPlan({workflow,task:'generation'},documentsOnly&&workflow==='activity'?documentWritingPolicy:AI_ROUTING_POLICY);
}
