/** Bounded polling of saved IDs. The persistent job, not this process, owns progress. */
export async function drainDiagnosticWork({step,hasPending,continueWork,now=Date.now,
  pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),budgetMs=60_000}){
 const began=now();let processed=0;
 while(now()-began<budgetMs){
   const result=await step();if(result){processed++;continue;}
   if(!await hasPending())return processed;
   await pause(Math.min(5000,Math.max(0,budgetMs-(now()-began))));
 }
 if(await hasPending())await continueWork();return processed;
}
