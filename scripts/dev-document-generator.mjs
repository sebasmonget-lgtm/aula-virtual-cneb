import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { multiAgeAppDevEnv } from './dev-multi-age-app.mjs';

/** Own checkout, ports and store. Never inherits deployed database credentials. */
export function documentGeneratorDevEnv({source=process.env,fromZero=false,cleanStart=false,simulated=false,qaStore,trialStore,key=source.AYNI_DOCUMENT_GENERATOR_OPENAI_API_KEY}={}) {
if(qaStore&&(!simulated||!/^generador-qa-[a-z0-9-]{1,40}$/.test(qaStore)))throw new Error('El almacén QA requiere simulación y un nombre generador-qa independiente.');
if(trialStore&&(!/^generador-prueba-chat-[a-z0-9-]{1,35}$/.test(trialStore)||qaStore))throw new Error('La prueba de chat requiere un almacén propio generador-prueba-chat y no puede combinarse con QA.');
const ownKey=simulated?undefined:key;
return { ...multiAgeAppDevEnv({ ...source, AYNI_MULTI_AGE_STORAGE:'persistent',
  AYNI_MULTI_AGE_STORE_NAME:trialStore??qaStore??(cleanStart?'generador-prueba-limpia':fromZero?'generador-desde-cero':'generador-documentos'),AYNI_MULTI_AGE_AI_MODE:simulated?'fixture':ownKey?'openai':'off',
  AYNI_MULTI_AGE_OPENAI_API_KEY:ownKey }),
  ...(ownKey&&!simulated?{OPENAI_API_KEY:ownKey}:{}),
  AYNI_LOCAL_DB_PORT:'8805', AYNI_ALLOWED_ORIGIN:'http://127.0.0.1:5185',
  NEXT_PUBLIC_AYNI_API_URL:'http://127.0.0.1:8805',NEXT_PUBLIC_AYNI_DOCUMENT_GENERATOR_ONLY:'1' };
}

if(process.argv[1]?.replaceAll('\\','/').endsWith('/dev-document-generator.mjs')){
const keyFile=process.argv.find(argument=>argument.startsWith('--key-env='))?.slice('--key-env='.length);
// Reading this file is opt-in. Only the text key is passed on, never its other credentials.
const configured=keyFile?parseEnv(await readFile(keyFile,'utf8')):{};
const key=process.env.AYNI_DOCUMENT_GENERATOR_OPENAI_API_KEY??configured.AYNI_DOCUMENT_GENERATOR_OPENAI_API_KEY??configured.OPENAI_API_KEY;
if(keyFile&&!key)throw new Error('El archivo indicado no contiene una clave de texto configurada.');
const fromZero=process.argv.includes('--from-zero');
const qaStore=process.argv.find(argument=>argument.startsWith('--qa-store='))?.slice('--qa-store='.length);
const trialStore=process.argv.find(argument=>argument.startsWith('--trial-store='))?.slice('--trial-store='.length);
const env=documentGeneratorDevEnv({fromZero,cleanStart:process.argv.includes('--clean-start'),qaStore,trialStore,simulated:process.argv.includes('--simulate-ai'),key});
const api=spawn(process.execPath,['scripts/local-db-server.mjs'],{env,stdio:'inherit'});
const webEnv={...env};delete webEnv.AYNI_MULTI_AGE_OPENAI_API_KEY;delete webEnv.OPENAI_API_KEY;
const web=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--port','5185','--hostname','127.0.0.1'],{env:webEnv,stdio:'inherit'});
let stopping=false;
function stop(code=0){if(stopping)return;stopping=true;api.kill('SIGTERM');web.kill('SIGTERM');process.exitCode=code;}
for(const child of [api,web]){child.on('error',()=>stop(1));child.on('exit',code=>stop(code??0));}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
process.stdout.write(`Ayni · Generador de documentos · ${fromZero?'prueba desde cero':'demostración'}\nhttp://127.0.0.1:5185\nDatos locales separados. Asistencia: ${env.AYNI_MULTI_AGE_AI_MODE==='openai'?'IA real':env.AYNI_MULTI_AGE_AI_MODE==='fixture'?'simulada':'manual'}.\n`);
}
