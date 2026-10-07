import { mkdir,writeFile } from "node:fs/promises";
import {loadKnowledgeBaseV4} from "../../src/lib/knowledge-base-v4.mjs";
import {buildAnnualClassroomSnapshot} from "../../src/lib/annual-classroom-snapshot.mjs";
import {validateExperienceContext} from "../../src/lib/annual-experience-context.mjs";
import {generateAnnualJourney} from "../../src/lib/annual-journey-service.mjs";
import {fixtureCalendar} from "../../src/lib/test-fixtures/annual-journey.mjs";
import {withAIQATrace} from "../../src/lib/ai-qa-trace.mjs";

// Hypothetical preparation before the school year: no October evidence sent to past tramos.
if(!process.argv.includes("--real")||process.env.VERCEL_ENV==="production")throw new Error("Explicit fictional nonproduction QA only");
process.env.AYNI_AI_QA_TRACE="1";
const cards=(await loadKnowledgeBaseV4()).competencyCards.filter(card=>["COM_ORAL","MAT_CANTIDAD","CYT_INDAGA"].includes(card.id));
const curriculum=cards.map(card=>({id:card.id,name:card.official_name,capacities:card.capacities.map(item=>typeof item==="string"?item:item.official_name)}));
const snapshot=buildAnnualClassroomSnapshot({students:Array.from({length:6},(_,i)=>({id:`fictional_${i}`})),names:[],fingerprint:"fictional-preseason",observations:[],interviews:[]},{available_resources:["Semillas, bloques, papel y lupas"]},curriculum);
const outputDir=".local/modern-ai-qa";await mkdir(outputDir,{recursive:true});
try{await withAIQATrace({fixtureId:"six_children_preseason_background",synthetic:true,outputDir},async traces=>{
 let checkpoint={},plan;
 const started=Date.now();
 while(!plan){try{plan=await generateAnnualJourney({context:{year:2026,age:5},snapshot,curriculum,calendar:fixtureCalendar(),backgroundExecution:true,checkpoint,onCheckpoint:async state=>{checkpoint=state;await writeFile(`${outputDir}/preseason-checkpoint.json`,JSON.stringify(state,null,2));},experienceContext:validateExperienceContext({contextItems:[{text:"Usaremos materiales del aula, sin pedir compras",source_turn:1}],historicalProjects:[]},curriculum,"2026-02-20")});}catch(error){if(error.reason!=="response_pending"||Date.now()-started>720000)throw error;await new Promise(resolve=>setTimeout(resolve,5000));}}
 await writeFile(`${outputDir}/preseason-results.json`,JSON.stringify(plan,null,2));console.info(JSON.stringify({status:"PASS",synthetic:true,slots:plan.resolved_calendar.projects.length,proposals:plan.proposed_experiences.length,calls:traces.length,cost_usd:traces.reduce((sum,trace)=>sum+(trace.cost_usd??0),0),latency_ms:traces[0]?.latency_ms}));
});}catch(error){console.error(JSON.stringify({status:"FAIL",reason:error.reason??error.name}));process.exitCode=1;}
