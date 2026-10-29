const scopes=new WeakMap();
const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/iu;

export const documentPlanningDatabaseScope=db=>scopes.get(db)??null;

/** Only the authenticated server creates this adapter. Each short transaction
 * assumes a non-login, non-bypass role and the verified teacher's RLS claims.
 * No pooled connection keeps a role or teacher identity after COMMIT/ROLLBACK. */
export function createDocumentPlanningDatabase(base,{teacherId,authMode,role,enabled}={}){
  if(enabled!==true||authMode!=='supabase'||role!=='teacher'||!uuid.test(teacherId??'')||typeof base?.transaction!=='function')
    throw new TypeError('El generador requiere una identidad docente verificada.');
  let explicit=false;
  const info={teacherId,storage:'postgres-tenant'};
  const settings=async tx=>{
    await tx.query('SET LOCAL ROLE ayni_document_server');
    await tx.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",[teacherId,JSON.stringify({sub:teacherId,role:'authenticated',app_metadata:{ayni_role:'teacher'}})]);
  };
  const mark=tx=>{scopes.set(tx,info);return tx;};
  const db={
    query:(sql,params)=>explicit?base.query(sql,params):base.transaction(async tx=>{await settings(tx);return tx.query(sql,params);}),
    exec:async sql=>{
      const command=String(sql).trim().replace(/;$/u,'').toLowerCase();
      if(command==='begin'){
        if(explicit)throw new Error('Ya existe una transacción activa.');
        await base.exec('begin');
        try{await settings(base);explicit=true;}catch(error){await base.exec('rollback');throw error;}
      }else if(command==='commit'||command==='rollback'){
        if(!explicit)throw new Error('No hay una transacción activa.');
        try{await base.exec(command);}finally{explicit=false;}
      }else return db.query(sql);
    },
    transaction:work=>base.transaction(async tx=>{if(!explicit)await settings(tx);return work(mark(tx));}),
    close:()=>base.close?.(),
  };
  return mark(db);
}
