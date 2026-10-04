// Only reads can be retried automatically: a failed write may already have committed.
export function createApiTransport({fetchImpl=fetch,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}) {
  return async (input,init={})=>{
    const method=(init.method ?? (typeof Request!=="undefined"&&input instanceof Request?input.method:"GET")).toUpperCase();
    const attempts=["GET","HEAD"].includes(method)?3:1;
    for(let attempt=0;attempt<attempts;attempt++) {
      try {
        const response=await fetchImpl(input,{...init,credentials:"include"});
        if(attempt+1<attempts&&[502,503,504].includes(response.status)) {
          await response.body?.cancel();await sleep(400*(attempt+1));continue;
        }
        return response;
      } catch(error) {
        if(init.signal?.aborted||error?.name==="AbortError")throw error;
        if(!(error instanceof TypeError))throw error;
        if(attempt+1<attempts){await sleep(400*(attempt+1));continue;}
        const unavailable=new Error("Se interrumpió la conexión. Conservamos lo guardado; vuelve a intentarlo cuando se restablezca.",{cause:error});
        unavailable.name="ConnectionError";throw unavailable;
      }
    }
  };
}
