import { PGlite } from '@electric-sql/pglite';
import { readdir, readFile, mkdir, lstat, open, unlink } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {documentPlanningDatabaseScope} from '../src/lib/document-planning-database.mjs';

const localDatabases=new WeakSet();
const storageInfo=new WeakMap();
// Resolve as a filesystem path: Next's development bundler treats a relative
// new URL('../', import.meta.url) as an asset request for the entire directory.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
/** No connection string, env file, disk database or cloud adapter is accepted. */
export async function openMultiAgeLocalDb({ beforeMultiAge = null, schema = 'local' } = {}) {
  if(!['local','supabase'].includes(schema))throw new TypeError('Solo se admiten esquemas locales en memoria.');
  const db=new PGlite();
  try {
    if(schema==='supabase')await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb) $$;
      create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
      create function storage.foldername(p text) returns text[] language sql immutable as $$ select string_to_array(p,'/') $$;`);
    const directory=path.join(root,schema==='local'?'local-db/migrations':'supabase/migrations');
    for(const name of (await readdir(directory)).filter(n=>n.endsWith('.sql')).sort()) {
      if(['0076_multi_age_foundation.sql','202610220001_multi_age_foundation.sql'].includes(name)&&beforeMultiAge)await beforeMultiAge(db);
      const sql=await readFile(path.join(directory,name),'utf8');
      // PGlite supplies gen_random_uuid but does not bundle the pgcrypto extension.
      await db.exec(schema==='supabase'?sql.replace(/create extension if not exists pgcrypto;/gi,''):sql);
    }
    localDatabases.add(db);
    return db;
  } catch(error) { await db.close();throw error; }
}
export function assertMultiAgeLocalDb(db) {
  if(!localDatabases.has(db)&&!documentPlanningDatabaseScope(db))throw new Error('Unidocencia requiere una base local aislada creada por su factory.');
}

export function multiAgeLocalStorage(db) { assertMultiAgeLocalDb(db);return storageInfo.get(db)??documentPlanningDatabaseScope(db)??{storage:'temporary'}; }

async function writeExclusive(file,value) { const handle=await open(file,'wx',0o600);try{await handle.writeFile(JSON.stringify(value));}finally{await handle.close();} }
async function safeDirectory(directory) {
  try { const stat=await lstat(directory);if(!stat.isDirectory()||stat.isSymbolicLink())throw new Error('La carpeta multiedad debe ser propia y no un enlace.'); }
  catch(error){if(error.code!=='ENOENT')throw error;await mkdir(directory);}
}

/** Only a named store beneath this checkout's ignored directory. Never adopts an existing database. */
export async function openMultiAgePersistentDb({storeName='unidocencia'}={}) {
  if(typeof storeName!=='string'||!(/^[a-z][a-z0-9-]{0,60}$/).test(storeName))throw new TypeError('Nombre de base local inválido.');
  const base=path.join(root,'.local','multi-age-stores'),directory=path.join(base,storeName);
  await safeDirectory(path.join(root,'.local'));await safeDirectory(base);await safeDirectory(directory);
  const markerFile=path.join(directory,'store.json'),lockFile=path.join(directory,'store.lock');
  let marker;
  try { if((await lstat(markerFile)).isSymbolicLink())throw new Error('Marcador inválido.');marker=JSON.parse(await readFile(markerFile,'utf8')); }
  catch(error){
    if(error.code!=='ENOENT')throw error;
    if((await readdir(directory)).length)throw new Error('No se adopta una carpeta con datos anteriores.');
    marker={contract:'ayni-multi-age-local-store/v1',storeName,teacherId:randomUUID(),storeId:randomUUID()};
    await writeExclusive(markerFile,marker);
  }
  if(marker.contract!=='ayni-multi-age-local-store/v1'||marker.storeName!==storeName||!(/^[0-9a-f-]{36}$/i).test(marker.teacherId))throw new Error('La carpeta no pertenece al almacenamiento multiedad.');
  const lock={pid:process.pid,token:randomUUID()};
  try { await writeExclusive(lockFile,lock); }
  catch(error){
    if(error.code!=='EEXIST')throw error;
    const recoveryFile=path.join(directory,'recovery.lock');let recovery;
    try {recovery=await open(recoveryFile,'wx',0o600);}catch{throw new Error('Otra apertura está revisando la base local; vuelve a intentar.');}
    try {
      if((await lstat(lockFile)).isSymbolicLink())throw new Error('Bloqueo local inválido.');
      const previous=JSON.parse(await readFile(lockFile,'utf8'));
      if(!Number.isSafeInteger(previous.pid)||previous.pid<=0)throw new Error('Revisa el bloqueo de la base local.');
      try {process.kill(previous.pid,0);throw new Error('Esta base multiedad ya está abierta en otro proceso.');}
      catch(check){if(check.code!=='ESRCH')throw check;}
      await unlink(lockFile);await writeExclusive(lockFile,lock);
    } finally {await recovery.close();await unlink(recoveryFile);}
  }
  let db;
  const release=async()=>{const saved=JSON.parse(await readFile(lockFile,'utf8'));if(saved.token===lock.token)await unlink(lockFile);};
  try {
    await safeDirectory(path.join(directory,'pgdata'));
    db=new PGlite(path.join(directory,'pgdata'));
    await db.exec('create table if not exists multi_age_local_migrations(version text primary key,sha256 text not null,applied_at timestamptz not null default now())');
    for(const name of (await readdir(path.join(root,'local-db/migrations'))).filter(n=>n.endsWith('.sql')).sort()) {
      const sql=await readFile(path.join(root,'local-db/migrations',name),'utf8'),hash=createHash('sha256').update(sql).digest('hex');
      const old=(await db.query('select sha256 from multi_age_local_migrations where version=$1',[name])).rows[0];
      if(old){if(old.sha256!==hash)throw new Error('Una migración aplicada cambió. Crea una migración nueva.');continue;}
      // Some legacy files own a top-level transaction. The ledger must commit atomically with their SQL.
      const body=sql.replace(/^\s*begin\s*;/gim,'').replace(/^\s*commit\s*;/gim,'');
      await db.transaction(async tx=>{await tx.exec(body);await tx.query('insert into multi_age_local_migrations(version,sha256) values($1,$2)',[name,hash]);});
    }
    await db.query("insert into profiles(user_id,display_name) values($1,'Docente de prueba local') on conflict(user_id) do nothing",[marker.teacherId]);
    localDatabases.add(db);storageInfo.set(db,{storage:'persistent-local',teacherId:marker.teacherId,storeName});
    const close=db.close.bind(db);let closed=false;
    db.close=async()=>{if(closed)return;closed=true;try{await close();}finally{await release();}};
    return db;
  }catch(error){try{await db?.close();}finally{await release();}throw error;}
}
