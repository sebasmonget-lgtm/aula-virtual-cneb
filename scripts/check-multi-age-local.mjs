import {spawn} from 'node:child_process';
import {mkdir,open,readdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

// Native application dependencies; no loader, cloud credentials, AI key or existing preview.
const root=fileURLToPath(new URL('../',import.meta.url));
const env=Object.fromEntries(Object.entries(process.env).filter(([name])=>
  /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|USERPROFILE|APPDATA|LOCALAPPDATA|COMSPEC|NUMBER_OF_PROCESSORS|PROCESSOR_ARCHITECTURE)$/i.test(name)));
env.NODE_ENV='test';env.NO_COLOR='1';
const directory=path.join(root,'.local','multi-age-readiness',`${new Date().toISOString().replaceAll(':','-')}-${randomUUID().slice(0,8)}`);
await mkdir(directory,{recursive:true});
const multiAgeTests=[];
for(const folder of ['src/lib','scripts'])for(const name of (await readdir(path.join(root,folder))).sort())
  if(/^multi-age.*\.test\.mjs$/.test(name))multiAgeTests.push(`${folder}/${name}`);
const compatibilityTests=[
  'scripts/database-schema-parity.test.mjs',
  'src/lib/ordinary-observation-service.test.mjs',
  'src/lib/ordinary-attribution-service.test.mjs',
  'src/lib/ordinary-evaluation-adapter.test.mjs',
  'src/lib/period-assessment-closure.test.mjs',
  'src/lib/workflow-ui-continuity.test.mjs',
  'src/lib/pilot-readiness.test.mjs',
];
const stages=[
  {name:'tests',args:['--test','--test-concurrency=2','--test-reporter=spec',...multiAgeTests,...compatibilityTests]},
  {name:'typecheck',args:['node_modules/typescript/bin/tsc','--noEmit']},
  {name:'lint',args:['node_modules/eslint/bin/eslint.js','.','--ignore-pattern','dist','--ignore-pattern','.next']},
  {name:'build',args:['scripts/run-framework.mjs','build']},
];
const results=[];
for(const stage of stages){
  process.stdout.write(`Comprobando ${stage.name}…\n`);
  const log=await open(path.join(directory,`${stage.name}.log`),'wx');
  let code;
  try{
    code=await new Promise((resolve,reject)=>{
      const stageEnv=stage.name==='build'?{...env,NODE_ENV:'production'}:env;
      const child=spawn(process.execPath,stage.args,{cwd:root,env:stageEnv,stdio:['ignore',log.fd,log.fd]});
      child.once('error',reject);child.once('exit',value=>resolve(value??1));
      const interrupt=()=>child.kill('SIGTERM');
      process.once('SIGINT',interrupt);process.once('SIGTERM',interrupt);
      child.once('exit',()=>{process.off('SIGINT',interrupt);process.off('SIGTERM',interrupt);});
    });
  }catch(error){await log.write(`\n${error.message}\n`);code=1;}
  finally{await log.close();}
  results.push({stage:stage.name,status:code===0?'passed':'failed',exitCode:code});
  process.stdout.write(`${stage.name}: ${code===0?'PASS':'FAIL'}\n`);
  if(code!==0)break;
}
const passed=results.length===stages.length&&results.every(result=>result.exitCode===0);
await writeFile(path.join(directory,'receipt.json'),JSON.stringify({
  status:passed?'local_checks_passed':'local_checks_failed',checkedAt:new Date().toISOString(),
  dependencies:'native_application',multiAgeTestFiles:multiAgeTests,compatibilityTests,results,
  realAiCalls:0,remoteWrites:0,published:false,
  releaseGates:{browserDesktopAndMobile:'requires separate interactive verification',newAccountStagingAuthRls:'requires separate staging verification'},
},null,2));
process.stdout.write(`Evidencias: ${directory}\n`);
process.exitCode=passed?0:1;
