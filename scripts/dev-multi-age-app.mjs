import { spawn } from 'node:child_process';

/** The real application/API, with new temporary data and no inherited service credentials. */
export function multiAgeAppDevEnv(source = process.env) {
  const env = Object.fromEntries(Object.entries(source).filter(([name]) =>
    /^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|USERPROFILE|APPDATA|LOCALAPPDATA|COMSPEC|NUMBER_OF_PROCESSORS|PROCESSOR_ARCHITECTURE)$/i.test(name)));
  return { ...env, NODE_ENV: 'development', AYNI_AUTH_MODE: 'local', AYNI_DB_MODE: 'local', AYNI_MULTI_AGE_LOCAL: '1',
    AYNI_MULTI_AGE_STORAGE: source.AYNI_MULTI_AGE_STORAGE ?? 'memory',
    AYNI_MULTI_AGE_STORE_NAME: source.AYNI_MULTI_AGE_STORE_NAME ?? 'unidocencia',
    AYNI_MULTI_AGE_AI_MODE: source.AYNI_MULTI_AGE_AI_MODE ?? 'off',
    ...(source.AYNI_MULTI_AGE_OPENAI_API_KEY ? {AYNI_MULTI_AGE_OPENAI_API_KEY:source.AYNI_MULTI_AGE_OPENAI_API_KEY}:{}),
    AYNI_API_HOST: '127.0.0.1', AYNI_LOCAL_DB_PORT: '8795', AYNI_ALLOWED_ORIGIN: 'http://127.0.0.1:5175',
    NEXT_PUBLIC_AYNI_API_URL: 'http://127.0.0.1:8795', NEXT_PUBLIC_AYNI_EXPERIENCE: '1' };
}

if (process.argv[1]?.replaceAll('\\','/').endsWith('/dev-multi-age-app.mjs')) {
  const env = multiAgeAppDevEnv({...process.env,
    ...(process.argv.includes('--persistent')?{AYNI_MULTI_AGE_STORAGE:'persistent'}:{}),
    ...(process.argv.includes('--simulate-ai')?{AYNI_MULTI_AGE_AI_MODE:'fixture'}:{})});
  const api = spawn(process.execPath, ['scripts/local-db-server.mjs'], { env, stdio: 'inherit' });
  const webEnv={...env};delete webEnv.AYNI_MULTI_AGE_OPENAI_API_KEY;
  const web = spawn(process.execPath, ['node_modules/next/dist/bin/next','dev','--webpack','--port','5175','--hostname','127.0.0.1'], { env:webEnv, stdio: 'inherit' });
  let stopping = false;
  function stop(code = 0) { if (stopping) return; stopping = true; api.kill('SIGTERM'); web.kill('SIGTERM'); process.exitCode = code; }
  for (const child of [api,web]) { child.on('error', () => stop(1)); child.on('exit', code => stop(code ?? 0)); }
  process.on('SIGINT', () => stop()); process.on('SIGTERM', () => stop());
  process.stdout.write(`Ayni principal · prueba multiedad: http://127.0.0.1:5175\nAlmacenamiento: ${env.AYNI_MULTI_AGE_STORAGE==='persistent'?'local separado y persistente':'temporal'}. Usa solo datos ficticios.\n`);
}
