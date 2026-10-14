import {createHash,createHmac,randomUUID} from 'node:crypto';

export function preparationDispatchSecret(env=process.env){
  if(env.AYNI_PREPARATION_DISPATCH_SECRET?.length>=32)return env.AYNI_PREPARATION_DISPATCH_SECRET;
  return env.AYNI_SESSION_SIGNING_KEY?.length>=32?createHash('sha256').update('ayni-preparation-dispatch:'+env.AYNI_SESSION_SIGNING_KEY).digest('hex'):null;
}
export function preparationDispatchHeaders(secret,now=Date.now()){
  const timestamp=String(Math.floor(now/1000)),nonce=randomUUID();
  return {'x-ayni-dispatch-time':timestamp,'x-ayni-dispatch-nonce':nonce,'x-ayni-dispatch-signature':createHmac('sha256',secret).update(`${timestamp}.${nonce}`).digest('hex')};
}
/** Bounded work survives the response; continuation is signed and uses the same deployment. */
export async function drainPreparation({step,hasPending,continueWork,now=Date.now,budgetMs=75000}){
  const began=now();let count=0;
  while(now()-began<budgetMs){const result=await step();if(!result)break;count++;}
  if(count&&await hasPending())await continueWork();
  return count;
}
