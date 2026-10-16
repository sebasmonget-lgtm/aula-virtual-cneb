// Explicit synthetic QA transport only. Not an application billing limit.
import {existsSync,readFileSync,writeFileSync,renameSync,mkdirSync} from 'node:fs';
import path from 'node:path';
export const QA_RATES = Object.freeze({'gpt-6.1-sol':{input:5,output:15,cached:.2},'gpt-6-luna':{input:.25,output:.75,cached:.02},'typesafe/jev-1.13':{input:.042,output:0,cached:0}});
export function createQaSpendBudget({file,limitUsd=4.5}) {
  if(!Number.isFinite(limitUsd)||limitUsd<=0||limitUsd>5)throw Error('QA limit must be within US$5');
  mkdirSync(path.dirname(file),{recursive:true});
  let state=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{version:1,limitUsd,entries:[]};
  if(state.version!==1||state.limitUsd!==limitUsd||!Array.isArray(state.entries))throw Error('QA ledger mismatch');
  const save=()=>{writeFileSync(file+'.tmp',JSON.stringify(state,null,2));renameSync(file+'.tmp',file);};
  const committed=()=>state.entries.reduce((n,e)=>n+(e.actualUsd??e.reservedUsd),0);
  return {
    reserve(payload) {
      const rate=QA_RATES[payload.model];
      if(!rate||payload.tools?.length||payload.service_tier&&!['auto','default'].includes(payload.service_tier)||payload.previous_response_id||payload.conversation)throw Error('Unbudgeted QA request');
      if(JSON.stringify(payload).includes('input_image')||JSON.stringify(payload).includes('input_audio'))throw Error('QA real calls accept synthetic text only');
      const decision=payload.model==='typesafe/jev-1.13';
      if(decision&&(typeof payload.state!=='string'||payload.state.length>6000||!payload.questions))throw Error('Invalid QA decision');
      const output=decision?0:Math.min(payload.max_output_tokens??(payload.model==='gpt-6.1-sol'?32000:12000),payload.model==='gpt-6.1-sol'?32000:12000);
      if(!Number.isInteger(output)||output<0||!decision&&output<1)throw Error('Invalid QA output cap');
      const effective=decision?{...payload}:{...payload,max_output_tokens:output};
      // UTF-8 bytes upper-bound text token count; cushion covers schema/role framing.
      // Long-context/cache-write prices deliberately over-reserve standard requests.
      const reservedUsd=(Buffer.byteLength(JSON.stringify(effective),'utf8')+32768)*rate.input/1e6+output*rate.output/1e6;
      if(committed()+reservedUsd>limitUsd)throw Error('QA_API_BUDGET_EXCEEDED');
      const entry={id:state.entries.length+1,model:payload.model,reservedUsd,outputCap:output,status:'reserved',startedAt:new Date().toISOString()};
      state.entries.push(entry);save();return {id:entry.id,payload:effective};
    },
    settle(id,response) {
      const e=state.entries.find(x=>x.id===id);if(!e)throw Error('Unknown QA reservation');
      if(response.id)e.responseId=response.id;
      if(['queued','in_progress'].includes(response.status)){e.status='pending';save();return;}
      const u=response.usage,rate=QA_RATES[e.model];
      if(!u||!Number.isFinite(u.input_tokens)||!Number.isFinite(u.output_tokens)){e.status='uncertain';save();return;}
      if(u.input_tokens<0||u.output_tokens<0||rate.output>0&&u.output_tokens>e.outputCap)throw Error('Provider usage outside QA reservation');
      // Conservative priced usage, not a provider invoice. No cache discount needed for cap.
      const actual=(u.input_tokens*rate.input+u.output_tokens*rate.output)/1e6;
      if(actual>e.reservedUsd)throw Error('Provider usage exceeds QA reservation');
      e.actualUsd=actual;e.status='measured';e.usage=u;e.finishedAt=new Date().toISOString();save();
    },
    reservationForResponse(id){return state.entries.find(e=>e.responseId===id)?.id;},
    snapshot(){return structuredClone({...state,committedUsd:committed(),remainingUsd:limitUsd-committed()});},
  };
}
