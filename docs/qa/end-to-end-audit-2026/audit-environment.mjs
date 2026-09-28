// Harness de auditoría: arranque aislado y baseline de solo lectura. No crea datos pedagógicos.
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const root = process.cwd();
const output = path.join(root, 'docs/qa/end-to-end-audit-2026');
const local = path.join(root, '.local/qa/end-to-end-audit-2026');
await mkdir(local, { recursive: true });
const git = spawn('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root });
let files = '';
for await (const chunk of git.stdout) files += chunk;
const hashes = {};
for (const file of files.split('\0').filter(Boolean)) {
  if (file.startsWith('docs/qa/end-to-end-audit-2026/')) continue;
  try { hashes[file] = createHash('sha256').update(await readFile(path.join(root, file))).digest('hex'); }
  catch { hashes[file] = 'unreadable'; }
}
await writeFile(path.join(output, 'baseline-source-hashes.json'), JSON.stringify({ at: new Date().toISOString(), hashes }, null, 2));
const env = { ...process.env, AYNI_AUTH_MODE: 'local', AYNI_DB_MODE: 'local',
  AYNI_LOCAL_TEACHER_ID: 'd97b5d03-b64d-405e-9de5-ae6e407bf126',
  AYNI_LOCAL_DATA_DIR: path.join(local, 'pgdata'), AYNI_LOCAL_DB_PORT: '8790', AYNI_API_HOST: '127.0.0.1',
  AYNI_ALLOWED_ORIGIN: 'http://127.0.0.1:5175', AYNI_ALLOW_LOCAL_EXPORT: '1',
  NEXT_PUBLIC_AYNI_API_URL: 'http://127.0.0.1:8790', NEXT_PUBLIC_LOCAL_DATABASE_URL: 'http://127.0.0.1:8790',
  WRANGLER_WRITE_LOGS: 'false', WRANGLER_REGISTRY_PATH: path.join(local, 'wrangler-registry'),
  MINIFLARE_REGISTRY_PATH: path.join(local, 'miniflare-registry'), CLOUDFLARE_CF_FETCH_ENABLED: 'false',
  VINEXT_NO_DEV_LOCK: '1' };
const api = spawn(process.execPath, ['--env-file-if-exists=experiments/jev-competency-classifier/.env.local',
  '--env-file-if-exists=.env.local', 'scripts/local-db-server.mjs'], { cwd: root, env, windowsHide: true });
const web = spawn(process.execPath, ['scripts/run-framework.mjs', 'dev', '--host', '127.0.0.1', '--port', '5175'],
  { cwd: root, env, windowsHide: true });
for (const [name, child] of [['api', api], ['web', web]]) {
  child.stdout.pipe(createWriteStream(path.join(local, `${name}.out.log`), { flags: 'a' }));
  child.stderr.pipe(createWriteStream(path.join(local, `${name}.err.log`), { flags: 'a' }));
}
await writeFile(path.join(output, 'environment.json'), JSON.stringify({ startedAt: new Date().toISOString(),
  teacherId: env.AYNI_LOCAL_TEACHER_ID, dataDir: env.AYNI_LOCAL_DATA_DIR, apiPort: 8790, webPort: 5175,
  launcherPid: process.pid, apiPid: api.pid, webPid: web.pid }, null, 2));
console.log('QA isolated services launched; metadata saved. No pedagogical records inserted by this harness.');
for (const child of [api, web]) child.on('exit', (code) => console.log(`QA child ${child.pid} exited: ${code}`));
